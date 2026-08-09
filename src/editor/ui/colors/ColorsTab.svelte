<script lang="ts">
  import { oklchToHexClamped } from '../../core/palettes/oklch';
  import { PALETTE_SPECS } from '../../core/palettes/paletteDerivation';
  import { editorState, beginSliderGesture, transaction } from '../../core/store/editorStore';
  import { applyHarmonyToAxes, modeActiveAxes, tintNeutralsFromAnchor, type HarmonyMode } from '../../core/palettes/colorHarmony';
  import ColorEditPanel from '../ColorEditPanel.svelte';
  import ColorWheel from './ColorWheel.svelte';
  import LightnessBar from './LightnessBar.svelte';
  import ColorReadouts from './ColorReadouts.svelte';
  import ColorStory from './ColorStory.svelte';
  import PaletteStepStrip from './PaletteStepStrip.svelte';
  import HarmonyAxesList from './HarmonyAxesList.svelte';
  import UIPillButton from '../UIPillButton.svelte';
  import { recommendNeutralText } from '../../core/palettes/recommendText';
  import {
    setBaseColor,
    setBaseColors,
    setAxisHues,
    applySolvedTextCurves,
    applySuggestedNeutralText,
    palettesWithDefaults,
  } from './paletteBaseColor';
  import { HARMONY_MODE_BUTTONS } from './harmonyModeIcons';
  import { dockGrow } from '../palette/dockMagnify';

  let selected = $state('Brand');
  let activeMode = $state<HarmonyMode>('custom');
  let hoverMode = $state<HarmonyMode | null>(null);
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

  // Color Story model: the story is a pure readout, so its palette map and text
  // recommendation are owned here alongside the actions that write them.
  let useBlackWhite = $state(false);
  let fullPalettes = $derived(palettesWithDefaults($editorState.palettes));
  let textRec = $derived(recommendNeutralText(fullPalettes, undefined, useBlackWhite));

  let pureExtreme = $derived(textRec.scheme === 'light' ? 'pure black' : 'pure white');

  let swatches = $derived.by(() => {
    // A family bound to an inactive axis edits in dot mode, so it is not "on the wheel".
    const active = modeActiveAxes(activeMode);
    return PALETTE_SPECS.map((spec) => {
      const { l, c, h } = $editorState.palettes[spec.label]?.baseColor ?? spec.initialColor;
      return {
        label: spec.label,
        display: spec.displayLabel ?? spec.label,
        hex: oklchToHexClamped(l, c, h),
        onWheel: $editorState.harmonyAxes.some((a, i) => a.family === spec.label && active[i]),
      };
    });
  });

  const FUNCTIONAL_FAMILIES = new Set(['Info', 'Success', 'Warning', 'Danger']);
  // Declaration order, never a computed one: sorting by luminance made the row
  // reshuffle under the pointer while a lightness edit was in flight.
  let coreSwatches = $derived(swatches.filter((sw) => !FUNCTIONAL_FAMILIES.has(sw.label)));
  let functionalSwatches = $derived(swatches.filter((sw) => FUNCTIONAL_FAMILIES.has(sw.label)));

  let shownModeLabel = $derived(
    HARMONY_MODE_BUTTONS.find((b) => b.mode === (hoverMode ?? activeMode))?.label ?? '',
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
        onSelect={select}
        discLightness={selectedOklch.l}
        onCustomize={() => (activeMode = 'custom')}
      />

      <LightnessBar {selected} {absoluteChroma} />

      <div class="group">
        <span class="eyebrow">Color Harmony <span class="mode-name">&middot; {shownModeLabel}</span></span>
        <div class="mode-row" role="group" aria-label="Color harmony mode">
          {#each HARMONY_MODE_BUTTONS as m (m.mode)}
            <button
              type="button"
              class="mode-btn"
              class:active={activeMode === m.mode}
              title={m.label}
              aria-label={m.label}
              aria-pressed={activeMode === m.mode}
              onclick={() => applyMode(m.mode)}
              onpointerenter={() => (hoverMode = m.mode)}
              onpointerleave={() => (hoverMode = null)}
              onfocus={() => (hoverMode = m.mode)}
              onblur={() => (hoverMode = null)}
            >{@html m.svg}</button>
          {/each}
        </div>

        <div class="harmony-actions">
          <UIPillButton
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
        {#snippet swatchRow(row: typeof swatches)}
          {@const selIdx = row.findIndex((sw) => sw.label === selected)}
          <div class="swatch-row">
            {#each row as sw, i (sw.label)}
              <button
                type="button"
                class="swatch"
                class:active={selected === sw.label}
                style="--swatch-fill: {sw.hex}"
                style:flex-grow={dockGrow(i, selIdx === -1 ? null : selIdx)}
                title={sw.display}
                aria-label={`Select ${sw.display}`}
                aria-pressed={selected === sw.label}
                onclick={() => select(sw.label)}
              >
                <span class="chip">
                  {#if sw.onWheel}<span class="wheel-dot" title="On the wheel" aria-hidden="true"></span>{/if}
                </span>
                <span class="swatch-label">{sw.label}</span>
              </button>
            {/each}
          </div>
        {/snippet}
        <div class="swatch-rows">
          {@render swatchRow(coreSwatches)}
          {@render swatchRow(functionalSwatches)}
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
      </div>

      <div class="group">
        <span class="eyebrow">Derived scale</span>
        <PaletteStepStrip spec={selectedSpec} />
      </div>

      <div class="group">
        <ColorReadouts color={selectedOklch} />
      </div>
    </section>
  </div>

  <div class="pane">
    <section id="colors-story" class="block">
      <header class="block-head">
        <span class="eyebrow">Proportional preview</span>
        <h2 class="title">Color Story</h2>
      </header>
      <div class="story-actions">
        <UIPillButton
          icon="fa-universal-access"
          title="Every family: solve its Text lightness curve to the value that clears WCAG AA (4.5:1) against its own surfaces. Contrast-first, so secondary and tertiary can land close together. One undo."
          onclick={deriveAccessibleText}
        >Raise all text to AA</UIPillButton>
        <UIPillButton
          icon="fa-arrow-down-short-wide"
          disabled={!textRec.anyDiffers}
          title={textRec.anyDiffers
            ? 'Neutral text: keep primary where it is and step secondary and tertiary down in even lightness drops, floored at WCAG AA (4.5:1). Muted and disabled stay put. One undo.'
            : 'The neutral text steps already match the suggestion shown below.'}
          onclick={() => applySuggestedNeutralText(useBlackWhite)}
        >Even neutral steps</UIPillButton>
        <UIPillButton
          icon="fa-circle-half-stroke"
          ariaPressed={useBlackWhite}
          title={`Start the suggested steps from ${pureExtreme} instead of the softer extreme most designers prefer. Changes the suggestion shown below.`}
          onclick={() => (useBlackWhite = !useBlackWhite)}
        >Anchor at {pureExtreme}</UIPillButton>
      </div>
      <ColorStory full={fullPalettes} rec={textRec} />
    </section>

    <section id="colors-axes" class="block">
      <h2 class="title">Harmony axes</h2>
      <p class="axes-desc">Each axis owns a hue. Drop a color on an axis to bind it. The color adopts the axis hue and follows the axis. Drag a color to Unassigned to let it float free.</p>
      <HarmonyAxesList {activeMode} {selected} onSelect={select} />
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

  /* Wide standalone layouts (Colors page, full-screen editor): pin the story
     pane to the width it was designed at in the docked panel — wider stretches
     the seed-color bars into heavy slabs — and let the wheel column absorb the
     rest. The docked panel's iframe viewport stays below this breakpoint. */
  @media (min-width: 1200px) {
    .colors-tab {
      grid-template-columns: minmax(0, 1fr) 30rem;
      gap: var(--ui-space-48);
    }
  }

  .pane {
    display: flex;
    flex-direction: column;
    gap: var(--ui-space-32);
    min-width: 0;
  }

  .axes-desc {
    margin: 0;
    font-size: var(--ui-font-size-md);
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

  .eyebrow .mode-name {
    color: var(--ui-text-secondary);
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

  .harmony-actions {
    display: flex;
    gap: var(--ui-space-8);
  }

  .story-actions {
    display: flex;
    flex-wrap: wrap;
    gap: var(--ui-space-8);
  }

  .swatch-rows {
    display: flex;
    flex-direction: column;
    gap: var(--ui-space-8);
    min-width: 0;
  }

  /* Dock magnification, mirroring PaletteStepStrip: the flex-grow transition
     animates the selected swatch opening in place. */
  .swatch-row {
    display: flex;
    align-items: flex-end;
    gap: var(--ui-space-8);
  }

  .swatch {
    flex: 1 1 0;
    min-width: 0;
    display: flex;
    flex-direction: column;
    align-items: stretch;
    gap: var(--ui-space-4);
    padding: 0;
    background: none;
    border: none;
    cursor: pointer;
    transition: flex-grow var(--ui-transition-fast);
  }

  .chip {
    position: relative;
    display: block;
    height: 2.75rem;
    /* Compensating margin: height + margin-top is constant every frame of the
       magnification, so the row's layout height never dips mid-transition.
       Chip grows upward, label pinned. */
    margin-top: 0.5rem;
    border-radius: var(--ui-radius-sm);
    background: var(--swatch-fill);
    border: 1px solid var(--ui-border-low);
    transition: border-color var(--ui-transition-fast), height var(--ui-transition-fast), margin-top var(--ui-transition-fast);
  }

  .swatch.active .chip {
    height: 3.25rem;
    margin-top: 0;
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
    pointer-events: none;
  }

  @media (max-width: 1024px) {
    .colors-tab {
      grid-template-columns: minmax(0, 1fr);
      gap: var(--ui-space-24);
    }
  }
</style>
