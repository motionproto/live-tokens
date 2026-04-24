<script lang="ts">
   /**
    * Reusable inline edit action buttons (confirm/cancel)
    * Used for inline editing throughout the app
    */

   export let onSave: () => void | Promise<void>;
   export let onCancel: () => void;
   export let disabled = false;
   export let saveTitle = "Save";
   export let cancelTitle = "Cancel";
   let className: string = '';
   export { className as class };
</script>

<div class="inline-actions {className}">
   <button
      class="save-btn"
      type="button"
      on:click={onSave}
      {disabled}
      title={saveTitle}
   >
      <i class="fas fa-check"></i>
   </button>
   <button
      class="cancel-btn"
      type="button"
      on:click={onCancel}
      disabled={disabled}
      title={cancelTitle}
   >
      <i class="fas fa-times"></i>
   </button>
</div>

<style lang="scss">
   :global(:root) {
      /* Save (confirm) */
      --inlineeditactions-save-surface: var(--surface-success-low);
      --inlineeditactions-save-hover-surface: var(--surface-success-high);
      --inlineeditactions-save-text: var(--text-success);

      /* Cancel */
      --inlineeditactions-cancel-surface: var(--surface-danger-low);
      --inlineeditactions-cancel-hover-surface: var(--surface-danger-high);
      --inlineeditactions-cancel-text: var(--text-danger);

      /* Shared */
      --inlineeditactions-radius: var(--radius-md);
   }

   .inline-actions {
      display: flex;
      gap: var(--space-8);
   }

   .save-btn,
   .cancel-btn {
      padding: var(--space-4) var(--space-8);
      border: none;
      border-radius: var(--inlineeditactions-radius);
      cursor: pointer;
      transition: all 0.2s;
      display: flex;
      align-items: center;
      gap: var(--space-8);

      &:disabled {
         opacity: 0.5;
         cursor: not-allowed;
      }
   }

   .save-btn {
      background: var(--inlineeditactions-save-surface);
      color: var(--inlineeditactions-save-text);

      &:hover:not(:disabled),
      .inline-actions.force-hover &:not(:disabled) {
         background: var(--inlineeditactions-save-hover-surface);
      }
   }

   .cancel-btn {
      background: var(--inlineeditactions-cancel-surface);
      color: var(--inlineeditactions-cancel-text);

      &:hover:not(:disabled),
      .inline-actions.force-hover &:not(:disabled) {
         background: var(--inlineeditactions-cancel-hover-surface);
      }
   }
</style>
