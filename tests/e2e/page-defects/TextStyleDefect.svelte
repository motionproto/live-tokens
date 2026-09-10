<div class="page">
  <section class="prose">
    <p>A paragraph that takes a heading's family and size and keeps its own weight and line height.</p>
  </section>
</div>

<style>
  .page {
    display: grid;
    grid-template-columns: repeat(var(--columns-count), 1fr);
    column-gap: var(--columns-gutter);
    padding: var(--space-32);
  }

  /* The defect: half a bundle on the container, the rest inherited from
     nowhere, so the paragraph inside renders in no shipped text style. */
  .prose {
    grid-column: 1 / -1;
    font-family: var(--heading-lg-font-family);
    font-size: var(--heading-lg-font-size);
    color: var(--text-primary);
  }

  .prose p { line-height: 1.6; }

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
