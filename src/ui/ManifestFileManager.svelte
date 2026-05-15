<script lang="ts">
  import { onMount } from 'svelte';
  import type { ManifestMeta } from '../lib/themeTypes';
  import {
    listManifests,
    deleteManifest,
    getActiveManifest,
    applyManifest,
    saveAsManifest,
    saveActiveManifest,
  } from '../lib/manifestService';
  import { dirty, componentDirty } from '../lib/editorStore';
  import { productionRevision, activeManifest } from '../lib/productionPulse';
  import UIDialog from './UIDialog.svelte';
  import UIInfoPopover from './UIInfoPopover.svelte';
  import SaveAsDialog from '../component-editor/scaffolding/SaveAsDialog.svelte';

  let files: ManifestMeta[] = $state([]);
  let showFileList = $state(false);
  let saveAsDialog = $state(false);
  let saveStatus: 'idle' | 'saving' | 'saved' | 'error' = $state('idle');

  let activeFileName = $state('default');
  let currentDisplayName = $state('Default');
  let activeIsProtected = $derived(activeFileName === 'default');

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
        // Default is always labeled "Default" regardless of what the on-disk
        // name field says (older default.json files may have "Default Preset").
        currentDisplayName = activeFileName === 'default'
          ? 'Default'
          : (active.name ?? activeFileName);
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

  function flashSave(state: Exclude<typeof saveStatus, 'idle'>) {
    saveStatus = state;
    setTimeout(() => { saveStatus = 'idle'; }, 2000);
  }

  async function handleSave() {
    if (activeIsProtected) return;
    saveStatus = 'saving';
    try {
      await saveActiveManifest(currentDisplayName);
      await refreshActive();
      flashSave('saved');
    } catch {
      flashSave('error');
    }
  }

  function openSaveAs() {
    showFileList = false;
    saveAsDialog = true;
  }

  async function confirmSaveAs(detail: { displayName: string; fileName: string }) {
    saveStatus = 'saving';
    try {
      await saveAsManifest(detail.fileName, detail.displayName);
      await refreshFiles();
      await refreshActive();
      flashSave('saved');
    } catch {
      flashSave('error');
    }
  }

  async function handleApply(file: ManifestMeta) {
    if (editorDirty) {
      const ok = window.confirm(
        'Loading a manifest will reload the editor and discard unsaved changes. Continue?',
      );
      if (!ok) return;
    }
    showFileList = false;
    try {
      await applyManifest(file.fileName);
      // applyManifest atomically flips active pointers; reload to rehydrate
      // the editor from the now-active theme + component configs.
      window.location.reload();
    } catch (err) {
      window.alert(`Failed to apply manifest: ${(err as Error).message}`);
    }
  }

  async function handleDelete(file: ManifestMeta) {
    if (file.isProtected) return;
    if (file.fileName === activeFileName) {
      window.alert('Cannot delete the active manifest. Load another manifest first.');
      return;
    }
    const ok = window.confirm(`Delete manifest "${file.name}"?`);
    if (!ok) return;
    try {
      await deleteManifest(file.fileName);
      await refreshFiles();
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
        A <strong>manifest</strong> pins one theme plus one config file per component.
      </p>
      <p>
        The <strong>active</strong> manifest is what the editor reads and what production runs. Theme and component <strong>Adopt</strong> actions auto-update its file.
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
    <div class="mfm-pill">
      <span class="mfm-pill-name" title={currentDisplayName}>{currentDisplayName}</span>
    </div>
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
        title="Load a manifest"
      >
        <i class="fas fa-folder-open"></i>
        <span>Load…</span>
      </button>
    </div>
  </div>
</div>

<UIDialog bind:show={showFileList} title="Load Manifest" cancelLabel="Close" width="420px">
  <div class="load-list">
    {#each files as file}
      <div class="load-item" class:active={file.fileName === activeFileName}>
        <button class="load-name-btn" onclick={() => handleApply(file)}>
          {file.name}
          {#if file.isProtected}
            <i class="fas fa-lock load-lock" aria-hidden="true" title="Protected"></i>
          {/if}
        </button>
        {#if file.fileName === activeFileName}
          <span class="active-badge">active</span>
        {/if}
        {#if !file.isProtected}
          <button
            class="file-delete-btn"
            onclick={() => handleDelete(file)}
            title="Delete this manifest"
          >
            <i class="fas fa-trash"></i>
          </button>
        {/if}
      </div>
    {/each}
  </div>
</UIDialog>

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
    --mfm-rail-neutral: var(--ui-border-default);
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
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }

  .mfm-card {
    position: relative;
    display: flex;
    flex-direction: column;
    gap: var(--ui-space-6);
    padding: var(--ui-space-8) var(--ui-space-10) var(--ui-space-10) var(--ui-space-16);
    background: var(--ui-surface-lower);
    border: 1px solid var(--ui-border-subtle);
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
    font-size: 10px;
    font-weight: var(--ui-font-weight-semibold);
    letter-spacing: 0.08em;
    text-transform: uppercase;
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

  .mfm-pill {
    display: flex;
    align-items: center;
    padding: var(--ui-space-6) var(--ui-space-10);
    background: var(--ui-surface-high);
    border: 1px solid var(--ui-border-faint);
    border-radius: var(--ui-radius-sm);
    overflow: hidden;
  }

  .mfm-pill-name {
    font-size: var(--ui-font-size-sm);
    color: var(--ui-text-primary);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
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
    border: 1px solid var(--ui-border-faint);
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

  .load-list {
    display: flex;
    flex-direction: column;
    gap: var(--ui-space-4);
    min-width: 320px;
  }

  .load-item {
    display: flex;
    align-items: center;
    gap: var(--ui-space-8);
    padding: var(--ui-space-6) var(--ui-space-10);
    background: var(--ui-surface-lower);
    border: 1px solid var(--ui-border-subtle);
    border-radius: var(--ui-radius-sm);
  }

  .load-item.active {
    border-color: var(--mfm-active);
  }

  .load-name-btn {
    flex: 1;
    display: inline-flex;
    align-items: center;
    gap: var(--ui-space-6);
    padding: 0;
    background: transparent;
    border: 0;
    color: var(--ui-text-primary);
    font-family: inherit;
    font-size: var(--ui-font-size-sm);
    text-align: left;
    cursor: pointer;
  }

  .load-name-btn:hover {
    color: var(--ui-highlight);
  }

  .load-lock {
    font-size: 0.78em;
    color: var(--ui-text-tertiary);
  }

  .active-badge {
    font-size: var(--ui-font-size-xs);
    color: var(--mfm-active);
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }

  .file-delete-btn {
    padding: var(--ui-space-4) var(--ui-space-6);
    background: transparent;
    border: 0;
    color: var(--ui-text-tertiary);
    font-size: var(--ui-font-size-sm);
    line-height: 1;
    cursor: pointer;
    transition: color var(--ui-transition-fast);
  }

  .file-delete-btn:hover {
    color: var(--ui-text-primary);
  }

  @keyframes mfm-spin {
    from { transform: rotate(0deg); }
    to   { transform: rotate(360deg); }
  }
</style>
