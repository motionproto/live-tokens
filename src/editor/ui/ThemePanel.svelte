<script lang="ts">
  // The root of the look hierarchy: one Theme panel that owns the whole look,
  // with the colors-and-type layer and the components as disclosed parts. The
  // file behind it is still a manifest, which is why the code keeps that name;
  // the word does not appear in the UI.
  //
  // It is also the only save and load surface. The layer is internal: its files
  // still exist, and older ones are listed here as colors-and-type entries, but
  // nothing saves or loads them anywhere else.
  import { onDestroy, onMount } from 'svelte';
  import { get } from 'svelte/store';
  import { slide } from 'svelte/transition';
  import type { Manifest, ManifestMeta, Theme, ThemeMeta } from '../core/themes/themeTypes';
  import {
    listManifests,
    deleteManifest,
    getActiveManifest,
    loadManifest,
    applyManifest,
    saveAsManifest,
    saveActiveManifest,
    exportManifest,
    importManifest,
  } from '../core/manifests/manifestService';
  import { countComponentsOffLook } from '../core/manifests/lookSummary';
  import { previewManifest, previewTheme, revertPreview } from '../core/preview/lookPreview';
  import {
    deleteTheme,
    getProductionInfo,
    hydrateTheme,
    listThemes,
    loadTheme,
    persistTheme,
    saveTheme,
    setActiveFile,
  } from '../core/themes/themeService';
  import {
    buildLoadRows,
    colorsOnlyIsForced,
    isColorsOnly,
    loadRowId,
    type LoadRow,
  } from '../core/themes/loadRows';
  import { listComponents } from '../core/components/componentConfigService';
  import { dirty, componentDirty, editorState } from '../core/store/editorStore';
  import { activeFileName as layerFileName } from '../core/store/editorConfigStore';
  import { editorView } from '../core/store/editorViewStore';
  import {
    componentActiveRevision,
    productionRevision,
    activeManifest,
    bumpProductionRevision,
    themeProductionInfo,
  } from '../core/productionPulse';
  import { flashStatus } from '../core/flashStatus';
  import UIInfoPopover from './UIInfoPopover.svelte';
  import UIPillButton from './UIPillButton.svelte';
  import FileLoadList from './FileLoadList.svelte';
  import FilePill from './FilePill.svelte';
  import ColorsTypePart from './ColorsTypePart.svelte';
  import SaveAsDialog from '../component-editor/scaffolding/SaveAsDialog.svelte';

  interface Props {
    /** False on the components page, which is the surface the link opens. */
    showComponentsLink?: boolean;
  }

  let { showComponentsLink = true }: Props = $props();

  let canOpenComponents = $derived(showComponentsLink && $editorView !== 'components');

  let files: ManifestMeta[] = $state([]);
  let layerFiles: ThemeMeta[] = $state([]);
  let rows = $derived(buildLoadRows(files, layerFiles));
  let showFileList = $state(false);
  let saveAsDialog = $state(false);
  let saveStatus: 'idle' | 'saving' | 'saved' | 'error' = $state('idle');

  let activeFileName = $state('default');
  let currentDisplayName = $state('Default');
  let activeIsProtected = $derived(activeFileName === 'default');
  let activeRowId = $derived(loadRowId('look', activeFileName));

  type SaveState = 'idle' | 'saving' | 'saved' | 'error';
  const setSaveStatus = (s: SaveState) => (saveStatus = s);

  let dirtyComponentCount = $derived(
    Object.values($componentDirty).filter(Boolean).length,
  );
  let editorDirty = $derived($dirty || dirtyComponentCount > 0);

  const reduceMotion =
    typeof window !== 'undefined'
    && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches === true;
  const slideDur = reduceMotion ? 0 : 200;

  async function refreshFiles() {
    try {
      [files, layerFiles] = await Promise.all([listManifests(), listThemes()]);
      const activeLayer = layerFiles.find((f) => f.isActive);
      if (activeLayer) {
        layerFileName.set(activeLayer.fileName);
        layerDisplayName = activeLayer.name;
      }
    } catch {
      // silent — empty list
    }
  }

  async function refreshActive() {
    try {
      const active = await getActiveManifest();
      if (active) {
        activeFileName = active._fileName ?? 'default';
        currentDisplayName = active.name ?? activeFileName;
        const meta = (await listManifests()).find((f) => f.fileName === activeFileName) ?? null;
        activeManifest.set(meta);
        lookConfigs = active.componentConfigs;
      }
    } catch {
      // silent
    }
  }

  async function refreshProduction() {
    try {
      themeProductionInfo.set(await getProductionInfo());
    } catch {
      // silent — leave the cached value in place
    }
  }

  // ── Components part ───────────────────────────────────────────────────
  //
  // A summary, not a manager: the per-component file managers live in the
  // component editors. The count says how many components run something the
  // active look does not carry.

  let componentsOffLook = $state(0);
  let lookConfigs: Manifest['componentConfigs'] | null = $state(null);

  async function refreshComponentSummary() {
    if (!lookConfigs) return;
    try {
      componentsOffLook = countComponentsOffLook(
        await listComponents(),
        lookConfigs,
        activeFileName === 'default',
      );
    } catch {
      // silent — keep the last count rather than showing a wrong zero
    }
  }

  // Three signals move this count: the look itself changing, a component
  // settling (saving one sets a new active file for it without pulsing
  // production), and a component editor pointing at another file with no edit
  // in play, which only the component pulse reports.
  $effect(() => {
    void lookConfigs;
    void dirtyComponentCount;
    void $componentActiveRevision;
    refreshComponentSummary();
  });

  function openComponents() {
    editorView.set('components');
  }

  onMount(async () => {
    await refreshFiles();
    await refreshActive();
    await refreshProduction();
  });

  // Re-read the active look whenever a part's Adopt fires — the server patches
  // our active file in those moments, so the identity, the component summary
  // and the production state shown here need to track. Skip the first tick
  // (mount ran them already).
  let pulseInitialised = false;
  $effect(() => {
    void $productionRevision;
    if (!pulseInitialised) {
      pulseInitialised = true;
      return;
    }
    refreshActive();
    refreshProduction();
    refreshFiles();
  });

  // A theme captures the saved files, not the editor's live state. Warn before
  // capturing if there are unsaved edits, since those won't make it in.
  function confirmUnsavedExclusion(): boolean {
    if (!editorDirty) return true;
    return window.confirm(
      'You have unsaved changes. A theme captures what is saved, so these edits will not be '
        + 'included. Adopt them first to include them. Save the theme anyway?',
    );
  }

  async function handleSave() {
    if (activeIsProtected) return;
    if (!confirmUnsavedExclusion()) return;
    saveStatus = 'saving';
    try {
      await saveActiveManifest(currentDisplayName);
      await refreshActive();
      flashStatus(setSaveStatus, 'saved');
    } catch {
      flashStatus(setSaveStatus, 'error');
    }
  }

  function openSaveAs() {
    if (!confirmUnsavedExclusion()) return;
    showFileList = false;
    saveAsDialog = true;
  }

  async function confirmSaveAs(detail: { displayName: string; fileName: string }) {
    saveStatus = 'saving';
    try {
      await saveAsManifest(detail.fileName, detail.displayName);
      await refreshFiles();
      await refreshActive();
      flashStatus(setSaveStatus, 'saved');
    } catch {
      flashStatus(setSaveStatus, 'error');
    }
  }

  // ── Colors & Type part ────────────────────────────────────────────────
  //
  // The layer is a status surface with one action: Adopt. The panel owns its
  // data so the summary reads true while the part is collapsed, and its two
  // file operations so both hosts get the same working part with no wiring.

  let layerOpen = $state(false);
  let layerDisplayName = $state('Default Theme');
  // Unknown until production answers; treating that as out of sync would open
  // the part on every mount.
  let layerOutOfSync = $derived(
    $themeProductionInfo !== null && $themeProductionInfo.fileName !== $layerFileName,
  );

  // Out of sync is the one state that needs the user, so the part opens itself
  // the first time it appears. Manual collapse sticks: reopening on every
  // render would fight the user.
  let autoOpened = false;
  $effect(() => {
    if (layerOutOfSync && !autoOpened) {
      autoOpened = true;
      layerOpen = true;
    }
  });

  async function saveLayer(detail: { fileName: string; displayName: string }) {
    await persistTheme(get(editorState), detail.fileName, detail.displayName);
    layerDisplayName = detail.displayName;
    await refreshFiles();
  }

  async function loadLayer(detail: { fileName: string }) {
    try {
      await hydrateTheme(detail.fileName);
    } catch {
      // silent
    }
  }

  // ── Preview ───────────────────────────────────────────────────────────
  //
  // Selecting a row paints that theme on the page and leaves the window open;
  // nothing is written until Save. Cancelling — or closing the window by any
  // route — repaints the user's live state, unsaved edits included.

  let previewRow: LoadRow | null = $state(null);
  let previewLook: Manifest | null = $state(null);
  let previewLayer: Theme | null = $state(null);
  let colorsOnly = $state(false);
  let effectiveColorsOnly = $derived(isColorsOnly(previewRow, colorsOnly));
  let colorsOnlyLocked = $derived(colorsOnlyIsForced(previewRow));

  function cancelPreview() {
    revertPreview();
    previewRow = null;
    previewLook = null;
    previewLayer = null;
  }

  /** Paint whatever is selected, through the engine the mode calls for. A
   *  theme's colors and type are its manifest's embedded theme, so one look
   *  previews either way. */
  async function repaint(): Promise<void> {
    if (previewLayer) {
      previewTheme(previewLayer);
      return;
    }
    if (!previewLook) return;
    if (effectiveColorsOnly) previewTheme(previewLook.theme);
    else await previewManifest(previewLook);
  }

  async function handleSelect(row: LoadRow) {
    if (row.fileName === previewRow?.fileName) return;
    // The active look in whole-look mode is what the page already shows. In
    // colors-only mode it is a real operation: it puts the theme's own colors
    // back over whatever the user has edited.
    if (row.kind === 'look' && row.slug === activeFileName && !isColorsOnly(row, colorsOnly)) {
      cancelPreview();
      return;
    }
    try {
      const look = row.kind === 'look' ? await loadManifest(row.slug) : null;
      const layer = row.kind === 'layer' ? await loadTheme(row.slug) : null;
      // The window may have closed during the fetch; painting then would leave
      // a preview on screen with no Save or Cancel in sight.
      if (!showFileList) return;
      previewRow = row;
      previewLook = look;
      previewLayer = layer;
      await repaint();
    } catch (err) {
      window.alert(`Failed to preview theme: ${(err as Error).message}`);
      cancelPreview();
    }
  }

  async function handleToggleColorsOnly(next: boolean) {
    colorsOnly = next;
    if (previewRow) await repaint();
  }

  async function handleSavePreview() {
    if (!previewRow) return;
    if (effectiveColorsOnly) {
      await commitColorsOnly();
      return;
    }
    await commitWholeLook();
  }

  async function commitWholeLook() {
    const row = previewRow;
    if (!row) return;
    if (editorDirty) {
      const ok = window.confirm(
        'Loading a theme will reload the editor and discard unsaved changes. Continue?',
      );
      if (!ok) return;
    }
    // The window stays open until the page reloads: closing it would revert the
    // preview and flash the outgoing look while Apply is in flight.
    try {
      const result = await applyManifest(row.slug);
      if (result.skippedComponents.length > 0) {
        window.alert(
          `Loaded "${row.name}". These components are not installed here, so their `
            + `saved settings were skipped:\n\n${result.skippedComponents.join(', ')}`,
        );
      }
      // applyManifest atomically flips active + production pointers and
      // syncs tokens.css; reload to rehydrate the editor from the
      // now-active theme + component configs.
      window.location.reload();
    } catch (err) {
      window.alert(`Failed to load theme: ${(err as Error).message}`);
    }
  }

  /**
   * Colors and type alone: the components stay as they are, so this is the
   * layer load, not Apply. A theme's colors and type live inside its manifest,
   * so they are written out as a working file under the theme's own name first
   * — the same materialisation Apply does for the theme half — and then made
   * active. The Default theme needs no write: its layer is the package file
   * already sitting under that name.
   */
  async function commitColorsOnly() {
    const row = previewRow;
    // Read the payload before the revert clears it.
    const theme = previewLook?.theme ?? null;
    if (!row) return;
    if ($dirty) {
      const ok = window.confirm(
        'Loading colors and type will discard unsaved changes. Continue?',
      );
      if (!ok) return;
    }
    // Hand the page back to the store before loading. The renderer diffs
    // against its own last-applied set, which never saw the preview's direct
    // writes; starting from the live look makes the load land exactly as it
    // does with no preview in play.
    cancelPreview();
    showFileList = false;
    try {
      if (theme && row.slug !== 'default') await saveTheme(row.slug, theme);
      await setActiveFile(row.slug);
      layerFileName.set(row.slug);
      layerDisplayName = theme?.name ?? row.name;
      await hydrateTheme(row.slug);
      await refreshFiles();
    } catch (err) {
      window.alert(`Failed to load colors and type: ${(err as Error).message}`);
    }
  }

  // Closing the window is cancelling: the X, the backdrop and the Cancel button
  // all just flip `show`, so watching it covers every exit.
  $effect(() => {
    if (!showFileList) cancelPreview();
  });

  onDestroy(cancelPreview);

  async function handleExport(row: LoadRow) {
    try {
      await exportManifest(row.slug);
    } catch (err) {
      window.alert(`Failed to export: ${(err as Error).message}`);
    }
  }

  let importInput: HTMLInputElement | null = $state(null);

  function openImport() {
    importInput?.click();
  }

  async function handleImportFile(event: Event) {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    input.value = ''; // allow re-picking the same file later
    if (!file) return;
    let bundle: any;
    try {
      bundle = JSON.parse(await file.text());
    } catch {
      window.alert('Selected file is not valid JSON.');
      return;
    }
    if (bundle?.kind !== 'manifest-bundle') {
      window.alert('That file is not an exported theme.');
      return;
    }
    try {
      const result = await importManifest(bundle);
      await refreshFiles();
      const notes: string[] = [];
      const renameCount = Object.keys(result.renames).length;
      if (renameCount > 0) {
        const summary = Object.entries(result.renames)
          .map(([k, v]) => `${k} → ${v}`)
          .join('\n');
        notes.push(`${renameCount} file(s) renamed to avoid collisions:\n${summary}`);
      }
      if (result.dropped.length > 0) {
        notes.push(
          `The file was missing this data, which fell back to the default:\n${result.dropped.join('\n')}`,
        );
      }
      if (notes.length > 0) {
        window.alert(`Imported as "${result.manifest}".\n\n${notes.join('\n\n')}`);
      }
    } catch (err) {
      window.alert(`Failed to import: ${(err as Error).message}`);
    }
  }

  async function handleDelete(row: LoadRow) {
    if (row.isProtected) return;
    if (row.kind === 'layer') return deleteLayerFile(row);
    // Deleting the active theme is legal, and the working files on disk are
    // untouched either way. Where active lands depends on something the client
    // can't see: deleting a local copy that shadows a shipped theme restores the
    // shipped one and keeps the pointer on it, while deleting a local-only theme
    // sends active back to Default.
    const wasActive = row.slug === activeFileName;
    const ok = window.confirm(
      wasActive
        ? `Delete theme "${row.name}"? Active goes to the version shipped with the package if there is one, otherwise Default. Your working files stay as they are.`
        : `Delete theme "${row.name}"?`,
    );
    if (!ok) return;
    try {
      await deleteManifest(row.slug);
      if (row.fileName === previewRow?.fileName) cancelPreview();
      await refreshFiles();
      if (wasActive) await refreshActive();
    } catch (err) {
      window.alert(`Failed to delete: ${(err as Error).message}`);
    }
  }

  /** Colors and type files are working files: the themes that carry them keep
   *  their own copy, so deleting one breaks nothing. */
  async function deleteLayerFile(row: LoadRow) {
    const wasActive = row.slug === $layerFileName;
    const ok = window.confirm(
      wasActive
        ? `Delete the colors and type file "${row.name}"? The editor moves to the version shipped with the package if there is one, otherwise the default. Your themes keep their own copies.`
        : `Delete the colors and type file "${row.name}"? Your themes keep their own copies.`,
    );
    if (!ok) return;
    try {
      if (wasActive || row.fileName === previewRow?.fileName) cancelPreview();
      await deleteTheme(row.slug);
      await refreshFiles();
      // Deleting the production file is legal now that themes carry their own
      // copy; the server heals the pointer and resyncs the CSS, so re-read
      // production rather than trusting the cached value.
      await refreshProduction();
      bumpProductionRevision();
      if (wasActive) {
        // Not always the default: deleting a local copy that shadows a shipped
        // file restores it and the pointer keeps naming it. refreshFiles()
        // already read back whichever name survived.
        await loadLayer({ fileName: $layerFileName });
      }
    } catch (err) {
      window.alert(`Failed to delete: ${(err as Error).message}`);
    }
  }

  function toggleFileList() {
    showFileList = !showFileList;
    if (showFileList) refreshFiles();
  }

  function rowBadge(row: LoadRow) {
    return row.kind === 'layer'
      ? { label: 'colors & type', title: 'Holds colors and type only, no shapes' }
      : null;
  }
</script>

<div class="look-panel">
  <div class="mfm-header">
    <span class="mfm-header-label">Theme</span>
    <UIInfoPopover title="Theme" ariaLabel="About the theme">
      <p>
        A <strong>theme</strong> is a whole look in one file: the colors and type plus a setting for every component you changed.
      </p>
      <p>
        It holds its own copy of that data, so deleting a working file never breaks a saved theme.
      </p>
      <p>
        <strong>Load</strong> opens the list. Picking a theme shows it on the page as a preview, so you can try each look with nothing written to disk. Pick another to compare, or <strong>Cancel</strong> to go back to where you were.
      </p>
      <p>
        <strong>Save</strong> keeps the previewed theme: it writes the look back out to working files named after the theme. A theme owns its name: any working file already using it is overwritten. Components the theme does not carry go back to their defaults.
      </p>
      <p>
        <strong>Colors and type only</strong> in that window takes the palette and the fonts and leaves your shapes and component settings alone.
      </p>
      <p>
        The <strong>active</strong> theme is what the editor reads and what production runs. <strong>Adopt</strong> in a part below updates it in place.
      </p>
      <p>
        <strong>Default</strong> is protected. To start customizing, <strong>Save As</strong> a new theme first.
      </p>
    </UIInfoPopover>
  </div>

  <div class="mfm-card" class:protected={activeIsProtected}>
    <span class="mfm-rail" aria-hidden="true"></span>
    <div class="mfm-card-head">
      <span class="mfm-card-label">Active</span>
      {#if activeIsProtected}
        <span class="mfm-badge protected" title="The default theme is read-only">
          <i class="fas fa-lock" aria-hidden="true"></i>
          <span>protected</span>
        </span>
      {/if}
    </div>
    <FilePill
      name={currentDisplayName}
      isProtected={activeIsProtected}
      protectedTitle="Protected default theme"
      title={currentDisplayName}
      style="display: flex;"
    />
    <div class="mfm-card-actions">
      <button
        class="mfm-btn mfm-btn-row save-btn"
        class:saving={saveStatus === 'saving'}
        class:saved={saveStatus === 'saved'}
        class:error={saveStatus === 'error'}
        onclick={handleSave}
        disabled={activeIsProtected || saveStatus === 'saving'}
        title={activeIsProtected
          ? 'Default is read-only. Use Save As to capture under a new name.'
          : 'Update this theme from your saved files'}
      >
        <i
          class="fas"
          class:fa-save={saveStatus === 'idle'}
          class:fa-spinner={saveStatus === 'saving'}
          class:fa-check={saveStatus === 'saved'}
          class:fa-times={saveStatus === 'error'}
        ></i>
        <span>
          {#if saveStatus === 'idle'}Save{:else if saveStatus === 'saving'}Saving{:else if saveStatus === 'saved'}Saved{:else}Error{/if}
        </span>
      </button>
      <button class="mfm-btn mfm-btn-row" onclick={openSaveAs} title="Save the current look as a new theme">
        <i class="fas fa-copy"></i>
        <span>Save As…</span>
      </button>
      <button
        class="mfm-btn mfm-btn-row"
        class:active={showFileList}
        onclick={toggleFileList}
        title="Preview a theme, then save it to load it"
      >
        <i class="fas fa-folder-open"></i>
        <span>Load…</span>
      </button>
      <button
        class="mfm-btn mfm-btn-row"
        onclick={openImport}
        title="Import a theme someone shared"
      >
        <i class="fas fa-file-import"></i>
        <span>Import…</span>
      </button>
    </div>
  </div>

  <!-- Parts of the look, permanent identity above, layer plumbing below. -->
  <div class="look-parts">
    <div class="part-head">
      <button
        type="button"
        class="part-toggle"
        class:expanded={layerOpen}
        aria-expanded={layerOpen}
        aria-controls="look-part-layer"
        onclick={() => (layerOpen = !layerOpen)}
      >
        <i class="fas fa-chevron-right chevron" aria-hidden="true"></i>
        <span class="part-label">Colors &amp; Type</span>
        <span class="part-summary">
          <span class="part-summary-sep">·</span>
          {#if $dirty}
            <span class="part-summary-dirty">unsaved</span>
          {:else if layerOutOfSync}
            <span class="part-summary-dirty">not in production</span>
          {:else}
            <span>live</span>
          {/if}
        </span>
      </button>
      <UIInfoPopover title="Colors &amp; Type" ariaLabel="About colors and type">
        <p>
          <strong>Colors &amp; type</strong> is the part of the theme your design tokens live in. Components read those tokens for their own appearance.
        </p>
        <p>
          <strong>Adopt</strong> puts what you see into production and updates the theme above to match. It is the ship step.
        </p>
        <p>
          To load colors and type without touching your shapes, open <strong>Load</strong> above and turn on <strong>Colors and type only</strong>.
        </p>
      </UIInfoPopover>
    </div>
    {#if layerOpen}
      <div id="look-part-layer" class="part-body" transition:slide|local={{ duration: slideDur }}>
        <ColorsTypePart
          displayName={layerDisplayName}
          onsave={saveLayer}
          onload={loadLayer}
        />
      </div>
    {/if}

    <div class="part-head part-static">
      <span class="part-label">Components</span>
      <span class="part-summary">
        <span class="part-summary-sep">·</span>
        {#if componentsOffLook > 0}
          <span class="part-summary-count">{componentsOffLook}</span>
          <span>off the theme</span>
        {:else}
          <span>in sync</span>
        {/if}
      </span>
      {#if canOpenComponents}
        <UIPillButton
          size="compact"
          icon="fa-cubes"
          title="Open the component editors"
          onclick={openComponents}
        >
          Open
        </UIPillButton>
      {/if}
    </div>
  </div>
</div>

<!-- Hidden file input for Import; clicked via openImport(). -->
<input
  bind:this={importInput}
  type="file"
  accept=".json,application/json"
  onchange={handleImportFile}
  style="display: none;"
/>

<FileLoadList
  bind:show={showFileList}
  title="Load Theme"
  files={rows}
  activeFileName={activeRowId}
  selectedFileName={previewRow?.fileName ?? null}
  selectedBadge={{ label: 'Preview', title: 'Shown on the page now. Save to keep it.' }}
  {rowBadge}
  cancelLabel={previewRow ? 'Cancel' : 'Close'}
  confirmLabel={previewRow ? 'Save' : ''}
  onconfirm={handleSavePreview}
  onload={handleSelect}
  ondelete={handleDelete}
  onexport={(row) => handleExport(row)}
  canExport={(row) => row.kind === 'look'}
  exportTitle={(row) => `Export "${row.name}" as a file you can share`}
>
  {#snippet options()}
    <label
      class="colors-only"
      class:locked={colorsOnlyLocked}
      title={colorsOnlyLocked ? 'This file holds colors and type, so that is all it can load.' : ''}
    >
      <input
        class="ui-form-checkbox"
        type="checkbox"
        checked={effectiveColorsOnly}
        disabled={colorsOnlyLocked}
        onchange={(e) => handleToggleColorsOnly(e.currentTarget.checked)}
      />
      <span>Colors and type only. Keep my shapes.</span>
    </label>
  {/snippet}
</FileLoadList>

<SaveAsDialog
  bind:show={saveAsDialog}
  {currentDisplayName}
  {files}
  title="Save Theme As"
  placeholder="Theme name…"
  reservedNameMessage='The name "default" is reserved for the protected baseline.'
  branchFromDefaultName="My Theme"
  onsave={confirmSaveAs}
/>

<style>
  .look-panel {
    --mfm-active: #5aa85e;
    --mfm-rail-neutral: var(--ui-border);
    --mfm-rail-active: var(--mfm-active);

    display: flex;
    flex-direction: column;
    gap: var(--ui-space-8);
  }

  .mfm-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: var(--ui-space-4);
    padding: 0 var(--ui-space-4);
  }

  .mfm-header-label {
    font-size: var(--ui-font-size-xs);
    color: var(--ui-text-secondary);
  }

  .mfm-card {
    position: relative;
    display: flex;
    flex-direction: column;
    gap: var(--ui-space-6);
    padding: var(--ui-space-8) var(--ui-space-10) var(--ui-space-10) var(--ui-space-16);
    background: var(--ui-surface-lower);
    border: 1px solid var(--ui-border-low);
    border-radius: var(--ui-radius-md);
  }

  .mfm-rail {
    position: absolute;
    left: 0;
    top: 0;
    bottom: 0;
    width: 3px;
    border-radius: var(--ui-radius-md) 0 0 var(--ui-radius-md);
    background: var(--mfm-rail-active);
    transition: background var(--ui-transition-base);
  }

  .mfm-card.protected .mfm-rail {
    background: var(--mfm-rail-neutral);
  }

  .mfm-card-head {
    display: flex;
    align-items: baseline;
    justify-content: space-between;
    gap: var(--ui-space-8);
  }

  .mfm-card-label {
    font-size: var(--ui-font-size-xs);
    font-weight: var(--ui-font-weight-semibold);
    color: var(--ui-text-tertiary);
  }

  .mfm-badge {
    display: inline-flex;
    align-items: center;
    gap: var(--ui-space-4);
    font-size: var(--ui-font-size-xs);
    color: var(--ui-text-tertiary);
  }

  .mfm-badge.protected i {
    font-size: 0.8em;
  }

  .mfm-card-actions {
    display: flex;
    flex-direction: column;
    gap: var(--ui-space-4);
  }

  .mfm-btn {
    display: inline-flex;
    align-items: center;
    justify-content: flex-start;
    gap: var(--ui-space-8);
    padding: var(--ui-space-6) var(--ui-space-10);
    background: var(--ui-surface-high);
    border: 1px solid var(--ui-border-low);
    border-radius: var(--ui-radius-sm);
    color: var(--ui-text-primary);
    font-family: inherit;
    font-size: var(--ui-font-size-sm);
    line-height: 1;
    cursor: pointer;
    transition: background var(--ui-transition-fast), color var(--ui-transition-fast);
  }

  .mfm-btn:hover:not(:disabled) {
    background: var(--ui-hover);
  }

  .mfm-btn:disabled {
    cursor: not-allowed;
    opacity: 0.5;
  }

  .mfm-btn.active {
    background: var(--ui-active);
  }

  .mfm-btn.saved { color: var(--mfm-active); }
  .mfm-btn.error { color: var(--ui-error, #c0392b); }

  .mfm-btn .fa-spinner {
    animation: mfm-spin 0.8s linear infinite;
  }

  @keyframes mfm-spin {
    from { transform: rotate(0deg); }
    to   { transform: rotate(360deg); }
  }

  /* Parts. Each reads as a row belonging to the card above, so they sit inside
     the panel with the same left inset the card's rail gives its content. */
  .look-parts {
    display: flex;
    flex-direction: column;
    gap: var(--ui-space-4);
    padding: 0 var(--ui-space-4);
  }

  .part-head {
    display: flex;
    align-items: center;
    gap: var(--ui-space-6);
    min-height: 24px;
  }

  .part-static {
    padding-left: calc(0.75rem + var(--ui-space-8));
  }

  .part-toggle {
    display: flex;
    align-items: center;
    gap: var(--ui-space-8);
    flex: 1 1 auto;
    min-width: 0;
    padding: 0;
    background: none;
    border: 0;
    color: inherit;
    font: inherit;
    text-align: left;
    cursor: pointer;
  }

  .part-toggle .chevron {
    width: 0.75rem;
    font-size: 0.625rem;
    color: var(--ui-text-tertiary);
    transition: transform var(--ui-transition-fast);
  }

  .part-toggle.expanded .chevron {
    transform: rotate(90deg);
  }

  .part-label {
    font-size: var(--ui-font-size-sm);
    color: var(--ui-text-secondary);
  }

  .part-summary {
    display: inline-flex;
    align-items: center;
    gap: var(--ui-space-4);
    flex: 1 1 auto;
    font-size: var(--ui-font-size-xs);
    color: var(--ui-text-tertiary);
  }

  .part-summary-sep {
    color: var(--ui-border);
  }

  .part-summary-count {
    font-family: var(--ui-font-mono);
    font-variant-numeric: tabular-nums;
    color: var(--ui-text-secondary);
  }

  .part-summary-dirty {
    color: var(--ui-highlight);
  }

  .part-body {
    padding: var(--ui-space-6) 0 var(--ui-space-8);
  }

  /* Rendered inside the Load window, so it carries this panel's scope. */
  .colors-only {
    display: flex;
    align-items: center;
    gap: var(--ui-space-8);
    font-size: var(--ui-font-size-sm);
    color: var(--ui-text-secondary);
    cursor: pointer;
    user-select: none;
  }

  .colors-only:hover {
    color: var(--ui-text-primary);
  }

  .colors-only.locked {
    color: var(--ui-text-muted);
    cursor: default;
  }
</style>
