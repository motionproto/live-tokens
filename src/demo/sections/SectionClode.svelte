<script lang="ts">
  import Card from '../../system/components/Card.svelte';
  import Section from '../Section.svelte';
</script>

<Section
  title="With Claude skills(of course)"
  eyebrow="Pairs with Claude Code"
  description="Four bundled skills teach Claude Code how to drive a live-tokens project — from first install to authoring a new component. Each one loads on demand when its job matches what you're asking for."
  gap="var(--space-8)"
>
  <div class="Claude-grid">
    <Card icon="fas fa-plug" title="setup-project">
      <p>
        Installs and wires the package into a Svelte 5 + Vite app. Boots the
        editor overlay and the <code>/editor</code> and <code>/components</code> routes.
      </p>
    </Card>
    <Card icon="fas fa-list-check" title="pick-component">
      <p>
        Recommends which shipped component fits a UX need, with decision trees
        for the confusable pairs. Read first before authoring anything new.
      </p>
    </Card>
    <Card icon="fas fa-table-columns" title="build-page">
      <p>
        Composes a page by placing shipped components in the column grid,
        registering the route, and styling with theme tokens only.
      </p>
    </Card>
    <Card icon="fas fa-cube" title="add-component">
      <p>
        Authors a brand-new editable component when nothing in the catalogue
        fits. Covers the runtime file, editor file, and registration call.
      </p>
    </Card>
  </div>
</Section>

<style>
  .Claude-grid {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: var(--space-24);
  }

  @media (max-width: 960px) {
    .Claude-grid {
      grid-template-columns: 1fr;
    }
  }
</style>
