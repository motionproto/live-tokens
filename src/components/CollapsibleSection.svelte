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
         background: var(--collapsible-hover-surface);

         .section-label {
            color: var(--collapsible-hover-label);
         }

         .toggle-icon {
            color: var(--collapsible-hover-icon);
         }
      }

      &.expanded .toggle-icon {
         transform: rotate(90deg);
      }

      &.active {
         background: var(--collapsible-active-surface);
         border-left-color: var(--collapsible-active-border);

         .section-label {
            color: var(--collapsible-active-label);
         }

         .toggle-icon {
            color: var(--collapsible-active-icon);
         }
      }
   }

   .section-toggle {
      display: flex;
      align-items: center;
      gap: var(--space-8);
      flex-shrink: 0;
      font-size: var(--font-md);
      font-weight: var(--font-weight-semibold);

      .section-label {
         color: var(--collapsible-default-label);
      }

      .toggle-icon {
         font-size: var(--font-xs);
         color: var(--collapsible-default-icon);
         transition: transform 0.15s ease;
      }
   }
</style>
