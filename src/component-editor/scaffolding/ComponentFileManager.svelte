<script context="module" lang="ts">
  declare const __PROJECT_ROOT__: string | undefined;
</script>

<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import { get } from 'svelte/store';
  import type { ComponentConfig, ComponentConfigMeta } from '../../lib/themeTypes';
  import { componentSourceFile } from './componentSources';
  import {
    loadComponentConfig,
    saveComponentConfig,
    deleteComponentConfig,
    setActiveComponentFile,
    setComponentProductionFile,
    type ComponentProductionInfo,
  } from '../../lib/componentConfigService';
  import {
    editorState,
    componentDirty,
    loadComponentActive,
    markComponentSaved,
    mutate,
  } from '../../lib/editorStore';
  import { CURRENT_COMPONENT_SCHEMA_VERSION } from '../../lib/migrations';
  import type { CssVarRef } from '../../lib/editorTypes';
  import { safeFetch } from '../../lib/storage';
  import { writable } from 'svelte/store';
  import { getEditorContext, type ViewMode } from './editorContext';
  import ComponentFileMenu from './ComponentFileMenu.svelte';
  import SaveAsDialog from './SaveAsDialog.svelte';

  /** Which component this manager controls (e.g. "button"). */
  export let component: string;
  /** Display name shown at the start of the bar (e.g. "Segmented Control"). */
  export let title: string = '';
  /** When provided, renders a Reset button that restores these variables to `default.json`. */
  export let resetVariables: string[] | null = null;

  const projectRoot: string =
    typeof __PROJECT_ROOT__ !== 'undefined' ? (__PROJECT_ROOT__ ?? '') : '';
  $: sourceFile = componentSourceFile(component);

  const editorCtx = getEditorContext();
  const tabbableStore = editorCtx?.tabbable ?? writable(false);
  const viewModeStore = editorCtx?.viewMode ?? writable<ViewMode>('tabs');

  type SaveStatus = 'idle' | 'saving' | 'saved' | 'error';
  let saveStatus: SaveStatus = 'idle';

  /** Show a transient saveStatus (saved/error) and revert to idle after 2s.
      Centralises the timing so all flash sites stay in sync. */
  function flashStatus(state: Exclude<SaveStatus, 'idle'>) {
    saveStatus = state;
    setTimeout(() => (saveStatus = 'idle'), 2000);
  }
  let files: ComponentConfigMeta[] = [];
  let activeFileName = 'default';
  let currentDisplayName = 'Default';
  let saveAsDialog = false;

  let productionInfo: ComponentProductionInfo | null = null;
  type ProductionStatus = 'idle' | 'updating' | 'done' | 'error';
  let productionUpdateStatus: ProductionStatus = 'idle';

  /** Same idle-after-2s pattern for the production-update flash. */
  function flashProductionStatus(state: Exclude<ProductionStatus, 'idle'>) {
    productionUpdateStatus = state;
    setTimeout(() => (productionUpdateStatus = 'idle'), 2000);
  }

  $: compDirty = $componentDirty[component] ?? false;
  $: isApplied = !!productionInfo && productionInfo.fileName === activeFileName && !compDirty;
  $: unlinkedCount = $editorState.components[component]?.unlinked?.length ?? 0;
  $: resetDirty = (() => {
    if (!resetVariables) return false;
    const aliases = $editorState.components[component]?.aliases ?? {};
    return resetVariables.some((v) => v in aliases) || unlinkedCount > 0;
  })();

  async function refreshFiles() {
    // safeFetch returns null on dev-server unavailable / non-2xx — silently
    // leave the file list empty in that case.
    const data = await safeFetch<{
      files: ComponentConfigMeta[];
      activeFile: string;
    }>(`/api/component-configs/${encodeURIComponent(component)}`);
    if (!data) return;
    files = data.files;
    activeFileName = data.activeFile;
    const active = files.find((f) => f.fileName === activeFileName);
    if (active) currentDisplayName = active.name;
  }

  async function refreshProduction() {
    // Preserve existing productionInfo on transient fetch failure rather than
    // clobbering it to null — same behaviour as the previous empty catch.
    const info = await safeFetch<ComponentProductionInfo>(
      `/api/component-configs/${encodeURIComponent(component)}/production`,
    );
    if (info) productionInfo = info;
  }

  onMount(async () => {
    await refreshFiles();
    await refreshProduction();
    window.addEventListener('keydown', handleKeydown);
  });

  onDestroy(() => {
    window.removeEventListener('keydown', handleKeydown);
  });

  function handleKeydown(e: KeyboardEvent) {
    if ((e.metaKey || e.ctrlKey) && e.key === 's') {
      e.preventDefault();
      handleSave();
    }
  }

  function refToString(ref: CssVarRef): string {
    return ref.kind === 'token' ? ref.name : ref.value;
  }

  function currentAliases(): Record<string, string> {
    const slice = get(editorState).components[component];
    if (!slice) return {};
    const out: Record<string, string> = {};
    for (const [k, ref] of Object.entries(slice.aliases)) out[k] = refToString(ref);
    return out;
  }

  function currentConfig(): Record<string, unknown> {
    return get(editorState).components[component]?.config ?? {};
  }

  async function persist(fileName: string, displayName: string): Promise<void> {
    const now = new Date().toISOString();
    const data: ComponentConfig = {
      name: displayName,
      component,
      createdAt: now,
      updatedAt: now,
      aliases: { ...currentAliases() },
      config: { ...currentConfig() },
      schemaVersion: CURRENT_COMPONENT_SCHEMA_VERSION,
    };
    await saveComponentConfig(component, fileName, data);
    await setActiveComponentFile(component, fileName);
    activeFileName = fileName;
    currentDisplayName = displayName;
    markComponentSaved(component);
  }

  async function handleSave() {
    if (activeFileName === 'default') {
      // Default is regenerated from source — can't overwrite directly.
      saveAsDialog = true;
      return;
    }
    saveStatus = 'saving';
    try {
      await persist(activeFileName, currentDisplayName);
      flashStatus('saved');
      await refreshFiles();
    } catch {
      flashStatus('error');
    }
  }

  function openSaveAs() {
    saveAsDialog = true;
  }

  async function confirmSaveAs(e: CustomEvent<{ displayName: string; fileName: string }>) {
    const { displayName, fileName } = e.detail;
    saveStatus = 'saving';
    try {
      await persist(fileName, displayName);
      flashStatus('saved');
      await refreshFiles();
    } catch {
      flashStatus('error');
    }
  }

  async function handleLoad(e: CustomEvent<ComponentConfigMeta>) {
    const file = e.detail;
    // Multi-step service flow (load + set-active) — if any network call
    // fails, the dialog is already closed and the local state stays on the
    // previous selection. Silent by design; the same boot resilience that
    // keeps the editor working without a dev-server applies here.
    try {
      const cfg = await loadComponentConfig(component, file.fileName);
      await setActiveComponentFile(component, file.fileName);
      loadComponentActive(component, file.fileName, cfg.aliases, cfg.config, cfg.schemaVersion ?? 0);
      activeFileName = file.fileName;
      currentDisplayName = file.name;
    } catch {
      // intentional: see comment above
    }
  }

  async function handleDelete(e: CustomEvent<ComponentConfigMeta>) {
    const file = e.detail;
    if (file.fileName === 'default') return;
    // Multi-step service flow (delete + reload-default-on-active-removal).
    // Silent by design — see handleLoad.
    try {
      await deleteComponentConfig(component, file.fileName);
      await refreshFiles();
      await refreshProduction();
      if (file.fileName === activeFileName) {
        // Server reverts active to default; reload default aliases into the store.
        const defaultCfg = await loadComponentConfig(component, 'default');
        loadComponentActive(component, 'default', defaultCfg.aliases, defaultCfg.config, defaultCfg.schemaVersion ?? 0);
        activeFileName = 'default';
        currentDisplayName = 'Default';
      }
    } catch {
      // intentional: see comment above
    }
  }

  async function handleUpdateProduction() {
    productionUpdateStatus = 'updating';
    try {
      await setComponentProductionFile(component, activeFileName);
      await refreshProduction();
      flashProductionStatus('done');
    } catch {
      flashProductionStatus('error');
    }
  }

  async function handleReset() {
    if (!resetVariables) return;
    const defaultCfg = await loadComponentConfig(component, 'default');
    mutate(`reset ${component}`, (s) => {
      const slice =
        s.components[component] ?? (s.components[component] = { activeFile: 'default', aliases: {}, config: {} });
      for (const v of resetVariables) {
        const defaultVal = defaultCfg.aliases[v];
        if (defaultVal !== undefined) {
          slice.aliases[v] = defaultVal.startsWith('--')
            ? { kind: 'token', name: defaultVal }
            : { kind: 'literal', value: defaultVal };
        } else {
          delete slice.aliases[v];
        }
      }
      if (slice.unlinked) delete slice.unlinked;
    });
  }
</script>

<div class="cfm-bar">
  <div class="cfm-title-row">
    {#if title}
      <h2 class="cfm-title">{title}</h2>
    {/if}
    {#if sourceFile && projectRoot}
      <a
        class="source-link"
        href="vscode://file/{projectRoot}/{sourceFile}"
        title="Open {sourceFile} in VS Code"
      >
        <i class="fas fa-code"></i>
        <span>Source</span>
      </a>
    {/if}
  </div>

  <span class="cfg-label cfg-row-editor">editor config</span>
  <span
    class="cfg-box cfg-row-editor"
    class:dirty={compDirty}
    class:applied={isApplied}
    title={compDirty
      ? 'Unsaved changes'
      : isApplied
        ? 'Active config is applied to production'
        : ''}
  >
    <span class="cfg-name">{currentDisplayName}</span>
  </span>
  <span
    class="cfg-state cfg-row-editor-state"
    class:dirty={compDirty}
    class:applied={isApplied}
  >{compDirty ? 'unsaved' : isApplied ? 'applied' : ' '}</span>

  <div class="file-menu-slot cfg-row-editor">
    <ComponentFileMenu
      {component}
      {files}
      {activeFileName}
      on:save={handleSave}
      on:saveAs={openSaveAs}
      on:openLoad={refreshFiles}
      on:load={handleLoad}
      on:delete={handleDelete}
    />
  </div>

  {#if resetVariables}
    <button
      class="cfm-btn cfg-row-editor reset-btn"
      on:click={handleReset}
      disabled={!resetDirty}
      title="Reset all tokens to defaults"
    >
      <i class="fas fa-undo"></i>
      <span>Reset</span>
    </button>
  {/if}

  <span class="cfg-label cfg-row-production">production config</span>
  <span class="cfg-box cfg-row-production">
    <span class="cfg-name">{productionInfo?.name ?? ''}</span>
  </span>

  <button
    class="cfm-btn primary cfg-row-production apply-btn"
    class:saving={productionUpdateStatus === 'updating'}
    class:saved={productionUpdateStatus === 'done'}
    class:error={productionUpdateStatus === 'error'}
    on:click={handleUpdateProduction}
    disabled={productionUpdateStatus === 'updating' || productionInfo?.fileName === activeFileName}
    title={productionInfo?.fileName === activeFileName ? 'Already in production' : `Set "${currentDisplayName}" as production`}
  >
    <i class="fas" class:fa-upload={productionUpdateStatus === 'idle'} class:fa-spinner={productionUpdateStatus === 'updating'} class:fa-check={productionUpdateStatus === 'done'} class:fa-times={productionUpdateStatus === 'error'}></i>
    <span>
      {#if productionUpdateStatus === 'idle'}Apply Config{:else if productionUpdateStatus === 'updating'}Applying{:else if productionUpdateStatus === 'done'}Applied{:else}Error{/if}
    </span>
  </button>

  {#if $tabbableStore}
    <div class="view-mode-toggle" role="radiogroup" aria-label="Property view mode">
      <button
        type="button"
        class="view-mode-btn"
        class:active={$viewModeStore === 'list'}
        role="radio"
        aria-checked={$viewModeStore === 'list'}
        title="Stacked list view"
        on:click={() => viewModeStore.set('list')}
      >
        <i class="fas fa-bars"></i>
        <span>List</span>
      </button>
      <button
        type="button"
        class="view-mode-btn"
        class:active={$viewModeStore === 'tabs'}
        role="radio"
        aria-checked={$viewModeStore === 'tabs'}
        title="Tabbed view (one section at a time)"
        on:click={() => viewModeStore.set('tabs')}
      >
        <i class="fas fa-folder"></i>
        <span>Tabs</span>
      </button>
    </div>
  {/if}
</div>

<SaveAsDialog
  bind:show={saveAsDialog}
  {currentDisplayName}
  {files}
  on:save={confirmSaveAs}
/>

<style>
  .cfm-bar {
    position: sticky;
    top: 0;
    z-index: 5;
    display: grid;
    grid-template-columns: auto auto auto auto auto 1fr;
    column-gap: var(--ui-space-12);
    row-gap: var(--ui-space-4);
    align-items: start;
    padding: var(--ui-space-10);
    background: var(--ui-surface-low);
    border: 1px solid var(--ui-border-faint);
    border-radius: var(--ui-radius-md);
  }

  .cfm-title-row {
    grid-column: 1;
    grid-row: 1;
    align-self: center;
    display: flex;
    align-items: baseline;
    gap: var(--ui-space-12);
    margin-right: var(--ui-space-24);
  }

  .cfm-title {
    margin: 0;
    min-width: 0;
    font-size: var(--ui-font-size-3xl);
    font-weight: var(--ui-font-weight-semibold);
    color: var(--ui-text-primary);
    letter-spacing: -0.015em;
    white-space: nowrap;
    line-height: 1.1;
  }

  .source-link {
    display: inline-flex;
    align-items: center;
    gap: var(--ui-space-4);
    padding: var(--ui-space-2) var(--ui-space-6);
    font-size: var(--ui-font-size-xs);
    color: var(--ui-text-secondary);
    text-decoration: none;
    border: 1px solid var(--ui-border-default);
    border-radius: var(--ui-radius-sm);
    transition: all var(--ui-transition-fast);
  }

  .source-link:hover {
    color: var(--ui-text-primary);
    border-color: var(--ui-border-strong);
    background: var(--ui-hover);
  }

  .cfg-label {
    align-self: center;
    font-size: var(--ui-font-size-xs);
    color: var(--ui-text-secondary);
    letter-spacing: 0.02em;
    line-height: 1.15;
    text-align: right;
  }

  .cfg-box {
    display: inline-flex;
    align-items: baseline;
    justify-content: center;
    padding: var(--ui-space-6) var(--ui-space-10);
    width: 11rem;
    border-radius: var(--ui-radius-md);
    background: var(--ui-surface-lowest);
    border: 1px solid var(--ui-border-subtle);
  }

  .cfg-box.dirty {
    outline: 2px solid var(--ui-text-warning, #e6a030);
    outline-offset: -1px;
  }

  .cfg-name {
    font-size: var(--ui-font-size-md);
    font-weight: var(--ui-font-weight-semibold);
    color: var(--ui-text-primary);
  }

  .cfg-state {
    font-size: var(--ui-font-size-xs);
    letter-spacing: 0.02em;
    color: var(--ui-text-muted);
    line-height: 1;
    text-align: right;
    padding-right: var(--ui-space-2);
  }

  .cfg-state.dirty { color: var(--ui-text-warning, #e6a030); }
  .cfg-state.applied { color: var(--ui-text-applied, #5aa85e); }

  /* Editor row (top): label/box in row 1, state in row 2, buttons in row 1 */
  .cfg-row-editor.cfg-label { grid-column: 2; grid-row: 1; }
  .cfg-row-editor.cfg-box { grid-column: 3; grid-row: 1; }
  .cfg-row-editor-state { grid-column: 3; grid-row: 2; }
  .file-menu-slot.cfg-row-editor { grid-column: 4; grid-row: 1; }
  .reset-btn.cfg-row-editor { grid-column: 5; grid-row: 1; }

  /* Production row (bottom): label/box and apply button on row 3 */
  .cfg-row-production.cfg-label { grid-column: 2; grid-row: 3; margin-top: var(--ui-space-12); }
  .cfg-row-production.cfg-box { grid-column: 3; grid-row: 3; margin-top: var(--ui-space-12); }
  .apply-btn.cfg-row-production { grid-column: 4; grid-row: 3; margin-top: var(--ui-space-12); }

  .view-mode-toggle {
    grid-column: 1;
    grid-row: 3;
    justify-self: start;
    align-self: center;
    margin-top: var(--ui-space-12);
    display: inline-flex;
    align-items: stretch;
    gap: 2px;
    padding: 3px;
    background: var(--ui-surface-lowest);
    border: 1px solid var(--ui-border-default);
    border-radius: var(--ui-radius-md);
  }

  .view-mode-btn {
    display: inline-flex;
    align-items: center;
    gap: var(--ui-space-6);
    padding: var(--ui-space-4) var(--ui-space-12);
    background: none;
    border: none;
    border-radius: var(--ui-radius-sm);
    color: var(--ui-text-secondary);
    font-size: var(--ui-font-size-sm);
    cursor: pointer;
    transition: color var(--ui-transition-fast), background var(--ui-transition-fast);
    white-space: nowrap;
  }

  .view-mode-btn i {
    font-size: 0.9em;
  }

  .view-mode-btn:hover:not(.active) {
    color: var(--ui-text-primary);
    background: var(--ui-hover);
  }

  .view-mode-btn.active {
    color: var(--ui-text-primary);
    background: var(--ui-surface-high);
    box-shadow: 0 0 0 1px var(--ui-border-default);
  }

  .cfm-btn {
    display: inline-flex;
    align-items: center;
    gap: var(--ui-space-4);
    padding: var(--ui-space-6) var(--ui-space-10);
    background: var(--ui-surface-low);
    border: 1px solid var(--ui-border-subtle);
    border-radius: var(--ui-radius-md);
    color: var(--ui-text-secondary);
    font-size: var(--ui-font-size-md);
    cursor: pointer;
    transition: all var(--ui-transition-fast);
    white-space: nowrap;
  }

  .cfm-btn i {
    width: 1rem;
    text-align: center;
  }

  .cfm-btn:hover:not(:disabled) {
    background: var(--ui-surface);
    color: var(--ui-text-primary);
    border-color: var(--ui-border-default);
  }

  .cfm-btn:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  .cfm-btn.primary {
    background: var(--ui-surface-high);
    border-color: var(--ui-border-medium);
    color: var(--ui-text-primary);
  }

  .cfm-btn.primary:hover:not(:disabled) {
    background: var(--ui-surface-higher);
    border-color: var(--ui-border-strong);
  }

  .cfm-btn.primary.saving i { animation: spin 1s linear infinite; }
  .cfm-btn.primary.saved { color: var(--ui-text-success); }
  .cfm-btn.primary.error { color: var(--ui-text-muted); }

  @keyframes spin {
    from { transform: rotate(0deg); }
    to { transform: rotate(360deg); }
  }
</style>
