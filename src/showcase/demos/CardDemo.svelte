<script lang="ts">
  import Card from '../../components/Card.svelte';
  import VariantGroup from '../VariantGroup.svelte';
  import DemoHeader from '../DemoHeader.svelte';

  const targetFile = 'src/components/Card.svelte';
  const component = 'card';

  type Token = { label: string; variable: string };

  const cardStates: Record<string, Token[]> = {
    default: [
      { label: 'surface color', variable: '--card-default-surface' },
      { label: 'border color', variable: '--card-default-border' },
      { label: 'title color', variable: '--card-default-title' },
      { label: 'body color', variable: '--card-default-body' },
      { label: 'radius', variable: '--card-default-radius' },
    ],
    hover: [
      { label: 'surface color', variable: '--card-hover-surface' },
      { label: 'border color', variable: '--card-hover-border' },
      { label: 'title color', variable: '--card-hover-title' },
      { label: 'body color', variable: '--card-hover-body' },
      { label: 'radius', variable: '--card-hover-radius' },
    ],
  };
</script>

<div class="demo-block">
  <DemoHeader
    {component}
    title="Card Component"
    description="Generic card with icon, title, and slotted body. Import from <code>components/Card.svelte</code>"
  />

  <VariantGroup name="card" title="Card" states={cardStates} {targetFile} {component} let:activeState>
    {@const forceClass = activeState === 'hover' ? 'force-hover' : ''}
    <div class="card-demo-grid">
      <Card icon="fas fa-star" iconColor="var(--text-accent)" title="Featured" class={forceClass}>
        <p style="margin: 0;">A highlighted card with amber accent.</p>
      </Card>
      <Card icon="fas fa-shield-alt" iconColor="var(--text-info)" title="Security" class={forceClass}>
        <p style="margin: 0;">Card with blue icon color on hover border.</p>
      </Card>
      <Card icon="fas fa-leaf" iconColor="var(--text-success)" title="Compact" size="compact" class={forceClass}>
        <p style="margin: 0;">A compact-sized card variant.</p>
      </Card>
      <Card title="No Icon" class={forceClass}>
        <p style="margin: 0;">Cards work without icons too.</p>
      </Card>
    </div>
  </VariantGroup>
</div>

<style>
  .card-demo-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
    gap: var(--space-16);
  }
</style>
