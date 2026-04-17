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
         background: transparent;
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
            background: transparent;
            border-color: var(--button-outline-disabled-border);
            color: var(--button-outline-disabled-text);
         }
      }

      // Small Secondary variant (matches add-structure-button)
      &.small_secondary {
         padding: var(--space-8) var(--space-16);
         background: var(--button-small_secondary-surface);
         color: var(--button-small_secondary-text);
         border: 1px solid var(--button-small_secondary-border);
         border-radius: var(--button-small_secondary-radius);
         font-size: var(--font-sm);
         font-weight: var(--font-weight-semibold);
         line-height: 1.2;

         &::before {
            background: linear-gradient(90deg,
               transparent,
               var(--hover),
               transparent);
         }

         &:hover:not(:disabled),
         &.force-hover:not(:disabled) {
            background: var(--button-small_secondary-hover-surface);
            border-color: var(--button-small_secondary-hover-border);
            color: var(--button-small_secondary-hover-text);
         }

         &:active:not(:disabled) {
            background: rgba(255, 255, 255, 0.18);
         }

         &:disabled {
            background: transparent;
            border-color: var(--button-small_secondary-disabled-border);
            color: var(--button-small_secondary-disabled-text);
         }

         :global(i) {
               font-size: var(--font-sm);
               font-weight: var(--font-weight-bold);

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
