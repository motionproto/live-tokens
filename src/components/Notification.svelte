<script lang="ts">
   import { createEventDispatcher } from 'svelte';
   import Button from './Button.svelte';

   export let title: string;
   export let description: string;
   export let impact: string = '';
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
   export let actionHeader: boolean = false; // NEW: Show action button in header row

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
   {#if description && !actionInline}
      <div class="notification-description">{description}</div>
   {/if}
   {#if impact}
      <div class="notification-impact">{impact}</div>
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
   :global(:root) {
      /* Info */
      --notification-info-surface: var(--surface-info);
      --notification-info-border: var(--border-info);
      --notification-info-icon: var(--text-info);
      --notification-info-title: var(--text-info);
      --notification-info-title-font-family: var(--font-sans);
      --notification-info-title-font-weight: var(--font-weight-normal);
      --notification-info-text: var(--text-primary);
      --notification-info-radius: var(--radius-md);

      /* Success */
      --notification-success-surface: var(--surface-success);
      --notification-success-border: var(--border-success);
      --notification-success-icon: var(--text-success);
      --notification-success-title: var(--text-success);
      --notification-success-title-font-family: var(--font-sans);
      --notification-success-title-font-weight: var(--font-weight-normal);
      --notification-success-text: var(--text-primary);
      --notification-success-radius: var(--radius-md);

      /* Warning */
      --notification-warning-surface: var(--surface-warning);
      --notification-warning-border: var(--border-warning);
      --notification-warning-icon: var(--text-warning);
      --notification-warning-title: var(--text-warning);
      --notification-warning-title-font-family: var(--font-sans);
      --notification-warning-title-font-weight: var(--font-weight-normal);
      --notification-warning-text: var(--text-primary);
      --notification-warning-radius: var(--radius-md);

      /* Danger */
      --notification-danger-surface: var(--surface-danger);
      --notification-danger-border: var(--border-danger);
      --notification-danger-icon: var(--text-danger);
      --notification-danger-title: var(--text-danger);
      --notification-danger-title-font-family: var(--font-sans);
      --notification-danger-title-font-weight: var(--font-weight-normal);
      --notification-danger-text: var(--text-primary);
      --notification-danger-radius: var(--radius-md);
   }

   .notification {
      display: flex;
      flex-direction: column;
      align-items: flex-start;
      width: 100%;
      gap: 0;
      font-size: var(--font-size-md);
      border: var(--border-width-thin) solid;
      transition: all var(--transition-fast);
      position: relative;
      text-align: left;
      overflow: hidden;

      &.emphasis {
         border-left-width: 0.375rem;
      }

      &.compact {
         font-size: var(--font-size-sm);

         .notification-header {
            padding: var(--space-6) var(--space-12);

            i {
               font-size: var(--font-size-sm);
            }

            .notification-title {
               font-size: var(--font-size-md);
            }
         }

         .notification-description {
            font-size: var(--font-size-sm);
            padding: var(--space-8) var(--space-12);
         }

         .notification-impact {
            font-size: var(--font-size-sm);
            padding: var(--space-8) var(--space-12);
         }

         .notification-actions-inline {
            padding: var(--space-8) var(--space-12);

            .description-text {
               font-size: var(--font-size-sm);
            }
         }

         .notification-actions {
            padding: var(--space-8) var(--space-12);
         }
      }

      // Info variant (blue)
      &.info {
         border-color: var(--notification-info-border);
         border-radius: var(--notification-info-radius);
         color: var(--notification-info-text);

         .notification-header {
            background: var(--notification-info-surface);

            i {
               color: var(--notification-info-icon);
            }

            .notification-title {
               color: var(--notification-info-title);
               font-family: var(--notification-info-title-font-family);
               font-weight: var(--notification-info-title-font-weight);
            }
         }
      }

      // Warning variant (orange)
      &.warning {
         border-color: var(--notification-warning-border);
         border-radius: var(--notification-warning-radius);
         color: var(--notification-warning-text);

         .notification-header {
            background: var(--notification-warning-surface);

            i {
               color: var(--notification-warning-icon);
            }

            .notification-title {
               color: var(--notification-warning-title);
               font-family: var(--notification-warning-title-font-family);
               font-weight: var(--notification-warning-title-font-weight);
            }
         }
      }

      // Danger variant (red)
      &.danger {
         border-color: var(--notification-danger-border);
         border-radius: var(--notification-danger-radius);
         color: var(--notification-danger-text);

         .notification-header {
            background: var(--notification-danger-surface);

            i {
               color: var(--notification-danger-icon);
            }

            .notification-title {
               color: var(--notification-danger-title);
               font-family: var(--notification-danger-title-font-family);
               font-weight: var(--notification-danger-title-font-weight);
            }
         }
      }

      // Success variant (green)
      &.success {
         border-color: var(--notification-success-border);
         border-radius: var(--notification-success-radius);
         color: var(--notification-success-text);

         .notification-header {
            background: var(--notification-success-surface);

            i {
               color: var(--notification-success-icon);
            }

            .notification-title {
               color: var(--notification-success-title);
               font-family: var(--notification-success-title-font-family);
               font-weight: var(--notification-success-title-font-weight);
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
      padding: var(--space-8) var(--space-16);
      position: relative;

      // When action button is in header, add spacing
      &.has-action {
         gap: var(--space-12);
      }

      i {
         font-size: var(--font-size-md);
         flex-shrink: 0;
      }

      .notification-title {
         font-size: var(--font-size-lg);
         text-align: left;
         flex: 1;
      }

      .action-button-backdrop {
         flex-shrink: 0;
         background: var(--surface-neutral-lowest);
         border-radius: var(--radius-md);
      }

      .notification-close {
         position: absolute;
         top: 50%;
         right: var(--space-8);
         transform: translateY(-50%);
         background: none;
         border: none;
         cursor: pointer;
         padding: var(--space-4);
         display: flex;
         align-items: center;
         justify-content: center;
         opacity: 0.7;
         transition: opacity var(--transition-fast);

         i {
            font-size: var(--font-size-sm);
            color: inherit;
         }

         &:hover {
            opacity: 1;
         }

         &:focus {
            outline: var(--border-width-default) solid currentColor;
            outline-offset: var(--space-2);
            border-radius: var(--radius-sm);
         }
      }
   }

   .notification-description {
      line-height: var(--line-height-normal);
      font-size: var(--font-size-md);
      font-weight: var(--font-weight-extralight);
      text-align: left;
      padding: var(--space-12) var(--space-16);
   }

   .notification-impact {
      font-weight: var(--font-weight-semibold);
      padding: var(--space-8) var(--space-16);
      padding-bottom: var(--space-12);
      margin-top: 0;
      border-top: var(--border-width-thin) solid var(--border-neutral-subtle);
      font-size: var(--font-size-md);
      text-align: left;
      width: 100%;
   }

   // Action buttons - inline variant
   .notification-actions-inline {
      display: flex;
      align-items: center;
      gap: var(--space-16);
      padding: var(--space-12) var(--space-16);

      .description-text {
         flex: 1;
         line-height: var(--line-height-normal);
         font-size: var(--font-size-md);
         font-weight: var(--font-weight-extralight);
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
