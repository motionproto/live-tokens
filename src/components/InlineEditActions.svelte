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
      /* Save (default) */
      --inlineeditactions-save-default-surface: var(--surface-success-low);
      --inlineeditactions-save-default-text: var(--text-success);
      --inlineeditactions-save-default-border: var(--border-success);
      --inlineeditactions-save-default-border-width: var(--border-width-none);
      --inlineeditactions-save-default-radius: var(--radius-md);
      --inlineeditactions-save-default-padding: var(--space-4);
      --inlineeditactions-save-default-icon-size: var(--font-size-md);

      /* Save (hover) */
      --inlineeditactions-save-hover-surface: var(--surface-success-high);
      --inlineeditactions-save-hover-text: var(--text-success);
      --inlineeditactions-save-hover-border: var(--border-success);
      --inlineeditactions-save-hover-border-width: var(--border-width-none);
      --inlineeditactions-save-hover-radius: var(--radius-md);
      --inlineeditactions-save-hover-padding: var(--space-4);
      --inlineeditactions-save-hover-icon-size: var(--font-size-md);

      /* Cancel (default) */
      --inlineeditactions-cancel-default-surface: var(--surface-danger-low);
      --inlineeditactions-cancel-default-text: var(--text-danger);
      --inlineeditactions-cancel-default-border: var(--border-danger);
      --inlineeditactions-cancel-default-border-width: var(--border-width-none);
      --inlineeditactions-cancel-default-radius: var(--radius-md);
      --inlineeditactions-cancel-default-padding: var(--space-4);
      --inlineeditactions-cancel-default-icon-size: var(--font-size-md);

      /* Cancel (hover) */
      --inlineeditactions-cancel-hover-surface: var(--surface-danger-high);
      --inlineeditactions-cancel-hover-text: var(--text-danger);
      --inlineeditactions-cancel-hover-border: var(--border-danger);
      --inlineeditactions-cancel-hover-border-width: var(--border-width-none);
      --inlineeditactions-cancel-hover-radius: var(--radius-md);
      --inlineeditactions-cancel-hover-padding: var(--space-4);
      --inlineeditactions-cancel-hover-icon-size: var(--font-size-md);
   }

   .inline-actions {
      display: flex;
      gap: var(--space-8);
   }

   .save-btn,
   .cancel-btn {
      cursor: pointer;
      transition: all var(--transition-base);
      display: flex;
      align-items: center;
      gap: var(--space-8);

      &:disabled {
         background: var(--surface-neutral-low);
         color: var(--text-disabled);
         cursor: not-allowed;
      }
   }

   .save-btn {
      background: var(--inlineeditactions-save-default-surface);
      color: var(--inlineeditactions-save-default-text);
      border: var(--inlineeditactions-save-default-border-width) solid var(--inlineeditactions-save-default-border);
      border-radius: var(--inlineeditactions-save-default-radius);
      padding: var(--inlineeditactions-save-default-padding) calc(var(--inlineeditactions-save-default-padding) * 2);
      font-size: var(--inlineeditactions-save-default-icon-size);

      &:hover:not(:disabled),
      .inline-actions.force-hover &:not(:disabled) {
         background: var(--inlineeditactions-save-hover-surface);
         color: var(--inlineeditactions-save-hover-text);
         border: var(--inlineeditactions-save-hover-border-width) solid var(--inlineeditactions-save-hover-border);
         border-radius: var(--inlineeditactions-save-hover-radius);
         padding: var(--inlineeditactions-save-hover-padding) calc(var(--inlineeditactions-save-hover-padding) * 2);
         font-size: var(--inlineeditactions-save-hover-icon-size);
      }
   }

   .cancel-btn {
      background: var(--inlineeditactions-cancel-default-surface);
      color: var(--inlineeditactions-cancel-default-text);
      border: var(--inlineeditactions-cancel-default-border-width) solid var(--inlineeditactions-cancel-default-border);
      border-radius: var(--inlineeditactions-cancel-default-radius);
      padding: var(--inlineeditactions-cancel-default-padding) calc(var(--inlineeditactions-cancel-default-padding) * 2);
      font-size: var(--inlineeditactions-cancel-default-icon-size);

      &:hover:not(:disabled),
      .inline-actions.force-hover &:not(:disabled) {
         background: var(--inlineeditactions-cancel-hover-surface);
         color: var(--inlineeditactions-cancel-hover-text);
         border: var(--inlineeditactions-cancel-hover-border-width) solid var(--inlineeditactions-cancel-hover-border);
         border-radius: var(--inlineeditactions-cancel-hover-radius);
         padding: var(--inlineeditactions-cancel-hover-padding) calc(var(--inlineeditactions-cancel-hover-padding) * 2);
         font-size: var(--inlineeditactions-cancel-hover-icon-size);
      }
   }
</style>
