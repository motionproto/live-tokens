<script lang="ts">
  import SectionDivider from '../components/SectionDivider.svelte';
  import VariantGroup from './scaffolding/VariantGroup.svelte';
  import ComponentEditorBase from './scaffolding/ComponentEditorBase.svelte';
  import type { Token, TypeGroupConfig } from './scaffolding/types';
  const component = 'sectiondivider';

  // Component-level (shared across all variants): typography + padding.
  const sharedStates: Record<string, Token[]> = {
    component: [
      { label: 'padding', variable: '--sectiondivider-padding' },
    ],
  };

  const sharedTypeGroups: Record<string, TypeGroupConfig[]> = {
    component: [
      {
        legend: 'title',
        colorVariable: '--sectiondivider-title',
        familyVariable: '--sectiondivider-title-font-family',
        sizeVariable: '--sectiondivider-title-font-size',
        weightVariable: '--sectiondivider-title-font-weight',
        lineHeightVariable: '--sectiondivider-title-line-height',
      },
      {
        legend: 'description',
        colorVariable: '--sectiondivider-description',
        familyVariable: '--sectiondivider-description-font-family',
        sizeVariable: '--sectiondivider-description-font-size',
        weightVariable: '--sectiondivider-description-font-weight',
        lineHeightVariable: '--sectiondivider-description-line-height',
      },
    ],
  };
  const sharedTypeTokens: Token[] = [
    { label: 'font family', variable: '--sectiondivider-title-font-family' },
    { label: 'font size', variable: '--sectiondivider-title-font-size' },
    { label: 'font weight', variable: '--sectiondivider-title-font-weight' },
    { label: 'line height', variable: '--sectiondivider-title-line-height' },
    { label: 'font family', variable: '--sectiondivider-description-font-family' },
    { label: 'font size', variable: '--sectiondivider-description-font-size' },
    { label: 'font weight', variable: '--sectiondivider-description-font-weight' },
    { label: 'line height', variable: '--sectiondivider-description-line-height' },
  ];
  type Variant = 'canvas' | 'neutral' | 'alternate' | 'primary' | 'accent' | 'special';
  const variants: { key: Variant; title: string }[] = [
    { key: 'canvas', title: 'Background' },
    { key: 'neutral', title: 'Neutral' },
    { key: 'alternate', title: 'Alternate' },
    { key: 'primary', title: 'Primary' },
    { key: 'accent', title: 'Accent' },
    { key: 'special', title: 'Special' },
  ];
  function variantTokens(v: Variant): Token[] {
    return [
      { label: 'gradient stop 1', variable: `--sectiondivider-${v}-gradient-stop-1` },
      { label: 'gradient stop 2', variable: `--sectiondivider-${v}-gradient-stop-2` },
      { label: 'gradient stop 3', variable: `--sectiondivider-${v}-gradient-stop-3` },
      { label: 'gradient stop 4', variable: `--sectiondivider-${v}-gradient-stop-4` },
      { label: 'text stroke color', variable: `--sectiondivider-${v}-text-stroke` },
      { label: 'corner radius', variable: `--sectiondivider-${v}-radius` },
    ];
  }
  const allTokens: Token[] = [
    ...Object.values(sharedStates).flat(),
    ...sharedTypeTokens,
    ...variants.flatMap((v) => variantTokens(v.key)),
  ];
  const descriptionText = 'These modules were created by other authors and are no longer actively maintained.';

  let showDescription: Record<Variant, boolean> = {
    canvas: false,
    neutral: false,
    alternate: false,
    primary: false,
    accent: false,
    special: false,
  };
</script>

<ComponentEditorBase {component} title="Section Divider" description="Full-width section banner with display font and palette variants. Import from <code>components/SectionDivider.svelte</code>" tokens={allTokens}>
  <VariantGroup
    name="component"
    title="Component-level"
    states={sharedStates}
    typeGroups={sharedTypeGroups}
    {component}
  >
    <SectionDivider title="Section Title" description={descriptionText} variant="canvas" />
  </VariantGroup>
  {#each variants as v}
    <VariantGroup name={v.key} title={v.title} states={{ [v.key]: variantTokens(v.key) }} {component}>
      <label class="description-toggle">
        <input type="checkbox" bind:checked={showDescription[v.key]} />
        <span>Show description</span>
      </label>
      <SectionDivider
        title={v.title}
        variant={v.key}
        description={showDescription[v.key] ? descriptionText : undefined}
      />
    </VariantGroup>
  {/each}
</ComponentEditorBase>

<style>
  .description-toggle {
    display: inline-flex;
    align-items: center;
    gap: var(--ui-space-6);
    font-size: var(--ui-font-size-xs);
    color: var(--ui-text-secondary);
    cursor: pointer;
    user-select: none;
    align-self: flex-start;
  }

  .description-toggle input {
    margin: 0;
    cursor: pointer;
  }
</style>
