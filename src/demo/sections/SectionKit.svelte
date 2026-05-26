<script lang="ts">
  import Card from '../../system/components/Card.svelte';
  import Section from '../Section.svelte';
</script>

<Section
  title="The Kit"
  eyebrow="What's inside"
  description="A basic set of design system components connected to a token library ."
  gap="var(--space-8)"
>
  <div class="kit-grid">
    <Card icon="fas fa-palette" title="Design tokens">
      <p>A complete set of CSS variables for colour, type, spacing, radii, shadows, and motion.</p>
    </Card>
    <Card icon="fas fa-puzzle-piece" title="Component library">
      <p>A Customizable set of components built with semantic properties linked to the tokens. .</p>
    </Card>
    <Card icon="fas fa-pen-ruler" title="Live editor">
      <p>A developer side-panel overlay for live editing of tokens and components.</p>
    </Card>
    <Card icon="fas fa-cube" title="Ships as CSS">
      <p>Your theme saves to a static CSS file. The editor stays out of production.</p>
    </Card>
  </div>
</Section>

<style>
  .kit-grid {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: var(--space-24);
  }

  @media (max-width: 960px) {
    .kit-grid {
      grid-template-columns: 1fr;
    }
  }
</style>
