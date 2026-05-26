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
      <p>A complete set of atomic CSS variables for styling.</p>
    </Card>
    <Card icon="fas fa-puzzle-piece" title="Component library">
      <p>A customizable set of components linked to the tokens. .</p>
    </Card>
    <Card icon="fas fa-pen-ruler" title="Live editor">
      <p>Edit tokens and components, with instant updates.</p>
    </Card>
    <Card icon="fas fa-cube" title="Ships as CSS">
      <p>Standard output, The editor stays in development.</p>
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
