<script lang="ts">
   import { createEventDispatcher } from 'svelte';

   interface Props {
      disabled?: boolean;
      type?: 'button' | 'submit' | 'reset';
      variant?: 'primary' | 'secondary' | 'outline' | 'success' | 'danger' | 'warning';
      size?: 'default' | 'small';
      ariaLabel?: string | undefined;
      tooltip?: string | undefined;
      icon?: string | undefined;
      iconPosition?: 'left' | 'right';
      fullWidth?: boolean;
      buttonRef?: HTMLButtonElement | undefined;
      class?: string;
      /** Click callback. Preferred over `on:click` from 0.5.0 onward. */
      onclick?: (event: MouseEvent) => void;
      children?: import('svelte').Snippet;
   }

   let {
      disabled = false,
      type = 'button',
      variant = 'primary',
      size = 'default',
      ariaLabel = undefined,
      tooltip = undefined,
      icon = undefined,
      iconPosition = 'left',
      fullWidth = false,
      buttonRef = $bindable(undefined),
      class: className = '',
      onclick,
      children
   }: Props = $props();

   // Dual-fire bridge: keeps Svelte-4-style `<Button on:click={fn}>` consumers
   // working until 0.6.0. Remove the dispatcher and this comment in 0.6.0.
   const dispatch = createEventDispatcher();

   function handleClick(event: MouseEvent) {
      if (!disabled) {
         onclick?.(event);
         dispatch('click', event);
      }
   }
</script>

<button
   bind:this={buttonRef}
   {type}
   class="button {variant} {className}"
   class:small={size === 'small'}
   class:full-width={fullWidth}
   {disabled}
   aria-label={ariaLabel}
   data-tooltip={tooltip}
   onclick={handleClick}
>
   {#if icon && iconPosition === 'left'}
      <i class={icon}></i>
   {/if}
   {@render children?.()}
   {#if icon && iconPosition === 'right'}
      <i class={icon}></i>
   {/if}
</button>

<style lang="scss">
   @use '../styles/padding' as *;

   :global(:root) {
      /* Shared — set to `none` to disable the hover shimmer sweep */
      --button-shimmer: block;

      /* Primary */
      --button-primary-surface: var(--surface-brand-high);
      --button-primary-text: var(--text-primary);
      --button-primary-text-font-family: var(--font-sans);
      --button-primary-text-font-size: var(--font-size-lg);
      --button-primary-text-font-weight: var(--font-weight-semibold);
      --button-primary-text-line-height: var(--line-height-sm);
      --button-primary-border: var(--border-brand);
      --button-primary-border-width: var(--border-width-1);
      --button-primary-radius: var(--radius-xl);
      --button-primary-padding: var(--space-8);
      --button-primary-hover-surface: var(--surface-brand-higher);
      --button-primary-hover-text: var(--text-primary);
      --button-primary-hover-border: var(--border-brand-strong);
      --button-primary-disabled-surface: var(--color-neutral-700);
      --button-primary-disabled-text: var(--text-tertiary);
      --button-primary-disabled-border: var(--border-neutral-faint);
      --button-primary-icon-size: var(--icon-size-md);

      /* Secondary */
      --button-secondary-surface: var(--surface-neutral-high);
      --button-secondary-text: var(--text-primary);
      --button-secondary-text-font-family: var(--font-sans);
      --button-secondary-text-font-size: var(--font-size-lg);
      --button-secondary-text-font-weight: var(--font-weight-semibold);
      --button-secondary-text-line-height: var(--line-height-sm);
      --button-secondary-border: var(--border-neutral);
      --button-secondary-border-width: var(--border-width-1);
      --button-secondary-radius: var(--radius-xl);
      --button-secondary-padding: var(--space-8);
      --button-secondary-hover-surface: var(--surface-neutral-higher);
      --button-secondary-hover-text: var(--text-primary);
      --button-secondary-hover-border: var(--border-neutral-strong);
      --button-secondary-disabled-surface: var(--color-neutral-700);
      --button-secondary-disabled-text: var(--text-tertiary);
      --button-secondary-disabled-border: var(--border-neutral-faint);
      --button-secondary-icon-size: var(--icon-size-md);

      /* Outline */
      --button-outline-surface: var(--color-transparent);
      --button-outline-text: var(--text-primary);
      --button-outline-text-font-family: var(--font-sans);
      --button-outline-text-font-size: var(--font-size-lg);
      --button-outline-text-font-weight: var(--font-weight-semibold);
      --button-outline-text-line-height: var(--line-height-sm);
      --button-outline-border: var(--border-neutral);
      --button-outline-border-width: var(--border-width-1);
      --button-outline-radius: var(--radius-xl);
      --button-outline-padding: var(--space-8);
      --button-outline-hover-surface: var(--surface-neutral-lower);
      --button-outline-hover-text: var(--text-primary);
      --button-outline-hover-border: var(--border-neutral-strong);
      --button-outline-active-surface: var(--hover);
      --button-outline-disabled-surface: var(--color-transparent);
      --button-outline-disabled-text: var(--text-tertiary);
      --button-outline-disabled-border: var(--border-neutral-faint);
      --button-outline-icon-size: var(--icon-size-md);

      /* Success */
      --button-success-surface: var(--surface-success-low);
      --button-success-text: var(--text-success);
      --button-success-text-font-family: var(--font-sans);
      --button-success-text-font-size: var(--font-size-lg);
      --button-success-text-font-weight: var(--font-weight-semibold);
      --button-success-text-line-height: var(--line-height-sm);
      --button-success-border: var(--border-success);
      --button-success-border-width: var(--border-width-1);
      --button-success-radius: var(--radius-xl);
      --button-success-padding: var(--space-8);
      --button-success-hover-surface: var(--surface-success-higher);
      --button-success-hover-text: var(--text-primary);
      --button-success-hover-border: var(--border-success-strong);
      --button-success-disabled-surface: var(--color-neutral-700);
      --button-success-disabled-text: var(--text-tertiary);
      --button-success-disabled-border: var(--border-neutral-faint);
      --button-success-icon-size: var(--icon-size-md);

      /* Danger */
      --button-danger-surface: var(--surface-danger-low);
      --button-danger-text: var(--text-danger);
      --button-danger-text-font-family: var(--font-sans);
      --button-danger-text-font-size: var(--font-size-lg);
      --button-danger-text-font-weight: var(--font-weight-semibold);
      --button-danger-text-line-height: var(--line-height-sm);
      --button-danger-border: var(--border-danger);
      --button-danger-border-width: var(--border-width-1);
      --button-danger-radius: var(--radius-xl);
      --button-danger-padding: var(--space-8);
      --button-danger-hover-surface: var(--surface-danger-high);
      --button-danger-hover-text: var(--text-primary);
      --button-danger-hover-border: var(--border-danger-medium);
      --button-danger-disabled-surface: var(--color-neutral-700);
      --button-danger-disabled-text: var(--text-tertiary);
      --button-danger-disabled-border: var(--border-neutral-faint);
      --button-danger-icon-size: var(--icon-size-md);

      /* Warning */
      --button-warning-surface: var(--surface-warning-low);
      --button-warning-text: var(--text-warning);
      --button-warning-text-font-family: var(--font-sans);
      --button-warning-text-font-size: var(--font-size-lg);
      --button-warning-text-font-weight: var(--font-weight-semibold);
      --button-warning-text-line-height: var(--line-height-sm);
      --button-warning-border: var(--border-warning);
      --button-warning-border-width: var(--border-width-1);
      --button-warning-radius: var(--radius-xl);
      --button-warning-padding: var(--space-8);
      --button-warning-hover-surface: var(--surface-warning-high);
      --button-warning-hover-text: var(--text-primary);
      --button-warning-hover-border: var(--border-warning-medium);
      --button-warning-disabled-surface: var(--color-neutral-700);
      --button-warning-disabled-text: var(--text-tertiary);
      --button-warning-disabled-border: var(--border-neutral-faint);
      --button-warning-icon-size: var(--icon-size-md);

      /* Small size — shared across all variants. The `.small` rule below reads
         these tokens directly (no per-variant rebind needed, since small
         currently looks the same regardless of variant). Per-side padding
         overrides power split-padding edits at small. */
      --button-small-padding: var(--space-6);
      --button-small-text-font-size: var(--font-size-sm);
      --button-small-text-font-weight: var(--font-weight-normal);
      --button-small-text-line-height: var(--line-height-sm);
      --button-small-icon-size: var(--font-size-xs);
   }

   .button {
      cursor: pointer;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: var(--space-8);
      transition: all var(--duration-150);
      position: relative;
      overflow: hidden;

      &.full-width {
         width: 100%;
         display: flex;
      }

      // Shimmer effect
      &::before {
         content: '';
         display: var(--button-shimmer, block);
         position: absolute;
         top: 0;
         left: -100%;
         width: 100%;
         height: 100%;
         transition: left 0.5s ease;
      }

      &:hover:not(:disabled)::before,
      &.force-hover:not(:disabled)::before {
         left: 100%;
      }

      &:hover:not(:disabled),
      &.force-hover:not(:disabled) {
         transform: translateY(-0.0625rem);
         box-shadow: var(--shadow-md);
      }

      &:active:not(:disabled) {
         transform: translateY(0);
      }

      &:disabled {
         cursor: not-allowed;

         &::before {
            display: none;
         }
      }

      // Primary variant (default)
      &.primary {
         --button-icon-size: var(--button-primary-icon-size);
         background: var(--button-primary-surface);
         color: var(--button-primary-text);
         border: var(--button-primary-border-width) solid var(--button-primary-border);
         border-radius: var(--button-primary-radius);
         @include themed-padding(--button-primary-padding, $h: 2);
         font-family: var(--button-primary-text-font-family);
         font-size: var(--button-primary-text-font-size);
         font-weight: var(--button-primary-text-font-weight);
         line-height: var(--button-primary-text-line-height);

         &::before {
            background: linear-gradient(90deg,
               transparent,
               rgba(255, 255, 255, 0.2),
               transparent);
         }

         &:hover:not(:disabled),
         &.force-hover:not(:disabled) {
            background: var(--button-primary-hover-surface);
            border-color: var(--button-primary-hover-border);
            color: var(--button-primary-hover-text);
         }

         &:active:not(:disabled) {
            box-shadow: var(--shadow-sm);
         }

         &:disabled {
            background: var(--button-primary-disabled-surface);
            border-color: var(--button-primary-disabled-border);
            color: var(--button-primary-disabled-text);
         }
      }

      // Secondary variant
      &.secondary {
         --button-icon-size: var(--button-secondary-icon-size);
         background: var(--button-secondary-surface);
         color: var(--button-secondary-text);
         border: var(--button-secondary-border-width) solid var(--button-secondary-border);
         border-radius: var(--button-secondary-radius);
         @include themed-padding(--button-secondary-padding, $h: 2);
         font-family: var(--button-secondary-text-font-family);
         font-size: var(--button-secondary-text-font-size);
         font-weight: var(--button-secondary-text-font-weight);
         line-height: var(--button-secondary-text-line-height);

         &::before {
            background: linear-gradient(90deg,
               transparent,
               rgba(255, 255, 255, 0.1),
               transparent);
         }

         &:hover:not(:disabled),
         &.force-hover:not(:disabled) {
            background: var(--button-secondary-hover-surface);
            border-color: var(--button-secondary-hover-border);
            color: var(--button-secondary-hover-text);
         }

         &:disabled {
            background: var(--button-secondary-disabled-surface);
            border-color: var(--button-secondary-disabled-border);
            color: var(--button-secondary-disabled-text);
         }
      }

      // Outline variant
      &.outline {
         --button-icon-size: var(--button-outline-icon-size);
         background: var(--button-outline-surface);
         color: var(--button-outline-text);
         border: var(--button-outline-border-width) solid var(--button-outline-border);
         border-radius: var(--button-outline-radius);
         @include themed-padding(--button-outline-padding, $h: 2);
         font-family: var(--button-outline-text-font-family);
         font-size: var(--button-outline-text-font-size);
         font-weight: var(--button-outline-text-font-weight);
         line-height: var(--button-outline-text-line-height);

         &::before {
            background: linear-gradient(90deg,
               transparent,
               rgba(255, 255, 255, 0.1),
               transparent);
         }

         &:hover:not(:disabled),
         &.force-hover:not(:disabled) {
            background: var(--button-outline-hover-surface);
            border-color: var(--button-outline-hover-border);
            color: var(--button-outline-hover-text);
         }

         &:active:not(:disabled) {
            background: var(--button-outline-active-surface);
         }

         &:disabled {
            background: var(--button-outline-disabled-surface);
            border-color: var(--button-outline-disabled-border);
            color: var(--button-outline-disabled-text);
         }
      }

      // Success variant
      &.success {
         --button-icon-size: var(--button-success-icon-size);
         background: var(--button-success-surface);
         border: var(--button-success-border-width) solid var(--button-success-border);
         border-radius: var(--button-success-radius);
         @include themed-padding(--button-success-padding, $h: 2);
         color: var(--button-success-text);
         font-family: var(--button-success-text-font-family);
         font-size: var(--button-success-text-font-size);
         font-weight: var(--button-success-text-font-weight);
         line-height: var(--button-success-text-line-height);

         &::before {
            background: linear-gradient(90deg,
               transparent,
               rgba(255, 255, 255, 0.2),
               transparent);
         }

         &:hover:not(:disabled),
         &.force-hover:not(:disabled) {
            background: var(--button-success-hover-surface);
            border-color: var(--button-success-hover-border);
            color: var(--button-success-hover-text);
         }

         &:disabled {
            background: var(--button-success-disabled-surface);
            border-color: var(--button-success-disabled-border);
            color: var(--button-success-disabled-text);
         }
      }

      // Danger variant
      &.danger {
         --button-icon-size: var(--button-danger-icon-size);
         background: var(--button-danger-surface);
         border: var(--button-danger-border-width) solid var(--button-danger-border);
         border-radius: var(--button-danger-radius);
         @include themed-padding(--button-danger-padding, $h: 2);
         color: var(--button-danger-text);
         font-family: var(--button-danger-text-font-family);
         font-size: var(--button-danger-text-font-size);
         font-weight: var(--button-danger-text-font-weight);
         line-height: var(--button-danger-text-line-height);

         &::before {
            background: linear-gradient(90deg,
               transparent,
               rgba(0, 0, 0, 0.15),
               transparent);
         }

         &:hover:not(:disabled),
         &.force-hover:not(:disabled) {
            background: var(--button-danger-hover-surface);
            border-color: var(--button-danger-hover-border);
            color: var(--button-danger-hover-text);
         }

         &:disabled {
            background: var(--button-danger-disabled-surface);
            border-color: var(--button-danger-disabled-border);
            color: var(--button-danger-disabled-text);
         }
      }

      // Warning variant
      &.warning {
         --button-icon-size: var(--button-warning-icon-size);
         background: var(--button-warning-surface);
         border: var(--button-warning-border-width) solid var(--button-warning-border);
         border-radius: var(--button-warning-radius);
         @include themed-padding(--button-warning-padding, $h: 2);
         color: var(--button-warning-text);
         font-family: var(--button-warning-text-font-family);
         font-size: var(--button-warning-text-font-size);
         font-weight: var(--button-warning-text-font-weight);
         line-height: var(--button-warning-text-line-height);

         &::before {
            background: linear-gradient(90deg,
               transparent,
               rgba(255, 255, 255, 0.2),
               transparent);
         }

         &:hover:not(:disabled),
         &.force-hover:not(:disabled) {
            background: var(--button-warning-hover-surface);
            border-color: var(--button-warning-hover-border);
            color: var(--button-warning-hover-text);
         }

         &:disabled {
            background: var(--button-warning-disabled-surface);
            border-color: var(--button-warning-disabled-border);
            color: var(--button-warning-disabled-text);
         }
      }

      // Small size modifier (applies to any variant). Variants only set padding
      // once in their base rule and never override per-state, so a single
      // selector here is enough — `.small` declared after the variant block
      // wins on source order. themed-padding with $h: 2 mirrors the variant
      // base rule; per-side `--button-small-padding-*` tokens (registered by
      // the editor) feed split edits through the mixin.
      &.small {
         @include themed-padding(--button-small-padding, $h: 2);
         font-size: var(--button-small-text-font-size);
         font-weight: var(--button-small-text-font-weight);
         line-height: var(--button-small-text-line-height);
      }

      &.small :global(i) {
         font-size: var(--button-small-icon-size);
         font-weight: var(--font-weight-semibold);
      }

   :global(i) {
      font-size: var(--button-icon-size, var(--icon-size-sm));

      &.spinning {
         animation: spin 1s linear infinite;
      }
   }

   @keyframes spin {
      from { transform: rotate(0deg); }
      to { transform: rotate(360deg); }
   }

      // Support for slotted content with special styles
      :global(.badge), :global(.count), :global(.fame-count) {
         font-size: var(--font-size-sm);
         opacity: 0.9;
         padding: var(--space-2) var(--space-6);
         background: var(--overlay-low);
         border-radius: var(--radius-sm);
         margin-left: var(--space-4);
      }
   }
</style>
