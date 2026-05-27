<script lang="ts">
  import Card from '../../system/components/Card.svelte';
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

  .arch :global(code) {
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
