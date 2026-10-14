<script lang="ts">
  import '../app/site.css';
  import SectionHero from './sections/SectionHero.svelte';
  import SectionKit from './sections/SectionKit.svelte';
  import SectionLayers from './sections/SectionLayers.svelte';
  import SectionGetStarted from './sections/SectionGetStarted.svelte';
  import SectionClaude from './sections/SectionClaude.svelte';
  import SectionOffering from './sections/SectionOffering.svelte';
  import SectionFooter from './sections/SectionFooter.svelte';
  import DemoBar from './DemoBar.svelte';

  let {
    onThemePick,
    onSketchPick,
  }: {
    onThemePick?: (fileName: string) => void;
    onSketchPick?: (id: string | null) => void;
  } = $props();

  // The pickers drive the editor's API, which the package only serves in dev.
  const isDev = import.meta.env.DEV;
</script>

{#if isDev}
  <DemoBar {onThemePick} {onSketchPick} />
{/if}

<div class="kit" class:has-bar={isDev}>
  <SectionHero />
  <SectionKit />
  <SectionLayers />
  <SectionOffering />
  <SectionGetStarted />
  <SectionClaude />
  <SectionFooter />
</div>

<style>
  /* Sections place themselves on these spans, and the full-width ones nest a
     subgrid, so the breakpoints below are the only place a section's columns
     change. minmax(0, 1fr) keeps a wide child from widening its track. */
  .kit {
    --kit-content: 2 / -2;
    --kit-narrow: 3 / -3;
    display: grid;
    grid-template-columns: repeat(var(--columns-count), minmax(0, 1fr));
    column-gap: var(--columns-gutter);
    row-gap: var(--space-64);
    max-width: var(--columns-max-width);
    margin: 0 auto;
    padding: var(--space-48) var(--space-32);
    min-height: 100vh;
  }

  /* Clears the fixed DemoBar: its padding plus one control's height. */
  .kit.has-bar {
    padding-top: calc(var(--space-48) + var(--space-64));
  }

  /* Per-section gap overrides (added on top of .kit row-gap). */
  .kit > :global(.hero) {
    margin-bottom: 0;
  }

  /* Equal lead-in above these three sections: row-gap (64) + 48 = 112px. */
  .kit > :global(.kit-section),
  .kit > :global(.layers),
  .kit > :global(.claude) {
    margin-top: var(--space-32);
  }

  /* Inline code styling cascades into every section via :global descendants. */
  .kit :global(p > code),
  .kit :global(.callout code) {
    background: var(--tint-low);
    padding: var(--space-2) var(--space-6);
    border-radius: var(--radius-sm);
    font-family: var(--font-mono);
    font-size: 0.88em;
    color: var(--text-primary);
  }

  @media (max-width: 1200px) {
    .kit {
      --kit-content: 1 / -1;
      --kit-narrow: 2 / -2;
    }
  }

  /* Eleven gutters of a wide-gutter theme outgrow a phone, so the page is one
     column there. */
  @media (max-width: 600px) {
    .kit {
      --kit-narrow: 1 / -1;
      grid-template-columns: minmax(0, 1fr);
    }

    .kit,
    .kit.has-bar {
      padding: var(--space-32) var(--space-16);
      row-gap: var(--space-48);
    }
  }
</style>
