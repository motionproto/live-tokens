<script lang="ts">
  import { createEventDispatcher, tick } from 'svelte';
  import Button from './Button.svelte';
  import { editorState } from '../lib/editorStore';
  import type { ButtonVariant, DialogButtonSpec } from './types';

  const BUTTON_VARIANTS: readonly ButtonVariant[] = ['primary', 'secondary', 'outline', 'success', 'danger', 'warning'];
  function asVariant(v: string | undefined, fallback: ButtonVariant): ButtonVariant {
    return v && (BUTTON_VARIANTS as readonly string[]).includes(v) ? (v as ButtonVariant) : fallback;
  }

  export let show: boolean = false;
  export let title: string = '';
  export let width: string = '500px';
  /** When true, the dialog renders inline within its parent rather than as a fixed-position overlay. Used by the editor preview. */
  export let inline: boolean = false;
  /** Right footer button. Undefined hides it. `--dialog-confirm-variant` config drives the variant when `confirm.variant` is unset. */
  export let confirm: DialogButtonSpec | undefined = undefined;
  /** Left footer button. Undefined hides it. `--dialog-cancel-variant` config drives the variant when `cancel.variant` is unset. */
  export let cancel: DialogButtonSpec | undefined = undefined;

  $: configuredConfig = $editorState.components.dialog?.config ?? {};
  $: effectiveConfirmVariant = confirm?.variant ?? asVariant(configuredConfig['--dialog-confirm-variant'] as string | undefined, 'primary');
  $: effectiveCancelVariant = cancel?.variant ?? asVariant(configuredConfig['--dialog-cancel-variant'] as string | undefined, 'outline');

  const dispatch = createEventDispatcher<{
    close: void;
  }>();

  let confirmButtonRef: HTMLButtonElement;
  let cancelButtonRef: HTMLButtonElement;
  let closeButtonRef: HTMLButtonElement;

  // Focus the primary button when dialog opens (skip in inline mode so the editor doesn't steal focus).
  $: if (show && !inline) {
    tick().then(() => {
      if (confirm && confirmButtonRef && !confirm.disabled) {
        confirmButtonRef.focus();
      } else if (cancel && cancelButtonRef) {
        cancelButtonRef.focus();
      } else if (closeButtonRef) {
        closeButtonRef.focus();
      }
    });
  }

  function handleConfirm() {
    if (confirm && !confirm.disabled) {
      confirm.onClick();
    }
  }

  function handleCancel() {
    if (cancel) {
      cancel.onClick();
    } else {
      dispatch('close');
      show = false;
    }
  }
</script>

{#if show}
  <div class="dialog-backdrop" class:inline>
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

        {#if confirm || cancel}
          <div class="dialog-footer">
            <div class="dialog-footer-left">
              <slot name="footer-left" />
            </div>
            <div class="dialog-footer-buttons">
              {#if cancel}
                <Button
                  variant={effectiveCancelVariant}
                  disabled={cancel.disabled}
                  on:click={handleCancel}
                  bind:buttonRef={cancelButtonRef}
                >
                  {cancel.label}
                </Button>
              {/if}
              {#if confirm}
                <Button
                  variant={effectiveConfirmVariant}
                  disabled={confirm.disabled}
                  on:click={handleConfirm}
                  bind:buttonRef={confirmButtonRef}
                >
                  {confirm.label}
                </Button>
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
    --dialog-border-width: var(--border-width-2);
    --dialog-radius: var(--radius-lg);
    --dialog-shadow: var(--shadow-2xl);
    --dialog-blur: var(--blur-none);

    /* Header */
    --dialog-header-surface: var(--surface-neutral-lower);
    --dialog-header-border: var(--border-neutral-subtle);
    --dialog-header-border-width: var(--border-width-1);
    --dialog-header-padding: var(--space-8);

    /* Title */
    --dialog-title: var(--text-primary);
    --dialog-title-font-family: var(--font-sans);
    --dialog-title-font-size: var(--font-size-2xl);
    --dialog-title-font-weight: var(--font-weight-normal);
    --dialog-title-line-height: var(--line-height-snug);

    /* Close icon */
    --dialog-close-icon: var(--text-secondary);
    --dialog-close-icon-size: var(--icon-size-xl);

    /* Body */
    --dialog-body-padding: var(--space-16);

    /* Footer */
    --dialog-footer-border: var(--border-neutral-subtle);
    --dialog-footer-border-width: var(--border-width-1);
    --dialog-footer-padding: var(--space-16);
  }

  .dialog-backdrop {
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: var(--dialog-overlay-surface);
    display: flex;
    justify-content: center;
    align-items: center;
    z-index: var(--z-overlay);
    pointer-events: auto;
  }

  .dialog-backdrop.inline {
    position: relative;
    top: auto;
    left: auto;
    width: 100%;
    height: auto;
    padding: var(--space-32);
    border-radius: var(--radius-md);
    z-index: auto;
  }

  .dialog {
    background: var(--dialog-surface);
    border: var(--dialog-border-width) solid var(--dialog-border);
    border-radius: var(--dialog-radius);
    box-shadow: var(--dialog-shadow);
    backdrop-filter: blur(var(--dialog-blur));
    animation: dialogSlideIn var(--duration-200);
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
    transition: all var(--duration-200);
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
</style>
