<script lang="ts">
  import Badge from '../../components/Badge.svelte';
  import TokenMap from '../TokenMap.svelte';
</script>

<div class="demo-block">
  <h2 class="component-title">Badge Component</h2>
  <p class="demo-description">
    Pill-shaped badges with variant support. Import from <code>components/Badge.svelte</code>
  </p>

  <div class="demo-section">
    <div class="trait-demo-row">
      <Badge variant="trait">arcane</Badge>
      <Badge variant="trait">divine</Badge>
      <Badge variant="trait">primal</Badge>
      <Badge variant="accent">scenes</Badge>
      <Badge icon="fa-solid fa-dice-d20">System Agnostic</Badge>
    </div>
  </div>

  <div class="demo-section">
    <h3 class="demo-subtitle">Tokens</h3>
    <div class="token-sections">
      <TokenMap title="info" tokens={[
        { label: 'BG', variable: '--surface-neutral-higher' },
        { label: 'Border', variable: '--border-neutral-default' },
        { label: 'Text', variable: '--text-primary' },
      ]} />
      <TokenMap title="accent" tokens={[
        { label: 'BG', variable: '--surface-neutral-higher' },
        { label: 'Border', variable: '--border-accent' },
        { label: 'Text', variable: '--color-accent-300' },
      ]} />
      <TokenMap title="trait" tokens={[
        { label: 'BG', variable: '--surface-primary-high' },
        { label: 'Border', variable: '--border-primary-strong' },
        { label: 'Text', variable: '--text-primary' },
      ]} />
    </div>
  </div>
</div>

<style>
  .trait-demo-row {
    display: flex;
    gap: var(--space-8);
    flex-wrap: wrap;
  }

  .token-sections {
    display: flex;
    flex-direction: column;
    gap: var(--space-16);
  }
</style>
