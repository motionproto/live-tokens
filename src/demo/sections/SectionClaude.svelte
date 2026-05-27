<script lang="ts">
  import Card from '../../system/components/Card.svelte';
  import CodeSnippet from '../../system/components/CodeSnippet.svelte';
  import SectionDivider from '../../system/components/SectionDivider.svelte';
</script>

<section class="claude">
  <SectionDivider
    title="With Claude skills (of course)"
    eyebrow="Pairs with Claude Code"
  />

  <p class="intro">
    Claude is my AI buddy. I use it to build everything. Live Tokens has three Claude skills, each loading on demand.
  </p>

  <div class="install">
    <CodeSnippet code="npx @motion-proto/live-tokens setup-claude" />
    <p class="install-caption">
      After installing the package, run this once to copy the skills into your project.
    </p>
  </div>

  <div class="cards">
    <Card icon="fas fa-list-check" title="pick-component">
      <p>
        Gives Claude a list of components and helps it select what to use. 
      </p>
    </Card>
    <Card icon="fas fa-table-columns" title="build-page">
      <p>
        Guides Claude's use of components, tokens, and the column layout 
      </p>
    </Card>
    <Card icon="fas fa-cube" title="create-component">
      <p>
        Helps Claude create custom components with live tokens.
      </p>
    </Card>
  </div>
</section>

<style>
  .claude {
    grid-column: 1 / -1;
    display: grid;
    grid-template-columns: repeat(var(--columns-count), 1fr);
    column-gap: var(--columns-gutter);
    row-gap: var(--space-8);
    align-items: start;
  }

  .claude :global(.section-divider) {
    grid-column: 2 / -2;
  }

  /* Content rows live in cols 2 through (count-1). Each row splits or
     subdivides the remaining (count-2) tracks, so the layout grows with
     --columns-count instead of pretending the grid is always 12. */
  .intro {
    grid-column: 2 / span calc((var(--columns-count) - 2) / 2);
    font-family: var(--font-serif);
    font-size: var(--font-size-2xl);
    line-height: var(--line-height-sm);
    font-weight: var(--font-weight-semibold);
    color: var(--text-primary);
    margin: 0;
    margin-bottom: var(--space-24);
  }

  .install {
    grid-column: calc((var(--columns-count) + 2) / 2) / -2;
    display: flex;
    flex-direction: column;
    gap: var(--space-8);
  }

  .install-caption {
    margin: 0;
    font-family: var(--font-sans);
    font-size: var(--font-size-md);
    line-height: var(--line-height-md);
    color: var(--text-secondary);
  }

  /* Wrapper claims the 10-track content area on the page grid (cols 2 / -2),
     then splits its own width into thirds for the three cards. The wrapper
     is the page-grid citizen; the cards trust the wrapper. */
  .cards {
    grid-column: 2 / -2;
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    column-gap: var(--columns-gutter);
    row-gap: var(--space-24);
    margin-top: var(--space-16);
  }

  @media (max-width: 960px) {
    .claude :global(.section-divider),
    .intro,
    .install,
    .cards {
      grid-column: 1 / -1;
    }

    .cards {
      grid-template-columns: 1fr;
    }
  }
</style>
