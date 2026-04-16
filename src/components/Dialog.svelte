<script lang="ts">
  import { createEventDispatcher, tick } from 'svelte';

  export let show: boolean = false;
  export let title: string = '';
  export let confirmLabel: string = 'Confirm';
  export let cancelLabel: string = 'Cancel';
  export let showConfirm: boolean = true;
  export let showCancel: boolean = true;
  export let confirmDisabled: boolean = false;
  export let width: string = '500px';

  // Optional callbacks for parent dialogs to control behavior
  export let onConfirm: (() => void) | undefined = undefined;
  export let onCancel: (() => void) | undefined = undefined;

  const dispatch = createEventDispatcher<{
    confirm: void;
    cancel: void;
    close: void;
  }>();

  // Reference to the primary (confirm) button for focus management
  let confirmButtonRef: HTMLButtonElement;
  let cancelButtonRef: HTMLButtonElement;
  let closeButtonRef: HTMLButtonElement;

  // Focus the primary button when dialog opens
  $: if (show) {
    tick().then(() => {
      // Focus the primary (confirm) button first, then fall back to cancel, then close
      if (showConfirm && confirmButtonRef && !confirmDisabled) {
        confirmButtonRef.focus();
      } else if (showCancel && cancelButtonRef) {
        cancelButtonRef.focus();
      } else if (closeButtonRef) {
        closeButtonRef.focus();
      }
    });
  }

  function handleConfirm() {
    if (!confirmDisabled) {
      if (onConfirm) {
        // Parent dialog controls the flow
        onConfirm();
      } else {
        // Default behavior for backward compatibility
        dispatch('confirm');
      }
    }
  }

  function handleCancel() {
    if (onCancel) {
      // Parent dialog controls the flow
      onCancel();
    } else {
      // Default behavior for backward compatibility
      dispatch('cancel');
      dispatch('close');
      show = false;
    }
  }

  // No implicit keyboard or backdrop close handlers
  // Dialog only closes via explicit button clicks (X, Cancel, or Confirm)
</script>

{#if show}
  <div class="dialog-backdrop">
    <div class="dialog" style="width: {width}; max-width: {width};">
      <div class="dialog-content">
        {#if title}
          <div class="dialog-header">
            <h3 class="dialog-title">{title}</h3>
            <button
              bind:this={closeButtonRef}
              class="dialog-close"
              on:click={handleCancel}
              aria-label="Close"
              tabindex="0"
            >
              <i class="fas fa-times"></i>
            </button>
          </div>
        {/if}

        <div class="dialog-body">
          <slot />
        </div>

        {#if showConfirm || showCancel}
          <div class="dialog-footer">
            <div class="dialog-footer-left">
              <slot name="footer-left" />
            </div>
            <div class="dialog-footer-buttons">
              {#if showCancel}
                <button
                  bind:this={cancelButtonRef}
                  class="dialog-button dialog-button-secondary"
                  on:click={handleCancel}
                  tabindex="0"
                >
                  {cancelLabel}
                </button>
              {/if}
              {#if showConfirm}
                <button
                  bind:this={confirmButtonRef}
                  class="dialog-button dialog-button-primary"
                  on:click={handleConfirm}
                  disabled={confirmDisabled}
                  tabindex="0"
                >
                  {confirmLabel}
                </button>
              {/if}
            </div>
          </div>
        {/if}
      </div>
    </div>
  </div>
{/if}

<style>
  .dialog-backdrop {
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background-color: var(--overlay-high);
    display: flex;
    justify-content: center;
    align-items: center;
    z-index: var(--z-overlay);
    pointer-events: auto;
  }

  .dialog {
    background: var(--surface-neutral-lowest);
    border: 2px solid var(--border-neutral-strong);
    border-radius: var(--radius-lg);
    box-shadow: var(--shadow-overlay);
    animation: dialogSlideIn var(--transition-base);
    pointer-events: auto;
  }

  @keyframes dialogSlideIn {
    from {
      opacity: 0;
      transform: translateY(-1.25rem);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }

  .dialog-content {
    padding: 0;
  }

  .dialog-header {
    padding: .5rem var(--space-24);
    border-bottom: 1px solid var(--border-neutral-subtle);
    background: var(--empty);
    display: flex;
    justify-content: space-between;
    align-items: center;
  }

  .dialog-title {
    margin: 0;
    font-size: var(--font-2xl);
    font-weight: var(--font-weight-semibold);
    color: var(--text-primary);
  }

  .dialog-close {
    background: none;
    border: none;
    color: var(--text-secondary);
    font-size: var(--font-xl);
    cursor: pointer;
    margin-right: -var(--space-16);
    width: 2rem;
    height: 2rem;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: var(--radius-md);
    transition: all var(--transition-base);
  }

  .dialog-close:hover {
    background: var(--hover);
    color: var(--text-primary);
  }

  .dialog-body {
    padding: var(--space-16) var(--space-24);
  }

  .dialog-footer {
    padding: var(--space-16);
    border-top: 1px solid var(--border-neutral-subtle);
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: var(--space-16);
  }

  .dialog-footer-left {
    display: flex;
    align-items: center;
  }

  .dialog-footer-buttons {
    display: flex;
    gap: var(--space-8);
  }

  .dialog-button {
    padding: var(--space-8) var(--space-16);
    border: 1px solid var(--border-neutral-subtle);
    border-radius: var(--radius-md);
    font-size: var(--font-md);
    font-weight: var(--font-weight-medium);
    cursor: pointer;
    transition: all var(--transition-base);
    min-width: 5rem;
  }

  .dialog-button:disabled {
    opacity: var(--opacity-disabled);
    cursor: not-allowed;
  }

  .dialog-button-primary {
    background: var(--btn-secondary-bg);
    color: var(--text-primary);
    border-color: var(--border-neutral-medium);
  }

  .dialog-button-primary:hover:not(:disabled) {
    background: var(--btn-secondary-hover);
    border-color: var(--border-neutral-strong);
  }

  .dialog-button-primary:focus {
    outline: 2px solid var(--border-neutral-strong);
    outline-offset: 0.125rem;
  }

  .dialog-button-secondary {
    background: transparent;
    color: var(--text-primary);
    border-color: var(--border-neutral-medium);
  }

  .dialog-button-secondary:hover:not(:disabled) {
    background: var(--hover-low);
    border-color: var(--border-neutral-strong);
  }
</style>
