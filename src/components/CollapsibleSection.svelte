<script lang="ts">
   import { createEventDispatcher } from 'svelte';

   // Props
   export let label: string;
   export let expanded: boolean = false;
   export let href: string | undefined = undefined;
   export let active: boolean = false;
   let className: string = '';
   export { className as class };

   const dispatch = createEventDispatcher<{
      toggle: void;
   }>();

   function handleHeaderClick(e: MouseEvent) {
      if (href && active) {
         e.preventDefault();
         dispatch('toggle');
      }
   }
</script>

{#if href}
   <a {href} class="section-header {className}" class:expanded class:active on:click={handleHeaderClick}>
      <div class="section-toggle">
         <i class="fas fa-chevron-right toggle-icon"></i>
         <span class="section-label">{label}</span>
      </div>
      <slot name="summary" />
   </a>
{:else}
   <!-- svelte-ignore a11y-click-events-have-key-events a11y-no-noninteractive-element-interactions -->
   <div class="section-header {className}" class:expanded on:click={() => dispatch('toggle')}>
      <div class="section-toggle">
         <i class="fas fa-chevron-right toggle-icon"></i>
         <span class="section-label">{label}</span>
      </div>
      <slot name="summary" />
   </div>
{/if}

<style lang="scss">
   :global(:root) {
      /* Default */
      --collapsiblesection-default-surface: var(--surface-canvas);
      --collapsiblesection-default-border: var(--color-primary-400);
      --collapsiblesection-default-border-width: var(--border-width-thick);
      --collapsiblesection-default-radius: var(--radius-none);
      --collapsiblesection-default-padding: var(--space-4);
      --collapsiblesection-default-label: var(--text-primary);
      --collapsiblesection-default-label-font-family: var(--font-sans);
      --collapsiblesection-default-label-font-size: var(--font-size-md);
      --collapsiblesection-default-label-font-weight: var(--font-weight-normal);
      --collapsiblesection-default-label-line-height: var(--line-height-normal);
      --collapsiblesection-default-icon: var(--text-muted);
      --collapsiblesection-default-icon-size: var(--font-size-xs);

      /* Hover */
      --collapsiblesection-hover-surface: var(--surface-canvas);
      --collapsiblesection-hover-border: var(--color-primary-400);
      --collapsiblesection-hover-border-width: var(--border-width-thick);
      --collapsiblesection-hover-radius: var(--radius-none);
      --collapsiblesection-hover-padding: var(--space-4);
      --collapsiblesection-hover-label: var(--text-primary);
      --collapsiblesection-hover-label-font-family: var(--font-sans);
      --collapsiblesection-hover-label-font-size: var(--font-size-md);
      --collapsiblesection-hover-label-font-weight: var(--font-weight-normal);
      --collapsiblesection-hover-label-line-height: var(--line-height-normal);
      --collapsiblesection-hover-icon: var(--text-muted);
      --collapsiblesection-hover-icon-size: var(--font-size-xs);

      /* Active */
      --collapsiblesection-active-surface: var(--surface-canvas-low);
      --collapsiblesection-active-border: var(--color-primary-400);
      --collapsiblesection-active-border-width: var(--border-width-thick);
      --collapsiblesection-active-radius: var(--radius-none);
      --collapsiblesection-active-padding: var(--space-4);
      --collapsiblesection-active-label: var(--text-primary);
      --collapsiblesection-active-label-font-family: var(--font-sans);
      --collapsiblesection-active-label-font-size: var(--font-size-md);
      --collapsiblesection-active-label-font-weight: var(--font-weight-normal);
      --collapsiblesection-active-label-line-height: var(--line-height-normal);
      --collapsiblesection-active-icon: var(--text-muted);
      --collapsiblesection-active-icon-size: var(--font-size-xs);
   }

   .section-header {
      display: flex;
      align-items: center;
      gap: var(--space-12);
      padding: var(--collapsiblesection-default-padding) calc(var(--collapsiblesection-default-padding) * 2);
      background: var(--collapsiblesection-default-surface);
      border-left: var(--collapsiblesection-default-border-width) solid transparent;
      border-radius: var(--collapsiblesection-default-radius);
      cursor: pointer;
      text-decoration: none;
      color: inherit;
      transition: all var(--transition-fast);

      &:hover,
      &.force-hover {
         background: var(--collapsiblesection-hover-surface);
         padding: var(--collapsiblesection-hover-padding) calc(var(--collapsiblesection-hover-padding) * 2);
         border-left-width: var(--collapsiblesection-hover-border-width);
         border-radius: var(--collapsiblesection-hover-radius);

         .section-label {
            color: var(--collapsiblesection-hover-label);
            font-family: var(--collapsiblesection-hover-label-font-family);
            font-size: var(--collapsiblesection-hover-label-font-size);
            font-weight: var(--collapsiblesection-hover-label-font-weight);
            line-height: var(--collapsiblesection-hover-label-line-height);
         }

         .toggle-icon {
            color: var(--collapsiblesection-hover-icon);
            font-size: var(--collapsiblesection-hover-icon-size);
         }
      }

      &.expanded .toggle-icon {
         transform: rotate(90deg);
      }

      &.active {
         background: var(--collapsiblesection-active-surface);
         padding: var(--collapsiblesection-active-padding) calc(var(--collapsiblesection-active-padding) * 2);
         border-left: var(--collapsiblesection-active-border-width) solid var(--collapsiblesection-active-border);
         border-radius: var(--collapsiblesection-active-radius);

         .section-label {
            color: var(--collapsiblesection-active-label);
            font-family: var(--collapsiblesection-active-label-font-family);
            font-size: var(--collapsiblesection-active-label-font-size);
            font-weight: var(--collapsiblesection-active-label-font-weight);
            line-height: var(--collapsiblesection-active-label-line-height);
         }

         .toggle-icon {
            color: var(--collapsiblesection-active-icon);
            font-size: var(--collapsiblesection-active-icon-size);
         }
      }
   }

   .section-toggle {
      display: flex;
      align-items: center;
      gap: var(--space-8);
      flex-shrink: 0;

      .section-label {
         color: var(--collapsiblesection-default-label);
         font-family: var(--collapsiblesection-default-label-font-family);
         font-size: var(--collapsiblesection-default-label-font-size);
         font-weight: var(--collapsiblesection-default-label-font-weight);
         line-height: var(--collapsiblesection-default-label-line-height);
      }

      .toggle-icon {
         font-size: var(--collapsiblesection-default-icon-size);
         color: var(--collapsiblesection-default-icon);
         transition: transform var(--transition-fast);
      }
   }
</style>
