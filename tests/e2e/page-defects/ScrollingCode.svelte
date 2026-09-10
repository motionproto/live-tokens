<div class="page">
  <section class="band">
    <pre>const everyTokenOnOneLine = "a line no phone column holds, which the block scrolls rather than clips or spills";</pre>
  </section>
</div>

<style>
  .page {
    display: grid;
    grid-template-columns: repeat(var(--columns-count), 1fr);
    column-gap: var(--columns-gutter);
    padding: var(--space-32);
  }

  /* A grid item's automatic minimum is its content's min-content width, and a
     non-wrapping line has no smaller one, so the track would grow to hold the
     whole line rather than let the block scroll. */
  .band {
    grid-column: 1 / -1;
    min-width: 0;
  }

  /* The exception: content wider than its box, and a box that says so. */
  pre {
    overflow-x: auto;
    margin: 0;
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
