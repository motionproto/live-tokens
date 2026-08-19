<script lang="ts">
  // The root of the look hierarchy: one Theme panel that owns the open theme,
  // with the colors and type and the components as parts that report rather
  // than manage.
  //
  // It is the only save, load and ship surface. Colors-and-type files are
  // presets: listed here so they stay loadable, never written by a save.
  import { onDestroy, onMount } from 'svelte';
  import { get } from 'svelte/store';
  import type { Theme, ThemeMeta, ColorsAndType, ColorsAndTypeMeta } from '../core/themes/themeTypes';
  import {
    listThemes,
    deleteTheme,
    getActiveTheme,
    getProductionTheme,
    loadTheme,
    applyTheme,
    adoptLook,
    freshName,
    saveAsTheme,
    saveActiveTheme,
    exportTheme,
    importTheme,
  } from '../core/themes/themeService';
  import {
    THEME_APPLIED_EVENT,
    type AppliedThemeDetail,
  } from '../core/themes/themeDocumentSync';
  import { countComponentsOffLook, lookProductionState } from '../core/themes/lookSummary';
  import { commitPreview, previewTheme, previewColorsAndType, revertPreview } from '../core/preview/lookPreview';
  import {
    deleteColorsAndType,
    hydrateColorsAndType,
    listColorsAndType,
    loadColorsAndType,
    persistColorsAndType,
    writeWorkingColorsAndType,
  } from '../core/themes/colorsAndTypeService';
  import {
    buildLoadRows,
    colorsOnlyIsForced,
    isColorsOnly,
    loadRowId,
    type LoadRow,
  } from '../core/themes/loadRows';
  import {
    listComponents,
    componentConfigFromState,
    writeWorkingComponentConfig,
    type ComponentSummary,
  } from '../core/components/componentConfigService';
  import { fontPairingLabel } from '../core/fonts/fontPairing';
  import {
    componentDirty,
    editorState,
    colorsAndTypeDirty,
    markComponentSaved,
  } from '../core/store/editorStore';
  import { openThemeSlug } from '../core/store/editorConfigStore';
  import { editorView } from '../core/store/editorViewStore';
  import {
    componentActiveRevision,
    productionRevision,
    bumpProductionRevision,
    liveMovedSinceBake,
    productionTheme,
    bumpComponentActiveRevision,
  } from '../core/productionPulse';
  import { flashStatus } from '../core/flashStatus';
  import UIInfoPopover from './UIInfoPopover.svelte';
  import UIPillButton from './UIPillButton.svelte';
  import FileLoadList from './FileLoadList.svelte';
  import FilePill from './FilePill.svelte';
  import UIDialog from './UIDialog.svelte';
  import SaveAsDialog from '../component-editor/scaffolding/SaveAsDialog.svelte';

  interface Props {
    /** False on the components page, which is the surface the link opens. */
    showComponentsLink?: boolean;
  }

  let { showComponentsLink = true }: Props = $props();

  let canOpenComponents = $derived(showComponentsLink && $editorView !== 'components');

  let files: ThemeMeta[] = $state([]);
  let colorsFiles: ColorsAndTypeMeta[] = $state([]);
  let rows = $derived(buildLoadRows(files, colorsFiles));
  let showFileList = $state(false);
  let saveAsDialog = $state(false);
  let saveComponentsDialog = $state(false);
  let pendingComponentSave: (() => Promise<void>) | null = null;
  let pendingComponentCount = $state(0);
  let saveStatus: 'idle' | 'saving' | 'saved' | 'error' = $state('idle');

  let currentDisplayName = $state('Motion Proto');
  let activeIsProtected = $derived($openThemeSlug === 'default');
  let activeRowId = $derived(loadRowId('look', $openThemeSlug));

  type SaveState = 'idle' | 'saving' | 'saved' | 'error';
  const setSaveStatus = (s: SaveState) => (saveStatus = s);

  let dirtyComponentCount = $derived(
    Object.values($componentDirty).filter(Boolean).length,
  );
  let unsavedEdits = $derived($colorsAndTypeDirty || dirtyComponentCount > 0);

  async function refreshFiles() {
    try {
      [files, colorsFiles] = await Promise.all([listThemes(), listColorsAndType()]);
    } catch {
      // silent — empty list
    }
  }

  async function refreshActive() {
    try {
      const active = await getActiveTheme();
      if (active) {
        openThemeSlug.set(active._fileName ?? 'default');
        currentDisplayName = active.name ?? $openThemeSlug;
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
      productionTheme.set(await getProductionTheme());
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
  // here answers one question — how many components carry an unsaved buffer.

  let components: ComponentSummary[] = $state([]);

  let componentsOffLook = $derived(countComponentsOffLook(components));

  async function refreshComponents() {
    try {
      components = await listComponents();
    } catch {
      // silent — keep the last answer rather than showing a wrong zero
    }
  }

  // Two signals move the components on their own: a component settling (saving
  // one writes its buffer without pulsing production), and a component editor
  // loading a preset with no edit in play, which only the component pulse
  // reports. Adopts arrive on the production pulse below.
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

  // A consumer can load a theme from the host while this iframe stays open.
  // The cross-document bridge hydrates this document's typed store; keep the
  // panel's local identity/summary state on that same payload as well.
  onMount(() => {
    const handleThemeApplied = (event: Event) => {
      const { result } = (event as CustomEvent<AppliedThemeDetail>).detail;
      currentDisplayName = result.theme.name;
    };
    document.addEventListener(THEME_APPLIED_EVENT, handleThemeApplied);
    return () => document.removeEventListener(THEME_APPLIED_EVENT, handleThemeApplied);
  });

  // Re-read whenever an Adopt fires, here or in a component editor: it saves
  // the open theme and moves the production pointer, so the identity, the
  // component summary and the production state shown here all need to track.
  // Skip the first tick (mount ran them already).
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

  // A capture reads the server's live state, so colors and type go to their
  // buffer first. Component editors retain their own save boundary; when any
  // are dirty, the theme panel offers to flush all of them in one explicit
  // step before continuing.
  //
  // The gate is `colorsAndTypeDirty`, not history: history counts every entry,
  // components included, so it would flush the colors over component-only work.
  async function flushColors(): Promise<void> {
    if (!$colorsAndTypeDirty) return;
    await persistColorsAndType(get(editorState), currentDisplayName);
  }

  async function flushComponents(displayName = currentDisplayName): Promise<void> {
    const dirtyComponents = Object.entries(get(componentDirty))
      .filter(([, dirty]) => dirty)
      .map(([component]) => component);
    if (dirtyComponents.length === 0) return;

    const state = get(editorState);
    await Promise.all(dirtyComponents.map((component) =>
      writeWorkingComponentConfig(
        component,
        componentConfigFromState(state, component, displayName),
      ),
    ));
    for (const component of dirtyComponents) markComponentSaved(component);
    bumpComponentActiveRevision();
  }

  function continueWithComponentChoice(action: () => Promise<void>): void {
    const dirtyCount = Object.values(get(componentDirty)).filter(Boolean).length;
    if (dirtyCount === 0) {
      void action();
      return;
    }
    pendingComponentCount = dirtyCount;
    pendingComponentSave = action;
    saveComponentsDialog = true;
  }

  async function confirmSaveAllComponents(): Promise<void> {
    const action = pendingComponentSave;
    pendingComponentSave = null;
    saveComponentsDialog = false;
    if (action) await action();
  }

  async function runSave(saveComponents: boolean) {
    saveStatus = 'saving';
    try {
      if (saveComponents) await flushComponents();
      await flushColors();
      await saveActiveTheme(currentDisplayName);
      await refreshActive();
      flashStatus(setSaveStatus, 'saved');
    } catch {
      flashStatus(setSaveStatus, 'error');
    }
  }

  function handleSave() {
    if (activeIsProtected) return;
    continueWithComponentChoice(() => runSave(true));
  }

  function openSaveAs() {
    continueWithComponentChoice(async () => {
      try {
        await flushComponents();
        showFileList = false;
        saveAsDialog = true;
      } catch {
        flashStatus(setSaveStatus, 'error');
      }
    });
  }

  async function confirmSaveAs(detail: { displayName: string; fileName: string }) {
    saveStatus = 'saving';
    try {
      await flushColors();
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
  // One action at the root, because production is one saved theme: Adopt saves
  // the open one and publishes it whole. The component editors' Adopt runs the
  // same flow, so a component can never ship on its own.

  type AdoptStatus = 'idle' | 'adopting' | 'done' | 'error';
  let adoptStatus: AdoptStatus = $state('idle');
  const setAdoptStatus = (s: AdoptStatus) => (adoptStatus = s);

  let production = $derived(
    lookProductionState({
      openTheme: $openThemeSlug,
      productionTheme: $productionTheme?._fileName ?? null,
      unpublished: unsavedEdits || $liveMovedSinceBake,
    }),
  );

  let adoptTitle = $derived.by(() => {
    if (production.inProduction) return 'Production is running this theme';
    if (production.unknown || production.themeOff) return 'Ship this theme to production';
    return 'Save this theme and ship it to production';
  });

  function handleAdopt() {
    if (production.inProduction || adoptStatus === 'adopting') return;
    continueWithComponentChoice(() => runAdopt(true));
  }

  /**
   * Adopt publishes what is saved, so the flow is flush, save, ship. The
   * protected Default theme cannot record what shipped: the user clicked
   * Adopt, and which file holds the look is bookkeeping they should not have
   * to think about, so it forks to a theme of their own first.
   */
  async function runAdopt(saveComponents = false) {
    adoptStatus = 'adopting';
    try {
      if (saveComponents) await flushComponents();
      await flushColors();
      if (activeIsProtected) {
        const taken = new Set((await listThemes()).map((m) => m.fileName));
        await saveAsTheme(freshName('my-theme', taken), 'My Theme');
        await refreshFiles();
        await refreshActive();
      } else {
        await saveActiveTheme(currentDisplayName);
      }
      await adoptLook();
      // The panel's own production pulse re-reads identity, the production
      // theme and the component summary.
      bumpProductionRevision();
      flashStatus(setAdoptStatus, 'done');
    } catch {
      flashStatus(setAdoptStatus, 'error', { durationMs: 3000 });
    }
  }

  // ── Colors & Type ─────────────────────────────────────────────────────
  //
  // Read-only identity: the two faces the theme is recognised by. The colors
  // and type belong to the theme, so nothing here names a file.

  let pairing = $derived(fontPairingLabel($editorState.fonts.stacks, $editorState.fonts.sources));

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

  function acceptPreview() {
    commitPreview();
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
    if (effectiveColorsOnly) previewColorsAndType(previewLook.colorsAndType);
    else await previewTheme(previewLook);
  }

  async function handleSelect(row: LoadRow) {
    if (row.fileName === previewRow?.fileName) return;
    // The open theme in whole-look mode is what the page already shows. In
    // colors-only mode it is a real operation: it puts the theme's own colors
    // back over whatever the user has edited.
    if (row.kind === 'look' && row.slug === $openThemeSlug && !isColorsOnly(row, colorsOnly)) {
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
    if (unsavedEdits) {
      const ok = window.confirm(
        'Loading a theme will replace the editor’s current state and discard unsaved changes. Continue?',
      );
      if (!ok) return;
    }
    // The exact theme being opened is already painted. Hand that preview to
    // the store load without restoring the old look across the request.
    acceptPreview();
    let result: Awaited<ReturnType<typeof applyTheme>>;
    try {
      result = await applyTheme(row.slug);
      if (result.skippedComponents.length > 0) {
        window.alert(
          `Loaded "${row.name}". These components are not installed here, so their `
            + `saved settings were skipped:\n\n${result.skippedComponents.join(', ')}`,
        );
      }
      currentDisplayName = result.theme.name;
      showFileList = false;
    } catch (err) {
      window.alert(`Failed to load theme: ${(err as Error).message}`);
      // The selection remains visible after a failed request; put its preview
      // back so the dialog and page continue to agree.
      previewRow = row;
      previewLook = row.kind === 'look' ? await loadTheme(row.slug).catch(() => null) : null;
      if (previewLook) await repaint();
      return;
    }

    // The picker is a one-step choose-and-ship flow. Package/user presets are
    // already saved documents, so adopting can publish them directly. The
    // protected baseline cannot be production's editable document; mirror the
    // normal Adopt behavior and fork it first when it is selected.
    adoptStatus = 'adopting';
    try {
      if (row.slug === 'default') {
        const taken = new Set((await listThemes()).map((m) => m.fileName));
        await saveAsTheme(freshName('my-theme', taken), 'My Theme');
        await refreshActive();
      }
      await adoptLook();
      bumpProductionRevision();
      flashStatus(setAdoptStatus, 'done');
    } catch (err) {
      window.alert(`Theme loaded, but could not be adopted: ${(err as Error).message}`);
      flashStatus(setAdoptStatus, 'error', { durationMs: 3000 });
    }
    await Promise.all([refreshFiles(), refreshComponents(), refreshProduction()]);
  }

  /**
   * Colors and type alone: the components stay as they are, so this loads the
   * colors half into the open theme rather than opening a new one. The picked
   * copy goes to the working buffer and onto the page; the theme itself is
   * unchanged until Save.
   */
  async function commitColorsOnly() {
    const row = previewRow;
    // Read the payload before the revert clears it. The read doors mark where
    // they answered from; the buffer holds content alone.
    const picked = previewLayer ?? previewLook?.colorsAndType ?? null;
    if (!row || !picked) return;
    const { _fileName, _source, ...buffer } = picked;
    if (unsavedEdits) {
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
      await writeWorkingColorsAndType(buffer);
      hydrateColorsAndType(structuredClone(buffer));
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
    // Kind and version travel as a pair: bundles exported before the rename say
    // `manifest-bundle` and are always v1. The server re-checks.
    const known =
      (bundle?.kind === 'manifest-bundle' && bundle.schemaVersion === 1) ||
      (bundle?.kind === 'theme-bundle' && bundle.schemaVersion === 3);
    if (!known) {
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
    if (row.kind === 'layer') return deleteColorsFile(row);
    // Deleting the open theme is legal: the server materialises only the
    // deltas needed to keep the look on screen. Where open lands depends on
    // something the client can't see — deleting a local copy that shadows a
    // shipped theme restores the shipped one and keeps naming it, while
    // deleting a local-only theme sends open back to Motion Proto.
    const wasActive = row.slug === $openThemeSlug;
    const ok = window.confirm(
      wasActive
        ? `Delete theme "${row.name}"? The editor moves to the version shipped with the package if there is one, otherwise Motion Proto. The look on screen stays as it is.`
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

  /** Colors and type files are presets: nothing live points at one, and the
   *  themes that carry those colors keep their own copy. */
  async function deleteColorsFile(row: LoadRow) {
    const ok = window.confirm(
      `Delete the colors and type file "${row.name}"? Your themes keep their own copies.`,
    );
    if (!ok) return;
    try {
      if (row.fileName === previewRow?.fileName) cancelPreview();
      await deleteColorsAndType(row.slug);
      await refreshFiles();
    } catch (err) {
      window.alert(`Failed to delete: ${(err as Error).message}`);
    }
  }

  function toggleFileList() {
    showFileList = !showFileList;
    if (showFileList) refreshFiles();
  }

  function openThemePicker() {
    showFileList = true;
    refreshFiles();
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
        It holds its own copy of that data, so the theme you open is the whole look, and one theme can never break another.
      </p>
      <p>
        <strong>Load</strong> opens the list. Picking a theme shows it on the page as a preview, so you can try each look with nothing written to disk. Pick another to compare, or <strong>Cancel</strong> to go back to where you were.
      </p>
      <p>
        <strong>Save</strong> opens and adopts the previewed theme: the editor works on it from then on and production ships it immediately. Components it does not carry go back to their defaults. Previewing and cancelling never change what your site ships.
      </p>
      <p>
        <strong>Colors and type only</strong> in that window takes the palette and the fonts and leaves your shapes and component settings alone.
      </p>
      <p>
        The <strong>active</strong> theme is the one the editor has open. <strong>Adopt</strong> saves it and ships it to production, colors and type plus every component you changed. The line under the name says whether production is running this theme.
      </p>
      <p>
        If components have unsaved edits, Save and Adopt offer to save all of them before continuing. You can cancel to review or save components individually.
      </p>
      <p>
        <strong>Motion Proto</strong> is the protected baseline. To start customizing, <strong>Save As</strong> a new theme first.
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
    <button
      type="button"
      class="theme-name-trigger"
      onclick={openThemePicker}
      title="Open the Theme Picker"
      aria-label={`Open Theme Picker. Current theme: ${currentDisplayName}`}
    >
      <FilePill
        name={currentDisplayName}
        isProtected={activeIsProtected}
        protectedTitle="Protected default theme"
        title={currentDisplayName}
        style="display: flex;"
      />
    </button>
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
          ? 'Motion Proto is read-only. Use Save As to capture under a new name.'
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
        title="Open the Theme Picker"
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

<UIDialog
  bind:show={saveComponentsDialog}
  title="Unsaved component edits"
  cancelLabel="Cancel"
  confirmLabel={pendingComponentCount === 1 ? 'Save component' : 'Save all components'}
  onconfirm={confirmSaveAllComponents}
  width="400px"
>
  <p class="save-components-message">
    {pendingComponentCount === 1
      ? '1 component has unsaved edits.'
      : `${pendingComponentCount} components have unsaved edits.`}
    Save {pendingComponentCount === 1 ? 'it' : 'all of them'} and continue?
  </p>
</UIDialog>

<FileLoadList
  bind:show={showFileList}
  title="Theme Picker"
  files={rows}
  activeFileName={activeRowId}
  selectedFileName={previewRow?.fileName ?? null}
  selectedBadge={{ label: 'Preview', title: 'Shown on the page now. Save to use and publish it.' }}
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
  .save-components-message {
    margin: 0;
    color: var(--ui-text-secondary);
    font-size: var(--ui-font-size-sm);
    line-height: 1.5;
  }

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

  .theme-name-trigger {
    display: block;
    width: 100%;
    padding: 0;
    border: 0;
    background: transparent;
    color: inherit;
    font: inherit;
    text-align: inherit;
    cursor: pointer;
  }

  .theme-name-trigger :global(.file-pill) {
    width: 100%;
  }

  .theme-name-trigger:hover :global(.file-pill),
  .theme-name-trigger:focus-visible :global(.file-pill) {
    border-color: var(--ui-border-higher);
    box-shadow: inset 0 0 0 1px var(--ui-border-high);
  }

  .theme-name-trigger:focus-visible {
    outline: 2px solid var(--ui-text-accent);
    outline-offset: 2px;
    border-radius: var(--ui-radius-md);
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
