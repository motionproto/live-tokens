<script module lang="ts">
  export type AnchorSide = 'top' | 'right' | 'bottom' | 'left';

  /** Which visual property of the central box this tag drives. */
  export type TagControl = 'surface' | 'radius' | 'border-color' | 'border-width' | 'font-family';

  /**
   * Where the kite string ties to the central box.
   * - Edge anchor: a point along one of the four box edges (`pos` 0..100).
   *   A corner is just `pos: 0` or `pos: 100` on an adjacent edge.
   * - Inside anchor: a point on the box surface, expressed as % of the
   *   box's own footprint (x: 0=left edge, 100=right edge).
   */
  export type Anchor =
    | { side: AnchorSide; pos: number }
    | { side: 'inside'; x: number; y: number };

  export interface FloatingTag {
    icon?: string;
    /** Typically a CSS-variable name. Used as the initial value. */
    label: string;
    /** Tag center, in % of the stage. */
    top: number;
    left: number;
    /** Bob delay, seconds. Negative values offset the start. */
    delay?: number;
    /** Static tilt of the tag, degrees. */
    rotate?: number;
    /** Where this tag's string ties to the central box. */
    anchor: Anchor;
    /** Property of the central box this tag drives (live preview of the token). */
    controls?: TagControl;
    /**
     * Vertical placement relative to the box. 'top' (default) sits the chip
     * above with the eyebrow on the outer (upper) side and the dropdown
     * opening downward. 'bottom' mirrors: chip below, eyebrow on the outer
     * (lower) side, dropdown opening upward toward the box.
     */
    placement?: 'top' | 'bottom';
    /**
     * Pivot point for the `rotate` tilt. Default rotates around the wrapper
     * center. `'right-cap'` pivots around the chip's right semicircular cap
     * so the right end stays put while the rest of the tag swings.
     */
    pivot?: 'center' | 'right-cap';
  }
</script>

<script lang="ts">
  import MenuSelect from './MenuSelect.svelte';
  import { SvelteMap } from 'svelte/reactivity';
  // Playground chrome lives in its own CSS file so live token edits in the
  // editor don't repaint our animation. The floating tag pills are rendered
  // with a self-contained `.ftt-tag` element (not the Badge component) so the
  // demo stays visually stable while the user edits badge-* tokens. The one
  // exception is the dropdown panel — it renders through MenuSelect on
  // purpose, so editing the menuselect-* tokens reshapes the in-flight UI.
  // See FloatingTokenTags.css.
  import './FloatingTokenTags.css';

  interface Props {
    tags?: FloatingTag[];
    duration?: number;
    distance?: number;
    boxSize?: { w: number; h: number };
    /** Auto-cycle through values when idle. */
    autoplay?: boolean;
  }

  const controlLabels: Record<TagControl, string> = {
    'surface':      'Surface color',
    'radius':       'Corner radius',
    'border-color': 'Border color',
    'border-width': 'Border width',
    'font-family':  'Font family',
  };

  // Four candidate token values per control. Picked to span the visible
  // gamut so cycling produces noticeably different box states.
  const valueOptions: Record<TagControl, string[]> = {
    'surface':      ['--surface-brand-low',   '--surface-danger-low',  '--surface-accent-low',  '--surface-special-low'],
    'radius':       ['--radius-none',         '--radius-lg',           '--radius-2xl',          '--radius-full'],
    'border-color': ['--border-brand',        '--border-danger',       '--border-success',      '--border-special'],
    'border-width': ['--border-width-1',      '--border-width-2',      '--border-width-3',      '--border-width-5'],
    'font-family':  ['--font-display',        '--font-sans',           '--font-serif',          '--font-mono'],
  };

  const defaultTags: FloatingTag[] = [
    // Layout: three chips arc across the top above the box, two chips mirror
    // them below. Upper chips carry the eyebrow on the outer (upper) side and
    // open their dropdown downward toward the box; lower chips invert both.
    // Kite anchors are computed each frame against the box's *measured* rect,
    // so the central element can size itself like a normal div (intrinsic to
    // content + padding) and the strings still land.
    {
      icon: 'fas fa-fill-drip',
      label: '--surface-brand-low',
      top: 15, left: 20, delay: 0,    rotate: 3,
      anchor: { side: 'inside', x: 10, y: 40 },
      controls: 'surface',
      placement: 'top',
      pivot: 'right-cap',
    },
    {
      icon: 'fas fa-font',
      label: '--font-display',
      top: 5, left: 42, delay: -0.9, rotate: 2,
      anchor: { side: 'inside', x: 78, y: 28 },
      controls: 'font-family',
      placement: 'top',
    },
    {
      icon: 'fa-solid fa-bezier-curve',
      label: '--radius-2xl',
      top: 23, left: 75, delay: -1.8, rotate: 2,
      anchor: { side: 'top', pos: 100 },
      controls: 'radius',
      placement: 'top',
    },
    {
      icon: 'fas fa-paint-roller',
      label: '--border-brand',
      top: 79, left: 72, delay: -3.6, rotate: -2,
      anchor: { side: 'bottom', pos: 75 },
      controls: 'border-color',
      placement: 'top',
    },
    {
      icon: 'fas fa-grip-lines',
      label: '--border-width-3',
      top: 79, left: 28, delay: -5.2, rotate: -4,
      anchor: { side: 'bottom', pos: 25 },
      controls: 'border-width',
      placement: 'top',
    },
  ];

  let {
    tags = defaultTags,
    duration = 7,
    distance = 8,
    boxSize = { w: 14, h: 11 },
    autoplay = true,
  }: Props = $props();

  // --- Per-tag mutable state ----------------------------------------------
  // Tag values are modelled as defaults (derived from the `tags` prop) plus
  // user overrides. This keeps `currentValues` reactive to prop changes
  // without losing user picks, and avoids capturing only the initial `tags`.
  // Two override layers, deliberately desynchronised: `overrides` drives the
  // floating tag's badge label (commits at selection); `boxOverrides` drives
  // the central component's style (commits only when the energy ball lands).
  const defaultLabels = $derived(tags.map(t => t.label));
  let overrides = $state<Record<number, string>>({});
  let boxOverrides = $state<Record<number, string>>({});
  const currentValues = $derived(defaultLabels.map((d, i) => overrides[i] ?? d));
  const boxValues     = $derived(defaultLabels.map((d, i) => boxOverrides[i] ?? d));

  let openIdx = $state<number | null>(null);
  let strobeIdx = $state<number | null>(null);
  let flashingIdx = $state<number | null>(null);
  let bloopActive = $state(false);

  // Drag state — per-tag overrides for {top, left} in stage % space. Click vs
  // drag is distinguished by a small pixel threshold on pointer movement.
  let dragOverrides = $state<Record<number, { top: number; left: number }>>({});
  let draggingIdx = $state<number | null>(null);
  const DRAG_THRESHOLD_PX = 4;
  const dragStart = { px: 0, py: 0, tagIdx: -1, moved: false };

  function tagTop(i: number): number  { return dragOverrides[i]?.top  ?? tags[i].top; }
  function tagLeft(i: number): number { return dragOverrides[i]?.left ?? tags[i].left; }

  // Energy balls are imperative — keyed by tag index. Updated each rAF tick.
  // SvelteMap so the template can react to in-flight state (line glow).
  // `pendingValue` is the token swap that commits on impact, not on launch —
  // so the box visibly changes at the moment of the bloop.
  type BallState = { startedAt: number; duration: number; pendingValue: string };
  const ballStates = new SvelteMap<number, BallState>();
  // Element-ref arrays are `$state` so Svelte 5 considers
  // `bind:this={ballEls[i]}` etc. a reactive binding target. They're only
  // read imperatively from the rAF loop, so there's no extra reactivity cost.
  const ballEls: HTMLSpanElement[] = $state([]);

  // --- Element refs --------------------------------------------------------
  let stageEl: HTMLDivElement | undefined = $state();
  let boxEl: HTMLDivElement | undefined = $state();
  const tagEls: HTMLSpanElement[] = $state([]);
  const lineEls: SVGLineElement[] = $state([]);
  const knotEls: HTMLSpanElement[] = $state([]);

  // --- Anchor math ---------------------------------------------------------
  // `cx`/`cy`/`w`/`h` are the box's centre and dimensions in stage-% space.
  // Defaults fall back to `boxSize` for the first paint (before syncFrame
  // measures the actual box). Runtime calls in syncFrame pass the live rect.
  function anchorPoint(
    anchor: Anchor,
    cx = 50,
    cy = 50,
    w = boxSize.w,
    h = boxSize.h,
  ): { x: number; y: number } {
    const halfW = w / 2, halfH = h / 2;
    if (anchor.side === 'inside') {
      return {
        x: cx - halfW + (anchor.x / 100) * w,
        y: cy - halfH + (anchor.y / 100) * h,
      };
    }
    const t = anchor.pos / 100;
    switch (anchor.side) {
      case 'top':    return { x: cx - halfW + t * w, y: cy - halfH };
      case 'bottom': return { x: cx - halfW + t * w, y: cy + halfH };
      case 'left':   return { x: cx - halfW,         y: cy - halfH + t * h };
      case 'right':  return { x: cx + halfW,         y: cy - halfH + t * h };
    }
  }

  // Resolve the active CSS-var name for each control. Reads `boxValues` (not
  // `currentValues`) so the central component only repaints once the ball
  // commits its payload at impact.
  function resolveControl(name: TagControl): string | undefined {
    const idx = tags.findIndex(t => t.controls === name);
    return idx >= 0 ? boxValues[idx] : undefined;
  }
  const surfaceVar     = $derived(resolveControl('surface'));
  const radiusVar      = $derived(resolveControl('radius'));
  const borderColorVar = $derived(resolveControl('border-color'));
  const borderWidthVar = $derived(resolveControl('border-width'));
  const fontFamilyVar  = $derived(resolveControl('font-family'));

  function asVar(name: string | undefined): string | undefined {
    return name ? `var(${name})` : undefined;
  }

  // --- Animation loop: kite strings + energy balls ------------------------
  function syncFrame() {
    if (!stageEl) return;
    const stageRect = stageEl.getBoundingClientRect();
    if (stageRect.width === 0 || stageRect.height === 0) return;

    // Box geometry in stage-% space — measured from the live rect so that
    // intrinsic sizing (content + padding) drives anchor placement.
    let boxCx = 50, boxCy = 50;
    let boxW = boxSize.w, boxH = boxSize.h;
    if (boxEl) {
      const br = boxEl.getBoundingClientRect();
      if (br.width > 0 && br.height > 0) {
        boxCx = ((br.left + br.width / 2) - stageRect.left) / stageRect.width * 100;
        boxCy = ((br.top  + br.height / 2) - stageRect.top)  / stageRect.height * 100;
        boxW  = (br.width  / stageRect.width)  * 100;
        boxH  = (br.height / stageRect.height) * 100;
      }
    }

    const now = performance.now();

    for (let i = 0; i < tags.length; i++) {
      const tagEl = tagEls[i];
      const lineEl = lineEls[i];
      if (!tagEl || !lineEl) continue;

      // Tag-side endpoint: pill cap (corner-radius circle) center on the
      // side closest to the central component.
      const pill = tagEl.querySelector('.ftt-tag') as HTMLElement | null;
      const target = (pill ?? tagEl) as HTMLElement;
      const r = target.getBoundingClientRect();

      let radius = 0;
      if (pill) {
        const cs = getComputedStyle(pill);
        const raw = parseFloat(cs.borderTopLeftRadius || '0') || 0;
        radius = Math.min(raw, r.height / 2);
      }

      const onRight = tags[i].left > 50;
      const px = onRight ? r.left + radius : r.right - radius;
      const py = r.top + r.height / 2;

      const x1 = (px - stageRect.left) / stageRect.width * 100;
      const y1 = (py - stageRect.top)  / stageRect.height * 100;

      lineEl.setAttribute('x1', x1.toFixed(3));
      lineEl.setAttribute('y1', y1.toFixed(3));

      // Box-side endpoint + knot — recomputed from live box geometry.
      const a = anchorPoint(tags[i].anchor, boxCx, boxCy, boxW, boxH);
      lineEl.setAttribute('x2', a.x.toFixed(3));
      lineEl.setAttribute('y2', a.y.toFixed(3));
      const knotEl = knotEls[i];
      if (knotEl) {
        knotEl.style.left = `${a.x.toFixed(3)}%`;
        knotEl.style.top  = `${a.y.toFixed(3)}%`;
      }

      // Energy ball traveling tag → box along the same line.
      const ballEl = ballEls[i];
      const state = ballStates.get(i);
      if (!ballEl) continue;
      if (!state) {
        ballEl.style.opacity = '0';
        continue;
      }
      const elapsed = now - state.startedAt;
      const t = Math.min(1, elapsed / state.duration);
      if (t >= 1) {
        // Commit the box's token swap at impact so its appearance changes in
        // sync with the bloop (the "pops up and grows larger" beat). Until
        // this point the box keeps rendering the previous value.
        boxOverrides = { ...boxOverrides, [i]: state.pendingValue };
        ballStates.delete(i);
        ballEl.style.opacity = '0';
        triggerBloop();
        continue;
      }
      const x2 = parseFloat(lineEl.getAttribute('x2') || '0');
      const y2 = parseFloat(lineEl.getAttribute('y2') || '0');
      const eased = 1 - Math.pow(1 - t, 3); // ease-out cubic
      const bx = x1 + (x2 - x1) * eased;
      const by = y1 + (y2 - y1) * eased;
      ballEl.style.left = `${bx.toFixed(3)}%`;
      ballEl.style.top  = `${by.toFixed(3)}%`;
      ballEl.style.opacity = '1';
    }
  }

  $effect(() => {
    let rafId = 0;
    const loop = () => {
      syncFrame();
      rafId = requestAnimationFrame(loop);
    };
    rafId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(rafId);
  });

  // --- Selection / fire sequence ------------------------------------------
  function pickValue(i: number, value: string) {
    openIdx = null;
    strobeIdx = null;
    // Commit the tag's badge label immediately so the user gets a "you picked
    // this" confirmation. The central box waits — its commit is carried by
    // the energy ball and lands at impact.
    overrides = { ...overrides, [i]: value };
    flashingIdx = i;
    window.setTimeout(() => {
      if (flashingIdx === i) flashingIdx = null;
    }, 500);
    ballStates.set(i, { startedAt: performance.now(), duration: 520, pendingValue: value });
  }

  function triggerBloop() {
    bloopActive = true;
    window.setTimeout(() => { bloopActive = false; }, 480);
  }

  // User-interaction cooldown: any click pauses the auto-loop for at least
  // USER_HOLD_MS so the user can play without being interrupted.
  const USER_HOLD_MS = 4000;
  let lastUserActionAt = 0;
  function noteUserAction() {
    lastUserActionAt = performance.now();
  }

  function clickTag(i: number) {
    if (!tags[i].controls) return;
    noteUserAction();
    openIdx = openIdx === i ? null : i;
  }

  function userPick(i: number, value: string) {
    // The current value can never be re-picked — the dropdown item is also
    // rendered disabled, this guard is a safety net.
    if (currentValues[i] === value) return;
    noteUserAction();
    pickValue(i, value);
  }

  // --- Drag handlers ------------------------------------------------------
  function onTagPointerDown(i: number, e: PointerEvent) {
    dragStart.px = e.clientX;
    dragStart.py = e.clientY;
    dragStart.tagIdx = i;
    dragStart.moved = false;
    (e.currentTarget as Element).setPointerCapture(e.pointerId);
  }

  function onTagPointerMove(i: number, e: PointerEvent) {
    if (dragStart.tagIdx !== i || !stageEl) return;
    const dx = e.clientX - dragStart.px;
    const dy = e.clientY - dragStart.py;
    if (!dragStart.moved && Math.hypot(dx, dy) > DRAG_THRESHOLD_PX) {
      dragStart.moved = true;
      draggingIdx = i;
      openIdx = null;
      noteUserAction(); // pause auto-cycle while dragging
    }
    if (dragStart.moved) {
      const r = stageEl.getBoundingClientRect();
      const x = ((e.clientX - r.left) / r.width) * 100;
      const y = ((e.clientY - r.top)  / r.height) * 100;
      dragOverrides = { ...dragOverrides, [i]: { top: y, left: x } };
    }
  }

  function onTagPointerUp(i: number, e: PointerEvent) {
    if (dragStart.tagIdx !== i) return;
    (e.currentTarget as Element).releasePointerCapture(e.pointerId);
    if (dragStart.moved) {
      const p = dragOverrides[i];
      // eslint-disable-next-line no-console
      console.log(
        `[${i}] ${tags[i].controls ?? '?'}: top: ${p.top.toFixed(1)}, left: ${p.left.toFixed(1)},`,
      );
    } else {
      clickTag(i);
    }
    draggingIdx = null;
    dragStart.tagIdx = -1;
    dragStart.moved = false;
  }

  // --- Auto-cycle ----------------------------------------------------------
  let autoAlive = false;
  let lastAutoTagIdx: number | null = null;
  const sleep = (ms: number) => new Promise(r => window.setTimeout(r, ms));

  const STROBE_STEP_MS = 125;
  const BREATH_MS = 250;

  async function autoLoop() {
    while (autoAlive) {
      await sleep(2400 + Math.random() * 2400);
      if (!autoAlive) break;

      // Hold off if the user clicked anything recently. Re-check after each
      // partial sleep so a fresh click resets the wait.
      while (autoAlive) {
        const sinceUser = performance.now() - lastUserActionAt;
        if (sinceUser >= USER_HOLD_MS) break;
        await sleep(USER_HOLD_MS - sinceUser);
      }
      if (!autoAlive) break;

      if (openIdx !== null) continue; // user is interacting

      // Never the same tag twice in a row.
      const tagCandidates = tags
        .map((_, idx) => idx)
        .filter(idx => idx !== lastAutoTagIdx && tags[idx].controls);
      if (tagCandidates.length === 0) continue;
      const i = tagCandidates[Math.floor(Math.random() * tagCandidates.length)];
      const tag = tags[i];
      const opts = valueOptions[tag.controls!];

      // Never the same token twice in a row: exclude the currently-active
      // value from the candidate set.
      const currentIdx = opts.indexOf(currentValues[i]);
      const candidates = opts
        .map((_, k) => k)
        .filter(k => k !== currentIdx);
      if (candidates.length === 0) continue;
      const finalIdx = candidates[Math.floor(Math.random() * candidates.length)];

      openIdx = i;

      // Breath: open menu, let it sit before any highlight appears.
      await sleep(BREATH_MS);
      if (!autoAlive || openIdx !== i) continue;

      // Step from the top down to the chosen item, one step per STROBE_STEP_MS.
      // Landing position is wherever finalIdx lands — could be the first item
      // (no stepping), could be the fourth.
      for (let k = 0; k <= finalIdx; k++) {
        if (!autoAlive || openIdx !== i) break;
        strobeIdx = k;
        await sleep(STROBE_STEP_MS);
      }
      if (!autoAlive || openIdx !== i) continue;

      // Blink twice on the selection (off/on x2).
      for (let blink = 0; blink < 2; blink++) {
        if (!autoAlive || openIdx !== i) break;
        strobeIdx = null;
        await sleep(STROBE_STEP_MS);
        if (!autoAlive || openIdx !== i) break;
        strobeIdx = finalIdx;
        await sleep(STROBE_STEP_MS);
      }
      if (!autoAlive || openIdx !== i) continue;

      pickValue(i, opts[finalIdx]);
      lastAutoTagIdx = i;
    }
  }

  $effect(() => {
    if (!autoplay) return;
    autoAlive = true;
    autoLoop();
    return () => { autoAlive = false; };
  });
</script>

<div
  class="ftt-stage"
  bind:this={stageEl}
  style:--ftt-bob-duration="{duration}s"
  style:--ftt-bob-distance="{-distance}px"
>
  <!-- Kite strings -->
  <svg class="ftt-strings" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
    {#each tags as tag, i (i)}
      {@const a = anchorPoint(tag.anchor)}
      <line
        bind:this={lineEls[i]}
        x1={tag.left} y1={tag.top}
        x2={a.x}      y2={a.y}
        class="ftt-string"
        class:ftt-live={ballStates.has(i)}
      />
    {/each}
  </svg>

  <!-- Central component — driven by the active token of each tag. Sized
       intrinsically: width/height grow to fit content + padding. boxSize
       is a baseline (min-width/min-height) so a short label can't shrink
       the box past a sensible footprint. -->
  <div
    bind:this={boxEl}
    class="ftt-box"
    class:ftt-bloop={bloopActive}
    style:min-width="{boxSize.w}%"
    style:min-height="{boxSize.h}%"
    style:background={surfaceVar ? `color-mix(in srgb, var(${surfaceVar}) 50%, transparent)` : undefined}
    style:border-radius={asVar(radiusVar)}
    style:border-color={asVar(borderColorVar)}
    style:border-width={asVar(borderWidthVar)}
  >
    <span
      class="ftt-box-label"
      style:font-family={asVar(fontFamilyVar)}
    >I'm a button</span>
  </div>

  <!-- Anchor knots on the box. Initial position uses anchorPoint() defaults;
       syncFrame imperatively updates each frame from the box's live rect. -->
  {#each tags as tag, i (i)}
    {@const a = anchorPoint(tag.anchor)}
    <span
      bind:this={knotEls[i]}
      class="ftt-knot"
      style:left="{a.x}%"
      style:top="{a.y}%"
      aria-hidden="true"
    ></span>
  {/each}

  <!-- Energy balls — positioned each frame by syncFrame() while in flight. -->
  {#each tags as _t, i (i)}
    <span class="ftt-energy-ball" bind:this={ballEls[i]} aria-hidden="true"></span>
  {/each}

  <!-- Floating tags. -->
  {#each tags as tag, i (i)}
    <span
      bind:this={tagEls[i]}
      class="ftt-float"
      class:ftt-flash={flashingIdx === i}
      class:ftt-open={openIdx === i}
      class:ftt-dragging={draggingIdx === i}
      data-placement={tag.placement ?? 'top'}
      data-pivot={tag.pivot ?? 'center'}
      style:top="{tagTop(i)}%"
      style:left="{tagLeft(i)}%"
      style:animation-delay="{tag.delay ?? 0}s"
      style:--ftt-rot="{tag.rotate ?? 0}deg"
    >
      {#if tag.controls}
        <span class="ftt-float-property">{controlLabels[tag.controls]}</span>
      {/if}
      <span class="ftt-chip-host">
        <button
          type="button"
          class="ftt-tag-trigger"
          onpointerdown={(e) => onTagPointerDown(i, e)}
          onpointermove={(e) => onTagPointerMove(i, e)}
          onpointerup={(e) => onTagPointerUp(i, e)}
          aria-haspopup="listbox"
          aria-expanded={openIdx === i}
        >
          <span class="ftt-tag">
            {#if tag.icon}<span class="ftt-tag-icon"><i class={tag.icon}></i></span>{/if}
            <span class="ftt-tag-label">{currentValues[i]}</span>
          </span>
        </button>

        {#if openIdx === i && tag.controls}
          {@const opts = valueOptions[tag.controls]}
          {@const strobeValue = strobeIdx !== null ? opts[strobeIdx] : null}
          <div class="ftt-dropdown-wrap">
            <MenuSelect
              items={opts.map((opt) => ({ value: opt, label: opt }))}
              value={currentValues[i]}
              forceHoverValue={strobeValue}
              onchange={(v) => userPick(i, v)}
            />
          </div>
        {/if}
      </span>
    </span>
  {/each}
</div>

