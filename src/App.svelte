<script lang="ts">
  import Landing from './pages/Landing.svelte';
  import Admin from './pages/Admin.svelte';
  import ComponentsPage from './pages/ComponentsPage.svelte';
  import LiveEditorOverlay from './lib/LiveEditorOverlay.svelte';
  import ColumnsOverlay from './lib/ColumnsOverlay.svelte';
  import { route, navigate } from './router';

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
  const isInIframe = typeof window !== 'undefined' && window.parent !== window;
  $: isAdmin = isDev && $route === '/admin';
  $: isComponents = isDev && $route === '/components';

  let overlayOpen = isDev && !isInIframe && loadOverlayOpen();

  function loadOverlayOpen(): boolean {
    try {
      return localStorage.getItem('lt-overlay-open') === '1';
    } catch {
      return false;
    }
  }

  $: if (typeof window !== 'undefined') {
    try { localStorage.setItem('lt-overlay-open', overlayOpen ? '1' : '0'); } catch {}
  }
</script>

<!-- svelte-ignore a11y-click-events-have-key-events a11y-no-noninteractive-element-interactions -->
<div class="lt-app" class:is-admin={isAdmin} on:click={handleClick}>
  {#if isDev && !isAdmin && !isInIframe}
    <LiveEditorOverlay bind:open={overlayOpen} />
    <ColumnsOverlay />
  {/if}

  {#if isAdmin}
    <Admin />
  {:else if isComponents}
    <ComponentsPage />
  {:else}
    <Landing />
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
</style>
