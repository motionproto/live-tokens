<script lang="ts">
  import Badge from '../../components/Badge.svelte';
  import VariantGroup from '../VariantGroup.svelte';
  import DemoHeader from '../DemoHeader.svelte';

  const targetFile = 'src/components/Badge.svelte';
  const component = 'badge';

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
  <DemoHeader
    {component}
    title="Badge Component"
    description="Pill-shaped badges with variant support. Import from <code>components/Badge.svelte</code>"
  />

  <VariantGroup name="info" title="Info" tokens={variantTokens.info} {targetFile} {component}>
    <div class="badge-showcase-grid">
      <Badge variant="info">info</Badge>
      <Badge variant="info" icon="fa-solid fa-dice-d20">With Icon</Badge>
    </div>
  </VariantGroup>

  <VariantGroup name="accent" title="Accent" tokens={variantTokens.accent} {targetFile} {component}>
    <div class="badge-showcase-grid">
      <Badge variant="accent">scenes</Badge>
    </div>
  </VariantGroup>

  <VariantGroup name="trait" title="Trait" tokens={variantTokens.trait} {targetFile} {component}>
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
