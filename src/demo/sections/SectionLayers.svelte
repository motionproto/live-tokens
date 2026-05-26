<script lang="ts">
  import Badge from '../../system/components/Badge.svelte';
  import Card from '../../system/components/Card.svelte';
  import Table from '../../system/components/Table.svelte';
  import Section from '../Section.svelte';
</script>

<Section
  title="Two composable layers."
  description="Tokens are the base layer. Components build with them."
  gap="var(--space-8)"
>
  <div class="arch">
    <Card class="arch-card arch-base" icon="fas fa-layer-group" title="Tokens make the foundation">
      <p>
        Raw CSS variables for every primitive, grouped by family and function.
        Names describe identity. Edit a value and every consumer updates.
      </p>
    </Card>

    <Card class="arch-card arch-component" icon="fas fa-shapes" title="Components build upon it">
      <p>
        Each component declares its own semantic properties, linked to base tokens.
        Names describe purpose. Swap the assigned token and the component updates.
      </p>
    </Card>

    <div class="arch-table">
      <header class="arch-table-header">
        <span class="arch-eyebrow">A real resolution chain</span>
        <h3>One base edit. Four touchpoints.</h3>
      </header>
      <Table>
        <table>
          <thead>
            <tr>
              <th>Token</th>
              <th>Resolves to</th>
              <th>Layer</th>
              <th>Used by</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td><code>--button-primary-surface</code></td>
              <td><code>var(--surface-brand-high)</code></td>
              <td><Badge variant="neutral" size="small">Component</Badge></td>
              <td>Button</td>
            </tr>
            <tr>
              <td><code>--surface-brand-high</code></td>
              <td><code>var(--color-brand-700)</code></td>
              <td><Badge variant="accent" size="small">Semantic</Badge></td>
              <td>Badge, Button, Card</td>
            </tr>
            <tr>
              <td><code>--color-brand-700</code></td>
              <td><code>#ac009b</code></td>
              <td><Badge variant="primary" size="small">Base</Badge></td>
              <td>10 components</td>
            </tr>
            <tr>
              <td><code>--color-brand-500</code></td>
              <td><code>#eb0ad4</code></td>
              <td><Badge variant="primary" size="small">Base</Badge></td>
              <td>11 components</td>
            </tr>
          </tbody>
        </table>
      </Table>
    </div>
  </div>
</Section>

<style>
  .arch {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    column-gap: var(--columns-gutter);
    row-gap: var(--space-32);
  }

  .arch :global(.arch-card) {
    height: 100%;
  }

  .arch-table {
    grid-column: 1 / -1;
    display: flex;
    flex-direction: column;
    gap: var(--space-16);
  }

  .arch-table-header {
    padding: 0 var(--space-4);
  }

  .arch-eyebrow {
    display: block;
    font-family: var(--font-sans);
    font-size: var(--font-size-xs);
    font-weight: var(--font-weight-semibold);
    text-transform: uppercase;
    color: var(--text-accent);
    margin-bottom: var(--space-4);
  }

  .arch-table-header h3 {
    font-family: var(--font-display);
    font-style: italic;
    font-size: var(--font-size-2xl);
    color: var(--text-primary);
    font-weight: var(--font-weight-semibold);
    margin: 0;
    line-height: 1.1;
  }

  .arch-table :global(code) {
    font-family: var(--font-mono);
    font-size: 0.9em;
    color: var(--text-primary);
    background: var(--overlay-low);
    padding: 2px 6px;
    border-radius: var(--radius-sm);
  }

  @media (max-width: 960px) {
    .arch {
      grid-template-columns: 1fr;
    }
  }
</style>
