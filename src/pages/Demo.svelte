<script lang="ts">
  import Button from '../components/Button.svelte';
  import Card from '../components/Card.svelte';
  import Image from '../components/Image.svelte';
  import offeringImage from '../assets/offering.webp';
  import { navigate } from '../lib/router';

  const isDev = import.meta.env.DEV;
</script>

<div class="kit-demo">
  <header class="hero">
    <span class="eyebrow">Live Tokens Kit</span>
    <h1>A starter for token-driven UI.</h1>
    <p class="tagline">
      Built on Svelte and Vite. Edit colours, type, spacing, and motion in the
      browser; ship the result as plain CSS.
    </p>
  </header>

  <section class="styling">
    <div class="styling-intro">
      <span class="kicker">The styler</span>
      <h2>Start styling</h2>
      <p>
        The editor overlay sits in the top-right corner during development. Open
        it to edit colours, type, spacing, and motion — every change writes a
        CSS variable and updates the page in real time.
      </p>
      {#if isDev}
        <div class="actions">
          <Button on:click={() => navigate('/editor')}>Open Token Editor</Button>
          <Button variant="secondary" on:click={() => navigate('/components')}>Browse Components</Button>
        </div>
      {:else}
        <p class="note">
          The editor runs in development only. Run <code>npm run dev</code> to start editing.
        </p>
      {/if}
    </div>

    <div class="features-grid">
      <Card>
        <h3>Design tokens</h3>
        <p>Colour, type, spacing, radii, shadows, and motion — all editable in the browser.</p>
      </Card>
      <Card>
        <h3>Component library</h3>
        <p>Buttons, cards, dialogs, tooltips, badges, tabs, and toggles — every primitive resolves to tokens.</p>
      </Card>
      <Card>
        <h3>Jump to source</h3>
        <p>The overlay opens the current page's Svelte file in VS Code in one click.</p>
      </Card>
    </div>
  </section>

  <section class="architecture">
    <header class="section-header">
      <h2>Two-layer architecture</h2>
      <p>
        A base layer of raw tokens. An upper layer of components that consume
        them through semantic names.
      </p>
    </header>

    <div class="arch-grid">
      <Card class="layer-component">
        <h3>Upper layer — components</h3>
        <p>
          Each component declares its own semantic properties —
          <code>--button-primary-surface</code>,
          <code>--card-default-border</code>,
          <code>--tooltip-radius</code> — and binds them to base tokens.
          Component styles read the semantic names, never the raw tokens.
          Edit a base token, and every component that resolves to it
          updates instantly.
        </p>
      </Card>

      <Card class="layer-base">
        <h3>Base layer — tokens</h3>
        <p>
          Raw CSS variables for colour, type, spacing, radii, shadows, and
          motion. They live in <code>src/styles/tokens.css</code>, the only
          file the editor touches. Names describe values
          (<code>--color-primary-500</code>, <code>--space-16</code>,
          <code>--radius-md</code>), not the components that use them.
        </p>
      </Card>

      <Card class="editor-note">
        <h3>How the editor works</h3>
        <p>
          Click the overlay to open <code>/editor</code> in a side panel or
          floating window. Tabs cover every category in the base layer: palette,
          spacing, columns, radii, type, shadows, overlays, gradients, and
          utilities. Each edit writes a CSS variable on <code>:root</code>, and
          the page reflows instantly — no reload, no rebuild.
        </p>
        <p>
          Save to persist the active theme as JSON under <code>themes/</code>.
          Promote a theme to production, and the editor flushes its values into
          <code>tokens.css</code> and backs up the previous file under
          <code>src/styles/_backups/</code>. The production build then ships as
          pure CSS — no editor code reaches the bundle.
        </p>
      </Card>
    </div>
  </section>

  <section class="showcase">
    <Image src={offeringImage} alt="Offering" variant="banner" />
  </section>
</div>

<style>
  .kit-demo {
    display: grid;
    grid-template-columns: repeat(var(--columns-count), 1fr);
    column-gap: var(--columns-gutter);
    row-gap: var(--space-48);
    max-width: var(--columns-max-width);
    margin: 0 auto;
    padding: var(--space-48) var(--space-32);
    min-height: 100vh;
  }

  .hero,
  .styling,
  .architecture,
  .showcase {
    grid-column: 1 / -1;
  }

  /* HERO */
  .hero {
    grid-column: 3 / span 8;
    text-align: center;
    padding: var(--space-32) 0 var(--space-16);
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: var(--space-12);
  }

  .eyebrow {
    display: inline-block;
    font-family: var(--font-sans);
    font-size: var(--font-size-sm);
    font-weight: 600;
    letter-spacing: 0.18em;
    text-transform: uppercase;
    color: var(--text-tertiary);
  }

  .hero h1 {
    font-family: var(--font-display);
    font-size: var(--font-size-5xl, var(--font-size-4xl));
    font-weight: 600;
    font-variation-settings: 'opsz' 144, 'SOFT' 30;
    color: var(--text-primary);
    margin: 0;
    line-height: 1.02;
    letter-spacing: -0.015em;
  }

  .tagline {
    font-family: var(--font-serif);
    font-style: italic;
    font-size: var(--font-size-lg);
    color: var(--text-secondary);
    max-width: 540px;
    margin: 0;
    line-height: 1.5;
  }

  /* STYLING — intro + three feature cards */
  .styling {
    display: grid;
    grid-template-columns: repeat(var(--columns-count), 1fr);
    column-gap: var(--columns-gutter);
    row-gap: var(--space-32);
  }

  .styling-intro {
    grid-column: 2 / span 10;
    display: flex;
    flex-direction: column;
    gap: var(--space-12);
  }

  .kicker {
    font-family: var(--font-sans);
    font-size: var(--font-size-sm);
    font-weight: 600;
    letter-spacing: 0.18em;
    text-transform: uppercase;
    color: var(--text-tertiary);
  }

  .styling-intro h2 {
    font-family: var(--font-display);
    font-size: var(--font-size-3xl);
    font-weight: 600;
    font-variation-settings: 'opsz' 96;
    color: var(--text-primary);
    margin: 0;
    line-height: 1.1;
    letter-spacing: -0.01em;
  }

  .styling-intro p {
    font-family: var(--font-sans);
    color: var(--text-secondary);
    font-size: var(--font-size-md);
    max-width: 640px;
    margin: 0;
    line-height: 1.55;
  }

  .actions {
    display: flex;
    gap: var(--space-12);
    flex-wrap: wrap;
    margin-top: var(--space-8);
  }

  .note {
    margin-top: var(--space-8);
    color: var(--text-tertiary);
    font-size: var(--font-size-sm);
  }

  .note code {
    background: var(--surface-neutral-high);
    padding: 2px 6px;
    border-radius: var(--radius-sm);
    font-family: var(--font-mono, monospace);
  }

  /* Feature cards — three 3-col cards, equal 1-col gaps */
  .features-grid {
    grid-column: 1 / -1;
    display: grid;
    grid-template-columns: repeat(var(--columns-count), 1fr);
    column-gap: var(--columns-gutter);
    row-gap: var(--space-24);
  }

  .features-grid > :global(*:nth-child(1)) { grid-column: 2 / span 3; }
  .features-grid > :global(*:nth-child(2)) { grid-column: 6 / span 3; }
  .features-grid > :global(*:nth-child(3)) { grid-column: 10 / span 3; }

  /* ARCHITECTURE */
  .architecture {
    display: grid;
    grid-template-columns: repeat(var(--columns-count), 1fr);
    column-gap: var(--columns-gutter);
    row-gap: var(--space-32);
  }

  .section-header {
    grid-column: 3 / span 8;
    text-align: center;
    padding: var(--space-16) 0 var(--space-8);
  }

  .section-header h2 {
    font-family: var(--font-display);
    font-size: var(--font-size-3xl);
    font-weight: 600;
    font-variation-settings: 'opsz' 96;
    color: var(--text-primary);
    margin: 0 0 var(--space-12);
    line-height: 1.1;
    letter-spacing: -0.01em;
  }

  .section-header p {
    font-family: var(--font-serif);
    font-style: italic;
    color: var(--text-secondary);
    font-size: var(--font-size-md);
    max-width: 560px;
    margin: 0 auto;
    line-height: 1.5;
  }

  /* arch-grid layout:
     Left column (cols 1/span 6): Component layer (top), Base layer (bottom)
     Right column (cols 8/span 5): How the editor works (full height) */
  .arch-grid {
    grid-column: 1 / -1;
    display: grid;
    grid-template-columns: repeat(var(--columns-count), 1fr);
    grid-template-rows: auto auto;
    column-gap: var(--columns-gutter);
    row-gap: var(--space-24);
    align-items: stretch;
  }

  .arch-grid > :global(.layer-component) {
    grid-column: 1 / span 6;
    grid-row: 1;
  }

  .arch-grid > :global(.layer-base) {
    grid-column: 1 / span 6;
    grid-row: 2;
  }

  .arch-grid > :global(.editor-note) {
    grid-column: 8 / span 5;
    grid-row: 1 / span 2;
  }

  .architecture :global(h3) {
    font-family: var(--font-display);
    font-size: var(--font-size-lg);
    font-weight: 600;
    font-variation-settings: 'opsz' 36;
    color: var(--text-primary);
    margin: 0 0 var(--space-8);
    letter-spacing: -0.005em;
  }

  .architecture :global(p) {
    font-family: var(--font-sans);
    line-height: 1.55;
  }

  .architecture :global(p + p) {
    margin-top: var(--space-12);
  }

  .architecture :global(code) {
    background: var(--overlay-low);
    padding: 1px 6px;
    border-radius: var(--radius-sm);
    font-family: var(--font-mono, monospace);
    font-size: 0.9em;
    color: var(--text-primary);
  }

  /* SHOWCASE — closer image */
  .showcase {
    grid-column: 2 / span 10;
    margin-top: var(--space-16);
  }

  /* TABLET */
  @media (max-width: 960px) {
    .hero,
    .styling-intro,
    .section-header,
    .showcase {
      grid-column: 1 / -1;
    }

    .features-grid > :global(*:nth-child(1)) { grid-column: 1 / span 6; }
    .features-grid > :global(*:nth-child(2)) { grid-column: 7 / span 6; }
    .features-grid > :global(*:nth-child(3)) { grid-column: 1 / span 6; }

    /* Arch collapses: left stack on top, editor-note below */
    .arch-grid > :global(.layer-component) { grid-column: 1 / -1; grid-row: 1; }
    .arch-grid > :global(.layer-base)      { grid-column: 1 / -1; grid-row: 2; }
    .arch-grid > :global(.editor-note)     { grid-column: 1 / -1; grid-row: 3; }
  }

  /* MOBILE */
  @media (max-width: 600px) {
    .kit-demo {
      padding: var(--space-32) var(--space-16);
      row-gap: var(--space-32);
    }

    .features-grid > :global(*:nth-child(1)),
    .features-grid > :global(*:nth-child(2)),
    .features-grid > :global(*:nth-child(3)) {
      grid-column: 1 / -1;
    }

    .styling,
    .features-grid,
    .architecture,
    .arch-grid {
      row-gap: var(--space-16);
    }
  }
</style>
