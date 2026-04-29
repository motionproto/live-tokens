<script lang="ts">
   import { createEventDispatcher } from 'svelte';

   export let disabled: boolean = false;
   export let type: 'button' | 'submit' | 'reset' = 'button';
   export let variant: 'primary' | 'secondary' | 'outline' | 'success' | 'danger' | 'warning' = 'primary';
   export let size: 'default' | 'small' = 'default';
   export let ariaLabel: string | undefined = undefined;
   export let tooltip: string | undefined = undefined;
   export let icon: string | undefined = undefined;
   export let iconPosition: 'left' | 'right' = 'left';
   export let fullWidth: boolean = false;
   let className: string = '';
   export { className as class };

   const dispatch = createEventDispatcher();

   function handleClick(event: MouseEvent) {
      if (!disabled) {
         dispatch('click', event);
      }
   }
</script>

<button
   {type}
   class="button {variant} {className}"
   class:small={size === 'small'}
   class:full-width={fullWidth}
   {disabled}
   aria-label={ariaLabel}
   data-tooltip={tooltip}
   on:click={handleClick}
>
   {#if icon && iconPosition === 'left'}
      <i class={icon}></i>
   {/if}
   <slot />
   {#if icon && iconPosition === 'right'}
      <i class={icon}></i>
   {/if}
</button>

<style lang="scss">
   :global(:root) {
      /* Shared — set to `none` to disable the hover shimmer sweep */
      --button-shimmer: block;

      /* Primary */
      --button-primary-surface: var(--surface-primary-high);
      --button-primary-text: var(--text-primary);
      --button-primary-text-font-family: var(--font-sans);
      --button-primary-text-font-size: var(--font-size-sm);
      --button-primary-text-font-weight: var(--font-weight-light);
      --button-primary-text-line-height: var(--line-height-snug);
      --button-primary-border: var(--border-primary);
      --button-primary-border-width: var(--border-width-thin);
      --button-primary-radius: var(--radius-md);
      --button-primary-padding: var(--space-8);
      --button-primary-hover-surface: var(--surface-primary-higher);
      --button-primary-hover-text: var(--text-primary);
      --button-primary-hover-border: var(--border-primary-strong);
      --button-primary-hover-border-width: var(--border-width-thin);
      --button-primary-hover-radius: var(--radius-md);
      --button-primary-hover-padding: var(--space-8);
      --button-primary-disabled-surface: var(--color-neutral-700);
      --button-primary-disabled-text: var(--text-tertiary);
      --button-primary-disabled-border: var(--border-neutral-faint);
      --button-primary-disabled-border-width: var(--border-width-thin);
      --button-primary-disabled-radius: var(--radius-md);
      --button-primary-disabled-padding: var(--space-8);

      /* Secondary */
      --button-secondary-surface: var(--surface-neutral-high);
      --button-secondary-text: var(--text-primary);
      --button-secondary-text-font-family: var(--font-sans);
      --button-secondary-text-font-size: var(--font-size-sm);
      --button-secondary-text-font-weight: var(--font-weight-light);
      --button-secondary-text-line-height: var(--line-height-snug);
      --button-secondary-border: var(--border-neutral);
      --button-secondary-border-width: var(--border-width-thin);
      --button-secondary-radius: var(--radius-md);
      --button-secondary-padding: var(--space-8);
      --button-secondary-hover-surface: var(--surface-neutral-higher);
      --button-secondary-hover-text: var(--text-primary);
      --button-secondary-hover-border: var(--border-neutral-strong);
      --button-secondary-hover-border-width: var(--border-width-thin);
      --button-secondary-hover-radius: var(--radius-md);
      --button-secondary-hover-padding: var(--space-8);
      --button-secondary-disabled-surface: var(--color-neutral-700);
      --button-secondary-disabled-text: var(--text-tertiary);
      --button-secondary-disabled-border: var(--border-neutral-faint);
      --button-secondary-disabled-border-width: var(--border-width-thin);
      --button-secondary-disabled-radius: var(--radius-md);
      --button-secondary-disabled-padding: var(--space-8);

      /* Outline */
      --button-outline-surface: var(--color-transparent);
      --button-outline-text: var(--text-primary);
      --button-outline-text-font-family: var(--font-sans);
      --button-outline-text-font-size: var(--font-size-sm);
      --button-outline-text-font-weight: var(--font-weight-light);
      --button-outline-text-line-height: var(--line-height-snug);
      --button-outline-border: var(--border-neutral);
      --button-outline-border-width: var(--border-width-thin);
      --button-outline-radius: var(--radius-md);
      --button-outline-padding: var(--space-8);
      --button-outline-hover-surface: var(--surface-neutral-lower);
      --button-outline-hover-text: var(--text-primary);
      --button-outline-hover-border: var(--border-neutral-strong);
      --button-outline-hover-border-width: var(--border-width-thin);
      --button-outline-hover-radius: var(--radius-md);
      --button-outline-hover-padding: var(--space-8);
      --button-outline-disabled-surface: var(--color-transparent);
      --button-outline-disabled-text: var(--text-tertiary);
      --button-outline-disabled-border: var(--border-neutral-faint);
      --button-outline-disabled-border-width: var(--border-width-thin);
      --button-outline-disabled-radius: var(--radius-md);
      --button-outline-disabled-padding: var(--space-8);

      /* Success */
      --button-success-surface: var(--surface-success-low);
      --button-success-text: var(--text-success);
      --button-success-text-font-family: var(--font-sans);
      --button-success-text-font-size: var(--font-size-sm);
      --button-success-text-font-weight: var(--font-weight-light);
      --button-success-text-line-height: var(--line-height-snug);
      --button-success-border: var(--border-success);
      --button-success-border-width: var(--border-width-default);
      --button-success-radius: var(--radius-md);
      --button-success-padding: var(--space-8);
      --button-success-hover-surface: var(--surface-success-higher);
      --button-success-hover-text: var(--text-primary);
      --button-success-hover-border: var(--border-success-strong);
      --button-success-hover-border-width: var(--border-width-default);
      --button-success-hover-radius: var(--radius-md);
      --button-success-hover-padding: var(--space-8);
      --button-success-disabled-surface: var(--color-neutral-700);
      --button-success-disabled-text: var(--text-tertiary);
      --button-success-disabled-border: var(--border-neutral-faint);
      --button-success-disabled-border-width: var(--border-width-default);
      --button-success-disabled-radius: var(--radius-md);
      --button-success-disabled-padding: var(--space-8);

      /* Danger */
      --button-danger-surface: var(--surface-danger-low);
      --button-danger-text: var(--text-danger);
      --button-danger-text-font-family: var(--font-sans);
      --button-danger-text-font-size: var(--font-size-sm);
      --button-danger-text-font-weight: var(--font-weight-light);
      --button-danger-text-line-height: var(--line-height-snug);
      --button-danger-border: var(--border-danger);
      --button-danger-border-width: var(--border-width-default);
      --button-danger-radius: var(--radius-md);
      --button-danger-padding: var(--space-8);
      --button-danger-hover-surface: var(--surface-danger-high);
      --button-danger-hover-text: var(--text-primary);
      --button-danger-hover-border: var(--border-danger-medium);
      --button-danger-hover-border-width: var(--border-width-default);
      --button-danger-hover-radius: var(--radius-md);
      --button-danger-hover-padding: var(--space-8);
      --button-danger-disabled-surface: var(--color-neutral-700);
      --button-danger-disabled-text: var(--text-tertiary);
      --button-danger-disabled-border: var(--border-neutral-faint);
      --button-danger-disabled-border-width: var(--border-width-default);
      --button-danger-disabled-radius: var(--radius-md);
      --button-danger-disabled-padding: var(--space-8);

      /* Warning */
      --button-warning-surface: var(--surface-warning-low);
      --button-warning-text: var(--text-warning);
      --button-warning-text-font-family: var(--font-sans);
      --button-warning-text-font-size: var(--font-size-sm);
      --button-warning-text-font-weight: var(--font-weight-light);
      --button-warning-text-line-height: var(--line-height-snug);
      --button-warning-border: var(--border-warning);
      --button-warning-border-width: var(--border-width-default);
      --button-warning-radius: var(--radius-md);
      --button-warning-padding: var(--space-8);
      --button-warning-hover-surface: var(--surface-warning-high);
      --button-warning-hover-text: var(--text-primary);
      --button-warning-hover-border: var(--border-warning-medium);
      --button-warning-hover-border-width: var(--border-width-default);
      --button-warning-hover-radius: var(--radius-md);
      --button-warning-hover-padding: var(--space-8);
      --button-warning-disabled-surface: var(--color-neutral-700);
      --button-warning-disabled-text: var(--text-tertiary);
      --button-warning-disabled-border: var(--border-neutral-faint);
      --button-warning-disabled-border-width: var(--border-width-default);
      --button-warning-disabled-radius: var(--radius-md);
      --button-warning-disabled-padding: var(--space-8);
   }

   .button {
      cursor: pointer;
      letter-spacing: 0.0125rem;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: var(--space-8);
      transition: all var(--transition-fast);
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

      // Small size modifier (applies to any variant)
      &.small {
         padding: var(--space-6) var(--space-12);
         font-size: var(--font-size-xs);
         font-weight: var(--font-weight-normal);
         line-height: var(--line-height-snug);

         :global(i) {
            font-size: var(--font-size-xs);
            font-weight: var(--font-weight-semibold);
         }
      }

      // Primary variant (default)
      &.primary {
         background: var(--button-primary-surface);
         color: var(--button-primary-text);
         border: var(--button-primary-border-width) solid var(--button-primary-border);
         border-radius: var(--button-primary-radius);
         padding: var(--button-primary-padding) calc(var(--button-primary-padding) * 2);
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
            border: var(--button-primary-hover-border-width) solid var(--button-primary-hover-border);
            border-radius: var(--button-primary-hover-radius);
            padding: var(--button-primary-hover-padding) calc(var(--button-primary-hover-padding) * 2);
            color: var(--button-primary-hover-text);
         }

         &:active:not(:disabled) {
            box-shadow: var(--shadow-sm);
         }

         &:disabled {
            background: var(--button-primary-disabled-surface);
            border: var(--button-primary-disabled-border-width) solid var(--button-primary-disabled-border);
            border-radius: var(--button-primary-disabled-radius);
            padding: var(--button-primary-disabled-padding) calc(var(--button-primary-disabled-padding) * 2);
            color: var(--button-primary-disabled-text);
         }
      }

      // Secondary variant
      &.secondary {
         background: var(--button-secondary-surface);
         color: var(--button-secondary-text);
         border: var(--button-secondary-border-width) solid var(--button-secondary-border);
         border-radius: var(--button-secondary-radius);
         padding: var(--button-secondary-padding) calc(var(--button-secondary-padding) * 2);
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
            border: var(--button-secondary-hover-border-width) solid var(--button-secondary-hover-border);
            border-radius: var(--button-secondary-hover-radius);
            padding: var(--button-secondary-hover-padding) calc(var(--button-secondary-hover-padding) * 2);
            color: var(--button-secondary-hover-text);
         }

         &:disabled {
            background: var(--button-secondary-disabled-surface);
            border: var(--button-secondary-disabled-border-width) solid var(--button-secondary-disabled-border);
            border-radius: var(--button-secondary-disabled-radius);
            padding: var(--button-secondary-disabled-padding) calc(var(--button-secondary-disabled-padding) * 2);
            color: var(--button-secondary-disabled-text);
         }
      }

      // Outline variant
      &.outline {
         background: var(--button-outline-surface);
         color: var(--button-outline-text);
         border: var(--button-outline-border-width) solid var(--button-outline-border);
         border-radius: var(--button-outline-radius);
         padding: var(--button-outline-padding) calc(var(--button-outline-padding) * 2);
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
            border: var(--button-outline-hover-border-width) solid var(--button-outline-hover-border);
            border-radius: var(--button-outline-hover-radius);
            padding: var(--button-outline-hover-padding) calc(var(--button-outline-hover-padding) * 2);
            color: var(--button-outline-hover-text);
         }

         &:active:not(:disabled) {
            background: rgba(255, 255, 255, 0.08);
         }

         &:disabled {
            background: var(--button-outline-disabled-surface);
            border: var(--button-outline-disabled-border-width) solid var(--button-outline-disabled-border);
            border-radius: var(--button-outline-disabled-radius);
            padding: var(--button-outline-disabled-padding) calc(var(--button-outline-disabled-padding) * 2);
            color: var(--button-outline-disabled-text);
         }
      }

      // Success variant
      &.success {
         background: var(--button-success-surface);
         border: var(--button-success-border-width) solid var(--button-success-border);
         border-radius: var(--button-success-radius);
         padding: var(--button-success-padding) calc(var(--button-success-padding) * 2);
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
            border: var(--button-success-hover-border-width) solid var(--button-success-hover-border);
            border-radius: var(--button-success-hover-radius);
            padding: var(--button-success-hover-padding) calc(var(--button-success-hover-padding) * 2);
            color: var(--button-success-hover-text);
         }

         &:disabled {
            background: var(--button-success-disabled-surface);
            border: var(--button-success-disabled-border-width) solid var(--button-success-disabled-border);
            border-radius: var(--button-success-disabled-radius);
            padding: var(--button-success-disabled-padding) calc(var(--button-success-disabled-padding) * 2);
            color: var(--button-success-disabled-text);
         }
      }

      // Danger variant
      &.danger {
         background: var(--button-danger-surface);
         border: var(--button-danger-border-width) solid var(--button-danger-border);
         border-radius: var(--button-danger-radius);
         padding: var(--button-danger-padding) calc(var(--button-danger-padding) * 2);
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
            border: var(--button-danger-hover-border-width) solid var(--button-danger-hover-border);
            border-radius: var(--button-danger-hover-radius);
            padding: var(--button-danger-hover-padding) calc(var(--button-danger-hover-padding) * 2);
            color: var(--button-danger-hover-text);
         }

         &:disabled {
            background: var(--button-danger-disabled-surface);
            border: var(--button-danger-disabled-border-width) solid var(--button-danger-disabled-border);
            border-radius: var(--button-danger-disabled-radius);
            padding: var(--button-danger-disabled-padding) calc(var(--button-danger-disabled-padding) * 2);
            color: var(--button-danger-disabled-text);
         }
      }

      // Warning variant
      &.warning {
         background: var(--button-warning-surface);
         border: var(--button-warning-border-width) solid var(--button-warning-border);
         border-radius: var(--button-warning-radius);
         padding: var(--button-warning-padding) calc(var(--button-warning-padding) * 2);
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
            border: var(--button-warning-hover-border-width) solid var(--button-warning-hover-border);
            border-radius: var(--button-warning-hover-radius);
            padding: var(--button-warning-hover-padding) calc(var(--button-warning-hover-padding) * 2);
            color: var(--button-warning-hover-text);
         }

         &:disabled {
            background: var(--button-warning-disabled-surface);
            border: var(--button-warning-disabled-border-width) solid var(--button-warning-disabled-border);
            border-radius: var(--button-warning-disabled-radius);
            padding: var(--button-warning-disabled-padding) calc(var(--button-warning-disabled-padding) * 2);
            color: var(--button-warning-disabled-text);
         }
      }

   :global(i) {
      font-size: var(--font-size-sm);

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
