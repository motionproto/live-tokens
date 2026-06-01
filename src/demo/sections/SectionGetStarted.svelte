<script lang="ts">
  import CodeSnippet from '../../system/components/CodeSnippet.svelte';
  import SectionDivider from '../../system/components/SectionDivider.svelte';

  const scaffold = `npx @motion-proto/live-tokens create my-app
cd my-app
npm install
npm run dev`;
</script>

<section class="get-started">
  <SectionDivider variant="sm" title="Get Started" />

  <p class="intro">
    Starting a new project is the easy path. Run the commands and Live&nbsp;Tokens
    scaffolds a ready-to-run template app for you &mdash; install, start the dev
    server, and edit tokens live.
  </p>

  <div class="install">
    <CodeSnippet code={scaffold} />
  </div>
</section>

<style>
  .get-started {
    grid-column: 1 / -1;
    display: grid;
    grid-template-columns: repeat(var(--columns-count), 1fr);
    column-gap: var(--columns-gutter);
    row-gap: var(--space-8);
    align-items: center;
  }

  .get-started :global(.section-divider) {
    grid-column: 2 / -2;
    margin-bottom: var(--space-8);
  }

  .intro {
    grid-column: 2 / span calc((var(--columns-count) - 2) / 2);
    font-family: var(--font-serif);
    font-size: var(--font-size-2xl);
    line-height: var(--line-height-sm);
    font-weight: var(--font-weight-semibold);
    color: var(--text-primary);
    margin: 0;
  }

  .install {
    grid-column: calc((var(--columns-count) + 2) / 2) / -2;
  }

  .install :global(.codesnippet) {
    width: 100%;
  }

  /* `.code` sets overflow-x: auto with overflow-y: visible, which the spec
     promotes to overflow-y: auto — a 1px line-height rounding then trips a
     spurious vertical scrollbar. Clamp the vertical axis; horizontal scroll
     for long lines still works. */
  .install :global(.codesnippet .code) {
    overflow-y: hidden;
  }

  @media (max-width: 960px) {
    .get-started :global(.section-divider),
    .intro,
    .install {
      grid-column: 1 / -1;
    }
  }
</style>
