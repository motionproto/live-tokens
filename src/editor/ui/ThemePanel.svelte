<script lang="ts">
  // The root of the look hierarchy: one Theme panel that owns the whole look,
  // with the colors-and-type layer and the components as parts that report
  // rather than manage.
  //
  // It is the only save, load and ship surface. The layer is internal: its
  // files still exist, and older ones are listed here as colors-and-type
  // entries, but nothing saves, loads or adopts them anywhere else.
  import { onDestroy, onMount } from 'svelte';
  import { get } from 'svelte/store';
  import type { Theme, ThemeMeta, ColorsAndType, ColorsAndTypeMeta } from '../core/themes/themeTypes';
  import {
    listThemes,
    deleteTheme,
    getActiveTheme,
    loadTheme,
    applyTheme,
    adoptLook,
    saveAsTheme,
    saveActiveTheme,
    exportTheme,
    importTheme,
  } from '../core/themes/themeService';
  import { countComponentsOffLook, lookProductionState } from '../core/themes/lookSummary';
  import { previewTheme, previewColorsAndType, revertPreview } from '../core/preview/lookPreview';
  import {
    deleteColorsAndType,
    getProductionInfo,
    hydrateColorsAndType,
    listColorsAndType,
    loadColorsAndType,
    persistColorsAndType,
    saveColorsAndType,
    setActiveFile,
  } from '../core/themes/colorsAndTypeService';
  import { freshName, layerFlushTarget } from '../core/themes/layerFlush';
  import {
    buildLoadRows,
    colorsOnlyIsForced,
    isColorsOnly,
    loadRowId,
    type LoadRow,
  } from '../core/themes/loadRows';
  import {
    listComponents,
    type ComponentSummary,
  } from '../core/components/componentConfigService';
  import { fontPairingLabel } from '../core/fonts/fontPairing';
  import { dirty, componentDirty, editorState, colorsAndTypeDirty } from '../core/store/editorStore';
  import { activeFileName as layerFileName } from '../core/store/editorConfigStore';
  import { editorView } from '../core/store/editorViewStore';
  import {
    componentActiveRevision,
    productionRevision,
    activeTheme,
    bumpProductionRevision,
    colorsAndTypeProductionInfo,
  } from '../core/productionPulse';
  import { flashStatus } from '../core/flashStatus';
  import UIInfoPopover from './UIInfoPopover.svelte';
  import UIPillButton from './UIPillButton.svelte';
  import FileLoadList from './FileLoadList.svelte';
  import FilePill from './FilePill.svelte';
  import SaveAsDialog from '../component-editor/scaffolding/SaveAsDialog.svelte';

  interface Props {
    /** False on the components page, which is the surface the link opens. */
    showComponentsLink?: boolean;
  }

  let { showComponentsLink = true }: Props = $props();

  let canOpenComponents = $derived(showComponentsLink && $editorView !== 'components');

  let files: ThemeMeta[] = $state([]);
  let layerFiles: ColorsAndTypeMeta[] = $state([]);
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

  async function refreshFiles() {
    try {
      [files, layerFiles] = await Promise.all([listThemes(), listColorsAndType()]);
      const activeLayer = layerFiles.find((f) => f.isActive);
      if (activeLayer) layerFileName.set(activeLayer.fileName);
    } catch {
      // silent — empty list
    }
  }

  async function refreshActive() {
    try {
      const active = await getActiveTheme();
      if (active) {
        activeFileName = active._fileName ?? 'default';
        currentDisplayName = active.name ?? activeFileName;
        const meta = (await listThemes()).find((f) => f.fileName === activeFileName) ?? null;
        activeTheme.set(meta);
        lookConfigs = active.componentConfigs;
      }
    } catch {
      // silent
    }
  }

  // A read that never lands leaves the production state unknown, and the panel
  // has nothing else that asks on its own between pulses. One delayed retry is
  // the way out of it.
  const PRODUCTION_RETRY_MS = 3000;
  let productionRetry: ReturnType<typeof setTimeout> | undefined;

  async function refreshProduction(retry = true) {
    try {
      colorsAndTypeProductionInfo.set(await getProductionInfo());
    } catch {
      if (retry) productionRetry = setTimeout(() => refreshProduction(false), PRODUCTION_RETRY_MS);
    }
  }

  // The store it writes outlives the panel, so a pending retry has to go with
  // the panel rather than land on a later mount's state.
  onDestroy(() => {
    if (productionRetry !== undefined) clearTimeout(productionRetry);
  });

  // ── Components ────────────────────────────────────────────────────────
  //
  // The per-component file managers live in the component editors; the list
  // here answers two questions at once — how many components run something the
  // active look does not carry, and which of them production is not running.

  let components: ComponentSummary[] = $state([]);
  let lookConfigs: Theme['componentConfigs'] | null = $state(null);

  let componentsOffLook = $derived(
    lookConfigs ? countComponentsOffLook(components, lookConfigs, activeIsProtected) : 0,
  );

  async function refreshComponents() {
    try {
      components = await listComponents();
    } catch {
      // silent — keep the last answer rather than showing a wrong zero
    }
  }

  // Two signals move the components on their own: a component settling (saving
  // one sets a new active file for it without pulsing production), and a
  // component editor pointing at another file with no edit in play, which only
  // the component pulse reports. Adopts arrive on the production pulse below.
  $effect(() => {
    void dirtyComponentCount;
    void $componentActiveRevision;
    refreshComponents();
  });

  function openComponents() {
    editorView.set('components');
  }

  onMount(async () => {
    await refreshFiles();
    await refreshActive();
    await refreshProduction();
  });

  // Re-read the active look whenever an Adopt fires, here or in a component
  // editor — the server patches our active file in those moments, so the
  // identity, the component summary and the production state shown here need
  // to track. Skip the first tick (mount ran them already).
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
    refreshComponents();
  });

  // A capture reads files, so the colors and type on screen go to their file
  // first — that is what makes Save and Adopt mean the look in front of you.
  // A component's edits live in its own editor's state, which this panel
  // cannot write, so those are the only ones a capture leaves behind.
  //
  // The gate is `colorsAndTypeDirty`, not the global `dirty`: that one counts every
  // history entry, components included, so it would write the layer over
  // component-only work — and fork "My Colors" out of the protected Default
  // to do it.
  async function flushLayer(): Promise<void> {
    if (!$colorsAndTypeDirty) return;
    const active = $layerFileName;
    const target = layerFlushTarget(
      active,
      layerFiles.find((f) => f.fileName === active)?.name ?? active,
      layerFiles.map((f) => f.fileName),
    );
    // persistColorsAndType writes the file, points active at it and clears dirty.
    await persistColorsAndType(get(editorState), target.fileName, target.displayName);
    await refreshFiles();
  }

  function confirmUnsavedComponents(action: string): boolean {
    if (dirtyComponentCount === 0) return true;
    const n = dirtyComponentCount;
    return window.confirm(
      `${n === 1 ? '1 component has' : `${n} components have`} unsaved edits. Those stay out `
        + `until you save them in the component editor. ${action}`,
    );
  }

  async function handleSave() {
    if (activeIsProtected) return;
    if (!confirmUnsavedComponents('Save the theme anyway?')) return;
    saveStatus = 'saving';
    try {
      await flushLayer();
      await saveActiveTheme(currentDisplayName);
      await refreshActive();
      flashStatus(setSaveStatus, 'saved');
    } catch {
      flashStatus(setSaveStatus, 'error');
    }
  }

  function openSaveAs() {
    if (!confirmUnsavedComponents('Save the theme anyway?')) return;
    showFileList = false;
    saveAsDialog = true;
  }

  async function confirmSaveAs(detail: { displayName: string; fileName: string }) {
    saveStatus = 'saving';
    try {
      await flushLayer();
      await saveAsTheme(detail.fileName, detail.displayName);
      await refreshFiles();
      await refreshActive();
      flashStatus(setSaveStatus, 'saved');
    } catch {
      flashStatus(setSaveStatus, 'error');
    }
  }

  // ── Adopt: ship the whole look ────────────────────────────────────────
  //
  // One action at the root, because a look ships as a whole: the colors and
  // type plus every component running something production does not have. The
  // component editors keep their own Adopt for shipping one component alone.

  type AdoptStatus = 'idle' | 'adopting' | 'done' | 'error';
  let adoptStatus: AdoptStatus = $state('idle');
  const setAdoptStatus = (s: AdoptStatus) => (adoptStatus = s);

  let production = $derived(
    lookProductionState($layerFileName, $colorsAndTypeProductionInfo?.fileName ?? null, components),
  );

  let adoptTitle = $derived.by(() => {
    if (production.inProduction) return 'Production is running this theme';
    if (production.unknown) return 'Ship this theme to production';
    const parts: string[] = [];
    if (production.colorsAndTypeOff) parts.push('the colors and type');
    const off = production.componentsOff.length;
    if (off > 0) parts.push(off === 1 ? '1 component' : `${off} components`);
    return `Ship ${parts.join(' and ')} to production`;
  });

  async function handleAdopt() {
    if (production.inProduction || adoptStatus === 'adopting') return;
    if (!confirmUnsavedComponents('Ship the theme anyway?')) return;
    await runAdopt();
  }

  /**
   * One Adopt, at most one fork. A 409 says the protected Default look is
   * active and cannot record what shipped, so the flow forks it and retries
   * once; a second 409 is a state this cannot name and surfaces as an error
   * rather than another file. The status holds at 'adopting' throughout, which
   * is what keeps `handleAdopt`'s re-entry guard closed across the fork.
   */
  async function runAdopt(depth = 0) {
    adoptStatus = 'adopting';
    try {
      await flushLayer();
      await adoptLook();
      // The panel's own production pulse re-reads identity, production state
      // and the component pointers.
      bumpProductionRevision();
      flashStatus(setAdoptStatus, 'done');
    } catch (err) {
      const e = err as Error & { code?: string };
      if (e.code === 'ACTIVE_IS_PROTECTED' && depth === 0) {
        // The user clicked Adopt, and which file holds the look is bookkeeping
        // they shouldn't have to think about.
        try {
          const taken = new Set((await listThemes()).map((m) => m.fileName));
          await saveAsTheme(freshName('my-theme', taken), 'My Theme');
        } catch {
          flashStatus(setAdoptStatus, 'error', { durationMs: 3000 });
          return;
        }
        await runAdopt(depth + 1);
        return;
      }
      flashStatus(setAdoptStatus, 'error', { durationMs: 3000 });
    }
  }

  // ── Colors & Type ─────────────────────────────────────────────────────
  //
  // Read-only identity: the two faces the theme is recognised by. The layer's
  // own files are working files, so nothing here names one.

  let pairing = $derived(fontPairingLabel($editorState.fonts.stacks, $editorState.fonts.sources));

  async function loadLayer(fileName: string) {
    try {
      await hydrateColorsAndType(fileName);
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
  // `$state.raw`: the preview engine structuredClones these, and a deep `$state`
  // proxy is not cloneable. Both are only ever reassigned whole.
  let previewLook: Theme | null = $state.raw(null);
  let previewLayer: ColorsAndType | null = $state.raw(null);
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
   *  theme's colors and type are the slice embedded in it, so one look
   *  previews either way. */
  async function repaint(): Promise<void> {
    if (previewLayer) {
      previewColorsAndType(previewLayer);
      return;
    }
    if (!previewLook) return;
    if (effectiveColorsOnly) previewColorsAndType(previewLook.theme);
    else await previewTheme(previewLook);
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
      const look = row.kind === 'look' ? await loadTheme(row.slug) : null;
      const layer = row.kind === 'layer' ? await loadColorsAndType(row.slug) : null;
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
      const result = await applyTheme(row.slug);
      if (result.skippedComponents.length > 0) {
        window.alert(
          `Loaded "${row.name}". These components are not installed here, so their `
            + `saved settings were skipped:\n\n${result.skippedComponents.join(', ')}`,
        );
      }
      // applyTheme atomically flips active + production pointers and
      // syncs tokens.css; reload to rehydrate the editor from the
      // now-active theme + component configs.
      window.location.reload();
    } catch (err) {
      window.alert(`Failed to load theme: ${(err as Error).message}`);
    }
  }

  /**
   * Colors and type alone: the components stay as they are, so this is the
   * layer load, not Apply. A theme's colors and type live inside it, so they
   * are written out as a working file under the theme's own name first
   * — the same materialisation Apply does for the theme half — and then made
   * active. The Default theme needs no write: its layer is the package file
   * already sitting under that name.
   */
  async function commitColorsOnly() {
    const row = previewRow;
    // Read the payload before the revert clears it.
    const colorsAndType = previewLook?.theme ?? null;
    if (!row) return;
    if ($dirty) {
      const ok = window.confirm(
        'Loading colors and type will discard unsaved changes. Continue?',
      );
      if (!ok) return;
    }
    // The look's copy lands under the look's own name. A user file already
    // sitting there (a tuned shadow of this look's colors) would be replaced,
    // and if that file is production, production regenerates from the copy.
    const shadow = colorsAndType && row.slug !== 'default'
      ? layerFiles.find((f) => f.fileName === row.slug && !f.isPackage)
      : undefined;
    if (shadow) {
      const hitsProduction = $colorsAndTypeProductionInfo?.fileName === row.slug;
      const ok = window.confirm(
        `Replace your saved colors and type "${shadow.name}" with this theme's copy?`
          + (hitsProduction ? ' It is in production, so production updates too.' : ''),
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
      if (colorsAndType && row.slug !== 'default') await saveColorsAndType(row.slug, colorsAndType);
      await setActiveFile(row.slug);
      layerFileName.set(row.slug);
      await hydrateColorsAndType(row.slug);
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
      await exportTheme(row.slug);
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
      const result = await importTheme(bundle);
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
        window.alert(`Imported as "${result.theme}".\n\n${notes.join('\n\n')}`);
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
      await deleteTheme(row.slug);
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
      await deleteColorsAndType(row.slug);
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
        await loadLayer($layerFileName);
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
        The <strong>active</strong> theme is what the editor reads. <strong>Adopt</strong> ships the whole look to production: the colors and type plus every component you changed. The line under the name says whether production is running this theme.
      </p>
      <p>
        Save and Adopt both take the colors and type on screen as they are, writing them out for you. Component edits are the exception: save those in the component's own editor first.
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
    <span class="mfm-prod-status" class:applied={production.inProduction}>
      <i class="mfm-status-dot" aria-hidden="true"></i>
      <span>
        {#if production.unknown}production unknown{:else if production.inProduction}in production{:else}out of sync{/if}
      </span>
    </span>
    <button
      class="mfm-adopt-btn"
      class:adopting={adoptStatus === 'adopting'}
      class:adopted={adoptStatus === 'done'}
      class:error={adoptStatus === 'error'}
      class:in-sync={production.inProduction}
      onclick={handleAdopt}
      disabled={adoptStatus === 'adopting' || production.inProduction}
      title={adoptTitle}
    >
      <i
        class="fas"
        class:fa-arrow-down={adoptStatus === 'idle'}
        class:fa-spinner={adoptStatus === 'adopting'}
        class:fa-check={adoptStatus === 'done'}
        class:fa-xmark={adoptStatus === 'error'}
      ></i>
      <span>
        {#if adoptStatus === 'idle'}Adopt{:else if adoptStatus === 'adopting'}Adopting{:else if adoptStatus === 'done'}Adopted{:else}Error{/if}
      </span>
    </button>
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
          : 'Update this theme from the look on screen'}
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

  <!-- Parts of the look: what each holds now, no lifecycle of its own. -->
  <div class="look-parts">
    <div class="part-head part-static">
      <span class="part-label">Colors &amp; Type</span>
      <span class="part-summary">
        {#if pairing}
          <span class="part-summary-sep">·</span>
          <span class="part-summary-text" title={pairing}>{pairing}</span>
        {/if}
      </span>
      <UIInfoPopover title="Colors &amp; Type" ariaLabel="About colors and type">
        <p>
          <strong>Colors &amp; type</strong> is the part of the theme your design tokens live in. Components read those tokens for their own appearance.
        </p>
        <p>
          The two faces named here are the heading and body fonts the page is showing.
        </p>
        <p>
          To load colors and type without touching your shapes, open <strong>Load</strong> above and turn on <strong>Colors and type only</strong>.
        </p>
      </UIInfoPopover>
    </div>

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

  /* Production state of the whole look, under the name it ships as. */
  .mfm-prod-status {
    display: inline-flex;
    align-items: center;
    gap: var(--ui-space-4);
    font-size: 0.7rem;
    color: var(--ui-text-muted);
    line-height: 1;
  }

  .mfm-status-dot {
    width: 5px;
    height: 5px;
    border-radius: 50%;
    background: currentColor;
    opacity: 0.7;
    flex-shrink: 0;
  }

  .mfm-prod-status.applied {
    color: var(--mfm-active);
  }

  .mfm-prod-status.applied .mfm-status-dot {
    opacity: 1;
  }

  /* The ship action. Green is the file-state exception to the greyscale rule,
     shared with the component editors' own Adopt. */
  .mfm-adopt-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: var(--ui-space-6);
    width: 100%;
    padding: var(--ui-space-6) var(--ui-space-12);
    background: color-mix(in srgb, var(--mfm-active) 18%, var(--ui-surface-high));
    border: 1px solid color-mix(in srgb, var(--mfm-active) 45%, var(--ui-border-high));
    border-radius: var(--ui-radius-md);
    color: var(--ui-text-primary);
    font-family: inherit;
    font-size: var(--ui-font-size-md);
    font-weight: var(--ui-font-weight-medium);
    cursor: pointer;
    transition: all var(--ui-transition-fast);
    white-space: nowrap;
  }

  .mfm-adopt-btn i {
    width: 1rem;
    text-align: center;
    font-size: 0.85em;
  }

  .mfm-adopt-btn:hover:not(:disabled) {
    background: color-mix(in srgb, var(--mfm-active) 30%, var(--ui-surface-higher));
    border-color: color-mix(in srgb, var(--mfm-active) 70%, var(--ui-border-higher));
  }

  .mfm-adopt-btn:disabled {
    cursor: not-allowed;
  }

  .mfm-adopt-btn.in-sync {
    background: transparent;
    border-color: var(--ui-border-low);
    color: var(--ui-text-muted);
    opacity: 0.7;
  }

  .mfm-adopt-btn.adopting i {
    animation: mfm-spin 0.8s linear infinite;
  }

  .mfm-adopt-btn.adopted {
    background: color-mix(in srgb, var(--mfm-active) 30%, var(--ui-surface-high));
    color: var(--mfm-active);
  }

  .mfm-adopt-btn.error {
    color: var(--ui-text-muted);
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
    padding-left: var(--ui-space-8);
  }

  .part-label {
    font-size: var(--ui-font-size-sm);
    color: var(--ui-text-secondary);
    flex-shrink: 0;
  }

  .part-summary {
    display: inline-flex;
    align-items: center;
    gap: var(--ui-space-4);
    flex: 1 1 auto;
    min-width: 0;
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

  .part-summary-text {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
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
