<script lang="ts">
  import { oklchToHexClamped } from '../../core/palettes/oklch';
  import { PALETTE_SPECS } from '../../core/palettes/paletteDerivation';
  import { editorState, beginSliderGesture, transaction } from '../../core/store/editorStore';
  import { applyHarmonyToAxes, tintNeutralsFromAnchor, type HarmonyMode } from '../../core/palettes/colorHarmony';
  import ColorEditPanel from '../ColorEditPanel.svelte';
  import ColorWheel from './ColorWheel.svelte';
  import LightnessBar from './LightnessBar.svelte';
  import ColorReadouts from './ColorReadouts.svelte';
  import ColorStory from './ColorStory.svelte';
  import BackgroundSpotStrip from './BackgroundSpotStrip.svelte';
  import HarmonyAxesList from './HarmonyAxesList.svelte';
  import UIPillButton from '../UIPillButton.svelte';
  import { setBaseColor, setBaseColors, setAxisHues, applySolvedTextCurves } from './paletteBaseColor';
  import { HARMONY_MODE_BUTTONS } from './harmonyModeIcons';

  let selected = $state('Brand');
  let activeMode = $state<HarmonyMode>('custom');
  let previewMode = $state<HarmonyMode | null>(null);
  // Local UI only — deliberately NOT stored in PaletteConfig (shape unchanged).
  let absoluteChroma = $state(false);
  let infoOpen = $state(false);
  let infoWrap: HTMLElement | undefined = $state();

  function select(label: string) {
    selected = label;
  }

  function toggleInfo() {
    infoOpen = !infoOpen;
  }

  // Dismiss the info popover on an outside click. The listener is added after
  // the opening click has finished propagating, so it never self-closes.
  $effect(() => {
    if (!infoOpen) return;
    const onDoc = (e: MouseEvent) => {
      if (infoWrap && !infoWrap.contains(e.target as Node)) infoOpen = false;
    };
    document.addEventListener('click', onDoc);
    return () => document.removeEventListener('click', onDoc);
  });

  function applyMode(mode: HarmonyMode) {
    if (mode === 'custom') {
      activeMode = 'custom';
      return;
    }
    activeMode = mode;
    // Hue-only: every axis moves to its slot hue and each bound family follows in
    // the same transaction. setAxisHues no-op-guards a re-applied geometry.
    const target = applyHarmonyToAxes(mode, $editorState.harmonyAxes);
    setAxisHues(target.map((a, i) => ({ index: i, hue: a.hue })), `colors: harmony ${mode}`);
  }

  function tintNeutrals() {
    const patch = tintNeutralsFromAnchor($editorState.palettes, $editorState.harmonyAxes[0].hue);
    if (Object.keys(patch).length) setBaseColors(patch, 'colors: tint neutrals from anchor');
  }

  function deriveAccessibleText() {
    transaction('derive accessible text', applySolvedTextCurves);
  }

  let swatches = $derived(
    PALETTE_SPECS.map((spec) => {
      const { l, c, h } = $editorState.palettes[spec.label]?.baseColor ?? spec.initialColor;
      return {
        label: spec.label,
        display: spec.displayLabel ?? spec.label,
        hex: oklchToHexClamped(l, c, h),
        onWheel: $editorState.harmonyAxes.some((a) => a.family === spec.label),
      };
    }),
  );

  let selectedSpec = $derived(PALETTE_SPECS.find((s) => s.label === selected) ?? PALETTE_SPECS[0]);
  let selectedOklch = $derived($editorState.palettes[selected]?.baseColor ?? selectedSpec.initialColor);
</script>

<div class="colors-tab">
  <div class="pane">
    <section id="colors-wheel" class="block">
      <header class="block-head">
        <span class="eyebrow">Theme</span>
        <h2 class="title">Color Wheel</h2>
      </header>

      <ColorWheel
        {selected}
        {absoluteChroma}
        {activeMode}
        {previewMode}
        onSelect={select}
        discLightness={selectedOklch.l}
        onCustomize={() => (activeMode = 'custom')}
      />

      <LightnessBar {selected} {absoluteChroma} />

      <div class="group">
        <span class="eyebrow">Harmony</span>
        <div class="mode-row" role="group" aria-label="Harmony mode">
          {#each HARMONY_MODE_BUTTONS as m (m.mode)}
            <button
              type="button"
              class="mode-btn"
              class:active={activeMode === m.mode}
              title={m.label}
              aria-label={m.label}
              aria-pressed={activeMode === m.mode}
              onclick={() => applyMode(m.mode)}
              onpointerenter={() => (previewMode = m.mode)}
              onpointerleave={() => (previewMode = null)}
              onfocus={() => (previewMode = m.mode)}
              onblur={() => (previewMode = null)}
            >{@html m.svg}</button>
          {/each}
        </div>

        <div class="harmony-actions">
          <UIPillButton
            size="compact"
            icon="fa-fill-drip"
            title="Re-hue Neutral and Alternate to the anchor color (their own chroma and lightness kept)"
            onclick={tintNeutrals}
          >Tint neutrals from anchor</UIPillButton>
        </div>

        <div class="wheel-opts">
          <label class="opt">
            <input type="checkbox" bind:checked={absoluteChroma} />
            <span>Absolute Chroma</span>
          </label>
          <div class="info" bind:this={infoWrap}>
            <button
              type="button"
              class="info-btn"
              aria-expanded={infoOpen}
              aria-label="About Absolute Chroma"
              title="About Absolute Chroma"
              onclick={toggleInfo}
            ><i class="fas fa-circle-info" aria-hidden="true"></i></button>
            {#if infoOpen}
              <div class="info-box" role="region" aria-label="Absolute Chroma">
                <strong class="info-title">Absolute Chroma</strong>
                <p>When on, rotating a color keeps its exact chroma, its colorfulness. The reachable chroma changes from hue to hue, so the handle moves in and out as it orbits.</p>
                <p>When off, rotating keeps the color's relative saturation, its fraction of the available gamut. The handle stays a constant distance from the center, and colorfulness shifts a little across hues to stay in gamut.</p>
              </div>
            {/if}
          </div>
        </div>
      </div>

      <div class="group">
        <span class="eyebrow">Swatches</span>
        <div class="swatch-row">
          {#each swatches as sw (sw.label)}
            <button
              type="button"
              class="swatch"
              class:active={selected === sw.label}
              style="--swatch-fill: {sw.hex}"
              title={sw.display}
              aria-label={`Select ${sw.display}`}
              aria-pressed={selected === sw.label}
              onclick={() => select(sw.label)}
            >
              <span class="chip"></span>
              <span class="swatch-label">{sw.label}</span>
              {#if sw.onWheel}<span class="wheel-dot" title="On the wheel" aria-hidden="true"></span>{/if}
            </button>
          {/each}
        </div>
      </div>

      <div class="group">
        <span class="eyebrow">{selectedSpec.displayLabel ?? selected}</span>
        <ColorEditPanel
          title={selectedSpec.displayLabel ?? selected}
          hideActions
          hue={selectedOklch.h}
          chroma={selectedOklch.c}
          lightness={selectedOklch.l * 100}
          onHueChromaChange={(h, c, l) => setBaseColor(selected, { l: l / 100, c, h })}
          onSliderStart={() => beginSliderGesture(`colors: ${selected} base`)}
        />
        <ColorReadouts color={selectedOklch} />
      </div>

      {#if selectedSpec.emptySelector}
        <div class="group">
          <span class="eyebrow">Page background spot</span>
          <BackgroundSpotStrip />
        </div>
      {/if}
    </section>
  </div>

  <div class="pane">
    <section id="colors-story" class="block">
      <div class="head-row">
        <header class="block-head">
          <span class="eyebrow">Proportional preview</span>
          <h2 class="title">Color Story</h2>
        </header>
        <UIPillButton
          icon="fa-wand-magic-sparkles"
          title="Solve each family's Text lightness curve so derived text meets WCAG AA against its surfaces (one undo)"
          onclick={deriveAccessibleText}
        >Derive accessible text</UIPillButton>
      </div>
      <ColorStory />
    </section>

    <section id="colors-axes" class="block">
      <h2 class="title">Harmony axes</h2>
      <p class="axes-desc">Each axis owns a hue. Drop a color on an axis to bind it. The color adopts the axis hue and follows the axis. Drag a color to Unassigned to let it float free.</p>
      <HarmonyAxesList {activeMode} />
    </section>
  </div>
</div>

<style>
  .colors-tab {
    display: grid;
    grid-template-columns: minmax(0, 1.1fr) minmax(0, 0.9fr);
    gap: var(--ui-space-32);
    align-items: start;
  }

  .pane {
    display: flex;
    flex-direction: column;
    gap: var(--ui-space-32);
    min-width: 0;
  }

  .axes-desc {
    margin: 0;
    font-size: var(--ui-font-size-sm);
    line-height: 1.5;
    color: var(--ui-text-secondary);
  }

  .block {
    display: flex;
    flex-direction: column;
    gap: var(--ui-space-20);
    min-width: 0;
  }

  .block-head {
    display: flex;
    flex-direction: column;
    gap: var(--ui-space-2);
  }

  .eyebrow {
    font-size: var(--ui-font-size-xs);
    font-weight: var(--ui-font-weight-semibold);
    color: var(--ui-text-tertiary);
    text-transform: uppercase;
    letter-spacing: 0.04em;
  }

  .title {
    font-size: var(--ui-font-size-2xl);
    font-weight: var(--ui-font-weight-semibold);
    color: var(--ui-text-primary);
    margin: 0;
  }

  .group {
    display: flex;
    flex-direction: column;
    gap: var(--ui-space-8);
    min-width: 0;
  }

  .mode-row {
    display: flex;
    gap: var(--ui-space-6);
    flex-wrap: wrap;
  }

  .mode-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 3.375rem;
    height: 3.375rem;
    padding: 0;
    background: var(--ui-surface-lowest);
    border: 1px solid var(--ui-border-low);
    border-radius: var(--ui-radius-md);
    color: var(--ui-text-secondary);
    cursor: pointer;
    transition: background var(--ui-transition-fast), border-color var(--ui-transition-fast), color var(--ui-transition-fast);
  }

  .mode-btn :global(svg) {
    width: 100%;
    height: 100%;
    display: block;
  }

  .mode-btn:hover {
    background: var(--ui-surface-low);
    border-color: var(--ui-border);
    color: var(--ui-text-primary);
  }

  .mode-btn.active {
    border-color: var(--ui-text-primary);
    color: var(--ui-text-primary);
    background: var(--ui-surface-high);
  }

  .wheel-opts {
    display: flex;
    align-items: center;
    gap: var(--ui-space-8);
  }

  .opt {
    display: flex;
    align-items: center;
    gap: var(--ui-space-6);
    font-size: var(--ui-font-size-sm);
    color: var(--ui-text-secondary);
    cursor: pointer;
    user-select: none;
  }

  .opt input {
    margin: 0;
    cursor: pointer;
  }

  .info {
    position: relative;
    display: flex;
  }

  .info-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 1.5rem;
    height: 1.5rem;
    padding: 0;
    background: none;
    border: none;
    border-radius: var(--ui-radius-full);
    color: var(--ui-text-tertiary);
    cursor: pointer;
    font-size: var(--ui-font-size-md);
    transition: color var(--ui-transition-fast);
  }

  .info-btn:hover,
  .info-btn[aria-expanded='true'] {
    color: var(--ui-text-primary);
  }

  .info-box {
    position: absolute;
    top: calc(100% + var(--ui-space-6));
    left: 0;
    z-index: 10;
    width: 20rem;
    max-width: 80vw;
    display: flex;
    flex-direction: column;
    gap: var(--ui-space-6);
    padding: var(--ui-space-12);
    background: var(--ui-surface-low);
    border: 1px solid var(--ui-border);
    border-radius: var(--ui-radius-md);
    box-shadow: 0 6px 18px rgba(0, 0, 0, 0.5);
  }

  .info-title {
    font-size: var(--ui-font-size-md);
    font-weight: var(--ui-font-weight-semibold);
    color: var(--ui-text-primary);
  }

  .info-box p {
    margin: 0;
    font-size: var(--ui-font-size-sm);
    line-height: 1.5;
    color: var(--ui-text-secondary);
  }

  .head-row {
    display: flex;
    align-items: flex-end;
    justify-content: space-between;
    gap: var(--ui-space-12);
    flex-wrap: wrap;
  }

  .harmony-actions {
    display: flex;
    gap: var(--ui-space-8);
  }

  .swatch-row {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(4rem, 1fr));
    gap: var(--ui-space-8);
  }

  .swatch {
    position: relative;
    display: flex;
    flex-direction: column;
    align-items: stretch;
    gap: var(--ui-space-4);
    padding: 0;
    background: none;
    border: none;
    cursor: pointer;
  }

  .chip {
    display: block;
    height: 2.75rem;
    border-radius: var(--ui-radius-sm);
    background: var(--swatch-fill);
    border: 1px solid var(--ui-border-low);
    transition: border-color var(--ui-transition-fast);
  }

  .swatch:hover .chip {
    border-color: var(--ui-border-high);
  }

  .swatch.active .chip {
    border-color: var(--ui-border-higher);
    outline: 2px solid var(--ui-text-primary);
    outline-offset: 1px;
  }

  .swatch-label {
    font-size: var(--ui-font-size-xs);
    color: var(--ui-text-secondary);
    text-align: center;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .swatch.active .swatch-label {
    color: var(--ui-text-primary);
  }

  .wheel-dot {
    position: absolute;
    top: var(--ui-space-4);
    right: var(--ui-space-4);
    width: 6px;
    height: 6px;
    border-radius: var(--ui-radius-full);
    background: var(--ui-text-primary);
    box-shadow: 0 0 0 1.5px var(--ui-surface-lowest);
  }

  @media (max-width: 1024px) {
    .colors-tab {
      grid-template-columns: minmax(0, 1fr);
      gap: var(--ui-space-24);
    }
  }
</style>
