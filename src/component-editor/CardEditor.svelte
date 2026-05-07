<script context="module" lang="ts">
  import { buildTypeGroupColorTokens } from './scaffolding/buildTypeGroupTokens';
  import type { Token, TypeGroupConfig } from './scaffolding/types';

  export const component = 'card';

  // The card is a single object across two states (default, hover).
  // Within each state we keep object shape props (surface/border/border-width/radius/padding/shadow) together.
  // Title and body are nested elements with their own typography.
  const states: Record<string, Token[]> = {
    default: [
      { label: 'surface color', variable: '--card-default-surface' },
      { label: 'header color', variable: '--card-default-header-surface' },
      { label: 'border color', variable: '--card-default-border' },
      { label: 'border width', canBeLinked: true, groupKey: 'border-width', variable: '--card-default-border-width' },
      { label: 'corner radius', canBeLinked: true, groupKey: 'radius', variable: '--card-default-radius' },
      { label: 'header padding', canBeLinked: true, groupKey: 'header-padding', variable: '--card-default-header-padding' },
      { label: 'body padding', canBeLinked: true, groupKey: 'body-padding', variable: '--card-default-body-padding' },
      { label: 'card shadow', canBeLinked: true, groupKey: 'shadow', variable: '--card-default-shadow' },
      { label: 'background blur', canBeLinked: true, groupKey: 'blur', variable: '--card-default-blur' },
    ],
    hover: [
      { label: 'surface color', variable: '--card-hover-surface' },
      { label: 'header color', variable: '--card-hover-header-surface' },
      { label: 'border color', variable: '--card-hover-border' },
      { label: 'border width', canBeLinked: true, groupKey: 'border-width', variable: '--card-hover-border-width' },
      { label: 'corner radius', canBeLinked: true, groupKey: 'radius', variable: '--card-hover-radius' },
      { label: 'header padding', canBeLinked: true, groupKey: 'header-padding', variable: '--card-hover-header-padding' },
      { label: 'body padding', canBeLinked: true, groupKey: 'body-padding', variable: '--card-hover-body-padding' },
      { label: 'card shadow', canBeLinked: true, groupKey: 'shadow', variable: '--card-hover-shadow' },
      { label: 'background blur', canBeLinked: true, groupKey: 'blur', variable: '--card-hover-blur' },
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
    { label: 'font family', canBeLinked: true, groupKey: 'title-font-family', variable: '--card-default-title-font-family' },
    { label: 'font family', canBeLinked: true, groupKey: 'title-font-family', variable: '--card-hover-title-font-family' },
    { label: 'font size', canBeLinked: true, groupKey: 'title-font-size', variable: '--card-default-title-font-size' },
    { label: 'font size', canBeLinked: true, groupKey: 'title-font-size', variable: '--card-hover-title-font-size' },
    { label: 'font weight', canBeLinked: true, groupKey: 'title-font-weight', variable: '--card-default-title-font-weight' },
    { label: 'font weight', canBeLinked: true, groupKey: 'title-font-weight', variable: '--card-hover-title-font-weight' },
    { label: 'line height', canBeLinked: true, groupKey: 'title-line-height', variable: '--card-default-title-line-height' },
    { label: 'line height', canBeLinked: true, groupKey: 'title-line-height', variable: '--card-hover-title-line-height' },
    { label: 'font family', canBeLinked: true, groupKey: 'body-font-family', variable: '--card-default-body-font-family' },
    { label: 'font family', canBeLinked: true, groupKey: 'body-font-family', variable: '--card-hover-body-font-family' },
    { label: 'font size', canBeLinked: true, groupKey: 'body-font-size', variable: '--card-default-body-font-size' },
    { label: 'font size', canBeLinked: true, groupKey: 'body-font-size', variable: '--card-hover-body-font-size' },
    { label: 'font weight', canBeLinked: true, groupKey: 'body-font-weight', variable: '--card-default-body-font-weight' },
    { label: 'font weight', canBeLinked: true, groupKey: 'body-font-weight', variable: '--card-hover-body-font-weight' },
    { label: 'line height', canBeLinked: true, groupKey: 'body-line-height', variable: '--card-default-body-line-height' },
    { label: 'line height', canBeLinked: true, groupKey: 'body-line-height', variable: '--card-hover-body-line-height' },
  ];
  // Cross-state linked block — present each linkable property from the default state.
  const linkableContexts = new Map<string, string>([
    ['--card-default-border-width', 'card'],
    ['--card-default-radius', 'card'],
    ['--card-default-header-padding', 'card'],
    ['--card-default-body-padding', 'card'],
    ['--card-default-shadow', 'card'],
    ['--card-default-blur', 'card'],
    ['--card-default-title-font-family', 'title'],
    ['--card-default-title-font-size', 'title'],
    ['--card-default-title-font-weight', 'title'],
    ['--card-default-title-line-height', 'title'],
    ['--card-default-body-font-family', 'body'],
    ['--card-default-body-font-size', 'body'],
    ['--card-default-body-font-weight', 'body'],
    ['--card-default-body-line-height', 'body'],
  ]);
  export const allTokens: Token[] = [
    ...Object.values(states).flat(),
    ...buildTypeGroupColorTokens(typeGroups),
    ...typeGroupTokens,
  ];
</script>

<script lang="ts">
  import Card from '../components/Card.svelte';
  import VariantGroup from './scaffolding/VariantGroup.svelte';
  import ComponentEditorBase from './scaffolding/ComponentEditorBase.svelte';
  import { editorState } from '../lib/editorStore';
  import { computeLinkedBlock, withLinkedDisabled } from './scaffolding/linkedBlock';
  import ShadowBackdrop from './scaffolding/ShadowBackdrop.svelte';
  import ShadowBackdropControls from './scaffolding/ShadowBackdropControls.svelte';

  $: linked = computeLinkedBlock(component, linkableContexts, allTokens, $editorState);

  $: visibleStates = Object.fromEntries(
    Object.entries(states).map(([name, list]) => [name, withLinkedDisabled(list, linked.varSet)]),
  ) as Record<string, Token[]>;

  let hoverEnabled = true;
  let bgMode: 'image' | 'color' = 'image';
  const bgVar = '--backdrop-card-surface';
</script>

<ComponentEditorBase {component} title="Card" description="Generic card with icon, title, and slotted body. Import from <code>components/Card.svelte</code>" tokens={allTokens} {linked} tabbable>
  <svelte:fragment slot="config">
    <ShadowBackdropControls bind:mode={bgMode} colorVariable={bgVar} />
  </svelte:fragment>
  <VariantGroup
    name="card"
    title="Card"
    states={visibleStates}
    {typeGroups}
    {component}
    let:activeState
  >
    <svelte:fragment slot="state-actions" let:stateName>
      {#if stateName === 'hover'}
        <label class="hover-enable">
          <input type="checkbox" bind:checked={hoverEnabled} />
          <span>Use hover</span>
        </label>
      {/if}
    </svelte:fragment>
    {@const previewClass = activeState === 'hover' ? 'force-hover' : (hoverEnabled ? '' : 'no-hover')}
    <ShadowBackdrop mode={bgMode} colorVariable={bgVar}>
      <div class="card-demo">
        <Card title="Card title" class={previewClass}>
          <p style="margin: 0;">Slotted body content. Hover the card (or switch the editor to the Hover state) to preview hover styling.</p>
        </Card>
      </div>
    </ShadowBackdrop>
  </VariantGroup>
</ComponentEditorBase>

<style>
  .card-demo {
    max-width: 28rem;
  }
  .hover-enable {
    display: inline-flex;
    align-items: center;
    gap: var(--ui-space-4);
    font-size: var(--ui-font-size-sm);
    color: var(--ui-text-secondary);
    cursor: pointer;
  }
</style>
