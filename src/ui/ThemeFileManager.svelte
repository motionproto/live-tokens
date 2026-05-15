<script lang="ts">
  import { stopPropagation } from 'svelte/legacy';

  import { onMount } from 'svelte';
  import type { ThemeMeta } from '../lib/themeTypes';
  import { listThemes, deleteTheme, setActiveFile, getProductionInfo, setProductionFile } from '../lib/themeService';
  import { activeFileName } from '../lib/editorConfigStore';
  import { dirty } from '../lib/editorStore';
  import { productionRevision, bumpProductionRevision, themeProductionInfo } from '../lib/productionPulse';
  import UIDialog from './UIDialog.svelte';
  import UIInfoPopover from './UIInfoPopover.svelte';
  import SaveAsDialog from '../component-editor/scaffolding/SaveAsDialog.svelte';

  interface Props {
    saveStatus?: 'idle' | 'saving' | 'saved' | 'error';
    onsave?: (payload: { fileName: string; displayName: string }) => void;
    onload?: (payload: { fileName: string }) => void;
  }

  let { saveStatus = 'idle', onsave, onload }: Props = $props();

  let files: ThemeMeta[] = $state([]);
  let showFileList = $state(false);
  let saveAsDialog = $state(false);
  let currentDisplayName = $state('Default Theme');

  let prodApplyStatus: 'idle' | 'applying' | 'done' | 'error' = $state('idle');

  let prodIsInSync = $derived($themeProductionInfo?.fileName === $activeFileName);
  let editorIsApplied = $derived(prodIsInSync && !$dirty);
  let prodName = $derived($themeProductionInfo?.name ?? '—');

  let isDefaultActive = $derived($activeFileName === 'default');

  async function refreshFiles() {
    try {
      files = await listThemes();
      const active = files.find((f) => f.isActive);
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
      const info = await getProductionInfo();
      themeProductionInfo.set(info);
    } catch {
      // silent — leave cached value in place
    }
  }

  onMount(async () => {
    await refreshFiles();
    await refreshProduction();
  });

  // Refresh production state when any production pointer flips (e.g. a preset
  // is adopted elsewhere). Skip the initial tick — onMount already loaded it.
  let pulseInitialised = false;
  $effect(() => {
    void $productionRevision;
    if (!pulseInitialised) {
      pulseInitialised = true;
      return;
    }
    refreshProduction();
  });

  function handleSave() {
    if (isDefaultActive) return;
    onsave?.({ fileName: $activeFileName, displayName: currentDisplayName });
  }

  function openSaveAs() {
    showFileList = false;
    saveAsDialog = true;
  }

  function confirmSaveAs(detail: { displayName: string; fileName: string }) {
    const { displayName, fileName } = detail;
    onsave?.({ fileName, displayName });
    $activeFileName = fileName;
    currentDisplayName = displayName;
    setTimeout(() => refreshFiles(), 500);
  }

  async function handleApplyToProduction() {
    if (prodIsInSync) return;
    prodApplyStatus = 'applying';
    try {
      await setProductionFile($activeFileName);
      await refreshProduction();
      bumpProductionRevision();
      prodApplyStatus = 'done';
      setTimeout(() => { prodApplyStatus = 'idle'; }, 2000);
    } catch {
      prodApplyStatus = 'error';
      setTimeout(() => { prodApplyStatus = 'idle'; }, 3000);
    }
  }

  async function handleLoad(file: ThemeMeta) {
    if ($dirty) {
      const ok = window.confirm(
        'Loading a theme will discard unsaved changes. Continue?',
      );
      if (!ok) return;
    }
    showFileList = false;
    await setActiveFile(file.fileName);
    $activeFileName = file.fileName;
    currentDisplayName = file.name;
    onload?.({ fileName: file.fileName });
  }

  async function handleDelete(file: ThemeMeta) {
    if (file.fileName === 'default') return;
    try {
      await deleteTheme(file.fileName);
      await refreshFiles();
      if (file.fileName === $activeFileName) {
        $activeFileName = 'default';
        currentDisplayName = 'Default Theme';
        onload?.({ fileName: 'default' });
      }
    } catch {
      // silent
    }
  }

  function toggleFileList() {
    showFileList = !showFileList;
    if (showFileList) refreshFiles();
  }

  const dateFormatter = new Intl.DateTimeFormat(undefined, {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });

  function formatUpdatedAt(iso: string): string {
    if (!iso) return '';
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return '';
    return dateFormatter.format(d);
  }

  type SortKey = 'name' | 'updatedAt';
  let sortKey: SortKey = $state('updatedAt');
  let sortDir: 'asc' | 'desc' = $state('desc');

  function toggleSort(key: SortKey) {
    if (sortKey === key) {
      sortDir = sortDir === 'asc' ? 'desc' : 'asc';
    } else {
      sortKey = key;
      sortDir = key === 'name' ? 'asc' : 'desc';
    }
  }

  let sortedFiles = $derived([...files].sort((a, b) => {
    let cmp = 0;
    if (sortKey === 'name') {
      cmp = a.name.localeCompare(b.name, undefined, { sensitivity: 'base' });
    } else {
      cmp = (a.updatedAt || '').localeCompare(b.updatedAt || '');
    }
    return sortDir === 'asc' ? cmp : -cmp;
  }));
</script>

<div class="theme-file-manager">
  <div class="tfm-header">
    <span class="tfm-header-label">Theme</span>
    <UIInfoPopover title="Themes" ariaLabel="About themes">
      <p>
        A <strong>theme</strong> saves the design tokens for a site, components use these tokens to define their appearance.
      </p>
    </UIInfoPopover>
  </div>

  <div class="tfm-cards" class:in-sync={prodIsInSync}>
    <div
      class="tfm-card tfm-card-editor"
      class:dirty={$dirty}
      class:applied={editorIsApplied}
    >
      <span class="tfm-rail" aria-hidden="true"></span>
      <div class="tfm-card-head">
        <span class="tfm-card-label">Editor</span>
        <span
          class="tfm-card-status"
          class:dirty={$dirty}
          class:applied={editorIsApplied}
        >
          <i class="tfm-status-dot" aria-hidden="true"></i>
          <span>{$dirty ? 'unsaved' : editorIsApplied ? 'live' : 'saved'}</span>
        </span>
      </div>
      <div class="tfm-pill" class:dirty={$dirty} class:applied={editorIsApplied}>
        <span class="tfm-pill-name" title={currentDisplayName}>{currentDisplayName}</span>
      </div>
      <div class="tfm-card-actions tfm-card-actions-stack">
        <button
          class="tfm-btn tfm-btn-row save-btn"
          class:saving={saveStatus === 'saving'}
          class:saved={saveStatus === 'saved'}
          class:error={saveStatus === 'error'}
          onclick={handleSave}
          disabled={saveStatus === 'saving' || isDefaultActive}
          title={isDefaultActive
            ? 'Default is read-only — use Save As to capture under a new name'
            : 'Save to current file'}
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
        <button class="tfm-btn tfm-btn-row" onclick={openSaveAs} title="Save as new theme">
          <i class="fas fa-copy"></i>
          <span>Save As…</span>
        </button>
        <button
          class="tfm-btn tfm-btn-row"
          class:active={showFileList}
          onclick={toggleFileList}
          title="Load a theme"
        >
          <i class="fas fa-folder-open"></i>
          <span>Load…</span>
        </button>
      </div>
    </div>

    <button
      class="tfm-adopt-btn"
      class:saving={prodApplyStatus === 'applying'}
      class:saved={prodApplyStatus === 'done'}
      class:error={prodApplyStatus === 'error'}
      class:in-sync={prodIsInSync}
      onclick={handleApplyToProduction}
      disabled={prodApplyStatus === 'applying' || prodIsInSync}
      title={prodIsInSync
        ? 'This theme is already in production'
        : `Adopt "${currentDisplayName}" as the production theme`}
    >
      <i
        class="fas"
        class:fa-arrow-down={prodApplyStatus === 'idle'}
        class:fa-spinner={prodApplyStatus === 'applying'}
        class:fa-check={prodApplyStatus === 'done'}
        class:fa-xmark={prodApplyStatus === 'error'}
      ></i>
      <span>
        {#if prodApplyStatus === 'idle'}Adopt{:else if prodApplyStatus === 'applying'}Adopting{:else if prodApplyStatus === 'done'}Adopted{:else}Error{/if}
      </span>
    </button>

    <div
      class="tfm-card tfm-card-production"
      class:in-sync={prodIsInSync}
    >
      <span class="tfm-rail" aria-hidden="true"></span>
      <div class="tfm-card-head">
        <span class="tfm-card-label">Production</span>
        <span
          class="tfm-card-status"
          class:applied={prodIsInSync}
        >
          <i class="tfm-status-dot" aria-hidden="true"></i>
          <span>{prodIsInSync ? 'live' : 'out of sync'}</span>
        </span>
      </div>
      <div class="tfm-pill" class:applied={prodIsInSync}>
        <span class="tfm-pill-name" title={prodName}>{prodName}</span>
      </div>
    </div>
  </div>
</div>

<UIDialog
  bind:show={showFileList}
  title="Load Theme"
  cancelLabel="Close"
  width="420px"
>
  <div class="load-list">
    <div class="load-header">
      <button
        class="sort-btn name-col"
        class:active-sort={sortKey === 'name'}
        onclick={() => toggleSort('name')}
      >
        <span>Name</span>
        {#if sortKey === 'name'}
          <i class="fas {sortDir === 'asc' ? 'fa-caret-up' : 'fa-caret-down'}"></i>
        {/if}
      </button>
      <button
        class="sort-btn date-col"
        class:active-sort={sortKey === 'updatedAt'}
        onclick={() => toggleSort('updatedAt')}
      >
        <span>Date</span>
        {#if sortKey === 'updatedAt'}
          <i class="fas {sortDir === 'asc' ? 'fa-caret-up' : 'fa-caret-down'}"></i>
        {/if}
      </button>
      <span class="header-spacer"></span>
    </div>
    {#each sortedFiles as file}
      <div class="load-item" class:active={file.fileName === $activeFileName}>
        <button class="load-name-btn" onclick={() => handleLoad(file)}>
          {file.name}
        </button>
        <span class="updated-at" title={file.updatedAt}>{formatUpdatedAt(file.updatedAt)}</span>
        {#if file.fileName === $activeFileName}
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
      <div class="load-item empty">No saved files</div>
    {/if}
  </div>
</UIDialog>

<SaveAsDialog
  bind:show={saveAsDialog}
  {currentDisplayName}
  {files}
  title="Save Theme As"
  placeholder="Theme name…"
  reservedNameMessage='The name "default" is reserved for the initial distribution.'
  onsave={confirmSaveAs}
/>

<style>
  .theme-file-manager {
    --tfm-applied: #5aa85e;
    --tfm-rail-neutral: var(--ui-border-default);
    --tfm-rail-dirty: var(--ui-highlight);
    --tfm-rail-applied: var(--tfm-applied);

    display: flex;
    flex-direction: column;
    gap: var(--ui-space-8);
  }

  .tfm-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: var(--ui-space-4);
    padding: 0 var(--ui-space-4);
  }

  .tfm-header-label {
    font-size: var(--ui-font-size-xs);
    color: var(--ui-text-secondary);
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }

  /* Two-card pipeline (Editor → Production) — mirrors PresetFileManager so
     theme and preset surfaces share one visual idiom. */
  .tfm-cards {
    display: flex;
    flex-direction: column;
    gap: var(--ui-space-6);
  }

  .tfm-card {
    position: relative;
    display: flex;
    flex-direction: column;
    gap: var(--ui-space-6);
    padding: var(--ui-space-8) var(--ui-space-10) var(--ui-space-10) var(--ui-space-16);
    background: var(--ui-surface-lower);
    border: 1px solid var(--ui-border-subtle);
    border-radius: var(--ui-radius-md);
  }

  .tfm-rail {
    position: absolute;
    left: 0;
    top: 0;
    bottom: 0;
    width: 3px;
    border-radius: var(--ui-radius-md) 0 0 var(--ui-radius-md);
    background: var(--tfm-rail-neutral);
    transition: background var(--ui-transition-base);
  }

  .tfm-card-editor.dirty .tfm-rail { background: var(--tfm-rail-dirty); }
  .tfm-card-editor.applied .tfm-rail { background: var(--tfm-rail-applied); }
  .tfm-card-production.in-sync .tfm-rail { background: var(--tfm-rail-applied); }

  .tfm-card-head {
    display: flex;
    align-items: baseline;
    justify-content: space-between;
    gap: var(--ui-space-8);
  }

  .tfm-card-label {
    font-size: var(--ui-font-size-xs);
    font-weight: var(--ui-font-weight-semibold);
    text-transform: uppercase;
    letter-spacing: 0.08em;
    color: var(--ui-text-secondary);
    line-height: 1.1;
  }

  .tfm-card-status {
    display: inline-flex;
    align-items: center;
    gap: var(--ui-space-4);
    font-size: 0.7rem;
    letter-spacing: 0.02em;
    color: var(--ui-text-muted);
    line-height: 1;
  }

  .tfm-status-dot {
    width: 5px;
    height: 5px;
    border-radius: 50%;
    background: currentColor;
    opacity: 0.7;
    flex-shrink: 0;
  }

  .tfm-card-status.dirty {
    color: var(--ui-highlight);
  }

  .tfm-card-status.dirty .tfm-status-dot {
    opacity: 1;
    box-shadow: 0 0 0 3px color-mix(in srgb, var(--ui-highlight) 22%, transparent);
    animation: tfm-pulse 1.6s ease-in-out infinite;
  }

  .tfm-card-status.applied {
    color: var(--tfm-applied);
  }
  .tfm-card-status.applied .tfm-status-dot {
    opacity: 1;
  }

  .tfm-pill {
    display: flex;
    align-items: center;
    padding: var(--ui-space-6) var(--ui-space-10);
    background: var(--ui-surface-lowest);
    border: 1px solid var(--ui-border-subtle);
    border-radius: var(--ui-radius-md);
    transition: border-color var(--ui-transition-fast), box-shadow var(--ui-transition-fast);
  }

  .tfm-pill.dirty {
    border-color: color-mix(in srgb, var(--ui-highlight) 60%, var(--ui-border-subtle));
    box-shadow: inset 0 0 0 1px color-mix(in srgb, var(--ui-highlight) 35%, transparent);
  }

  .tfm-pill.applied {
    border-color: color-mix(in srgb, var(--tfm-applied) 50%, var(--ui-border-subtle));
  }

  .tfm-pill-name {
    flex: 1;
    min-width: 0;
    font-size: var(--ui-font-size-md);
    font-weight: var(--ui-font-weight-semibold);
    color: var(--ui-text-primary);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .tfm-card-actions {
    display: flex;
    gap: var(--ui-space-4);
    flex-wrap: wrap;
  }

  .tfm-card-actions-stack {
    flex-direction: column;
  }

  .tfm-btn-row {
    width: 100%;
    justify-content: flex-start;
    gap: var(--ui-space-8);
    flex: 0 0 auto;
    text-align: left;
  }

  .tfm-btn-row i {
    width: 1rem;
    text-align: center;
    flex: 0 0 auto;
  }

  .tfm-btn-row span {
    flex: 1 1 auto;
    text-align: left;
  }

  /* Bridge button — sits between Editor and Production cards as the arrow that
     promotes the editor theme into production. */
  .tfm-adopt-btn {
    align-self: stretch;
    width: 100%;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: var(--ui-space-6);
    margin: calc(var(--ui-space-2) * -1) 0;
    padding: var(--ui-space-6) var(--ui-space-12);
    background: color-mix(in srgb, var(--tfm-applied) 18%, var(--ui-surface-high));
    border: 1px solid color-mix(in srgb, var(--tfm-applied) 45%, var(--ui-border-medium));
    border-radius: var(--ui-radius-md);
    color: var(--ui-text-primary);
    font-size: var(--ui-font-size-md);
    font-weight: var(--ui-font-weight-medium);
    cursor: pointer;
    transition: all var(--ui-transition-fast);
    white-space: nowrap;
    position: relative;
    z-index: 1;
  }

  .tfm-adopt-btn i {
    width: 1rem;
    text-align: center;
    font-size: 0.85em;
  }

  .tfm-adopt-btn:hover:not(:disabled) {
    background: color-mix(in srgb, var(--tfm-applied) 30%, var(--ui-surface-higher));
    border-color: color-mix(in srgb, var(--tfm-applied) 70%, var(--ui-border-strong));
  }

  .tfm-adopt-btn:disabled {
    cursor: not-allowed;
  }

  .tfm-adopt-btn.in-sync {
    background: transparent;
    border-color: var(--ui-border-subtle);
    color: var(--ui-text-muted);
    opacity: 0.7;
  }

  .tfm-adopt-btn.saving i { animation: spin 1s linear infinite; }
  .tfm-adopt-btn.saved {
    background: color-mix(in srgb, var(--tfm-applied) 30%, var(--ui-surface-high));
    color: var(--tfm-applied);
  }
  .tfm-adopt-btn.error { color: var(--ui-text-muted); }

  .tfm-btn {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: var(--ui-space-4);
    padding: var(--ui-space-6) var(--ui-space-10);
    background: var(--ui-surface);
    border: 1px solid var(--ui-border-subtle);
    border-radius: var(--ui-radius-md);
    color: var(--ui-text-secondary);
    font-size: var(--ui-font-size-md);
    font-weight: var(--ui-font-weight-medium);
    cursor: pointer;
    transition: all var(--ui-transition-fast);
    white-space: nowrap;
    flex: 1 1 0;
    min-width: 0;
  }

  .tfm-btn i {
    width: 1rem;
    text-align: center;
    font-size: 0.85em;
  }

  .tfm-btn:hover:not(:disabled) {
    background: var(--ui-surface-high);
    color: var(--ui-text-primary);
    border-color: var(--ui-border-default);
  }

  .tfm-btn:disabled {
    opacity: 0.45;
    cursor: not-allowed;
  }

  .tfm-btn.active {
    background: var(--ui-surface);
    border-color: var(--ui-border-default);
    color: var(--ui-text-primary);
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
  .save-btn.saved {
    background: var(--ui-surface-highest);
    color: var(--ui-text-success);
  }
  .save-btn.error {
    background: var(--ui-surface-high);
    color: var(--ui-text-muted);
  }

  .load-list {
    display: flex;
    flex-direction: column;
    max-height: 60vh;
    overflow-y: auto;
  }

  .load-header {
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 4px 6px;
    border-bottom: 1px solid #3a3a3a;
    position: sticky;
    top: 0;
    background: var(--ui-surface, #1a1a1a);
    z-index: 1;
  }

  .sort-btn {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    padding: 4px 0;
    background: none;
    border: none;
    color: #888;
    font-size: 11px;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.04em;
    cursor: pointer;
    text-align: left;
  }

  .sort-btn:hover {
    color: #ccc;
  }

  .sort-btn.active-sort {
    color: #e0e0e0;
  }

  .sort-btn i {
    font-size: 10px;
    opacity: 0.85;
  }

  .sort-btn.name-col {
    flex: 1;
    min-width: 0;
    padding-left: 4px;
  }

  .sort-btn.date-col {
    flex-shrink: 0;
  }

  .header-spacer {
    flex-shrink: 0;
    width: 24px;
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

  .updated-at {
    flex-shrink: 0;
    font-size: 12px;
    color: #777;
    font-variant-numeric: tabular-nums;
    white-space: nowrap;
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

  @keyframes tfm-pulse {
    0%, 100% { box-shadow: 0 0 0 3px color-mix(in srgb, var(--ui-highlight) 22%, transparent); }
    50%      { box-shadow: 0 0 0 5px color-mix(in srgb, var(--ui-highlight) 10%, transparent); }
  }

  @keyframes spin {
    from { transform: rotate(0deg); }
    to { transform: rotate(360deg); }
  }
</style>
