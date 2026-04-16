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
   .notification {
      display: flex;
      flex-direction: column;
      align-items: flex-start;
      width: 100%;
      gap: 0;
      border-radius: var(--radius-md);
      font-size: var(--font-md);
      border: 1px solid;
      transition: all var(--transition-fast);
      position: relative;
      text-align: left;
      overflow: hidden;

      &.emphasis {
         border-left-width: 0.375rem;
      }

      &.compact {
         font-size: var(--font-sm);

         .notification-header {
            padding: var(--space-6) var(--space-12);

            i {
               font-size: var(--font-sm);
            }

            .notification-title {
               font-size: var(--font-md);
            }
         }

         .notification-description {
            font-size: var(--font-sm);
            padding: var(--space-8) var(--space-12);
         }

         .notification-impact {
            font-size: var(--font-sm);
            padding: var(--space-8) var(--space-12);
         }

         .notification-actions-inline {
            padding: var(--space-8) var(--space-12);

            .description-text {
               font-size: var(--font-sm);
            }
         }

         .notification-actions {
            padding: var(--space-8) var(--space-12);
         }
      }

      // Info variant (blue)
      &.info {
         border-color: var(--border-info-darker);
         color: var(--text-primary);

         .notification-header {
            background: var(--surface-info-low);

            i {
               color: var(--text-info);
            }
         }
      }

      // Warning variant (orange)
      &.warning {
         border-color: var(--border-warning);
         color: var(--text-primary);

         .notification-header {
            background: var(--surface-warning);

            i {
               color: var(--text-warning);
            }
         }
      }

      // Danger variant (red)
      &.danger {
         border-color: var(--border-danger);
         color: var(--text-primary);

         .notification-header {
            background: var(--surface-primary);

            i {
               color: var(--text-danger);
            }
         }
      }

      // Success variant (green)
      &.success {
         border-color: var(--border-success);
         color: var(--text-primary);

         .notification-header {
            background: var(--surface-success);

            i {
               color: var(--text-success);
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
      padding: .5rem var(--space-16);
      position: relative;

      // When action button is in header, add spacing
      &.has-action {
         gap: var(--space-12);
      }

      i {
         font-size: var(--font-md);
         flex-shrink: 0;
      }

      .notification-title {
         font-weight: var(--font-weight-semibold);
         font-size: var(--font-lg);
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
         right: 0.5rem;
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
            font-size: var(--font-sm);
            color: inherit;
         }

         &:hover {
            opacity: 1;
         }

         &:focus {
            outline: 2px solid currentColor;
            outline-offset: 0.125rem;
            border-radius: var(--radius-sm);
         }
      }
   }

   .notification-description {
      line-height: 1.4;
      font-size: var(--font-md);
      font-weight: var(--font-weight-light);
      text-align: left;
      padding: .75rem var(--space-16);
   }

   .notification-impact {
      font-weight: var(--font-weight-bold);
      padding: var(--space-8) var(--space-16);
      padding-bottom: var(--space-12);
      margin-top: 0;
      border-top: 1px solid var(--border-neutral-subtle);
      font-size: var(--font-md);
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
         line-height: 1.4;
         font-size: var(--font-md);
         font-weight: var(--font-weight-light);
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
      border-top: 1px solid var(--border-neutral-subtle);
   }
</style>
