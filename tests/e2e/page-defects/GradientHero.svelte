<div class="page">
  <section class="hero">
    <p>A hero whose text sits on a gradient, which no ratio can answer for.</p>
  </section>
</div>

<style>
  .page {
    display: grid;
    grid-template-columns: repeat(var(--columns-count), 1fr);
    column-gap: var(--columns-gutter);
    padding: var(--space-32);
  }

  .hero {
    grid-column: 1 / -1;
    padding: var(--space-32);
    background: linear-gradient(90deg, var(--surface-brand-lowest), var(--surface-brand-highest));
  }

  .hero p { color: var(--text-primary); }

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
