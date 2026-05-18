<script lang="ts">
  // site.css carries the themed page typography (bare `h1`/`p`/`a` rules
  // that consume theme tokens). It's imported here — not globally from
  // main.ts — so editor pages (Editor.svelte, ComponentEditorPage.svelte)
  // stay theme-immune. See src/styles/CONVENTIONS.md row for site.css.
  import './site.css';
  import Card from '../system/components/Card.svelte';
  import Button from '../system/components/Button.svelte';
  import { navigate } from '../editor/core/routing/router';
  import { overlayOpen } from '../editor/overlay/overlayState';

  const isDev = import.meta.env.DEV;
</script>

<div class="home">
  <section class="stub">
    <Card>
      <span class="eyebrow">Your app lives here</span>
      <h1>Home</h1>
      <p>
        Replace this page with your own content. Edit <code>src/pages/Home.svelte</code>
        to get started, or delete this file and point the <code>/</code> route somewhere else
        in <code>src/App.svelte</code>.
      </p>
      {#if isDev}
        <div class="actions">
          <Button on:click={() => navigate('/demo')}>Demo page</Button>
          <Button variant="secondary" on:click={() => navigate('/components')}>Components</Button>
          <Button
            variant="secondary"
            class="push-right"
            on:click={() => window.dispatchEvent(new CustomEvent('lt-overlay-toggle'))}
          >{$overlayOpen ? 'Close Token Editor' : 'Open Token Editor'}</Button>
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
    letter-spacing: 0.08em;
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

  .actions :global(.push-right) {
    margin-left: auto;
  }
</style>
