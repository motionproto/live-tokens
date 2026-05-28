<script module lang="ts">
  import type { Component } from 'svelte';

  /**
   * One entry per consumer route. `label` + `icon` make it appear in the
   * overlay's nav rail; `source` powers the "Page Source" button. Omit
   * `label` to keep the route reachable by URL but absent from the rail
   * (matches the existing playground/unlisted route pattern).
   */
  export interface RouteEntry {
    component: Component<any, any, any>;
    label?: string;
    icon?: string;
    source?: string;
    /** Hide the overlay's "Page Source" button on this route. */
    hidePageSource?: boolean;
  }

  /** Override the default editor routes ('/editor', '/components') if a host needs them elsewhere. */
  export interface EditorRouteOverrides {
    editor?: string;
    components?: string;
  }
</script>

<script lang="ts">
  import LiveEditorOverlay from './LiveEditorOverlay.svelte';
  import ColumnsOverlay from './ColumnsOverlay.svelte';
  import { route, navigate } from '../core/routing/router';

  interface Props {
    pages: Record<string, RouteEntry>;
    editorRoutes?: EditorRouteOverrides;
  }

  let { pages, editorRoutes = {} }: Props = $props();

  let editorPath = $derived(editorRoutes.editor ?? '/editor');
  let componentsPath = $derived(editorRoutes.components ?? '/components');

  const isDev = import.meta.env.DEV;
  let isEditor = $derived(isDev && $route === editorPath);
  let isComponentEditor = $derived(isDev && $route === componentsPath);

  // Pages with a label show up in the nav rail, in declaration order. In dev,
  // the components-editor route is auto-appended so it's reachable from every
  // page (the convention every existing live-tokens consumer has settled on).
  let navLinks = $derived([
    ...Object.entries(pages)
      .filter(([, e]) => !!e.label)
      .map(([path, e]) => ({ path, label: e.label!, icon: e.icon ?? '' })),
    ...(isDev
      ? [{ path: componentsPath, label: 'Components', icon: 'fa-puzzle-piece' }]
      : []),
  ]);

  let pageSources = $derived(
    Object.fromEntries(
      Object.entries(pages)
        .filter(([, e]) => !!e.source)
        .map(([path, e]) => [path, e.source!]),
    ),
  );

  // Components-editor route always hides the page-source button (matches the
  // convention from the original consumer pattern).
  let hidePageSourceOn = $derived([
    ...Object.entries(pages)
      .filter(([, e]) => e.hidePageSource)
      .map(([path]) => path),
    componentsPath,
  ]);

  // Dispatch the current route. Editor pages are dynamically imported so they
  // don't ship in non-editor route bundles. Consumer pages are passed as
  // already-imported Svelte components, so no dynamic import is needed for
  // those — `pagePromise` resolves synchronously to keep the await/then shape.
  let pagePromise = $derived.by(() => {
    if (isEditor) return import('../pages/Editor.svelte');
    if (isComponentEditor) return import('../pages/ComponentEditorPage.svelte');
    const entry = pages[$route] ?? pages['/'];
    return entry
      ? Promise.resolve({ default: entry.component })
      : Promise.resolve({ default: null as unknown as Component<any, any, any> });
  });

  // In-app link interception: turn left-clicks on internal `/...` anchors into
  // navigate() calls so router state updates without a full reload. Modifier
  // keys (cmd/ctrl/shift/alt) pass through to the browser's default handling.
  function handleClick(e: MouseEvent) {
    const anchor = (e.target as HTMLElement).closest('a[href]');
    if (!anchor) return;
    const href = anchor.getAttribute('href');
    if (!href || !href.startsWith('/')) return;
    if (e.ctrlKey || e.metaKey || e.shiftKey || e.altKey) return;
    e.preventDefault();
    navigate(href);
  }
</script>

<!-- svelte-ignore a11y_click_events_have_key_events, a11y_no_noninteractive_element_interactions, a11y_no_static_element_interactions -->
<div
  class="lt-app"
  class:is-editor={isEditor}
  class:is-component-editor={isComponentEditor}
  onclick={handleClick}
>
  <LiveEditorOverlay {navLinks} {pageSources} {hidePageSourceOn} {editorPath} />
  <ColumnsOverlay />

  {#await pagePromise then m}
    {@const PageComponent = m.default}
    {#if PageComponent}
      <PageComponent />
    {/if}
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
    /* Set by LiveEditorOverlay when docked-open. Extends layout past the
       fixed panel so the viewport can scroll to reveal hidden content. */
    padding-right: var(--lt-overlay-scroll-pad, 0px);
  }

  .lt-app.is-editor {
    padding-bottom: 0;
    background: black;
  }

  .lt-app.is-component-editor {
    min-height: 0;
    height: 100vh;
    padding-bottom: 0;
    padding-right: 0;
    background: black;
    overflow: hidden;
  }
</style>
