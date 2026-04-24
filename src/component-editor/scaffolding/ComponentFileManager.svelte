<script lang="ts">
  import { onMount } from 'svelte';
  import { get } from 'svelte/store';
  import type { ComponentConfig, ComponentConfigMeta } from '../../lib/themeTypes';
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
  } from '../../lib/editorStore';
  import { sanitizeFileName } from '../../lib/themeService';
  import UIDialog from '../../ui/UIDialog.svelte';

  /** Which component this manager controls (e.g. "button"). */
  export let component: string;

  let saveStatus: 'idle' | 'saving' | 'saved' | 'error' = 'idle';
  let files: ComponentConfigMeta[] = [];
  let activeFileName = 'default';
  let currentDisplayName = 'Default';
  let showFileList = false;
  let saveAsEditing = false;
  let saveAsName = '';
  let saveAsInput: HTMLInputElement;

  let productionInfo: ComponentProductionInfo | null = null;
  let productionUpdateStatus: 'idle' | 'updating' | 'done' | 'error' = 'idle';

  $: compDirty = $componentDirty[component] ?? false;

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
  });

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

  async function handleSaveIncrement() {
    const baseName = currentDisplayName.replace(/_\d+$/, '');
    const baseFileName = sanitizeFileName(baseName);
    const existingNums = files
      .filter((f) => f.fileName === baseFileName || f.fileName.match(new RegExp(`^${baseFileName}_\\d+$`)))
      .map((f) => {
        const m = f.fileName.match(/_(\d+)$/);
        return m ? parseInt(m[1], 10) : 0;
      });
    const next = (existingNums.length > 0 ? Math.max(...existingNums) : 0) + 1;
    const suffix = String(next).padStart(2, '0');
    const displayName = `${baseName}_${suffix}`;
    const fileName = `${baseFileName}_${suffix}`;
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

  function openSaveAs() {
    saveAsName = currentDisplayName === 'Default' ? '' : currentDisplayName;
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
    saveAsEditing = false;
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

  function cancelSaveAs() {
    saveAsEditing = false;
    saveAsName = '';
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

<div class="cfm-root">
  <div class="active-file">
    <span class="active-label">Config · {component}</span>
    <span class="active-name">{currentDisplayName}</span>
  </div>

  <div class="button-grid">
    <div class="save-row">
      <button
        class="cfm-btn save-btn"
        class:saving={saveStatus === 'saving'}
        class:saved={saveStatus === 'saved'}
        class:error={saveStatus === 'error'}
        on:click={handleSave}
        disabled={saveStatus === 'saving'}
        title={activeFileName === 'default' ? 'Save as new file (default is regenerated from source)' : 'Save to current file'}
      >
        <i class="fas" class:fa-save={saveStatus === 'idle'} class:fa-spinner={saveStatus === 'saving'} class:fa-check={saveStatus === 'saved'} class:fa-times={saveStatus === 'error'}></i>
        <span>
          {#if saveStatus === 'idle'}Save{:else if saveStatus === 'saving'}Saving{:else if saveStatus === 'saved'}Saved{:else}Error{/if}
        </span>
      </button>
      <button
        class="cfm-btn increment-btn"
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
          placeholder="Config name..."
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
      <button class="cfm-btn" on:click={openSaveAs} title="Save as new file">
        <i class="fas fa-copy"></i>
        <span>Save As</span>
      </button>
    {/if}

    <button
      class="cfm-btn"
      class:active={showFileList}
      on:click={toggleFileList}
      title="Load a config"
    >
      <i class="fas fa-folder-open"></i>
      <span>Load</span>
    </button>
  </div>

  <div class="status-labels">
    <span class="status-label" class:dirty={compDirty} class:clean={!compDirty}>
      {compDirty ? 'Unsaved changes' : 'Saved'}
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
      class="cfm-btn production-update-btn"
      class:updating={productionUpdateStatus === 'updating'}
      class:done={productionUpdateStatus === 'done'}
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

    {#if productionInfo?.fileName === activeFileName}
      <span class="production-match">Active config matches production</span>
    {:else}
      <span class="production-diff">Active config differs from production</span>
    {/if}
  </div>
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

<style>
  .cfm-root {
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

  .cfm-btn {
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
