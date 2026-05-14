<script lang="ts">
  import { run } from 'svelte/legacy';

  import LiveEditorOverlay from './lib/LiveEditorOverlay.svelte';
  import ColumnsOverlay from './lib/ColumnsOverlay.svelte';
  import { route, navigate } from './lib/router';
  import { editorView } from './lib/editorViewStore';

  const allNavLinks = [
    { path: '/', label: 'Site', icon: 'fa-home' },
    { path: '/demo', label: 'Demo', icon: 'fa-box-open' },
    { path: '/components', label: 'Components', icon: 'fa-puzzle-piece' },
  ];

  let visibleNavLinks = $derived(allNavLinks);

  // The /components page and the overlay's components view are the same surface.
  // Keep them mutually exclusive by flipping the overlay to tokens whenever the
  // underlying page is /components, so they pair as page+overlay instead of
  // stacking on top of each other.
  run(() => {
    if ($route === '/components' && $editorView === 'components') {
      editorView.set('tokens');
    }
  });

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
  let isEditor = $derived(isDev && $route === '/editor');
  let isDemo = $derived(isDev && $route === '/demo');
  let isComponentEditor = $derived(isDev && $route === '/components');

  // Pages are loaded dynamically so each route's module — and any CSS it
  // side-effect-imports (e.g. site.css on Home/Demo) — only evaluates when that
  // route is actually visited. Static imports at the top of this file would
  // evaluate every page module at boot, leaking site.css into editor routes.
  let pagePromise = $derived.by(() => {
    if (isEditor) return import('./pages/Editor.svelte');
    if (isDemo) return import('./pages/Demo.svelte');
    if (isComponentEditor) return import('./pages/ComponentEditorPage.svelte');
    return import('./pages/Home.svelte');
  });
</script>

<!-- svelte-ignore a11y_click_events_have_key_events, a11y_no_noninteractive_element_interactions, a11y_no_static_element_interactions -->
<div class="lt-app" class:is-editor={isEditor} class:is-component-editor={isComponentEditor} onclick={handleClick}>
  <LiveEditorOverlay
    navLinks={visibleNavLinks}
    pageSources={{
      '/': 'src/pages/Home.svelte',
      '/demo': 'src/pages/Demo.svelte',
      '/components': 'src/pages/ComponentEditorPage.svelte',
      '/editor': 'src/pages/Editor.svelte',
    }}
    hidePageSourceOn={['/components']}
  />
  <ColumnsOverlay />

  {#await pagePromise then m}
    {@const PageComponent = m.default}
    <PageComponent />
  {/await}
</div>

<style>
  :global(html) {
    scrollbar-gutter: stable;
  }

  :global(body) {
    background: var(--page-bg);
    background-attachment: var(--page-bg-attachment, fixed);
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
