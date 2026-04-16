<script lang="ts">
  import SectionDivider from '../../components/SectionDivider.svelte';
  import TokenMap from '../TokenMap.svelte';

  const dividerVariants: { variant: 'bg' | 'neutral' | 'alternate' | 'primary' | 'accent' | 'special'; label: string }[] = [
    { variant: 'bg', label: 'Background' },
    { variant: 'neutral', label: 'Neutral' },
    { variant: 'alternate', label: 'Alternate' },
    { variant: 'primary', label: 'Primary' },
    { variant: 'accent', label: 'Accent' },
    { variant: 'special', label: 'Special' },
  ];
</script>

<div class="demo-block">
  <h2 class="component-title">Section Divider Component</h2>
  <p class="demo-description">
    Full-width section banner with display font and palette variants. Import from <code>components/SectionDivider.svelte</code>
  </p>

  <div class="demo-section">
    <h3 class="demo-subtitle">Variants</h3>
    <div class="divider-showcase">
      {#each dividerVariants as item}
        <div class="divider-showcase-item">
          <SectionDivider title={item.label} variant={item.variant} />
          <span class="variant-label">variant="{item.variant}" &nbsp; surface-{item.variant}-highest → surface-{item.variant}</span>
        </div>
      {/each}
    </div>
  </div>

  <div class="demo-section">
    <h3 class="demo-subtitle">With Description</h3>
    <div class="divider-showcase">
      <SectionDivider
        title="Community Modules"
        variant="bg"
        description="These modules were created by other authors and are no longer actively maintained."
      />
    </div>
  </div>

  <div class="demo-section">
    <h3 class="demo-subtitle">Tokens (bg variant)</h3>
    <TokenMap tokens={[
      { label: 'Gradient High', variable: '--surface-bg-highest' },
      { label: 'Gradient Mid', variable: '--surface-bg-higher' },
      { label: 'Gradient Low', variable: '--surface-bg-high' },
      { label: 'Gradient Base', variable: '--surface-bg' },
      { label: 'Text Stroke', variable: '--surface-bg-lowest' },
    ]} />
  </div>
</div>

<style>
  @import '../../styles/variables.css';

  .divider-showcase {
    display: flex;
    flex-direction: column;
  }

  .divider-showcase-item {
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    width: 100%;
  }

  .variant-label {
    font-size: var(--font-xs);
    color: var(--ui-text-tertiary);
    font-family: var(--ui-font-mono);
    background: var(--ui-surface-lowest);
    padding: var(--space-2) var(--space-6);
    border-radius: var(--radius-sm);
  }
</style>
