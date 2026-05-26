<script lang="ts">
  import { onMount, tick } from 'svelte';

  interface Props {
    src: string;
    alt: string;
    width?: number | undefined;
    height?: number | undefined;
    maxWidth?: number | string | undefined;
    /** When true, shows a bottom toolbar (zoom in/out + percent) and a top-right close button, and enables wheel/drag zoom inside the open modal. When false, click anywhere closes. */
    extended?: boolean;
  }

  let {
    src,
    alt,
    width = undefined,
    height = undefined,
    maxWidth = undefined,
    extended = false,
  }: Props = $props();

  const MIN_SCALE = 1;
  const MAX_SCALE = 5;
  const ZOOM_STEP = 1.5;
  const TRANSITION_MS = 350;
  const TRANSITION_EASE = 'cubic-bezier(0.65, 0, 0.35, 1)';

  let wrapperEl: HTMLDivElement;
  let tileEl: HTMLDivElement;
  let transformEl: HTMLDivElement;
  let overlayEl: HTMLDivElement;
  let toolbarEl: HTMLDivElement | undefined = $state();
  let closeBtnEl: HTMLButtonElement | undefined = $state();

  let open = $state(false);
  let scale = $state(1);
  let offset = { x: 0, y: 0 };

  // Pointer drag for pan (extended + zoomed only).
  let dragState: { startX: number; startY: number; baseX: number; baseY: number; pointerId: number } | null = null;
  let didDrag = false;

  const aspect = $derived(width && height ? width / height : undefined);

  function viewportTarget() {
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const capW = vw * 0.94;
    const capH = vh * 0.92;
    if (!aspect) {
      return { top: vh * 0.04, left: vw * 0.03, width: capW, height: capH };
    }
    const tileW = Math.min(capW, capH * aspect);
    const tileH = tileW / aspect;
    return {
      top: (vh - tileH) / 2,
      left: (vw - tileW) / 2,
      width: tileW,
      height: tileH,
    };
  }

  function clampOffset(x: number, y: number, s: number) {
    if (!tileEl) return { x: 0, y: 0 };
    const r = tileEl.getBoundingClientRect();
    const maxX = Math.max(0, (r.width * s - r.width) / 2);
    const maxY = Math.max(0, (r.height * s - r.height) / 2);
    return {
      x: Math.max(-maxX, Math.min(maxX, x)),
      y: Math.max(-maxY, Math.min(maxY, y)),
    };
  }

  function applyTransform(s: number, o: { x: number; y: number }) {
    if (!transformEl) return;
    transformEl.style.transform = `translate(${o.x}px, ${o.y}px) scale(${s})`;
  }

  // The dev editor overlay (`.lt-overlay`) sits at z-index 2000, above the
  // lightbox modal (`--z-modal` = 1100). When the lightbox is open we hide the
  // overlay so its iframe can't intercept clicks on the lightbox close button
  // or backdrop. Restored on close. No-op in production where the overlay
  // isn't mounted.
  let prevOverlayVisibility: string | null = null;

  function hideEditorOverlay() {
    const overlay = document.querySelector<HTMLElement>('.lt-overlay');
    if (!overlay) return;
    prevOverlayVisibility = overlay.style.visibility;
    overlay.style.visibility = 'hidden';
  }

  function restoreEditorOverlay() {
    const overlay = document.querySelector<HTMLElement>('.lt-overlay');
    if (!overlay) return;
    overlay.style.visibility = prevOverlayVisibility ?? '';
    prevOverlayVisibility = null;
  }

  function cancelAnimations() {
    // Commit each animation's current value to inline styles before cancelling,
    // so a mid-flight cancel doesn't visually snap the element back to its
    // pre-animation state. After cancel, the WAAPI effect is gone and the
    // committed inline values are what we'll either animate from next or
    // clear via cssText = ''.
    for (const el of [tileEl, overlayEl, toolbarEl, closeBtnEl]) {
      if (!el) continue;
      for (const a of el.getAnimations()) {
        try { a.commitStyles(); } catch {}
        a.cancel();
      }
    }
  }

  async function openLightbox() {
    if (open || !tileEl) return;
    cancelAnimations();
    const start = tileEl.getBoundingClientRect();
    const target = viewportTarget();

    open = true;
    document.body.style.overflow = 'hidden';
    hideEditorOverlay();
    await tick();

    Object.assign(tileEl.style, {
      position: 'fixed',
      top: `${start.top}px`,
      left: `${start.left}px`,
      width: `${start.width}px`,
      height: `${start.height}px`,
      zIndex: 'var(--z-modal)',
    });

    tileEl.animate(
      [
        { top: `${start.top}px`, left: `${start.left}px`, width: `${start.width}px`, height: `${start.height}px` },
        { top: `${target.top}px`, left: `${target.left}px`, width: `${target.width}px`, height: `${target.height}px` },
      ],
      { duration: TRANSITION_MS, easing: TRANSITION_EASE, fill: 'forwards' },
    );

    overlayEl.animate([{ opacity: 0 }, { opacity: 1 }], {
      duration: TRANSITION_MS,
      easing: TRANSITION_EASE,
      fill: 'forwards',
    });

    if (extended) {
      toolbarEl?.animate([{ opacity: 0, transform: 'translate(-50%, 16px)' }, { opacity: 1, transform: 'translate(-50%, 0)' }], {
        duration: TRANSITION_MS,
        easing: TRANSITION_EASE,
        fill: 'forwards',
        delay: 80,
      });
      closeBtnEl?.animate([{ opacity: 0 }, { opacity: 1 }], {
        duration: TRANSITION_MS,
        easing: TRANSITION_EASE,
        fill: 'forwards',
        delay: 80,
      });
    }
  }

  function closeLightbox() {
    if (!open || !tileEl || !wrapperEl) return;
    cancelAnimations();
    const target = wrapperEl.getBoundingClientRect();
    const current = tileEl.getBoundingClientRect();

    const anim = tileEl.animate(
      [
        { top: `${current.top}px`, left: `${current.left}px`, width: `${current.width}px`, height: `${current.height}px` },
        { top: `${target.top}px`, left: `${target.left}px`, width: `${target.width}px`, height: `${target.height}px` },
      ],
      { duration: TRANSITION_MS, easing: TRANSITION_EASE, fill: 'forwards' },
    );

    overlayEl.animate([{ opacity: 1 }, { opacity: 0 }], {
      duration: TRANSITION_MS,
      easing: TRANSITION_EASE,
      fill: 'forwards',
    });

    if (extended) {
      toolbarEl?.animate([{ opacity: 1 }, { opacity: 0 }], {
        duration: TRANSITION_MS,
        easing: TRANSITION_EASE,
        fill: 'forwards',
      });
      closeBtnEl?.animate([{ opacity: 1 }, { opacity: 0 }], {
        duration: TRANSITION_MS,
        easing: TRANSITION_EASE,
        fill: 'forwards',
      });
    }

    anim.onfinish = () => {
      cancelAnimations();
      tileEl.style.cssText = '';
      transformEl.style.transform = '';
      scale = 1;
      offset = { x: 0, y: 0 };
      open = false;
      document.body.style.overflow = '';
      restoreEditorOverlay();
    };
  }

  function zoomTo(nextScale: number, anchor?: { x: number; y: number }) {
    const s = Math.max(MIN_SCALE, Math.min(MAX_SCALE, nextScale));
    if (s <= MIN_SCALE) {
      scale = MIN_SCALE;
      offset = { x: 0, y: 0 };
      applyTransform(scale, offset);
      return;
    }
    let next: { x: number; y: number };
    if (anchor && tileEl) {
      const r = tileEl.getBoundingClientRect();
      const dx = anchor.x - (r.left + r.width / 2);
      const dy = anchor.y - (r.top + r.height / 2);
      const ratio = scale > 0 ? s / scale : 1;
      next = clampOffset(dx * (1 - ratio) + offset.x * ratio, dy * (1 - ratio) + offset.y * ratio, s);
    } else {
      next = clampOffset(offset.x, offset.y, s);
    }
    scale = s;
    offset = next;
    applyTransform(scale, offset);
  }

  function onWheel(e: WheelEvent) {
    if (!extended || !open) return;
    e.preventDefault();
    const factor = Math.exp(-e.deltaY * 0.002);
    zoomTo(scale * factor, { x: e.clientX, y: e.clientY });
  }

  function onPointerDown(e: PointerEvent) {
    if (!extended || !open || scale <= MIN_SCALE) return;
    didDrag = false;
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    dragState = {
      startX: e.clientX,
      startY: e.clientY,
      baseX: offset.x,
      baseY: offset.y,
      pointerId: e.pointerId,
    };
  }

  function onPointerMove(e: PointerEvent) {
    if (!dragState) return;
    const dx = e.clientX - dragState.startX;
    const dy = e.clientY - dragState.startY;
    if (!didDrag && Math.hypot(dx, dy) > 4) didDrag = true;
    offset = clampOffset(dragState.baseX + dx, dragState.baseY + dy, scale);
    applyTransform(scale, offset);
  }

  function onPointerUp(e: PointerEvent) {
    if (dragState) {
      (e.currentTarget as HTMLElement).releasePointerCapture(dragState.pointerId);
      dragState = null;
    }
  }

  function onTileClick() {
    if (didDrag) {
      didDrag = false;
      return;
    }
    if (!open) {
      openLightbox();
    } else if (!extended) {
      closeLightbox();
    }
  }

  function onTileKeyDown(e: KeyboardEvent) {
    if (e.key === 'Enter' || e.code === 'Space') {
      e.preventDefault();
      onTileClick();
    }
  }

  onMount(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && open) closeLightbox();
    };
    const onResize = () => {
      if (!open || !tileEl) return;
      const target = viewportTarget();
      Object.assign(tileEl.style, {
        top: `${target.top}px`,
        left: `${target.left}px`,
        width: `${target.width}px`,
        height: `${target.height}px`,
      });
      offset = clampOffset(offset.x, offset.y, scale);
      applyTransform(scale, offset);
    };
    document.addEventListener('keydown', onKey);
    window.addEventListener('resize', onResize);
    return () => {
      document.removeEventListener('keydown', onKey);
      window.removeEventListener('resize', onResize);
      document.body.style.overflow = '';
      restoreEditorOverlay();
    };
  });

  let percentLabel = $derived(`${Math.round(scale * 100)}%`);
</script>

<div
  bind:this={wrapperEl}
  class="image-lightbox-wrapper"
  style:aspect-ratio={aspect ? `${width} / ${height}` : undefined}
  style:max-width={typeof maxWidth === 'number' ? `${maxWidth}px` : maxWidth}
>
  <div
    bind:this={tileEl}
    class="image-lightbox-tile"
    class:open
    role="button"
    tabindex="0"
    aria-label={open ? `Close image: ${alt}` : `Expand image: ${alt}`}
    onclick={onTileClick}
    onkeydown={onTileKeyDown}
    onpointerdown={onPointerDown}
    onpointermove={onPointerMove}
    onpointerup={onPointerUp}
    onpointercancel={onPointerUp}
    onwheel={onWheel}
  >
    <div class="image-lightbox-clip">
      <div bind:this={transformEl} class="image-lightbox-transform">
        <img {src} {alt} draggable="false" />
      </div>
    </div>
  </div>
</div>

<div
  bind:this={overlayEl}
  class="image-lightbox-overlay"
  class:active={open}
  aria-hidden="true"
  onclick={closeLightbox}
  role="presentation"
></div>

{#if extended}
  <button
    bind:this={closeBtnEl}
    class="image-lightbox-chrome image-lightbox-close"
    class:active={open}
    type="button"
    aria-label="Close"
    onclick={closeLightbox}
  >
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.25" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
      <path d="M18 6L6 18" />
      <path d="M6 6l12 12" />
    </svg>
  </button>

  <div
    bind:this={toolbarEl}
    class="image-lightbox-toolbar"
    class:active={open}
  >
    <button
      class="image-lightbox-chrome-button"
      type="button"
      aria-label="Zoom out"
      disabled={scale <= MIN_SCALE + 0.001}
      onclick={() => zoomTo(scale / ZOOM_STEP)}
    >
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.25" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
        <path d="M5 12h14" />
      </svg>
    </button>
    <span class="image-lightbox-toolbar-label">{percentLabel}</span>
    <button
      class="image-lightbox-chrome-button"
      type="button"
      aria-label="Zoom in"
      disabled={scale >= MAX_SCALE - 0.001}
      onclick={() => zoomTo(scale * ZOOM_STEP)}
    >
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.25" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
        <path d="M12 5v14" />
        <path d="M5 12h14" />
      </svg>
    </button>
  </div>
{/if}

<style>
  :global(:root) {
    /* tile (closed inline + animated modal surface) */
    --imagelightbox-tile-radius:           var(--radius-2xl);
    --imagelightbox-tile-border:           var(--color-transparent);
    --imagelightbox-tile-border-width:     var(--border-width-0);
    --imagelightbox-tile-shadow:           var(--shadow-md);

    /* overlay */
    --imagelightbox-overlay-surface:       var(--overlay-high);

    /* chrome (toolbar + close button) */
    --imagelightbox-chrome-surface:        var(--overlay-higher);
    --imagelightbox-chrome-border:         var(--border-brand);
    --imagelightbox-chrome-border-width:   var(--border-width-1);
    --imagelightbox-chrome-radius:         var(--radius-full);
    --imagelightbox-chrome-icon:           var(--text-primary);
    --imagelightbox-chrome-hover-surface:  var(--surface-brand-high);
  }

  .image-lightbox-wrapper {
    position: relative;
    width: 100%;
  }

  .image-lightbox-tile {
    position: absolute;
    inset: 0;
    cursor: zoom-in;
    border: var(--imagelightbox-tile-border-width) solid var(--imagelightbox-tile-border);
    border-radius: var(--imagelightbox-tile-radius);
    box-shadow: var(--imagelightbox-tile-shadow);
    background: transparent;
    overflow: visible;
    transition: transform 250ms ease;
  }

  .image-lightbox-tile:hover:not(.open) {
    transform: scale(1.02);
  }

  .image-lightbox-tile.open {
    cursor: zoom-out;
  }

  .image-lightbox-tile:focus-visible {
    outline: 2px solid var(--border-brand-medium);
    outline-offset: 2px;
  }

  .image-lightbox-clip {
    position: absolute;
    inset: 0;
    border-radius: inherit;
    overflow: hidden;
  }

  .image-lightbox-transform {
    position: absolute;
    inset: 0;
    will-change: transform;
    transform-origin: center center;
  }

  .image-lightbox-transform img {
    width: 100%;
    height: 100%;
    object-fit: contain;
    object-position: center;
    user-select: none;
    pointer-events: none;
    display: block;
  }

  .image-lightbox-overlay {
    position: fixed;
    inset: 0;
    background: var(--imagelightbox-overlay-surface);
    backdrop-filter: blur(var(--blur-md));
    z-index: var(--z-overlay);
    opacity: 0;
    pointer-events: none;
  }

  .image-lightbox-overlay.active {
    pointer-events: auto;
    cursor: zoom-out;
  }

  .image-lightbox-chrome {
    position: fixed;
    z-index: var(--z-modal);
    background: var(--imagelightbox-chrome-surface);
    border: var(--imagelightbox-chrome-border-width) solid var(--imagelightbox-chrome-border);
    border-radius: var(--imagelightbox-chrome-radius);
    color: var(--imagelightbox-chrome-icon);
    backdrop-filter: blur(var(--blur-md));
    opacity: 0;
    pointer-events: none;
    transition: background var(--duration-200) ease;
  }

  .image-lightbox-chrome.active {
    pointer-events: auto;
  }

  .image-lightbox-close {
    top: var(--space-24);
    right: var(--space-24);
    width: 2.75rem;
    height: 2.75rem;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
  }

  .image-lightbox-close:hover {
    background: var(--imagelightbox-chrome-hover-surface);
  }

  .image-lightbox-toolbar {
    position: fixed;
    left: 50%;
    bottom: var(--space-32);
    transform: translateX(-50%);
    z-index: var(--z-modal);
    display: flex;
    align-items: center;
    gap: var(--space-4);
    padding: var(--space-4);
    background: var(--imagelightbox-chrome-surface);
    border: var(--imagelightbox-chrome-border-width) solid var(--imagelightbox-chrome-border);
    border-radius: var(--imagelightbox-chrome-radius);
    color: var(--imagelightbox-chrome-icon);
    backdrop-filter: blur(var(--blur-md));
    opacity: 0;
    pointer-events: none;
  }

  .image-lightbox-toolbar.active {
    pointer-events: auto;
  }

  .image-lightbox-toolbar-label {
    min-width: 3.5ch;
    text-align: center;
    font-family: var(--font-mono);
    font-size: var(--font-size-xs);
    letter-spacing: var(--letter-spacing-wider);
    padding: 0 var(--space-4);
  }

  .image-lightbox-chrome-button {
    background: none;
    border: none;
    color: inherit;
    width: 2.5rem;
    height: 2.5rem;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: var(--radius-full);
    cursor: pointer;
    transition: background var(--duration-200) ease;
  }

  .image-lightbox-chrome-button:hover:not(:disabled) {
    background: var(--imagelightbox-chrome-hover-surface);
  }

  .image-lightbox-chrome-button:disabled {
    opacity: 0.4;
    cursor: not-allowed;
  }
</style>
