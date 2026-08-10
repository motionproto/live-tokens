<script lang="ts">
  import { cubicOut } from 'svelte/easing';
  import { oklchToHexClamped } from '../../core/palettes/oklch';
  import { PALETTE_SPECS } from '../../core/palettes/paletteDerivation';
  import { editorState, beginSliderGesture } from '../../core/store/editorStore';
  import { applyHarmonyToAxes, axisStatuses, HARMONY_ELIGIBLE, type HarmonyMode } from '../../core/palettes/colorHarmony';
  import AxisNumeral from './AxisNumeral.svelte';
  import ColorEditPanel from '../ColorEditPanel.svelte';
  import ColorWheel from './ColorWheel.svelte';
  import ColorReadouts from './ColorReadouts.svelte';
  import ColorStory from './ColorStory.svelte';
  import PaletteStepStrip from './PaletteStepStrip.svelte';
  import HarmonyAxesList from './HarmonyAxesList.svelte';
  import {
    setBaseColor,
    setAxisHues,
    unbindFamily,
    palettesWithDefaults,
  } from './paletteBaseColor';
  import { HARMONY_MODE_BUTTONS } from './harmonyModeIcons';
  import { HARMONY_DRAG_TYPE, startFamilyDrag } from './harmonyDrag';
  import { maxChroma } from './colorWheelMath';

  let selected = $state('Brand');
  let activeMode = $state<HarmonyMode>('custom');
  // Local UI only — deliberately NOT stored in PaletteConfig (shape unchanged).
  let absoluteChroma = $state(false);
  let infoOpen = $state(false);
  let infoWrap: HTMLElement | undefined = $state();
  let axesInfoOpen = $state(false);
  let axesInfoWrap: HTMLElement | undefined = $state();

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

  $effect(() => {
    if (!axesInfoOpen) return;
    const onDoc = (e: MouseEvent) => {
      if (axesInfoWrap && !axesInfoWrap.contains(e.target as Node)) axesInfoOpen = false;
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

  const ELIGIBLE = new Set(HARMONY_ELIGIBLE);

  const reduceMotion =
    typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches === true;

  /** The badge is the swatch's answer to "did it land": it fades up as the color
   *  takes an axis, and back out when the color comes home. It rides over the
   *  fill, so nothing reflows and opacity alone carries the change. */
  function badgeFade(_node: Element) {
    return {
      duration: reduceMotion ? 0 : 200,
      easing: cubicOut,
      css: (t: number) => `opacity: ${t}; transform: translateY(-50%) scale(${0.85 + 0.15 * t});`,
    };
  }

  // The swatch row is the home a family returns to: dropping a chip back here
  // is the unassign gesture, which is why no separate tray exists.
  let unassignHover = $state(false);

  function onSwatchesDragOver(e: DragEvent) {
    if (!(e.dataTransfer?.types ?? []).includes(HARMONY_DRAG_TYPE)) return;
    e.preventDefault();
    if (e.dataTransfer) e.dataTransfer.dropEffect = 'move';
    unassignHover = true;
  }

  function onSwatchesDrop(e: DragEvent) {
    e.preventDefault();
    unassignHover = false;
    const family = e.dataTransfer?.getData(HARMONY_DRAG_TYPE);
    if (family) unbindFamily(family);
  }

  let fullPalettes = $derived(palettesWithDefaults($editorState.palettes));

  let swatches = $derived.by(() => {
    const statuses = axisStatuses(activeMode, $editorState.harmonyAxes);
    return PALETTE_SPECS.map((spec) => {
      const { l, c, h } = $editorState.palettes[spec.label]?.baseColor ?? spec.initialColor;
      const index = $editorState.harmonyAxes.findIndex((a) => a.family === spec.label);
      return {
        label: spec.label,
        display: spec.displayLabel ?? spec.label,
        hex: oklchToHexClamped(l, c, h),
        axis: index === -1 ? null : { index, status: statuses[index] },
        eligible: ELIGIBLE.has(spec.label),
      };
    });
  });

  const FUNCTIONAL_FAMILIES = new Set(['Info', 'Success', 'Warning', 'Danger']);
  // Declaration order, never a computed one: sorting by luminance made the row
  // reshuffle under the pointer while a lightness edit was in flight.
  let coreSwatches = $derived(swatches.filter((sw) => !FUNCTIONAL_FAMILIES.has(sw.label)));
  let functionalSwatches = $derived(swatches.filter((sw) => FUNCTIONAL_FAMILIES.has(sw.label)));

  let selectedSpec = $derived(PALETTE_SPECS.find((s) => s.label === selected) ?? PALETTE_SPECS[0]);
  let selectedOklch = $derived($editorState.palettes[selected]?.baseColor ?? selectedSpec.initialColor);

  const rFracOf = (l: number, c: number, h: number) =>
    Math.min(1, Math.max(0, c / (maxChroma(l, h) || 1e-6)));

  // H and L slider edits honor the Absolute Chroma toggle the way the wheel
  // does: with it off, the relative saturation fraction holds while the gamut
  // moves. An explicit chroma edit (C slider, hex, eyedropper) is taken as-is.
  function editBase(h: number, c: number, lPct: number) {
    const l = lPct / 100;
    const cur = selectedOklch;
    const chroma = absoluteChroma || c !== cur.c
      ? c
      : rFracOf(cur.l, cur.c, cur.h) * maxChroma(l, h);
    setBaseColor(selected, { l, c: chroma, h });
  }
</script>

<div class="colors-tab">
  <div class="pane">
    <section id="colors-wheel" class="block">
      <header class="block-head">
        <h2 class="title">Color Wheel</h2>
      </header>

      <div class="wheel-hero">
        <div class="wheel-row">
          <div class="mode-rail" role="group" aria-label="Color harmony mode">
            {#each HARMONY_MODE_BUTTONS as m (m.mode)}
              <button
                type="button"
                class="mode-btn"
                class:active={activeMode === m.mode}
                title={m.label}
                aria-label={m.label}
                aria-pressed={activeMode === m.mode}
                onclick={() => applyMode(m.mode)}
              >{@html m.svg}</button>
            {/each}
          </div>

          <div class="wheel-slot">
            <ColorWheel
              {selected}
              {absoluteChroma}
              {activeMode}
              onSelect={select}
              discLightness={selectedOklch.l}
              onCustomize={() => (activeMode = 'custom')}
            />
          </div>
        </div>

        <ColorEditPanel
          title={selectedSpec.displayLabel ?? selected}
          hideActions
          hidePreview
          hue={selectedOklch.h}
          chroma={selectedOklch.c}
          lightness={selectedOklch.l * 100}
          onHueChromaChange={editBase}
          onSliderStart={() => beginSliderGesture(`colors: ${selected} base`)}
        >
          {#snippet actions()}
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
          {/snippet}
        </ColorEditPanel>
      </div>

      <div class="harmony-cols">
        <div class="group">
          <h3 class="title">Selected color</h3>
          {#snippet swatchRow(row: typeof swatches, acceptsDrop = false)}
            <!-- svelte-ignore a11y_no_static_element_interactions -->
            <div
              class="swatch-row"
              class:drop-target={acceptsDrop && unassignHover}
              ondragover={acceptsDrop ? onSwatchesDragOver : undefined}
              ondragleave={acceptsDrop ? () => (unassignHover = false) : undefined}
              ondrop={acceptsDrop ? onSwatchesDrop : undefined}
            >
              {#each row as sw (sw.label)}
                <button
                  type="button"
                  class="swatch"
                  class:active={selected === sw.label}
                  class:draggable={sw.eligible}
                  style="--swatch-fill: {sw.hex}"
                  draggable={sw.eligible}
                  title={sw.eligible ? `${sw.display} · drag onto an axis to assign it` : sw.display}
                  aria-label={`Select ${sw.display}`}
                  aria-pressed={selected === sw.label}
                  ondragstart={(e) => startFamilyDrag(e, sw.label)}
                  onclick={() => select(sw.label)}
                >
                  <span class="frame">
                    {#if sw.eligible}<span class="grip" aria-hidden="true">⋮⋮</span>{/if}
                    <span class="bar">
                      {#if sw.axis}
                        <span class="axis-badge" aria-hidden="true" transition:badgeFade>
                          <AxisNumeral index={sw.axis.index} status={sw.axis.status} scrim />
                        </span>
                      {/if}
                    </span>
                  </span>
                  <span class="swatch-label">{sw.label}</span>
                </button>
              {/each}
            </div>
          {/snippet}
          <div class="swatch-rows">
            {@render swatchRow(coreSwatches, true)}
            {@render swatchRow(functionalSwatches)}
          </div>
        </div>

        <div class="gutter" aria-hidden="true">
          <i class="fas fa-arrows-left-right" title="Drag a color onto an axis to assign it, back to the swatches to unassign"></i>
        </div>

        <div class="group">
          <div class="group-head">
            <h3 class="title">Harmony axes</h3>
            <div class="info" bind:this={axesInfoWrap}>
              <button
                type="button"
                class="info-btn"
                aria-expanded={axesInfoOpen}
                aria-label="About harmony axes"
                title="About harmony axes"
                onclick={() => (axesInfoOpen = !axesInfoOpen)}
              ><i class="fas fa-circle-info" aria-hidden="true"></i></button>
              {#if axesInfoOpen}
                <div class="info-box" role="region" aria-label="Harmony axes">
                  <strong class="info-title">Harmony axes</strong>
                  <p>Each axis owns a hue. Assign a color from the row menu, or drag one onto the axis. The axis moves to that color's hue and the color follows the axis from then on, so applying a harmony rotates every assigned color at once. To unassign, use the row menu, or drag the color off its axis and drop it anywhere else.</p>
                </div>
              {/if}
            </div>
          </div>
          <HarmonyAxesList {activeMode} {selected} oncustomize={() => (activeMode = 'custom')} />
        </div>
      </div>
    </section>
  </div>

  <div class="pane">
    <section id="colors-story" class="block">
      <header class="block-head">
        <h2 class="title">Color Story</h2>
      </header>
      <ColorStory full={fullPalettes} />
    </section>

    <section id="colors-selected" class="block">
      <header class="block-head">
        <h2 class="title">Palette <span class="mode-name">&middot; {selectedSpec.displayLabel ?? selected}</span></h2>
      </header>

      <div class="group">
        <PaletteStepStrip spec={selectedSpec} />
      </div>

      <div class="group">
        <ColorReadouts color={selectedOklch} />
      </div>
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

  .group-head {
    display: flex;
    align-items: center;
    gap: var(--ui-space-6);
  }

  .block {
    display: flex;
    flex-direction: column;
    gap: var(--ui-space-20);
    min-width: 0;
  }

  /* The wheel and its lightness bar are one instrument, and the hero of the
     view. Bind them tighter than the block rhythm and add the difference back
     below, so the controls that follow stop reading at the wheel's weight. */
  .wheel-hero {
    display: flex;
    flex-direction: column;
    gap: var(--ui-space-12);
    margin-bottom: var(--ui-space-12);
    min-width: 0;
  }

  .block-head {
    display: flex;
    flex-direction: column;
    gap: var(--ui-space-2);
  }

  /* Every labeled region on this page carries the same heading, section and
     group alike: the old xs tertiary eyebrows read as captions and got skipped. */
  .title {
    font-size: var(--ui-font-size-2xl);
    font-weight: var(--ui-font-weight-semibold);
    color: var(--ui-text-primary);
    margin: 0;
  }

  .title .mode-name {
    font-weight: var(--ui-font-weight-normal);
    color: var(--ui-text-secondary);
  }

  .group {
    display: flex;
    flex-direction: column;
    gap: var(--ui-space-12);
    min-width: 0;
  }

  /* Swatches, drag gutter, axes. The axes column is the narrower of the two:
     its rows are fixed furniture, while the swatches carry the color. */
  .harmony-cols {
    display: grid;
    grid-template-columns: minmax(0, 1fr) auto minmax(0, 0.62fr);
    gap: var(--ui-space-20);
    align-items: start;
  }

  /* Names the gesture the two columns share, centered on the drag path. */
  .gutter {
    align-self: center;
    display: flex;
    color: var(--ui-text-muted);
    font-size: var(--ui-font-size-md);
  }

  /* Rail anchored to the pane's left edge; the disc centers in whatever is left. */
  .wheel-row {
    display: flex;
    align-items: center;
    gap: var(--ui-space-20);
    min-width: 0;
  }

  .wheel-slot {
    flex: 1 1 auto;
    min-width: 0;
  }

  .mode-rail {
    flex: 0 0 auto;
    display: flex;
    flex-direction: column;
    gap: var(--ui-space-6);
  }

  /* The docked panel's iframe viewport is the panel itself, so this collapse
     fires there long before the standalone page ever gets this narrow. */
  @media (max-width: 720px) {
    .harmony-cols {
      grid-template-columns: minmax(0, 1fr);
    }

    /* Stacked, the drag runs top to bottom. */
    .gutter {
      justify-content: center;
      transform: rotate(90deg);
    }

    /* Below the wheel's minimum the rail is taller than the disc it flanks. */
    .wheel-row {
      flex-direction: column;
      align-items: stretch;
    }

    .mode-rail {
      flex-direction: row;
      flex-wrap: wrap;
      justify-content: center;
    }
  }

  .mode-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 3rem;
    height: 3rem;
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
    margin-left: auto;
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

  .swatch-rows {
    display: flex;
    flex-direction: column;
    gap: var(--ui-space-8);
    min-width: 0;
  }

  .swatch-row {
    display: flex;
    align-items: flex-end;
    gap: var(--ui-space-8);
    border-radius: var(--ui-radius-md);
    outline: 1px solid transparent;
    outline-offset: var(--ui-space-6);
    transition: outline-color var(--ui-transition-fast);
  }

  /* Mirrors the axis row's drop ring: this is where a chip goes to unassign. */
  .swatch-row.drop-target {
    outline-color: var(--ui-text-primary);
  }

  /* Every swatch keeps one width: selection reads in the frame's height alone,
     so nothing in the row shifts sideways as the selection moves. */
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
  }

  /* Same grab idiom as the axes-list chips: these two are one drag surface. */
  .swatch.draggable {
    cursor: grab;
  }

  .swatch.draggable:active {
    cursor: grabbing;
  }

  /* The same frame the axes-list chips wear, holding the color instead of a
     name: one object in two states, wide here and compact once it lands. */
  .frame {
    position: relative;
    display: flex;
    align-items: center;
    gap: var(--ui-space-6);
    height: 2.25rem;
    /* Compensating margin: height + margin-top is constant every frame of the
       magnification, so the row's layout height never dips mid-transition.
       Frame grows upward, label pinned. */
    margin-top: 0.5rem;
    padding: var(--ui-space-4) var(--ui-space-6);
    background: var(--ui-surface-low);
    border: 1px solid var(--ui-border-low);
    border-radius: var(--ui-radius-md);
    transition: border-color var(--ui-transition-fast), height var(--ui-transition-fast), margin-top var(--ui-transition-fast);
  }

  .bar {
    position: relative;
    flex: 1;
    min-width: 0;
    align-self: stretch;
    border-radius: var(--ui-radius-sm);
    background: var(--swatch-fill);
  }

  .swatch.active .frame {
    height: 2.75rem;
    margin-top: 0;
    border-color: var(--ui-border-higher);
    outline: 2px solid var(--ui-text-primary);
    outline-offset: 1px;
  }

  .swatch:hover .frame {
    border-color: var(--ui-border-high);
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

  /* Rides the head of the color bar, opposite the grip: how to send it, and
     where it went. Larger than the row numerals because this is the one place
     the assignment has to read at a glance across six swatches. The badge sits
     on an arbitrary user-chosen fill, so no surface token can keep it legible.
     This scrim is the one literal color the file is allowed. */
  .axis-badge {
    --numeral-size: 1.5rem;
    --numeral-font-size: var(--ui-font-size-sm);
    position: absolute;
    top: 50%;
    left: var(--ui-space-4);
    display: flex;
    transform: translateY(-50%);
    border-radius: var(--ui-radius-full);
    background: rgba(0, 0, 0, 0.72);
    pointer-events: none;
  }

  /* Reads on the frame, not the fill, exactly as the axes-list grip does. */
  .grip {
    flex: none;
    color: var(--ui-text-secondary);
    font-size: var(--ui-font-size-sm);
    line-height: 1;
    letter-spacing: -0.1em;
    pointer-events: none;
    user-select: none;
  }

  .swatch:hover .grip {
    color: var(--ui-text-primary);
  }

  @media (max-width: 1024px) {
    .colors-tab {
      grid-template-columns: minmax(0, 1fr);
      gap: var(--ui-space-24);
    }
  }
</style>
