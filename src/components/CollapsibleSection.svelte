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
      --collapsiblesection-default-label: var(--text-primary);
      --collapsiblesection-default-icon: var(--text-muted);
      --collapsiblesection-default-border: var(--color-primary-400);
      --collapsiblesection-default-radius: var(--radius-md);

      /* Hover */
      --collapsiblesection-hover-surface: var(--surface-canvas);
      --collapsiblesection-hover-label: var(--text-primary);
      --collapsiblesection-hover-icon: var(--text-muted);
      --collapsiblesection-hover-border: var(--color-primary-400);
      --collapsiblesection-hover-radius: var(--radius-md);

      /* Active */
      --collapsiblesection-active-surface: var(--surface-canvas-low);
      --collapsiblesection-active-label: var(--text-primary);
      --collapsiblesection-active-icon: var(--text-muted);
      --collapsiblesection-active-border: var(--color-primary-400);
      --collapsiblesection-active-radius: var(--radius-md);
   }

   .section-header {
      display: flex;
      align-items: center;
      gap: var(--space-12);
      padding: var(--space-4) var(--space-8);
      border-left: 3px solid transparent;
      cursor: pointer;
      text-decoration: none;
      color: inherit;
      transition: all var(--transition-fast);

      &:hover,
      &.force-hover {
         background: var(--collapsiblesection-hover-surface);

         .section-label {
            color: var(--collapsiblesection-hover-label);
         }

         .toggle-icon {
            color: var(--collapsiblesection-hover-icon);
         }
      }

      &.expanded .toggle-icon {
         transform: rotate(90deg);
      }

      &.active {
         background: var(--collapsiblesection-active-surface);
         border-left-color: var(--collapsiblesection-active-border);

         .section-label {
            color: var(--collapsiblesection-active-label);
         }

         .toggle-icon {
            color: var(--collapsiblesection-active-icon);
         }
      }
   }

   .section-toggle {
      display: flex;
      align-items: center;
      gap: var(--space-8);
      flex-shrink: 0;
      font-size: var(--font-size-md);
      font-weight: var(--font-weight-normal);

      .section-label {
         color: var(--collapsiblesection-default-label);
      }

      .toggle-icon {
         font-size: var(--font-size-xs);
         color: var(--collapsiblesection-default-icon);
         transition: transform 0.15s ease;
      }
   }
</style>
