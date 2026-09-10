<script lang="ts">
  import Button from '../../../src/system/components/Button.svelte';
</script>

<div class="page">
  <section class="column">
    <Button variant="primary">A control that does not fit</Button>
  </section>
</div>

<style>
  .page {
    display: grid;
    grid-template-columns: repeat(var(--columns-count), 1fr);
    column-gap: var(--columns-gutter);
    padding: var(--space-32);
  }

  /* The defect: a control given a width no phone column has. */
  .column {
    grid-column: 1 / -1;
    overflow: hidden;
  }

  .column :global(.button) {
    width: 520px;
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
