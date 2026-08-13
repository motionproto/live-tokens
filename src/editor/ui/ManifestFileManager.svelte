<script lang="ts">
  import { onDestroy, onMount } from 'svelte';
  import type { ManifestMeta } from '../core/themes/themeTypes';
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
  import { previewManifest, revertPreview } from '../core/manifests/manifestPreview';
  import { dirty, componentDirty } from '../core/store/editorStore';
  import { productionRevision, activeManifest } from '../core/productionPulse';
  import { flashStatus } from '../core/flashStatus';
  import UIInfoPopover from './UIInfoPopover.svelte';
  import FileLoadList from './FileLoadList.svelte';
  import FilePill from './FilePill.svelte';
  import SaveAsDialog from '../component-editor/scaffolding/SaveAsDialog.svelte';

  let files: ManifestMeta[] = $state([]);
  let showFileList = $state(false);
  let saveAsDialog = $state(false);
  let saveStatus: 'idle' | 'saving' | 'saved' | 'error' = $state('idle');

  let activeFileName = $state('default');
  let currentDisplayName = $state('Default');
  let activeIsProtected = $derived(activeFileName === 'default');

  type SaveState = 'idle' | 'saving' | 'saved' | 'error';
  const setSaveStatus = (s: SaveState) => (saveStatus = s);

  let dirtyComponentCount = $derived(
    Object.values($componentDirty).filter(Boolean).length,
  );
  let editorDirty = $derived($dirty || dirtyComponentCount > 0);

  async function refreshFiles() {
    try {
      files = await listManifests();
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
      }
    } catch {
      // silent
    }
  }

  onMount(async () => {
    await refreshFiles();
    await refreshActive();
  });

  // Re-read active manifest whenever a sibling Adopt fires — the server
  // patches our active file in those moments, so the timestamp + refs
  // displayed here need to track. Skip the first tick (refreshActive ran
  // already on mount).
  let pulseInitialised = false;
  $effect(() => {
    void $productionRevision;
    if (!pulseInitialised) {
      pulseInitialised = true;
      return;
    }
    refreshActive();
  });

  // A manifest captures the saved files, not the editor's live state. Warn
  // before capturing if there are unsaved theme/component edits, since those
  // won't make it into the manifest until they're saved.
  function confirmUnsavedExclusion(): boolean {
    if (!editorDirty) return true;
    return window.confirm(
      'You have unsaved theme or component changes. A manifest captures saved files, ' +
        'so these edits will not be included. Save them first to capture them. ' +
        'Save the manifest anyway?',
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

  // ── Preview ───────────────────────────────────────────────────────────
  //
  // Selecting a row paints that look on the page and leaves the window open;
  // nothing is written until Save. Cancelling — or closing the window by any
  // route — repaints the user's live state, unsaved edits included.

  let previewFile: ManifestMeta | null = $state(null);

  function cancelPreview() {
    revertPreview();
    previewFile = null;
  }

  async function handleSelect(file: ManifestMeta) {
    if (file.fileName === previewFile?.fileName) return;
    if (file.fileName === activeFileName) {
      cancelPreview();
      return;
    }
    try {
      await previewManifest(await loadManifest(file.fileName));
      previewFile = file;
    } catch (err) {
      window.alert(`Failed to preview manifest: ${(err as Error).message}`);
      cancelPreview();
    }
  }

  async function handleSavePreview() {
    const file = previewFile;
    if (!file) return;
    if (editorDirty) {
      const ok = window.confirm(
        'Loading a manifest will reload the editor and discard unsaved changes. Continue?',
      );
      if (!ok) return;
    }
    // The window stays open until the page reloads: closing it would revert the
    // preview and flash the outgoing look while Apply is in flight.
    try {
      const result = await applyManifest(file.fileName);
      if (result.skippedComponents.length > 0) {
        window.alert(
          `Loaded "${file.name}". These components are not installed here, so their ` +
            `saved settings were skipped:\n\n${result.skippedComponents.join(', ')}`,
        );
      }
      // applyManifest atomically flips active + production pointers and
      // syncs tokens.css; reload to rehydrate the editor from the
      // now-active theme + component configs.
      window.location.reload();
    } catch (err) {
      window.alert(`Failed to apply manifest: ${(err as Error).message}`);
    }
  }

  // Closing the window is cancelling: the X, the backdrop and the Cancel button
  // all just flip `show`, so watching it covers every exit.
  $effect(() => {
    if (!showFileList) cancelPreview();
  });

  onDestroy(cancelPreview);

  async function handleExport(file: ManifestMeta) {
    try {
      await exportManifest(file.fileName);
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
      window.alert('Not a manifest bundle (missing kind discriminator).');
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
          `The bundle was missing this data, which fell back to the default:\n${result.dropped.join('\n')}`,
        );
      }
      if (notes.length > 0) {
        window.alert(`Imported as "${result.manifest}".\n\n${notes.join('\n\n')}`);
      }
    } catch (err) {
      window.alert(`Failed to import: ${(err as Error).message}`);
    }
  }

  async function handleDelete(file: ManifestMeta) {
    if (file.isProtected) return;
    // Deleting the active manifest is legal, and the theme and component files
    // on disk are untouched either way. Where active lands depends on something
    // the client can't see: deleting a local copy that shadows a shipped
    // manifest restores the shipped one and keeps the pointer on it, while
    // deleting a local-only manifest sends active back to Default.
    const wasActive = file.fileName === activeFileName;
    const ok = window.confirm(
      wasActive
        ? `Delete manifest "${file.name}"? Active goes to the version shipped with the package if there is one, otherwise Default. Your theme and component files stay as they are.`
        : `Delete manifest "${file.name}"?`,
    );
    if (!ok) return;
    try {
      await deleteManifest(file.fileName);
      if (file.fileName === previewFile?.fileName) cancelPreview();
      await refreshFiles();
      if (wasActive) await refreshActive();
    } catch (err) {
      window.alert(`Failed to delete: ${(err as Error).message}`);
    }
  }

  function toggleFileList() {
    showFileList = !showFileList;
    if (showFileList) refreshFiles();
  }
</script>

<div class="manifest-file-manager">
  <div class="mfm-header">
    <span class="mfm-header-label">Manifest</span>
    <UIInfoPopover title="Manifests" ariaLabel="About manifests">
      <p>
        A <strong>manifest</strong> is a whole look in one file: the theme plus a config for every component you changed.
      </p>
      <p>
        It holds its own copy of that data, so deleting a theme or component file never breaks a saved manifest.
      </p>
      <p>
        <strong>Load</strong> opens the list. Picking a manifest shows it on the page as a preview, so you can try each look with nothing written to disk. Pick another to compare, or <strong>Cancel</strong> to go back to where you were.
      </p>
      <p>
        <strong>Save</strong> keeps the previewed look: it writes the look back out to working files named after the manifest. A manifest owns its name: any theme or component file already using it is overwritten. Components the manifest does not carry go back to their defaults.
      </p>
      <p>
        The <strong>active</strong> manifest is what the editor reads and what production runs. Theme and component <strong>Adopt</strong> actions update it in place.
      </p>
      <p>
        <strong>Default</strong> is protected. To start customizing, <strong>Save As</strong> a new manifest first.
      </p>
    </UIInfoPopover>
  </div>

  <div class="mfm-card" class:protected={activeIsProtected}>
    <span class="mfm-rail" aria-hidden="true"></span>
    <div class="mfm-card-head">
      <span class="mfm-card-label">Active</span>
      {#if activeIsProtected}
        <span class="mfm-badge protected" title="The default manifest is read-only">
          <i class="fas fa-lock" aria-hidden="true"></i>
          <span>protected</span>
        </span>
      {/if}
    </div>
    <FilePill
      name={currentDisplayName}
      isProtected={activeIsProtected}
      protectedTitle="Protected default manifest"
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
          ? 'Default is read-only — use Save As to capture under a new name'
          : 'Re-stamp the active manifest with the current editor state'}
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
      <button class="mfm-btn mfm-btn-row" onclick={openSaveAs} title="Save current state as a new manifest">
        <i class="fas fa-copy"></i>
        <span>Save As…</span>
      </button>
      <button
        class="mfm-btn mfm-btn-row"
        class:active={showFileList}
        onclick={toggleFileList}
        title="Preview a manifest, then save it to load it"
      >
        <i class="fas fa-folder-open"></i>
        <span>Load…</span>
      </button>
      <button
        class="mfm-btn mfm-btn-row"
        onclick={openImport}
        title="Import a shared manifest bundle"
      >
        <i class="fas fa-file-import"></i>
        <span>Import…</span>
      </button>
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
  title="Load Manifest"
  {files}
  {activeFileName}
  selectedFileName={previewFile?.fileName ?? null}
  selectedBadge={{ label: 'Preview', title: 'Shown on the page now. Save to keep it.' }}
  cancelLabel={previewFile ? 'Cancel' : 'Close'}
  confirmLabel={previewFile ? 'Save' : ''}
  onconfirm={handleSavePreview}
  onload={handleSelect}
  ondelete={handleDelete}
  onexport={handleExport}
  exportTitle={(f) => `Export "${f.name}" as a shareable bundle`}
/>

<SaveAsDialog
  bind:show={saveAsDialog}
  {currentDisplayName}
  {files}
  title="Save Manifest As"
  placeholder="Manifest name…"
  reservedNameMessage='The name "default" is reserved for the protected baseline.'
  branchFromDefaultName="my-manifest"
  onsave={confirmSaveAs}
/>

<style>
  .manifest-file-manager {
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
</style>
