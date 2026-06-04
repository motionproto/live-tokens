<script lang="ts">
  import { onMount, tick } from 'svelte';
  import { portal } from '../internal/portal';

  interface GalleryImage {
    src: string;
    alt: string;
    width?: number;
    height?: number;
  }

  interface Props {
    src?: string;
    alt?: string;
    width?: number | undefined;
    height?: number | undefined;
    /** Pass two or more to turn the lightbox into a gallery: left/right chevrons
        and an `i / n` counter appear once open, plus arrow-key navigation. A
        single-entry array behaves exactly like a lone `src`. */
    images?: GalleryImage[];
    maxWidth?: number | string | undefined;
    /** Closed-thumbnail object-fit. `cover` crops the thumbnail to fill its box;
        the expanded modal always uses `contain` so the whole image stays visible.
        `cover` only crops when the thumbnail has its own box (an aspect from
        `width`/`height`, or a CSS-constrained container). */
    fit?: 'contain' | 'cover';
    /** When true, shows a bottom toolbar (zoom in/out + percent) and a top-right close button, and enables wheel/drag zoom inside the open modal. When false, click anywhere closes. */
    extended?: boolean;
    /** Maximum zoom, as a multiple of the image's natural resolution: `1` = 100%
        of the source's real pixels (1 source px = 1 screen px), `2` = 200%. The
        modal opens fitted to the viewport (or to a `capNatural`-capped size when
        that's set); this only caps how far the `extended` zoom controls magnify.
        Unset = the default 5x-the-fit cap. An image whose fitted size already
        exceeds the cap simply can't be zoomed in. Needs the natural pixel size
        (from `width`/`height`, or the loaded image); until that's known the
        default cap applies. */
    maxZoom?: number | undefined;
    /** Cap the opened image's fit relative to its natural resolution, so a small
        source (e.g. a low-res GIF) isn't upscaled to fill the viewport until it
        looks soft. `true` caps at 1:1 (100%); a number caps at that multiple
        (`2` = up to 200% of native). The modal still opens centered and never
        below the viewport fit, so larger sources are unaffected. Only bounds the
        initial open fit — the `extended` zoom controls still run up to `maxZoom`
        (pair with `maxZoom` to also bound zoom). Needs the natural pixel size
        (from `width`/`height`, or the loaded image); until that's known the image
        fits the viewport, then snaps to the cap once measured. */
    capNatural?: boolean | number;
  }

  let {
    src = undefined,
    alt = undefined,
    width = undefined,
    height = undefined,
    images = undefined,
    maxWidth = undefined,
    fit = 'contain',
    extended = false,
    maxZoom = undefined,
    capNatural = false,
  }: Props = $props();

  const items = $derived(
    images && images.length
      ? images
      : src != null
        ? [{ src, alt: alt ?? '', width, height }]
        : [],
  );

  let index = $state(0);
  const current = $derived(items[index]);
  const cover = $derived(items[0]);
  const isGallery = $derived(items.length > 1);

  const dialogLabel = $derived(
    isGallery
      ? `Image ${index + 1} of ${items.length}${current?.alt ? `: ${current.alt}` : ''}`
      : current?.alt || 'Image',
  );

  const MIN_SCALE = 1;
  const DEFAULT_MAX_SCALE = 5;
  const ZOOM_STEP = 1.5;
  const TRANSITION_MS = 350;
  const TRANSITION_EASE = 'cubic-bezier(0.65, 0, 0.35, 1)';

  // Gallery navigation: outgoing slides out + shrinks + fades; incoming slides
  // in from the opposite side, staggered. Easings mirror --ease-in/out-cubic.
  const NAV_MS = 250;
  const NAV_STAGGER_MS = 125;
  const NAV_SHIFT_PX = 32;
  const NAV_SCALE = 0.95;
  const EASE_IN = 'cubic-bezier(0.32, 0, 0.67, 0)';
  const EASE_OUT = 'cubic-bezier(0.33, 1, 0.68, 1)';

  let thumbEl: HTMLButtonElement | undefined = $state();
  let modalEl: HTMLDivElement | undefined = $state();
  let stageEl: HTMLDivElement | undefined = $state();
  let transformEl: HTMLDivElement | undefined = $state();
  let overlayEl: HTMLDivElement | undefined = $state();
  let toolbarEl: HTMLDivElement | undefined = $state();
  let closeBtnEl: HTMLButtonElement | undefined = $state();
  let prevBtnEl: HTMLButtonElement | undefined = $state();
  let nextBtnEl: HTMLButtonElement | undefined = $state();
  let counterEl: HTMLDivElement | undefined = $state();
  let incomingEl: HTMLImageElement | undefined = $state();
  let outgoingEl: HTMLImageElement | undefined = $state();

  // `mounted` keeps the portaled modal in the DOM through the close animation;
  // `open` is the visual state the chrome reacts to.
  let mounted = $state(false);
  let open = $state(false);
  let scale = $state(1);
  let offset = { x: 0, y: 0 };

  // The image leaving during a gallery transition; rendered as a second layer
  // until its slide-out finishes, then dropped.
  let outgoing = $state<GalleryImage | null>(null);
  let navigating = false;

  // Natural pixel size per image, keyed by src: explicit width/height when given,
  // else measured from the loaded <img>. The thumbnail reads the cover's entry and
  // the modal reads the current image's, so they are never confused for each other.
  // Aspect ratio derives from it; natural width drives the `maxZoom` cap.
  let measured = $state<Record<string, { w: number; h: number }>>({});
  let reducedMotion = $state(false);
  const dur = (ms = TRANSITION_MS) => (reducedMotion ? 0 : ms);

  // Reactive viewport so the fitted-stage geometry and the maxZoom cap recompute
  // on resize (set in onMount + the resize handler).
  let vw = $state(0);
  let vh = $state(0);

  // Pointer drag for pan (extended + zoomed only).
  let dragState: { startX: number; startY: number; baseX: number; baseY: number; pointerId: number } | null = null;
  let didDrag = false;

  const aspectOf = (it?: GalleryImage) => {
    if (!it) return undefined;
    if (it.width && it.height) return it.width / it.height;
    const m = measured[it.src];
    return m ? m.w / m.h : undefined;
  };
  const naturalWidthOf = (it?: GalleryImage) => (it ? (it.width ?? measured[it.src]?.w) : undefined);
  const coverAspect = $derived(aspectOf(cover)); // inline thumbnail box
  const aspect = $derived(aspectOf(current)); // open modal box

  // Internal `scale` is relative to the fitted stage, so a natural-size cap is
  // converted: maxZoom × naturalWidth ÷ fittedWidth. Floored at MIN_SCALE so an
  // image already displayed larger than the cap just can't be zoomed in.
  const maxScale = $derived.by(() => {
    if (maxZoom == null) return DEFAULT_MAX_SCALE;
    const nw = naturalWidthOf(current);
    const fitW = viewportTarget().width;
    if (!nw || !fitW) return DEFAULT_MAX_SCALE;
    return Math.max(MIN_SCALE, (maxZoom * nw) / fitW);
  });

  function viewportTarget() {
    const capW = vw * 0.94;
    const capH = vh * 0.92;
    if (!aspect) {
      return { top: vh * 0.04, left: vw * 0.03, width: capW, height: capH };
    }
    let tileW = Math.min(capW, capH * aspect);
    if (capNatural) {
      const nw = naturalWidthOf(current);
      const mult = capNatural === true ? 1 : capNatural;
      if (nw) tileW = Math.min(tileW, nw * mult);
    }
    const tileH = tileW / aspect;
    return {
      top: (vh - tileH) / 2,
      left: (vw - tileW) / 2,
      width: tileW,
      height: tileH,
    };
  }

  function clampOffset(x: number, y: number, s: number) {
    if (!stageEl) return { x: 0, y: 0 };
    const r = stageEl.getBoundingClientRect();
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
    // pre-animation state.
    for (const el of [stageEl, overlayEl, toolbarEl, closeBtnEl, prevBtnEl, nextBtnEl, counterEl]) {
      if (!el) continue;
      for (const a of el.getAnimations()) {
        try { a.commitStyles(); } catch {}
        a.cancel();
      }
    }
  }

  async function openLightbox() {
    if (open || !thumbEl) return;
    const start = thumbEl.getBoundingClientRect();

    mounted = true;
    open = true;
    document.body.style.overflow = 'hidden';
    hideEditorOverlay();
    await tick();
    if (!stageEl || !overlayEl) return;

    const target = viewportTarget();
    Object.assign(stageEl.style, {
      top: `${start.top}px`,
      left: `${start.left}px`,
      width: `${start.width}px`,
      height: `${start.height}px`,
    });

    stageEl.animate(
      [
        { top: `${start.top}px`, left: `${start.left}px`, width: `${start.width}px`, height: `${start.height}px` },
        { top: `${target.top}px`, left: `${target.left}px`, width: `${target.width}px`, height: `${target.height}px` },
      ],
      { duration: dur(), easing: TRANSITION_EASE, fill: 'forwards' },
    );

    overlayEl.animate([{ opacity: 0 }, { opacity: 1 }], {
      duration: dur(),
      easing: TRANSITION_EASE,
      fill: 'forwards',
    });

    fadeChrome(true);
    if (extended) {
      toolbarEl?.animate([{ opacity: 0, transform: 'translate(-50%, 16px)' }, { opacity: 1, transform: 'translate(-50%, 0)' }], {
        duration: dur(),
        easing: TRANSITION_EASE,
        fill: 'forwards',
        delay: 80,
      });
    }

    // Move focus into the modal so keyboard users land inside the dialog; the
    // stage (tabindex -1) is the fallback when there is no chrome to focus.
    (closeBtnEl ?? stageEl)?.focus();
  }

  // Close button, gallery chevrons, and counter all share a plain opacity fade;
  // the zoom toolbar keeps its bespoke slide so it's handled separately.
  function chromeFadeEls(): HTMLElement[] {
    const els: (HTMLElement | undefined)[] = [];
    if (extended || isGallery) els.push(closeBtnEl);
    if (isGallery) els.push(prevBtnEl, nextBtnEl, counterEl);
    return els.filter((el): el is HTMLElement => !!el);
  }

  function fadeChrome(showing: boolean) {
    for (const el of chromeFadeEls()) {
      el.animate([{ opacity: showing ? 0 : 1 }, { opacity: showing ? 1 : 0 }], {
        duration: dur(),
        easing: TRANSITION_EASE,
        fill: 'forwards',
        delay: showing ? 80 : 0,
      });
    }
  }

  function closeLightbox() {
    if (!open || !stageEl || !thumbEl || !overlayEl) return;
    cancelAnimations();
    const target = thumbEl.getBoundingClientRect();
    const from = stageEl.getBoundingClientRect();

    const anim = stageEl.animate(
      [
        { top: `${from.top}px`, left: `${from.left}px`, width: `${from.width}px`, height: `${from.height}px` },
        { top: `${target.top}px`, left: `${target.left}px`, width: `${target.width}px`, height: `${target.height}px` },
      ],
      { duration: dur(), easing: TRANSITION_EASE, fill: 'forwards' },
    );

    overlayEl.animate([{ opacity: 1 }, { opacity: 0 }], {
      duration: dur(),
      easing: TRANSITION_EASE,
      fill: 'forwards',
    });

    fadeChrome(false);
    if (extended) {
      toolbarEl?.animate([{ opacity: 1 }, { opacity: 0 }], {
        duration: dur(),
        easing: TRANSITION_EASE,
        fill: 'forwards',
      });
    }

    anim.onfinish = () => {
      scale = 1;
      offset = { x: 0, y: 0 };
      index = 0;
      open = false;
      mounted = false;
      document.body.style.overflow = '';
      restoreEditorOverlay();
      thumbEl?.focus();
    };
  }

  // Re-fit the open modal to the viewport — used on resize (snap) and when the
  // gallery image or its measured aspect changes (animated morph).
  function fitToViewport(animate: boolean) {
    if (!open || !stageEl) return;
    const target = viewportTarget();
    if (animate) {
      const from = stageEl.getBoundingClientRect();
      for (const a of stageEl.getAnimations()) {
        try { a.commitStyles(); } catch {}
        a.cancel();
      }
      stageEl.animate(
        [
          { top: `${from.top}px`, left: `${from.left}px`, width: `${from.width}px`, height: `${from.height}px` },
          { top: `${target.top}px`, left: `${target.left}px`, width: `${target.width}px`, height: `${target.height}px` },
        ],
        { duration: dur(), easing: TRANSITION_EASE, fill: 'forwards' },
      );
    } else {
      Object.assign(stageEl.style, {
        top: `${target.top}px`,
        left: `${target.left}px`,
        width: `${target.width}px`,
        height: `${target.height}px`,
      });
    }
    if (scale > maxScale) scale = maxScale; // a larger viewport lowers the natural-size cap
    offset = clampOffset(offset.x, offset.y, scale);
    applyTransform(scale, offset);
  }

  function settleNav() {
    incomingEl?.getAnimations().forEach((a) => a.cancel());
    outgoingEl?.getAnimations().forEach((a) => a.cancel());
    outgoing = null;
    navigating = false;
  }

  // dir: +1 when paging via the right chevron (content exits left, the next
  // image enters from the right), -1 for the left chevron.
  async function goTo(target: number, dir: number) {
    if (!isGallery) return;
    const n = ((target % items.length) + items.length) % items.length;
    if (n === index) return;
    if (navigating) settleNav();

    scale = 1;
    offset = { x: 0, y: 0 };
    applyTransform(scale, offset);

    outgoing = current;
    index = n;
    navigating = true;
    await tick();

    const exit = -NAV_SHIFT_PX * dir;
    outgoingEl?.animate(
      [
        { transform: 'translateX(0) scale(1)', opacity: 1 },
        { transform: `translateX(${exit}px) scale(${NAV_SCALE})`, opacity: 0 },
      ],
      { duration: dur(NAV_MS), easing: EASE_IN, fill: 'forwards' },
    );

    const enter = incomingEl?.animate(
      [
        { transform: `translateX(${-exit}px) scale(${NAV_SCALE})`, opacity: 0 },
        { transform: 'translateX(0) scale(1)', opacity: 1 },
      ],
      // `fill: both` holds the opacity-0 start state through the stagger delay,
      // otherwise the incoming image flashes at full opacity before sliding in.
      { duration: dur(NAV_MS), easing: EASE_OUT, fill: 'both', delay: dur(NAV_STAGGER_MS) },
    );

    fitToViewport(true); // resize the stage if the incoming aspect differs; a no-op when it matches

    if (enter) enter.onfinish = settleNav;
    else settleNav();
  }

  const next = () => goTo(index + 1, 1);
  const prev = () => goTo(index - 1, -1);

  function record(src: string, e: Event) {
    const img = e.currentTarget as HTMLImageElement;
    if (img.naturalWidth && img.naturalHeight) measured[src] = { w: img.naturalWidth, h: img.naturalHeight };
  }

  function onCoverLoad(e: Event) {
    if (cover) record(cover.src, e);
  }

  function onImgLoad(e: Event) {
    if (current) record(current.src, e);
    if (open) fitToViewport(true);
  }

  $effect(() => {
    if (!isGallery || typeof Image === 'undefined') return;
    for (const d of [index + 1, index - 1]) {
      const it = items[((d % items.length) + items.length) % items.length];
      if (it) new Image().src = it.src;
    }
  });

  function zoomTo(nextScale: number, anchor?: { x: number; y: number }) {
    const s = Math.max(MIN_SCALE, Math.min(maxScale, nextScale));
    if (s <= MIN_SCALE) {
      scale = MIN_SCALE;
      offset = { x: 0, y: 0 };
      applyTransform(scale, offset);
      return;
    }
    let nextOffset: { x: number; y: number };
    if (anchor && stageEl) {
      const r = stageEl.getBoundingClientRect();
      const dx = anchor.x - (r.left + r.width / 2);
      const dy = anchor.y - (r.top + r.height / 2);
      const ratio = scale > 0 ? s / scale : 1;
      nextOffset = clampOffset(dx * (1 - ratio) + offset.x * ratio, dy * (1 - ratio) + offset.y * ratio, s);
    } else {
      nextOffset = clampOffset(offset.x, offset.y, s);
    }
    scale = s;
    offset = nextOffset;
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

  function onStageClick() {
    if (didDrag) {
      didDrag = false;
      return;
    }
    if (!extended && !isGallery) closeLightbox();
  }

  // Keep Tab inside the open dialog. The stage (tabindex -1) is excluded, so an
  // image-only lightbox with no chrome simply holds focus on the stage.
  function trapTab(e: KeyboardEvent) {
    if (!modalEl) return;
    const f = [
      ...modalEl.querySelectorAll<HTMLElement>('button:not([disabled]), [href], [tabindex]:not([tabindex="-1"])'),
    ];
    if (f.length === 0) {
      e.preventDefault();
      stageEl?.focus();
      return;
    }
    const first = f[0];
    const last = f[f.length - 1];
    const active = document.activeElement as HTMLElement | null;
    const inside = active && modalEl.contains(active);
    if (e.shiftKey && (!inside || active === first)) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && (!inside || active === last)) {
      e.preventDefault();
      first.focus();
    }
  }

  onMount(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!open) return;
      if (e.key === 'Escape') {
        closeLightbox();
      } else if (e.key === 'Tab') {
        trapTab(e);
      } else if (isGallery && e.key === 'ArrowRight') {
        e.preventDefault();
        next();
      } else if (isGallery && e.key === 'ArrowLeft') {
        e.preventDefault();
        prev();
      }
    };
    vw = window.innerWidth;
    vh = window.innerHeight;
    const onResize = () => {
      vw = window.innerWidth;
      vh = window.innerHeight;
      fitToViewport(false);
    };
    const motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    reducedMotion = motionQuery.matches;
    const onMotionChange = (e: MediaQueryListEvent) => { reducedMotion = e.matches; };
    motionQuery.addEventListener('change', onMotionChange);
    document.addEventListener('keydown', onKey);
    window.addEventListener('resize', onResize);
    return () => {
      motionQuery.removeEventListener('change', onMotionChange);
      document.removeEventListener('keydown', onKey);
      window.removeEventListener('resize', onResize);
      document.body.style.overflow = '';
      restoreEditorOverlay();
    };
  });

  let percentLabel = $derived(`${Math.round(scale * 100)}%`);
</script>

<div
  class="image-lightbox-wrapper"
  style:aspect-ratio={coverAspect ? `${coverAspect}` : undefined}
  style:max-width={typeof maxWidth === 'number' ? `${maxWidth}px` : maxWidth}
>
  <button
    bind:this={thumbEl}
    class="image-lightbox-thumb"
    style:--imagelightbox-tile-object-fit={fit}
    type="button"
    aria-label={cover?.alt ? `Expand image: ${cover.alt}` : 'Expand image'}
    onclick={openLightbox}
  >
    <img src={cover?.src} alt={cover?.alt} draggable="false" onload={onCoverLoad} />
  </button>
</div>

{#if mounted}
  <div
    bind:this={modalEl}
    class="image-lightbox-modal"
    role="dialog"
    aria-modal="true"
    aria-label={dialogLabel}
    use:portal
  >
    <div
      bind:this={overlayEl}
      class="image-lightbox-overlay"
      class:active={open}
      aria-hidden="true"
      onclick={closeLightbox}
      role="presentation"
    ></div>

    {#if isGallery}
      <div class="image-lightbox-sr" aria-live="polite">{`Image ${index + 1} of ${items.length}`}</div>
    {/if}

    <div
      bind:this={stageEl}
      class="image-lightbox-stage"
      role="presentation"
      tabindex="-1"
      onclick={onStageClick}
      onpointerdown={onPointerDown}
      onpointermove={onPointerMove}
      onpointerup={onPointerUp}
      onpointercancel={onPointerUp}
      onwheel={onWheel}
    >
      <div class="image-lightbox-clip">
        <div bind:this={transformEl} class="image-lightbox-transform">
          {#if outgoing}
            <img bind:this={outgoingEl} class="image-lightbox-layer image-lightbox-layer-exit" src={outgoing.src} alt="" draggable="false" />
          {/if}
          <img bind:this={incomingEl} class="image-lightbox-layer" src={current?.src} alt={current?.alt} draggable="false" onload={onImgLoad} />
        </div>
      </div>
    </div>

    {#if extended || isGallery}
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
    {/if}

    {#if isGallery}
      <button
        bind:this={prevBtnEl}
        class="image-lightbox-chrome image-lightbox-nav image-lightbox-nav-prev"
        class:active={open}
        type="button"
        aria-label="Previous image"
        onclick={prev}
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.25" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
          <path d="M15 18l-6-6 6-6" />
        </svg>
      </button>
      <button
        bind:this={nextBtnEl}
        class="image-lightbox-chrome image-lightbox-nav image-lightbox-nav-next"
        class:active={open}
        type="button"
        aria-label="Next image"
        onclick={next}
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.25" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
          <path d="M9 6l6 6-6 6" />
        </svg>
      </button>
      <div bind:this={counterEl} class="image-lightbox-counter" aria-hidden="true">
        {index + 1} / {items.length}
      </div>
    {/if}

    {#if extended}
      <div bind:this={toolbarEl} class="image-lightbox-toolbar" class:active={open}>
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
          disabled={scale >= maxScale - 0.001}
          onclick={() => zoomTo(scale * ZOOM_STEP)}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.25" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
            <path d="M12 5v14" />
            <path d="M5 12h14" />
          </svg>
        </button>
      </div>
    {/if}
  </div>
{/if}

<style>
  :global(:root) {
    /* thumbnail (closed inline) + animated modal stage */
    --imagelightbox-tile-radius:           var(--radius-2xl);
    --imagelightbox-tile-border:           var(--color-transparent);
    --imagelightbox-tile-border-width:     var(--border-width-0);
    --imagelightbox-tile-shadow:           var(--shadow-md);
    --imagelightbox-tile-object-fit:       contain;

    /* overlay */
    --imagelightbox-overlay-surface:       color-mix(in srgb, var(--color-neutral-950) 76%, transparent);

    /* chrome (toolbar + close button) */
    --imagelightbox-chrome-surface:        var(--surface-neutral-low);
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

  .image-lightbox-thumb {
    position: absolute;
    inset: 0;
    padding: 0;
    cursor: zoom-in;
    border: var(--imagelightbox-tile-border-width) solid var(--imagelightbox-tile-border);
    border-radius: var(--imagelightbox-tile-radius);
    box-shadow: var(--imagelightbox-tile-shadow);
    background: transparent;
    overflow: hidden;
    transition: transform 250ms ease;
  }

  .image-lightbox-thumb:hover {
    transform: scale(1.02);
  }

  .image-lightbox-thumb:focus-visible {
    outline: 2px solid var(--border-brand-medium);
    outline-offset: 2px;
  }

  .image-lightbox-thumb img {
    width: 100%;
    height: 100%;
    object-fit: var(--imagelightbox-tile-object-fit);
    object-position: center;
    user-select: none;
    display: block;
  }

  .image-lightbox-modal {
    display: contents;
  }

  .image-lightbox-sr {
    position: fixed;
    width: 1px;
    height: 1px;
    padding: 0;
    margin: -1px;
    overflow: hidden;
    clip: rect(0 0 0 0);
    white-space: nowrap;
    border: 0;
  }

  .image-lightbox-stage {
    position: fixed;
    z-index: var(--z-modal);
    cursor: zoom-out;
    border: var(--imagelightbox-tile-border-width) solid var(--imagelightbox-tile-border);
    border-radius: var(--imagelightbox-tile-radius);
    box-shadow: var(--imagelightbox-tile-shadow);
    background: transparent;
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

  .image-lightbox-layer {
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;
    object-fit: contain;
    object-position: center;
    transform-origin: center center;
    user-select: none;
    pointer-events: none;
    display: block;
    /* Incoming layer sits above the exiting one so the new image fades in over
       the old; own compositor layer keeps the crossfade from flickering. */
    z-index: 1;
    will-change: transform, opacity;
    backface-visibility: hidden;
  }

  .image-lightbox-layer-exit {
    z-index: 0;
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
    /* 2.75rem = 44px, the min touch-target floor for primary nav. */
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

  .image-lightbox-nav {
    top: 50%;
    transform: translateY(-50%);
    /* 2.75rem = 44px, the min touch-target floor for primary nav. */
    width: 2.75rem;
    height: 2.75rem;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
  }

  .image-lightbox-nav-prev {
    left: var(--space-24);
  }

  .image-lightbox-nav-next {
    right: var(--space-24);
  }

  .image-lightbox-nav:hover {
    background: var(--imagelightbox-chrome-hover-surface);
  }

  .image-lightbox-counter {
    position: fixed;
    right: var(--space-24);
    bottom: var(--space-24);
    z-index: var(--z-modal);
    padding: var(--space-8) var(--space-16);
    background: var(--imagelightbox-chrome-surface);
    border: var(--imagelightbox-chrome-border-width) solid var(--imagelightbox-chrome-border);
    border-radius: var(--imagelightbox-chrome-radius);
    color: var(--imagelightbox-chrome-icon);
    backdrop-filter: blur(var(--blur-md));
    font-family: var(--font-mono);
    font-size: var(--font-size-xs);
    letter-spacing: var(--letter-spacing-wider);
    opacity: 0;
    pointer-events: none;
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
