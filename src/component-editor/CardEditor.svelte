<script lang="ts">
  import Card from '../components/Card.svelte';
  import VariantGroup from './scaffolding/VariantGroup.svelte';
  import SharedBlock from './scaffolding/SharedBlock.svelte';
  import ComponentEditorBase from './scaffolding/ComponentEditorBase.svelte';
  import { editorState, registerComponentSchema } from '../lib/editorStore';
  import { computeSharedBlock, withSharedDisabled } from './scaffolding/sharedBlock';
  const component = 'card';
  type Token = { label: string; variable: string; canBeShared?: boolean; groupKey?: string; hidden?: boolean };
  type TypeGroupConfig = {
    legend?: string;
    colorVariable: string;
    colorLabel?: string;
    familyVariable?: string;
    sizeVariable?: string;
    weightVariable?: string;
    lineHeightVariable?: string;
  };

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
  registerComponentSchema(component, [...Object.values(states).flat(), ...typeGroupTokens]);

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

  let highlightedVars = new Set<string>();
  function handleTokenHover(e: CustomEvent<{ variable: string | null }>) {
    const v = e.detail.variable;
    if (!v) {
      highlightedVars = new Set();
      return;
    }
    const group = shared.groups.find((g) => g.variables.includes(v));
    highlightedVars = group ? new Set(group.variables) : new Set();
  }

  $: visibleStates = Object.fromEntries(
    Object.entries(states).map(([name, list]) => [name, withSharedDisabled(list, shared.varSet)]),
  ) as Record<string, Token[]>;
  const allVariables = [
    ...Object.values(states).flatMap((list) => list.map((t) => t.variable)),
    ...typeGroupTokens.map((t) => t.variable),
  ];
</script>

<ComponentEditorBase {component} title="Card" description="Generic card with icon, title, and slotted body. Import from <code>components/Card.svelte</code>" resetVariables={allVariables}>
  <VariantGroup
    name="card"
    title="Card"
    states={visibleStates}
    {typeGroups}
    {component}
    {highlightedVars}
    sharedOrder={shared.sharedOrder}
    on:tokenhover={handleTokenHover}
    let:activeState
  >
    {@const forceClass = activeState === 'hover' ? 'force-hover' : ''}
    <div class="card-demo-grid">
      <Card icon="fas fa-star" iconColor="var(--text-accent)" title="Featured" class={forceClass}>
        <p style="margin: 0;">A highlighted card with amber accent.</p>
      </Card>
      <Card icon="fas fa-shield-alt" iconColor="var(--text-info)" title="Security" class={forceClass}>
        <p style="margin: 0;">Card with blue icon color on hover border.</p>
      </Card>
      <Card icon="fas fa-leaf" iconColor="var(--text-success)" title="Compact" size="compact" class={forceClass}>
        <p style="margin: 0;">A compact-sized card variant.</p>
      </Card>
      <Card title="No Icon" class={forceClass}>
        <p style="margin: 0;">Cards work without icons too.</p>
      </Card>
    </div>
  </VariantGroup>
  <SharedBlock {component} {shared} {highlightedVars} on:tokenhover={handleTokenHover} on:change />
</ComponentEditorBase>

<style>
  .card-demo-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
    gap: var(--space-16);
  }
</style>
