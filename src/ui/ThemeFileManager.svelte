<script lang="ts">
  import { createEventDispatcher, onMount } from 'svelte';
  import type { ThemeMeta } from '../lib/themeTypes';
  import { listThemes, deleteTheme, setActiveFile, sanitizeFileName, getProductionInfo, setProductionFile } from '../lib/themeService';
  import type { ProductionInfo } from '../lib/themeService';
  import { activeFileName } from '../lib/editorConfigStore';
  import { dirty } from '../lib/editorStore';
  import BackupBrowser from './BackupBrowser.svelte';
  import UIDialog from './UIDialog.svelte';

  const dispatch = createEventDispatcher<{
    save: { fileName: string; displayName: string };
    load: { fileName: string };
  }>();

  export let saveStatus: 'idle' | 'saving' | 'saved' | 'error' = 'idle';

  let files: ThemeMeta[] = [];
  let showFileList = false;
  let saveAsEditing = false;
  let saveAsName = '';
  let saveAsInput: HTMLInputElement;
  let currentDisplayName = 'Default';
  let showBackups = false;

  // --- Production state ---
  let productionInfo: ProductionInfo | null = null;
  let productionUpdateStatus: 'idle' | 'updating' | 'done' | 'error' = 'idle';

  async function refreshFiles() {
    try {
      files = await listThemes();
      const active = files.find(f => f.isActive);
      if (active) {
        $activeFileName = active.fileName;
        currentDisplayName = active.name;
      }
    } catch {
      // silent — will show empty list
    }
  }

  async function refreshProduction() {
    try {
      productionInfo = await getProductionInfo();
    } catch {
      // silent
    }
  }

  async function handleUpdateProduction() {
    productionUpdateStatus = 'updating';
    try {
      await setProductionFile($activeFileName);
      await refreshProduction();
      productionUpdateStatus = 'done';
      setTimeout(() => { productionUpdateStatus = 'idle'; }, 2000);
    } catch {
      productionUpdateStatus = 'error';
      setTimeout(() => { productionUpdateStatus = 'idle'; }, 2000);
    }
  }

  onMount(async () => {
    await refreshFiles();
    await refreshProduction();
  });

  function handleSave() {
    dispatch('save', { fileName: $activeFileName, displayName: currentDisplayName });
  }

  function handleSaveIncrement() {
    // Strip any existing _NN suffix, then find the next available number
    const baseName = currentDisplayName.replace(/_\d+$/, '');
    const baseFileName = sanitizeFileName(baseName);
    const existingNums = files
      .filter(f => f.fileName === baseFileName || f.fileName.match(new RegExp(`^${baseFileName}_\\d+$`)))
      .map(f => {
        const m = f.fileName.match(/_(\d+)$/);
        return m ? parseInt(m[1], 10) : 0;
      });
    const next = (existingNums.length > 0 ? Math.max(...existingNums) : 0) + 1;
    const suffix = String(next).padStart(2, '0');
    const displayName = `${baseName}_${suffix}`;
    const fileName = `${baseFileName}_${suffix}`;

    dispatch('save', { fileName, displayName });
    $activeFileName = fileName;
    currentDisplayName = displayName;
    setTimeout(() => refreshFiles(), 500);
  }

  function openSaveAs() {
    saveAsName = currentDisplayName;
    saveAsEditing = true;
    showFileList = false;
    // Focus the input after Svelte renders it
    setTimeout(() => saveAsInput?.select(), 0);
  }

  function confirmSaveAs() {
    const displayName = saveAsName.trim();
    if (!displayName) return;
    const fileName = sanitizeFileName(displayName);
    if (fileName === 'default') {
      saveAsName = '';
      return;
    }
    saveAsEditing = false;
    dispatch('save', { fileName, displayName });
    $activeFileName = fileName;
    currentDisplayName = displayName;
    setTimeout(() => refreshFiles(), 500);
  }

  function cancelSaveAs() {
    saveAsEditing = false;
    saveAsName = '';
  }

  async function handleLoad(file: ThemeMeta) {
    showFileList = false;
    await setActiveFile(file.fileName);
    $activeFileName = file.fileName;
    currentDisplayName = file.name;
    dispatch('load', { fileName: file.fileName });
    // editorStore.loadFromFile clears history and resets dirty — no snapshot needed here.
  }

  async function handleDelete(file: ThemeMeta) {
    if (file.fileName === 'default') return;
    try {
      await deleteTheme(file.fileName);
      await refreshFiles();
      // If we deleted the active file, it reverts to default on the server
      if (file.fileName === $activeFileName) {
        $activeFileName = 'default';
        currentDisplayName = 'Default';
        dispatch('load', { fileName: 'default' });
      }
    } catch {
      // silent
    }
  }

  function handleSaveAsKeydown(e: KeyboardEvent) {
    if (e.key === 'Enter') confirmSaveAs();
    if (e.key === 'Escape') cancelSaveAs();
  }

  function toggleFileList() {
    showFileList = !showFileList;
    saveAsEditing = false;
    if (showFileList) refreshFiles();
  }

</script>

<div class="theme-file-manager">
  <div class="active-file">
    <span class="active-label">Theme</span>
    <span class="active-name">{currentDisplayName}</span>
  </div>


  <div class="button-grid">
    <div class="save-row">
      <button
        class="tfm-btn save-btn"
        class:saving={saveStatus === 'saving'}
        class:saved={saveStatus === 'saved'}
        class:error={saveStatus === 'error'}
        on:click={handleSave}
        disabled={saveStatus === 'saving'}
        title="Save to current file"
      >
        <i class="fas" class:fa-save={saveStatus === 'idle'} class:fa-spinner={saveStatus === 'saving'} class:fa-check={saveStatus === 'saved'} class:fa-times={saveStatus === 'error'}></i>
        <span>
          {#if saveStatus === 'idle'}Save{:else if saveStatus === 'saving'}Saving{:else if saveStatus === 'saved'}Saved{:else}Error{/if}
        </span>
      </button>
      <button
        class="tfm-btn increment-btn"
        on:click={handleSaveIncrement}
        disabled={saveStatus === 'saving'}
        title="Save as incremented copy"
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
          on:keydown={handleSaveAsKeydown}
          placeholder="Theme name..."
        />
        <div class="save-as-actions">
          <button class="inline-btn confirm-btn" on:click={confirmSaveAs} disabled={!saveAsName.trim()} title="Save">
            <i class="fas fa-check"></i>
          </button>
          <button class="inline-btn cancel-btn" on:click={cancelSaveAs} title="Cancel">
            <i class="fas fa-times"></i>
          </button>
        </div>
      </div>
    {:else}
      <button
        class="tfm-btn"
        on:click={openSaveAs}
        title="Save as new file"
      >
        <i class="fas fa-copy"></i>
        <span>Save As</span>
      </button>
    {/if}

    <button
      class="tfm-btn"
      class:active={showFileList}
      on:click={toggleFileList}
      title="Load a theme"
    >
      <i class="fas fa-folder-open"></i>
      <span>Load</span>
    </button>

    <button
      class="tfm-btn history-btn"
      on:click={() => showBackups = true}
      title="View backup history and restore"
    >
      <i class="fas fa-history"></i>
      <span>History</span>
    </button>

  </div>

  <div class="status-labels">
    <span class="status-label" class:dirty={$dirty} class:clean={!$dirty}>
      {$dirty ? 'Unsaved changes' : 'Saved'}
    </span>
  </div>

  <div class="production-section">
    <div class="production-header">
      <span class="production-label">Production</span>
      {#if productionInfo}
        <span class="production-name">{productionInfo.name}</span>
      {/if}
    </div>

    <button
      class="tfm-btn production-update-btn"
      class:updating={productionUpdateStatus === 'updating'}
      class:done={productionUpdateStatus === 'done'}
      class:error={productionUpdateStatus === 'error'}
      on:click={handleUpdateProduction}
      disabled={productionUpdateStatus === 'updating' || (productionInfo?.fileName === $activeFileName)}
      title={productionInfo?.fileName === $activeFileName ? 'Already in production' : `Set "${currentDisplayName}" as production`}
    >
      <i class="fas" class:fa-upload={productionUpdateStatus === 'idle'} class:fa-spinner={productionUpdateStatus === 'updating'} class:fa-check={productionUpdateStatus === 'done'} class:fa-times={productionUpdateStatus === 'error'}></i>
      <span>
        {#if productionUpdateStatus === 'idle'}Apply Theme{:else if productionUpdateStatus === 'updating'}Applying{:else if productionUpdateStatus === 'done'}Applied{:else}Error{/if}
      </span>
    </button>

    {#if productionInfo?.fileName === $activeFileName}
      <span class="production-match">Active theme matches production</span>
    {:else}
      <span class="production-diff">Active theme differs from production</span>
    {/if}
  </div>

</div>

<UIDialog
  bind:show={showFileList}
  title="Load Theme"
  cancelLabel="Close"
  width="420px"
>
  <div class="load-list">
    {#each files as file}
      <div class="load-item" class:active={file.fileName === $activeFileName}>
        <button class="load-name-btn" on:click={() => handleLoad(file)}>
          {file.name}
        </button>
        {#if file.fileName === $activeFileName}
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

<BackupBrowser
  bind:open={showBackups}
  on:restored={(e) => {
    if (e.detail.type === 'themes') {
      dispatch('load', { fileName: $activeFileName });
    }
    refreshFiles();
  }}
/>


<style>
  .theme-file-manager {
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

  .tfm-btn {
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

  .tfm-btn i {
    width: 1rem;
    text-align: center;
  }

  .tfm-btn:hover:not(:disabled) {
    background: var(--ui-surface);
    color: var(--ui-text-primary);
    border-color: var(--ui-border-default);
  }

  .tfm-btn:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  .tfm-btn.active {
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

  .save-btn.saving i { animation: spin 1s linear infinite; }
  .save-btn.saved { background: var(--ui-surface-highest); color: var(--ui-text-success); }
  .save-btn.error { background: var(--ui-surface-high); color: var(--ui-text-muted); }

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

  .status-labels {
    display: flex;
    gap: var(--ui-space-8);
    padding: 0 var(--ui-space-4);
  }

  .status-label {
    font-size: var(--ui-font-size-xs);
    letter-spacing: 0.02em;
  }

  .status-label.clean {
    color: var(--ui-text-secondary);
  }

  .status-label.dirty {
    color: var(--ui-text-warning, #e6a030);
  }

  /* ── Production section ── */

  .production-section {
    display: flex;
    flex-direction: column;
    gap: var(--ui-space-4);
    padding-top: var(--ui-space-8);
    border-top: 1px solid var(--ui-border-subtle);
  }

  .production-header {
    display: flex;
    flex-direction: column;
    gap: var(--ui-space-2);
    padding: 0 var(--ui-space-4);
  }

  .production-label {
    font-size: var(--ui-font-size-xs);
    color: var(--ui-text-secondary);
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }

  .production-name {
    font-size: var(--ui-font-size-md);
    font-weight: var(--ui-font-weight-semibold);
    color: var(--ui-text-primary);
  }

  .production-update-btn {
    background: var(--ui-surface-high);
    border-color: var(--ui-border-medium);
    color: var(--ui-text-primary);
  }

  .production-update-btn:hover:not(:disabled) {
    background: var(--ui-surface-higher);
    border-color: var(--ui-border-strong);
  }

  .production-update-btn.updating i { animation: spin 1s linear infinite; }
  .production-update-btn.done { color: var(--ui-text-success); }
  .production-update-btn.error { color: var(--ui-text-muted); }

  .production-match {
    font-size: var(--ui-font-size-xs);
    color: var(--ui-text-secondary);
    padding: 0 var(--ui-space-4);
    letter-spacing: 0.02em;
  }

  .production-diff {
    font-size: var(--ui-font-size-xs);
    color: var(--ui-text-warning, #e6a030);
    padding: 0 var(--ui-space-4);
    letter-spacing: 0.02em;
  }

  @keyframes spin {
    from { transform: rotate(0deg); }
    to { transform: rotate(360deg); }
  }
</style>
