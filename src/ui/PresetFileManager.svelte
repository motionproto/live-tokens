<script lang="ts">
  import { stopPropagation } from 'svelte/legacy';

  import { onMount } from 'svelte';
  import type { PresetMeta } from '../lib/themeTypes';
  import {
    listPresets,
    deletePreset,
    captureCurrentAsPreset,
    applyPreset,
    getActivePreset,
  } from '../lib/presetService';
  import { sanitizeFileName } from '../lib/themeService';
  import { dirty } from '../lib/editorStore';
  import UIDialog from './UIDialog.svelte';

  let files: PresetMeta[] = $state([]);
  let showFileList = $state(false);
  let saveAsEditing = $state(false);
  let saveAsName = $state('');
  let saveAsInput: HTMLInputElement | undefined = $state();

  let activeFileName = $state('default');
  let currentDisplayName = $state('Default');

  let saveStatus: 'idle' | 'saving' | 'saved' | 'error' = $state('idle');
  let applyStatus: 'idle' | 'applying' = $state('idle');

  async function refreshFiles() {
    try {
      files = await listPresets();
      const active = files.find((f) => f.isActive);
      if (active) {
        activeFileName = active.fileName;
        currentDisplayName = active.name;
      }
    } catch {
      // silent — empty list
    }
  }

  async function refreshActive() {
    try {
      const active = await getActivePreset();
      if (active) {
        activeFileName = active._fileName ?? activeFileName;
        currentDisplayName = active.name;
      }
    } catch {
      // silent
    }
  }

  onMount(async () => {
    await refreshActive();
    await refreshFiles();
  });

  /** Standard "save dirty editor first?" gate. Returns true if the caller
   *  should proceed with capturing from disk; false to abort. */
  function confirmDirtyCapture(): boolean {
    if (!$dirty) return true;
    return window.confirm(
      'You have unsaved changes in the editor. They will not be included in the preset (presets are built from the named files on disk). Continue saving the preset anyway?',
    );
  }

  async function doCapture(fileName: string, displayName: string) {
    saveStatus = 'saving';
    try {
      await captureCurrentAsPreset(fileName, displayName);
      activeFileName = fileName;
      currentDisplayName = displayName;
      saveStatus = 'saved';
      setTimeout(() => { saveStatus = 'idle'; }, 2000);
      await refreshFiles();
    } catch {
      saveStatus = 'error';
      setTimeout(() => { saveStatus = 'idle'; }, 3000);
    }
  }

  async function handleSave() {
    if (!confirmDirtyCapture()) return;
    await doCapture(activeFileName, currentDisplayName);
  }

  async function handleSaveIncrement() {
    if (!confirmDirtyCapture()) return;
    const baseName = currentDisplayName.replace(/_\d+$/, '');
    const baseFileName = sanitizeFileName(baseName);
    const existingNums = files
      .filter(
        (f) => f.fileName === baseFileName || f.fileName.match(new RegExp(`^${baseFileName}_\\d+$`)),
      )
      .map((f) => {
        const m = f.fileName.match(/_(\d+)$/);
        return m ? parseInt(m[1], 10) : 0;
      });
    const next = (existingNums.length > 0 ? Math.max(...existingNums) : 0) + 1;
    const suffix = String(next).padStart(2, '0');
    const displayName = `${baseName}_${suffix}`;
    const fileName = `${baseFileName}_${suffix}`;
    await doCapture(fileName, displayName);
  }

  function openSaveAs() {
    saveAsName = currentDisplayName;
    saveAsEditing = true;
    showFileList = false;
    setTimeout(() => saveAsInput?.select(), 0);
  }

  async function confirmSaveAs() {
    const displayName = saveAsName.trim();
    if (!displayName) return;
    const fileName = sanitizeFileName(displayName);
    if (fileName === 'default') {
      saveAsName = '';
      return;
    }
    if (!confirmDirtyCapture()) return;
    saveAsEditing = false;
    await doCapture(fileName, displayName);
  }

  function cancelSaveAs() {
    saveAsEditing = false;
    saveAsName = '';
  }

  function handleSaveAsKeydown(e: KeyboardEvent) {
    if (e.key === 'Enter') confirmSaveAs();
    if (e.key === 'Escape') cancelSaveAs();
  }

  async function handleApply(file: PresetMeta) {
    if ($dirty) {
      const ok = window.confirm(
        'Loading a preset will reload the editor and discard unsaved changes. Continue?',
      );
      if (!ok) return;
    }
    showFileList = false;
    applyStatus = 'applying';
    try {
      await applyPreset(file.fileName);
      // Page reload: simplest path — editor rehydrates from the now-active
      // theme + component configs the server just pinned for us.
      window.location.reload();
    } catch (err) {
      applyStatus = 'idle';
      window.alert(`Failed to apply preset: ${(err as Error).message}`);
    }
  }

  async function handleDelete(file: PresetMeta) {
    if (file.fileName === 'default') return;
    try {
      await deletePreset(file.fileName);
      await refreshFiles();
      if (file.fileName === activeFileName) {
        activeFileName = 'default';
        currentDisplayName = 'Default';
      }
    } catch {
      // silent
    }
  }

  function toggleFileList() {
    showFileList = !showFileList;
    saveAsEditing = false;
    if (showFileList) refreshFiles();
  }
</script>

<div class="preset-file-manager">
  <div class="active-file">
    <span class="active-label">Preset</span>
    <span class="active-name">{currentDisplayName}</span>
  </div>

  <div class="button-grid">
    <div class="save-row">
      <button
        class="pfm-btn save-btn"
        class:saving={saveStatus === 'saving'}
        class:saved={saveStatus === 'saved'}
        class:error={saveStatus === 'error'}
        onclick={handleSave}
        disabled={saveStatus === 'saving' || applyStatus === 'applying'}
        title="Capture the current theme + component configs into this preset"
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
      <button
        class="pfm-btn increment-btn"
        onclick={handleSaveIncrement}
        disabled={saveStatus === 'saving' || applyStatus === 'applying'}
        title="Save as incremented preset"
      >
        <i class="fas fa-plus"></i>
      </button>
    </div>

    {#if saveAsEditing}
      <div class="save-as-inline">
        <input
          class="save-as-input"
          type="text"
          bind:value={saveAsName}
          bind:this={saveAsInput}
          onkeydown={handleSaveAsKeydown}
          placeholder="Preset name..."
        />
        <div class="save-as-actions">
          <button
            class="inline-btn confirm-btn"
            onclick={confirmSaveAs}
            disabled={!saveAsName.trim()}
            title="Save"
          >
            <i class="fas fa-check"></i>
          </button>
          <button class="inline-btn cancel-btn" onclick={cancelSaveAs} title="Cancel">
            <i class="fas fa-times"></i>
          </button>
        </div>
      </div>
    {:else}
      <button class="pfm-btn" onclick={openSaveAs} title="Save as new preset">
        <i class="fas fa-copy"></i>
        <span>Save As</span>
      </button>
    {/if}

    <button
      class="pfm-btn"
      class:active={showFileList}
      onclick={toggleFileList}
      disabled={applyStatus === 'applying'}
      title="Load a preset"
    >
      <i class="fas fa-folder-open"></i>
      <span>Load</span>
    </button>
  </div>

  {#if applyStatus === 'applying'}
    <span class="apply-status">Applying preset…</span>
  {/if}
</div>

<UIDialog bind:show={showFileList} title="Load Preset" cancelLabel="Close" width="420px">
  <div class="load-list">
    {#each files as file}
      <div class="load-item" class:active={file.fileName === activeFileName}>
        <button class="load-name-btn" onclick={() => handleApply(file)}>
          {file.name}
        </button>
        {#if file.fileName === activeFileName}
          <span class="active-badge">active</span>
        {/if}
        {#if file.fileName !== 'default'}
          <button
            class="file-delete-btn"
            onclick={stopPropagation(() => handleDelete(file))}
            title="Delete {file.name}"
          >
            <i class="fas fa-trash-alt"></i>
          </button>
        {/if}
      </div>
    {/each}
    {#if files.length === 0}
      <div class="load-item empty">No saved presets</div>
    {/if}
  </div>
</UIDialog>

<style>
  .preset-file-manager {
    display: flex;
    flex-direction: column;
    gap: var(--ui-space-8);
  }

  .active-file {
    display: flex;
    flex-direction: column;
    gap: var(--ui-space-2);
    padding: 0 var(--ui-space-4);
  }

  .active-label {
    font-size: var(--ui-font-size-xs);
    color: var(--ui-text-secondary);
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }

  .active-name {
    font-size: var(--ui-font-size-md);
    font-weight: var(--ui-font-weight-semibold);
    color: var(--ui-text-primary);
  }

  .button-grid {
    display: flex;
    flex-direction: column;
    gap: var(--ui-space-4);
  }

  .pfm-btn {
    display: flex;
    align-items: center;
    gap: var(--ui-space-4);
    width: 100%;
    padding: var(--ui-space-6) var(--ui-space-8);
    background: var(--ui-surface-low);
    border: 1px solid var(--ui-border-subtle);
    border-radius: var(--ui-radius-md);
    color: var(--ui-text-secondary);
    font-size: var(--ui-font-size-md);
    cursor: pointer;
    transition: all var(--ui-transition-fast);
    white-space: nowrap;
  }

  .pfm-btn i {
    width: 1rem;
    text-align: center;
  }

  .pfm-btn:hover:not(:disabled) {
    background: var(--ui-surface);
    color: var(--ui-text-primary);
    border-color: var(--ui-border-default);
  }

  .pfm-btn:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  .pfm-btn.active {
    background: var(--ui-surface);
    border-color: var(--ui-border-default);
    color: var(--ui-text-primary);
  }

  .save-row {
    display: flex;
    gap: var(--ui-space-4);
  }

  .save-row .save-btn {
    flex: 1;
    min-width: 0;
  }

  .increment-btn {
    flex: 0 0 auto;
    width: 34px;
    padding: 0;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .save-btn {
    background: var(--ui-surface-high);
    border-color: var(--ui-border-medium);
    color: var(--ui-text-primary);
  }

  .save-btn:hover:not(:disabled) {
    background: var(--ui-surface-higher);
    border-color: var(--ui-border-strong);
  }

  .save-btn.saving i {
    animation: spin 1s linear infinite;
  }
  .save-btn.saved {
    background: var(--ui-surface-highest);
    color: var(--ui-text-success);
  }
  .save-btn.error {
    background: var(--ui-surface-high);
    color: var(--ui-text-muted);
  }

  .save-as-inline {
    display: flex;
    flex-direction: column;
    gap: var(--ui-space-4);
  }

  .save-as-actions {
    display: flex;
    gap: var(--ui-space-4);
    justify-content: flex-end;
  }

  .save-as-input {
    flex: 1;
    min-width: 0;
    padding: var(--ui-space-6) var(--ui-space-8);
    background: var(--ui-surface-lowest);
    border: 1px solid var(--ui-border-subtle);
    border-radius: var(--ui-radius-md);
    color: var(--ui-text-primary);
    font-size: var(--ui-font-size-md);
    outline: none;
  }

  .save-as-input:focus {
    border-color: var(--ui-border-medium);
  }

  .save-as-input::placeholder {
    color: var(--ui-text-muted);
  }

  .inline-btn {
    flex: 0 0 auto;
    display: flex;
    align-items: center;
    justify-content: center;
    width: 30px;
    height: 30px;
    padding: 0;
    background: var(--ui-surface-low);
    border: 1px solid var(--ui-border-subtle);
    border-radius: var(--ui-radius-md);
    color: var(--ui-text-secondary);
    font-size: var(--ui-font-size-sm);
    cursor: pointer;
    transition: all var(--ui-transition-fast);
  }

  .inline-btn:hover:not(:disabled) {
    background: var(--ui-surface);
    color: var(--ui-text-primary);
    border-color: var(--ui-border-default);
  }

  .inline-btn:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  .inline-btn.confirm-btn {
    background: var(--ui-surface-high);
    border-color: var(--ui-border-medium);
    color: var(--ui-text-primary);
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

  .apply-status {
    font-size: var(--ui-font-size-xs);
    color: var(--ui-text-secondary);
    padding: 0 var(--ui-space-4);
    letter-spacing: 0.02em;
  }

  @keyframes spin {
    from {
      transform: rotate(0deg);
    }
    to {
      transform: rotate(360deg);
    }
  }
</style>
