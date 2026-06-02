<script lang="ts">
  import Card from '../../system/components/Card.svelte';
  import Section from '../Section.svelte';
</script>

<Section
  title="Two composable layers."
  eyebrow="Under the hood"
  description="The same two layers you just saw move — now with the wiring that connects them."
  gap="var(--space-8)"
>
  <div class="arch">
    <Card class="arch-card arch-base" hover={false} icon="fas fa-layer-group" title="Tokens make the foundation">
      <p>
        Raw CSS variables for every primitive, grouped by family and function. Edit one value and every consumer updates at once.
      </p>
    </Card>

    <Card class="arch-card arch-component" hover={false} icon="fas fa-shapes" title="Components build upon it">
      <p>
        Each component property is assigned a token. Property names describe purpose. Assign a new token and the component changes.
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
