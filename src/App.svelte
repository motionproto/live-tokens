<script lang="ts">
  import Home from './pages/Home.svelte';
  import KitDemo from './pages/KitDemo.svelte';
  import Admin from './pages/Admin.svelte';
  import ShowcasePage from './pages/ShowcasePage.svelte';
  import LiveEditorOverlay from './lib/LiveEditorOverlay.svelte';
  import ColumnsOverlay from './lib/ColumnsOverlay.svelte';
  import { route, navigate } from './lib/router';

  function handleClick(e: MouseEvent) {
    const anchor = (e.target as HTMLElement).closest('a[href]');
    if (!anchor) return;
    const href = anchor.getAttribute('href');
    if (!href || !href.startsWith('/')) return;
    if (e.ctrlKey || e.metaKey || e.shiftKey || e.altKey) return;
    e.preventDefault();
    navigate(href);
  }

  const isDev = import.meta.env.DEV;
  $: isAdmin = isDev && $route === '/admin';
  $: isKit = isDev && $route === '/kit';
  $: isShowcase = isDev && $route === '/components';
</script>

<!-- svelte-ignore a11y-click-events-have-key-events a11y-no-noninteractive-element-interactions -->
<div class="lt-app" class:is-admin={isAdmin} class:is-showcase={isShowcase} on:click={handleClick}>
  <LiveEditorOverlay
    navLinks={[
      { path: '/', label: 'Home', icon: 'fa-home' },
      { path: '/kit', label: 'Kit', icon: 'fa-box-open' },
      { path: '/components', label: 'Components', icon: 'fa-puzzle-piece' },
    ]}
    pageSources={{
      '/': 'src/pages/Home.svelte',
      '/kit': 'src/pages/KitDemo.svelte',
      '/components': 'src/pages/ShowcasePage.svelte',
      '/admin': 'src/pages/Admin.svelte',
    }}
  />
  <ColumnsOverlay />

  {#if isAdmin}
    <Admin />
  {:else if isKit}
    <KitDemo />
  {:else if isShowcase}
    <ShowcasePage />
  {:else}
    <Home />
  {/if}
</div>

<style>
  :global(body) {
    background: var(--empty);
    background-attachment: var(--empty-attachment, fixed);
  }

  .lt-app {
    width: 100%;
    min-height: 100vh;
    color: var(--text-primary);
    padding-bottom: 12rem;
  }

  .lt-app.is-admin {
    padding-bottom: 0;
    background: black;
  }

  .lt-app.is-showcase {
    min-height: 0;
    height: 100vh;
    padding-bottom: 0;
    background: black;
    overflow: hidden;
  }
</style>
