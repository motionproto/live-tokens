<script lang="ts">
  import SectionDivider from '../components/SectionDivider.svelte';
  import VariantGroup from './scaffolding/VariantGroup.svelte';
  import ComponentEditorBase from './scaffolding/ComponentEditorBase.svelte';

  const component = 'sectiondivider';

  type Token = { label: string; variable: string; canBeShared?: boolean };

  const variantTokens: Record<string, Token[]> = {
    canvas: [
      { label: 'gradient stop 1', variable: '--sectiondivider-canvas-gradient-stop-1' },
      { label: 'gradient stop 2', variable: '--sectiondivider-canvas-gradient-stop-2' },
      { label: 'gradient stop 3', variable: '--sectiondivider-canvas-gradient-stop-3' },
      { label: 'gradient stop 4', variable: '--sectiondivider-canvas-gradient-stop-4' },
      { label: 'text stroke color', variable: '--sectiondivider-canvas-text-stroke' },
      { label: 'radius', canBeShared: true, variable: '--sectiondivider-canvas-radius' },
    ],
    neutral: [
      { label: 'gradient stop 1', variable: '--sectiondivider-neutral-gradient-stop-1' },
      { label: 'gradient stop 2', variable: '--sectiondivider-neutral-gradient-stop-2' },
      { label: 'gradient stop 3', variable: '--sectiondivider-neutral-gradient-stop-3' },
      { label: 'gradient stop 4', variable: '--sectiondivider-neutral-gradient-stop-4' },
      { label: 'text stroke color', variable: '--sectiondivider-neutral-text-stroke' },
      { label: 'radius', canBeShared: true, variable: '--sectiondivider-neutral-radius' },
    ],
    alternate: [
      { label: 'gradient stop 1', variable: '--sectiondivider-alternate-gradient-stop-1' },
      { label: 'gradient stop 2', variable: '--sectiondivider-alternate-gradient-stop-2' },
      { label: 'gradient stop 3', variable: '--sectiondivider-alternate-gradient-stop-3' },
      { label: 'gradient stop 4', variable: '--sectiondivider-alternate-gradient-stop-4' },
      { label: 'text stroke color', variable: '--sectiondivider-alternate-text-stroke' },
      { label: 'radius', canBeShared: true, variable: '--sectiondivider-alternate-radius' },
    ],
    primary: [
      { label: 'gradient stop 1', variable: '--sectiondivider-primary-gradient-stop-1' },
      { label: 'gradient stop 2', variable: '--sectiondivider-primary-gradient-stop-2' },
      { label: 'gradient stop 3', variable: '--sectiondivider-primary-gradient-stop-3' },
      { label: 'gradient stop 4', variable: '--sectiondivider-primary-gradient-stop-4' },
      { label: 'text stroke color', variable: '--sectiondivider-primary-text-stroke' },
      { label: 'radius', canBeShared: true, variable: '--sectiondivider-primary-radius' },
    ],
    accent: [
      { label: 'gradient stop 1', variable: '--sectiondivider-accent-gradient-stop-1' },
      { label: 'gradient stop 2', variable: '--sectiondivider-accent-gradient-stop-2' },
      { label: 'gradient stop 3', variable: '--sectiondivider-accent-gradient-stop-3' },
      { label: 'gradient stop 4', variable: '--sectiondivider-accent-gradient-stop-4' },
      { label: 'text stroke color', variable: '--sectiondivider-accent-text-stroke' },
      { label: 'radius', canBeShared: true, variable: '--sectiondivider-accent-radius' },
    ],
    special: [
      { label: 'gradient stop 1', variable: '--sectiondivider-special-gradient-stop-1' },
      { label: 'gradient stop 2', variable: '--sectiondivider-special-gradient-stop-2' },
      { label: 'gradient stop 3', variable: '--sectiondivider-special-gradient-stop-3' },
      { label: 'gradient stop 4', variable: '--sectiondivider-special-gradient-stop-4' },
      { label: 'text stroke color', variable: '--sectiondivider-special-text-stroke' },
      { label: 'radius', canBeShared: true, variable: '--sectiondivider-special-radius' },
    ],
  };

  type Variant = 'canvas' | 'neutral' | 'alternate' | 'primary' | 'accent' | 'special';

  const variants: { key: Variant; title: string }[] = [
    { key: 'canvas', title: 'Background' },
    { key: 'neutral', title: 'Neutral' },
    { key: 'alternate', title: 'Alternate' },
    { key: 'primary', title: 'Primary' },
    { key: 'accent', title: 'Accent' },
    { key: 'special', title: 'Special' },
  ];

  const descriptionText =
    'These modules were created by other authors and are no longer actively maintained.';

  let showDescription: Record<Variant, boolean> = {
    canvas: false,
    neutral: false,
    alternate: false,
    primary: false,
    accent: false,
    special: false,
  };
</script>

<ComponentEditorBase {component} title="Section Divider Component" description="Full-width section banner with display font and palette variants. Import from <code>components/SectionDivider.svelte</code>" let:targetFile>
  {#each variants as v}
    <VariantGroup name={v.key} title={v.title} tokens={variantTokens[v.key]} {targetFile} {component}>
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
