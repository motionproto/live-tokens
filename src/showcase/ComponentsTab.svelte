<script lang="ts" context="module">
  import type { ComponentType } from 'svelte';
  import ChoiceButtonsDemo from './demos/ChoiceButtonsDemo.svelte';
  import StandardButtonsDemo from './demos/StandardButtonsDemo.svelte';
  import NotificationDemo from './demos/NotificationDemo.svelte';
  import DialogDemo from './demos/DialogDemo.svelte';
  import RadioButtonDemo from './demos/RadioButtonDemo.svelte';
  import CardDemo from './demos/CardDemo.svelte';
  import BadgeDemo from './demos/BadgeDemo.svelte';
  import InlineEditActionsDemo from './demos/InlineEditActionsDemo.svelte';
  import SectionDividerDemo from './demos/SectionDividerDemo.svelte';
  import CollapsibleSectionDemo from './demos/CollapsibleSectionDemo.svelte';
  import TabBarDemo from './demos/TabBarDemo.svelte';
  import TooltipDemo from './demos/TooltipDemo.svelte';
  import ProgressBarDemo from './demos/ProgressBarDemo.svelte';

  export type ComponentSection = {
    id: string;
    label: string;
    component: ComponentType;
    props?: Record<string, unknown>;
  };

  export const defaultSections: ComponentSection[] = [
    { id: 'choiceButtons', label: 'Choice Sets', component: ChoiceButtonsDemo },
    { id: 'standardButtons', label: 'Button', component: StandardButtonsDemo },
    { id: 'notifications', label: 'Notification', component: NotificationDemo },
    { id: 'dialog', label: 'Dialog', component: DialogDemo },
    { id: 'radioButtons', label: 'Radio Button', component: RadioButtonDemo },
    { id: 'cards', label: 'Card', component: CardDemo },
    { id: 'traitBadges', label: 'Trait Badge', component: BadgeDemo },
    { id: 'inlineEdit', label: 'Inline Edit Actions', component: InlineEditActionsDemo },
    { id: 'sectionDivider', label: 'Section Divider', component: SectionDividerDemo },
    { id: 'collapsible', label: 'Collapsible Section', component: CollapsibleSectionDemo },
    { id: 'tabBar', label: 'Tab Bar', component: TabBarDemo },
    { id: 'tooltip', label: 'Tooltip', component: TooltipDemo },
    { id: 'progressBar', label: 'Progress Bar', component: ProgressBarDemo },
  ];
</script>

<script lang="ts">
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
  @import '../styles/variables.css';

  .components-container {
    display: flex;
    flex-direction: column;
    min-width: 0;
  }

  /* Shared demo chrome — used by every demo wrapper in ./demos/. */
  :global(.components-container .demo-block) {
    display: flex;
    flex-direction: column;
    gap: var(--space-16);
    min-width: 0;
  }

  :global(.components-container .component-title) {
    font-size: var(--font-xl);
    font-weight: var(--font-weight-semibold);
    color: var(--ui-text-primary);
    margin: 0;
    padding-bottom: var(--space-8);
    border-bottom: 1px solid var(--ui-border-subtle);
  }

  :global(.components-container .demo-description) {
    font-size: var(--font-sm);
    color: var(--ui-text-tertiary);
    margin: 0;
  }

  :global(.components-container .demo-description code) {
    font-size: var(--font-xs);
    color: var(--ui-text-accent);
    background: var(--ui-surface-lowest);
    padding: var(--space-2) var(--space-4);
    border-radius: var(--radius-sm);
    font-family: var(--ui-font-mono);
  }

  :global(.components-container .demo-section) {
    display: flex;
    flex-direction: column;
    gap: var(--space-8);
  }

  :global(.components-container .demo-subtitle) {
    font-size: var(--font-sm);
    font-weight: var(--font-weight-medium);
    color: var(--ui-text-secondary);
    margin: 0;
  }
</style>
