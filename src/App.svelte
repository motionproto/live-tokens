<script lang="ts">
  import Home from './pages/Home.svelte';
  import Demo from './pages/Demo.svelte';
  import Editor from './pages/Editor.svelte';
  import ComponentEditorPage from './pages/ComponentEditorPage.svelte';
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
  $: isEditor = isDev && $route === '/editor';
  $: isDemo = isDev && $route === '/demo';
  $: isComponentEditor = isDev && $route === '/components';
</script>

<!-- svelte-ignore a11y-click-events-have-key-events a11y-no-noninteractive-element-interactions -->
<div class="lt-app" class:is-editor={isEditor} class:is-component-editor={isComponentEditor} on:click={handleClick}>
  <LiveEditorOverlay
    navLinks={[
      { path: '/', label: 'Home', icon: 'fa-home' },
      { path: '/demo', label: 'Demo', icon: 'fa-box-open' },
      { path: '/components', label: 'Components', icon: 'fa-puzzle-piece' },
    ]}
    pageSources={{
      '/': 'src/pages/Home.svelte',
      '/demo': 'src/pages/Demo.svelte',
      '/components': 'src/pages/ComponentEditorPage.svelte',
      '/editor': 'src/pages/Editor.svelte',
    }}
    hidePageSourceOn={['/components']}
  />
  <ColumnsOverlay />

  {#if isEditor}
    <Editor />
  {:else if isDemo}
    <Demo />
  {:else if isComponentEditor}
    <ComponentEditorPage />
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

  .lt-app.is-editor {
    padding-bottom: 0;
    background: black;
  }

  .lt-app.is-component-editor {
    min-height: 0;
    height: 100vh;
    padding-bottom: 0;
    background: black;
    overflow: hidden;
  }
</style>
