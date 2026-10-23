<script lang="ts">
  import '../../../src/app/site.css';
</script>

<div class="page">
  <section class="band">
    <h1>A page whose list holds no list items</h1>
    <ul class="steps">
      <div class="step"><p>A step outside any list item.</p></div>
    </ul>
  </section>
</div>

<style>
  .page {
    display: grid;
    grid-template-columns: repeat(var(--columns-count), 1fr);
    column-gap: var(--columns-gutter);
    padding: var(--space-32);
  }

  .band {
    grid-column: 1 / -1;
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
