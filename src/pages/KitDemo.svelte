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
          <Button on:click={() => navigate('/admin')}>Open Design System</Button>
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

  @media (max-width: 600px) {
    .kit-demo {
      padding: var(--space-24) var(--space-16) var(--space-32);
      gap: var(--space-24);
    }
  }
</style>
