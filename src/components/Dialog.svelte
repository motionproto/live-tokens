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
  :global(:root) {
    /* Overlay */
    --dialog-overlay-surface: var(--overlay-high);

    /* Dialog frame */
    --dialog-surface: var(--surface-neutral-lowest);
    --dialog-border: var(--border-neutral-strong);
    --dialog-border-width: var(--border-width-default);
    --dialog-radius: var(--radius-lg);
    --dialog-shadow: var(--shadow-2xl);

    /* Header */
    --dialog-header-surface: var(--surface-neutral-lower);
    --dialog-header-border: var(--border-neutral-subtle);
    --dialog-header-border-width: var(--border-width-thin);
    --dialog-header-padding: var(--space-8);

    /* Title */
    --dialog-title: var(--text-primary);
    --dialog-title-font-family: var(--font-sans);
    --dialog-title-font-size: var(--font-size-2xl);
    --dialog-title-font-weight: var(--font-weight-normal);
    --dialog-title-line-height: var(--line-height-snug);

    /* Close icon */
    --dialog-close-icon: var(--text-secondary);
    --dialog-close-icon-size: var(--font-size-xl);

    /* Body */
    --dialog-body-padding: var(--space-16);

    /* Footer */
    --dialog-footer-border: var(--border-neutral-subtle);
    --dialog-footer-border-width: var(--border-width-thin);
    --dialog-footer-padding: var(--space-16);

    /* Primary button */
    --dialog-primary-default-surface: var(--surface-neutral-high);
    --dialog-primary-default-text: var(--text-primary);
    --dialog-primary-default-border: var(--border-neutral-medium);
    --dialog-primary-default-border-width: var(--border-width-thin);
    --dialog-primary-default-radius: var(--radius-md);
    --dialog-primary-default-padding: var(--space-8);
    --dialog-primary-hover-surface: var(--surface-neutral-higher);
    --dialog-primary-hover-text: var(--text-primary);
    --dialog-primary-hover-border: var(--border-neutral-strong);
    --dialog-primary-hover-border-width: var(--border-width-thin);
    --dialog-primary-hover-radius: var(--radius-md);
    --dialog-primary-hover-padding: var(--space-8);

    /* Secondary button */
    --dialog-secondary-default-surface: transparent;
    --dialog-secondary-default-text: var(--text-primary);
    --dialog-secondary-default-border: var(--border-neutral-medium);
    --dialog-secondary-default-border-width: var(--border-width-thin);
    --dialog-secondary-default-radius: var(--radius-md);
    --dialog-secondary-default-padding: var(--space-8);
    --dialog-secondary-hover-surface: var(--surface-neutral-lower);
    --dialog-secondary-hover-text: var(--text-primary);
    --dialog-secondary-hover-border: var(--border-neutral-strong);
    --dialog-secondary-hover-border-width: var(--border-width-thin);
    --dialog-secondary-hover-radius: var(--radius-md);
    --dialog-secondary-hover-padding: var(--space-8);
  }

  .dialog-backdrop {
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background-color: var(--dialog-overlay-surface);
    display: flex;
    justify-content: center;
    align-items: center;
    z-index: var(--z-overlay);
    pointer-events: auto;
  }

  .dialog {
    background: var(--dialog-surface);
    border: var(--dialog-border-width) solid var(--dialog-border);
    border-radius: var(--dialog-radius);
    box-shadow: var(--dialog-shadow);
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
    padding: var(--dialog-header-padding) calc(var(--dialog-header-padding) * 3);
    border-bottom: var(--dialog-header-border-width) solid var(--dialog-header-border);
    background: var(--dialog-header-surface);
    display: flex;
    justify-content: space-between;
    align-items: center;
  }

  .dialog-title {
    margin: 0;
    color: var(--dialog-title);
    font-family: var(--dialog-title-font-family);
    font-size: var(--dialog-title-font-size);
    font-weight: var(--dialog-title-font-weight);
    line-height: var(--dialog-title-line-height);
  }

  .dialog-close {
    background: none;
    border: none;
    color: var(--dialog-close-icon);
    font-size: var(--dialog-close-icon-size);
    cursor: pointer;
    margin-right: -1rem;
    width: 2.25rem;
    height: 2.25rem;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: var(--radius-md);
    transition: all var(--transition-base);
  }

  .dialog-close:hover {
    background: var(--surface-neutral-low);
    color: var(--text-primary);
  }

  .dialog-body {
    padding: var(--dialog-body-padding) calc(var(--dialog-body-padding) * 1.5);
  }

  .dialog-footer {
    padding: var(--dialog-footer-padding);
    border-top: var(--dialog-footer-border-width) solid var(--dialog-footer-border);
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
    font-size: var(--font-size-md);
    font-weight: var(--font-weight-light);
    cursor: pointer;
    transition: all var(--transition-base);
    min-width: 5rem;
  }

  .dialog-button:disabled {
    background: var(--surface-neutral-low);
    border-color: var(--border-neutral-faint);
    color: var(--text-disabled);
    cursor: not-allowed;
  }

  .dialog-button-primary {
    background: var(--dialog-primary-default-surface);
    color: var(--dialog-primary-default-text);
    border: var(--dialog-primary-default-border-width) solid var(--dialog-primary-default-border);
    border-radius: var(--dialog-primary-default-radius);
    padding: var(--dialog-primary-default-padding) calc(var(--dialog-primary-default-padding) * 2);
  }

  .dialog-button-primary:hover:not(:disabled) {
    background: var(--dialog-primary-hover-surface);
    color: var(--dialog-primary-hover-text);
    border: var(--dialog-primary-hover-border-width) solid var(--dialog-primary-hover-border);
    border-radius: var(--dialog-primary-hover-radius);
    padding: var(--dialog-primary-hover-padding) calc(var(--dialog-primary-hover-padding) * 2);
  }

  .dialog-button-primary:focus {
    outline: var(--border-width-default) solid var(--border-neutral-strong);
    outline-offset: var(--space-2);
  }

  .dialog-button-secondary {
    background: var(--dialog-secondary-default-surface);
    color: var(--dialog-secondary-default-text);
    border: var(--dialog-secondary-default-border-width) solid var(--dialog-secondary-default-border);
    border-radius: var(--dialog-secondary-default-radius);
    padding: var(--dialog-secondary-default-padding) calc(var(--dialog-secondary-default-padding) * 2);
  }

  .dialog-button-secondary:hover:not(:disabled) {
    background: var(--dialog-secondary-hover-surface);
    color: var(--dialog-secondary-hover-text);
    border: var(--dialog-secondary-hover-border-width) solid var(--dialog-secondary-hover-border);
    border-radius: var(--dialog-secondary-hover-radius);
    padding: var(--dialog-secondary-hover-padding) calc(var(--dialog-secondary-hover-padding) * 2);
  }
</style>
