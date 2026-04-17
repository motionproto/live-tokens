<script context="module" lang="ts">
  // __PROJECT_ROOT__ is injected by the themeFileApi Vite plugin as a `define`.
  // Consumers don't need to configure it themselves. We declare it locally so
  // this component's type-check passes in consumer projects that haven't added
  // the ambient global to their tsconfig.
  declare const __PROJECT_ROOT__: string | undefined;
  const INJECTED_PROJECT_ROOT: string =
    typeof __PROJECT_ROOT__ !== 'undefined' ? (__PROJECT_ROOT__ ?? '') : '';
</script>

<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import { route, navigate } from './router';
  import { columnsVisible, toggleColumns } from './columnsOverlay';
  import { storageKey } from './editorConfig';
  import type { NavLink } from './navLinkTypes';

  export let open: boolean | undefined = undefined;
  export let editorPath: string = '/admin';
  export let navLinks: NavLink[] = [];
  export let pageSources: Record<string, string> = {};
  export let projectRoot: string = INJECTED_PROJECT_ROOT;

  // Self-gate: only render in dev, and never inside an iframe (the /admin
  // page embeds this same app in an iframe and would otherwise recursively
  // mount another overlay).
  const isDev = import.meta.env.DEV;
  const isInIframe = typeof window !== 'undefined' && window.parent !== window;
  const enabled = isDev && !isInIframe;

  // Self-manage `open` when the consumer doesn't bind it. When they do, their
  // binding wins and we skip our own persistence.
  const OPEN_KEY = storageKey('overlay-open');
  const consumerControlsOpen = open !== undefined;
  if (!consumerControlsOpen) {
    try {
      open = enabled && localStorage.getItem(OPEN_KEY) === '1';
    } catch {
      open = false;
    }
  }
  $: if (!consumerControlsOpen && typeof window !== 'undefined') {
    try { localStorage.setItem(OPEN_KEY, open ? '1' : '0'); } catch {}
  }

  // Hide the overlay entirely when the user is already on the editor route
  // (the editor page has its own chrome).
  $: onEditorPath = $route === editorPath;
  $: sourceFile = pageSources[$route];

  // Mount the iframe the first time the editor is shown, then keep it mounted
  // across hide/show cycles so editor state (unsaved slider values, scroll
  // position, expanded sections) survives.
  let hasBeenOpen: boolean = !!open;
  $: if (open) hasBeenOpen = true;

  type Mode = 'docked' | 'floating';

  const STORAGE_KEY = storageKey('overlay-state');
  const MIN_WIDTH = 360;
  const MIN_HEIGHT = 480;
  const DEFAULT_DOCKED_WIDTH = Math.min(960, Math.floor(window.innerWidth * 0.55));
  const DEFAULT_FLOATING = {
    x: Math.max(16, window.innerWidth - 960 - 32),
    y: 64,
    width: 960,
    height: Math.min(880, window.innerHeight - 96),
  };

  interface OverlayState {
    mode: Mode;
    dockedWidth: number;
    floating: { x: number; y: number; width: number; height: number };
  }

  function loadState(): OverlayState {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as Partial<OverlayState>;
        return {
          mode: parsed.mode === 'floating' ? 'floating' : 'docked',
          dockedWidth: typeof parsed.dockedWidth === 'number' ? parsed.dockedWidth : DEFAULT_DOCKED_WIDTH,
          floating: {
            x: parsed.floating?.x ?? DEFAULT_FLOATING.x,
            y: parsed.floating?.y ?? DEFAULT_FLOATING.y,
            width: parsed.floating?.width ?? DEFAULT_FLOATING.width,
            height: parsed.floating?.height ?? DEFAULT_FLOATING.height,
          },
        };
      }
    } catch {
      // ignore
    }
    return {
      mode: 'docked',
      dockedWidth: DEFAULT_DOCKED_WIDTH,
      floating: { ...DEFAULT_FLOATING },
    };
  }

  function persist() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ mode, dockedWidth, floating }));
    } catch {
      // ignore quota errors
    }
  }

  const initial = loadState();
  let mode: Mode = initial.mode;
  let dockedWidth: number = Math.max(MIN_WIDTH, initial.dockedWidth);
  let floating = { ...initial.floating };

  // Gesture state — a transparent scrim covers the iframe while any gesture is active
  // so pointer events land on the panel, not on content inside the iframe.
  let gesturing: 'drag' | 'resize-left' | 'resize-se' | null = null;

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

  function startDockedResize(e: PointerEvent) {
    if (!open || mode !== 'docked') return;
    gesturing = 'resize-left';
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    const startX = e.clientX;
    const origWidth = dockedWidth;
    function move(ev: PointerEvent) {
      // Dragging left increases width (panel is anchored to the right edge)
      dockedWidth = clamp(origWidth + (startX - ev.clientX), MIN_WIDTH, window.innerWidth - 120);
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
    mode = mode === 'docked' ? 'floating' : 'docked';
    // Snap the floating rect back inside the viewport if it drifted off-screen since last use
    if (mode === 'floating') {
      floating = {
        x: clamp(floating.x, 0, window.innerWidth - MIN_WIDTH),
        y: clamp(floating.y, 0, window.innerHeight - 40),
        width: clamp(floating.width, MIN_WIDTH, window.innerWidth),
        height: clamp(floating.height, MIN_HEIGHT, window.innerHeight),
      };
    }
    persist();
  }

  function toggleOpen() {
    open = !open;
  }

  function handleHeaderDblClick(e: MouseEvent) {
    // Ignore double-clicks on buttons so toggling mode/fullscreen/show-hide
    // doesn't also fire the dblclick handler.
    if ((e.target as HTMLElement).closest('button')) return;
    toggleOpen();
  }

  // Messages from the editor iframe:
  //   lt-overlay-close — iframe's Close button (hides the editor)
  function handleMessage(ev: MessageEvent) {
    if (ev.origin !== window.location.origin) return;
    const data = ev.data;
    if (!data || typeof data !== 'object') return;
    if (data.type === 'lt-overlay-close') {
      open = false;
    }
  }

  onMount(() => {
    window.addEventListener('message', handleMessage);
  });
  onDestroy(() => {
    window.removeEventListener('message', handleMessage);
  });

  $: panelStyle = !open
    ? 'position: fixed; top: 12px; right: 12px;'
    : mode === 'docked'
      ? `position: fixed; top: 0; right: 0; bottom: 0; width: ${dockedWidth}px;`
      : `position: fixed; top: ${floating.y}px; left: ${floating.x}px; width: ${floating.width}px; height: ${floating.height}px;`;
</script>

{#if enabled && !onEditorPath}
<!-- svelte-ignore a11y-no-static-element-interactions -->
<div
  class="lt-overlay"
  style={panelStyle}
  class:shown={open}
  class:hidden={!open}
  class:docked={open && mode === 'docked'}
  class:floating={open && mode === 'floating'}
>
  <div
    class="header"
    on:pointerdown={startDrag}
    on:dblclick={handleHeaderDblClick}
    title={open ? 'Double-click to hide' : 'Double-click to show'}
  >
    {#if open}
      <span class="title">Design Editor</span>
      <div class="spacer"></div>
    {/if}

    {#if open && navLinks.length > 0}
      <div class="preview-nav">
        {#each navLinks as link (link.path)}
          <button
            class="hdr-btn nav"
            class:active={$route === link.path}
            on:click={() => navigate(link.path)}
          >
            {#if link.icon}<i class="fas {link.icon}"></i>{/if}
            <span>{link.label}</span>
          </button>
        {/each}
      </div>
    {/if}

    <button
      class="hdr-btn icon"
      class:active={$columnsVisible}
      on:click={toggleColumns}
      title="{$columnsVisible ? 'Hide' : 'Show'} columns"
    >
      <i class="fas fa-grip-lines-vertical"></i>
    </button>

    <button class="hdr-btn text" on:click={toggleOpen}>
      {open ? 'Hide Editor' : 'Editor'}
    </button>

    {#if open}
      <button class="hdr-btn icon" title={mode === 'docked' ? 'Float' : 'Dock to right'} on:click={toggleMode}>
        <i class={mode === 'docked' ? 'fas fa-up-right-from-square' : 'fas fa-thumbtack'}></i>
      </button>
    {/if}

    {#if sourceFile && projectRoot}
      <a
        class="hdr-btn text source"
        href="vscode://file/{projectRoot}/{sourceFile}"
        title="Open {sourceFile} in VS Code"
      >
        <i class="fas fa-code"></i>
        Page Source
      </a>
    {/if}
  </div>

  {#if hasBeenOpen}
    <div class="frame-wrap">
      <iframe
        src={editorPath}
        title="Design editor"
        class="editor-frame"
      ></iframe>
      {#if gesturing}
        <div class="gesture-scrim"></div>
      {/if}
    </div>

    {#if mode === 'docked'}
      <div class="resize-left" on:pointerdown={startDockedResize}></div>
    {:else}
      <div class="resize-se" on:pointerdown={startFloatingResize}></div>
    {/if}
  {/if}
</div>
{/if}

<style>
  .lt-overlay {
    display: flex;
    flex-direction: column;
    background: #0a0a0a;
    border: 1px solid rgba(255, 255, 255, 0.12);
    box-shadow: 0 18px 60px rgba(0, 0, 0, 0.6);
    z-index: 2000;
    overflow: hidden;
    font-family: system-ui, -apple-system, BlinkMacSystemFont, sans-serif;
    color: #fff;
  }

  .lt-overlay.docked {
    border-right: none;
    border-radius: 0;
  }

  .lt-overlay.floating {
    border-radius: 8px;
  }

  /* Hidden state: the editor panel is collapsed to just the header bar,
     pinned to the top-right. The iframe stays mounted (for instant show)
     but its container is display:none. */
  .lt-overlay.hidden {
    border-radius: 6px;
    width: auto;
  }

  .lt-overlay.hidden .frame-wrap,
  .lt-overlay.hidden .resize-left,
  .lt-overlay.hidden .resize-se {
    display: none;
  }

  .header {
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 6px 10px;
    background: #111;
    border-bottom: 1px solid rgba(255, 255, 255, 0.1);
    cursor: default;
    flex-shrink: 0;
    user-select: none;
  }

  .lt-overlay.hidden .header {
    border-bottom: none;
    padding: 5px 8px;
  }

  .lt-overlay.floating .header {
    cursor: move;
  }

  .title {
    font-size: 13px;
    font-weight: 600;
    color: rgba(255, 255, 255, 0.85);
    letter-spacing: 0.02em;
  }

  .spacer { flex: 1; }

  .hdr-btn {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    background: transparent;
    border: 1px solid rgba(255, 255, 255, 0.08);
    border-radius: 4px;
    color: rgba(255, 255, 255, 0.75);
    cursor: pointer;
    transition: background 0.1s, color 0.1s;
    font-family: inherit;
  }

  .hdr-btn.icon {
    width: 26px;
    height: 26px;
    font-size: 11px;
  }

  .hdr-btn.text {
    height: 26px;
    padding: 0 10px;
    font-size: 12px;
    font-weight: 500;
  }

  a.hdr-btn.source {
    gap: 6px;
    text-decoration: none;
  }

  .hdr-btn.nav {
    height: 26px;
    padding: 0 9px;
    gap: 5px;
    font-size: 11px;
    font-weight: 500;
  }

  .hdr-btn:hover {
    background: rgba(255, 255, 255, 0.08);
    color: #fff;
  }

  .hdr-btn.active {
    background: rgba(255, 255, 255, 0.12);
    color: #fff;
    border-color: rgba(255, 255, 255, 0.18);
  }

  .preview-nav {
    display: flex;
    gap: 3px;
    margin-right: 4px;
  }

  .frame-wrap {
    position: relative;
    flex: 1;
    min-height: 0;
    background: #000;
  }

  .editor-frame {
    width: 100%;
    height: 100%;
    border: 0;
    display: block;
  }

  .gesture-scrim {
    position: absolute;
    inset: 0;
    background: transparent;
    cursor: inherit;
  }

  .resize-left {
    position: absolute;
    top: 0;
    left: 0;
    bottom: 0;
    width: 6px;
    cursor: ew-resize;
    background: transparent;
  }

  .resize-left:hover {
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
</style>
