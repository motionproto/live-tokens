<script lang="ts">
  // site.css carries themed page typography (bare h1/p/a rules that consume
  // theme tokens). Imported per-page, not globally, so the editor routes stay
  // theme-immune. It's yours to edit; see src/styles/site.css.
  import '../styles/site.css';
  import Card from '@motion-proto/live-tokens/components/Card.svelte';
  import Button from '@motion-proto/live-tokens/components/Button.svelte';
  import { navigate } from '@motion-proto/live-tokens';

  const isDev = import.meta.env.DEV;
</script>

<div class="home">
  <section class="stub">
    <Card variant="bare">
      <h1>Home</h1>
      <p>
        Replace this with your own content. Edit <code>src/pages/Home.svelte</code>
        to get started, or add routes in <code>src/App.svelte</code>. Components
        and theme tokens are editable live while <code>npm run dev</code> is running.
      </p>
      {#if isDev}
        <div class="actions">
          <Button onclick={() => navigate('/live-tokens/editor')}>Open Token Editor</Button>
          <Button variant="secondary" onclick={() => navigate('/live-tokens/components')}>Components</Button>
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

  code {
    background: var(--surface-neutral-high);
    padding: var(--space-2) var(--space-6);
    border-radius: var(--radius-sm);
  }

  .actions {
    display: flex;
    gap: var(--space-8);
    flex-wrap: wrap;
    margin-top: var(--space-20);
  }

  /* The theme's own column gutter alone exceeds a phone's width at 12
     columns, so every page has to collapse to one column below 768px. */
  @media (max-width: 767px) {
    .home {
      grid-template-columns: 1fr;
      column-gap: 0;
    }

    .stub {
      grid-column: 1 / -1;
    }
  }
</style>
