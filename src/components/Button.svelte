<script lang="ts">
   import { createEventDispatcher } from 'svelte';

   export let disabled: boolean = false;
   export let type: 'button' | 'submit' | 'reset' = 'button';
   export let variant: 'primary' | 'secondary' | 'outline' | 'small_secondary' | 'success' | 'danger' | 'warning' = 'primary';
   export let size: 'default' | 'small' = 'default';
   export let ariaLabel: string | undefined = undefined;
   export let tooltip: string | undefined = undefined;
   export let icon: string | undefined = undefined;
   export let iconPosition: 'left' | 'right' = 'left';
   export let fullWidth: boolean = false;

   const dispatch = createEventDispatcher();

   function handleClick(event: MouseEvent) {
      if (!disabled) {
         dispatch('click', event);
      }
   }
</script>

<button
   {type}
   class="button {variant}"
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
   .button {
      padding: var(--space-8) var(--space-16);
      border-radius: var(--radius-md);
      cursor: pointer;
      font-size: var(--font-sm);
      font-weight: var(--font-weight-medium);
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

      &:hover:not(:disabled)::before {
         left: 100%;
      }

      &:hover:not(:disabled) {
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
         font-size: var(--font-xs);
         font-weight: var(--font-weight-semibold);
         line-height: 1.2;

         :global(i) {
            font-size: var(--font-xs);
            font-weight: var(--font-weight-bold);
         }
      }

      // Primary variant (default)
      &.primary {
         background: var(--surface-primary-high);
         color: var(--text-primary);
         border: 1px solid var(--border-primary);

         &::before {
            background: linear-gradient(90deg,
               transparent,
               rgba(255, 255, 255, 0.2),
               transparent);
         }

         &:hover:not(:disabled) {
            background: var(--surface-primary-higher);
            border-color: var(--border-primary-strong);
         }

         &:active:not(:disabled) {
            box-shadow: var(--shadow-sm);
         }

         &:disabled {
            background: var(--color-neutral-700);
            border-color: var(--border-neutral-faint);
            color: var(--text-tertiary);
         }
      }

      // Secondary variant
      &.secondary {
         background: var(--surface-neutral-high);
         color: var(--text-primary);
         border: 1px solid var(--border-neutral-default);

         &::before {
            background: linear-gradient(90deg,
               transparent,
               var(--hover),
               transparent);
         }

         &:hover:not(:disabled) {
            background: var(--surface-neutral-higher);
            border-color: var(--border-neutral-strong);
         }

         &:disabled {
            background: var(--color-neutral-700);
            border-color: var(--border-neutral-faint);
            color: var(--text-tertiary);
         }
      }

      // Outline variant
      &.outline {
         background: transparent;
         color: var(--text-primary);
         border: 1px solid var(--border-neutral-default);

         &::before {
            background: linear-gradient(90deg,
               transparent,
               var(--hover),
               transparent);
         }

         &:hover:not(:disabled) {
            background: var(--hover-low);
            border-color: var(--border-neutral-strong);
         }

         &:active:not(:disabled) {
            background: rgba(255, 255, 255, 0.08);
         }

         &:disabled {
            background: transparent;
            border-color: var(--border-neutral-faint);
            color: var(--text-tertiary);
         }
      }

      // Small Secondary variant (matches add-structure-button)
      &.small_secondary {
         padding: var(--space-8) var(--space-16);
         background: var(--hover);
         color: var(--text-primary);
         border: 1px solid var(--border-neutral-default);
         font-size: var(--font-sm);
         font-weight: var(--font-weight-semibold);
         line-height: 1.2;

         &::before {
            background: linear-gradient(90deg,
               transparent,
               var(--hover),
               transparent);
         }

         &:hover:not(:disabled) {
            background: var(--hover-high);
            border-color: var(--border-neutral-strong);
         }

         &:active:not(:disabled) {
            background: rgba(255, 255, 255, 0.18);
         }

         &:disabled {
            background: transparent;
            border-color: var(--border-neutral-faint);
            color: var(--text-tertiary);
         }

         :global(i) {
               font-size: var(--font-sm);
               font-weight: var(--font-weight-bold);

         }
      }

      // Success variant
      &.success {
         background: var(--surface-success-low);
         border: 2px solid var(--border-success);
         color: var(--text-success);

         &::before {
            background: linear-gradient(90deg,
               transparent,
               rgba(255, 255, 255, 0.2),
               transparent);
         }

         &:hover:not(:disabled) {
            background: var(--surface-success-higher);
            border-color: var(--border-success-strong);
            color: var(--text-primary);
         }

         &:disabled {
            background: var(--color-neutral-700);
            border-color: var(--border-neutral-faint);
            color: var(--text-tertiary);
         }
      }

      // Danger variant
      &.danger {
         background: var(--surface-danger-low);
         border: 2px solid var(--border-danger);
         color: var(--text-danger);

         &::before {
            background: linear-gradient(90deg,
               transparent,
               rgba(0, 0, 0, 0.15),
               transparent);
         }

         &:hover:not(:disabled) {
            background: var(--surface-danger-high);
            border-color: var(--border-danger-medium);
            color: var(--text-primary);
         }

         &:disabled {
            background: var(--color-neutral-700);
            border-color: var(--border-neutral-faint);
            color: var(--text-tertiary);
         }
      }

      // Warning variant
      &.warning {
         background: var(--surface-warning-low);
         border: 2px solid var(--border-warning);
         color: var(--text-warning);

         &::before {
            background: linear-gradient(90deg,
               transparent,
               rgba(255, 255, 255, 0.2),
               transparent);
         }

         &:hover:not(:disabled) {
            background: var(--surface-warning-high);
            border-color: var(--border-warning-medium);
            color: var(--text-primary);
         }

         &:disabled {
            background: var(--color-neutral-700);
            border-color: var(--border-neutral-faint);
            color: var(--text-tertiary);
         }
      }

   :global(i) {
      font-size: var(--font-sm);

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
         font-size: var(--font-sm);
         opacity: 0.9;
         padding: var(--space-2) var(--space-6);
         background: var(--overlay-low);
         border-radius: var(--radius-sm);
         margin-left: var(--space-4);
      }
   }
</style>
