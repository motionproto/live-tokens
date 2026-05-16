<script module lang="ts">
  import type { BadgeVariant } from './Badge.svelte';

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
    variant?: BadgeVariant;
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
  }
</script>

<script lang="ts">
  import Badge from './Badge.svelte';
  import { SvelteMap } from 'svelte/reactivity';
  // Playground chrome lives in its own CSS file so live token edits in the
  // editor don't repaint our animation. See FloatingTokenTags.css.
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
    'surface':      ['--surface-brand-high',  '--surface-canvas-high', '--surface-accent-high', '--surface-special-high'],
    'radius':       ['--radius-none',         '--radius-lg',           '--radius-2xl',          '--radius-full'],
    'border-color': ['--border-brand',        '--border-canvas',       '--border-accent',       '--border-special'],
    'border-width': ['--border-width-1',      '--border-width-2',      '--border-width-3',      '--border-width-5'],
    'font-family':  ['--font-display',        '--font-sans',           '--font-serif',          '--font-mono'],
  };

  const defaultTags: FloatingTag[] = [
    // Layout: surface + border-color flank the box at mid-height (far sides);
    // font + corner-radius sit above near the box; border-width sits below
    // centred. Roughly mirrors the user's sketch.
    {
      variant: 'primary',
      icon: 'fas fa-fill-drip',
      label: '--surface-brand-high',
      top: 35.9, left: 24.3, delay: 0,    rotate: 3,
      anchor: { side: 'inside', x: 10, y: 50 },
      controls: 'surface',
    },
    {
      variant: 'success',
      icon: 'fas fa-font',
      label: '--font-display',
      top: 18.9, left: 42.6, delay: -0.9, rotate: 2,
      anchor: { side: 'inside', x: 45, y: 28 },
      controls: 'font-family',
    },
    {
      variant: 'accent',
      icon: 'fa-solid fa-bezier-curve',
      label: '--radius-2xl',
      top: 25.8, left: 67.6, delay: -1.8, rotate: 2,
      anchor: { side: 'top', pos: 100 },
      controls: 'radius',
    },
    {
      variant: 'canvas',
      icon: 'fas fa-paint-roller',
      label: '--border-brand',
      top: 70.4, left: 73.6, delay: -3.6, rotate: -2,
      anchor: { side: 'right', pos: 55 },
      controls: 'border-color',
    },
    {
      variant: 'special',
      icon: 'fas fa-grip-lines',
      label: '--border-width-3',
      top: 77.7, left: 41.2, delay: -5.2, rotate: -3,
      anchor: { side: 'bottom', pos: 50 },
      controls: 'border-width',
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
  const defaultLabels = $derived(tags.map(t => t.label));
  let overrides = $state<Record<number, string>>({});
  const currentValues = $derived(defaultLabels.map((d, i) => overrides[i] ?? d));

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
  type BallState = { startedAt: number; duration: number };
  const ballStates = new SvelteMap<number, BallState>();
  const ballEls: HTMLSpanElement[] = [];

  // --- Element refs --------------------------------------------------------
  let stageEl: HTMLDivElement | undefined;
  const tagEls: HTMLSpanElement[] = [];
  const lineEls: SVGLineElement[] = [];

  // --- Anchor math ---------------------------------------------------------
  function anchorPoint(anchor: Anchor) {
    const cx = 50, cy = 50;
    const halfW = boxSize.w / 2, halfH = boxSize.h / 2;
    if (anchor.side === 'inside') {
      return {
        x: cx - halfW + (anchor.x / 100) * boxSize.w,
        y: cy - halfH + (anchor.y / 100) * boxSize.h,
      };
    }
    const t = anchor.pos / 100;
    switch (anchor.side) {
      case 'top':    return { x: cx - halfW + t * boxSize.w, y: cy - halfH };
      case 'bottom': return { x: cx - halfW + t * boxSize.w, y: cy + halfH };
      case 'left':   return { x: cx - halfW,                 y: cy - halfH + t * boxSize.h };
      case 'right':  return { x: cx + halfW,                 y: cy - halfH + t * boxSize.h };
    }
  }

  // Resolve the active CSS-var name for each control (reads `currentValues`).
  function resolveControl(name: TagControl): string | undefined {
    const idx = tags.findIndex(t => t.controls === name);
    return idx >= 0 ? currentValues[idx] : undefined;
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

    const now = performance.now();

    for (let i = 0; i < tags.length; i++) {
      const tagEl = tagEls[i];
      const lineEl = lineEls[i];
      if (!tagEl || !lineEl) continue;

      // Tag-side endpoint: pill cap (corner-radius circle) center on the
      // side closest to the central component.
      const badge = tagEl.querySelector('.badge') as HTMLElement | null;
      const target = (badge ?? tagEl) as HTMLElement;
      const r = target.getBoundingClientRect();

      let radius = 0;
      if (badge) {
        const cs = getComputedStyle(badge);
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
    overrides = { ...overrides, [i]: value };
    flashingIdx = i;
    window.setTimeout(() => {
      if (flashingIdx === i) flashingIdx = null;
    }, 500);
    // Spawn an energy ball; impact (and box bloop) fires at end of travel.
    const tag = tags[i];
    const variantColor = tag.variant ?? 'neutral';
    const ballEl = ballEls[i];
    if (ballEl) {
      ballEl.style.setProperty('--ftt-ball-color', `var(--text-${variantColor})`);
    }
    ballStates.set(i, { startedAt: performance.now(), duration: 520 });
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

  <!-- Central component — driven by the active token of each tag. The
       inline style:background/border-* references design tokens on purpose
       (this IS what should react to live token edits). -->
  <div
    class="ftt-box"
    class:ftt-bloop={bloopActive}
    style:width="{boxSize.w}%"
    style:height="{boxSize.h}%"
    style:background={surfaceVar ? `color-mix(in srgb, var(${surfaceVar}) 50%, transparent)` : undefined}
    style:border-radius={asVar(radiusVar)}
    style:border-color={asVar(borderColorVar)}
    style:border-width={asVar(borderWidthVar)}
  >
    <span
      class="ftt-box-label"
      style:font-family={asVar(fontFamilyVar)}
    >live tokens</span>
  </div>

  <!-- Anchor knots on the box. -->
  {#each tags as tag, i (i)}
    {@const a = anchorPoint(tag.anchor)}
    <span class="ftt-knot" style:left="{a.x}%" style:top="{a.y}%" aria-hidden="true"></span>
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
      style:top="{tagTop(i)}%"
      style:left="{tagLeft(i)}%"
      style:animation-delay="{tag.delay ?? 0}s"
      style:--ftt-rot="{tag.rotate ?? 0}deg"
    >
      {#if tag.controls}
        <span class="ftt-float-property">{controlLabels[tag.controls]}</span>
      {/if}
      <button
        type="button"
        class="ftt-badge-trigger"
        onpointerdown={(e) => onTagPointerDown(i, e)}
        onpointermove={(e) => onTagPointerMove(i, e)}
        onpointerup={(e) => onTagPointerUp(i, e)}
        aria-haspopup="listbox"
        aria-expanded={openIdx === i}
      >
        <Badge variant={tag.variant ?? 'neutral'} icon={tag.icon} size="small">
          {currentValues[i]}
        </Badge>
      </button>

      {#if openIdx === i && tag.controls}
        <ul class="ftt-dropdown" role="listbox">
          {#each valueOptions[tag.controls] as opt, k (opt)}
            <li>
              <button
                type="button"
                class="ftt-dropdown-item"
                class:ftt-active={currentValues[i] === opt}
                class:ftt-strobe={strobeIdx === k}
                disabled={currentValues[i] === opt}
                onclick={() => userPick(i, opt)}
              >
                {opt}
              </button>
            </li>
          {/each}
        </ul>
      {/if}
    </span>
  {/each}
</div>

