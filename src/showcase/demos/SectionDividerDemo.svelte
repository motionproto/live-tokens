<script lang="ts">
  import SectionDivider from '../../components/SectionDivider.svelte';
  import VariantGroup from '../VariantGroup.svelte';

  const targetFile = 'src/components/SectionDivider.svelte';

  type Token = { label: string; variable: string };

  const variantTokens: Record<string, Token[]> = {
    bg: [
      { label: 'gradient high color', variable: '--section-divider-bg-gradient-high' },
      { label: 'gradient mid color', variable: '--section-divider-bg-gradient-mid' },
      { label: 'gradient low color', variable: '--section-divider-bg-gradient-low' },
      { label: 'gradient base color', variable: '--section-divider-bg-gradient-base' },
      { label: 'text stroke color', variable: '--section-divider-bg-text-stroke' },
      { label: 'radius', variable: '--section-divider-bg-radius' },
    ],
    neutral: [
      { label: 'gradient high color', variable: '--section-divider-neutral-gradient-high' },
      { label: 'gradient mid color', variable: '--section-divider-neutral-gradient-mid' },
      { label: 'gradient low color', variable: '--section-divider-neutral-gradient-low' },
      { label: 'gradient base color', variable: '--section-divider-neutral-gradient-base' },
      { label: 'text stroke color', variable: '--section-divider-neutral-text-stroke' },
      { label: 'radius', variable: '--section-divider-neutral-radius' },
    ],
    alternate: [
      { label: 'gradient high color', variable: '--section-divider-alternate-gradient-high' },
      { label: 'gradient mid color', variable: '--section-divider-alternate-gradient-mid' },
      { label: 'gradient low color', variable: '--section-divider-alternate-gradient-low' },
      { label: 'gradient base color', variable: '--section-divider-alternate-gradient-base' },
      { label: 'text stroke color', variable: '--section-divider-alternate-text-stroke' },
      { label: 'radius', variable: '--section-divider-alternate-radius' },
    ],
    primary: [
      { label: 'gradient high color', variable: '--section-divider-primary-gradient-high' },
      { label: 'gradient mid color', variable: '--section-divider-primary-gradient-mid' },
      { label: 'gradient low color', variable: '--section-divider-primary-gradient-low' },
      { label: 'gradient base color', variable: '--section-divider-primary-gradient-base' },
      { label: 'text stroke color', variable: '--section-divider-primary-text-stroke' },
      { label: 'radius', variable: '--section-divider-primary-radius' },
    ],
    accent: [
      { label: 'gradient high color', variable: '--section-divider-accent-gradient-high' },
      { label: 'gradient mid color', variable: '--section-divider-accent-gradient-mid' },
      { label: 'gradient low color', variable: '--section-divider-accent-gradient-low' },
      { label: 'gradient base color', variable: '--section-divider-accent-gradient-base' },
      { label: 'text stroke color', variable: '--section-divider-accent-text-stroke' },
      { label: 'radius', variable: '--section-divider-accent-radius' },
    ],
    special: [
      { label: 'gradient high color', variable: '--section-divider-special-gradient-high' },
      { label: 'gradient mid color', variable: '--section-divider-special-gradient-mid' },
      { label: 'gradient low color', variable: '--section-divider-special-gradient-low' },
      { label: 'gradient base color', variable: '--section-divider-special-gradient-base' },
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
  <h2 class="component-title">Section Divider Component</h2>
  <p class="demo-description">
    Full-width section banner with display font and palette variants. Import from <code>components/SectionDivider.svelte</code>
  </p>

  {#each variants as v}
    <VariantGroup name={v.key} title={v.title} tokens={variantTokens[v.key]} {targetFile}>
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
