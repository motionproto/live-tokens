<script module lang="ts">
  import type { Component } from 'svelte';

  /**
   * One entry per consumer route. `label` + `icon` make it appear in the
   * overlay's nav rail; `source` powers the "Page Source" button. Omit
   * `label` to keep the route reachable by URL but absent from the rail
   * (matches the existing playground/unlisted route pattern).
   *
   * Provide either `component` (eager) or `lazy` (code-split). Use `lazy`
   * for any page that side-effect-imports a stylesheet at the top of its
   * module, so those imports only evaluate when the route is visited and
   * don't leak into unrelated routes (most importantly the editor pages).
   *
   * `props` lets one page component serve many paths: a `resolve()` match can
   * hand the page the matched segment (an id or slug) so a single component
   * renders each dynamic route.
   */
  export interface RouteEntry {
    component?: Component<any, any, any>;
    lazy?: () => Promise<{ default: Component<any, any, any> }>;
    props?: Record<string, unknown>;
    label?: string;
    icon?: string;
    source?: string;
    /** Hide the overlay's "Page Source" button on this route. */
    hidePageSource?: boolean;
  }

  /**
   * Override the default editor routes (`/editor`, `/components`, `/docs`).
   * Pass a string to relocate the route; pass `false` to disable it entirely
   * (no dispatch and, for `components`/`docs`, no auto-injected nav-rail entry).
   */
  export interface EditorRouteOverrides {
    editor?: string | false;
    components?: string | false;
    docs?: string | false;
  }

  /**
   * Resolve a path to the single entry that renders it. Precedence, after the
   * package-owned routes (`/editor`, `/components`, `/docs`) have already been
   * matched by the component:
   *
   *   1. `pages[route]` — exact static match.
   *   2. `resolve(route)` — consumer code, where params / prefixes / gating
   *      live; returning `null` means "not mine" and resolution falls through.
   *   3. `pages['/']` — final fallback (return your own entry from `resolve`
   *      for a real 404 instead).
   *
   * With only `pages` passed this is exactly today's `pages[route] ?? pages['/']`.
   * One resolved entry drives both dispatch and "Page Source", so a dynamic
   * route's source can never desync from its page.
   */
  export function resolveRoute(
    pages: Record<string, RouteEntry>,
    resolve: ((route: string) => RouteEntry | null) | undefined,
    route: string,
  ): RouteEntry | null {
    return pages[route] ?? resolve?.(route) ?? pages['/'] ?? null;
  }
</script>

<script lang="ts">
  import LiveEditorOverlay from './LiveEditorOverlay.svelte';
  import ColumnsOverlay from './ColumnsOverlay.svelte';
  import { route, navigate } from '../core/routing/router';

  interface Props {
    pages: Record<string, RouteEntry>;
    /**
     * Compute an entry for paths not in `pages` — this is where params,
     * prefixes, and conditional gating live. See `resolveRoute` for the full
     * precedence: `pages` wins over `resolve`, and `pages['/']` is the final
     * fallback.
     */
    resolve?: (route: string) => RouteEntry | null;
    editorRoutes?: EditorRouteOverrides;
  }

  let { pages, resolve, editorRoutes = {} }: Props = $props();

  let editorEnabled = $derived(editorRoutes.editor !== false);
  let componentsEnabled = $derived(editorRoutes.components !== false);
  let docsEnabled = $derived(editorRoutes.docs !== false);
  let editorPath = $derived(typeof editorRoutes.editor === 'string' ? editorRoutes.editor : '/editor');
  let componentsPath = $derived(typeof editorRoutes.components === 'string' ? editorRoutes.components : '/components');
  let docsPath = $derived(typeof editorRoutes.docs === 'string' ? editorRoutes.docs : '/docs');

  const isDev = import.meta.env.DEV;
  let isEditor = $derived(isDev && editorEnabled && $route === editorPath);
  let isComponentEditor = $derived(isDev && componentsEnabled && $route === componentsPath);
  let isDocs = $derived(isDev && docsEnabled && $route === docsPath);

  // The single entry that renders the current route. Owned routes are handled
  // by the isEditor/isComponentEditor/isDocs branches, so they resolve to null
  // here; everything else flows through resolveRoute and drives both dispatch
  // (component + props) and page-source from this one value.
  let resolvedEntry = $derived(
    isEditor || isComponentEditor || isDocs ? null : resolveRoute(pages, resolve, $route),
  );

  // Pages with a label show up in the nav rail, in declaration order. In dev,
  // the components-editor and docs routes are auto-appended so they're reachable
  // from every page. Docs ship from the package, so consumers reference the
  // guide in the editor while building without vendoring a copy.
  let navLinks = $derived([
    ...Object.entries(pages)
      .filter(([, e]) => !!e.label)
      .map(([path, e]) => ({ path, label: e.label!, icon: e.icon ?? '' })),
    ...(isDev && componentsEnabled
      ? [{ path: componentsPath, label: 'Components', icon: 'fa-puzzle-piece' }]
      : []),
    ...(isDev && docsEnabled
      ? [{ path: docsPath, label: 'Docs', icon: 'fa-book' }]
      : []),
  ]);

  // Static-page sources, plus the resolved entry's source for the current
  // route — so a resolve()-matched dynamic route gets "Page Source" too, keyed
  // on the live path ($route) the overlay looks up.
  let pageSources = $derived({
    ...Object.fromEntries(
      Object.entries(pages)
        .filter(([, e]) => !!e.source)
        .map(([path, e]) => [path, e.source!]),
    ),
    ...(resolvedEntry?.source ? { [$route]: resolvedEntry.source } : {}),
  });

  // The package-owned components and docs routes hide the page-source button
  // (no consumer source file backs them).
  let hidePageSourceOn = $derived([
    ...Object.entries(pages)
      .filter(([, e]) => e.hidePageSource)
      .map(([path]) => path),
    ...(resolvedEntry?.hidePageSource ? [$route] : []),
    ...(componentsEnabled ? [componentsPath] : []),
    ...(docsEnabled ? [docsPath] : []),
  ]);

  // Dispatch the current route. Editor pages are dynamically imported so they
  // don't ship in non-editor route bundles. Consumer pages dispatch via
  // `entry.lazy()` when provided (so each page's CSS side-effect imports stay
  // out of other routes), or via the eagerly-imported `entry.component`.
  let pagePromise = $derived.by(() => {
    if (isEditor) return import('../pages/Editor.svelte');
    if (isComponentEditor) return import('../pages/ComponentEditorPage.svelte');
    if (isDocs) return import('../docs/Docs.svelte');
    const entry = resolvedEntry;
    if (!entry) return Promise.resolve({ default: null as unknown as Component<any, any, any> });
    if (entry.lazy) return entry.lazy();
    if (entry.component) return Promise.resolve({ default: entry.component });
    return Promise.resolve({ default: null as unknown as Component<any, any, any> });
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
      <PageComponent {...resolvedEntry?.props ?? {}} />
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
