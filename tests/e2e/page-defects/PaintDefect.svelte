<script lang="ts">
  import Button from '../../../src/system/components/Button.svelte';
</script>

<div class="page">
  <section class="band">
    <Button variant="primary">Rounded by the page</Button>
  </section>
</div>

<style>
  .page {
    display: grid;
    grid-template-columns: repeat(var(--columns-count), 1fr);
    column-gap: var(--columns-gutter);
    padding: var(--space-32);
  }

  .band { grid-column: 1 / -1; }

  /* The defect: a page-wide rule reaches past the component's own property. */
  .page :global(.button.primary) {
    border-radius: var(--radius-full);
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
