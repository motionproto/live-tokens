<script lang="ts">
  import Toggle from '../Toggle.svelte';
  import UIInfoPopover from '../UIInfoPopover.svelte';
  import UISegmentedControl from '../UISegmentedControl.svelte';
  import SketchDial from './SketchDial.svelte';
  import { buildMaskUri } from '../../core/sketch/sketchLayer';
  import SketchPreview from './SketchPreview.svelte';
  import { onMount } from 'svelte';
  import UIPillButton from '../UIPillButton.svelte';
  import { SKETCH_PRESETS } from '../../core/sketch/sketchPresets';
  import {
    sketchEnabled,
    sketchPreset,
    sketchSettings,
    selectSketchPreset,
    updateSketchSettings,
    userSketchPresets,
    refreshUserPresets,
    selectUserSketchPreset,
    saveCurrentAsSketchPreset,
    deleteUserSketchPreset,
    USER_PRESET_PREFIX,
  } from '../../core/sketch/sketchStore';

  let s = $derived($sketchSettings);

  let naming = $state(false);
  let draftName = $state('');
  let presetError = $state('');

  onMount(() => {
    // No dev plugin (a built preview, say) means no saved presets. That is a
    // missing door, not a fault worth reporting in the tab.
    refreshUserPresets().catch(() => {});
  });

  function startNaming() {
    draftName = s.label && $sketchPreset.startsWith(USER_PRESET_PREFIX) ? s.label : '';
    presetError = '';
    naming = true;
  }

  async function commitSave(e: SubmitEvent) {
    e.preventDefault();
    try {
      await saveCurrentAsSketchPreset(draftName);
      naming = false;
      draftName = '';
      presetError = '';
    } catch (err) {
      presetError = err instanceof Error ? err.message : 'Save failed';
    }
  }

  async function runPresetAction(action: Promise<unknown>) {
    try {
      await action;
      presetError = '';
    } catch (err) {
      presetError = err instanceof Error ? err.message : 'That did not work';
    }
  }

  const FILL_STYLES = [
    { value: 'solid', label: 'Solid' },
    { value: 'hachure', label: 'Hachure' },
    { value: 'none', label: 'None' },
  ] as const;

  const STROKE_STYLES = [
    { value: 'solid', label: 'Solid' },
    { value: 'dashed', label: 'Dashed' },
  ] as const;

  const PASSES = [
    { value: 'single', label: 'Single' },
    { value: 'double', label: 'Double' },
  ] as const;

  const BLOTCHES = [
    { value: '1', label: 'Smooth' },
    { value: '2', label: '2' },
    { value: '3', label: '3' },
    { value: '4', label: '4' },
    { value: '6', label: '6' },
  ] as const;

  // Drag on the mask preview: horizontal is blob size, vertical is edge hardness.
  const FREQ = { min: 0.002, max: 0.06 };
  const CONTRAST = { min: 0.5, max: 5 };

  const logPos = (v: number, r: { min: number; max: number }) =>
    (Math.log(v / r.min) / Math.log(r.max / r.min)) * 100;
  const logVal = (t: number, r: { min: number; max: number }) =>
    r.min * Math.pow(r.max / r.min, Math.min(1, Math.max(0, t)));

  let dotX = $derived(logPos(s.maskFrequency, FREQ));
  let dotY = $derived(100 - ((s.maskContrast - CONTRAST.min) / (CONTRAST.max - CONTRAST.min)) * 100);

  let dragging = $state(false);

  function drag(e: PointerEvent) {
    const box = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const tx = (e.clientX - box.left) / box.width;
    const ty = (e.clientY - box.top) / box.height;
    updateSketchSettings({
      maskFrequency: Number(logVal(tx, FREQ).toFixed(4)),
      maskContrast: Number(
        (CONTRAST.min + (1 - Math.min(1, Math.max(0, ty))) * (CONTRAST.max - CONTRAST.min)).toFixed(2),
      ),
    });
  }

  function padDown(e: PointerEvent) {
    dragging = true;
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    drag(e);
  }

  function padMove(e: PointerEvent) {
    if (dragging) drag(e);
  }

  // Built from the same function the fill layer uses, and painted at true tile
  // size, so blob scale here is blob scale on the components. A "cover"-scaled
  // preview would lie about what the scale dial does.
  let maskPreview = $derived(buildMaskUri(s));
</script>

<div class="sketch-tab" class:inactive={!$sketchEnabled}>
  <header class="head">
    <div class="head-row">
      <h2 class="section-title">Sketch</h2>
      <div class="switch">
        <Toggle
          label="Sketch mode"
          labelFirst
          checked={$sketchEnabled}
          onchange={(v) => sketchEnabled.set(v)}
        />
        <UIInfoPopover title="Sketch mode">
          <p>
            An effect layer over whatever theme is active. It never reads or writes theme values:
            each component's fill and outline are redrawn on pseudo-elements from the tokens that
            component already owns, then pushed around a shared noise field.
          </p>
          <p>
            While it is on, the effect applies to the page behind this editor as well as to the
            preview here. Turning it off removes every trace of it.
          </p>
        </UIInfoPopover>
      </div>
    </div>

    <div class="presets">
      {#each Object.entries(SKETCH_PRESETS) as [name, preset] (name)}
        <button
          type="button"
          class="preset"
          class:on={$sketchPreset === name}
          onclick={() => selectSketchPreset(name)}
        >{preset.label}</button>
      {/each}
    </div>

    <div class="saved">
      <div class="saved-head">
        <span class="saved-label">Saved</span>
        <UIPillButton size="compact" icon="fa-floppy-disk" onclick={startNaming}>
          Save current
        </UIPillButton>
      </div>

      {#if naming}
        <form class="save-row" onsubmit={commitSave}>
          <!-- svelte-ignore a11y_autofocus -->
          <input
            class="save-name"
            bind:value={draftName}
            placeholder="Preset name"
            aria-label="Preset name"
            autofocus
          />
          <UIPillButton size="compact" variant="primary" type="submit">Save</UIPillButton>
          <UIPillButton size="compact" onclick={() => (naming = false)}>Cancel</UIPillButton>
        </form>
      {/if}

      {#if $userSketchPresets.length > 0}
        <div class="presets">
          {#each $userSketchPresets as saved (saved.fileName)}
            <div class="saved-item" class:on={$sketchPreset === USER_PRESET_PREFIX + saved.fileName}>
              <button
                type="button"
                class="preset"
                onclick={() => runPresetAction(selectUserSketchPreset(saved.fileName))}
              >{saved.name}</button>
              <button
                type="button"
                class="saved-delete"
                title="Delete {saved.name}"
                aria-label="Delete {saved.name}"
                onclick={() => runPresetAction(deleteUserSketchPreset(saved.fileName))}
              ><i class="fas fa-xmark"></i></button>
            </div>
          {/each}
        </div>
      {:else if !naming}
        <p class="saved-empty">Set the dials, then save them here to reuse later.</p>
      {/if}

      {#if presetError}
        <p class="saved-error">{presetError}</p>
      {/if}
    </div>

    <p class="blurb">
      {#if $sketchPreset === ''}
        Adjusted from a preset.
      {:else if $sketchPreset.startsWith(USER_PRESET_PREFIX)}
        {s.blurb || 'Your saved preset.'}
      {:else}
        {s.blurb}
      {/if}
    </p>

    {#if !$sketchEnabled}
      <p class="dormant">Turn Sketch mode on to see these dials take effect.</p>
    {/if}
  </header>

  <div class="body">
    <div class="controls">
      <section class="section" id="sketch-line">
        <h3 class="group-title">Line</h3>
        <p class="group-note">
          The outline traced on top of each component, displaced around the noise field.
        </p>

        <div class="phase">
          <h4>Shape</h4>
          <SketchDial
            label="Displacement" value={s.strokeScale} min={0} max={14} step={0.5}
            readout={s.strokeScale.toFixed(1)}
            hint="How far the outline is pushed around the noise field. Zero traces the component exactly."
            onchange={(v) => updateSketchSettings({ strokeScale: v })}
          />
        </div>

        <div class="phase">
          <h4>Weight</h4>
          <SketchDial
            label="Width" value={s.strokeWidth} min={0} max={6} step={0.25}
            readout={`${s.strokeWidth}px`}
            hint="Thickness of the outline before any variation."
            onchange={(v) => updateSketchSettings({ strokeWidth: v })}
          />
          <SketchDial
            label="Pressure" value={s.pressure} min={0} max={0.7} step={0.05}
            readout={`±${Math.round(s.pressure * 100)}%`}
            hint="Weight variation between components. Each one draws its own thickness off the jitter cycle."
            onchange={(v) => updateSketchSettings({ pressure: v })}
          />
          <SketchDial
            label="Along stroke" value={s.pressureMod} min={0} max={1} step={0.05}
            readout={s.pressureMod.toFixed(2)}
            hint="Thins the line in patches along its length. Zero holds one even weight, high values break it up."
            onchange={(v) => updateSketchSettings({ pressureMod: v })}
          />
        </div>

        <div class="phase">
          <h4>Rendering</h4>
          <SketchDial
            label="Ink pooling" value={s.pooling} min={0} max={6} step={0.1}
            readout={s.pooling.toFixed(1)}
            hint="Blurs the stroke then re-sharpens its alpha. Runs of border that sit close together merge and bulge, which is what a corner is."
            onchange={(v) => updateSketchSettings({ pooling: v })}
          />
          <div class="seg-row" data-hint="Solid draws a continuous outline. Dashed breaks it into strokes.">
            <span class="seg-label">Style</span>
            <UISegmentedControl
              value={s.strokeStyle}
              options={STROKE_STYLES}
              ariaLabel="Outline style"
              onchange={(v) => updateSketchSettings({ strokeStyle: v })}
            />
          </div>
          <div class="seg-row" data-hint="Double draws a second outline on a third seed, so the pair wanders apart.">
            <span class="seg-label">Passes</span>
            <UISegmentedControl
              value={s.doubleStroke ? 'double' : 'single'}
              options={PASSES}
              ariaLabel="Outline passes"
              onchange={(v) => updateSketchSettings({ doubleStroke: v === 'double' })}
            />
          </div>
        </div>
      </section>

      <section class="section" id="sketch-fill">
        <h3 class="group-title">Fill</h3>
        <p class="group-note">
          The surface behind each component's content, displaced on its own seed. It disagrees with
          the outline at the edges, and that disagreement is the whole effect.
        </p>

        <div class="phase">
          <h4>Surface</h4>
          <div class="seg-row" data-hint="Solid paints the component's own theme colour, hachure lays angled shading over it, none leaves it empty.">
            <span class="seg-label">Style</span>
            <UISegmentedControl
              value={s.fillStyle}
              options={FILL_STYLES}
              ariaLabel="Fill style"
              onchange={(v) => updateSketchSettings({ fillStyle: v })}
            />
          </div>
          <SketchDial
            label="Displacement" value={s.fillScale} min={0} max={14} step={0.5}
            readout={s.fillScale.toFixed(1)}
            hint="How far the fill is pushed around the noise field, on a different seed than the outline."
            onchange={(v) => updateSketchSettings({ fillScale: v })}
          />
          <SketchDial
            label="Grow" value={s.fillGrow} min={0} max={0.1} step={0.005}
            readout={`${(s.fillGrow * 100).toFixed(1)}%`}
            hint="Oversizes the fill so rotation does not expose bare corners."
            onchange={(v) => updateSketchSettings({ fillGrow: v })}
          />
        </div>

        <div class="phase">
          <h4>Offset, every instance alike</h4>
          <SketchDial
            label="Offset X" value={s.fillDx} min={-10} max={10} step={1}
            readout={`${s.fillDx}px`}
            hint="Shifts every fill sideways by the same distance. Reads as print misregistration."
            onchange={(v) => updateSketchSettings({ fillDx: v })}
          />
          <SketchDial
            label="Offset Y" value={s.fillDy} min={-10} max={10} step={1}
            readout={`${s.fillDy}px`}
            hint="Shifts every fill vertically by the same distance."
            onchange={(v) => updateSketchSettings({ fillDy: v })}
          />
        </div>

        <div class="phase">
          <h4>Offset, random per instance</h4>
          <SketchDial
            label="Offset X" value={s.jitterX} min={0} max={12} step={0.5}
            readout={`±${s.jitterX}px`}
            hint="Range of sideways offset drawn per component. Values cycle on periods of 7, 11 and 13, so 1001 pass before anything repeats."
            onchange={(v) => updateSketchSettings({ jitterX: v })}
          />
          <SketchDial
            label="Offset Y" value={s.jitterY} min={0} max={12} step={0.5}
            readout={`±${s.jitterY}px`}
            hint="Range of vertical offset drawn per component."
            onchange={(v) => updateSketchSettings({ jitterY: v })}
          />
          <SketchDial
            label="Rotation" value={s.jitterRot} min={0} max={4} step={0.1}
            readout={`±${s.jitterRot.toFixed(1)}°`}
            hint="Range of tilt drawn per component. A fraction of a degree is enough to break the grid."
            onchange={(v) => updateSketchSettings({ jitterRot: v })}
          />
          <SketchDial
            label="Scale" value={s.jitterScale} min={0} max={0.12} step={0.005}
            readout={`±${(s.jitterScale * 100).toFixed(1)}%`}
            hint="Range of size variation drawn per component."
            onchange={(v) => updateSketchSettings({ jitterScale: v })}
          />
        </div>
      </section>

      <section class="section" id="sketch-noise">
        <h3 class="group-title">Noise</h3>
        <p class="group-note">
          Two independent noise sources. The displacement field moves both layers. The fill mask
          erases the fill in patches, and never touches the outline.
        </p>

        <div class="phase">
          <h4>Displacement field</h4>
          <SketchDial
            label="Frequency" value={s.frequency} min={0.004} max={0.08} step={0.002}
            readout={s.frequency.toFixed(3)}
            hint="Wavelength of the wobble. Low gives long lazy curves, high gives tight chatter."
            onchange={(v) => updateSketchSettings({ frequency: v })}
          />
          <SketchDial
            label="Octaves" value={s.octaves} min={1} max={5} step={1}
            readout={`${s.octaves} oct`}
            hint="Layers of finer detail stacked on the base noise. More octaves adds grain to the long curves."
            onchange={(v) => updateSketchSettings({ octaves: v })}
          />
        </div>

        <div class="phase">
          <div class="phase-head">
            <h4>Fill mask</h4>
            <Toggle
              label="On"
              labelFirst
              checked={s.maskOn}
              onchange={(v) => updateSketchSettings({ maskOn: v })}
            />
          </div>

          <figure class="scope" class:muted={!s.maskOn}>
            <div
              class="pad"
              style:background-image={maskPreview}
              style:background-size="{s.maskScale}px {s.maskScale}px"
              onpointerdown={padDown}
              onpointermove={padMove}
              onpointerup={() => (dragging = false)}
              onpointercancel={() => (dragging = false)}
              role="slider"
              tabindex="0"
              aria-label="Blob size and edge hardness"
              aria-valuenow={s.maskFrequency}
            >
              <span class="cross v" style:left="{dotX}%"></span>
              <span class="cross h" style:top="{dotY}%"></span>
              <span class="dot" style:left="{dotX}%" style:top="{dotY}%"></span>
            </div>
            <figcaption>
              <span>&larr; blob size &rarr;</span>
              <span>&uarr; hardness &darr;</span>
            </figcaption>
          </figure>

          <SketchDial
            label="Blob size" value={s.maskFrequency} min={0.002} max={0.06} step={0.001}
            readout={s.maskFrequency.toFixed(3)}
            hint="Wavelength of the mask noise. Low gives broad patches, high gives speckle that reads as dirt."
            onchange={(v) => updateSketchSettings({ maskFrequency: v })}
          />
          <SketchDial
            label="Detail" value={s.maskOctaves} min={1} max={5} step={1}
            readout={`${s.maskOctaves} oct`}
            hint="Layers of finer detail in the mask. One or two gives broad blobs, four or more goes cloudy and stops reading as blotches."
            onchange={(v) => updateSketchSettings({ maskOctaves: v })}
          />
          <div class="seg-row" data-hint="Quantises the mask into discrete levels. Smooth is a gradient, higher counts give hard two-tone blotches.">
            <span class="seg-label">Blotches</span>
            <UISegmentedControl
              value={String(s.maskPosterize)}
              options={BLOTCHES}
              ariaLabel="Mask levels"
              onchange={(v) => updateSketchSettings({ maskPosterize: Number(v) })}
            />
          </div>
          <SketchDial
            label="Edge hardness" value={s.maskContrast} min={0.5} max={5} step={0.1}
            readout={s.maskContrast.toFixed(1)}
            hint="Alpha slope. Higher draws a harder edge between covered and bare."
            onchange={(v) => updateSketchSettings({ maskContrast: v })}
          />
          <SketchDial
            label="Softness" value={s.maskSoftness} min={0} max={6} step={0.5}
            readout={s.maskSoftness.toFixed(1)}
            hint="Feathers the blotch edges."
            onchange={(v) => updateSketchSettings({ maskSoftness: v })}
          />
          <SketchDial
            label="Coverage" value={s.maskFloor} min={0} max={1} step={0.05}
            readout={`${Math.round(s.maskFloor * 100)}%`}
            hint="Alpha floor. 100% keeps the fill everywhere, 0% lets the mask erase it completely."
            onchange={(v) => updateSketchSettings({ maskFloor: v })}
          />
          <SketchDial
            label="Pattern scale" value={s.maskScale} min={150} max={2400} step={50}
            readout={`${s.maskScale}px`}
            hint="Size of one mask tile on the page. Large gives broad patches, small gives speckle."
            onchange={(v) => updateSketchSettings({ maskScale: v })}
          />
        </div>
      </section>
    </div>

    <div class="preview-col" id="sketch-preview">
      <SketchPreview settings={s} enabled={$sketchEnabled} />
    </div>
  </div>
</div>

<style>
  .sketch-tab {
    display: flex;
    flex-direction: column;
    gap: var(--ui-space-24);
  }

  .head {
    display: flex;
    flex-direction: column;
    gap: var(--ui-space-12);
  }

  .head-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: var(--ui-space-16);
    padding-bottom: var(--ui-space-8);
    border-bottom: 2px solid var(--ui-border-high);
  }

  .section-title {
    margin: 0;
    font-size: var(--ui-font-size-2xl);
    font-weight: var(--ui-font-weight-semibold);
    color: var(--ui-text-primary);
  }

  .switch {
    display: flex;
    align-items: center;
    gap: var(--ui-space-8);
  }

  .presets {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(9rem, 1fr));
    gap: var(--ui-space-6);
  }

  .preset {
    padding: var(--ui-space-6) var(--ui-space-10);
    background: var(--ui-surface-low);
    border: 1px solid var(--ui-border-low);
    border-radius: var(--ui-radius-md);
    color: var(--ui-text-tertiary);
    font-family: inherit;
    font-size: var(--ui-font-size-md);
    text-align: left;
    cursor: pointer;
    transition: color var(--ui-transition-fast), background var(--ui-transition-fast);
  }

  .preset:hover {
    color: var(--ui-text-primary);
    background: var(--ui-hover);
  }

  .preset.on {
    background: var(--ui-surface-highest);
    border-color: var(--ui-border-higher);
    color: var(--ui-text-primary);
  }

  .saved {
    display: flex;
    flex-direction: column;
    gap: var(--ui-space-6);
    padding-top: var(--ui-space-8);
    border-top: 1px solid var(--ui-border-low);
  }

  .saved-head {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: var(--ui-space-8);
  }

  .saved-label {
    font-size: var(--ui-font-size-md);
    color: var(--ui-text-tertiary);
  }

  .save-row {
    display: flex;
    align-items: center;
    gap: var(--ui-space-6);
  }

  .save-name {
    flex: 1;
    min-width: 0;
    padding: var(--ui-space-6) var(--ui-space-8);
    background: var(--ui-surface-low);
    border: 1px solid var(--ui-border-low);
    border-radius: var(--ui-radius-md);
    color: var(--ui-text-primary);
    font-family: inherit;
    font-size: var(--ui-font-size-md);
  }

  .save-name:focus-visible {
    outline: 1px solid var(--ui-border-higher);
    outline-offset: 1px;
  }

  /* The row is one control with a delete affordance, so the border lives here
     and the inner .preset button drops its own. */
  .saved-item {
    display: flex;
    align-items: stretch;
    background: var(--ui-surface-low);
    border: 1px solid var(--ui-border-low);
    border-radius: var(--ui-radius-md);
    overflow: hidden;
  }

  .saved-item .preset {
    flex: 1;
    min-width: 0;
    background: none;
    border: none;
    border-radius: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .saved-item.on {
    background: var(--ui-surface-highest);
    border-color: var(--ui-border-higher);
  }

  .saved-item.on .preset {
    color: var(--ui-text-primary);
  }

  .saved-delete {
    padding: 0 var(--ui-space-8);
    background: none;
    border: none;
    color: var(--ui-text-muted);
    font-size: var(--ui-font-size-sm);
    cursor: pointer;
    transition: color var(--ui-transition-fast), background var(--ui-transition-fast);
  }

  .saved-delete:hover {
    background: var(--ui-hover);
    color: var(--ui-text-primary);
  }

  .saved-empty,
  .saved-error {
    margin: 0;
    font-size: var(--ui-font-size-sm);
    color: var(--ui-text-muted);
  }

  .blurb {
    margin: 0;
    min-height: 2.6em;
    padding-left: var(--ui-space-10);
    border-left: 1px solid var(--ui-border-low);
    font-size: var(--ui-font-size-sm);
    line-height: var(--ui-line-height-relaxed);
    color: var(--ui-text-muted);
  }

  .dormant {
    margin: 0;
    font-size: var(--ui-font-size-sm);
    color: var(--ui-text-muted);
  }

  /* Controls scroll, preview stays put. Fine-tuning a dial is worthless if the
     thing it changes has scrolled off screen. */
  .body {
    display: grid;
    grid-template-columns: minmax(0, 22rem) minmax(0, 1fr);
    gap: var(--ui-space-32);
    align-items: start;
  }

  @media (max-width: 1100px) {
    .body {
      grid-template-columns: minmax(0, 1fr);
    }
  }

  .controls {
    display: flex;
    flex-direction: column;
    gap: var(--ui-space-32);
    transition: opacity var(--ui-transition-base);
  }

  .sketch-tab.inactive .controls {
    opacity: 0.55;
  }

  .preview-col {
    position: sticky;
    top: 0;
  }

  @media (max-width: 1100px) {
    .preview-col {
      position: static;
    }
  }

  .section {
    display: flex;
    flex-direction: column;
    gap: var(--ui-space-16);
  }

  .group-title {
    margin: 0;
    font-size: var(--ui-font-size-xl);
    font-weight: var(--ui-font-weight-bold);
    color: var(--ui-text-primary);
  }

  .group-note {
    margin: calc(var(--ui-space-12) * -1) 0 0;
    font-size: var(--ui-font-size-sm);
    line-height: var(--ui-line-height-relaxed);
    color: var(--ui-text-muted);
  }

  /* Pipeline order within a group: shape it, weight it, render it. The dials
     read as one undifferentiated stack when that split is not drawn. */
  .phase {
    display: flex;
    flex-direction: column;
    gap: var(--ui-space-12);
    padding: var(--ui-space-12) var(--ui-space-16);
    background: var(--ui-surface-low);
    border: 1px solid var(--ui-border-low);
    border-radius: var(--ui-radius-md);
  }

  .phase h4 {
    display: flex;
    align-items: center;
    gap: var(--ui-space-12);
    margin: 0;
    font-size: var(--ui-font-size-md);
    font-weight: var(--ui-font-weight-medium);
    color: var(--ui-text-secondary);
  }

  .phase h4::after {
    content: '';
    flex: 1;
    height: 1px;
    background: var(--ui-border-low);
  }

  .phase-head {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: var(--ui-space-12);
  }

  .phase-head h4 {
    flex: 1;
  }

  .seg-row {
    position: relative;
    display: grid;
    grid-template-columns: 1fr auto;
    gap: var(--ui-space-8);
    align-items: center;
  }

  .seg-label {
    font-size: var(--ui-font-size-md);
    color: var(--ui-text-tertiary);
  }

  .seg-row:hover::after {
    content: attr(data-hint);
    position: absolute;
    top: calc(100% + var(--ui-space-2));
    left: 0;
    right: 0;
    z-index: 2;
    padding: var(--ui-space-8) var(--ui-space-10);
    background: var(--ui-surface-high);
    border: 1px solid var(--ui-border-low);
    border-radius: var(--ui-radius-md);
    box-shadow: var(--ui-shadow-md);
    color: var(--ui-text-secondary);
    font-size: var(--ui-font-size-sm);
    line-height: var(--ui-line-height-relaxed);
    pointer-events: none;
  }

  .scope {
    margin: 0;
    display: flex;
    flex-direction: column;
    gap: var(--ui-space-4);
    transition: opacity var(--ui-transition-base);
  }

  .scope.muted {
    opacity: 0.4;
  }

  .pad {
    position: relative;
    height: 7rem;
    border: 1px solid var(--ui-border-low);
    border-radius: var(--ui-radius-sm);
    background-repeat: repeat;
    cursor: crosshair;
    touch-action: none;
  }

  .pad:focus-visible {
    outline: 1px solid var(--ui-text-primary);
    outline-offset: 2px;
  }

  .cross {
    position: absolute;
    background: var(--ui-text-primary);
    opacity: 0.5;
    pointer-events: none;
  }

  .cross.v {
    top: 0;
    bottom: 0;
    width: 1px;
  }

  .cross.h {
    left: 0;
    right: 0;
    height: 1px;
  }

  .dot {
    position: absolute;
    width: 7px;
    height: 7px;
    border-radius: var(--ui-radius-full);
    background: var(--ui-text-primary);
    transform: translate(-50%, -50%);
    pointer-events: none;
  }

  figcaption {
    display: flex;
    justify-content: space-between;
    font-size: var(--ui-font-size-xs);
    color: var(--ui-text-muted);
  }
</style>
