<script lang="ts">
  import Card from '../../components/Card.svelte';
  import TokenMap from '../TokenMap.svelte';
</script>

<div class="demo-block">
  <h2 class="component-title">Card Component</h2>
  <p class="demo-description">
    Generic card with icon, title, and slotted body. Import from <code>components/Card.svelte</code>
  </p>

  <div class="demo-section">
    <div class="card-demo-grid">
      <Card icon="fas fa-star" iconColor="var(--text-accent)" title="Featured">
        <p style="margin: 0;">A highlighted card with amber accent.</p>
      </Card>

      <Card icon="fas fa-shield-alt" iconColor="var(--text-info)" title="Security">
        <p style="margin: 0;">Card with blue icon color on hover border.</p>
      </Card>

      <Card icon="fas fa-leaf" iconColor="var(--text-success)" title="Compact" size="compact">
        <p style="margin: 0;">A compact-sized card variant.</p>
      </Card>

      <Card title="No Icon">
        <p style="margin: 0;">Cards work without icons too.</p>
      </Card>
    </div>
  </div>

  <div class="demo-section">
    <h3 class="demo-subtitle">Tokens</h3>
    <TokenMap tokens={[
      { label: 'Background', variable: '--surface-neutral-high' },
      { label: 'Border', variable: '--border-neutral-default' },
      { label: 'Hover Border', variable: '--border-neutral-strong' },
      { label: 'Title', variable: '--text-primary' },
      { label: 'Body', variable: '--text-secondary' },
    ]} />
  </div>
</div>

<style>
  .card-demo-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
    gap: var(--space-16);
  }
</style>
