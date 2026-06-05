<script lang="ts">
  import { hexToOklch, oklchToHex, gamutClamp } from '../core/palettes/oklch';
  import InlineEditActions from '../../system/components/InlineEditActions.svelte';
  import Button from '../../system/components/Button.svelte';

  

  
  interface Props {
    title?: string | null;
    showRemoveOverride?: boolean;
    onConfirm?: () => void;
    onCancel?: () => void;
    onRemoveOverride?: () => void;
    /**
   * Optional pointerdown hook for slider drags — lets parents open a store
   * transaction so the whole drag collapses to one undo step. If the parent
   * doesn't route slider writes through the editor store, leave this unset.
   */
    onSliderStart?: () => void;
    hue?: number;
    chroma?: number;
    lightness?: number;
    /** Upper bound of the chroma slider (full sRGB gamut by default). */
    chromaMax?: number;
    /** Optional marker on the chroma track flagging the typical-neutral zone. */
    chromaHint?: number;
    onHueChromaChange?: (hue: number, chroma: number, lightness: number) => void;
    actions?: import('svelte').Snippet;
  }

  let {
    title = null,
    showRemoveOverride = false,
    onConfirm = () => {},
    onCancel = () => {},
    onRemoveOverride = () => {},
    onSliderStart = () => {},
    hue = 0,
    chroma = 0.04,
    lightness = 55,
    chromaMax = 0.4,
    chromaHint,
    onHueChromaChange = () => {},
    actions
  }: Props = $props();

  const hasEyeDropper = typeof window !== 'undefined' && 'EyeDropper' in window;

  let lPct = $derived(lightness);

  let previewHex = $derived((() => {
    const c = gamutClamp(lPct / 100, chroma, hue);
    return oklchToHex(c.l, c.c, c.h);
  })());

  let hueGradient = $derived((() => {
    const _l = lPct / 100;
    const displayChroma = Math.max(chroma, chromaMax);
    const stops = Array.from({ length: 13 }, (_, i) => {
      const h = (i / 12) * 360;
      const c = gamutClamp(_l, displayChroma, h);
      return oklchToHex(c.l, c.c, c.h);
    });
    return `linear-gradient(to right, ${stops.join(',')})`;
  })());

  let chromaGradient = $derived((() => {
    const _h = hue, _l = lPct / 100;
    const stops = Array.from({ length: 8 }, (_, i) => {
      const c = (i / 7) * chromaMax;
      const clamped = gamutClamp(_l, c, _h);
      return oklchToHex(clamped.l, clamped.c, clamped.h);
    });
    return `linear-gradient(to right, ${stops.join(',')})`;
  })());

  let lightnessGradient = $derived((() => {
    const _h = hue, _c = chroma;
    const stops = Array.from({ length: 9 }, (_, i) => {
      const clamped = gamutClamp(i / 8, _c, _h);
      return oklchToHex(clamped.l, clamped.c, clamped.h);
    });
    return `linear-gradient(to right, ${stops.join(',')})`;
  })());

  // --- Shared ---

  async function pickScreenColor() {
    if (!hasEyeDropper) return;
    try {
      const dropper = new (window as any).EyeDropper();
      const result = await dropper.open();
      const hex = result.sRGBHex.toLowerCase();
      const oklch = hexToOklch(hex);
      onHueChromaChange(Math.round(oklch.h), Math.round(oklch.c * 1000) / 1000, oklch.l * 100);
    } catch {
      // user cancelled the eyedropper
    }
  }

  let hexEditing = $state(false);
  let hexDraft = $state('');

  function startHexEdit() {
    hexDraft = previewHex;
    hexEditing = true;
  }

  function autoFocus(node: HTMLElement) { node.focus(); }

  function commitHex() {
    const v = hexDraft.startsWith('#') ? hexDraft : `#${hexDraft}`;
    if (/^#[0-9a-f]{6}$/i.test(v)) {
      const hex = v.toLowerCase();
      const oklch = hexToOklch(hex);
      onHueChromaChange(Math.round(oklch.h), Math.round(oklch.c * 1000) / 1000, oklch.l * 100);
    }
    hexEditing = false;
  }

  function handleHexKeydown(e: KeyboardEvent) {
    if (e.key === 'Enter') commitHex();
    if (e.key === 'Escape') hexEditing = false;
  }
</script>

<div class="hsl-panel">
  <div class="hsl-panel-header">
    <div class="hsl-preview" style="background: {previewHex}"></div>
    {#if hasEyeDropper}
      <button
        class="eyedropper-btn"
        type="button"
        title="Pick color from screen"
        onclick={pickScreenColor}
      ><i class="fas fa-eye-dropper"></i></button>
    {/if}
    {#if title}
      <span class="hsl-panel-title">{title}</span>
    {/if}
    {#if hexEditing}
      <input
        class="hsl-hex-input"
        type="text"
        bind:value={hexDraft}
        onkeydown={handleHexKeydown}
        onblur={commitHex}
        maxlength="7"
        use:autoFocus
      />
    {:else}
      <button class="hsl-hex" onclick={startHexEdit} title="Click to edit hex">{previewHex}</button>
    {/if}
    <code class="hsl-values">oklch({(lPct / 100).toFixed(2)}, {chroma.toFixed(3)}, {Math.round(hue)})</code>
    {@render actions?.()}
    <div class="hsl-panel-actions">
      {#if showRemoveOverride}
        <Button
          variant="danger"
          size="small"
          icon="fas fa-trash"
          on:click={onRemoveOverride}
        >Remove override</Button>
      {/if}
      <InlineEditActions
        onSave={onConfirm}
        onCancel={onCancel}
        saveTitle="Apply changes"
        cancelTitle="Discard changes"
      />
    </div>
  </div>
  <div class="hsl-sliders">
    <div class="hsl-slider-row">
      <span class="hsl-slider-label">H</span>
      <!-- svelte-ignore a11y_no_static_element_interactions -->
      <div class="slider-track" style="background: {hueGradient}" onpointerdown={onSliderStart}>
        <input type="range" min="0" max="360" value={hue}
          oninput={(e) => onHueChromaChange(+e.currentTarget.value, chroma, lPct)} />
      </div>
      <input
        class="hsl-slider-input"
        type="number"
        min="0"
        max="360"
        value={hue}
        onchange={(e) => onHueChromaChange(Math.min(360, Math.max(0, +e.currentTarget.value)), chroma, lPct)}
      /><span class="hsl-slider-unit">&deg;</span>
    </div>
    <div class="hsl-slider-row">
      <span class="hsl-slider-label">C</span>
      <!-- svelte-ignore a11y_no_static_element_interactions -->
      <div class="slider-track" style="background: {chromaGradient}" onpointerdown={onSliderStart}>
        {#if chromaHint !== undefined && chromaHint < chromaMax}
          <div class="chroma-hint" style="left: {(chromaHint / chromaMax) * 100}%" title="Typical neutral range"></div>
        {/if}
        <input type="range" min="0" max={chromaMax} step="0.001" value={chroma}
          oninput={(e) => onHueChromaChange(hue, +e.currentTarget.value, lPct)} />
      </div>
      <input
        class="hsl-slider-input chroma-input"
        type="number"
        min="0"
        max={chromaMax}
        step="0.001"
        value={chroma.toFixed(3)}
        onchange={(e) => onHueChromaChange(hue, Math.min(chromaMax, Math.max(0, +e.currentTarget.value)), lPct)}
      />
    </div>
    <div class="hsl-slider-row">
      <span class="hsl-slider-label">L</span>
      <!-- svelte-ignore a11y_no_static_element_interactions -->
      <div class="slider-track" style="background: {lightnessGradient}" onpointerdown={onSliderStart}>
        <input type="range" min="0" max="100" value={lPct}
          oninput={(e) => onHueChromaChange(hue, chroma, +e.currentTarget.value)} />
      </div>
      <input
        class="hsl-slider-input"
        type="number"
        min="0"
        max="100"
        value={Math.round(lPct)}
        onchange={(e) => onHueChromaChange(hue, chroma, Math.min(100, Math.max(0, +e.currentTarget.value)))}
      /><span class="hsl-slider-unit">%</span>
    </div>
  </div>
</div>

<style>
  .hsl-panel {
    display: flex;
    flex-direction: column;
    gap: var(--ui-space-12);
    padding: var(--ui-space-12);
    background: var(--ui-surface-lowest);
    border: 1px solid var(--ui-border-low);
    border-radius: var(--ui-radius-md);
  }

  .hsl-panel-header {
    display: flex;
    align-items: center;
    gap: var(--ui-space-8);
    flex-wrap: wrap;
  }

  .hsl-preview {
    width: 1.5rem;
    height: 1.5rem;
    border-radius: var(--ui-radius-sm);
    border: 1px solid var(--ui-border-low);
    flex-shrink: 0;
  }

  .eyedropper-btn {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 1.5rem;
    height: 1.5rem;
    padding: 0;
    border: 1px solid var(--ui-border);
    border-radius: var(--ui-radius-sm);
    background: var(--ui-hover);
    color: var(--ui-text-secondary);
    cursor: pointer;
    font-size: var(--ui-font-size-md);
    flex-shrink: 0;

    &:hover {
      background: var(--ui-hover-high);
      color: var(--ui-text-primary);
      border-color: var(--ui-border-higher);
    }
  }

  .hsl-panel-title {
    font-size: var(--ui-font-size-md);
    font-weight: var(--ui-font-weight-semibold);
    color: var(--ui-text-secondary);
  }

  .hsl-hex {
    font-size: var(--ui-font-size-md);
    color: var(--ui-text-accent);
    font-family: var(--ui-font-mono);
    background: none;
    border: 1px solid transparent;
    border-radius: var(--ui-radius-sm);
    padding: var(--ui-space-2) var(--ui-space-4);
    cursor: pointer;
    transition: all var(--ui-transition-fast);
  }

  .hsl-hex:hover {
    border-color: var(--ui-border);
    background: var(--ui-surface-low);
  }

  .hsl-hex-input {
    font-size: var(--ui-font-size-md);
    color: var(--ui-text-accent);
    font-family: var(--ui-font-mono);
    background: var(--ui-surface-low);
    border: 1px solid var(--ui-border-higher);
    border-radius: var(--ui-radius-sm);
    padding: var(--ui-space-2) var(--ui-space-4);
    width: 5.5rem;
    outline: none;
  }

  .hsl-values {
    font-size: var(--ui-font-size-md);
    color: var(--ui-text-tertiary);
    font-family: var(--ui-font-mono);
  }

  .hsl-panel-actions {
    display: flex;
    align-items: center;
    gap: var(--ui-space-6);
    margin-left: auto;
    flex-wrap: wrap;
  }

  .hsl-sliders {
    display: flex;
    flex-direction: column;
    gap: var(--ui-space-6);
  }

  .hsl-slider-row {
    display: flex;
    align-items: center;
    gap: var(--ui-space-8);
  }

  .hsl-slider-label {
    font-size: var(--ui-font-size-md);
    font-weight: var(--ui-font-weight-semibold);
    color: var(--ui-text-tertiary);
    width: 2.5rem;
    text-align: right;
    flex-shrink: 0;
  }

  .slider-track {
    position: relative;
    height: 1.25rem;
    border-radius: var(--ui-radius-md);
    border: 1px solid var(--ui-border-low);
    flex: 1;
    min-width: 6rem;
  }

  .chroma-hint {
    position: absolute;
    top: -2px;
    bottom: -2px;
    width: 1px;
    background: var(--ui-text-secondary);
    opacity: 0.5;
    pointer-events: none;
  }

  .slider-track input[type="range"] {
    -webkit-appearance: none;
    appearance: none;
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;
    margin: 0;
    background: transparent;
    cursor: pointer;
    border-radius: var(--ui-radius-md);
  }

  .slider-track input[type="range"]::-webkit-slider-thumb {
    -webkit-appearance: none;
    width: 0.5rem;
    height: 1.25rem;
    border-radius: var(--ui-radius-sm);
    background: white;
    border: 2px solid rgba(0, 0, 0, 0.3);
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.4);
    cursor: pointer;
  }

  .slider-track input[type="range"]::-moz-range-thumb {
    width: 0.5rem;
    height: 1.25rem;
    border-radius: var(--ui-radius-sm);
    background: white;
    border: 2px solid rgba(0, 0, 0, 0.3);
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.4);
    cursor: pointer;
  }

  .slider-track input[type="range"]::-moz-range-track {
    background: transparent;
    border: none;
  }

  .slider-track input[type="range"]:focus {
    outline: none;
  }

  .slider-track input[type="range"]:focus-visible {
    outline: 2px solid var(--ui-border-high);
    outline-offset: 2px;
  }

  .hsl-slider-input {
    font-size: var(--ui-font-size-md);
    color: var(--ui-text-primary);
    font-family: var(--ui-font-mono);
    width: 2.5rem;
    text-align: right;
    flex-shrink: 0;
    background: var(--ui-surface-lowest);
    border: 1px solid var(--ui-border-low);
    border-radius: var(--ui-radius-sm);
    padding: var(--ui-space-2) var(--ui-space-4);
    -moz-appearance: textfield;
    appearance: textfield;
  }

  .hsl-slider-input.chroma-input {
    width: 3.5rem;
  }

  .hsl-slider-input::-webkit-inner-spin-button,
  .hsl-slider-input::-webkit-outer-spin-button {
    -webkit-appearance: none;
    margin: 0;
  }

  .hsl-slider-input:focus {
    outline: none;
    border-color: var(--ui-border-high);
  }

  .hsl-slider-unit {
    font-size: var(--ui-font-size-md);
    color: var(--ui-text-muted);
    font-family: var(--ui-font-mono);
    width: 0.75rem;
    flex-shrink: 0;
  }
</style>
