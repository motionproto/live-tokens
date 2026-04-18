<script lang="ts">
  import SectionDivider from '../../components/SectionDivider.svelte';
  import VariantGroup from '../VariantGroup.svelte';
  import DemoHeader from '../DemoHeader.svelte';

  const targetFile = 'src/components/SectionDivider.svelte';
  const component = 'sectiondivider';

  type Token = { label: string; variable: string };

  const variantTokens: Record<string, Token[]> = {
    bg: [
      { label: 'gradient stop 1', variable: '--section-divider-bg-gradient-stop-1' },
      { label: 'gradient stop 2', variable: '--section-divider-bg-gradient-stop-2' },
      { label: 'gradient stop 3', variable: '--section-divider-bg-gradient-stop-3' },
      { label: 'gradient stop 4', variable: '--section-divider-bg-gradient-stop-4' },
      { label: 'text stroke color', variable: '--section-divider-bg-text-stroke' },
      { label: 'radius', variable: '--section-divider-bg-radius' },
    ],
    neutral: [
      { label: 'gradient stop 1', variable: '--section-divider-neutral-gradient-stop-1' },
      { label: 'gradient stop 2', variable: '--section-divider-neutral-gradient-stop-2' },
      { label: 'gradient stop 3', variable: '--section-divider-neutral-gradient-stop-3' },
      { label: 'gradient stop 4', variable: '--section-divider-neutral-gradient-stop-4' },
      { label: 'text stroke color', variable: '--section-divider-neutral-text-stroke' },
      { label: 'radius', variable: '--section-divider-neutral-radius' },
    ],
    alternate: [
      { label: 'gradient stop 1', variable: '--section-divider-alternate-gradient-stop-1' },
      { label: 'gradient stop 2', variable: '--section-divider-alternate-gradient-stop-2' },
      { label: 'gradient stop 3', variable: '--section-divider-alternate-gradient-stop-3' },
      { label: 'gradient stop 4', variable: '--section-divider-alternate-gradient-stop-4' },
      { label: 'text stroke color', variable: '--section-divider-alternate-text-stroke' },
      { label: 'radius', variable: '--section-divider-alternate-radius' },
    ],
    primary: [
      { label: 'gradient stop 1', variable: '--section-divider-primary-gradient-stop-1' },
      { label: 'gradient stop 2', variable: '--section-divider-primary-gradient-stop-2' },
      { label: 'gradient stop 3', variable: '--section-divider-primary-gradient-stop-3' },
      { label: 'gradient stop 4', variable: '--section-divider-primary-gradient-stop-4' },
      { label: 'text stroke color', variable: '--section-divider-primary-text-stroke' },
      { label: 'radius', variable: '--section-divider-primary-radius' },
    ],
    accent: [
      { label: 'gradient stop 1', variable: '--section-divider-accent-gradient-stop-1' },
      { label: 'gradient stop 2', variable: '--section-divider-accent-gradient-stop-2' },
      { label: 'gradient stop 3', variable: '--section-divider-accent-gradient-stop-3' },
      { label: 'gradient stop 4', variable: '--section-divider-accent-gradient-stop-4' },
      { label: 'text stroke color', variable: '--section-divider-accent-text-stroke' },
      { label: 'radius', variable: '--section-divider-accent-radius' },
    ],
    special: [
      { label: 'gradient stop 1', variable: '--section-divider-special-gradient-stop-1' },
      { label: 'gradient stop 2', variable: '--section-divider-special-gradient-stop-2' },
      { label: 'gradient stop 3', variable: '--section-divider-special-gradient-stop-3' },
      { label: 'gradient stop 4', variable: '--section-divider-special-gradient-stop-4' },
      { label: 'text stroke color', variable: '--section-divider-special-text-stroke' },
      { label: 'radius', variable: '--section-divider-special-radius' },
    ],
  };

  type Variant = 'bg' | 'neutral' | 'alternate' | 'primary' | 'accent' | 'special';

  const variants: { key: Variant; title: string }[] = [
    { key: 'bg', title: 'Background' },
    { key: 'neutral', title: 'Neutral' },
    { key: 'alternate', title: 'Alternate' },
    { key: 'primary', title: 'Primary' },
    { key: 'accent', title: 'Accent' },
    { key: 'special', title: 'Special' },
  ];

  const descriptionText =
    'These modules were created by other authors and are no longer actively maintained.';

  let showDescription: Record<Variant, boolean> = {
    bg: false,
    neutral: false,
    alternate: false,
    primary: false,
    accent: false,
    special: false,
  };
</script>

<div class="demo-block">
  <DemoHeader
    {component}
    title="Section Divider Component"
    description="Full-width section banner with display font and palette variants. Import from <code>components/SectionDivider.svelte</code>"
  />

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
</div>

<style>
  .description-toggle {
    display: inline-flex;
    align-items: center;
    gap: var(--ui-space-6);
    font-size: var(--ui-font-xs);
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
