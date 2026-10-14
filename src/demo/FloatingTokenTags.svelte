<script module lang="ts">
  export type AnchorSide = 'top' | 'right' | 'bottom' | 'left';

  export type TagControl = 'surface' | 'radius' | 'border-color' | 'border-width' | 'font-family';

  /**
   * Where the kite string ties to the box. `inside` anchors are % of the
   * box's footprint; edge anchors are `pos` 0..100 along the named side.
   */
  export type Anchor =
    | { side: AnchorSide; pos: number }
    | { side: 'inside'; x: number; y: number };

  export interface FloatingTag {
    icon?: string;
    /** Initial value; typically a CSS-variable name. */
    label: string;
    /** Tag center, in % of the stage. */
    top: number;
    left: number;
    /** Stacked layout for a stage narrower than `NARROW_STAGE_PX`: tags form a
     *  column left of the box, `left` is the tag's left edge, and the string
     *  elbows into `anchor`. Nest anchors so higher tags land further right. */
    narrow?: { top: number; left: number; anchor: Anchor };
    /** Bob delay, seconds. Negative values offset the start. */
    delay?: number;
    /** Static tilt, degrees. */
    rotate?: number;
    anchor: Anchor;
    /** Visual property of the central box this tag drives. */
    controls?: TagControl;
    /** `top` chip sits above the box and opens down; `bottom` mirrors. */
    placement?: 'top' | 'bottom';
    /** `right-cap` pivots the tilt around the chip's right cap. */
    pivot?: 'center' | 'right-cap';
  }
</script>

<script lang="ts">
  import MenuSelect from '../system/components/MenuSelect.svelte';
  import { untrack } from 'svelte';
  import { SvelteMap } from 'svelte/reactivity';
  import { contrastTokenForBackground } from '../system/backdrop';
  // `.ftt-tag` is hand-rolled (not Badge) so editing badge-* tokens doesn't
  // repaint the playground. The dropdown uses MenuSelect on purpose.
  import './FloatingTokenTags.css';

  interface Props {
    tags?: FloatingTag[];
    duration?: number;
    distance?: number;
    boxSize?: { w: number; h: number };
    autoplay?: boolean;
  }

  const controlLabels: Record<TagControl, string> = {
    'surface':      'Surface color',
    'radius':       'Corner radius',
    'border-color': 'Border color',
    'border-width': 'Border width',
    'font-family':  'Font family',
  };

  // Surfaces use the `-high` step and borders the `-strong` step so the box
  // reads as the figure against the dark canvas. Picks span the hue wheel;
  // `special` is too close to the background to pull weight here.
  const valueOptions: Record<TagControl, string[]> = {
    'surface':      ['--surface-brand-high',  '--surface-accent-high', '--surface-success-high', '--surface-info-high'],
    'radius':       ['--radius-none',         '--radius-lg',           '--radius-2xl',           '--radius-full'],
    'border-color': ['--border-brand-strong', '--border-accent-strong','--border-success-strong','--border-info-strong'],
    'border-width': ['--border-width-1',      '--border-width-2',      '--border-width-3',       '--border-width-5'],
    'font-family':  ['--font-display',        '--font-sans',           '--font-serif',           '--font-mono'],
  };

  const defaultTags: FloatingTag[] = [
    {
      icon: 'fas fa-fill-drip',
      label: '--surface-brand-high',
      top: 15, left: 20, delay: 0,    rotate: 3,
      narrow: { top: 6,  left: 0,  anchor: { side: 'top', pos: 90 } },
      anchor: { side: 'inside', x: 10, y: 40 },
      controls: 'surface',
      placement: 'top',
      pivot: 'right-cap',
    },
    {
      icon: 'fas fa-font',
      label: '--font-display',
      top: 5, left: 45, delay: -0.9, rotate: 2,
      narrow: { top: 20, left: 5,  anchor: { side: 'top', pos: 64 } },
      anchor: { side: 'inside', x: 78, y: 28 },
      controls: 'font-family',
      placement: 'top',
    },
    {
      icon: 'fa-solid fa-bezier-curve',
      label: '--radius-2xl',
      top: 23, left: 75, delay: -1.8, rotate: 2,
      narrow: { top: 34, left: 10, anchor: { side: 'top', pos: 38 } },
      anchor: { side: 'top', pos: 100 },
      controls: 'radius',
      placement: 'top',
    },
    {
      icon: 'fas fa-paint-roller',
      label: '--border-brand-strong',
      top: 79, left: 72, delay: -3.6, rotate: -2,
      narrow: { top: 82, left: 8,  anchor: { side: 'bottom', pos: 84 } },
      anchor: { side: 'bottom', pos: 75 },
      controls: 'border-color',
      placement: 'top',
    },
    {
      icon: 'fas fa-grip-lines',
      label: '--border-width-3',
      top: 79, left: 28, delay: -5.2, rotate: -4,
      narrow: { top: 66, left: 3,  anchor: { side: 'bottom', pos: 44 } },
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

  // Two override layers, deliberately desynchronised: `overrides` commits at
  // selection (drives the tag label); `boxOverrides` commits at impact
  // (drives the box's style) so the box swaps in sync with the bloop.
  const defaultLabels = $derived(tags.map(t => t.label));
  let overrides = $state<Record<number, string>>({});
  let boxOverrides = $state<Record<number, string>>({});
  const currentValues = $derived(defaultLabels.map((d, i) => overrides[i] ?? d));
  const boxValues     = $derived(defaultLabels.map((d, i) => boxOverrides[i] ?? d));

  let openIdx = $state<number | null>(null);
  let strobeIdx = $state<number | null>(null);
  let flashingIdx = $state<number | null>(null);
  let bloopActive = $state(false);

  let dragOverrides = $state<Record<number, { top: number; left: number }>>({});
  let draggingIdx = $state<number | null>(null);
  const DRAG_THRESHOLD_PX = 4;
  const dragStart = { px: 0, py: 0, tagIdx: -1, moved: false };

  const NARROW_STAGE_PX = 480;
  let stageWidth = $state(0);
  const stacked = $derived(
    stageWidth > 0 && stageWidth < NARROW_STAGE_PX && tags.every(t => t.narrow),
  );

  function home(i: number): { top: number; left: number; anchor: Anchor } {
    return (stacked && tags[i].narrow) || tags[i];
  }
  function tagTop(i: number): number  { return dragOverrides[i]?.top  ?? home(i).top; }
  function tagLeft(i: number): number { return dragOverrides[i]?.left ?? home(i).left; }

  type BallState = { startedAt: number; duration: number; pendingValue: string };
  const ballStates = new SvelteMap<number, BallState>();
  // `$state` so `bind:this={ballEls[i]}` is a reactive binding target.
  const ballEls: HTMLSpanElement[] = $state([]);

  let stageEl: HTMLDivElement | undefined = $state();
  let svgEl: SVGSVGElement | undefined = $state();
  let boxEl: HTMLDivElement | undefined = $state();
  const tagEls: HTMLSpanElement[] = $state([]);
  const pathEls: SVGPathElement[] = $state([]);
  const knotEls: HTMLSpanElement[] = $state([]);

  type Rect = { x: number; y: number; w: number; h: number };

  function anchorPoint(anchor: Anchor, box: Rect): { x: number; y: number } {
    if (anchor.side === 'inside') {
      return { x: box.x + (anchor.x / 100) * box.w, y: box.y + (anchor.y / 100) * box.h };
    }
    const t = anchor.pos / 100;
    switch (anchor.side) {
      case 'top':    return { x: box.x + t * box.w, y: box.y };
      case 'bottom': return { x: box.x + t * box.w, y: box.y + box.h };
      case 'left':   return { x: box.x,             y: box.y + t * box.h };
      case 'right':  return { x: box.x + box.w,     y: box.y + t * box.h };
    }
  }

  const ELBOW_RADIUS_PX = 14;
  const px = (n: number) => n.toFixed(2);

  // Runs level out of the tag, then turns through a rounded corner into the box.
  function elbowPath(x1: number, y1: number, x2: number, y2: number): string {
    const sx = Math.sign(x2 - x1), sy = Math.sign(y2 - y1);
    const r = Math.min(ELBOW_RADIUS_PX, Math.abs(x2 - x1), Math.abs(y2 - y1));
    return `M${px(x1)} ${px(y1)} H${px(x2 - sx * r)} `
      + `Q${px(x2)} ${px(y1)} ${px(x2)} ${px(y1 + sy * r)} V${px(y2)}`;
  }

  // Reads `boxValues` (not `currentValues`) so the box repaints at impact.
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

  let lastPageBackground = '';
  let lastBoxBackground = '';
  function syncConnectorContrast() {
    if (!stageEl) return;
    const styles = getComputedStyle(stageEl);
    const pageBackground = styles.getPropertyValue('--page-bg').trim();
    if (pageBackground === lastPageBackground) return;
    lastPageBackground = pageBackground;
    const token = contrastTokenForBackground(pageBackground);
    stageEl.style.setProperty('--ftt-contrast-color', `var(${token})`);
    // Dark strokes on a light page read far heavier than white ones on a dark
    // page at the same alpha, so the light theme gets a thinner string.
    stageEl.style.setProperty('--ftt-string-opacity', token === '--color-black' ? '0.3' : '0.5');
  }

  function syncBoxLabelContrast() {
    if (!boxEl) return;
    const background = getComputedStyle(boxEl).backgroundColor;
    if (background === lastBoxBackground) return;
    lastBoxBackground = background;
    const token = contrastTokenForBackground(background);
    boxEl.style.setProperty('--ftt-box-contrast-color', `var(${token})`);
  }

  // Kite strings and energy balls are recomputed each frame from the box's
  // measured rect so intrinsic sizing drives anchor placement.
  let lastViewBox = '';
  function syncFrame() {
    if (!stageEl || !svgEl || !boxEl) return;
    syncConnectorContrast();
    syncBoxLabelContrast();
    const stageRect = stageEl.getBoundingClientRect();
    if (stageRect.width === 0 || stageRect.height === 0) return;

    // A pixel viewBox keeps the elbow corners round on any stage aspect.
    const viewBox = `0 0 ${px(stageRect.width)} ${px(stageRect.height)}`;
    if (viewBox !== lastViewBox) {
      svgEl.setAttribute('viewBox', viewBox);
      lastViewBox = viewBox;
    }

    const br = boxEl.getBoundingClientRect();
    const box: Rect = {
      x: br.left - stageRect.left,
      y: br.top - stageRect.top,
      w: br.width,
      h: br.height,
    };

    const now = performance.now();

    for (let i = 0; i < tags.length; i++) {
      const tagEl = tagEls[i];
      const pathEl = pathEls[i];
      if (!tagEl || !pathEl) continue;

      // Tag endpoint: center of the pill's rounded cap on the box-facing side.
      const pill = tagEl.querySelector('.ftt-tag') as HTMLElement | null;
      const target = (pill ?? tagEl) as HTMLElement;
      const r = target.getBoundingClientRect();

      let radius = 0;
      if (pill) {
        const cs = getComputedStyle(pill);
        const raw = parseFloat(cs.borderTopLeftRadius || '0') || 0;
        radius = Math.min(raw, r.height / 2);
      }

      const capOnRight = stacked || tagLeft(i) <= 50;
      const x1 = (capOnRight ? r.right - radius : r.left + radius) - stageRect.left;
      const y1 = r.top + r.height / 2 - stageRect.top;

      const a = anchorPoint(home(i).anchor, box);
      pathEl.setAttribute(
        'd',
        stacked ? elbowPath(x1, y1, a.x, a.y) : `M${px(x1)} ${px(y1)} L${px(a.x)} ${px(a.y)}`,
      );
      const knotEl = knotEls[i];
      if (knotEl) {
        knotEl.style.left = `${px(a.x)}px`;
        knotEl.style.top  = `${px(a.y)}px`;
      }

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
        // Commit at impact so the box's appearance changes with the bloop.
        boxOverrides = { ...boxOverrides, [i]: state.pendingValue };
        ballStates.delete(i);
        ballEl.style.opacity = '0';
        triggerBloop();
        continue;
      }
      const eased = 1 - Math.pow(1 - t, 3);
      const p = pathEl.getPointAtLength(pathEl.getTotalLength() * eased);
      ballEl.style.left = `${px(p.x)}px`;
      ballEl.style.top  = `${px(p.y)}px`;
      ballEl.style.opacity = '1';
    }
  }

  $effect(() => {
    let rafId = 0;
    const loop = () => {
      syncFrame();
      rafId = requestAnimationFrame(loop);
    };
    untrack(syncFrame);
    rafId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(rafId);
  });

  function pickValue(i: number, value: string) {
    openIdx = null;
    strobeIdx = null;
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

  // Any click pauses auto-cycle for at least this long.
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
    // The matching dropdown item is also rendered disabled; this is a safety net.
    if (currentValues[i] === value) return;
    noteUserAction();
    pickValue(i, value);
  }

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
      noteUserAction();
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

  let autoAlive = false;
  let lastAutoTagIdx: number | null = null;
  const sleep = (ms: number) => new Promise(r => window.setTimeout(r, ms));

  const STROBE_STEP_MS = 125;
  const BREATH_MS = 250;

  async function autoLoop() {
    while (autoAlive) {
      await sleep(2400 + Math.random() * 2400);
      if (!autoAlive) break;

      // Hold off while the user is interacting; re-check on each fresh click.
      while (autoAlive) {
        const sinceUser = performance.now() - lastUserActionAt;
        if (sinceUser >= USER_HOLD_MS) break;
        await sleep(USER_HOLD_MS - sinceUser);
      }
      if (!autoAlive) break;

      if (openIdx !== null) continue;

      // Never the same tag twice in a row.
      const tagCandidates = tags
        .map((_, idx) => idx)
        .filter(idx => idx !== lastAutoTagIdx && tags[idx].controls);
      if (tagCandidates.length === 0) continue;
      const i = tagCandidates[Math.floor(Math.random() * tagCandidates.length)];
      const tag = tags[i];
      const opts = valueOptions[tag.controls!];

      // Never the same token twice in a row.
      const currentIdx = opts.indexOf(currentValues[i]);
      const candidates = opts
        .map((_, k) => k)
        .filter(k => k !== currentIdx);
      if (candidates.length === 0) continue;
      const finalIdx = candidates[Math.floor(Math.random() * candidates.length)];

      openIdx = i;

      // Let the menu sit open before any highlight appears.
      await sleep(BREATH_MS);
      if (!autoAlive || openIdx !== i) continue;

      // Step from the top down to the chosen item.
      for (let k = 0; k <= finalIdx; k++) {
        if (!autoAlive || openIdx !== i) break;
        strobeIdx = k;
        await sleep(STROBE_STEP_MS);
      }
      if (!autoAlive || openIdx !== i) continue;

      // Blink twice on the selection.
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
  class:ftt-stacked={stacked}
  bind:this={stageEl}
  bind:clientWidth={stageWidth}
  style:--ftt-bob-duration="{duration}s"
  style:--ftt-bob-distance="{-distance}px"
>
  <svg class="ftt-strings" bind:this={svgEl} aria-hidden="true">
    {#each tags as _t, i (i)}
      <path
        bind:this={pathEls[i]}
        class="ftt-string"
        class:ftt-live={ballStates.has(i)}
      />
    {/each}
  </svg>

  <!-- Box is intrinsically sized to content + padding; boxSize is a floor. -->
  <div
    bind:this={boxEl}
    class="ftt-box"
    class:ftt-bloop={bloopActive}
    style:min-width="{boxSize.w}%"
    style:min-height="{boxSize.h}%"
    style:background={asVar(surfaceVar)}
    style:border-radius={asVar(radiusVar)}
    style:border-color={asVar(borderColorVar)}
    style:border-width={asVar(borderWidthVar)}
  >
    <span
      class="ftt-box-label"
      style:font-family={asVar(fontFamilyVar)}
    >I'm a button</span>
  </div>

  {#each tags as _t, i (i)}
    <span bind:this={knotEls[i]} class="ftt-knot" aria-hidden="true"></span>
  {/each}

  {#each tags as _t, i (i)}
    <span class="ftt-energy-ball" bind:this={ballEls[i]} aria-hidden="true"></span>
  {/each}

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
