<script module lang="ts">
  // __PROJECT_ROOT__ / __APP_VERSION__ are Vite-injected defines.
  declare const __PROJECT_ROOT__: string | undefined;
  declare const __APP_VERSION__: string | undefined;
  const INJECTED_PROJECT_ROOT: string =
    typeof __PROJECT_ROOT__ !== 'undefined' ? (__PROJECT_ROOT__ ?? '') : '';
  const APP_VERSION: string =
    typeof __APP_VERSION__ !== 'undefined' ? (__APP_VERSION__ ?? '') : '';
</script>

<script lang="ts">
  import { run } from 'svelte/legacy';

  import { onMount, onDestroy } from 'svelte';
  import { fade } from 'svelte/transition';
  import { cubicInOut } from 'svelte/easing';
  import { route, navigate } from '../core/routing/router';
  import { DEFAULT_EDITOR_PATH, DEFAULT_COMPONENTS_PATH, DEFAULT_COLORS_PATH } from '../core/routing/ownedRoutes';
  import { editorView } from '../core/store/editorViewStore';
  import { columnsVisible, toggleColumns } from './columnsOverlay';
  import { storageKey } from '../core/store/editorConfig';
  import { overlayOpen } from './overlayState';
  import { quietGet, quietSet } from '../core/storage/storage';
  import { postParentRoute } from '../core/routing/parentRouteStore';
  import UIPillButton from '../ui/UIPillButton.svelte';
  import type { NavLink } from '../core/routing/navLinkTypes';

  interface Props {
    open?: boolean | undefined;
    editorPath?: string;
    componentsPath?: string;
    colorsPath?: string;
    navLinks?: NavLink[];
    pageSources?: Record<string, string>;
    hidePageSourceOn?: string[];
    projectRoot?: string;
  }

  let {
    open = $bindable(undefined),
    editorPath = DEFAULT_EDITOR_PATH,
    componentsPath = DEFAULT_COMPONENTS_PATH,
    colorsPath = DEFAULT_COLORS_PATH,
    navLinks = [],
    pageSources = {},
    hidePageSourceOn = [],
    projectRoot = INJECTED_PROJECT_ROOT
  }: Props = $props();

  // Dev-only; skip inside iframe (editor route embeds this app).
  const isDev = import.meta.env.DEV;
  const isInIframe = typeof window !== 'undefined' && window.parent !== window;
  const enabled = isDev && !isInIframe;

  // Persist `open` only when consumer doesn't bind it.
  const OPEN_KEY = storageKey('overlay-open');
  const consumerControlsOpen = open !== undefined;
  if (!consumerControlsOpen) {
    open = enabled && quietGet(OPEN_KEY) === '1';
  }
  run(() => {
    if (!consumerControlsOpen && typeof window !== 'undefined') {
      quietSet(OPEN_KEY, open ? '1' : '0');
    }
  });
  run(() => {
    overlayOpen.set(!!open);
  });

  // The components and colors routes render the same surfaces as the overlay's
  // components and colors views. Pair them: on entering one, flip the overlay
  // to tokens so the two surfaces don't stack. Fires only on route
  // change, not on every editorView change — otherwise cross-window storage
  // sync re-triggers the rule, which writes editorView, which fires another
  // storage event, which fires the rule again. The result is heavy re-render
  // cascades (the storage handler regularly took >1s in practice) and a
  // visible flicker as the view bounces.
  let prevRoute: string | undefined;
  run(() => {
    const r = $route;
    if (r === prevRoute) return;
    prevRoute = r;
    if (r === componentsPath) {
      editorView.update((v) => (v === 'components' ? 'tokens' : v));
    }
    if (r === colorsPath) {
      editorView.update((v) => (v === 'colors' ? 'tokens' : v));
    }
  });

  // Editor route has its own chrome — hide overlay there.
  let onEditorPath = $derived($route === editorPath);
  let sourceFile = $derived(pageSources[$route]);
  let showSource = $derived(!!sourceFile && !!projectRoot && !hidePageSourceOn.includes($route));

  // Mount iframe on first open, then keep it to preserve editor state across hide/show.
  let hasBeenOpen: boolean = $state(!!open);
  run(() => {
    if (open) hasBeenOpen = true;
  });

  let editorFrame: HTMLIFrameElement | undefined = $state();
  run(() => {
    postParentRoute(editorFrame?.contentWindow, $route);
  });

  type Mode = 'docked' | 'floating';
  type Side = 'left' | 'right';

  const STORAGE_KEY = storageKey('overlay-state');
  const MIN_WIDTH = 360;
  const MIN_HEIGHT = 480;

  // Collapsed-pill size; slight overshoot is fine (overflow:hidden).
  const COLLAPSED_WIDTH = 252;
  const COLLAPSED_HEIGHT = 44;
  const COLLAPSED_DEFAULT = { right: 12, top: 12 };

  // Drop the pill this close to an edge and it docks there.
  const DOCK_EDGES = ['left', 'right', 'top', 'bottom'] as const;
  const DOCK_SNAP = 20;
  // Leaving a dock is resisted across twice that distance, so the edge holds
  // unless the drag is deliberate.
  const DOCK_PULL = DOCK_SNAP * 2;
  // A press that travels this far is a drag, and must not also fire a click.
  const DRAG_SLOP = 16;
  // Mirror the pill motion timings in CSS below.
  const SNAP_DUR = 200;
  const SETTLE_DUR = 300;
  const DEFAULT_DOCKED_WIDTH = Math.min(960, Math.floor(window.innerWidth * 0.55));
  const DEFAULT_FLOATING = {
    x: Math.max(16, window.innerWidth - 960 - 32),
    y: 64,
    width: 960,
    height: Math.min(880, window.innerHeight - 96),
  };

  // The collapsed pill is placed from the right and top edges whichever side it
  // docks to, so that every dock is a value change on one of those two axes and
  // stays animatable. A left dock is right: <the far end>, not left: 0.
  type DockEdge = 'none' | (typeof DOCK_EDGES)[number];

  interface CollapsedState {
    right: number;
    top: number;
    edge: DockEdge;
  }

  function parseEdge(value: unknown): DockEdge {
    return DOCK_EDGES.find((e) => e === value) ?? 'none';
  }

  // A fixed element's offsets resolve against the viewport without its
  // scrollbars, which is what documentElement.clientWidth/Height report.
  // window.innerWidth counts the scrollbar, and pinning a dock with it hangs
  // the pill off the edge by the scrollbar's width.
  let viewport = $state({
    width: document.documentElement.clientWidth,
    height: document.documentElement.clientHeight,
  });

  function maxRight() {
    return Math.max(0, viewport.width - COLLAPSED_WIDTH);
  }

  function maxTop() {
    return Math.max(0, viewport.height - COLLAPSED_HEIGHT);
  }

  interface OverlayState {
    mode: Mode;
    dockSide: Side;
    dockedWidth: number;
    floating: { x: number; y: number; width: number; height: number };
    collapsed: CollapsedState;
  }

  function loadState(): OverlayState {
    const parsed = quietGet<Partial<OverlayState>>(STORAGE_KEY, { parse: true });
    if (parsed && typeof parsed === 'object') {
      return {
        mode: parsed.mode === 'floating' ? 'floating' : 'docked',
        dockSide: parsed.dockSide === 'left' ? 'left' : 'right',
        dockedWidth: typeof parsed.dockedWidth === 'number' ? parsed.dockedWidth : DEFAULT_DOCKED_WIDTH,
        floating: {
          x: parsed.floating?.x ?? DEFAULT_FLOATING.x,
          y: parsed.floating?.y ?? DEFAULT_FLOATING.y,
          width: parsed.floating?.width ?? DEFAULT_FLOATING.width,
          height: parsed.floating?.height ?? DEFAULT_FLOATING.height,
        },
        collapsed: {
          right: parsed.collapsed?.right ?? COLLAPSED_DEFAULT.right,
          top: parsed.collapsed?.top ?? COLLAPSED_DEFAULT.top,
          edge: parseEdge(parsed.collapsed?.edge),
        },
      };
    }
    return {
      mode: 'docked',
      dockSide: 'right',
      dockedWidth: DEFAULT_DOCKED_WIDTH,
      floating: { ...DEFAULT_FLOATING },
      collapsed: { ...COLLAPSED_DEFAULT, edge: 'none' },
    };
  }

  function persist() {
    quietSet(STORAGE_KEY, JSON.stringify({ mode, dockSide, dockedWidth, floating, collapsed }));
  }

  const initial = loadState();
  let mode: Mode = $state(initial.mode);
  let dockSide: Side = $state(initial.dockSide);
  let dockedWidth: number = $state(Math.max(MIN_WIDTH, initial.dockedWidth));
  let floating = $state({ ...initial.floating });
  let collapsed: CollapsedState = $state({ ...initial.collapsed });

  // A docked pill tucks off the edge; its tab pulls it back out.
  let dockExpanded = $state(false);
  // Set once a press passes DRAG_SLOP, and consumed by the click it precedes.
  let dragged = false;
  let snapping = $state(false);
  let settling = $state(false);
  let snapTimer: ReturnType<typeof setTimeout> | undefined;
  let settleTimer: ReturnType<typeof setTimeout> | undefined;

  // Fade for open-only buttons (bar timing lives in CSS vars below).
  const BTN_FADE = { duration: 130, easing: cubicInOut };

  // Mirror the CSS bar timings; used for the fallback that clears the mask if
  // no transitionend fires (reduced motion, suppressed transitions, no delta).
  const OPEN_DUR = 240;
  const CLOSE_DUR = 240;
  const CLOSE_DELAY = 120; // matches --bar-close-delay: collapse waits for the fade-out

  // Suppress CSS transitions during gestures + mode swaps.
  let suppressTransition = $state(false);

  // Mask the iframe during the pill↔full size change so the editor route's
  // reflow (side-nav scrollbar, white body) never shows. On open, content fades
  // in once the panel settles; on close, content fades out first, then the
  // panel collapses (the shrink is delayed by --bar-close-delay to wait for it).
  let opening = $state(false);
  let closing = $state(false);
  let prevOpen = open;
  let maskTimer: ReturnType<typeof setTimeout> | undefined;
  run(() => {
    if (open === prevOpen) return;
    prevOpen = open;
    clearTimeout(maskTimer);
    if (open) {
      closing = false;
      opening = true;
      dockExpanded = false;
      if (collapsed.edge === 'left' || collapsed.edge === 'right') dockSide = collapsed.edge;
      if (gesturing || suppressTransition) {
        // .no-transition path: no transitionend will fire, so reveal next frame.
        requestAnimationFrame(() => { opening = false; });
      } else {
        maskTimer = setTimeout(() => { opening = false; }, OPEN_DUR + 60);
      }
    } else {
      opening = false;
      closing = true;
      if (gesturing || suppressTransition) {
        requestAnimationFrame(() => { closing = false; });
      } else {
        maskTimer = setTimeout(() => { closing = false; }, CLOSE_DELAY + CLOSE_DUR + 60);
      }
    }
  });

  function onPanelTransitionEnd(e: TransitionEvent) {
    if (e.target !== e.currentTarget) return;
    if (e.propertyName !== 'width' && e.propertyName !== 'height') return;
    clearTimeout(maskTimer);
    opening = false;
    closing = false;
  }

  // Scrim catches pointer events during gestures so they hit the panel, not the iframe.
  let gesturing: 'drag' | 'resize-dock' | 'resize-se' | 'collapsed-drag' | null = $state(null);

  function startDrag(e: PointerEvent) {
    if (!open || mode !== 'floating') return;
    if ((e.target as HTMLElement).closest('button')) return;
    gesturing = 'drag';
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    const startX = e.clientX;
    const startY = e.clientY;
    const origX = floating.x;
    const origY = floating.y;
    function move(ev: PointerEvent) {
      floating = {
        ...floating,
        x: clamp(origX + (ev.clientX - startX), 0, window.innerWidth - 120),
        y: clamp(origY + (ev.clientY - startY), 0, window.innerHeight - 40),
      };
    }
    function up() {
      gesturing = null;
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
      persist();
    }
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
  }

  // The whole collapsed pill is the drag surface, so a press anywhere on it can
  // become a drag; the buttons under it stay clickable via dragSafe().
  function startCollapsedDrag(e: PointerEvent) {
    const surface = e.currentTarget as HTMLElement;
    const pointerId = e.pointerId;
    const orig = { ...collapsed };
    // The pointer only moves the pill once it has travelled DRAG_SLOP, and it
    // moves from that point rather than from the press, so a click on a button
    // in the pill neither nudges it nor gets retargeted by pointer capture.
    let anchorX = e.clientX;
    let anchorY = e.clientY;

    function move(ev: PointerEvent) {
      if (!dragged) {
        if (Math.hypot(ev.clientX - anchorX, ev.clientY - anchorY) <= DRAG_SLOP) return;
        dragged = true;
        gesturing = 'collapsed-drag';
        anchorX = ev.clientX;
        anchorY = ev.clientY;
        surface.setPointerCapture(pointerId);
      }
      const dx = ev.clientX - anchorX;
      const dy = ev.clientY - anchorY;

      let right = clamp(orig.right - dx, 0, maxRight());
      let top = clamp(orig.top + dy, 0, maxTop());

      // Sticky edge: while docked, blend the pill back toward the edge it is on,
      // so pulling off takes a deliberate move rather than a twitch.
      if (collapsed.edge === 'right') right = resist(right, 0);
      else if (collapsed.edge === 'left') right = resist(right, maxRight());
      else if (collapsed.edge === 'top') top = resist(top, 0);
      else if (collapsed.edge === 'bottom') top = resist(top, maxTop());

      const edge = nearestEdge(right, top);
      if (edge === 'right') right = 0;
      else if (edge === 'left') right = maxRight();
      else if (edge === 'top') top = 0;
      else if (edge === 'bottom') top = maxTop();

      if (edge !== 'none' && edge !== collapsed.edge) {
        // Animate the last pixels to the edge instead of jumping them.
        dockExpanded = false;
        snapping = true;
        clearTimeout(snapTimer);
        snapTimer = setTimeout(() => { snapping = false; }, SNAP_DUR);
      }
      collapsed = { right, top, edge };
    }

    function up() {
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
      if (!dragged) return;
      gesturing = null;
      snapping = false;
      clearTimeout(snapTimer);
      settling = true;
      clearTimeout(settleTimer);
      settleTimer = setTimeout(() => { settling = false; }, SETTLE_DUR + 40);
      persist();
    }

    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
  }

  function onHeaderPointerDown(e: PointerEvent) {
    dragged = false;
    if (open) startDrag(e);
    else startCollapsedDrag(e);
  }

  // Mirrors applySnapResistance in the source toolbar: the closer the pill is to
  // the edge it is docked on, the harder it pulls back to it.
  function resist(value: number, anchor: number) {
    const delta = Math.abs(value - anchor);
    if (delta >= DOCK_PULL) return value;
    const factor = 1 - delta / DOCK_PULL;
    return value * (1 - factor) + anchor * factor;
  }

  function nearestEdge(right: number, top: number): DockEdge {
    const distances = [
      { edge: 'right' as const, distance: right },
      { edge: 'left' as const, distance: maxRight() - right },
      { edge: 'top' as const, distance: top },
      { edge: 'bottom' as const, distance: maxTop() - top },
    ];
    const nearest = distances.reduce((a, b) => (b.distance < a.distance ? b : a));
    return nearest.distance < DOCK_SNAP ? nearest.edge : 'none';
  }

  // A press that turned into a drag must not also fire the button it landed on.
  function dragSafe(fn: () => void) {
    return () => {
      if (dragged) return;
      fn();
    };
  }

  function toggleDock() {
    if (collapsed.edge === 'none') return;
    dockExpanded = !dockExpanded;
  }

  function onViewportResize() {
    viewport = {
      width: document.documentElement.clientWidth,
      height: document.documentElement.clientHeight,
    };
    clampCollapsed();
  }

  function clampCollapsed() {
    const { edge } = collapsed;
    collapsed = {
      edge,
      right: edge === 'left' ? maxRight() : edge === 'right' ? 0 : clamp(collapsed.right, 0, maxRight()),
      top: edge === 'bottom' ? maxTop() : edge === 'top' ? 0 : clamp(collapsed.top, 0, maxTop()),
    };
  }

  function startDockedResize(e: PointerEvent) {
    if (!open || mode !== 'docked') return;
    gesturing = 'resize-dock';
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    const startX = e.clientX;
    const origWidth = dockedWidth;
    function move(ev: PointerEvent) {
      // The panel is pinned to its docked side, so dragging away from that side
      // is what grows it.
      const grow = dockSide === 'left' ? ev.clientX - startX : startX - ev.clientX;
      dockedWidth = clamp(origWidth + grow, MIN_WIDTH, viewport.width - 120);
    }
    function up() {
      gesturing = null;
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
      persist();
    }
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
  }

  function startFloatingResize(e: PointerEvent) {
    if (!open || mode !== 'floating') return;
    gesturing = 'resize-se';
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    const startX = e.clientX;
    const startY = e.clientY;
    const origW = floating.width;
    const origH = floating.height;
    function move(ev: PointerEvent) {
      floating = {
        ...floating,
        width: clamp(origW + (ev.clientX - startX), MIN_WIDTH, window.innerWidth - floating.x - 8),
        height: clamp(origH + (ev.clientY - startY), MIN_HEIGHT, window.innerHeight - floating.y - 8),
      };
    }
    function up() {
      gesturing = null;
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
      persist();
    }
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
  }

  function clamp(v: number, lo: number, hi: number) {
    return Math.max(lo, Math.min(hi, v));
  }

  function toggleMode() {
    suppressTransition = true;
    mode = mode === 'docked' ? 'floating' : 'docked';
    // Re-clamp floating rect into viewport in case it drifted off-screen.
    if (mode === 'floating') {
      floating = {
        x: clamp(floating.x, 0, window.innerWidth - MIN_WIDTH),
        y: clamp(floating.y, 0, window.innerHeight - 40),
        width: clamp(floating.width, MIN_WIDTH, window.innerWidth),
        height: clamp(floating.height, MIN_HEIGHT, window.innerHeight),
      };
    }
    persist();
    requestAnimationFrame(() => requestAnimationFrame(() => { suppressTransition = false; }));
  }

  function toggleOpen() {
    open = !open;
  }

  function flipDockSide() {
    dockSide = dockSide === 'right' ? 'left' : 'right';
    persist();
  }

  function handleHeaderDblClick(e: MouseEvent) {
    // Skip dblclick on buttons so their handlers don't double-fire, and on the
    // grip so a quick reposition doesn't open the editor.
    if ((e.target as HTMLElement).closest('button')) return;
    if (dragged) return;
    toggleOpen();
  }

  function handleToggleRequest() {
    open = !open;
  }

  onMount(() => {
    window.addEventListener('lt-overlay-toggle', handleToggleRequest);
    window.addEventListener('resize', onViewportResize);
    onViewportResize();
  });
  onDestroy(() => {
    window.removeEventListener('lt-overlay-toggle', handleToggleRequest);
    window.removeEventListener('resize', onViewportResize);
    clearTimeout(maskTimer);
    clearTimeout(snapTimer);
    clearTimeout(settleTimer);
  });

  // A docked pill tucks off its edge the moment it snaps, mid-drag included, so
  // that reaching an edge gets it out of the way instead of parking it against
  // the side. It waits out the collapse animation, so the shrink and the tuck
  // read as one move.
  let tucked = $derived(!open && !closing && !dockExpanded && collapsed.edge !== 'none');
  let dockClass = $derived(!open && collapsed.edge !== 'none' ? `dock-${collapsed.edge}` : '');
  let tabIsHorizontal = $derived(collapsed.edge === 'top' || collapsed.edge === 'bottom');

  let panelStyle = $derived(!open
    ? `position: fixed; top: ${collapsed.top}px; right: ${collapsed.right}px; width: ${COLLAPSED_WIDTH}px; height: ${COLLAPSED_HEIGHT}px;`
    : mode === 'docked'
      // Both sides are pinned with `right`, so flipping side and collapsing to
      // the pill are value changes on one axis, and animate.
      ? `position: fixed; top: 0; right: ${dockSide === 'left' ? Math.max(0, viewport.width - dockedWidth) : 0}px; width: ${dockedWidth}px; height: 100vh;`
      : `position: fixed; top: ${floating.y}px; left: ${floating.x}px; width: ${floating.width}px; height: ${floating.height}px;`);
</script>

{#if enabled && !onEditorPath}
<!-- svelte-ignore a11y_no_static_element_interactions -->
<div
  class="lt-overlay {dockClass}"
  style={panelStyle}
  class:shown={open}
  class:hidden={!open}
  class:docked={open && mode === 'docked'}
  class:side-left={open && mode === 'docked' && dockSide === 'left'}
  class:floating={open && mode === 'floating'}
  class:tucked
  class:dragging={gesturing === 'collapsed-drag'}
  class:snapping
  class:settling
  class:at-edge={gesturing === 'collapsed-drag' && collapsed.edge !== 'none'}
  class:opening={open && opening}
  class:closing={!open && closing}
  class:no-transition={(!!gesturing && gesturing !== 'collapsed-drag') || suppressTransition}
  ontransitionend={onPanelTransitionEnd}
>
  <div
    class="header"
    onpointerdown={onHeaderPointerDown}
    ondblclick={handleHeaderDblClick}
    title={open ? 'Double-click to collapse' : 'Double-click to expand'}
  >
    {#if !open && collapsed.edge !== 'none'}
      <button
        class="tab"
        inert={!tucked}
        onclick={dragSafe(toggleDock)}
        title="Show the editor bar. Drag to undock."
      >
        <i class="fas {tabIsHorizontal ? 'fa-grip' : 'fa-grip-vertical'}"></i>
      </button>
    {/if}

    {#if !open}
      <button
        class="grip"
        inert={tucked}
        onclick={dragSafe(toggleDock)}
        title={collapsed.edge === 'none'
          ? 'Drag to move. Drop at an edge to dock.'
          : 'Tuck to the edge'}
        transition:fade={BTN_FADE}
      >
        <i class="fas fa-grip-vertical"></i>
      </button>
    {/if}

    <button
      class="hdr-btn text title"
      inert={tucked}
      onclick={dragSafe(toggleOpen)}
      title={open ? 'Collapse Editor' : 'Expand Editor'}
    >
      <i class="fas {open ? 'fa-compress' : 'fa-expand'}"></i>
      <span>Editor</span>
    </button>

    <button
      class="hdr-btn icon"
      class:active={$columnsVisible}
      inert={tucked}
      onclick={dragSafe(toggleColumns)}
      title="{$columnsVisible ? 'Hide' : 'Show'} columns"
    >
      <i class="fas fa-grip-lines-vertical"></i>
    </button>

    {#if open}
      <button
        class="hdr-btn icon"
        title={mode === 'docked' ? 'Float' : `Dock to the ${dockSide}`}
        onclick={toggleMode}
        transition:fade={BTN_FADE}
      >
        <i class={mode === 'docked' ? 'fas fa-up-right-from-square' : 'fas fa-thumbtack'}></i>
      </button>
    {/if}

    {#if open && mode === 'docked'}
      <button
        class="hdr-btn icon"
        title="Dock to the {dockSide === 'right' ? 'left' : 'right'}"
        onclick={flipDockSide}
        transition:fade={BTN_FADE}
      >
        <i class="fas {dockSide === 'right' ? 'fa-angles-left' : 'fa-angles-right'}"></i>
      </button>
    {/if}

    {#if APP_VERSION}
      <span class="version" title="live-tokens version">v{APP_VERSION}</span>
    {/if}

    {#if open}
      <div class="spacer" transition:fade={BTN_FADE}></div>
    {/if}

    {#if open && showSource}
      <span class="source-pill" transition:fade={BTN_FADE}>
        <UIPillButton
          icon="fa-code"
          href="vscode://file/{projectRoot}/{sourceFile}"
          title="Open {sourceFile} in VS Code"
        >Show page source</UIPillButton>
      </span>
    {/if}

    {#if open && navLinks.length > 0}
      <div class="seg-group" transition:fade={BTN_FADE}>
        <span class="seg-label">Active Page:</span>
        <div class="seg-bar" role="tablist" aria-label="Underlying page">
          {#each navLinks as link (link.path)}
            <button
              type="button"
              role="tab"
              class="seg-pill"
              class:active={$route === link.path}
              aria-selected={$route === link.path}
              disabled={link.disabled}
              onclick={() => navigate(link.path)}
            >
              {#if link.icon}<i class="fas {link.icon}"></i>{/if}
              <span>{link.label}</span>
            </button>
          {/each}
        </div>
      </div>
    {/if}
  </div>

  {#if hasBeenOpen}
    <div class="frame-wrap">
      <iframe
        src={editorPath}
        title="Token editor"
        class="editor-frame"
        bind:this={editorFrame}
        onload={() => postParentRoute(editorFrame?.contentWindow, $route)}
      ></iframe>
      {#if gesturing}
        <div class="gesture-scrim"></div>
      {/if}
    </div>

    {#if mode === 'docked'}
      <div
        class="resize-edge {dockSide === 'left' ? 'at-right' : 'at-left'}"
        onpointerdown={startDockedResize}
      ></div>
    {:else}
      <div class="resize-se" onpointerdown={startFloatingResize}></div>
    {/if}
  {/if}
</div>
{/if}

<style>
  .lt-overlay {
    /* Animation knobs: bar = panel grow/shrink. */
    --bar-open-dur: 240ms;
    --bar-open-ease: cubic-bezier(0.65, 0, 0.35, 1);
    --bar-open-delay: 0ms;
    --bar-close-dur: 240ms;
    --bar-close-ease: cubic-bezier(0, 0, 0.2, 1); /* ease-out */
    --bar-close-delay: 120ms; /* let the iframe fade out before the panel shrinks */
    /* Collapsed-pill motion: snap = the last pixels to the edge, settle = the
       drop, tuck = sliding off the edge and back. Mirrored by SNAP_DUR and
       SETTLE_DUR in the script. */
    --snap-dur: 200ms;
    --snap-ease: cubic-bezier(0.755, 0.05, 0.855, 0.06);
    --settle-dur: 300ms;
    --settle-ease: cubic-bezier(0.22, 1, 0.36, 1);
    --tuck-dur: 220ms;
    --tuck-ease: cubic-bezier(0.22, 1, 0.36, 1);
    --tab-width: 20px; /* the sliver of pill that stays on screen when docked */
    --tab-length: 56px; /* the handle's reach along a horizontal edge */

    display: flex;
    flex-direction: column;
    background: var(--ui-surface-lower, #0a0a0a);
    border: 1px solid rgba(255, 255, 255, 0.12);
    box-shadow: 0 18px 60px rgba(0, 0, 0, 0.6);
    z-index: 2000;
    overflow: hidden;
    font-family: var(--ui-font-sans, system-ui, -apple-system, BlinkMacSystemFont, sans-serif);
    color: var(--ui-text-primary, #fff);
    transition:
      width var(--bar-open-dur) var(--bar-open-ease) var(--bar-open-delay),
      height var(--bar-open-dur) var(--bar-open-ease) var(--bar-open-delay),
      top var(--bar-open-dur) var(--bar-open-ease) var(--bar-open-delay),
      right var(--bar-open-dur) var(--bar-open-ease) var(--bar-open-delay),
      border-radius var(--bar-open-dur) var(--bar-open-ease) var(--bar-open-delay),
      transform var(--tuck-dur) var(--tuck-ease);
  }

  /* Sketch mode scopes itself to the host document root, and this bar lives
     there too. The effect is for the page being designed, not for the tool
     looking at it. */
  .lt-overlay {
    --sketch-icon-off: none;
  }

  /* tokens.css sets the theme font on :where(*), and a matching rule beats
     inheritance, so the panel's own font-family never reaches its children.
     Restore inheritance for the chrome, as .editor-page does. The preview
     lives in an iframe, so no themed surface is caught by this. */
  .lt-overlay :global(*:not([class*='fa-'])) {
    font-family: inherit;
  }

  .lt-overlay.docked {
    border-right: none;
    border-radius: 0;
  }

  .lt-overlay.docked.side-left {
    border-right: 1px solid rgba(255, 255, 255, 0.12);
    border-left: none;
  }

  .lt-overlay.floating {
    border-radius: var(--ui-radius-xl, 8px);
  }

  /* Collapsed state: draggable pill, placed from the right edge; iframe stays
     mounted, clipped by overflow:hidden. */
  .lt-overlay.hidden {
    border-radius: var(--ui-radius-lg, 6px);
    border-color: rgba(255, 255, 255, 0.32);
    transition:
      width var(--bar-close-dur) var(--bar-close-ease) var(--bar-close-delay),
      height var(--bar-close-dur) var(--bar-close-ease) var(--bar-close-delay),
      top var(--bar-close-dur) var(--bar-close-ease) var(--bar-close-delay),
      right var(--bar-close-dur) var(--bar-close-ease) var(--bar-close-delay),
      border-radius var(--bar-close-dur) var(--bar-close-ease) var(--bar-close-delay),
      transform var(--tuck-dur) var(--tuck-ease),
      background-color var(--tuck-dur) var(--tuck-ease),
      border-color var(--tuck-dur) var(--tuck-ease),
      box-shadow var(--tuck-dur) ease;
  }

  /* Docked: slide all but a tab's width off the edge, whichever edge it is. */
  .lt-overlay.tucked.dock-right {
    transform: translateX(calc(100% - var(--tab-width)));
  }

  .lt-overlay.tucked.dock-left {
    transform: translateX(calc(-100% + var(--tab-width)));
  }

  .lt-overlay.tucked.dock-top {
    transform: translateY(calc(-100% + var(--tab-width)));
  }

  .lt-overlay.tucked.dock-bottom {
    transform: translateY(calc(100% - var(--tab-width)));
  }

  /* Flatten the corners the pill is resting against. */
  .lt-overlay.hidden.dock-right {
    border-top-right-radius: 0;
    border-bottom-right-radius: 0;
  }

  .lt-overlay.hidden.dock-left {
    border-top-left-radius: 0;
    border-bottom-left-radius: 0;
  }

  .lt-overlay.hidden.dock-top {
    border-top-left-radius: 0;
    border-top-right-radius: 0;
  }

  .lt-overlay.hidden.dock-bottom {
    border-bottom-left-radius: 0;
    border-bottom-right-radius: 0;
  }

  /* Following the pointer, so position does not animate. The tuck still does,
     so pulling a docked pill off the edge unfurls it. */
  .lt-overlay.dragging {
    transition: transform var(--tuck-dur) var(--tuck-ease);
  }

  /* The last pixels to the edge are a jump, and worth animating. */
  .lt-overlay.dragging.snapping {
    transition:
      right var(--snap-dur) var(--snap-ease),
      top var(--snap-dur) var(--snap-ease),
      transform var(--tuck-dur) var(--tuck-ease);
  }

  /* Released: ease into the resting spot rather than stopping dead. */
  .lt-overlay.settling {
    transition:
      top var(--settle-dur) var(--settle-ease),
      right var(--settle-dur) var(--settle-ease),
      transform var(--tuck-dur) var(--tuck-ease),
      box-shadow var(--tuck-dur) ease;
  }

  /* Docked to a horizontal edge, the pill hides its depth rather than its
     length, which would leave its whole width parked on the page. Its chrome
     gives way to the tab, so what stays on screen is a handle either way. */
  .lt-overlay.tucked.dock-top,
  .lt-overlay.tucked.dock-bottom,
  .lt-overlay.tucked.dock-top .header,
  .lt-overlay.tucked.dock-bottom .header {
    background: transparent;
    border-color: transparent;
    box-shadow: none;
  }

  .lt-overlay.tucked.dock-top .frame-wrap,
  .lt-overlay.tucked.dock-bottom .frame-wrap {
    opacity: 0;
  }

  /* The edge has the pill: say so while it is still under the pointer. */
  .lt-overlay.at-edge {
    box-shadow:
      0 0 0 2px rgba(255, 255, 255, 0.45),
      0 18px 60px rgba(0, 0, 0, 0.6);
  }

  .lt-overlay.hidden .resize-edge,
  .lt-overlay.hidden .resize-se {
    display: none;
  }

  .lt-overlay.no-transition,
  .lt-overlay.no-transition .frame-wrap {
    transition: none;
  }

  .header {
    position: relative;
    display: flex;
    align-items: center;
    gap: var(--ui-space-6, 6px);
    padding: var(--ui-space-6, 6px) var(--ui-space-10, 10px);
    background: var(--ui-surface-low, #111);
    border-bottom: 1px solid rgba(255, 255, 255, 0.1);
    cursor: default;
    flex-shrink: 0;
    user-select: none;
  }

  /* The whole collapsed pill is the drag surface. */
  .lt-overlay.hidden .header {
    border-bottom: none;
    padding: 5px var(--ui-space-8, 8px);
    cursor: grab;
    transition: background-color var(--tuck-dur) var(--tuck-ease);
  }

  .grip {
    display: inline-flex;
    align-self: stretch;
    align-items: center;
    justify-content: center;
    width: var(--tab-width);
    /* Cancel the header's left padding so the grip is the pill's left edge,
       which is what stays on screen when docked. */
    margin-left: calc(-1 * var(--ui-space-8, 8px));
    padding: 0;
    background: transparent;
    border: 0;
    color: rgba(255, 255, 255, 0.45);
    font-size: var(--ui-font-size-sm, 12px);
    cursor: grab;
    touch-action: none;
    transition: background var(--ui-transition-fast, 120ms ease), color var(--ui-transition-fast, 120ms ease);
  }

  .grip:hover {
    background: rgba(255, 255, 255, 0.1);
    color: rgba(255, 255, 255, 0.9);
  }

  /* The tab hugs the edge of the pill that stays on screen, so it is the whole
     of what a tucked pill shows. It sits over the bar, which fades out under it. */
  .tab {
    position: absolute;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 0;
    background: rgba(255, 255, 255, 0.08);
    border: 0;
    color: rgba(255, 255, 255, 0.75);
    font-size: var(--ui-font-size-sm, 12px);
    cursor: grab;
    opacity: 0;
    touch-action: none;
    transition: opacity var(--tuck-dur) var(--tuck-ease), background var(--ui-transition-fast, 120ms ease);
  }

  .tab:hover {
    background: rgba(255, 255, 255, 0.14);
    color: var(--ui-text-primary, #fff);
  }

  .dock-right .tab {
    top: 0;
    bottom: 0;
    left: 0;
    width: var(--tab-width);
  }

  .dock-left .tab {
    top: 0;
    bottom: 0;
    right: 0;
    width: var(--tab-width);
  }

  /* On a horizontal edge the tab is the whole of the visible chrome, so it
     carries the pill's surface and border and reaches only --tab-length. */
  .dock-top .tab,
  .dock-bottom .tab {
    left: 50%;
    width: var(--tab-length);
    height: var(--tab-width);
    margin-left: calc(var(--tab-length) / -2);
    background: var(--ui-surface-low, #111);
    border: 1px solid rgba(255, 255, 255, 0.32);
  }

  .dock-top .tab {
    bottom: 0;
    border-top: 0;
    border-radius: 0 0 var(--ui-radius-lg, 6px) var(--ui-radius-lg, 6px);
  }

  .dock-bottom .tab {
    top: 0;
    border-bottom: 0;
    border-radius: var(--ui-radius-lg, 6px) var(--ui-radius-lg, 6px) 0 0;
  }

  .dock-top .tab:hover,
  .dock-bottom .tab:hover {
    background: var(--ui-surface-lower, #0a0a0a);
  }

  .lt-overlay.tucked .tab {
    opacity: 1;
  }

  /* Tucked, the bar itself is off-screen; fade it so nothing of it shows
     through the tab on the way out. */
  .lt-overlay.tucked .hdr-btn,
  .lt-overlay.tucked .grip,
  .lt-overlay.tucked .version {
    opacity: 0;
    transition: opacity var(--tuck-dur) var(--tuck-ease);
  }

  .lt-overlay.floating .header {
    cursor: move;
  }

  .lt-overlay.dragging .header,
  .lt-overlay.dragging .grip,
  .lt-overlay.dragging .tab {
    cursor: grabbing;
  }

  .hdr-btn.title {
    gap: 7px;
    font-size: var(--ui-font-size-md, 16px);
    font-weight: var(--ui-font-weight-semibold, 600);
    color: rgba(255, 255, 255, 0.85);
  }

  .spacer { flex: 1; }

  .version {
    font-size: var(--ui-font-size-md, 16px);
    font-weight: var(--ui-font-weight-medium, 500);
    color: rgba(255, 255, 255, 0.4);
    margin-left: var(--ui-space-2, 2px);
    user-select: none;
  }

  .hdr-btn {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    background: transparent;
    border: 1px solid rgba(255, 255, 255, 0.08);
    border-radius: var(--ui-radius-md, 4px);
    color: rgba(255, 255, 255, 0.75);
    cursor: pointer;
    transition: background var(--ui-transition-fast, 120ms ease), color var(--ui-transition-fast, 120ms ease);
    font-family: inherit;
  }

  .hdr-btn.icon {
    padding: var(--ui-space-6, 6px);
    aspect-ratio: 1;
    font-size: var(--ui-font-size-md, 16px);
  }

  .hdr-btn.text {
    padding: var(--ui-space-6, 6px) var(--ui-space-10, 10px);
    font-size: var(--ui-font-size-md, 16px);
    font-weight: var(--ui-font-weight-medium, 500);
  }

  .source-pill {
    display: inline-flex;
  }

  .hdr-btn.nav {
    padding: var(--ui-space-6, 6px) var(--ui-space-8, 8px);
    gap: var(--ui-space-4, 4px);
    font-size: var(--ui-font-size-md, 16px);
    font-weight: var(--ui-font-weight-medium, 500);
  }

  .hdr-btn:hover {
    background: rgba(255, 255, 255, 0.08);
    color: var(--ui-text-primary, #fff);
  }

  .hdr-btn.active {
    background: rgba(255, 255, 255, 0.12);
    color: var(--ui-text-primary, #fff);
    border-color: rgba(255, 255, 255, 0.18);
  }

  .seg-group {
    display: inline-flex;
    align-items: center;
    gap: var(--ui-space-8, 8px);
    margin-left: 18px;
    margin-right: var(--ui-space-4, 4px);
  }

  .seg-label {
    font-size: var(--ui-font-size-md, 16px);
    font-weight: var(--ui-font-weight-semibold, 600);
    color: var(--ui-text-primary, #fff);
  }

  .seg-bar {
    display: inline-flex;
    align-items: center;
    gap: var(--ui-space-4, 4px);
    padding: 3px;
    background: rgba(0, 0, 0, 0.55);
    border: 1px solid rgba(255, 255, 255, 0.28);
    border-radius: var(--ui-radius-lg, 6px);
    box-shadow:
      inset 0 1px 0 rgba(0, 0, 0, 0.5),
      0 0 0 1px rgba(0, 0, 0, 0.4);
  }

  .seg-pill {
    display: inline-flex;
    align-items: center;
    gap: var(--ui-space-4, 4px);
    padding: var(--ui-space-4, 4px) var(--ui-space-8, 8px);
    background: transparent;
    border: 1px solid transparent;
    border-radius: 3px;
    color: rgba(255, 255, 255, 0.6);
    font-family: inherit;
    font-size: var(--ui-font-size-md, 16px);
    font-weight: var(--ui-font-weight-medium, 500);
    cursor: pointer;
    transition:
      background var(--ui-transition-fast, 120ms ease),
      color var(--ui-transition-fast, 120ms ease),
      border-color var(--ui-transition-fast, 120ms ease);
  }

  .seg-pill i {
    font-size: var(--ui-font-size-md, 16px);
    opacity: 0.85;
  }

  .seg-pill:hover:not(:disabled) {
    color: rgba(255, 255, 255, 0.9);
  }

  .seg-pill:disabled {
    color: rgba(255, 255, 255, 0.28);
    cursor: not-allowed;
  }

  .seg-pill:disabled i {
    opacity: 0.5;
  }

  /* Outlined (not filled) so this reads as sibling to iframe's switcher, not a twin. */
  .seg-pill.active {
    color: var(--ui-text-primary, #fff);
    border-color: rgba(255, 255, 255, 0.5);
    background: linear-gradient(180deg, rgba(255, 255, 255, 0.15) 0%, rgba(255, 255, 255, 0.25) 100%);
  }

  .frame-wrap {
    position: relative;
    flex: 1;
    min-height: 0;
    background: #000;
  }

  .lt-overlay.hidden .frame-wrap {
    pointer-events: none;
  }

  .editor-frame {
    width: 100%;
    height: 100%;
    border: 0;
    display: block;
    transition: opacity 200ms ease-in;
  }

  /* While the panel grows pill → full, hide the iframe over the #000 frame-wrap
     so the editor route's intermediate reflow (side-nav scrollbar, white body)
     never shows; it fades in once the size transition settles. */
  .lt-overlay.opening .editor-frame {
    opacity: 0;
    pointer-events: none;
  }

  /* On collapse, fade the iframe out quickly first (the panel shrink is held
     back by --bar-close-delay), so the reflow during shrink stays masked. */
  .lt-overlay.closing .editor-frame {
    opacity: 0;
    pointer-events: none;
    transition: opacity 120ms ease-in;
  }

  .gesture-scrim {
    position: absolute;
    inset: 0;
    background: transparent;
    cursor: inherit;
  }

  /* Sits on the panel's inner edge, whichever side it is docked to. */
  .resize-edge {
    position: absolute;
    top: 0;
    bottom: 0;
    width: 6px;
    cursor: ew-resize;
    background: transparent;
  }

  .resize-edge.at-left {
    left: 0;
  }

  .resize-edge.at-right {
    right: 0;
  }

  .resize-edge:hover {
    background: rgba(255, 255, 255, 0.08);
  }

  .resize-se {
    position: absolute;
    right: 0;
    bottom: 0;
    width: 16px;
    height: 16px;
    cursor: nwse-resize;
    background: linear-gradient(
      135deg,
      transparent 45%,
      rgba(255, 255, 255, 0.35) 45%,
      rgba(255, 255, 255, 0.35) 55%,
      transparent 55%
    );
  }

  @media (prefers-reduced-motion: reduce) {
    .lt-overlay,
    .lt-overlay.hidden,
    .editor-frame {
      transition: none;
    }
  }
</style>
