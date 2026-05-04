<script lang="ts">
   import { createEventDispatcher } from 'svelte';
   import Button from './Button.svelte';

   export let title: string;
   export let description: string;
   export let variant: 'info' | 'warning' | 'danger' | 'success' = 'info';
   export let size: 'normal' | 'compact' = 'normal';
   export let icon: string = '';
   export let dismissible: boolean = false;
   export let emphasis: boolean = false;

   // Action button props
   export let actionText: string = '';
   export let actionIcon: string = '';
   export let onAction: (() => void) | undefined = undefined;
   export let actionInline: boolean = false;
   export let actionHeader: boolean = false;

   // Body-row action button slots, ordered left then right. Each is shown when
   // its variant is non-null; null hides that slot.
   type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'success' | 'danger' | 'warning';
   export let actionRightVariant: ButtonVariant | null = null;
   export let actionRightLabel: string = 'Confirm';
   export let onActionRight: (() => void) | undefined = undefined;
   export let actionLeftVariant: ButtonVariant | null = null;
   export let actionLeftLabel: string = 'Cancel';
   export let onActionLeft: (() => void) | undefined = undefined;

   const dispatch = createEventDispatcher();

   // Default icons based on variant
   const defaultIcons = {
      info: 'fas fa-info-circle',
      warning: 'fas fa-exclamation-triangle',
      danger: 'fas fa-times-circle',
      success: 'fas fa-check-circle'
   };

   $: displayIcon = icon || defaultIcons[variant];

   function handleDismiss() {
      dispatch('dismiss');
   }
</script>

<div class="notification" class:info={variant === 'info'} class:warning={variant === 'warning'} class:danger={variant === 'danger'} class:success={variant === 'success'} class:emphasis={emphasis} class:compact={size === 'compact'}>
   <div class="notification-header" class:has-action={actionHeader && onAction}>
      <i class={displayIcon}></i>
      <span class="notification-title">{title}</span>
      {#if actionHeader && onAction}
         <div class="action-button-backdrop">
            <Button variant="outline" icon={actionIcon} on:click={onAction}>
               {actionText}
            </Button>
         </div>
      {/if}
      {#if dismissible}
         <button class="notification-close" on:click={handleDismiss} type="button" aria-label="Dismiss">
            <i class="fas fa-times"></i>
         </button>
      {/if}
   </div>
   {#if (description && !actionInline) || actionRightVariant || actionLeftVariant}
      <div class="notification-body">
         {#if description && !actionInline}
            <div class="notification-description">{description}</div>
         {/if}
         {#if actionRightVariant || actionLeftVariant}
            <div class="notification-body-actions">
               {#if actionLeftVariant}
                  <Button variant={actionLeftVariant} on:click={onActionLeft}>
                     {actionLeftLabel}
                  </Button>
               {/if}
               {#if actionRightVariant}
                  <Button variant={actionRightVariant} on:click={onActionRight}>
                     {actionRightLabel}
                  </Button>
               {/if}
            </div>
         {/if}
      </div>
   {/if}
   <slot />
   {#if onAction && !actionHeader}
      {#if actionInline}
         <div class="notification-actions-inline">
            {#if description}
               <span class="description-text">{description}</span>
            {/if}
            <Button variant="outline" icon={actionIcon} on:click={onAction}>
               {actionText}
            </Button>
         </div>
      {:else}
         <div class="notification-actions">
            <Button variant="outline" icon={actionIcon} on:click={onAction}>
               {actionText}
            </Button>
         </div>
      {/if}
   {/if}
</div>

<style lang="scss">
   // The four-variant token block below is intentionally NOT collapsed via SCSS
   // `@each`. The Layer-2 token-discovery parser (`extractGlobalRootBody` in
   // src/lib/parsers/globalRootBlock.ts) reads the `.svelte` source verbatim and
   // does not pre-compile SCSS — wrapping these declarations in `@each` would
   // make the editor's alias picker / file-manager UI see zero tokens for
   // Notification, even though the rendered DOM would be unchanged. The
   // declarations are kept flat by design so the parser can scrape them.
   :global(:root) {
      /* Info */
      --notification-info-surface: var(--surface-info);
      --notification-info-border: var(--border-info);
      --notification-info-border-width: var(--border-width-thin);
      --notification-info-radius: var(--radius-md);
      --notification-info-padding: var(--space-12);
      --notification-info-icon: var(--text-info);
      --notification-info-icon-size: var(--font-size-md);
      --notification-info-title: var(--text-info);
      --notification-info-title-font-family: var(--font-sans);
      --notification-info-title-font-size: var(--font-size-lg);
      --notification-info-title-font-weight: var(--font-weight-normal);
      --notification-info-title-line-height: var(--line-height-snug);
      --notification-info-text: var(--text-primary);
      --notification-info-text-font-family: var(--font-sans);
      --notification-info-text-font-size: var(--font-size-md);
      --notification-info-text-font-weight: var(--font-weight-extralight);
      --notification-info-text-line-height: var(--line-height-normal);

      /* Success */
      --notification-success-surface: var(--surface-success);
      --notification-success-border: var(--border-success);
      --notification-success-border-width: var(--border-width-thin);
      --notification-success-radius: var(--radius-md);
      --notification-success-padding: var(--space-12);
      --notification-success-icon: var(--text-success);
      --notification-success-icon-size: var(--font-size-md);
      --notification-success-title: var(--text-success);
      --notification-success-title-font-family: var(--font-sans);
      --notification-success-title-font-size: var(--font-size-lg);
      --notification-success-title-font-weight: var(--font-weight-normal);
      --notification-success-title-line-height: var(--line-height-snug);
      --notification-success-text: var(--text-primary);
      --notification-success-text-font-family: var(--font-sans);
      --notification-success-text-font-size: var(--font-size-md);
      --notification-success-text-font-weight: var(--font-weight-extralight);
      --notification-success-text-line-height: var(--line-height-normal);

      /* Warning */
      --notification-warning-surface: var(--surface-warning);
      --notification-warning-border: var(--border-warning);
      --notification-warning-border-width: var(--border-width-thin);
      --notification-warning-radius: var(--radius-md);
      --notification-warning-padding: var(--space-12);
      --notification-warning-icon: var(--text-warning);
      --notification-warning-icon-size: var(--font-size-md);
      --notification-warning-title: var(--text-warning);
      --notification-warning-title-font-family: var(--font-sans);
      --notification-warning-title-font-size: var(--font-size-lg);
      --notification-warning-title-font-weight: var(--font-weight-normal);
      --notification-warning-title-line-height: var(--line-height-snug);
      --notification-warning-text: var(--text-primary);
      --notification-warning-text-font-family: var(--font-sans);
      --notification-warning-text-font-size: var(--font-size-md);
      --notification-warning-text-font-weight: var(--font-weight-extralight);
      --notification-warning-text-line-height: var(--line-height-normal);

      /* Danger */
      --notification-danger-surface: var(--surface-danger);
      --notification-danger-border: var(--border-danger);
      --notification-danger-border-width: var(--border-width-thin);
      --notification-danger-radius: var(--radius-md);
      --notification-danger-padding: var(--space-12);
      --notification-danger-icon: var(--text-danger);
      --notification-danger-icon-size: var(--font-size-md);
      --notification-danger-title: var(--text-danger);
      --notification-danger-title-font-family: var(--font-sans);
      --notification-danger-title-font-size: var(--font-size-lg);
      --notification-danger-title-font-weight: var(--font-weight-normal);
      --notification-danger-title-line-height: var(--line-height-snug);
      --notification-danger-text: var(--text-primary);
      --notification-danger-text-font-family: var(--font-sans);
      --notification-danger-text-font-size: var(--font-size-md);
      --notification-danger-text-font-weight: var(--font-weight-extralight);
      --notification-danger-text-line-height: var(--line-height-normal);
   }

   .notification {
      display: flex;
      flex-direction: column;
      align-items: flex-start;
      width: 100%;
      gap: 0;
      transition: all var(--transition-fast);
      position: relative;
      text-align: left;
      overflow: hidden;

      &.emphasis {
         border-left-width: 0.375rem;
      }

      &.compact {
         font-size: var(--font-size-sm);

         .notification-description,
         .notification-actions-inline,
         .notification-actions {
            font-size: var(--font-size-sm);
         }
      }

      // Variant rules (info / warning / danger / success) only differ by token prefix.
      @each $variant in (info, warning, danger, success) {
         &.#{$variant} {
            border: var(--notification-#{$variant}-border-width) solid var(--notification-#{$variant}-border);
            border-radius: var(--notification-#{$variant}-radius);
            color: var(--notification-#{$variant}-text);
            font-family: var(--notification-#{$variant}-text-font-family);
            font-size: var(--notification-#{$variant}-text-font-size);
            font-weight: var(--notification-#{$variant}-text-font-weight);
            line-height: var(--notification-#{$variant}-text-line-height);

            .notification-header {
               background: var(--notification-#{$variant}-surface);
               padding: var(--notification-#{$variant}-padding) calc(var(--notification-#{$variant}-padding) * 1.33);

               i {
                  color: var(--notification-#{$variant}-icon);
                  font-size: var(--notification-#{$variant}-icon-size);
               }

               .notification-title {
                  color: var(--notification-#{$variant}-title);
                  font-family: var(--notification-#{$variant}-title-font-family);
                  font-size: var(--notification-#{$variant}-title-font-size);
                  font-weight: var(--notification-#{$variant}-title-font-weight);
                  line-height: var(--notification-#{$variant}-title-line-height);
               }
            }
         }
      }
   }

   .notification-header {
      display: flex;
      align-items: center;
      justify-content: flex-start;
      gap: var(--space-8);
      width: 100%;
      box-sizing: border-box;
      position: relative;

      // When action button is in header, add spacing
      &.has-action {
         gap: var(--space-12);
      }

      i {
         flex-shrink: 0;
      }

      .notification-title {
         text-align: left;
         flex: 1;
      }

      .action-button-backdrop {
         flex-shrink: 0;
         background: var(--surface-neutral-lowest);
         border-radius: var(--radius-md);
      }

      .notification-close {
         flex-shrink: 0;
         margin-left: auto;
         padding: 0;
         background: none;
         border: none;
         cursor: pointer;
         color: inherit;
         font-size: inherit;
         line-height: 1;
         transition: color var(--transition-base);

         &:hover {
            color: var(--text-primary);
         }

         &:focus {
            outline: var(--border-width-default) solid currentColor;
            outline-offset: var(--space-2);
         }
      }
   }

   // Body row: description (col 1) + optional action buttons (col 2, right-aligned).
   .notification-body {
      display: flex;
      align-items: center;
      gap: var(--space-16);
      padding: var(--space-12) var(--space-16);
      width: 100%;
      box-sizing: border-box;
      text-align: left;
   }

   .notification-description {
      flex: 1;
   }

   .notification-body-actions {
      display: flex;
      gap: var(--space-8);
      margin-left: auto;
      flex-shrink: 0;
   }

   // Action buttons - inline variant
   .notification-actions-inline {
      display: flex;
      align-items: center;
      gap: var(--space-16);
      padding: var(--space-12) var(--space-16);

      .description-text {
         flex: 1;
      }

      // Button stays on the right (doesn't shrink or grow)
      :global(button) {
         flex-shrink: 0;
         margin-left: auto;
      }
   }

   // Action buttons - standard (below description)
   .notification-actions {
      display: flex;
      gap: var(--space-8);
      padding: var(--space-12) var(--space-16);
      padding-top: var(--space-8);
      border-top: var(--border-width-thin) solid var(--border-neutral-subtle);
   }

</style>
