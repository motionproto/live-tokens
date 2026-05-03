<script context="module" lang="ts">
  declare const __PROJECT_ROOT__: string | undefined;
</script>

<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import { get } from 'svelte/store';
  import type { ComponentConfig, ComponentConfigMeta } from '../../lib/themeTypes';
  import { componentSourceFile } from './componentSources';
  import {
    listComponentConfigs,
    loadComponentConfig,
    saveComponentConfig,
    deleteComponentConfig,
    setActiveComponentFile,
    getComponentProductionInfo,
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
  import { sanitizeFileName } from '../../lib/themeService';
  import UIDialog from '../../ui/UIDialog.svelte';
  import { writable } from 'svelte/store';
  import { getEditorContext, type ViewMode } from './editorContext';

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

  let saveStatus: 'idle' | 'saving' | 'saved' | 'error' = 'idle';
  let files: ComponentConfigMeta[] = [];
  let activeFileName = 'default';
  let currentDisplayName = 'Default';
  let showFileList = false;
  let saveAsDialog = false;
  let saveAsName = '';
  let saveAsInput: HTMLInputElement;
  let fileMenuOpen = false;
  let fileMenuRoot: HTMLElement;

  let productionInfo: ComponentProductionInfo | null = null;
  let productionUpdateStatus: 'idle' | 'updating' | 'done' | 'error' = 'idle';

  $: compDirty = $componentDirty[component] ?? false;
  $: isApplied = !!productionInfo && productionInfo.fileName === activeFileName && !compDirty;
  $: unlinkedCount = $editorState.components[component]?.unlinked?.length ?? 0;
  $: resetDirty = (() => {
    if (!resetVariables) return false;
    const aliases = $editorState.components[component]?.aliases ?? {};
    return resetVariables.some((v) => v in aliases) || unlinkedCount > 0;
  })();

  async function refreshFiles() {
    try {
      const data = await listComponentConfigs(component);
      files = data.files;
      activeFileName = data.activeFile;
      const active = files.find((f) => f.fileName === activeFileName);
      if (active) currentDisplayName = active.name;
    } catch {
      // silent — empty list
    }
  }

  async function refreshProduction() {
    try {
      productionInfo = await getComponentProductionInfo(component);
    } catch {
      // silent
    }
  }

  onMount(async () => {
    await refreshFiles();
    await refreshProduction();
    document.addEventListener('click', handleDocClick, true);
    window.addEventListener('keydown', handleKeydown);
  });

  onDestroy(() => {
    document.removeEventListener('click', handleDocClick, true);
    window.removeEventListener('keydown', handleKeydown);
  });

  function handleDocClick(e: MouseEvent) {
    if (!fileMenuOpen) return;
    if (fileMenuRoot && !fileMenuRoot.contains(e.target as Node)) {
      fileMenuOpen = false;
    }
  }

  function handleKeydown(e: KeyboardEvent) {
    if ((e.metaKey || e.ctrlKey) && e.key === 's') {
      e.preventDefault();
      handleSave();
    }
  }

  function currentAliases(): Record<string, string> {
    return get(editorState).components[component]?.aliases ?? {};
  }

  async function persist(fileName: string, displayName: string): Promise<void> {
    const now = new Date().toISOString();
    const data: ComponentConfig = {
      name: displayName,
      component,
      createdAt: now,
      updatedAt: now,
      aliases: { ...currentAliases() },
    };
    await saveComponentConfig(component, fileName, data);
    await setActiveComponentFile(component, fileName);
    activeFileName = fileName;
    currentDisplayName = displayName;
    markComponentSaved(component);
  }

  async function handleSave() {
    fileMenuOpen = false;
    if (activeFileName === 'default') {
      // Default is regenerated from source — can't overwrite directly.
      openSaveAs();
      return;
    }
    saveStatus = 'saving';
    try {
      await persist(activeFileName, currentDisplayName);
      saveStatus = 'saved';
      setTimeout(() => (saveStatus = 'idle'), 2000);
      await refreshFiles();
    } catch {
      saveStatus = 'error';
      setTimeout(() => (saveStatus = 'idle'), 2000);
    }
  }

  function nextIncrementName(baseDisplay: string): { displayName: string; fileName: string } {
    const baseName = baseDisplay.replace(/_\d+$/, '');
    const baseFileName = sanitizeFileName(baseName);
    const existingNums = files
      .filter((f) => f.fileName === baseFileName || f.fileName.match(new RegExp(`^${baseFileName}_\\d+$`)))
      .map((f) => {
        const m = f.fileName.match(/_(\d+)$/);
        return m ? parseInt(m[1], 10) : 0;
      });
    const next = (existingNums.length > 0 ? Math.max(...existingNums) : 0) + 1;
    const suffix = String(next).padStart(2, '0');
    return { displayName: `${baseName}_${suffix}`, fileName: `${baseFileName}_${suffix}` };
  }

  function incrementSaveAsName() {
    saveAsName = nextIncrementName(saveAsName).displayName;
    setTimeout(() => saveAsInput?.select(), 0);
  }

  function openSaveAs() {
    fileMenuOpen = false;
    saveAsName = sanitizeFileName(currentDisplayName) === 'default'
      ? nextIncrementName(currentDisplayName).displayName
      : currentDisplayName;
    saveAsDialog = true;
    setTimeout(() => saveAsInput?.select(), 0);
  }

  $: saveAsError = (() => {
    const trimmed = saveAsName.trim();
    if (!trimmed) return '';
    if (sanitizeFileName(trimmed) === 'default') {
      return 'The name "default" is reserved for the core component definition.';
    }
    return '';
  })();

  async function confirmSaveAs() {
    const displayName = saveAsName.trim();
    if (!displayName || saveAsError) return;
    const fileName = sanitizeFileName(displayName);
    saveAsDialog = false;
    saveStatus = 'saving';
    try {
      await persist(fileName, displayName);
      saveStatus = 'saved';
      setTimeout(() => (saveStatus = 'idle'), 2000);
      await refreshFiles();
    } catch {
      saveStatus = 'error';
      setTimeout(() => (saveStatus = 'idle'), 2000);
    }
  }

  async function openLoad() {
    fileMenuOpen = false;
    showFileList = true;
    await refreshFiles();
  }

  async function handleLoad(file: ComponentConfigMeta) {
    showFileList = false;
    try {
      const cfg = await loadComponentConfig(component, file.fileName);
      await setActiveComponentFile(component, file.fileName);
      loadComponentActive(component, file.fileName, cfg.aliases);
      activeFileName = file.fileName;
      currentDisplayName = file.name;
    } catch {
      // silent
    }
  }

  async function handleDelete(file: ComponentConfigMeta) {
    if (file.fileName === 'default') return;
    try {
      await deleteComponentConfig(component, file.fileName);
      await refreshFiles();
      await refreshProduction();
      if (file.fileName === activeFileName) {
        // Server reverts active to default; reload default aliases into the store.
        const defaultCfg = await loadComponentConfig(component, 'default');
        loadComponentActive(component, 'default', defaultCfg.aliases);
        activeFileName = 'default';
        currentDisplayName = 'Default';
      }
    } catch {
      // silent
    }
  }

  async function handleUpdateProduction() {
    productionUpdateStatus = 'updating';
    try {
      await setComponentProductionFile(component, activeFileName);
      await refreshProduction();
      productionUpdateStatus = 'done';
      setTimeout(() => (productionUpdateStatus = 'idle'), 2000);
    } catch {
      productionUpdateStatus = 'error';
      setTimeout(() => (productionUpdateStatus = 'idle'), 2000);
    }
  }

  async function handleReset() {
    if (!resetVariables) return;
    const defaultCfg = await loadComponentConfig(component, 'default');
    mutate(`reset ${component}`, (s) => {
      const slice =
        s.components[component] ?? (s.components[component] = { activeFile: 'default', aliases: {} });
      for (const v of resetVariables) {
        const defaultVal = defaultCfg.aliases[v];
        if (defaultVal !== undefined) slice.aliases[v] = defaultVal;
        else delete slice.aliases[v];
      }
      if (slice.unlinked) delete slice.unlinked;
    });
  }

  function handleSaveAsKeydown(e: KeyboardEvent) {
    if (e.key === 'Enter') confirmSaveAs();
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

  <div class="file-menu cfg-row-editor" bind:this={fileMenuRoot}>
    <button
      class="cfm-btn"
      class:active={fileMenuOpen}
      on:click={() => (fileMenuOpen = !fileMenuOpen)}
      title="File menu"
    >
      <i class="fas fa-file"></i>
      <span>File</span>
      <i class="fas fa-chevron-down chevron" class:open={fileMenuOpen}></i>
    </button>
    {#if fileMenuOpen}
      <div class="file-menu-dropdown" role="menu">
        <button class="file-menu-item" on:click={handleSave} role="menuitem">
          <i class="fas fa-save"></i>
          <span>Save</span>
        </button>
        <button class="file-menu-item" on:click={openSaveAs} role="menuitem">
          <i class="fas fa-copy"></i>
          <span>Save As…</span>
        </button>
        <button class="file-menu-item" on:click={openLoad} role="menuitem">
          <i class="fas fa-folder-open"></i>
          <span>Load…</span>
        </button>
      </div>
    {/if}
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

<UIDialog
  bind:show={showFileList}
  title="Load {component} Config"
  cancelLabel="Close"
  width="420px"
>
  <div class="load-list">
    {#each files as file}
      <div class="load-item" class:active={file.fileName === activeFileName}>
        <button class="load-name-btn" on:click={() => handleLoad(file)}>
          {file.name}
        </button>
        {#if file.fileName === activeFileName}
          <span class="active-badge">active</span>
        {/if}
        {#if file.fileName !== 'default'}
          <button
            class="file-delete-btn"
            on:click|stopPropagation={() => handleDelete(file)}
            title="Delete {file.name}"
          >
            <i class="fas fa-trash-alt"></i>
          </button>
        {/if}
      </div>
    {/each}
    {#if files.length === 0}
      <div class="load-item empty">No saved files</div>
    {/if}
  </div>
</UIDialog>

<UIDialog
  bind:show={saveAsDialog}
  title="Save As"
  cancelLabel="Cancel"
  confirmLabel="Save"
  confirmDisabled={!saveAsName.trim() || !!saveAsError}
  on:confirm={confirmSaveAs}
  width="360px"
>
  <div class="save-as-dialog">
    <div class="save-as-row">
      <input
        class="save-as-input"
        class:invalid={!!saveAsError}
        type="text"
        bind:value={saveAsName}
        bind:this={saveAsInput}
        on:keydown={handleSaveAsKeydown}
        placeholder="Config name…"
      />
      <button
        type="button"
        class="save-as-increment"
        on:click={incrementSaveAsName}
        title="Increment filename"
      >
        <i class="fas fa-plus"></i>
      </button>
    </div>
    {#if saveAsError}
      <p class="save-as-error" role="alert">{saveAsError}</p>
    {/if}
  </div>
</UIDialog>

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
  .file-menu.cfg-row-editor { grid-column: 4; grid-row: 1; }
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

  .cfm-btn.active {
    background: var(--ui-surface);
    border-color: var(--ui-border-default);
    color: var(--ui-text-primary);
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

  .chevron {
    font-size: 0.7em;
    transition: transform var(--ui-transition-fast);
  }

  .chevron.open {
    transform: rotate(180deg);
  }

  .file-menu {
    position: relative;
  }

  .file-menu-dropdown {
    position: absolute;
    top: calc(100% + 4px);
    left: 0;
    min-width: 160px;
    background: var(--ui-surface-low);
    border: 1px solid var(--ui-border-default);
    border-radius: var(--ui-radius-md);
    box-shadow: var(--shadow-lg, 0 8px 24px rgba(0, 0, 0, 0.4));
    padding: var(--ui-space-4);
    display: flex;
    flex-direction: column;
    gap: 2px;
    z-index: 10;
  }

  .file-menu-item {
    display: flex;
    align-items: center;
    gap: var(--ui-space-8);
    padding: var(--ui-space-6) var(--ui-space-10);
    background: none;
    border: none;
    border-radius: var(--ui-radius-sm);
    color: var(--ui-text-secondary);
    font-size: var(--ui-font-size-md);
    cursor: pointer;
    text-align: left;
    white-space: nowrap;
    transition: background var(--ui-transition-fast), color var(--ui-transition-fast);
  }

  .file-menu-item i {
    width: 1rem;
    text-align: center;
  }

  .file-menu-item:hover {
    background: var(--ui-hover);
    color: var(--ui-text-primary);
  }

  .save-as-dialog {
    display: flex;
    flex-direction: column;
    gap: var(--ui-space-8);
  }

  .save-as-row {
    display: flex;
    align-items: stretch;
    gap: var(--ui-space-6);
  }

  .save-as-input {
    flex: 1;
    min-width: 0;
    padding: var(--ui-space-8) var(--ui-space-10);
    background: var(--ui-surface-lowest);
    border: 1px solid var(--ui-border-subtle);
    border-radius: var(--ui-radius-md);
    color: var(--ui-text-primary);
    font-size: var(--ui-font-size-md);
    outline: none;
  }

  .save-as-increment {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 2.25rem;
    padding: 0;
    background: var(--ui-surface-low);
    border: 1px solid var(--ui-border-subtle);
    border-radius: var(--ui-radius-md);
    color: var(--ui-text-secondary);
    font-size: var(--ui-font-size-md);
    cursor: pointer;
    transition: all var(--ui-transition-fast);
  }

  .save-as-increment:hover {
    background: var(--ui-surface);
    border-color: var(--ui-border-default);
    color: var(--ui-text-primary);
  }

  .save-as-input:focus {
    border-color: var(--ui-border-medium);
  }

  .save-as-input.invalid,
  .save-as-input.invalid:focus {
    border-color: var(--ui-text-warning, #e6a030);
  }

  .save-as-input::placeholder {
    color: var(--ui-text-muted);
  }

  .save-as-error {
    margin: 0;
    font-size: var(--ui-font-size-xs);
    color: var(--ui-text-warning, #e6a030);
  }

  .load-list {
    display: flex;
    flex-direction: column;
    max-height: 60vh;
    overflow-y: auto;
  }

  .load-item {
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 4px 6px;
    border-bottom: 1px solid #2a2a2a;
  }

  .load-item:last-child {
    border-bottom: none;
  }

  .load-item.empty {
    padding: 16px;
    color: #888;
    font-size: 14px;
    text-align: center;
  }

  .load-name-btn {
    flex: 1;
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    padding: 6px 4px;
    background: none;
    border: none;
    color: #aaa;
    font-size: 14px;
    cursor: pointer;
    text-align: left;
    border-radius: 3px;
  }

  .load-name-btn:hover {
    color: #e0e0e0;
  }

  .load-item.active .load-name-btn {
    color: #e0e0e0;
    font-weight: 600;
  }

  .active-badge {
    flex-shrink: 0;
    font-size: 12px;
    padding: 1px 6px;
    border-radius: 3px;
    background: #333;
    color: #ccc;
  }

  .file-delete-btn {
    flex-shrink: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    width: 24px;
    height: 24px;
    padding: 0;
    background: none;
    border: none;
    color: #555;
    font-size: 12px;
    cursor: pointer;
    opacity: 0;
  }

  .load-item:hover .file-delete-btn {
    opacity: 1;
  }

  .file-delete-btn:hover {
    color: #ccc;
  }

  @keyframes spin {
    from { transform: rotate(0deg); }
    to { transform: rotate(360deg); }
  }
</style>
