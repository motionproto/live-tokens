<script lang="ts">
  import '../../../src/app/site.css';
</script>

<div class="page">
  <section class="band">
    <h1>A label sized to its text at rest</h1>
    <p class="label">nineteen characters</p>
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

  /* The defect: a fixed width that clips. Nineteen monospace characters fit in
     22ch at the theme's spacing, and the override's 0.12em a character pushes
     them past it. */
  .label {
    width: 22ch;
    overflow: hidden;
    white-space: nowrap;
    color: var(--text-primary);
    font-family: var(--code-md-font-family);
    font-size: var(--code-md-font-size);
    font-weight: var(--code-md-font-weight);
    line-height: var(--code-md-line-height);
    letter-spacing: var(--code-md-letter-spacing);
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
