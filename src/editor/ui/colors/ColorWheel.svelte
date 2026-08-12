<script lang="ts">
  import { onDestroy } from 'svelte';
  import { oklchToHex, oklchToHexClamped } from '../../core/palettes/oklch';
  import { PALETTE_SPECS } from '../../core/palettes/paletteDerivation';
  import { editorState, beginScope, commitScope, cancelScope, type Scope } from '../../core/store/editorStore';
  import { setBaseHueChroma, setBaseChroma, setAxisHue, setAxisHues } from './paletteBaseColor';
  import { maxChroma } from './colorWheelMath';
  import { applyHarmonyToAxes, axisLabel, axisStatuses, type HarmonyMode } from '../../core/palettes/colorHarmony';
  import AxisNumeral from './AxisNumeral.svelte';
  import { modeLabel } from './harmonyModeIcons';

  interface Props {
    selected: string | null;
    onSelect: (label: string) => void;
    /** Lightness (0..1) the disc is painted at — the selected color's L. */
    discLightness: number;
    /** Called when a per-axis edit detaches the axes from their harmony geometry,
     *  so the parent can flip the active mode to 'custom'. */
    onCustomize: () => void;
    /** Rotation semantics: off (default) preserves relative saturation (constant
     *  render radius); on preserves absolute chroma (the dot drifts in/out). */
    absoluteChroma: boolean;
    /** The applied harmony mode: gates which axes exist on the wheel (only
     *  slots the geometry deals a distinct hue to). A family bound to an
     *  inactive axis renders as the free dot instead. */
    activeMode: HarmonyMode;
    /** Hovered harmony mode: paints non-interactive ghost markers at the hues the
     *  axes would move to, so the geometry previews before it's applied. */
    previewMode?: HarmonyMode | null;
  }

  let { selected, onSelect, discLightness, onCustomize, absoluteChroma, activeMode, previewMode = null }: Props = $props();

  // One handle per axis. A bound axis reads its color from the family's
  // baseColor (hue equals axes[i].hue by invariant 1); an unbound axis carries
  // only its stored hue, previewing where an assigned color would land.
  let axisData = $derived(
    $editorState.harmonyAxes.map((axis, i) => {
      const common = { index: i, label: axisLabel(i), family: axis.family, bound: axis.family !== null };
      if (axis.family !== null) {
        const spec = PALETTE_SPECS.find((s) => s.label === axis.family);
        const { l, c, h } = $editorState.palettes[axis.family]?.baseColor ?? spec!.initialColor;
        const mc = maxChroma(l, h) || 1e-6;
        // `hex` is the clamped sRGB projection painting the dot fill only.
        return { ...common, hex: oklchToHexClamped(l, c, h), hue: h, chroma: c, lightness: l, rFrac: clamp(c / mc, 0, 1) };
      }
      return { ...common, hex: '', hue: axis.hue, chroma: 0, lightness: discLightness, rFrac: 0 };
    }),
  );

  // Axis chrome (rail, tether, handle, numeral) exists only while the axis is
  // active in the applied geometry (its slot is a distinct position). A bound
  // inactive axis keeps its family's color but is edited in dot mode, not axis
  // mode: the family renders as the free dot and sits out the global spin.
  let statuses = $derived(axisStatuses(activeMode, $editorState.harmonyAxes));
  const isVisible = (t: { index: number }) => statuses[t.index] === 'on-wheel';

  // Reserved judgment call: keyboard nudge increments.
  const HUE_STEP = 2;
  const CHROMA_STEP = 0.005;
  const MARGIN = 52;      // ring-to-edge gap: houses the external handles AND the axis numerals outside them
  const EXT_OFFSET = 20;  // external handle radius beyond the disc rim (room for the dotted tether)
  const NUM_OFFSET = 24;  // numeral radius beyond the external handles
  const FREE_NUM_OFFSET = 15; // free-dot numeral, diagonal clearance past the enlarged dot
  const NUM_PERP = 20;    // sideways clearance for a numeral moved beside its own marker
  const NUM_STACK = 20;   // radial gap between the numerals of co-hued unbound axes
  const MIN_SIZE = 240;
  const MAX_SIZE = 560;

  const normDeg = (d: number) => ((d % 360) + 360) % 360;
  const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));
  const rad = (deg: number) => (deg * Math.PI) / 180;
  // Shortest signed angular delta in (-180, 180], so a spin accumulates cleanly.
  const angleDelta = (cur: number, prev: number) => ((cur - prev + 540) % 360) - 180;

  let wrapperSize = $state(300);
  let wrapper: HTMLDivElement | undefined = $state();
  let canvas: HTMLCanvasElement | undefined = $state();
  // Parked angle of the global rotate handle — starts top-left, then stays
  // wherever it was last dragged (session-local). Cosmetic grab-point only:
  // it never feeds the color math.
  let globalAngle = $state(135);

  let center = $derived(wrapperSize / 2);
  let discRadius = $derived(wrapperSize / 2 - MARGIN);
  let extRadius = $derived(discRadius + EXT_OFFSET);
  let discDiameter = $derived(Math.max(1, wrapperSize - 2 * MARGIN));

  // ── Transient drag state ──────────────────────────────────────────────────
  // The ACTIVE family renders from PRISTINE gesture-start intent captured once
  // here, never re-derived from the just-written 8-bit hex (that round-trip is
  // lossy and makes the non-dragged coordinate wobble). Writes also use the
  // pristine hue0/L0, so nothing accumulates across frames.
  type AxisView = {
    index: number; label: string; family: string | null; bound: boolean;
    hex: string; hue: number; chroma: number; lightness: number; rFrac: number;
  };

  // `bound` gates the chroma policy: only a bound axis carries a color to re-hue.
  type RotateStart = { hue0: number; chroma0: number; rFrac0: number; l0: number; bound: boolean };
  type Drag =
    | { kind: 'axis'; index: number; angle: number; start: RotateStart }
    | { kind: 'global'; start: RotateStart[]; delta: number; lastAngle: number; angle: number }
    | { kind: 'chroma'; index: number; family: string; hue0: number; l0: number; maxC0: number; rFrac: number }
    | { kind: 'free'; family: string; l0: number; hue: number; rFrac: number };
  let drag: Drag | null = $state(null);
  let dragScope: Scope | null = null;

  // Overlay the transient intent onto the store-derived axes so the active rail
  // / dot / handle tracks the pointer with no store round-trip. The dragged
  // coordinate follows the pointer; the OTHER is locked to gesture-start intent
  // (rotation → radius; chroma → angle) — neither is re-read from the hex.
  let axisRender = $derived(
    axisData.map((t) => {
      let hue = t.hue;
      let rFrac = t.rFrac;
      const d = drag;
      if (d?.kind === 'axis' && d.index === t.index) {
        hue = d.angle;
        rFrac = t.bound ? rotateRadius(d.start, hue) : 0;
      } else if (d?.kind === 'chroma' && d.index === t.index) {
        hue = d.hue0;
        rFrac = d.rFrac;
      } else if (d?.kind === 'global' && d.start[t.index]) {
        hue = normDeg(d.start[t.index].hue0 + d.delta);
        rFrac = t.bound ? rotateRadius(d.start[t.index], hue) : 0;
      }
      const dotR = rFrac * discRadius;
      const numR = extRadius + NUM_OFFSET;
      return {
        ...t,
        hue,
        dotR,
        selected: t.bound && selected === t.family,
        dot: { x: center + dotR * Math.cos(rad(hue)), y: center - dotR * Math.sin(rad(hue)) },
        ext: { x: center + extRadius * Math.cos(rad(hue)), y: center - extRadius * Math.sin(rad(hue)) },
        // Numeral just beyond the handle; the span itself is never rotated, so
        // the digit stays upright at any angle.
        num: { x: center + numR * Math.cos(rad(hue)), y: center - numR * Math.sin(rad(hue)) },
        // Orient the glyph tangent to the ring (perpendicular to the radius).
        // Screen y-down: the radius sits at CSS-angle -hue, so the tangent is 90 - hue.
        iconRot: 90 - hue,
      };
    }),
  );

  // Monochromatic stacks every axis on one hue (custom does too, once the hues
  // are dragged together), so the outer numeral slot is the same point for all
  // of them. Each numeral then moves beside the marker it names — its own dot,
  // or the external handle when the axis carries no color — which is the only
  // thing that still tells the axes apart on a shared rail.
  let visibleRender = $derived.by(() => {
    const vis = axisRender.filter(isVisible);
    const hueKey = (hue: number) => Math.round(normDeg(hue)) % 360;
    const byHue = new Map<number, typeof vis>();
    for (const t of vis) {
      const group = byHue.get(hueKey(t.hue));
      if (group) group.push(t);
      else byHue.set(hueKey(t.hue), [t]);
    }
    return vis.map((t) => {
      const group = byHue.get(hueKey(t.hue))!;
      if (group.length < 2) return t;
      // Bound axes separate by chroma radius on their own; unbound ones share the
      // handle track, so they step outward past it instead.
      const unboundBefore = group.slice(0, group.indexOf(t)).filter((g) => !g.bound).length;
      const r = t.bound ? t.dotR : extRadius + unboundBefore * NUM_STACK;
      const a = rad(t.hue);
      return {
        ...t,
        num: {
          x: center + r * Math.cos(a) - NUM_PERP * Math.sin(a),
          y: center - r * Math.sin(a) - NUM_PERP * Math.cos(a),
        },
      };
    });
  });

  // Free dot for a selected family on no ACTIVE axis (Neutral, Alternate, …,
  // plus families whose axis the applied geometry deals no distinct slot): a 2D
  // handle at the family's own (hue, chroma), draggable anywhere on the disc.
  // Writes go through setBaseHueChroma only — active axes never move; a bound
  // inactive axis follows its family via syncBoundAxisHue.
  let freeDot = $derived.by(() => {
    if (!selected) return null;
    const axisIndex = $editorState.harmonyAxes.findIndex((a) => a.family === selected);
    if (axisIndex !== -1 && statuses[axisIndex] === 'on-wheel') return null;
    const spec = PALETTE_SPECS.find((s) => s.label === selected);
    if (!spec) return null;
    const { l, c, h } = $editorState.palettes[selected]?.baseColor ?? spec.initialColor;
    let hue = h;
    let rFrac = clamp(c / (maxChroma(l, h) || 1e-6), 0, 1);
    const d = drag;
    if (d?.kind === 'free') {
      hue = d.hue;
      rFrac = d.rFrac;
    }
    const r = rFrac * discRadius;
    return {
      family: selected, axisIndex: axisIndex === -1 ? null : axisIndex,
      hex: oklchToHexClamped(l, c, h), hue, chroma: c, lightness: l,
      x: center + r * Math.cos(rad(hue)), y: center - r * Math.sin(rad(hue)),
    };
  });

  // The dot serves two states: bound to an axis the mode left off the wheel, and
  // unassigned. Only the first has an axis to name.
  let freeDotLabel = $derived.by(() => {
    if (!freeDot) return '';
    const where = freeDot.axisIndex === null
      ? 'unassigned'
      : `${axisLabel(freeDot.axisIndex)}. Off the wheel in ${modeLabel(activeMode)}`;
    return `${freeDot.family}, ${where}. Drag to adjust hue and chroma.`;
  });

  let globalHandle = $derived.by(() => {
    const d = drag;
    const angle = d?.kind === 'global' ? d.angle : globalAngle;
    return { x: center + extRadius * Math.cos(rad(angle)), y: center - extRadius * Math.sin(rad(angle)) };
  });

  // Ghost previews for a hovered harmony mode: every visible axis re-hued to the
  // would-be geometry (`applyHarmonyToAxes`, so a frozen inactive axis previews
  // as stationary). A bound axis previews at its family's chroma radius; an unbound
  // axis shows a marker on the external track. Axes that wouldn't move are
  // dropped so a ghost never sits atop its live handle. Inert.
  let ghosts = $derived.by(() => {
    if (!previewMode || previewMode === 'custom' || drag) return [];
    const target = applyHarmonyToAxes(previewMode, $editorState.harmonyAxes);
    return axisData.filter(isVisible).flatMap((t) => {
      const hue = target[t.index].hue;
      if (Math.abs(angleDelta(hue, t.hue)) < 0.5) return [];
      if (t.bound) {
        const rFrac = clamp(t.chroma / (maxChroma(t.lightness, hue) || 1e-6), 0, 1);
        const r = rFrac * discRadius;
        return [{ index: t.index, bound: true, hex: t.hex, x: center + r * Math.cos(rad(hue)), y: center - r * Math.sin(rad(hue)) }];
      }
      return [{ index: t.index, bound: false, hex: '', x: center + extRadius * Math.cos(rad(hue)), y: center - extRadius * Math.sin(rad(hue)) }];
    });
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
    // Park the global handle where it was dragged (Escape/cancel doesn't reach
    // here, so a cancelled spin leaves it at its prior spot).
    if (drag?.kind === 'global') globalAngle = drag.angle;
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

  const startOf = (t: AxisView): RotateStart =>
    ({ hue0: t.hue, chroma0: t.chroma, rFrac0: rFracOf(t), l0: t.lightness, bound: t.bound });

  // Render radius for a rotating family, from pristine intent (not the hex).
  // Off: relative saturation held constant (rFrac0). On: absolute chroma0
  // re-fractionalized against the transient hue's gamut (the intended drift,
  // computed cleanly), clamped to the rim for display.
  function rotateRadius(s: RotateStart, renderHue: number): number {
    if (!absoluteChroma) return s.rFrac0;
    return clamp(s.chroma0 / (maxChroma(s.l0, renderHue) || 1e-6), 0, 1);
  }

  // Chroma a rotating bound family carries, from pristine gesture-start intent.
  // Off holds the gamut fraction (rFrac0·maxChroma(L0, newHue)); on holds absolute
  // chroma0 (gamut-clamped for display only). Unbound axes carry no chroma.
  function chromaForPolicy(s: RotateStart, newHue: number): number {
    return absoluteChroma ? s.chroma0 : s.rFrac0 * maxChroma(s.l0, newHue);
  }

  // Per-axis rotate — detaches harmony to custom. Bound axes select + re-hue their
  // family (via setAxisHue's coherent write); unbound axes move only their hue.
  function startAxisDrag(e: PointerEvent, axis: AxisView) {
    if (e.button !== 0) return;
    e.preventDefault();
    if (axis.family !== null) onSelect(axis.family);
    onCustomize();
    capture(e);
    openGesture(`colors: ${axis.label} rotate`);
    drag = { kind: 'axis', index: axis.index, angle: pointerAngle(e), start: startOf(axis) };
    applyAxis(e);
  }
  function applyAxis(e: PointerEvent) {
    if (drag?.kind !== 'axis') return;
    const angle = pointerAngle(e);
    drag.angle = angle;
    const { start } = drag;
    setAxisHue(drag.index, angle, start.bound ? chromaForPolicy(start, angle) : undefined);
  }

  // Global rotate — every axis hue by the same accumulated delta (mode kept).
  function startGlobalDrag(e: PointerEvent) {
    if (e.button !== 0) return;
    e.preventDefault();
    capture(e);
    openGesture('colors: rotate all');
    // Sparse by axis index: a hidden axis takes no part in the spin.
    const start: RotateStart[] = [];
    for (const t of visibleRender) start[t.index] = startOf(t);
    const a = pointerAngle(e);
    drag = { kind: 'global', start, delta: 0, lastAngle: a, angle: a };
  }
  function applyGlobal(e: PointerEvent) {
    if (drag?.kind !== 'global') return;
    const a = pointerAngle(e);
    drag.delta += angleDelta(a, drag.lastAngle);
    drag.lastAngle = a;
    drag.angle = a;
    const { delta } = drag;
    drag.start.forEach((s, index) => {
      const newHue = s.hue0 + delta;
      setAxisHue(index, newHue, s.bound ? chromaForPolicy(s, newHue) : undefined);
    });
  }

  // Rail-constrained chroma (bound axes only) — 1D radial along the rail, hue
  // PINNED to hue0 for the whole gesture (render + write) so it can't wobble off.
  function startChromaDrag(e: PointerEvent, axis: AxisView) {
    if (e.button !== 0 || axis.family === null) return;
    e.preventDefault();
    onSelect(axis.family);
    capture(e);
    openGesture(`colors: ${axis.family} chroma`);
    drag = {
      kind: 'chroma', index: axis.index, family: axis.family, hue0: axis.hue, l0: axis.lightness,
      maxC0: maxChroma(axis.lightness, axis.hue) || 1e-6, rFrac: axis.rFrac,
    };
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
    setBaseHueChroma(drag.family, drag.hue0, rFrac * drag.maxC0);
  }

  // Unconstrained 2D drag for the off-axis selected family: angle → hue,
  // radius → chroma fraction of the gamut at the pristine lightness.
  function startFreeDrag(e: PointerEvent) {
    if (e.button !== 0 || !freeDot) return;
    e.preventDefault();
    capture(e);
    openGesture(`colors: ${freeDot.family} base`);
    drag = {
      kind: 'free', family: freeDot.family, l0: freeDot.lightness,
      hue: freeDot.hue, rFrac: clamp(freeDot.chroma / (maxChroma(freeDot.lightness, freeDot.hue) || 1e-6), 0, 1),
    };
    applyFree(e);
  }
  function applyFree(e: PointerEvent) {
    if (drag?.kind !== 'free') return;
    const r = wrapper!.getBoundingClientRect();
    const dx = e.clientX - (r.left + r.width / 2);
    const dy = e.clientY - (r.top + r.height / 2);
    const hue = normDeg((Math.atan2(-dy, dx) * 180) / Math.PI);
    const rFrac = clamp(Math.sqrt(dx * dx + dy * dy) / (r.width / 2 - MARGIN), 0, 1);
    drag.hue = hue;
    drag.rFrac = rFrac;
    setBaseHueChroma(drag.family, hue, rFrac * maxChroma(drag.l0, hue));
  }

  function moveDrag(e: PointerEvent) {
    if (!drag) return;
    if (drag.kind === 'axis') applyAxis(e);
    else if (drag.kind === 'global') applyGlobal(e);
    else if (drag.kind === 'free') applyFree(e);
    else applyChroma(e);
  }

  function rotateAll(delta: number) {
    const entries = axisData.filter(isVisible).map((t) => ({
      index: t.index,
      hue: t.hue + delta,
      // Unclamped intent: off holds the gamut fraction, on holds absolute chroma.
      familyChroma: t.bound
        ? (absoluteChroma ? t.chroma : rFracOf(t) * maxChroma(t.lightness, normDeg(t.hue + delta)))
        : undefined,
    }));
    setAxisHues(entries, 'colors: rotate all');
  }

  function axisKey(e: KeyboardEvent, axis: AxisView) {
    let dir = 0;
    if (e.key === 'ArrowLeft') dir = -1;
    else if (e.key === 'ArrowRight') dir = 1;
    else return;
    e.preventDefault();
    onCustomize();
    const newHue = axis.hue + dir * HUE_STEP;
    setAxisHue(axis.index, newHue, axis.bound ? chromaForPolicy(startOf(axis), newHue) : undefined);
  }
  function dotKey(e: KeyboardEvent, axis: AxisView) {
    if (axis.family === null) return;
    if (e.key === 'ArrowUp') { e.preventDefault(); setBaseChroma(axis.family, axis.chroma + CHROMA_STEP); }
    else if (e.key === 'ArrowDown') { e.preventDefault(); setBaseChroma(axis.family, axis.chroma - CHROMA_STEP); }
  }
  function freeDotKey(e: KeyboardEvent) {
    if (!freeDot) return;
    if (e.key === 'ArrowUp') { e.preventDefault(); setBaseChroma(freeDot.family, freeDot.chroma + CHROMA_STEP); }
    else if (e.key === 'ArrowDown') { e.preventDefault(); setBaseChroma(freeDot.family, freeDot.chroma - CHROMA_STEP); }
    else if (e.key === 'ArrowLeft') { e.preventDefault(); setBaseHueChroma(freeDot.family, freeDot.hue - HUE_STEP, freeDot.chroma); }
    else if (e.key === 'ArrowRight') { e.preventDefault(); setBaseHueChroma(freeDot.family, freeDot.hue + HUE_STEP, freeDot.chroma); }
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
    <!-- Faint track the external axis handles ride along (their centers sit on
         this radius). Decorative chrome, beneath the handles. -->
    <circle class="track" cx={center} cy={center} r={extRadius} />
    <!-- Dotted tether center→icon, drawn first so the solid rail below covers
         its inner half — reads as one axis that extends outward as dots to the
         external handle. Same angle as the handle, so it tracks live. -->
    {#each visibleRender as t (t.index)}
      <line class="tether" class:selected={t.selected} x1={center} y1={center} x2={t.ext.x} y2={t.ext.y} />
    {/each}
    {#each visibleRender as t (t.index)}
      {#if t.bound}
        <line class="rail" class:selected={t.selected} x1={center} y1={center} x2={t.dot.x} y2={t.dot.y} />
      {/if}
    {/each}
  </svg>

  {#each ghosts as g (g.index)}
    <span class="ghost" class:unbound={!g.bound} style="left: {g.x}px; top: {g.y}px; --fill: {g.hex}" aria-hidden="true"></span>
  {/each}

  {#each visibleRender as t (t.index)}
    <span class="axis-num" style="left: {t.num.x}px; top: {t.num.y}px" aria-hidden="true">
      <AxisNumeral index={t.index} status={statuses[t.index]} selected={t.selected} />
    </span>
  {/each}

  {#each visibleRender as t (t.index)}
    {#if t.bound && t.family !== null}
      <button
        type="button"
        class="dot"
        class:selected={t.selected}
        style="left: {t.dot.x}px; top: {t.dot.y}px; --fill: {t.hex}"
        aria-label={`${t.family}, drag along the rail to adjust chroma`}
        title={`${t.family} (drag for chroma)`}
        onpointerdown={(e) => startChromaDrag(e, t)}
        onpointermove={moveDrag}
        onpointerup={endDrag}
        onpointercancel={endDrag}
        onlostpointercapture={endDrag}
        onkeydown={(e) => dotKey(e, t)}
        onclick={() => t.family !== null && onSelect(t.family)}
      ></button>
    {/if}
  {/each}

  {#each visibleRender as t (t.index)}
    <button
      type="button"
      class="ext-handle"
      class:unbound={!t.bound}
      class:selected={t.selected}
      style="left: {t.ext.x}px; top: {t.ext.y}px; transform: translate(-50%, -50%) rotate({t.iconRot}deg)"
      aria-label={t.bound ? `Rotate ${t.label} hue (${t.family})` : `Rotate ${t.label} hue`}
      title={t.bound ? `Rotate ${t.label} hue (${t.family})` : `Rotate ${t.label} hue`}
      onpointerdown={(e) => startAxisDrag(e, t)}
      onpointermove={moveDrag}
      onpointerup={endDrag}
      onpointercancel={endDrag}
      onlostpointercapture={endDrag}
      onkeydown={(e) => axisKey(e, t)}
      onclick={() => t.family !== null && onSelect(t.family)}
    ><i class="fas fa-arrows-left-right" aria-hidden="true"></i></button>
  {/each}

  {#if freeDot}
    {#if freeDot.axisIndex !== null}
      <span
        class="axis-num"
        style="left: {freeDot.x + FREE_NUM_OFFSET}px; top: {freeDot.y - FREE_NUM_OFFSET}px"
        aria-hidden="true"
      >
        <AxisNumeral index={freeDot.axisIndex} status={statuses[freeDot.axisIndex]} selected />
      </span>
    {/if}
    <button
      type="button"
      class="dot selected"
      style="left: {freeDot.x}px; top: {freeDot.y}px; --fill: {freeDot.hex}"
      aria-label={freeDotLabel}
      title={freeDotLabel}
      onpointerdown={startFreeDrag}
      onpointermove={moveDrag}
      onpointerup={endDrag}
      onpointercancel={endDrag}
      onlostpointercapture={endDrag}
      onkeydown={freeDotKey}
    ></button>
  {/if}

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
    stroke-width: 2;
    opacity: 0.5;
  }

  /* Dotted continuation of the axis out to the external handle. Greyscale. */
  .tether {
    stroke: var(--ui-text-secondary);
    stroke-width: 1.5;
    stroke-dasharray: 2 4;
    stroke-linecap: round;
    opacity: 0.7;
  }

  /* Selected family's axis: heavier stroke at full contrast, so the whole axis
     reads as active alongside its enlarged dot and handle. */
  .rail.selected {
    stroke-width: 4;
    opacity: 1;
  }

  .tether.selected {
    stroke: var(--ui-text-primary);
    stroke-width: 2.5;
    opacity: 1;
  }

  /* Faint ring the external axis handles ride along. Decorative. */
  .track {
    fill: none;
    stroke: var(--ui-border);
    stroke-width: 1;
    opacity: 0.6;
  }

  /* Preview dots for a hovered harmony mode. Dashed, translucent, no pointer
     events — a hint at the would-be geometry, not a target. */
  .ghost {
    position: absolute;
    transform: translate(-50%, -50%);
    width: 1rem;
    height: 1rem;
    border-radius: var(--ui-radius-full);
    background: var(--fill);
    border: 2px dashed var(--ui-text-primary);
    opacity: 0.55;
    pointer-events: none;
    z-index: 1;
  }

  /* Unbound-axis ghost: a hollow greyscale marker on the external track (no color
     to preview, only where an assigned color's hue would land). */
  .ghost.unbound {
    width: 0.7rem;
    height: 0.7rem;
    background: transparent;
    border-color: var(--ui-text-secondary);
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

  /* Unbound axis handle: hollow + dashed so it reads as an empty preview slot,
     not a live color handle. Shape carries the distinction — never opacity. */
  .ext-handle.unbound {
    background: transparent;
    border-style: dashed;
    border-color: var(--ui-border-high);
    color: var(--ui-text-secondary);
  }

  .ext-handle.unbound:hover {
    background: var(--ui-surface-low);
    border-color: var(--ui-border-higher);
    color: var(--ui-text-primary);
  }

  /* Axis numeral just outside the handle track. Positioning only — never
     rotated, so the digit stays upright at any angle. */
  .axis-num {
    position: absolute;
    transform: translate(-50%, -50%);
    display: flex;
    pointer-events: none;
    z-index: 3;
  }

  .dot:focus-visible,
  .ext-handle:focus-visible,
  .global-handle:focus-visible {
    outline: 2px solid var(--ui-border-higher);
    outline-offset: 2px;
  }
</style>
