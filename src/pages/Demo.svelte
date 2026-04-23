<script lang="ts">
  import Button from '../components/Button.svelte';
  import Card from '../components/Card.svelte';
  import { navigate } from '../lib/router';

  const isDev = import.meta.env.DEV;
</script>

<div class="kit-demo">
  <header class="hero">
    <span class="eyebrow">Live Tokens Kit</span>
    <h1>The starter you cloned</h1>
    <p class="tagline">
      A Svelte + Vite foundation with a full design-token system and an in-browser editor.
      Tune the tokens, then build your app on top.
    </p>
  </header>

  <section class="quickstart">
    <Card>
      <h2>Start styling</h2>
      <p>
        In development, the editor overlay is pinned to the top-right of every page.
        Open it to tune colors, typography, spacing, and more. Your changes
        hot-swap into the page as CSS variables.
      </p>
      {#if isDev}
        <div class="actions">
          <Button on:click={() => navigate('/editor')}>Open Token Editor</Button>
          <Button variant="secondary" on:click={() => navigate('/components')}>Browse Components</Button>
        </div>
      {:else}
        <p class="note">
          The editor only runs in development. Run <code>npm run dev</code> to edit tokens.
        </p>
      {/if}
    </Card>
  </section>

  <section class="features">
    <Card>
      <h3>Design tokens</h3>
      <p>Colors, typography, spacing, radii, shadows, and motion — all editable live.</p>
    </Card>
    <Card>
      <h3>Component library</h3>
      <p>Buttons, cards, dialogs, tooltips, badges, tabs, toggles, and more.</p>
    </Card>
    <Card>
      <h3>Page source jump</h3>
      <p>The overlay's <em>Page Source</em> link opens the current page's Svelte file in VS Code.</p>
    </Card>
  </section>

  <section class="architecture">
    <header class="section-header">
      <h2>Two-layer architecture</h2>
      <p>
        Styling is split into a base layer of design tokens and an upper layer of
        components that reference them through semantic properties.
      </p>
    </header>

    <div class="layers">
      <Card>
        <h3>Base layer — design tokens</h3>
        <p>
          Raw CSS variables for colors, typography, spacing, radii, shadows,
          and motion. They live in <code>src/styles/tokens.css</code> and are
          the <em>only</em> layer the editor edits. Names describe the value
          (<code>--color-primary-500</code>, <code>--space-16</code>,
          <code>--radius-md</code>) rather than any specific UI.
        </p>
      </Card>

      <Card>
        <h3>Upper layer — components</h3>
        <p>
          Each component declares its own semantic properties —
          <code>--button-primary-surface</code>,
          <code>--card-default-border</code>,
          <code>--tooltip-radius</code> — and points them at design tokens.
          The component's own styles read the semantic names, never the raw
          tokens. Change a base token in the editor and every component that
          resolves to it updates in place.
        </p>
      </Card>
    </div>

    <Card>
      <h3>How the editor works</h3>
      <p>
        In dev, the overlay pinned to the top-right opens <code>/editor</code>
        in a side panel or floating window. Tabs cover every category of the
        base layer: palette, spacing, columns, border radius, typography,
        shadows, overlays, gradients, and utility tokens. Each edit writes a
        CSS variable on <code>:root</code>, so the page you were just looking
        at reflows instantly — no reload, no rebuild.
      </p>
      <p>
        Save to persist the active theme as JSON in <code>themes/</code>.
        Promote a theme to <em>production</em> and its values are flushed
        into <code>tokens.css</code> (and backed up under
        <code>src/styles/_backups/</code>), so the production build ships as
        pure CSS with no editor code in the bundle.
      </p>
    </Card>
  </section>
</div>

<style>
  .kit-demo {
    display: flex;
    flex-direction: column;
    align-items: center;
    min-height: 100vh;
    padding: var(--space-48) var(--space-24) var(--space-40);
    gap: var(--space-40);
    max-width: 960px;
    margin: 0 auto;
  }

  .hero {
    text-align: center;
    padding: var(--space-24) 0;
  }

  .eyebrow {
    display: block;
    font-size: var(--font-sm);
    font-weight: var(--font-weight-semibold);
    letter-spacing: 0.08em;
    text-transform: uppercase;
    color: var(--text-tertiary);
    margin-bottom: var(--space-8);
  }

  .hero h1 {
    font-family: var(--font-display);
    font-size: var(--font-5xl, var(--font-4xl));
    color: var(--text-primary);
    margin: 0 0 var(--space-12);
  }

  .tagline {
    font-family: var(--font-serif);
    font-size: var(--font-lg);
    color: var(--text-secondary);
    max-width: 540px;
    margin: 0 auto;
  }

  .quickstart {
    width: 100%;
  }

  .actions {
    display: flex;
    gap: var(--space-12);
    flex-wrap: wrap;
    margin-top: var(--space-16);
  }

  .note {
    margin-top: var(--space-16);
    color: var(--text-tertiary);
    font-size: var(--font-sm);
  }

  .note code {
    background: var(--surface-neutral-high);
    padding: 2px 6px;
    border-radius: var(--radius-sm);
    font-family: var(--font-mono, monospace);
  }

  .features {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
    gap: var(--space-16);
    width: 100%;
  }

  .architecture {
    display: flex;
    flex-direction: column;
    gap: var(--space-16);
    width: 100%;
  }

  .section-header {
    text-align: center;
    padding: var(--space-16) 0 var(--space-8);
  }

  .section-header h2 {
    font-family: var(--font-display);
    font-size: var(--font-3xl);
    color: var(--text-primary);
    margin: 0 0 var(--space-8);
  }

  .section-header p {
    font-family: var(--font-serif);
    color: var(--text-secondary);
    font-size: var(--font-md);
    max-width: 560px;
    margin: 0 auto;
  }

  .layers {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
    gap: var(--space-16);
  }

  .architecture :global(h3) {
    font-size: var(--font-lg);
    color: var(--text-primary);
    margin: 0 0 var(--space-8);
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

  @media (max-width: 600px) {
    .kit-demo {
      padding: var(--space-24) var(--space-16) var(--space-32);
      gap: var(--space-24);
    }
  }
</style>
