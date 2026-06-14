<script lang="ts">
   interface Props {
      disabled?: boolean;
      type?: 'button' | 'submit' | 'reset';
      variant?: 'primary' | 'secondary' | 'outline' | 'success' | 'danger' | 'warning';
      size?: 'default' | 'small';
      icon: string;
      /** Required: the button has no visible text, so it needs an accessible name. */
      ariaLabel: string;
      tooltip?: string | undefined;
      buttonRef?: HTMLButtonElement | undefined;
      class?: string;
      onclick?: (event: MouseEvent) => void;
   }

   let {
      disabled = false,
      type = 'button',
      variant = 'primary',
      size = 'default',
      icon,
      ariaLabel,
      tooltip = undefined,
      buttonRef = $bindable(undefined),
      class: className = '',
      onclick
   }: Props = $props();

   function handleClick(event: MouseEvent) {
      if (!disabled) onclick?.(event);
   }
</script>

<button
   bind:this={buttonRef}
   {type}
   class="icon-button {variant} {className}"
   class:small={size === 'small'}
   {disabled}
   aria-label={ariaLabel}
   data-tooltip={tooltip}
   onclick={handleClick}
>
   <i class={icon}></i>
</button>

<style lang="scss">
   @use '../styles/padding' as *;

   :global(:root) {
      /* Primary */
      --iconbutton-primary-surface: var(--surface-brand-high);
      --iconbutton-primary-icon: var(--text-primary);
      --iconbutton-primary-border: var(--border-brand);
      --iconbutton-primary-border-width: var(--border-width-1);
      --iconbutton-primary-radius: var(--radius-xl);
      --iconbutton-primary-padding: var(--space-8);
      --iconbutton-primary-icon-size: var(--icon-size-md);
      --iconbutton-primary-hover-surface: var(--surface-brand-higher);
      --iconbutton-primary-hover-icon: var(--text-primary);
      --iconbutton-primary-hover-border: var(--border-brand-strong);
      --iconbutton-primary-disabled-surface: var(--color-neutral-700);
      --iconbutton-primary-disabled-icon: var(--text-tertiary);
      --iconbutton-primary-disabled-border: var(--border-neutral-faint);

      /* Secondary */
      --iconbutton-secondary-surface: var(--surface-neutral-high);
      --iconbutton-secondary-icon: var(--text-primary);
      --iconbutton-secondary-border: var(--border-neutral);
      --iconbutton-secondary-border-width: var(--border-width-1);
      --iconbutton-secondary-radius: var(--radius-xl);
      --iconbutton-secondary-padding: var(--space-8);
      --iconbutton-secondary-icon-size: var(--icon-size-md);
      --iconbutton-secondary-hover-surface: var(--surface-neutral-higher);
      --iconbutton-secondary-hover-icon: var(--text-primary);
      --iconbutton-secondary-hover-border: var(--border-neutral-strong);
      --iconbutton-secondary-disabled-surface: var(--color-neutral-700);
      --iconbutton-secondary-disabled-icon: var(--text-tertiary);
      --iconbutton-secondary-disabled-border: var(--border-neutral-faint);

      /* Outline */
      --iconbutton-outline-surface: var(--color-transparent);
      --iconbutton-outline-icon: var(--text-primary);
      --iconbutton-outline-border: var(--border-neutral);
      --iconbutton-outline-border-width: var(--border-width-1);
      --iconbutton-outline-radius: var(--radius-xl);
      --iconbutton-outline-padding: var(--space-8);
      --iconbutton-outline-icon-size: var(--icon-size-md);
      --iconbutton-outline-hover-surface: var(--surface-neutral-lower);
      --iconbutton-outline-hover-icon: var(--text-primary);
      --iconbutton-outline-hover-border: var(--border-neutral-strong);
      --iconbutton-outline-active-surface: var(--hover);
      --iconbutton-outline-disabled-surface: var(--color-transparent);
      --iconbutton-outline-disabled-icon: var(--text-tertiary);
      --iconbutton-outline-disabled-border: var(--border-neutral-faint);

      /* Success */
      --iconbutton-success-surface: var(--surface-success-low);
      --iconbutton-success-icon: var(--text-success);
      --iconbutton-success-border: var(--border-success);
      --iconbutton-success-border-width: var(--border-width-1);
      --iconbutton-success-radius: var(--radius-xl);
      --iconbutton-success-padding: var(--space-8);
      --iconbutton-success-icon-size: var(--icon-size-md);
      --iconbutton-success-hover-surface: var(--surface-success-higher);
      --iconbutton-success-hover-icon: var(--text-primary);
      --iconbutton-success-hover-border: var(--border-success-strong);
      --iconbutton-success-disabled-surface: var(--color-neutral-700);
      --iconbutton-success-disabled-icon: var(--text-tertiary);
      --iconbutton-success-disabled-border: var(--border-neutral-faint);

      /* Danger */
      --iconbutton-danger-surface: var(--surface-danger-low);
      --iconbutton-danger-icon: var(--text-danger);
      --iconbutton-danger-border: var(--border-danger);
      --iconbutton-danger-border-width: var(--border-width-1);
      --iconbutton-danger-radius: var(--radius-xl);
      --iconbutton-danger-padding: var(--space-8);
      --iconbutton-danger-icon-size: var(--icon-size-md);
      --iconbutton-danger-hover-surface: var(--surface-danger-high);
      --iconbutton-danger-hover-icon: var(--text-primary);
      --iconbutton-danger-hover-border: var(--border-danger-medium);
      --iconbutton-danger-disabled-surface: var(--color-neutral-700);
      --iconbutton-danger-disabled-icon: var(--text-tertiary);
      --iconbutton-danger-disabled-border: var(--border-neutral-faint);

      /* Warning */
      --iconbutton-warning-surface: var(--surface-warning-low);
      --iconbutton-warning-icon: var(--text-warning);
      --iconbutton-warning-border: var(--border-warning);
      --iconbutton-warning-border-width: var(--border-width-1);
      --iconbutton-warning-radius: var(--radius-xl);
      --iconbutton-warning-padding: var(--space-8);
      --iconbutton-warning-icon-size: var(--icon-size-md);
      --iconbutton-warning-hover-surface: var(--surface-warning-high);
      --iconbutton-warning-hover-icon: var(--text-primary);
      --iconbutton-warning-hover-border: var(--border-warning-medium);
      --iconbutton-warning-disabled-surface: var(--color-neutral-700);
      --iconbutton-warning-disabled-icon: var(--text-tertiary);
      --iconbutton-warning-disabled-border: var(--border-neutral-faint);

      /* Small size — shared across all variants, mirroring Button. */
      --iconbutton-small-padding: var(--space-6);
      --iconbutton-small-icon-size: var(--icon-size-sm);
   }

   .icon-button {
      cursor: pointer;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      aspect-ratio: 1;
      transition: all var(--duration-150);

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
      }

      &.primary {
         --iconbutton-icon-size: var(--iconbutton-primary-icon-size);
         background: var(--iconbutton-primary-surface);
         color: var(--iconbutton-primary-icon);
         border: var(--iconbutton-primary-border-width) solid var(--iconbutton-primary-border);
         border-radius: var(--iconbutton-primary-radius);
         @include themed-padding(--iconbutton-primary-padding);

         &:hover:not(:disabled),
         &.force-hover:not(:disabled) {
            background: var(--iconbutton-primary-hover-surface);
            border-color: var(--iconbutton-primary-hover-border);
            color: var(--iconbutton-primary-hover-icon);
         }

         &:active:not(:disabled) {
            box-shadow: var(--shadow-sm);
         }

         &:disabled {
            background: var(--iconbutton-primary-disabled-surface);
            border-color: var(--iconbutton-primary-disabled-border);
            color: var(--iconbutton-primary-disabled-icon);
         }
      }

      &.secondary {
         --iconbutton-icon-size: var(--iconbutton-secondary-icon-size);
         background: var(--iconbutton-secondary-surface);
         color: var(--iconbutton-secondary-icon);
         border: var(--iconbutton-secondary-border-width) solid var(--iconbutton-secondary-border);
         border-radius: var(--iconbutton-secondary-radius);
         @include themed-padding(--iconbutton-secondary-padding);

         &:hover:not(:disabled),
         &.force-hover:not(:disabled) {
            background: var(--iconbutton-secondary-hover-surface);
            border-color: var(--iconbutton-secondary-hover-border);
            color: var(--iconbutton-secondary-hover-icon);
         }

         &:disabled {
            background: var(--iconbutton-secondary-disabled-surface);
            border-color: var(--iconbutton-secondary-disabled-border);
            color: var(--iconbutton-secondary-disabled-icon);
         }
      }

      &.outline {
         --iconbutton-icon-size: var(--iconbutton-outline-icon-size);
         background: var(--iconbutton-outline-surface);
         color: var(--iconbutton-outline-icon);
         border: var(--iconbutton-outline-border-width) solid var(--iconbutton-outline-border);
         border-radius: var(--iconbutton-outline-radius);
         @include themed-padding(--iconbutton-outline-padding);

         &:hover:not(:disabled),
         &.force-hover:not(:disabled) {
            background: var(--iconbutton-outline-hover-surface);
            border-color: var(--iconbutton-outline-hover-border);
            color: var(--iconbutton-outline-hover-icon);
         }

         &:active:not(:disabled) {
            background: var(--iconbutton-outline-active-surface);
         }

         &:disabled {
            background: var(--iconbutton-outline-disabled-surface);
            border-color: var(--iconbutton-outline-disabled-border);
            color: var(--iconbutton-outline-disabled-icon);
         }
      }

      &.success {
         --iconbutton-icon-size: var(--iconbutton-success-icon-size);
         background: var(--iconbutton-success-surface);
         color: var(--iconbutton-success-icon);
         border: var(--iconbutton-success-border-width) solid var(--iconbutton-success-border);
         border-radius: var(--iconbutton-success-radius);
         @include themed-padding(--iconbutton-success-padding);

         &:hover:not(:disabled),
         &.force-hover:not(:disabled) {
            background: var(--iconbutton-success-hover-surface);
            border-color: var(--iconbutton-success-hover-border);
            color: var(--iconbutton-success-hover-icon);
         }

         &:disabled {
            background: var(--iconbutton-success-disabled-surface);
            border-color: var(--iconbutton-success-disabled-border);
            color: var(--iconbutton-success-disabled-icon);
         }
      }

      &.danger {
         --iconbutton-icon-size: var(--iconbutton-danger-icon-size);
         background: var(--iconbutton-danger-surface);
         color: var(--iconbutton-danger-icon);
         border: var(--iconbutton-danger-border-width) solid var(--iconbutton-danger-border);
         border-radius: var(--iconbutton-danger-radius);
         @include themed-padding(--iconbutton-danger-padding);

         &:hover:not(:disabled),
         &.force-hover:not(:disabled) {
            background: var(--iconbutton-danger-hover-surface);
            border-color: var(--iconbutton-danger-hover-border);
            color: var(--iconbutton-danger-hover-icon);
         }

         &:disabled {
            background: var(--iconbutton-danger-disabled-surface);
            border-color: var(--iconbutton-danger-disabled-border);
            color: var(--iconbutton-danger-disabled-icon);
         }
      }

      &.warning {
         --iconbutton-icon-size: var(--iconbutton-warning-icon-size);
         background: var(--iconbutton-warning-surface);
         color: var(--iconbutton-warning-icon);
         border: var(--iconbutton-warning-border-width) solid var(--iconbutton-warning-border);
         border-radius: var(--iconbutton-warning-radius);
         @include themed-padding(--iconbutton-warning-padding);

         &:hover:not(:disabled),
         &.force-hover:not(:disabled) {
            background: var(--iconbutton-warning-hover-surface);
            border-color: var(--iconbutton-warning-hover-border);
            color: var(--iconbutton-warning-hover-icon);
         }

         &:disabled {
            background: var(--iconbutton-warning-disabled-surface);
            border-color: var(--iconbutton-warning-disabled-border);
            color: var(--iconbutton-warning-disabled-icon);
         }
      }

      &.small {
         @include themed-padding(--iconbutton-small-padding);
      }

      &.small :global(i) {
         font-size: var(--iconbutton-small-icon-size);
      }

      :global(i) {
         font-size: var(--iconbutton-icon-size, var(--icon-size-md));
         line-height: 1;
      }
   }
</style>
