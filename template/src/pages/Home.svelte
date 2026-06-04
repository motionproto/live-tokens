<script lang="ts">
  // site.css carries themed page typography (bare h1/p/a rules that consume
  // theme tokens). Imported per-page, not globally, so the editor routes stay
  // theme-immune. It's yours to edit — see src/styles/site.css.
  import '../styles/site.css';
  import Card from '@motion-proto/live-tokens/components/Card.svelte';
  import Button from '@motion-proto/live-tokens/components/Button.svelte';
  import { navigate } from '@motion-proto/live-tokens';

  const isDev = import.meta.env.DEV;
</script>

<div class="home">
  <section class="stub">
    <Card>
      <span class="eyebrow">Your app lives here</span>
      <h1>Home</h1>
      <p>
        Replace this with your own content. Edit <code>src/pages/Home.svelte</code>
        to get started, or add routes in <code>src/App.svelte</code>. Components
        and theme tokens are editable live while <code>npm run dev</code> is running.
      </p>
      {#if isDev}
        <div class="actions">
          <Button on:click={() => navigate('/live-tokens/editor')}>Open Token Editor</Button>
          <Button variant="secondary" on:click={() => navigate('/live-tokens/components')}>Components</Button>
        </div>
      {/if}
    </Card>
  </section>
</div>

<style>
  .home {
    display: grid;
    grid-template-columns: repeat(var(--columns-count), 1fr);
    column-gap: var(--columns-gutter);
    max-width: var(--columns-max-width);
    margin: 0 auto;
    padding: var(--space-48) var(--space-32);
    min-height: 100vh;
    align-content: center;
  }

  .stub {
    grid-column: 4 / span 6;
  }

  .eyebrow {
    display: block;
    font-size: var(--font-size-sm);
    font-weight: var(--font-weight-normal);
    text-transform: uppercase;
    color: var(--text-tertiary);
    margin-bottom: var(--space-8);
  }

  h1 {
    font-family: var(--font-display);
    font-size: var(--font-size-4xl);
    color: var(--text-primary);
    margin: 0 0 var(--space-12);
  }

  p {
    color: var(--text-secondary);
    line-height: 1.6;
  }

  code {
    background: var(--surface-neutral-high);
    padding: 2px 6px;
    border-radius: var(--radius-sm);
    font-family: var(--font-mono, monospace);
    font-size: 0.9em;
  }

  .actions {
    display: flex;
    gap: var(--space-12);
    flex-wrap: wrap;
    margin-top: var(--space-20);
  }
</style>
