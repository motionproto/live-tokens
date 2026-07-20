<script lang="ts">
  import { onDestroy } from 'svelte';
  import { hexToOklch, oklchToHex, gamutClamp } from '../../core/palettes/oklch';
  import { PALETTE_SPECS } from '../../core/palettes/paletteDerivation';
  import { editorState, beginScope, commitScope, cancelScope, type Scope } from '../../core/store/editorStore';
  import { setBaseHueChroma } from './paletteBaseColor';

  interface Props {
    selected: string | null;
    onSelect: (label: string) => void;
  }

  let { selected, onSelect }: Props = $props();

  // Reserved judgment calls (noted in review):
  //  - chroma→radius: linear 0 → CHROMA_MAX at the rim.
  //  - DISPLAY_L: the fixed lightness the disc is painted at (seed L is not shown
  //    on the wheel — the wheel only edits hue/chroma).
  //  - keyboard nudge increments.
  const CHROMA_MAX = 0.33;
  const DISPLAY_L = 0.72;
  const HUE_STEP = 2;
  const CHROMA_STEP = 0.005;
  // Guide ring only — a visual hint of the low-chroma "neutral zone". It never
  // clamps: chroma below it is a legitimate choice, not a constraint.
  const NEUTRAL_ZONE_CHROMA = 0.04;
  const MIN_SIZE = 200;
  const MAX_SIZE = 320;

  const WHEEL_LABELS = ['Brand', 'Accent', 'Background', 'Neutral', 'Alternate'];
  const WHEEL_SPECS = PALETTE_SPECS.filter((s) => WHEEL_LABELS.includes(s.label));

  const normDeg = (d: number) => ((d % 360) + 360) % 360;
  const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));

  let size = $state(280);
  let wrapper: HTMLDivElement | undefined = $state();
  let canvas: HTMLCanvasElement | undefined = $state();

  let handles = $derived(
    WHEEL_SPECS.map((spec) => {
      const hex = $editorState.palettes[spec.label]?.baseColor ?? spec.initialColor;
      const { c, h } = hexToOklch(hex);
      const r = clamp(c / CHROMA_MAX, 0, 1) * (size / 2);
      const rad = (h * Math.PI) / 180;
      return {
        label: spec.label,
        hex,
        hue: h,
        chroma: c,
        x: size / 2 + r * Math.cos(rad),
        y: size / 2 - r * Math.sin(rad),
      };
    }),
  );

  let neutralRingDiameter = $derived((NEUTRAL_ZONE_CHROMA / CHROMA_MAX) * size);

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

  // Paint the OKLCH disc once per size into the canvas backing store. Reads only
  // `size` + `canvas`, never `handles`, so a drag doesn't repaint the disc.
  $effect(() => {
    const cv = canvas;
    if (!cv) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const px = Math.max(1, Math.round(size * dpr));
    cv.width = px;
    cv.height = px;
    const ctx = cv.getContext('2d');
    if (ctx) renderDisc(ctx, px);
  });

  function renderDisc(ctx: CanvasRenderingContext2D, px: number) {
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
        const chroma = (dist / R) * CHROMA_MAX;
        const g = gamutClamp(DISPLAY_L, chroma, hue);
        const hex = oklchToHex(g.l, g.c, g.h);
        data[i] = parseInt(hex.slice(1, 3), 16);
        data[i + 1] = parseInt(hex.slice(3, 5), 16);
        data[i + 2] = parseInt(hex.slice(5, 7), 16);
        data[i + 3] = 255;
      }
    }
    ctx.putImageData(img, 0, 0);
  }

  function pointerToHueChroma(e: PointerEvent): { hue: number; chroma: number } {
    const rect = wrapper!.getBoundingClientRect();
    const dx = e.clientX - (rect.left + rect.width / 2);
    const dy = e.clientY - (rect.top + rect.height / 2);
    const hue = normDeg((Math.atan2(-dy, dx) * 180) / Math.PI);
    const chroma = clamp(Math.hypot(dx, dy) / (rect.width / 2), 0, 1) * CHROMA_MAX;
    return { hue, chroma };
  }

  // Wheel edits reuse the PaletteEditor session pattern: a clipping scope opens
  // on pointerdown, every move mutates the seed's hue/chroma inside it (seed L
  // preserved), commit on pointerup collapses the whole drag to one undo,
  // Escape cancels back to the pre-drag snapshot. No parallel color state —
  // handle positions above derive straight from the store.
  let dragLabel: string | null = null;
  let dragScope: Scope | null = null;

  function startDrag(e: PointerEvent, label: string) {
    if (e.button !== 0) return;
    e.preventDefault();
    onSelect(label);
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    dragLabel = label;
    dragScope = beginScope({ label: `colors: ${label} wheel`, collapseToOne: true, clipUndoFloor: true });
    window.addEventListener('keydown', onDragKey, true);
    const { hue, chroma } = pointerToHueChroma(e);
    setBaseHueChroma(label, hue, chroma);
  }

  function moveDrag(e: PointerEvent) {
    if (!dragScope || dragLabel === null) return;
    const { hue, chroma } = pointerToHueChroma(e);
    setBaseHueChroma(dragLabel, hue, chroma);
  }

  function endDrag() {
    if (!dragScope) return;
    commitScope(dragScope);
    dragScope = null;
    dragLabel = null;
    window.removeEventListener('keydown', onDragKey, true);
  }

  function onDragKey(e: KeyboardEvent) {
    if (e.key !== 'Escape' || !dragScope) return;
    e.preventDefault();
    cancelScope(dragScope);
    dragScope = null;
    dragLabel = null;
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
    setBaseHueChroma(label, normDeg(hd.hue + dh), clamp(hd.chroma + dc, 0, CHROMA_MAX));
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
  <canvas class="disc" bind:this={canvas} aria-hidden="true"></canvas>
  <div class="neutral-ring" style="width: {neutralRingDiameter}px; height: {neutralRingDiameter}px" aria-hidden="true"></div>
  {#each handles as hd (hd.label)}
    <button
      type="button"
      class="handle"
      class:selected={selected === hd.label}
      style="left: {hd.x}px; top: {hd.y}px; --handle-fill: {hd.hex}"
      aria-label={`${hd.label} seed — hue ${Math.round(hd.hue)}°, chroma ${hd.chroma.toFixed(3)}`}
      title={hd.label}
      onpointerdown={(e) => startDrag(e, hd.label)}
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
  }

  /* Visual guide only — the low-chroma "neutral zone". Never clamps. */
  .neutral-ring {
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    border-radius: var(--ui-radius-full);
    border: 1px dashed var(--ui-border);
    opacity: 0.45;
    pointer-events: none;
  }

  .handle {
    position: absolute;
    transform: translate(-50%, -50%);
    width: 1.25rem;
    height: 1.25rem;
    padding: 0;
    border-radius: var(--ui-radius-full);
    background: var(--handle-fill);
    border: 2px solid var(--ui-text-primary);
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.5);
    cursor: grab;
    touch-action: none;
  }

  .handle:hover {
    border-color: var(--ui-text-primary);
    box-shadow: 0 0 0 2px var(--ui-surface-high), 0 1px 3px rgba(0, 0, 0, 0.5);
  }

  .handle:active {
    cursor: grabbing;
  }

  .handle:focus-visible {
    outline: 2px solid var(--ui-border-higher);
    outline-offset: 2px;
  }

  .handle.selected {
    box-shadow: 0 0 0 2px var(--ui-surface-lowest), 0 0 0 4px var(--ui-text-primary);
  }
</style>
