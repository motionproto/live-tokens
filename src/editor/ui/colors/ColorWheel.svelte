<script lang="ts">
  import { onDestroy } from 'svelte';
  import { hexToOklch, oklchToHex, gamutClamp } from '../../core/palettes/oklch';
  import { PALETTE_SPECS, type PaletteSpec } from '../../core/palettes/paletteDerivation';
  import { editorState, beginScope, commitScope, cancelScope, type Scope } from '../../core/store/editorStore';
  import { setBaseHueChroma } from './paletteBaseColor';

  interface Props {
    selected: string | null;
    onSelect: (label: string) => void;
    /** Lightness (0..1) the disc is painted at — the selected color's L, so the
     *  field shows the real colors available at that lightness (a dark seed gets
     *  a dark disc, not a generic bright wheel). */
    discLightness: number;
  }

  let { selected, onSelect, discLightness }: Props = $props();

  // Radial saturation: chroma 0 at centre → the in-gamut maximum at the rim, per
  // hue, at the current disc L (Canva-style field, but painted at the selected
  // L). There is NO chroma cap on selection — the rim IS the gamut boundary, so
  // any in-gamut colour at this L is reachable and the handle never gets clamped
  // out from under the cursor. `gamutClamp` is display-only (invariant 6).
  const GAMUT_PROBE = 0.5; // safely above sRGB's OKLCH chroma ceiling
  // Reserved judgment call: keyboard nudge increments.
  const HUE_STEP = 2;
  const CHROMA_STEP = 0.005;
  // Decorative low-chroma "neutral zone" hint near centre — visual only, never clamps.
  const NEUTRAL_ZONE_FRACTION = 0.2;
  const MIN_SIZE = 200;
  const MAX_SIZE = 320;

  const WHEEL_LABELS = ['Brand', 'Accent', 'Background', 'Neutral', 'Alternate'];
  const WHEEL_SPECS = PALETTE_SPECS.filter((s) => WHEEL_LABELS.includes(s.label));
  const SPEC_BY_LABEL: Record<string, PaletteSpec> = Object.fromEntries(WHEEL_SPECS.map((s) => [s.label, s]));

  const normDeg = (d: number) => ((d % 360) + 360) % 360;
  const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));
  const maxChroma = (l: number, hue: number) => gamutClamp(l, GAMUT_PROBE, hue).c;

  let size = $state(280);
  let wrapper: HTMLDivElement | undefined = $state();
  let canvas: HTMLCanvasElement | undefined = $state();

  // In-gamut max chroma per integer hue at the disc's lightness. Drives the
  // radial paint (rim = this) and recomputes when the selected L changes.
  let discMaxByHue = $derived.by(() => {
    const arr = new Float64Array(360);
    for (let h = 0; h < 360; h++) arr[h] = maxChroma(discLightness, h);
    return arr;
  });

  // Handle marker positions derive from the store. Each family's radius is its
  // chroma as a fraction of the in-gamut max at ITS OWN lightness, so markers
  // stay put when the selection (disc L) changes; the active family's own L
  // equals the disc L, so its marker shares the field's radial scale and lands
  // exactly where a drag/click leaves the cursor.
  let handles = $derived(
    WHEEL_SPECS.map((spec) => {
      const hex = $editorState.palettes[spec.label]?.baseColor ?? spec.initialColor;
      const { l, c, h } = hexToOklch(hex);
      const mc = maxChroma(l, h) || 1e-6;
      const r = clamp(c / mc, 0, 1) * (size / 2);
      const rad = (h * Math.PI) / 180;
      return {
        label: spec.label,
        hex,
        hue: h,
        chroma: c,
        lightness: l,
        x: size / 2 + r * Math.cos(rad),
        y: size / 2 - r * Math.sin(rad),
      };
    }),
  );

  let neutralRingDiameter = $derived(size * NEUTRAL_ZONE_FRACTION);

  $effect(() => {
    const el = wrapper;
    if (!el || typeof ResizeObserver === 'undefined') return;
    const ro = new ResizeObserver((entries) => {
      const w = entries[0]?.contentRect.width ?? 0;
      if (w > 0) size = clamp(Math.round(w), MIN_SIZE, MAX_SIZE);
    });
    ro.observe(el);
    return () => ro.disconnect();
  });

  // Repaint when size or the disc lightness changes (via selection or the
  // readout L slider). Reads only size + discMaxByHue + discLightness — never
  // handle positions — so a hue/chroma drag never repaints the disc.
  $effect(() => {
    const cv = canvas;
    if (!cv) return;
    const maxByHue = discMaxByHue;
    const L = discLightness;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const px = Math.max(1, Math.round(size * dpr));
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
        // Rim = in-gamut max at this hue+L; chroma stays valid, so a plain
        // conversion suffices (oklchToHex still clamps sRGB defensively).
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

  // Wheel edits reuse the PaletteEditor session pattern: one clipping scope per
  // gesture → one undo; Escape cancels to the pre-drag snapshot. The colour VALUE
  // has a single store path (setBaseHueChroma via mutate, seed L preserved —
  // invariant 5). Only the ephemeral pointer POSITION is held locally during the
  // drag (`dragPos`), so the active handle tracks the cursor 1:1 instead of
  // snapping back through a store round-trip.
  let dragLabel: string | null = $state(null);
  let dragPos: { x: number; y: number } | null = $state(null);
  let dragScope: Scope | null = null;

  function beginDrag(e: PointerEvent, label: string) {
    if (e.button !== 0) return;
    e.preventDefault();
    onSelect(label);
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    dragLabel = label;
    dragScope = beginScope({ label: `colors: ${label} wheel`, collapseToOne: true, clipUndoFloor: true });
    window.addEventListener('keydown', onDragKey, true);
    applyPointer(e);
  }

  function startHandleDrag(e: PointerEvent, label: string) {
    beginDrag(e, label);
  }

  function startDiscDrag(e: PointerEvent) {
    const label = selected && WHEEL_LABELS.includes(selected) ? selected : null;
    if (!label) return;
    const rect = wrapper!.getBoundingClientRect();
    const dx = e.clientX - (rect.left + rect.width / 2);
    const dy = e.clientY - (rect.top + rect.height / 2);
    if (Math.hypot(dx, dy) > rect.width / 2) return; // clicks outside the disc are inert
    beginDrag(e, label);
  }

  function applyPointer(e: PointerEvent) {
    if (dragLabel === null) return;
    const rect = wrapper!.getBoundingClientRect();
    dragPos = { x: e.clientX - rect.left, y: e.clientY - rect.top };
    const dx = dragPos.x - rect.width / 2;
    const dy = dragPos.y - rect.height / 2;
    const hue = normDeg((Math.atan2(-dy, dx) * 180) / Math.PI);
    const f = clamp(Math.hypot(dx, dy) / (rect.width / 2), 0, 1);
    // Seed L is preserved; scale radius→chroma by the in-gamut max at that L so
    // the written value is always reachable (no clamp, no snap-back).
    const base = $editorState.palettes[dragLabel]?.baseColor ?? SPEC_BY_LABEL[dragLabel].initialColor;
    const seedL = hexToOklch(base).l;
    setBaseHueChroma(dragLabel, hue, f * maxChroma(seedL, hue));
  }

  function moveDrag(e: PointerEvent) {
    if (dragScope) applyPointer(e);
  }

  function endDrag() {
    if (!dragScope) return;
    commitScope(dragScope);
    dragScope = null;
    dragLabel = null;
    dragPos = null;
    window.removeEventListener('keydown', onDragKey, true);
  }

  function onDragKey(e: KeyboardEvent) {
    if (e.key !== 'Escape' || !dragScope) return;
    e.preventDefault();
    cancelScope(dragScope);
    dragScope = null;
    dragLabel = null;
    dragPos = null;
    window.removeEventListener('keydown', onDragKey, true);
  }

  function nudge(e: KeyboardEvent, label: string) {
    let dh = 0;
    let dc = 0;
    switch (e.key) {
      case 'ArrowLeft': dh = -HUE_STEP; break;
      case 'ArrowRight': dh = HUE_STEP; break;
      case 'ArrowUp': dc = CHROMA_STEP; break;
      case 'ArrowDown': dc = -CHROMA_STEP; break;
      default: return;
    }
    e.preventDefault();
    const hd = handles.find((h) => h.label === label);
    if (!hd) return;
    const hue = normDeg(hd.hue + dh);
    setBaseHueChroma(label, hue, clamp(hd.chroma + dc, 0, maxChroma(hd.lightness, hue)));
  }

  onDestroy(() => {
    if (dragScope) {
      cancelScope(dragScope);
      dragScope = null;
    }
    if (typeof window !== 'undefined') window.removeEventListener('keydown', onDragKey, true);
  });
</script>

<div class="wheel" bind:this={wrapper} style="max-width: {MAX_SIZE}px">
  <canvas
    class="disc"
    bind:this={canvas}
    aria-hidden="true"
    onpointerdown={startDiscDrag}
    onpointermove={moveDrag}
    onpointerup={endDrag}
    onpointercancel={endDrag}
    onlostpointercapture={endDrag}
  ></canvas>
  <div class="neutral-ring" style="width: {neutralRingDiameter}px; height: {neutralRingDiameter}px" aria-hidden="true"></div>
  {#each handles as hd (hd.label)}
    {@const dp = dragLabel === hd.label ? dragPos : null}
    <button
      type="button"
      class="handle"
      class:selected={selected === hd.label}
      style="left: {dp ? dp.x : hd.x}px; top: {dp ? dp.y : hd.y}px; --handle-fill: {hd.hex}"
      aria-label={`${hd.label} seed — hue ${Math.round(hd.hue)}°, chroma ${hd.chroma.toFixed(3)}`}
      title={hd.label}
      onpointerdown={(e) => startHandleDrag(e, hd.label)}
      onpointermove={moveDrag}
      onpointerup={endDrag}
      onpointercancel={endDrag}
      onlostpointercapture={endDrag}
      onkeydown={(e) => nudge(e, hd.label)}
      onclick={() => onSelect(hd.label)}
    ></button>
  {/each}
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
    display: block;
    width: 100%;
    height: 100%;
    border-radius: var(--ui-radius-full);
    border: 1px solid var(--ui-border-low);
    cursor: crosshair;
  }

  /* Visual guide only — the low-chroma "neutral zone". Never clamps. */
  .neutral-ring {
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    border-radius: var(--ui-radius-full);
    border: 1px dashed var(--ui-border);
    opacity: 0.4;
    pointer-events: none;
  }

  /* Clean white-ringed dots (Canva-style), fill = the actual seed colour. */
  .handle {
    position: absolute;
    transform: translate(-50%, -50%);
    width: 0.85rem;
    height: 0.85rem;
    padding: 0;
    border-radius: var(--ui-radius-full);
    background: var(--handle-fill);
    border: 2px solid var(--ui-text-primary);
    box-shadow: 0 0 0 1px rgba(0, 0, 0, 0.35), 0 1px 3px rgba(0, 0, 0, 0.5);
    cursor: grab;
    touch-action: none;
    transition: width var(--ui-transition-fast), height var(--ui-transition-fast);
  }

  .handle:active {
    cursor: grabbing;
  }

  .handle:focus-visible {
    outline: 2px solid var(--ui-border-higher);
    outline-offset: 2px;
  }

  /* Selected/base family: larger, emphasised ring. */
  .handle.selected {
    width: 1.4rem;
    height: 1.4rem;
    border-width: 3px;
    box-shadow: 0 0 0 1px rgba(0, 0, 0, 0.4), 0 2px 6px rgba(0, 0, 0, 0.55);
    z-index: 1;
  }
</style>
