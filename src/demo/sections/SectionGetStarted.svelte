<script lang="ts">
  import CodeSnippet from '../../system/components/CodeSnippet.svelte';
  import SectionDivider from '../../system/components/SectionDivider.svelte';
  import Panel from '../../system/components/Panel.svelte';

  const scaffold = `npx @motion-proto/live-tokens create my-app
cd my-app
npm install
npm run dev`;
</script>

<section class="get-started">
  <div class="gs-panel">
    <Panel>
      <div class="gs-content">
        <SectionDivider variant="sm" title="Getting Started" />

        <div class="columns">
          <p class="intro">
            Creating a new project gives you a starter page with the live&nbsp;editor already wired in. Run the commands,
            start the dev server, and edit the design system as you build.
          </p>

          <div class="install">
            <CodeSnippet code={scaffold} />
          </div>
        </div>
      </div>
    </Panel>
  </div>
</section>

<style>
  .get-started {
    grid-column: 1 / -1;
    display: grid;
    grid-template-columns: repeat(var(--columns-count), 1fr);
    column-gap: var(--columns-gutter);
  }

  .gs-panel {
    grid-column: 2 / -2;
    /* The .kit grid can stretch this section's row past its content (min-height:
       100vh on a short page); keep the panel sized to its content regardless. */
    align-self: start;
  }

  /* Single full-width child of the Panel's centering stage; the stage lays its
     children out in a row, so the section's content must collapse to one item. */
  .gs-content {
    width: 100%;
  }

  /* SectionDivider ships with margin: var(--space-24) 0; as the first child its
     top margin stacks on the stage padding — zero it out here. */
  .gs-content :global(.section-divider) {
    margin-top: 0;
  }

  /* Code column gets the larger share so the longest scaffold line fits
     without triggering the snippet's scrollbar. */
  .columns {
    display: grid;
    grid-template-columns: minmax(0, 1fr) minmax(0, 1.1fr);
    gap: var(--space-40);
    align-items: center;
  }

  .intro {
    font-family: var(--font-sans);
    font-size: var(--font-size-xl);
    line-height: var(--line-height-sm);
    font-weight: var(--font-weight-semibold);
    color: var(--text-primary);
    margin: 0;
  }

  /* No global border-box reset here, so width:100% under content-box would let
     the snippet's own padding+border overflow its column and eat the panel's
     right padding. Pin it to border-box so it fills the column exactly. */
  .install :global(.codesnippet) {
    box-sizing: border-box;
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
    .columns {
      grid-template-columns: 1fr;
      align-items: stretch;
    }
  }
</style>
