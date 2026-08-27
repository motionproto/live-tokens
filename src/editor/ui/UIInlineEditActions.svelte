<script lang="ts">
  interface Props {
    onSave: () => void | Promise<void>;
    onCancel: () => void;
    disabled?: boolean;
    saveTitle?: string;
    cancelTitle?: string;
  }

  let {
    onSave,
    onCancel,
    disabled = false,
    saveTitle = 'Save',
    cancelTitle = 'Cancel'
  }: Props = $props();
</script>

<div class="ui-inline-actions">
  <button
    class="ui-ia ui-ia-save"
    type="button"
    {disabled}
    title={saveTitle}
    aria-label={saveTitle}
    onclick={onSave}
  ><i class="fas fa-check" aria-hidden="true"></i></button>
  <button
    class="ui-ia ui-ia-cancel"
    type="button"
    {disabled}
    title={cancelTitle}
    aria-label={cancelTitle}
    onclick={onCancel}
  ><i class="fas fa-xmark" aria-hidden="true"></i></button>
</div>

<style>
  .ui-inline-actions {
    display: inline-flex;
    align-items: center;
    gap: var(--ui-space-4);
  }

  /* Sized to the 1.5rem chrome buttons it sits beside (eyedropper, swatch). */
  .ui-ia {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 1.5rem;
    height: 1.5rem;
    padding: 0;
    border-radius: var(--ui-radius-sm);
    font-size: var(--ui-font-size-xs);
    line-height: 1;
    cursor: pointer;
    transition:
      background var(--ui-transition-fast),
      border-color var(--ui-transition-fast),
      color var(--ui-transition-fast);
  }

  .ui-ia-save {
    background: linear-gradient(180deg, rgba(90, 168, 94, 0.35) 0%, rgba(90, 168, 94, 0.18) 100%);
    border: 1px solid rgba(90, 168, 94, 0.6);
    color: var(--ui-text-primary);
  }

  .ui-ia-save:hover:not(:disabled) {
    background: linear-gradient(180deg, rgba(90, 168, 94, 0.48) 0%, rgba(90, 168, 94, 0.26) 100%);
    border-color: rgba(90, 168, 94, 0.78);
  }

  .ui-ia-cancel {
    background: linear-gradient(180deg, rgba(255, 255, 255, 0.06) 0%, rgba(255, 255, 255, 0.02) 100%);
    border: 1px solid rgba(255, 255, 255, 0.3);
    color: var(--ui-text-secondary);
  }

  .ui-ia-cancel:hover:not(:disabled) {
    background: linear-gradient(180deg, rgba(255, 255, 255, 0.12) 0%, rgba(255, 255, 255, 0.05) 100%);
    border-color: rgba(255, 255, 255, 0.5);
    color: var(--ui-text-primary);
  }

  .ui-ia:focus-visible {
    outline: none;
    box-shadow: 0 0 0 2px rgba(255, 255, 255, 0.18);
  }

  .ui-ia:disabled {
    background: linear-gradient(180deg, rgba(255, 255, 255, 0.04) 0%, rgba(255, 255, 255, 0.02) 100%);
    border-color: rgba(255, 255, 255, 0.14);
    color: var(--ui-text-disabled);
    cursor: not-allowed;
  }
</style>
