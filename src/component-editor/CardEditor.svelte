<script lang="ts">
  import Card from '../components/Card.svelte';
  import VariantGroup from './scaffolding/VariantGroup.svelte';
  import ComponentEditorBase from './scaffolding/ComponentEditorBase.svelte';
  import { editorState } from '../lib/editorStore';
  import { computeSharedBlock, withSharedDisabled } from './scaffolding/sharedBlock';
  import type { Token, TypeGroupConfig } from './scaffolding/types';
  const component = 'card';

  // The card is a single object across two states (default, hover).
  // Within each state we keep object shape props (surface/border/border-width/radius/padding/shadow) together.
  // Title and body are nested elements with their own typography.
  const states: Record<string, Token[]> = {
    default: [
      { label: 'surface color', variable: '--card-default-surface' },
      { label: 'border color', variable: '--card-default-border' },
      { label: 'border width', canBeShared: true, groupKey: 'card-border-width', variable: '--card-default-border-width' },
      { label: 'radius', canBeShared: true, groupKey: 'card-radius', variable: '--card-default-radius' },
      { label: 'padding', canBeShared: true, groupKey: 'card-padding', variable: '--card-default-padding' },
      { label: 'shadow', canBeShared: true, groupKey: 'card-shadow', variable: '--card-default-shadow' },
    ],
    hover: [
      { label: 'surface color', variable: '--card-hover-surface' },
      { label: 'border color', variable: '--card-hover-border' },
      { label: 'border width', canBeShared: true, groupKey: 'card-border-width', variable: '--card-hover-border-width' },
      { label: 'radius', canBeShared: true, groupKey: 'card-radius', variable: '--card-hover-radius' },
      { label: 'padding', canBeShared: true, groupKey: 'card-padding', variable: '--card-hover-padding' },
      { label: 'shadow', canBeShared: true, groupKey: 'card-shadow', variable: '--card-hover-shadow' },
    ],
  };

  // Two type groups per state: title and body. Linked across states (same nested object).
  const typeGroups: Record<string, TypeGroupConfig[]> = {
    default: [
      {
        legend: 'card title',
        colorVariable: '--card-default-title',
        familyVariable: '--card-default-title-font-family',
        sizeVariable: '--card-default-title-font-size',
        weightVariable: '--card-default-title-font-weight',
        lineHeightVariable: '--card-default-title-line-height',
      },
      {
        legend: 'card body',
        colorVariable: '--card-default-body',
        familyVariable: '--card-default-body-font-family',
        sizeVariable: '--card-default-body-font-size',
        weightVariable: '--card-default-body-font-weight',
        lineHeightVariable: '--card-default-body-line-height',
      },
    ],
    hover: [
      {
        legend: 'card title',
        colorVariable: '--card-hover-title',
        familyVariable: '--card-hover-title-font-family',
        sizeVariable: '--card-hover-title-font-size',
        weightVariable: '--card-hover-title-font-weight',
        lineHeightVariable: '--card-hover-title-line-height',
      },
      {
        legend: 'card body',
        colorVariable: '--card-hover-body',
        familyVariable: '--card-hover-body-font-family',
        sizeVariable: '--card-hover-body-font-size',
        weightVariable: '--card-hover-body-font-weight',
        lineHeightVariable: '--card-hover-body-line-height',
      },
    ],
  };

  // Title type tokens (linked across states, but title and body are different objects so they don't link to each other).
  const typeGroupTokens: Token[] = [
    { label: 'font family', canBeShared: true, groupKey: 'card-title-font-family', variable: '--card-default-title-font-family' },
    { label: 'font family', canBeShared: true, groupKey: 'card-title-font-family', variable: '--card-hover-title-font-family' },
    { label: 'font size', canBeShared: true, groupKey: 'card-title-font-size', variable: '--card-default-title-font-size' },
    { label: 'font size', canBeShared: true, groupKey: 'card-title-font-size', variable: '--card-hover-title-font-size' },
    { label: 'font weight', canBeShared: true, groupKey: 'card-title-font-weight', variable: '--card-default-title-font-weight' },
    { label: 'font weight', canBeShared: true, groupKey: 'card-title-font-weight', variable: '--card-hover-title-font-weight' },
    { label: 'line height', canBeShared: true, groupKey: 'card-title-line-height', variable: '--card-default-title-line-height' },
    { label: 'line height', canBeShared: true, groupKey: 'card-title-line-height', variable: '--card-hover-title-line-height' },
    { label: 'font family', canBeShared: true, groupKey: 'card-body-font-family', variable: '--card-default-body-font-family' },
    { label: 'font family', canBeShared: true, groupKey: 'card-body-font-family', variable: '--card-hover-body-font-family' },
    { label: 'font size', canBeShared: true, groupKey: 'card-body-font-size', variable: '--card-default-body-font-size' },
    { label: 'font size', canBeShared: true, groupKey: 'card-body-font-size', variable: '--card-hover-body-font-size' },
    { label: 'font weight', canBeShared: true, groupKey: 'card-body-font-weight', variable: '--card-default-body-font-weight' },
    { label: 'font weight', canBeShared: true, groupKey: 'card-body-font-weight', variable: '--card-hover-body-font-weight' },
    { label: 'line height', canBeShared: true, groupKey: 'card-body-line-height', variable: '--card-default-body-line-height' },
    { label: 'line height', canBeShared: true, groupKey: 'card-body-line-height', variable: '--card-hover-body-line-height' },
  ];
  // Cross-state shared block — present each linkable property from the default state.
  const shareableContexts = new Map<string, string>([
    ['--card-default-border-width', 'card'],
    ['--card-default-radius', 'card'],
    ['--card-default-padding', 'card'],
    ['--card-default-shadow', 'card'],
    ['--card-default-title-font-family', 'title'],
    ['--card-default-title-font-size', 'title'],
    ['--card-default-title-font-weight', 'title'],
    ['--card-default-title-line-height', 'title'],
    ['--card-default-body-font-family', 'body'],
    ['--card-default-body-font-size', 'body'],
    ['--card-default-body-font-weight', 'body'],
    ['--card-default-body-line-height', 'body'],
  ]);
  const allTokens = [...Object.values(states).flat(), ...typeGroupTokens];

  $: shared = computeSharedBlock(component, shareableContexts, allTokens, $editorState);

  $: visibleStates = Object.fromEntries(
    Object.entries(states).map(([name, list]) => [name, withSharedDisabled(list, shared.varSet)]),
  ) as Record<string, Token[]>;

  let hoverEnabled = true;
</script>

<ComponentEditorBase {component} title="Card" description="Generic card with icon, title, and slotted body. Import from <code>components/Card.svelte</code>" tokens={allTokens} {shared}>
  <svelte:fragment slot="config">
    <label>
      <input type="checkbox" bind:checked={hoverEnabled} />
      <span>Hover events</span>
    </label>
  </svelte:fragment>
  <VariantGroup
    name="card"
    title="Card"
    states={visibleStates}
    {typeGroups}
    {component}
    let:activeState
  >
    {@const previewClass = activeState === 'hover' ? 'force-hover' : (hoverEnabled ? '' : 'no-hover')}
    <div class="card-demo">
      <Card icon="fas fa-star" title="Card title" class={previewClass}>
        <p style="margin: 0;">Slotted body content. Hover the card (or switch the editor to the Hover state) to preview hover styling.</p>
      </Card>
    </div>
  </VariantGroup>
</ComponentEditorBase>

<style>
  .card-demo {
    max-width: 28rem;
  }
</style>
