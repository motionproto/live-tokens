<script lang="ts">
  // site.css carries the themed page typography (bare `h1`/`p`/`a` rules
  // that consume theme tokens). It's imported here — not globally from
  // main.ts — so editor pages (Editor.svelte, ComponentEditorPage.svelte)
  // stay theme-immune. See src/styles/CONVENTIONS.md row for site.css.
  import './site.css';
  import Card from '../system/components/Card.svelte';
  import Button from '../system/components/Button.svelte';
  import { navigate } from '../editor/core/routing/router';
  import { DEFAULT_COMPONENTS_PATH } from '../editor/core/routing/ownedRoutes';
  import { overlayOpen } from '../editor/overlay/overlayState';
  import { setEditorView } from '../editor/core/store/editorViewStore';
  import ThemeSelect from '../demo/ThemeSelect.svelte';
  import SketchSelect from '../demo/SketchSelect.svelte';

  const isDev = import.meta.env.DEV;

  // The components page has no phone layout. At the width where the editor
  // opens full screen, open its components view instead.
  function openComponents() {
    if (!window.matchMedia('(max-width: 600px)').matches) {
      navigate(DEFAULT_COMPONENTS_PATH);
      return;
    }
    setEditorView('components');
    if (!$overlayOpen) window.dispatchEvent(new CustomEvent('lt-overlay-toggle'));
  }
</script>

<div class="home">
  <section class="stub">
    <Card variant="bare">
      <h1>Home</h1>
      <p>
        This is your home page. Build it in <code>src/app/Home.svelte</code>, and add pages
        to the route table in <code>src/app/App.svelte</code>.
      </p>
      {#if isDev}
        <div class="actions">
          <Button variant="primary" on:click={() => navigate('/demo')}>Demo page</Button>
          <Button variant="secondary" on:click={openComponents}>Components</Button>
          <Button
            variant="secondary"
            class="push-right"
            on:click={() => window.dispatchEvent(new CustomEvent('lt-overlay-toggle'))}
          >{$overlayOpen ? 'Close Token Editor' : 'Open Token Editor'}</Button>
        </div>
        <div class="selectors">
          <ThemeSelect />
          <SketchSelect />
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
    box-sizing: content-box;
    max-width: var(--columns-max-width);
    margin: 0 auto;
    padding-block: var(--space-48);
    padding-inline: var(--columns-margin);
    min-height: 100vh;
    align-content: center;
  }

  /* Shrink-to-fit so themes with wider type widen the card instead of
     wrapping the action row; the paragraph's measure sets the resting width. */
  .stub {
    grid-column: 1 / -1;
    justify-self: center;
    max-width: 100%;
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
    max-width: 60ch;
  }

  code {
    background: var(--surface-neutral-high);
    padding: var(--space-2) var(--space-6);
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

  .selectors {
    display: flex;
    flex-wrap: wrap;
    gap: var(--space-20);
    margin-top: var(--space-24);
  }

  @media (max-width: 600px) {
    .actions {
      flex-direction: column;
      align-items: stretch;
    }

    .actions :global(.push-right) {
      margin-left: 0;
    }
  }
</style>
