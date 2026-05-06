<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import type { ComponentConfigMeta } from '../../lib/themeTypes';
  import { sanitizeFileName } from '../../lib/themeService';
  import UIDialog from '../../ui/UIDialog.svelte';

  /** Two-way bound: parent toggles to open/close. */
  export let show: boolean = false;
  /** Display name to seed the input with when the dialog opens. */
  export let currentDisplayName: string = '';
  /** Existing files used by the increment helper to find the next available `_NN` suffix. */
  export let files: ComponentConfigMeta[] = [];

  const dispatch = createEventDispatcher<{
    save: { displayName: string; fileName: string };
  }>();

  let saveAsName = '';
  let saveAsInput: HTMLInputElement;

  // Seed and select the input whenever the dialog opens. setTimeout(..., 0)
  // matches the original parent's behaviour: it runs as a macrotask, after
  // UIDialog's microtask-queued focus on the confirm button — so the input
  // ends up focused-and-selected, not the button.
  $: if (show) {
    saveAsName =
      sanitizeFileName(currentDisplayName) === 'default'
        ? nextIncrementName(currentDisplayName).displayName
        : currentDisplayName;
    setTimeout(() => saveAsInput?.select(), 0);
  }

  $: saveAsError = (() => {
    const trimmed = saveAsName.trim();
    if (!trimmed) return '';
    if (sanitizeFileName(trimmed) === 'default') {
      return 'The name "default" is reserved for the core component definition.';
    }
    return '';
  })();

  function nextIncrementName(baseDisplay: string): { displayName: string; fileName: string } {
    const baseName = baseDisplay.replace(/_\d+$/, '');
    const baseFileName = sanitizeFileName(baseName);
    const existingNums = files
      .filter(
        (f) =>
          f.fileName === baseFileName ||
          f.fileName.match(new RegExp(`^${baseFileName}_\\d+$`)),
      )
      .map((f) => {
        const m = f.fileName.match(/_(\d+)$/);
        return m ? parseInt(m[1], 10) : 0;
      });
    const next = (existingNums.length > 0 ? Math.max(...existingNums) : 0) + 1;
    const suffix = String(next).padStart(2, '0');
    return { displayName: `${baseName}_${suffix}`, fileName: `${baseFileName}_${suffix}` };
  }

  function incrementSaveAsName() {
    saveAsName = nextIncrementName(saveAsName).displayName;
    setTimeout(() => saveAsInput?.select(), 0);
  }

  function confirmSaveAs() {
    const displayName = saveAsName.trim();
    if (!displayName || saveAsError) return;
    const fileName = sanitizeFileName(displayName);
    show = false;
    dispatch('save', { displayName, fileName });
  }

  function handleKeydown(e: KeyboardEvent) {
    if (e.key === 'Enter') confirmSaveAs();
  }
</script>

<UIDialog
  bind:show
  title="Save As"
  cancelLabel="Cancel"
  confirmLabel="Save"
  confirmDisabled={!saveAsName.trim() || !!saveAsError}
  on:confirm={confirmSaveAs}
  width="360px"
>
  <div class="save-as-dialog">
    <div class="save-as-row">
      <input
        class="save-as-input"
        class:invalid={!!saveAsError}
        type="text"
        bind:value={saveAsName}
        bind:this={saveAsInput}
        on:keydown={handleKeydown}
        placeholder="Config name…"
      />
      <button
        type="button"
        class="save-as-increment"
        on:click={incrementSaveAsName}
        title="Increment filename"
      >
        <i class="fas fa-plus"></i>
      </button>
    </div>
    {#if saveAsError}
      <p class="save-as-error" role="alert">{saveAsError}</p>
    {/if}
  </div>
</UIDialog>

<style>
  .save-as-dialog {
    display: flex;
    flex-direction: column;
    gap: var(--ui-space-8);
  }

  .save-as-row {
    display: flex;
    align-items: stretch;
    gap: var(--ui-space-6);
  }

  .save-as-input {
    flex: 1;
    min-width: 0;
    padding: var(--ui-space-8) var(--ui-space-10);
    background: var(--ui-surface-lowest);
    border: 1px solid var(--ui-border-subtle);
    border-radius: var(--ui-radius-md);
    color: var(--ui-text-primary);
    font-size: var(--ui-font-size-md);
    outline: none;
  }

  .save-as-increment {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 2.25rem;
    padding: 0;
    background: var(--ui-surface-low);
    border: 1px solid var(--ui-border-subtle);
    border-radius: var(--ui-radius-md);
    color: var(--ui-text-secondary);
    font-size: var(--ui-font-size-md);
    cursor: pointer;
    transition: all var(--ui-transition-fast);
  }

  .save-as-increment:hover {
    background: var(--ui-surface);
    border-color: var(--ui-border-default);
    color: var(--ui-text-primary);
  }

  .save-as-input:focus {
    border-color: var(--ui-border-medium);
  }

  .save-as-input.invalid,
  .save-as-input.invalid:focus {
    border-color: var(--ui-highlight);
  }

  .save-as-input::placeholder {
    color: var(--ui-text-muted);
  }

  .save-as-error {
    margin: 0;
    font-size: var(--ui-font-size-xs);
    color: var(--ui-highlight);
  }
</style>
