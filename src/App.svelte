<script lang="ts">
  import Landing from './pages/Landing.svelte';
  import Admin from './pages/Admin.svelte';
  import ShowcasePage from './pages/ShowcasePage.svelte';
  import LiveEditorOverlay from './lib/LiveEditorOverlay.svelte';
  import ColumnsOverlay from './lib/ColumnsOverlay.svelte';
  import { storageKey } from './lib/editorConfig';
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
  const isInIframe = typeof window !== 'undefined' && window.parent !== window;
  $: isAdmin = isDev && $route === '/admin';
  $: isShowcase = isDev && $route === '/components';

  let overlayOpen = isDev && !isInIframe && loadOverlayOpen();

  function loadOverlayOpen(): boolean {
    try {
      return localStorage.getItem(storageKey('overlay-open')) === '1';
    } catch {
      return false;
    }
  }

  $: if (typeof window !== 'undefined') {
    try { localStorage.setItem(storageKey('overlay-open'), overlayOpen ? '1' : '0'); } catch {}
  }
</script>

<!-- svelte-ignore a11y-click-events-have-key-events a11y-no-noninteractive-element-interactions -->
<div class="lt-app" class:is-admin={isAdmin} on:click={handleClick}>
  {#if isDev && !isAdmin && !isInIframe}
    <LiveEditorOverlay
      bind:open={overlayOpen}
      navLinks={[
        { path: '/', label: 'Site', icon: 'fa-home' },
        { path: '/components', label: 'Components', icon: 'fa-puzzle-piece' },
      ]}
      pageSources={{
        '/': 'src/pages/Landing.svelte',
        '/components': 'src/pages/ShowcasePage.svelte',
        '/admin': 'src/pages/Admin.svelte',
      }}
    />
    <ColumnsOverlay />
  {/if}

  {#if isAdmin}
    <Admin />
  {:else if isShowcase}
    <ShowcasePage />
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
