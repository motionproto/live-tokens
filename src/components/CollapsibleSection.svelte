<script lang="ts">
   import { createEventDispatcher } from 'svelte';

   // Props
   export let label: string;
   export let expanded: boolean = false;
   export let href: string | undefined = undefined;
   export let active: boolean = false;

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
   <a {href} class="section-header" class:expanded class:active on:click={handleHeaderClick}>
      <div class="section-toggle">
         <i class="fas fa-chevron-right toggle-icon"></i>
         <span class="section-label">{label}</span>
      </div>
      <slot name="summary" />
   </a>
{:else}
   <!-- svelte-ignore a11y-click-events-have-key-events a11y-no-noninteractive-element-interactions -->
   <div class="section-header" class:expanded on:click={() => dispatch('toggle')}>
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

      &:hover {
         background: var(--surface-bg);
      }

      &.expanded .toggle-icon {
         transform: rotate(90deg);
      }

      &.active {
         background: var(--surface-bg-low);
         border-left-color: var(--color-primary-400);
      }
   }

   .section-toggle {
      display: flex;
      align-items: center;
      gap: var(--space-8);
      flex-shrink: 0;
      color: var(--text-primary);
      font-size: var(--font-md);
      font-weight: var(--font-weight-semibold);

      .toggle-icon {
         font-size: var(--font-xs);
         color: var(--text-muted);
         transition: transform 0.15s ease;
      }
   }
</style>
