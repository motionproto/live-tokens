<script module lang="ts">
  declare const __PROJECT_ROOT__: string | undefined;
</script>

<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import UIInfoPopover from '../../ui/UIInfoPopover.svelte';
  import type { ComponentConfigMeta } from '../../core/themes/themeTypes';
  import { componentSourceFile } from './componentSources';
  import {
    getActiveComponentConfig,
    loadComponentConfig,
    saveComponentConfig,
    deleteComponentConfig,
    writeWorkingComponentConfig,
    componentConfigFromState,
  } from '../../core/components/componentConfigService';
  import {
    editorState,
    componentDirty,
    loadComponentActive,
    markComponentSaved,
  } from '../../core/store/editorStore';
  import {
    bumpComponentActiveRevision,
    bumpProductionRevision,
    liveMovedSinceBake,
    productionRevision,
    productionTheme,
  } from '../../core/productionPulse';
  import {
    adoptTheme,
    getActiveTheme,
    getProductionTheme,
    listThemes,
    saveActiveTheme,
    saveAsTheme,
  } from '../../core/themes/themeService';
  import type { ThemeMeta } from '../../core/themes/themeTypes';
  import { safeFetch } from '../../core/storage/storage';
  import { API_BASE } from '../../core/storage/apiBase';
  import { flashStatus } from '../../core/flashStatus';
  import ComponentFileMenu from './ComponentFileMenu.svelte';
  import SaveAsDialog from './SaveAsDialog.svelte';
  import FilePill from '../../ui/FilePill.svelte';
  import UIPillButton from '../../ui/UIPillButton.svelte';
  import UISquareButton from '../../ui/UISquareButton.svelte';

  interface Props {
    /** Which component this manager controls (e.g. "button"). */
    component: string;
    /** Display name shown at the start of the bar (e.g. "Segmented Control"). */
    title?: string;
    /** When provided, renders a Reset button that reverts the component to the
      config the server holds for it (discarding unsaved edits). To load
      another config, use the File menu. */
    resetVariables?: string[] | null;
  }

  let { component, title = '', resetVariables = null }: Props = $props();

  const projectRoot: string =
    typeof __PROJECT_ROOT__ !== 'undefined' ? (__PROJECT_ROOT__ ?? '') : '';
  let sourceFile = $derived(componentSourceFile(component));

  type SaveStatus = 'idle' | 'saving' | 'saved' | 'error';
  let saveStatus: SaveStatus = 'idle';
  const setSaveStatus = (s: SaveStatus) => (saveStatus = s);

  // Saved presets. Nothing live points at one: the component runs its working
  // buffer, and the theme it belongs to carries the copy that ships.
  let files: ComponentConfigMeta[] = $state([]);
  let openTheme: { fileName: string; name: string } = $state({
    fileName: 'default',
    name: 'Motion Proto',
  });
  let saveAsDialog = $state(false);

  type ProductionStatus = 'idle' | 'updating' | 'done' | 'error';
  let productionUpdateStatus: ProductionStatus = $state('idle');
  let adoptFeedback = $state('');

  // Theme SaveAs prompt for the "Adopt while the default theme is open" case.
  let themeSaveAsDialog = $state(false);
  let themes: ThemeMeta[] = $state([]);
  let retryAdoptAfterThemeSave = false;

  const setProductionStatus = (s: ProductionStatus) => (productionUpdateStatus = s);

  let compDirty = $derived($componentDirty[component] ?? false);
  let openIsProtected = $derived(openTheme.fileName === 'default');
  // Both rows name a document, because that is what a config belongs to now:
  // every theme carries every component by value, so the component always
  // runs the open theme's config, and production always runs the published
  // theme's.
  let editorDoc = $derived(openTheme.fileName);
  let productionDoc = $derived($productionTheme?._fileName ?? null);
  let editorName = $derived(openTheme.name);
  let productionName = $derived(productionDoc === null ? '—' : $productionTheme?.name ?? '—');
  // Saving writes the buffer, which the bake has not seen: the document is
  // still the published one, so only the shared signal can say the config on
  // screen is not what production runs.
  let isApplied = $derived(
    productionDoc !== null && productionDoc === editorDoc && !compDirty && !$liveMovedSinceBake,
  );
  let resetDirty = $derived(!!resetVariables && compDirty);

  async function refreshFiles() {
    // safeFetch returns null on dev-server unavailable / non-2xx — silently
    // leave the file list empty in that case.
    const data = await safeFetch<{ files: ComponentConfigMeta[] }>(
      `${API_BASE}/component-configs/${encodeURIComponent(component)}`,
    );
    if (data) files = data.files;
  }

  /** The theme the component belongs to, by the open document's own markers. */
  async function refreshLive() {
    try {
      const theme = await getActiveTheme();
      if (theme) openTheme = { fileName: theme._fileName ?? 'default', name: theme.name };
    } catch {
      // silent — keep the last answer
    }
  }

  async function refreshProduction() {
    // Preserve the last answer on a transient failure rather than clobbering
    // the store to null, which would read as "production unknown".
    try {
      productionTheme.set(await getProductionTheme());
    } catch {
      // silent
    }
  }

  onMount(async () => {
    await refreshFiles();
    await refreshLive();
    await refreshProduction();
    window.addEventListener('keydown', handleKeydown);
  });

  onDestroy(() => {
    window.removeEventListener('keydown', handleKeydown);
  });

  // An Adopt in the theme panel can fork the protected theme, so the document
  // this component belongs to changes under us. The production side rides on
  // the shared store and needs no re-read here. Skip the first tick — mount
  // ran it already.
  let pulseInitialised = false;
  $effect(() => {
    void $productionRevision;
    if (!pulseInitialised) {
      pulseInitialised = true;
      return;
    }
    refreshLive();
  });

  function handleKeydown(e: KeyboardEvent) {
    if ((e.metaKey || e.ctrlKey) && e.key === 's') {
      e.preventDefault();
      handleSave();
    }
  }

  /** Flush the editor state to the component's working buffer. A theme save
   *  captures the buffers, so this is what puts these edits in reach of Save
   *  and Adopt. */
  async function persist(): Promise<void> {
    await writeWorkingComponentConfig(
      component,
      componentConfigFromState($editorState, component, openTheme.name),
    );
    markComponentSaved(component);
    bumpComponentActiveRevision();
  }

  async function handleSave() {
    saveStatus = 'saving';
    try {
      await persist();
      flashStatus(setSaveStatus, 'saved');
    } catch {
      flashStatus(setSaveStatus, 'error');
    }
  }

  function openSaveAs() {
    saveAsDialog = true;
  }

  /** Save As writes a preset — a config the user can load into any theme —
   *  and keeps the buffer, so the editor reads saved either way. */
  async function confirmSaveAs(detail: { displayName: string; fileName: string }) {
    const { displayName, fileName } = detail;
    saveStatus = 'saving';
    try {
      await saveComponentConfig(
        component,
        fileName,
        componentConfigFromState($editorState, component, displayName),
      );
      await persist();
      flashStatus(setSaveStatus, 'saved');
      await refreshFiles();
    } catch {
      flashStatus(setSaveStatus, 'error');
    }
  }

  async function handleLoad(file: ComponentConfigMeta) {
    // Multi-step service flow (load + buffer write) — if any network call
    // fails, the dialog is already closed and the local state stays on the
    // previous selection. Silent by design; the same boot resilience that
    // keeps the editor working without a dev-server applies here.
    try {
      const { _fileName, _source, ...cfg } = await loadComponentConfig(component, file.fileName);
      await writeWorkingComponentConfig(component, { ...cfg, component });
      loadComponentActive(component, cfg.aliases, cfg.config, cfg.schemaVersion ?? 0);
      bumpComponentActiveRevision();
    } catch {
      // intentional: see comment above
    }
  }

  async function handleDelete(file: ComponentConfigMeta) {
    if (file.fileName === 'default') return;
    // A preset is not live state, so deleting one leaves the component running
    // exactly what it ran. Silent by design — see handleLoad.
    try {
      await deleteComponentConfig(component, file.fileName);
      await refreshFiles();
    } catch {
      // intentional: see comment above
    }
  }

  /**
   * Adopt ships the whole theme, because production is one saved theme: flush
   * this component, save the open theme, publish it. The protected Default
   * theme cannot record what shipped, so it prompts for a theme name first and
   * retries.
   */
  async function handleAdopt() {
    if (openIsProtected) {
      retryAdoptAfterThemeSave = true;
      try {
        themes = await listThemes();
      } catch {
        themes = [];
      }
      themeSaveAsDialog = true;
      return;
    }
    const wasDirty = compDirty;
    const adoptingName = openTheme.name;
    productionUpdateStatus = 'updating';
    try {
      if (wasDirty) await persist();
      await saveActiveTheme();
      await adoptTheme();
      await refreshProduction();
      bumpProductionRevision();
      adoptFeedback = wasDirty
        ? `Saved "${adoptingName}" and adopted`
        : `Adopted "${adoptingName}"`;
      flashStatus(setProductionStatus, 'done', { onIdle: () => (adoptFeedback = '') });
    } catch {
      adoptFeedback = '';
      flashStatus(setProductionStatus, 'error', { onIdle: () => (adoptFeedback = '') });
    }
  }

  async function onThemeSaveAs(detail: { displayName: string; fileName: string }) {
    themeSaveAsDialog = false;
    try {
      // The capture reads the server's live state, so this component's edits
      // have to be in its buffer before the new theme takes shape.
      if (compDirty) await persist();
      await saveAsTheme(detail.fileName, detail.displayName);
      await refreshLive();
    } catch (err) {
      window.alert(`Failed to create the theme: ${(err as Error).message}`);
      retryAdoptAfterThemeSave = false;
      return;
    }
    if (retryAdoptAfterThemeSave) {
      retryAdoptAfterThemeSave = false;
      await handleAdopt();
    }
  }

  async function handleReset() {
    if (!resetVariables) return;
    try {
      const cfg = await getActiveComponentConfig(component);
      if (cfg) loadComponentActive(component, cfg.aliases, cfg.config, cfg.schemaVersion ?? 0);
    } catch {
      // intentional: dev-server unavailable — leave state untouched
    }
  }
</script>

<header class="cfm-bar">
  <div class="cfm-title-row">
    {#if title}
      <h2 class="cfm-title">{title}</h2>
    {/if}
    {#if sourceFile && projectRoot}
      <UIPillButton
        icon="fa-code"
        href="vscode://file/{projectRoot}/{sourceFile}"
        title="Open {sourceFile} in VS Code"
      >Show component source</UIPillButton>
    {/if}
  </div>

  <div class="cfm-rows" class:in-sync={isApplied} class:promotable={compDirty || (productionDoc !== null && productionDoc !== editorDoc)}>
    <div class="cfm-row cfm-row-editor" class:dirty={compDirty} class:applied={isApplied}>
      <span class="cfm-rail" aria-hidden="true"></span>
      <div class="cfm-row-head">
        <span class="cfm-row-label">Editor</span>
        <span class="cfm-row-status" class:dirty={compDirty} class:applied={isApplied}>
          <i class="cfm-status-dot" aria-hidden="true"></i>
          <span>{compDirty ? 'unsaved' : isApplied ? 'live' : 'saved'}</span>
        </span>
      </div>
      <FilePill
        name={editorName}
        isProtected={editorDoc === 'default'}
        dirty={compDirty}
        applied={isApplied}
        protectedTitle="Running the config shipped with the component"
        title={compDirty
          ? 'Unsaved changes'
          : isApplied
            ? 'Production is running this config'
            : ''}
        style="flex: 0 1 11.25rem; min-width: 0; max-width: 11.25rem;"
      />
      <div class="cfm-actions">
        <ComponentFileMenu
          {component}
          {files}
          onsave={handleSave}
          onsaveAs={openSaveAs}
          onopenLoad={refreshFiles}
          onload={handleLoad}
          ondelete={handleDelete}
        />
        {#if resetVariables}
          <UISquareButton
            icon="fa-rotate-left"
            onclick={handleReset}
            disabled={!resetDirty}
            title="Revert unsaved changes to {editorName}"
          >Reset</UISquareButton>
        {/if}
      </div>
    </div>

    <div class="cfm-promote" aria-hidden="true">
      <i class="fas fa-arrow-down cfm-promote-icon"></i>
    </div>

    <div class="cfm-row cfm-row-production" class:applied={isApplied}>
      <span class="cfm-rail" aria-hidden="true"></span>
      <div class="cfm-row-head">
        <span class="cfm-row-label">Prod</span>
        <span class="cfm-row-status applied">
          <i class="cfm-status-dot" aria-hidden="true"></i>
          <span>live</span>
        </span>
      </div>
      <FilePill
        name={productionName}
        isProtected={productionDoc === 'default'}
        protectedTitle="Running the config shipped with the component"
        style="flex: 0 1 11.25rem; min-width: 0; max-width: 11.25rem;"
      />
      <div class="cfm-actions">
        <UISquareButton
          variant="success"
          icon={productionUpdateStatus === 'updating'
            ? 'fa-spinner'
            : productionUpdateStatus === 'done'
              ? 'fa-check'
              : productionUpdateStatus === 'error'
                ? 'fa-xmark'
                : 'fa-arrow-down'}
          onclick={handleAdopt}
          disabled={productionUpdateStatus === 'updating' || isApplied}
          title={isApplied
            ? 'Production is running this theme'
            : `Save "${openTheme.name}" and ship it to production`}
        >
          {#if productionUpdateStatus === 'idle'}Adopt{:else if productionUpdateStatus === 'updating'}Adopting{:else if productionUpdateStatus === 'done'}Adopted{:else}Error{/if}
        </UISquareButton>
        <UIInfoPopover title="Component Configuration" ariaLabel="About Save and Adopt">
          <p>
            <strong>Save</strong> keeps your edits in the theme you have open. The theme carries a copy of every component you changed, so the theme travels as one file.
          </p>
          <p>
            <strong>Save As</strong> writes the component's settings to a file of their own, ready to load into any theme.
          </p>
          <p>
            <strong>Adopt</strong> ships the whole theme to production, this component with it. Production runs one saved theme, so a component never ships alone.
          </p>
        </UIInfoPopover>
        {#if adoptFeedback}
          <span class="cfm-feedback" aria-live="polite">{adoptFeedback}</span>
        {/if}
      </div>
    </div>
  </div>
</header>

<SaveAsDialog
  bind:show={saveAsDialog}
  currentDisplayName={editorName}
  {files}
  reservedDisplayNames={files.filter((f) => f.fileName === 'default').map((f) => f.name)}
  title="Save Component As"
  placeholder="Component config name…"
  branchFromDefaultName={`my-${(title || 'component').toLowerCase().trim().replace(/\s+/g, '-')}`}
  onsave={confirmSaveAs}
/>

<SaveAsDialog
  bind:show={themeSaveAsDialog}
  currentDisplayName="My Theme"
  files={themes}
  reservedDisplayNames={themes.filter((m) => m.fileName === 'default').map((m) => m.name)}
  title="Save Theme As"
  placeholder="Theme name…"
  description="Adopting ships the whole theme, this component with it. The default theme is locked, so name a new theme for this site."
  reservedNameMessage='That name is reserved for the protected default theme.'
  onsave={onThemeSaveAs}
/>

<style>
  .cfm-bar {
    --cfm-applied: #5aa85e;
    --cfm-rail-neutral: var(--ui-border);
    --cfm-rail-dirty: var(--ui-highlight);
    --cfm-rail-applied: var(--cfm-applied);

    display: flex;
    flex-direction: column;
    gap: var(--ui-space-8);
  }

  .cfm-title-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: var(--ui-space-16);
    flex-wrap: wrap;
    max-width: 34rem;
    margin-bottom: var(--ui-space-16);
  }

  .cfm-title {
    margin: 0;
    min-width: 0;
    font-size: var(--ui-font-size-3xl);
    font-weight: var(--ui-font-weight-semibold);
    color: var(--ui-text-primary);
    line-height: 1.1;
  }

  /* ── two-row pipeline ─────────────────────────────────────── */
  .cfm-rows {
    display: flex;
    flex-direction: column;
    gap: var(--ui-space-6);
    max-width: 34rem;
  }

  .cfm-row {
    position: relative;
    display: flex;
    align-items: center;
    flex-wrap: wrap;
    gap: var(--ui-space-10);
    padding: var(--ui-space-8) var(--ui-space-10) var(--ui-space-8) var(--ui-space-16);
    background: var(--ui-surface-lower);
    border: 1px solid var(--ui-border-low);
    border-radius: var(--ui-radius-md);
  }

  .cfm-rail {
    position: absolute;
    left: 0;
    top: 0;
    bottom: 0;
    width: 3px;
    border-radius: var(--ui-radius-md) 0 0 var(--ui-radius-md);
    background: var(--cfm-rail-neutral);
    transition: background var(--ui-transition-base);
  }

  .cfm-row-editor.dirty .cfm-rail { background: var(--cfm-rail-dirty); }
  .cfm-row-editor.applied .cfm-rail { background: var(--cfm-rail-applied); }
  .cfm-row-production.applied .cfm-rail { background: var(--cfm-rail-applied); }

  /* row head — label stacked over a small status sub-label so the
     filename pill in each row starts at the same x and width */
  .cfm-row-head {
    flex-shrink: 0;
    width: 4.5rem;
    display: flex;
    flex-direction: column;
    gap: var(--ui-space-2);
  }

  .cfm-row-label {
    font-size: var(--ui-font-size-xs);
    font-weight: var(--ui-font-weight-semibold);
    color: var(--ui-text-secondary);
    line-height: 1.1;
  }

  .cfm-row-status {
    display: inline-flex;
    align-items: center;
    gap: var(--ui-space-4);
    font-size: 0.75rem;
    color: var(--ui-text-muted);
    line-height: 1;
  }

  .cfm-status-dot {
    width: 5px;
    height: 5px;
    border-radius: 50%;
    background: currentColor;
    opacity: 0.7;
    flex-shrink: 0;
  }

  .cfm-row-status.dirty {
    color: var(--ui-highlight);
  }
  .cfm-row-status.dirty .cfm-status-dot {
    opacity: 1;
    box-shadow: 0 0 0 3px color-mix(in srgb, var(--ui-highlight) 22%, transparent);
    animation: cfm-pulse 1.6s ease-in-out infinite;
  }

  .cfm-row-status.applied {
    color: var(--cfm-applied);
  }
  .cfm-row-status.applied .cfm-status-dot {
    opacity: 1;
  }

  /* actions cluster — sits directly next to the filename pill so the
     buttons stay near the input and don't drift under the open editor panel.
     position: relative anchors the info popover below the cluster. */
  .cfm-actions {
    position: relative;
    display: flex;
    align-items: center;
    gap: var(--ui-space-6);
    flex-wrap: wrap;
  }

  .cfm-feedback {
    font-size: var(--ui-font-size-xs);
    color: var(--cfm-applied);
    white-space: nowrap;
    animation: cfm-feedback-in 180ms ease;
  }

  @keyframes cfm-feedback-in {
    from { opacity: 0; transform: translateX(-2px); }
    to   { opacity: 1; transform: translateX(0); }
  }

  /* promote connector between rows */
  .cfm-promote {
    display: flex;
    align-items: center;
    justify-content: flex-start;
    /* aligns under the pill column: row left-padding + head width + row gap */
    padding-left: calc(var(--ui-space-16) + 4.5rem + var(--ui-space-10));
    height: 0.25rem;
    color: var(--ui-text-tertiary);
    font-size: 0.7rem;
    opacity: 0;
    transform: translateY(-2px);
    transition: opacity var(--ui-transition-base), transform var(--ui-transition-base), color var(--ui-transition-base);
    pointer-events: none;
  }

  .cfm-rows.promotable .cfm-promote {
    opacity: 0.85;
    transform: translateY(0);
    color: var(--ui-highlight);
  }

  .cfm-rows.in-sync .cfm-promote {
    opacity: 0;
  }

  .cfm-promote-icon {
    line-height: 1;
  }

  @keyframes cfm-pulse {
    0%, 100% { box-shadow: 0 0 0 3px color-mix(in srgb, var(--ui-highlight) 22%, transparent); }
    50%      { box-shadow: 0 0 0 5px color-mix(in srgb, var(--ui-highlight) 10%, transparent); }
  }
</style>
