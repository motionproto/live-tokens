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
</script>

<div class="inline-actions">
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
   .inline-actions {
      display: flex;
      gap: var(--space-8);
   }

   .save-btn,
   .cancel-btn {
      padding: var(--space-4) var(--space-8);
      border: none;
      border-radius: var(--radius-md);
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
      background: rgba(144, 238, 144, 0.2);
      color: #90ee90;

      &:hover:not(:disabled) {
         background: rgba(144, 238, 144, 0.3);
      }
   }

   .cancel-btn {
      background: rgba(255, 107, 107, 0.2);
      color: #ff6b6b;

      &:hover:not(:disabled) {
         background: rgba(255, 107, 107, 0.3);
      }
   }
</style>
