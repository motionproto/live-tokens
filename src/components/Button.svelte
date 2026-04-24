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
      /* Primary */
      --button-primary-surface: var(--surface-primary-high);
      --button-primary-text: var(--text-primary);
      --button-primary-border: var(--border-primary);
      --button-primary-radius: var(--radius-md);
      --button-primary-hover-surface: var(--surface-primary-higher);
      --button-primary-hover-text: var(--text-primary);
      --button-primary-hover-border: var(--border-primary-strong);
      --button-primary-disabled-surface: var(--color-neutral-700);
      --button-primary-disabled-text: var(--text-tertiary);
      --button-primary-disabled-border: var(--border-neutral-faint);

      /* Secondary */
      --button-secondary-surface: var(--surface-neutral-high);
      --button-secondary-text: var(--text-primary);
      --button-secondary-border: var(--border-neutral-default);
      --button-secondary-radius: var(--radius-md);
      --button-secondary-hover-surface: var(--surface-neutral-higher);
      --button-secondary-hover-text: var(--text-primary);
      --button-secondary-hover-border: var(--border-neutral-strong);
      --button-secondary-disabled-surface: var(--color-neutral-700);
      --button-secondary-disabled-text: var(--text-tertiary);
      --button-secondary-disabled-border: var(--border-neutral-faint);

      /* Outline */
      --button-outline-surface: var(--color-transparent);
      --button-outline-text: var(--text-primary);
      --button-outline-border: var(--border-neutral-default);
      --button-outline-radius: var(--radius-md);
      --button-outline-hover-surface: var(--hover-low);
      --button-outline-hover-text: var(--text-primary);
      --button-outline-hover-border: var(--border-neutral-strong);
      --button-outline-disabled-surface: var(--color-transparent);
      --button-outline-disabled-text: var(--text-tertiary);
      --button-outline-disabled-border: var(--border-neutral-faint);

      /* Success */
      --button-success-surface: var(--surface-success-low);
      --button-success-text: var(--text-success);
      --button-success-border: var(--border-success);
      --button-success-radius: var(--radius-md);
      --button-success-hover-surface: var(--surface-success-higher);
      --button-success-hover-text: var(--text-primary);
      --button-success-hover-border: var(--border-success-strong);
      --button-success-disabled-surface: var(--color-neutral-700);
      --button-success-disabled-text: var(--text-tertiary);
      --button-success-disabled-border: var(--border-neutral-faint);

      /* Danger */
      --button-danger-surface: var(--surface-danger-low);
      --button-danger-text: var(--text-danger);
      --button-danger-border: var(--border-danger);
      --button-danger-radius: var(--radius-md);
      --button-danger-hover-surface: var(--surface-danger-high);
      --button-danger-hover-text: var(--text-primary);
      --button-danger-hover-border: var(--border-danger-medium);
      --button-danger-disabled-surface: var(--color-neutral-700);
      --button-danger-disabled-text: var(--text-tertiary);
      --button-danger-disabled-border: var(--border-neutral-faint);

      /* Warning */
      --button-warning-surface: var(--surface-warning-low);
      --button-warning-text: var(--text-warning);
      --button-warning-border: var(--border-warning);
      --button-warning-radius: var(--radius-md);
      --button-warning-hover-surface: var(--surface-warning-high);
      --button-warning-hover-text: var(--text-primary);
      --button-warning-hover-border: var(--border-warning-medium);
      --button-warning-disabled-surface: var(--color-neutral-700);
      --button-warning-disabled-text: var(--text-tertiary);
      --button-warning-disabled-border: var(--border-neutral-faint);
   }

   .button {
      padding: var(--space-8) var(--space-16);
      border-radius: var(--radius-md);
      cursor: pointer;
      font-size: var(--font-size-sm);
      font-weight: var(--font-weight-light);
      line-height: 1.2;
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
         opacity: var(--opacity-disabled);
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
         line-height: 1.2;

         :global(i) {
            font-size: var(--font-size-xs);
            font-weight: var(--font-weight-semibold);
         }
      }

      // Primary variant (default)
      &.primary {
         background: var(--button-primary-surface);
         color: var(--button-primary-text);
         border: 1px solid var(--button-primary-border);
         border-radius: var(--button-primary-radius);

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
         background: var(--button-secondary-surface);
         color: var(--button-secondary-text);
         border: 1px solid var(--button-secondary-border);
         border-radius: var(--button-secondary-radius);

         &::before {
            background: linear-gradient(90deg,
               transparent,
               var(--hover),
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
         background: var(--button-outline-surface);
         color: var(--button-outline-text);
         border: 1px solid var(--button-outline-border);
         border-radius: var(--button-outline-radius);

         &::before {
            background: linear-gradient(90deg,
               transparent,
               var(--hover),
               transparent);
         }

         &:hover:not(:disabled),
         &.force-hover:not(:disabled) {
            background: var(--button-outline-hover-surface);
            border-color: var(--button-outline-hover-border);
            color: var(--button-outline-hover-text);
         }

         &:active:not(:disabled) {
            background: rgba(255, 255, 255, 0.08);
         }

         &:disabled {
            background: var(--button-outline-disabled-surface);
            border-color: var(--button-outline-disabled-border);
            color: var(--button-outline-disabled-text);
         }
      }

      // Success variant
      &.success {
         background: var(--button-success-surface);
         border: 2px solid var(--button-success-border);
         border-radius: var(--button-success-radius);
         color: var(--button-success-text);

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
         background: var(--button-danger-surface);
         border: 2px solid var(--button-danger-border);
         border-radius: var(--button-danger-radius);
         color: var(--button-danger-text);

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
         background: var(--button-warning-surface);
         border: 2px solid var(--button-warning-border);
         border-radius: var(--button-warning-radius);
         color: var(--button-warning-text);

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
