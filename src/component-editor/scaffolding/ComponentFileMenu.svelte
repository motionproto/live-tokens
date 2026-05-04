<script lang="ts">
  import { onMount, onDestroy, createEventDispatcher } from 'svelte';
  import type { ComponentConfigMeta } from '../../lib/themeTypes';
  import UIDialog from '../../ui/UIDialog.svelte';

  /** Component slug used in the load-dialog title (e.g. "button"). */
  export let component: string;
  /** Files shown in the load dialog. */
  export let files: ComponentConfigMeta[] = [];
  /** Currently active file — highlighted in the load list. */
  export let activeFileName: string = 'default';

  const dispatch = createEventDispatcher<{
    save: void;
    saveAs: void;
    /** Fired when the user clicks "Load…" in the menu — parent should refresh `files`. */
    openLoad: void;
    load: ComponentConfigMeta;
    delete: ComponentConfigMeta;
  }>();

  let fileMenuOpen = false;
  let fileMenuRoot: HTMLElement;
  let showFileList = false;

  onMount(() => {
    document.addEventListener('click', handleDocClick, true);
  });

  onDestroy(() => {
    document.removeEventListener('click', handleDocClick, true);
  });

  function handleDocClick(e: MouseEvent) {
    if (!fileMenuOpen) return;
    if (fileMenuRoot && !fileMenuRoot.contains(e.target as Node)) {
      fileMenuOpen = false;
    }
  }

  function handleSave() {
    fileMenuOpen = false;
    dispatch('save');
  }

  function handleSaveAs() {
    fileMenuOpen = false;
    dispatch('saveAs');
  }

  function handleOpenLoad() {
    fileMenuOpen = false;
    showFileList = true;
    dispatch('openLoad');
  }

  function handleLoad(file: ComponentConfigMeta) {
    showFileList = false;
    dispatch('load', file);
  }

  function handleDelete(file: ComponentConfigMeta) {
    if (file.fileName === 'default') return;
    dispatch('delete', file);
  }
</script>

<div class="file-menu" bind:this={fileMenuRoot}>
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
      <button class="file-menu-item" on:click={handleSaveAs} role="menuitem">
        <i class="fas fa-copy"></i>
        <span>Save As…</span>
      </button>
      <button class="file-menu-item" on:click={handleOpenLoad} role="menuitem">
        <i class="fas fa-folder-open"></i>
        <span>Load…</span>
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

<style>
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
</style>
