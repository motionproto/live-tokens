<script lang="ts">
  import { onDestroy } from 'svelte';
  import { hexToOklch, oklchToHex, gamutClamp } from '../../core/palettes/oklch';
  import { PALETTE_SPECS } from '../../core/palettes/paletteDerivation';
  import { editorState, beginScope, commitScope, cancelScope, type Scope } from '../../core/store/editorStore';
  import { maxChroma } from './colorWheelMath';
  import { setBaseLightnessChroma } from './paletteBaseColor';

  interface Props {
    selected: string | null;
    /** Shared with the wheel: off preserves relative saturation as L moves
     *  (wheel dot holds radius); on preserves absolute chroma (dot drifts,
     *  desaturates at the L extremes where that chroma leaves gamut). */
    absoluteChroma: boolean;
  }

  let { selected, absoluteChroma }: Props = $props();

  const L_STEP = 0.02;
  const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));

  let track: HTMLDivElement | undefined = $state();
  let canvas: HTMLCanvasElement | undefined = $state();
  let trackWidth = $state(300);

  let selectedColor = $derived.by(() => {
    const spec = PALETTE_SPECS.find((s) => s.label === selected) ?? PALETTE_SPECS[0];
    const hex = (selected != null && $editorState.palettes[selected]?.baseColor) || spec.initialColor;
    return hexToOklch(hex);
  });

  // ── Transient L-drag intent ────────────────────────────────────────────────
  // Pristine gesture-start coords, captured once at pointerdown. The gradient
  // and every write are computed from these + the live pointer L, NEVER
  // re-derived from the just-written 8-bit hex (that round-trip is lossy and
  // makes the thumb / hue twitch). `gesture` identity changes only at the
  // gesture boundaries, so the strip repaints on start/end, not on each move.
  type Gesture = { hue0: number; chroma0: number; rFrac0: number };
  let gesture = $state<Gesture | null>(null);
  let pointerL = $state(0);
  let dragScope: Scope | null = null;

  const rFracOf = (l: number, c: number, h: number) => clamp(c / (maxChroma(l, h) || 1e-6), 0, 1);

  // Hue + saturation intent driving the strip: pristine during a drag, store
  // value at rest. Hue is fixed for the whole L gesture.
  let barHue = $derived(gesture ? gesture.hue0 : selectedColor.h);
  let barChroma0 = $derived(gesture ? gesture.chroma0 : selectedColor.c);
  let barRFrac0 = $derived(gesture ? gesture.rFrac0 : rFracOf(selectedColor.l, selectedColor.c, selectedColor.h));
  // Thumb position: pointer intent mid-drag, store L at rest.
  let renderL = $derived(gesture ? pointerL : selectedColor.l);

  $effect(() => {
    const el = track;
    if (!el || typeof ResizeObserver === 'undefined') return;
    const ro = new ResizeObserver((entries) => {
      const w = entries[0]?.contentRect.width ?? 0;
      if (w > 0) trackWidth = Math.round(w);
    });
    ro.observe(el);
    return () => ro.disconnect();
  });

  // Repaint the strip only when the fixed axes (hue, saturation intent, mode,
  // width) change — never on pointerL, so an L drag doesn't re-render it.
  $effect(() => {
    const cv = canvas;
    if (!cv) return;
    const hue = barHue;
    const mode = absoluteChroma;
    const chroma0 = barChroma0;
    const rFrac0 = barRFrac0;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const px = Math.max(1, Math.round(trackWidth * dpr));
    cv.width = px;
    cv.height = 1;
    const ctx = cv.getContext('2d');
    if (ctx) renderStrip(ctx, px, hue, mode, chroma0, rFrac0);
  });

  // L 0→1 swept left→right at the fixed hue, gamut-clamped per column. Relative:
  // per-column chroma = rFrac0·maxChroma(L, hue) (constant colorfulness fraction).
  // Absolute: chroma0 held, clamped inward where it leaves gamut at the extremes.
  function renderStrip(
    ctx: CanvasRenderingContext2D,
    px: number,
    hue: number,
    mode: boolean,
    chroma0: number,
    rFrac0: number,
  ) {
    const img = ctx.createImageData(px, 1);
    const data = img.data;
    for (let x = 0; x < px; x++) {
      const L = px === 1 ? 0.5 : x / (px - 1);
      const chroma = mode ? chroma0 : rFrac0 * maxChroma(L, hue);
      const g = gamutClamp(L, chroma, hue);
      const hex = oklchToHex(g.l, g.c, g.h);
      const i = x * 4;
      data[i] = parseInt(hex.slice(1, 3), 16);
      data[i + 1] = parseInt(hex.slice(3, 5), 16);
      data[i + 2] = parseInt(hex.slice(5, 7), 16);
      data[i + 3] = 255;
    }
    ctx.putImageData(img, 0, 0);
  }

  function lFromEvent(e: PointerEvent): number {
    const r = track!.getBoundingClientRect();
    return clamp((e.clientX - r.left) / r.width, 0, 1);
  }

  function startDrag(e: PointerEvent) {
    if (e.button !== 0 || selected == null) return;
    e.preventDefault();
    const sc = selectedColor;
    gesture = { hue0: sc.h, chroma0: sc.c, rFrac0: rFracOf(sc.l, sc.c, sc.h) };
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    dragScope = beginScope({ label: `colors: ${selected} lightness`, collapseToOne: true, clipUndoFloor: true });
    window.addEventListener('keydown', onGestureKey, true);
    applyDrag(e);
  }

  function applyDrag(e: PointerEvent) {
    if (!gesture || selected == null) return;
    const L = lFromEvent(e);
    pointerL = L;
    const chroma = absoluteChroma ? gesture.chroma0 : gesture.rFrac0 * maxChroma(L, gesture.hue0);
    setBaseLightnessChroma(selected, gesture.hue0, L, chroma);
  }

  function endDrag() {
    if (!dragScope) return;
    commitScope(dragScope);
    dragScope = null;
    gesture = null;
    window.removeEventListener('keydown', onGestureKey, true);
  }

  function onGestureKey(e: KeyboardEvent) {
    if (e.key !== 'Escape' || !dragScope) return;
    e.preventDefault();
    cancelScope(dragScope);
    dragScope = null;
    gesture = null;
    window.removeEventListener('keydown', onGestureKey, true);
  }

  // Discrete keyboard nudge — one store mutation = one undo (no scope).
  function thumbKey(e: KeyboardEvent) {
    if (selected == null) return;
    let dir = 0;
    if (e.key === 'ArrowLeft') dir = -1;
    else if (e.key === 'ArrowRight') dir = 1;
    else return;
    e.preventDefault();
    const sc = selectedColor;
    const newL = clamp(sc.l + dir * L_STEP, 0, 1);
    const chroma = absoluteChroma ? sc.c : rFracOf(sc.l, sc.c, sc.h) * maxChroma(newL, sc.h);
    setBaseLightnessChroma(selected, sc.h, newL, chroma);
  }

  onDestroy(() => {
    if (dragScope) {
      cancelScope(dragScope);
      dragScope = null;
    }
    if (typeof window !== 'undefined') window.removeEventListener('keydown', onGestureKey, true);
  });
</script>

<div class="lightness">
  <div class="lightness-head">
    <span class="lightness-label">Lightness</span>
    <span class="lightness-value">{Math.round(renderL * 100)}%</span>
  </div>
  <!-- svelte-ignore a11y_no_static_element_interactions -->
  <div
    class="lbar"
    bind:this={track}
    onpointerdown={startDrag}
    onpointermove={applyDrag}
    onpointerup={endDrag}
    onpointercancel={endDrag}
    onlostpointercapture={endDrag}
  >
    <canvas class="lbar-strip" bind:this={canvas} aria-hidden="true"></canvas>
    <button
      type="button"
      class="lbar-thumb"
      style="left: {renderL * 100}%"
      role="slider"
      aria-label={`Lightness${selected ? ` — ${selected}` : ''}`}
      aria-valuemin="0"
      aria-valuemax="100"
      aria-valuenow={Math.round(renderL * 100)}
      title="Drag to set lightness"
      onkeydown={thumbKey}
    ></button>
  </div>
</div>

<style>
  .lightness {
    display: flex;
    flex-direction: column;
    gap: var(--ui-space-6);
  }

  .lightness-head {
    display: flex;
    align-items: baseline;
    justify-content: space-between;
  }

  .lightness-label {
    font-size: var(--ui-font-size-xs);
    font-weight: var(--ui-font-weight-semibold);
    color: var(--ui-text-tertiary);
    text-transform: uppercase;
    letter-spacing: 0.04em;
  }

  .lightness-value {
    font-size: var(--ui-font-size-sm);
    font-family: var(--ui-font-mono);
    color: var(--ui-text-secondary);
  }

  .lbar {
    position: relative;
    width: 100%;
    height: 1.75rem;
    border-radius: var(--ui-radius-md);
    border: 1px solid var(--ui-border-low);
    touch-action: none;
    cursor: pointer;
  }

  /* The only element carrying real colour — the swept-L gradient. Rounded to
     the frame instead of clipping the parent, so the taller thumb can overhang
     the bar at the L extremes without being cut off. */
  .lbar-strip {
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;
    display: block;
    border-radius: var(--ui-radius-md);
  }

  /* Greyscale thumb chrome — a stem slightly taller than the bar. */
  .lbar-thumb {
    position: absolute;
    top: 50%;
    transform: translate(-50%, -50%);
    width: 0.6rem;
    height: calc(100% + 0.5rem);
    padding: 0;
    border-radius: var(--ui-radius-sm);
    background: var(--ui-surface-low);
    border: 2px solid var(--ui-text-primary);
    box-shadow: 0 0 0 1px rgba(0, 0, 0, 0.4), 0 1px 3px rgba(0, 0, 0, 0.5);
    cursor: grab;
    touch-action: none;
  }

  .lbar-thumb:active {
    cursor: grabbing;
  }

  .lbar-thumb:focus-visible {
    outline: 2px solid var(--ui-border-higher);
    outline-offset: 2px;
  }
</style>
