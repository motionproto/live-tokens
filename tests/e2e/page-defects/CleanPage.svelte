<script lang="ts">
  import '../../../src/app/site.css';
  import Button from '../../../src/system/components/Button.svelte';
  import Card from '../../../src/system/components/Card.svelte';
</script>

<div class="page">
  <section class="intro">
    <h1>A page that keeps its side of the contract</h1>
    <p>Every run of text sits in a shipped text style, every pair clears AA, and the sections sit on the column lines.</p>
    <div class="actions">
      <Button variant="primary">Primary action</Button>
      <Button variant="secondary">Secondary action</Button>
    </div>
  </section>
  <aside class="side">
    <Card>
      <p>A card owns the typography of its slot, so this paragraph is the card's obligation.</p>
    </Card>
  </aside>
</div>

<style>
  .page {
    display: grid;
    grid-template-columns: repeat(var(--columns-count), 1fr);
    column-gap: var(--columns-gutter);
    padding: var(--space-32);
  }

  .intro { grid-column: 1 / 9; }

  .side { grid-column: 9 / -1; }

  .actions {
    display: flex;
    flex-wrap: wrap;
    gap: var(--space-12);
  }

  @media (max-width: 767px) {
    .intro, .side { grid-column: 1 / -1; }
  }

  /* At 390 the theme's 32px gutter alone is wider than the content box, so a
     twelve-column grid overflows every phone. The grid rule is inapplicable
     below 768 and the page collapses to one column there, which is the shape
     a page has to take. */
  @media (max-width: 767px) {
    .page {
      grid-template-columns: 1fr;
      column-gap: 0;
    }
  }
</style>
