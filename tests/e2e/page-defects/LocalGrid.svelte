<div class="page">
  <section class="band">
    <div class="tiles">
      <div class="tile">One</div>
      <div class="tile">Two</div>
      <div class="tile">Three</div>
    </div>
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

  /* The exception: a grid of its own inside a section, on no column line and
     owing nothing to one. */
  .tiles {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: var(--space-20);
  }

  .tile {
    padding: var(--space-16);
    background: var(--surface-neutral-high);
    color: var(--text-primary);
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
