<!-- The demo site's routes state no backdrop and render no Dialog, so the
     equivalence spec builds this page for those states. -->
<script lang="ts">
  import '../../../src/app/site.css';
  import Card from '../../../src/system/components/Card.svelte';
  import Button from '../../../src/system/components/Button.svelte';
  import Dialog from '../../../src/system/components/Dialog.svelte';

  let open = $state(false);
  const close = () => (open = false);
</script>

<main class="states">
  {#each ['light', 'dark'] as backdrop (backdrop)}
    <section class="state {backdrop}" data-backdrop={backdrop}>
      <h2>A {backdrop} backdrop</h2>
      <p>Body copy on the section, with <a href="#top">a link</a> inside it.</p>
      <Card title="Card" icon="fas fa-star" hover>
        <p>The card's body.</p>
      </Card>
      <div class="actions">
        <Button variant="primary" hoverTint>Primary</Button>
        <Button variant="secondary">Secondary</Button>
        <Button variant="outline">Outline</Button>
      </div>
    </section>
  {/each}
  <Button class="open-dialog" variant="secondary" onclick={() => (open = true)}>Open the dialog</Button>
  <Dialog
    bind:open
    title="Dialog"
    confirm={{ label: 'Confirm', onClick: close }}
    cancel={{ label: 'Cancel', onClick: close }}
  >
    <p>The dialog's body.</p>
  </Dialog>
</main>

<style>
  .states {
    display: grid;
    gap: var(--space-32);
    padding: var(--space-32);
  }

  .state {
    padding: var(--space-32);
    border-radius: var(--radius-lg);
  }

  .state.light {
    background: var(--color-white);
  }

  .state.dark {
    background: var(--color-black);
  }

  .actions {
    display: flex;
    flex-wrap: wrap;
    gap: var(--space-12);
    margin-top: var(--space-16);
  }
</style>
