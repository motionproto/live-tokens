<script lang="ts">
  import { selectedComponent } from '../lib/editorViewStore';
  import { componentRegistryEntries } from '../component-editor/registry';
  import { saveActiveComponentConfig } from '../lib/componentPersist';
  import UIDialog from './UIDialog.svelte';

  interface Props {
    show?: boolean;
    /** Component IDs that have unsaved edits. */
    dirtyComponents?: string[];
    /** Called when the user chooses to capture the preset anyway (after handling, or skipping, unsaved components). */
    onproceed?: () => void;
  }

  let { show = $bindable(false), dirtyComponents = [], onproceed }: Props = $props();

  // Map id → registry entry (label, icon). Components not in the registry get
  // a fallback so the dialog never renders an empty row. Typed as a plain
  // string-keyed record so a stray dirty id (one we don't recognise) doesn't
  // trip the typed `ComponentId` key.
  const entryById: Record<string, { id: string; label: string; icon: string }> =
    Object.fromEntries(
      componentRegistryEntries.map((e) => [e.id, { id: e.id, label: e.label, icon: e.icon }]),
    );

  type RowStatus = 'idle' | 'saving' | 'saved' | 'default' | 'error';
  let rowStatus: Record<string, RowStatus> = $state({});
  let savingAll = $state(false);
  /** Snapshot the dirty list at open-time so rows don't vanish as the user
   *  saves them one-by-one (componentDirty updates instantly on save). */
  let rowIds: string[] = $state([]);

  function entryFor(id: string): { id: string; label: string; icon: string } {
    return entryById[id] ?? { id, label: id, icon: 'fas fa-cube' };
  }

  async function saveOne(id: string): Promise<RowStatus> {
    rowStatus[id] = 'saving';
    const result = await saveActiveComponentConfig(id);
    if (result.ok) {
      rowStatus[id] = 'saved';
      return 'saved';
    }
    rowStatus[id] = result.reason === 'default' ? 'default' : 'error';
    return rowStatus[id];
  }

  async function handleSaveAll() {
    savingAll = true;
    for (const id of rowIds) {
      // Skip rows the user already resolved this session.
      if (rowStatus[id] === 'saved') continue;
      await saveOne(id);
    }
    savingAll = false;
  }

  function jumpTo(id: string) {
    selectedComponent.set(id);
    show = false;
  }

  function handleProceed() {
    show = false;
    onproceed?.();
  }

  // Snapshot the dirty list and reset row status whenever the dialog re-opens.
  // Snapshotting keeps rows stable while the user saves them one-by-one (the
  // underlying componentDirty store drops ids as soon as save completes).
  $effect(() => {
    if (show) {
      rowIds = [...dirtyComponents];
      rowStatus = {};
    }
  });

  let allSaved = $derived(
    rowIds.length > 0 && rowIds.every((id) => rowStatus[id] === 'saved'),
  );
</script>

<UIDialog
  bind:show
  title="Unsaved component changes"
  cancelLabel="Cancel"
  width="440px"
>
  <div class="ucd-body">
    <p class="ucd-lede">
      {rowIds.length}
      {rowIds.length === 1 ? 'component has' : 'components have'}
      unsaved edits. Presets capture the files on disk, so these edits won't be
      included until they're saved.
    </p>

    <ul class="ucd-list">
      {#each rowIds as id}
        {@const entry = entryFor(id)}
        {@const status = rowStatus[id] ?? 'idle'}
        <li class="ucd-row" class:saved={status === 'saved'}>
          <span class="ucd-dot" class:saved={status === 'saved'} aria-hidden="true"></span>
          <button
            type="button"
            class="ucd-name"
            onclick={() => jumpTo(id)}
            title="Open {entry.label} editor"
          >
            <i class={entry.icon}></i>
            <span>{entry.label}</span>
          </button>
          <span class="ucd-status" class:saved={status === 'saved'} class:default={status === 'default'} class:error={status === 'error'}>
            {#if status === 'saving'}Saving…
            {:else if status === 'saved'}Saved
            {:else if status === 'default'}On default — rename first
            {:else if status === 'error'}Error
            {/if}
          </span>
          <button
            type="button"
            class="ucd-row-btn"
            onclick={() => saveOne(id)}
            disabled={status === 'saving' || status === 'saved' || savingAll}
            title="Save this component"
          >
            <i class="fas fa-save"></i>
          </button>
        </li>
      {/each}
    </ul>

    <div class="ucd-actions">
      <button
        type="button"
        class="ucd-btn primary"
        onclick={handleSaveAll}
        disabled={savingAll || allSaved}
      >
        {savingAll ? 'Saving…' : allSaved ? 'All saved' : 'Save all'}
      </button>
      <button
        type="button"
        class="ucd-btn"
        onclick={handleProceed}
        title="Save the preset using the files currently on disk"
      >
        Continue without saving
      </button>
    </div>
  </div>
</UIDialog>

<style>
  .ucd-body {
    display: flex;
    flex-direction: column;
    gap: var(--ui-space-12);
  }

  .ucd-lede {
    margin: 0;
    font-size: var(--ui-font-size-sm);
    line-height: 1.5;
    color: var(--ui-text-secondary);
  }

  .ucd-list {
    list-style: none;
    margin: 0;
    padding: 0;
    display: flex;
    flex-direction: column;
    gap: var(--ui-space-2);
    max-height: 240px;
    overflow-y: auto;
    border: 1px solid var(--ui-border-faint);
    border-radius: var(--ui-radius-md);
  }

  .ucd-row {
    display: grid;
    grid-template-columns: 14px 1fr auto auto;
    align-items: center;
    gap: var(--ui-space-8);
    padding: var(--ui-space-6) var(--ui-space-10);
    border-bottom: 1px solid var(--ui-border-faint);
  }

  .ucd-row:last-child {
    border-bottom: none;
  }

  .ucd-dot {
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background: var(--ui-highlight);
    box-shadow: 0 0 0 3px color-mix(in srgb, var(--ui-highlight) 22%, transparent);
    justify-self: center;
  }

  .ucd-dot.saved {
    background: var(--ui-text-success, #5aa85e);
    box-shadow: none;
  }

  .ucd-name {
    display: inline-flex;
    align-items: center;
    gap: var(--ui-space-6);
    padding: var(--ui-space-2) var(--ui-space-4);
    background: none;
    border: none;
    color: var(--ui-text-primary);
    font-size: var(--ui-font-size-md);
    text-align: left;
    cursor: pointer;
    border-radius: var(--ui-radius-sm);
    min-width: 0;
  }

  .ucd-name i {
    width: 1rem;
    text-align: center;
    color: var(--ui-text-tertiary);
  }

  .ucd-name:hover {
    background: var(--ui-hover);
  }

  .ucd-status {
    font-size: var(--ui-font-size-xs);
    color: var(--ui-text-tertiary);
    white-space: nowrap;
  }

  .ucd-status.saved {
    color: var(--ui-text-success, #5aa85e);
  }

  .ucd-status.default {
    color: var(--ui-highlight);
  }

  .ucd-status.error {
    color: var(--ui-text-muted);
  }

  .ucd-row-btn {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 28px;
    height: 28px;
    padding: 0;
    background: var(--ui-surface-low);
    border: 1px solid var(--ui-border-subtle);
    border-radius: var(--ui-radius-sm);
    color: var(--ui-text-secondary);
    cursor: pointer;
    transition: all var(--ui-transition-fast);
  }

  .ucd-row-btn:hover:not(:disabled) {
    background: var(--ui-surface);
    color: var(--ui-text-primary);
    border-color: var(--ui-border-default);
  }

  .ucd-row-btn:disabled {
    opacity: 0.4;
    cursor: not-allowed;
  }

  .ucd-actions {
    display: flex;
    flex-wrap: wrap;
    justify-content: flex-end;
    gap: var(--ui-space-8);
  }

  .ucd-btn {
    padding: var(--ui-space-6) var(--ui-space-12);
    background: var(--ui-surface-low);
    border: 1px solid var(--ui-border-subtle);
    border-radius: var(--ui-radius-md);
    color: var(--ui-text-secondary);
    font-size: var(--ui-font-size-md);
    cursor: pointer;
    transition: all var(--ui-transition-fast);
  }

  .ucd-btn:hover:not(:disabled) {
    background: var(--ui-surface);
    color: var(--ui-text-primary);
    border-color: var(--ui-border-default);
  }

  .ucd-btn:disabled {
    opacity: 0.45;
    cursor: not-allowed;
  }

  .ucd-btn.primary {
    background: var(--ui-surface-high);
    border-color: var(--ui-border-medium);
    color: var(--ui-text-primary);
  }

  .ucd-btn.primary:hover:not(:disabled) {
    background: var(--ui-surface-higher);
    border-color: var(--ui-border-strong);
  }
</style>
