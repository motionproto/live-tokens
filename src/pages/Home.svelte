<script lang="ts">
  import Card from '../components/Card.svelte';
  import Button from '../components/Button.svelte';
  import { navigate } from '../lib/router';

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
          <Button on:click={() => navigate('/kit')}>See what the kit does</Button>
          <Button variant="secondary" on:click={() => navigate('/editor')}>Open Design System</Button>
        </div>
      {/if}
    </Card>
  </section>
</div>

<style>
  .home {
    display: flex;
    align-items: center;
    justify-content: center;
    min-height: 100vh;
    padding: var(--space-40) var(--space-24);
    max-width: 720px;
    margin: 0 auto;
  }

  .stub {
    width: 100%;
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

  h1 {
    font-family: var(--font-display);
    font-size: var(--font-4xl);
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
