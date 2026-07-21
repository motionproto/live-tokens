<script lang="ts">
  import { onDestroy } from 'svelte';
  import { hexToOklch, oklchToHex, gamutClamp } from '../../core/palettes/oklch';
  import { PALETTE_SPECS, type PaletteSpec } from '../../core/palettes/paletteDerivation';
  import { editorState, beginScope, commitScope, cancelScope, type Scope } from '../../core/store/editorStore';
  import { setBaseHueChroma, setBaseChroma, setBaseColors } from './paletteBaseColor';

  interface Props {
    selected: string | null;
    onSelect: (label: string) => void;
    /** Lightness (0..1) the disc is painted at — the selected color's L. */
    discLightness: number;
    /** Called when a per-axis edit detaches the trio from its harmony geometry,
     *  so the parent can flip the active mode to 'custom'. */
    onCustomize: () => void;
    /** Rotation semantics: off (default) preserves relative saturation (constant
     *  render radius); on preserves absolute chroma (the dot drifts in/out). */
    absoluteChroma: boolean;
  }

  let { selected, onSelect, discLightness, onCustomize, absoluteChroma }: Props = $props();

  // The harmony trio, anchored on Brand. Neutral/Alternate/Special stay off the
  // wheel this pass (swatch row only).
  const TRIO_LABELS = ['Brand', 'Background', 'Accent'];
  const TRIO_SPECS: PaletteSpec[] = TRIO_LABELS
    .map((l) => PALETTE_SPECS.find((s) => s.label === l))
    .filter((s): s is PaletteSpec => !!s);

  // Radial saturation to the in-gamut boundary per hue (invariant 6: gamut is
  // display-only). Reserved judgment call: keyboard nudge increments.
  const GAMUT_PROBE = 0.5;
  const HUE_STEP = 2;
  const CHROMA_STEP = 0.005;
  const MARGIN = 30;      // ring-to-edge gap that houses the external handles
  const EXT_OFFSET = 20;  // external handle radius beyond the disc rim (room for the dotted tether)
  const GLOBAL_HOME = 135; // idle angle of the global rotate handle (top-left)
  const MIN_SIZE = 240;
  const MAX_SIZE = 360;

  const normDeg = (d: number) => ((d % 360) + 360) % 360;
  const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));
  const maxChroma = (l: number, hue: number) => gamutClamp(l, GAMUT_PROBE, hue).c;
  const rad = (deg: number) => (deg * Math.PI) / 180;
  // Shortest signed angular delta in (-180, 180], so a spin accumulates cleanly.
  const angleDelta = (cur: number, prev: number) => ((cur - prev + 540) % 360) - 180;

  let wrapperSize = $state(300);
  let wrapper: HTMLDivElement | undefined = $state();
  let canvas: HTMLCanvasElement | undefined = $state();

  let center = $derived(wrapperSize / 2);
  let discRadius = $derived(wrapperSize / 2 - MARGIN);
  let extRadius = $derived(discRadius + EXT_OFFSET);
  let discDiameter = $derived(Math.max(1, wrapperSize - 2 * MARGIN));

  // ── Transient drag state ──────────────────────────────────────────────────
  // The ACTIVE family renders from PRISTINE gesture-start intent captured once
  // here, never re-derived from the just-written 8-bit hex (that round-trip is
  // lossy and makes the non-dragged coordinate wobble). Writes also use the
  // pristine hue0/L0, so nothing accumulates across frames.
  type RotateStart = { hue0: number; chroma0: number; rFrac0: number; l0: number };
  type Drag =
    | { kind: 'axis'; label: string; angle: number; start: RotateStart }
    | { kind: 'global'; start: Record<string, RotateStart>; delta: number; lastAngle: number; angle: number }
    | { kind: 'chroma'; label: string; hue0: number; l0: number; maxC0: number; rFrac: number };
  let drag: Drag | null = $state(null);
  let dragScope: Scope | null = null;

  let trio = $derived(
    TRIO_SPECS.map((spec) => {
      const hex = $editorState.palettes[spec.label]?.baseColor ?? spec.initialColor;
      const { l, c, h } = hexToOklch(hex);
      const mc = maxChroma(l, h) || 1e-6;
      return { label: spec.label, hex, hue: h, chroma: c, lightness: l, rFrac: clamp(c / mc, 0, 1) };
    }),
  );

  // Overlay the transient intent onto the store-derived trio so the active rail
  // / dot / handle tracks the pointer with no store round-trip. The dragged
  // coordinate follows the pointer; the OTHER is locked to gesture-start intent
  // (rotation → radius; chroma → angle) — neither is re-read from the hex.
  let trioRender = $derived(
    trio.map((t) => {
      let hue = t.hue;
      let rFrac = t.rFrac;
      const d = drag;
      if (d?.kind === 'axis' && d.label === t.label) {
        hue = d.angle;
        rFrac = rotateRadius(d.start, hue);
      } else if (d?.kind === 'chroma' && d.label === t.label) {
        hue = d.hue0;
        rFrac = d.rFrac;
      } else if (d?.kind === 'global' && d.start[t.label]) {
        hue = normDeg(d.start[t.label].hue0 + d.delta);
        rFrac = rotateRadius(d.start[t.label], hue);
      }
      const dotR = rFrac * discRadius;
      return {
        ...t,
        hue,
        selected: selected === t.label,
        dot: { x: center + dotR * Math.cos(rad(hue)), y: center - dotR * Math.sin(rad(hue)) },
        ext: { x: center + extRadius * Math.cos(rad(hue)), y: center - extRadius * Math.sin(rad(hue)) },
        // Orient the glyph tangent to the ring (perpendicular to the radius).
        // Screen y-down: the radius sits at CSS-angle -hue, so the tangent is 90 - hue.
        iconRot: 90 - hue,
      };
    }),
  );

  let globalHandle = $derived.by(() => {
    const d = drag;
    const angle = d?.kind === 'global' ? d.angle : GLOBAL_HOME;
    return { x: center + extRadius * Math.cos(rad(angle)), y: center - extRadius * Math.sin(rad(angle)) };
  });

  let discMaxByHue = $derived.by(() => {
    const arr = new Float64Array(360);
    for (let h = 0; h < 360; h++) arr[h] = maxChroma(discLightness, h);
    return arr;
  });

  $effect(() => {
    const el = wrapper;
    if (!el || typeof ResizeObserver === 'undefined') return;
    const ro = new ResizeObserver((entries) => {
      const w = entries[0]?.contentRect.width ?? 0;
      if (w > 0) wrapperSize = clamp(Math.round(w), MIN_SIZE, MAX_SIZE);
    });
    ro.observe(el);
    return () => ro.disconnect();
  });

  // Repaint only on size or disc-L change — never on hue/chroma drags.
  $effect(() => {
    const cv = canvas;
    if (!cv) return;
    const maxByHue = discMaxByHue;
    const L = discLightness;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const px = Math.max(1, Math.round(discDiameter * dpr));
    cv.width = px;
    cv.height = px;
    const ctx = cv.getContext('2d');
    if (ctx) renderDisc(ctx, px, L, maxByHue);
  });

  function renderDisc(ctx: CanvasRenderingContext2D, px: number, L: number, maxByHue: Float64Array) {
    const img = ctx.createImageData(px, px);
    const data = img.data;
    const c = px / 2;
    const R = px / 2;
    for (let y = 0; y < px; y++) {
      for (let x = 0; x < px; x++) {
        const dx = x - c;
        const dy = y - c;
        const dist = Math.sqrt(dx * dx + dy * dy);
        const i = (y * px + x) * 4;
        if (dist > R) {
          data[i + 3] = 0;
          continue;
        }
        const hue = normDeg((Math.atan2(-dy, dx) * 180) / Math.PI);
        const chroma = (dist / R) * maxByHue[Math.round(hue) % 360];
        const hex = oklchToHex(L, chroma, hue);
        data[i] = parseInt(hex.slice(1, 3), 16);
        data[i + 1] = parseInt(hex.slice(3, 5), 16);
        data[i + 2] = parseInt(hex.slice(5, 7), 16);
        data[i + 3] = 255;
      }
    }
    ctx.putImageData(img, 0, 0);
  }

  function pointerAngle(e: PointerEvent): number {
    const r = wrapper!.getBoundingClientRect();
    const dx = e.clientX - (r.left + r.width / 2);
    const dy = e.clientY - (r.top + r.height / 2);
    return normDeg((Math.atan2(-dy, dx) * 180) / Math.PI);
  }

  // ── Gesture lifecycle: one clipping scope = one undo; Escape cancels ──
  function openGesture(label: string) {
    dragScope = beginScope({ label, collapseToOne: true, clipUndoFloor: true });
    window.addEventListener('keydown', onGestureKey, true);
  }

  function endDrag() {
    if (!dragScope) return;
    commitScope(dragScope);
    dragScope = null;
    drag = null;
    window.removeEventListener('keydown', onGestureKey, true);
  }

  function onGestureKey(e: KeyboardEvent) {
    if (e.key !== 'Escape' || !dragScope) return;
    e.preventDefault();
    cancelScope(dragScope);
    dragScope = null;
    drag = null;
    window.removeEventListener('keydown', onGestureKey, true);
  }

  function capture(e: PointerEvent) {
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  }

  const rFracOf = (t: { chroma: number; lightness: number; hue: number }) =>
    clamp(t.chroma / (maxChroma(t.lightness, t.hue) || 1e-6), 0, 1);

  const startOf = (t: { hue: number; chroma: number; lightness: number }): RotateStart =>
    ({ hue0: t.hue, chroma0: t.chroma, rFrac0: rFracOf(t), l0: t.lightness });

  // Render radius for a rotating family, from pristine intent (not the hex).
  // Off: relative saturation held constant (rFrac0). On: absolute chroma0
  // re-fractionalized against the transient hue's gamut (the intended drift,
  // computed cleanly), clamped to the rim for display.
  function rotateRadius(s: RotateStart, renderHue: number): number {
    if (!absoluteChroma) return s.rFrac0;
    return clamp(s.chroma0 / (maxChroma(s.l0, renderHue) || 1e-6), 0, 1);
  }

  // The one rotation write, from pristine gesture-start intent. Off holds the
  // gamut fraction (chroma = rFrac0·maxChroma(L0, newHue)); on holds absolute
  // chroma0 (gamut-clamped for display only). L preserved; single store path.
  function writeRotation(label: string, newHue: number, s: RotateStart) {
    if (absoluteChroma) setBaseHueChroma(label, newHue, s.chroma0);
    else setBaseHueChroma(label, newHue, s.rFrac0 * maxChroma(s.l0, newHue));
  }

  // Per-axis rotate — detaches harmony to custom.
  function startAxisDrag(e: PointerEvent, label: string) {
    if (e.button !== 0) return;
    e.preventDefault();
    onSelect(label);
    onCustomize();
    capture(e);
    openGesture(`colors: ${label} rotate`);
    const t = trio.find((x) => x.label === label);
    const start = t ? startOf(t) : { hue0: pointerAngle(e), chroma0: 0, rFrac0: 0, l0: discLightness };
    drag = { kind: 'axis', label, angle: pointerAngle(e), start };
    applyAxis(e);
  }
  function applyAxis(e: PointerEvent) {
    if (drag?.kind !== 'axis') return;
    const angle = pointerAngle(e);
    drag.angle = angle;
    writeRotation(drag.label, angle, drag.start);
  }

  // Global rotate — all trio hues by the same accumulated delta (mode kept).
  function startGlobalDrag(e: PointerEvent) {
    if (e.button !== 0) return;
    e.preventDefault();
    capture(e);
    openGesture('colors: rotate all');
    const start: Record<string, RotateStart> = {};
    for (const t of trio) start[t.label] = startOf(t);
    const a = pointerAngle(e);
    drag = { kind: 'global', start, delta: 0, lastAngle: a, angle: a };
  }
  function applyGlobal(e: PointerEvent) {
    if (drag?.kind !== 'global') return;
    const a = pointerAngle(e);
    drag.delta += angleDelta(a, drag.lastAngle);
    drag.lastAngle = a;
    drag.angle = a;
    for (const [label, s] of Object.entries(drag.start)) {
      writeRotation(label, s.hue0 + drag.delta, s);
    }
  }

  // Rail-constrained chroma — 1D radial along the rail, hue PINNED to hue0 for
  // the whole gesture (render + write) so the axis can't wobble off the hex.
  function startChromaDrag(e: PointerEvent, label: string) {
    if (e.button !== 0) return;
    e.preventDefault();
    onSelect(label);
    capture(e);
    openGesture(`colors: ${label} chroma`);
    const t = trio.find((x) => x.label === label);
    const hue0 = t?.hue ?? 0;
    const l0 = t?.lightness ?? discLightness;
    drag = { kind: 'chroma', label, hue0, l0, maxC0: maxChroma(l0, hue0) || 1e-6, rFrac: t?.rFrac ?? 0 };
    applyChroma(e);
  }
  function applyChroma(e: PointerEvent) {
    if (drag?.kind !== 'chroma') return;
    const r = wrapper!.getBoundingClientRect();
    const dx = e.clientX - (r.left + r.width / 2);
    const dy = e.clientY - (r.top + r.height / 2);
    const proj = dx * Math.cos(rad(drag.hue0)) - dy * Math.sin(rad(drag.hue0)); // onto the pinned rail
    const rFrac = clamp(proj / (r.width / 2 - MARGIN), 0, 1);
    drag.rFrac = rFrac;
    setBaseHueChroma(drag.label, drag.hue0, rFrac * drag.maxC0);
  }

  function moveDrag(e: PointerEvent) {
    if (!drag) return;
    if (drag.kind === 'axis') applyAxis(e);
    else if (drag.kind === 'global') applyGlobal(e);
    else applyChroma(e);
  }

  function rotateAll(delta: number) {
    const patch: Record<string, string> = {};
    for (const t of trio) {
      const newHue = normDeg(t.hue + delta);
      if (absoluteChroma) {
        const { l, c } = hexToOklch(t.hex);
        patch[t.label] = oklchToHex(l, c, newHue);
      } else {
        const g = gamutClamp(t.lightness, rFracOf(t) * maxChroma(t.lightness, newHue), newHue);
        patch[t.label] = oklchToHex(g.l, g.c, g.h);
      }
    }
    setBaseColors(patch, 'colors: rotate all');
  }

  function axisKey(e: KeyboardEvent, label: string) {
    const t = trio.find((x) => x.label === label);
    if (!t) return;
    let dir = 0;
    if (e.key === 'ArrowLeft') dir = -1;
    else if (e.key === 'ArrowRight') dir = 1;
    else return;
    e.preventDefault();
    onCustomize();
    writeRotation(label, t.hue + dir * HUE_STEP, startOf(t));
  }
  function dotKey(e: KeyboardEvent, label: string) {
    const t = trio.find((x) => x.label === label);
    if (!t) return;
    if (e.key === 'ArrowUp') { e.preventDefault(); setBaseChroma(label, t.chroma + CHROMA_STEP); }
    else if (e.key === 'ArrowDown') { e.preventDefault(); setBaseChroma(label, t.chroma - CHROMA_STEP); }
  }
  function globalKey(e: KeyboardEvent) {
    if (e.key === 'ArrowLeft') { e.preventDefault(); rotateAll(-HUE_STEP); }
    else if (e.key === 'ArrowRight') { e.preventDefault(); rotateAll(HUE_STEP); }
  }

  onDestroy(() => {
    if (dragScope) {
      cancelScope(dragScope);
      dragScope = null;
    }
    if (typeof window !== 'undefined') window.removeEventListener('keydown', onGestureKey, true);
  });
</script>

<div class="wheel" bind:this={wrapper} style="max-width: {MAX_SIZE}px">
  <canvas class="disc" bind:this={canvas} aria-hidden="true" style="width: {discDiameter}px; height: {discDiameter}px"></canvas>

  <svg class="rails" viewBox="0 0 {wrapperSize} {wrapperSize}" width={wrapperSize} height={wrapperSize} aria-hidden="true">
    <!-- Dotted tether center→icon, drawn first so the solid rail below covers
         its inner half — reads as one axis that extends outward as dots to the
         external handle. Same angle as the handle, so it tracks live. -->
    {#each trioRender as t (t.label)}
      <line class="tether" x1={center} y1={center} x2={t.ext.x} y2={t.ext.y} />
    {/each}
    {#each trioRender as t (t.label)}
      <line class="rail" x1={center} y1={center} x2={t.dot.x} y2={t.dot.y} />
    {/each}
  </svg>

  {#each trioRender as t (t.label)}
    <button
      type="button"
      class="dot"
      class:selected={t.selected}
      style="left: {t.dot.x}px; top: {t.dot.y}px; --fill: {t.hex}"
      aria-label={`${t.label} — drag along rail to adjust chroma`}
      title={`${t.label} (drag for chroma)`}
      onpointerdown={(e) => startChromaDrag(e, t.label)}
      onpointermove={moveDrag}
      onpointerup={endDrag}
      onpointercancel={endDrag}
      onlostpointercapture={endDrag}
      onkeydown={(e) => dotKey(e, t.label)}
      onclick={() => onSelect(t.label)}
    ></button>
  {/each}

  {#each trioRender as t (t.label)}
    <button
      type="button"
      class="ext-handle"
      class:selected={t.selected}
      style="left: {t.ext.x}px; top: {t.ext.y}px; transform: translate(-50%, -50%) rotate({t.iconRot}deg)"
      aria-label={`Rotate ${t.label} hue`}
      title={`Rotate ${t.label} hue`}
      onpointerdown={(e) => startAxisDrag(e, t.label)}
      onpointermove={moveDrag}
      onpointerup={endDrag}
      onpointercancel={endDrag}
      onlostpointercapture={endDrag}
      onkeydown={(e) => axisKey(e, t.label)}
      onclick={() => onSelect(t.label)}
    ><i class="fas fa-arrows-left-right" aria-hidden="true"></i></button>
  {/each}

  <button
    type="button"
    class="global-handle"
    style="left: {globalHandle.x}px; top: {globalHandle.y}px"
    aria-label="Rotate all harmony colors together"
    title="Rotate all together"
    onpointerdown={startGlobalDrag}
    onpointermove={moveDrag}
    onpointerup={endDrag}
    onpointercancel={endDrag}
    onlostpointercapture={endDrag}
    onkeydown={globalKey}
  ><i class="fas fa-arrows-rotate" aria-hidden="true"></i></button>
</div>

<style>
  .wheel {
    position: relative;
    width: 100%;
    aspect-ratio: 1;
    margin: 0 auto;
    touch-action: none;
  }

  .disc {
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    border-radius: var(--ui-radius-full);
    border: 1px solid var(--ui-border-low);
  }

  .rails {
    position: absolute;
    inset: 0;
    pointer-events: none;
  }

  .rail {
    stroke: var(--ui-text-primary);
    stroke-width: 1.5;
    opacity: 0.65;
  }

  /* Dotted continuation of the axis out to the external handle. Greyscale. */
  .tether {
    stroke: var(--ui-text-tertiary);
    stroke-width: 1;
    stroke-dasharray: 1.5 2.5;
    stroke-linecap: round;
    opacity: 0.8;
  }

  /* Inner color dots — the only elements that carry actual palette colour. */
  .dot {
    position: absolute;
    transform: translate(-50%, -50%);
    width: 1rem;
    height: 1rem;
    padding: 0;
    border-radius: var(--ui-radius-full);
    background: var(--fill);
    border: 2px solid var(--ui-text-primary);
    box-shadow: 0 0 0 1px rgba(0, 0, 0, 0.4), 0 1px 3px rgba(0, 0, 0, 0.5);
    cursor: grab;
    touch-action: none;
  }

  .dot.selected {
    width: 1.35rem;
    height: 1.35rem;
    border-width: 3px;
    z-index: 2;
  }

  .dot:active {
    cursor: grabbing;
  }

  /* External rotate handles — greyscale chrome. */
  .ext-handle,
  .global-handle {
    position: absolute;
    transform: translate(-50%, -50%);
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 0;
    border-radius: var(--ui-radius-full);
    background: var(--ui-surface-low);
    color: var(--ui-text-secondary);
    border: 1px solid var(--ui-border-high);
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.45);
    cursor: grab;
    touch-action: none;
    z-index: 3;
  }

  .ext-handle {
    width: 1.25rem;
    height: 1.25rem;
    font-size: var(--ui-font-size-xs);
  }

  .global-handle {
    width: 1.6rem;
    height: 1.6rem;
    font-size: var(--ui-font-size-sm);
    color: var(--ui-text-primary);
    border-color: var(--ui-border-higher);
  }

  .ext-handle:hover,
  .global-handle:hover {
    color: var(--ui-text-primary);
    border-color: var(--ui-border-higher);
    background: var(--ui-surface-high);
  }

  .ext-handle:active,
  .global-handle:active {
    cursor: grabbing;
  }

  .ext-handle.selected {
    color: var(--ui-text-primary);
    border-color: var(--ui-text-primary);
  }

  .dot:focus-visible,
  .ext-handle:focus-visible,
  .global-handle:focus-visible {
    outline: 2px solid var(--ui-border-higher);
    outline-offset: 2px;
  }
</style>
