<script lang="ts">
  import Badge from '../../components/Badge.svelte';
  import VariantGroup from '../VariantGroup.svelte';

  const targetFile = 'src/components/Badge.svelte';

  type Token = { label: string; variable: string };

  const variantTokens: Record<string, Token[]> = {
    info: [
      { label: 'surface color', variable: '--badge-info-surface' },
      { label: 'text color', variable: '--badge-info-text' },
      { label: 'border color', variable: '--badge-info-border' },
      { label: 'radius', variable: '--badge-info-radius' },
    ],
    accent: [
      { label: 'surface color', variable: '--badge-accent-surface' },
      { label: 'text color', variable: '--badge-accent-text' },
      { label: 'border color', variable: '--badge-accent-border' },
      { label: 'radius', variable: '--badge-accent-radius' },
    ],
    trait: [
      { label: 'surface color', variable: '--badge-trait-surface' },
      { label: 'text color', variable: '--badge-trait-text' },
      { label: 'border color', variable: '--badge-trait-border' },
      { label: 'radius', variable: '--badge-trait-radius' },
    ],
  };
</script>

<div class="demo-block">
  <h2 class="component-title">Badge Component</h2>
  <p class="demo-description">
    Pill-shaped badges with variant support. Import from <code>components/Badge.svelte</code>
  </p>

  <VariantGroup name="info" title="Info" tokens={variantTokens.info} {targetFile}>
    <div class="badge-showcase-grid">
      <Badge variant="info">info</Badge>
      <Badge variant="info" icon="fa-solid fa-dice-d20">With Icon</Badge>
    </div>
  </VariantGroup>

  <VariantGroup name="accent" title="Accent" tokens={variantTokens.accent} {targetFile}>
    <div class="badge-showcase-grid">
      <Badge variant="accent">scenes</Badge>
    </div>
  </VariantGroup>

  <VariantGroup name="trait" title="Trait" tokens={variantTokens.trait} {targetFile}>
    <div class="badge-showcase-grid">
      <Badge variant="trait">arcane</Badge>
      <Badge variant="trait">divine</Badge>
      <Badge variant="trait">primal</Badge>
    </div>
  </VariantGroup>
</div>

<style>
  .badge-showcase-grid {
    display: flex;
    flex-wrap: wrap;
    gap: var(--space-8);
    align-items: center;
  }
</style>
