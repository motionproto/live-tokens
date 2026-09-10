<div class="page">
  <section class="band">A section that spans columns 2 to 12 with its left edge off the line.</section>
</div>

<style>
  .page {
    display: grid;
    grid-template-columns: repeat(var(--columns-count), 1fr);
    column-gap: var(--columns-gutter);
    padding: var(--space-32);
  }

  /* The defect: the placement names the lines, the margin leaves them. */
  .band {
    grid-column: 2 / 12;
    margin-left: 13px;
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
