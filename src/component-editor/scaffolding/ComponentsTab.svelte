<script lang="ts">
  import type { ComponentSection } from './componentSectionType';
  import { defaultSections } from './defaultSections';

  export let sections: ComponentSection[] = defaultSections;
  export let selectedComponent: string = sections[0]?.id ?? '';
</script>

<div class="components-container">
  {#each sections as section (section.id)}
    {#if selectedComponent === section.id}
      <svelte:component this={section.component} {...(section.props ?? {})} />
    {/if}
  {/each}
</div>

<style>
  .components-container {
    display: flex;
    flex-direction: column;
    min-width: 0;
  }

  /* Shared editor chrome — used by every per-component editor in ../. */
  :global(.components-container .demo-block) {
    display: flex;
    flex-direction: column;
    gap: var(--ui-space-16);
    min-width: 0;
    padding-bottom: 20rem;
  }

  :global(.components-container .component-title) {
    font-size: var(--ui-font-xl);
    font-weight: var(--ui-font-weight-semibold);
    color: var(--ui-text-primary);
    margin: 0;
    padding-bottom: var(--ui-space-8);
    border-bottom: 1px solid var(--ui-border-subtle);
  }

  :global(.components-container .demo-description) {
    font-size: var(--ui-font-sm);
    color: var(--ui-text-tertiary);
    margin: 0;
  }

  :global(.components-container .demo-description code) {
    font-size: var(--ui-font-xs);
    color: var(--ui-text-accent);
    background: var(--ui-surface-lowest);
    padding: var(--ui-space-2) var(--ui-space-4);
    border-radius: var(--ui-radius-sm);
    font-family: var(--ui-font-mono);
  }

  :global(.components-container .demo-section) {
    display: flex;
    flex-direction: column;
    gap: var(--ui-space-8);
  }

  :global(.components-container .demo-subtitle) {
    font-size: var(--ui-font-sm);
    font-weight: var(--ui-font-weight-medium);
    color: var(--ui-text-secondary);
    margin: 0;
  }
</style>
