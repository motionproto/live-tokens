<script lang="ts">
  import Toggle from '../Toggle.svelte';
  import UIInfoPopover from '../UIInfoPopover.svelte';
  import UISegmentedControl from '../UISegmentedControl.svelte';
  import SketchDial from './SketchDial.svelte';
  import SketchRange from './SketchRange.svelte';
  import { buildMaskUri } from '../../core/sketch/maskField';
  import SketchPreview from './SketchPreview.svelte';
  import { onMount } from 'svelte';
  import UIPillButton from '../UIPillButton.svelte';
  import UIReveal, { REVEAL_MS } from '../UIReveal.svelte';
  import { scrollSectionIntoView } from '../scrollSection';
  import { SKETCH_PRESETS } from '../../core/sketch/sketchPresets';
  import { openThemeSlug } from '../../core/store/editorConfigStore';
  import {
    sketchEnabled,
    setSketchEnabled,
    sketchOffLook,
    sketchPreset,
    sketchDirty,
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

  interface Props {
    /** The rail's last jump. A fresh object per click, not a bare id, so
        jumping to a section the user has since closed reopens it — with an id
        alone the second click would compare equal and do nothing. */
    sectionJump?: { id: string } | null;
  }

  let { sectionJump = null }: Props = $props();

  let s = $derived($sketchSettings);

  // Save is disabled for the protected Default theme (ThemePanel.svelte);
  // Save As is the gesture actually on offer there, so the off-look copy has
  // to name it instead.
  let activeIsProtected = $derived($openThemeSlug === 'default');

  type SectionKey = 'border' | 'fill' | 'shape' | 'icons' | 'noise';

  const SECTION_KEYS: SectionKey[] = ['border', 'fill', 'shape', 'icons', 'noise'];
  const SHUT = { border: false, fill: false, shape: false, icons: false, noise: false };

  /** All closed to start: twenty-odd dials in one scroll is a wall, and the
      summary on each trigger row answers most questions without opening
      anything. Each section then stands alone, because shaping a look means
      reaching between them — the border's detail against the noise it
      multiplies, the fill's travel against the border's.

      Mutated, never reassigned, so the jump effect below can write into it
      without subscribing to it. */
  let open = $state({ ...SHUT });

  function toggle(key: SectionKey) {
    open[key] = !open[key];
  }

  $effect(() => {
    const id = sectionJump?.id;
    const key = id?.replace('sketch-', '');
    if (!key) return;
    // Tested against the key list, never against `open`: an effect that reads
    // the state it writes re-runs itself until Svelte kills it.
    if (SECTION_KEYS.includes(key as SectionKey)) open[key as SectionKey] = true;
    // Opening the target grows it, so its offsetTop is only right once the
    // reveal has run. One frame past the transition, not during it.
    const settle = setTimeout(() => {
      const el = document.getElementById(id!);
      if (el) scrollSectionIntoView(el);
    }, REVEAL_MS + 20);
    return () => clearTimeout(settle);
  });

  const passLabel = (double: boolean) => (double ? 'double' : 'single');

  /** Every travel dial is peak pixels. Trailing zeros off, so a quarter-step
      dial reads 1.25px and a whole one reads 3px. */
  const px = (v: number) => `${Number(v.toFixed(2))}px`;

  const ROUGHNESS = ['smooth', 'grainy', 'rough'] as const;

  /** A layer's own wavelength: the multiple, and the length it resolves to
      against the shared wave. The ratio is what a preset carries; the pixels
      are what you can picture. */
  const against = (multiple: number) => `${Math.round(s.wobble * multiple)}px`;

  /** The wave's shape, named rather than numbered: 1 is the field as the filter
      makes it, 4 is clipped at both ends. */
  const waveformLabel = (v: number) =>
    v < 1.5 ? 'soft' : v < 2.5 ? 'firm' : v < 3.5 ? 'hard' : 'square';

  const layers = (n: number) => (n === 1 ? '1 layer' : `${n} layers`);

  /** Trigger-row summaries: the settings you would open the section to check. */
  let summary = $derived({
    border: `${s.strokeWidth}px · ${s.strokeStyle} · ${passLabel(s.doubleStroke)}`
      + (s.doubleStroke ? ` ${s.retracePass}` : '')
      + (s.borderWavelength === 1 ? '' : ` · ${against(s.borderWavelength)} wave`)
      + (s.strokeInk < 1 ? ` · ${Math.round(s.strokeInk * 100)}% ink` : ''),
    fill: `${s.fillStyle} · ${s.jitterX === 0 && s.jitterY === 0 && s.jitterRot === 0 ? 'aligned' : `±${s.jitterX}, ${s.jitterY}px`}`
      + (s.maskOn ? ` · ${s.maskBlob}px · ${layers(s.maskOctaves)}` : ' · no mask'),
    shape: s.cornerSpread === 0 && s.cornerTravel === 0
      ? 'true to the theme'
      : `±${s.cornerSpread}px corners · ${px(s.cornerTravel)} travel`,
    icons: s.iconTravel === 0 && !s.iconMaskOn
      ? 'off'
      : `${s.iconTravel === 0 ? 'no travel' : px(s.iconTravel)} · ${s.iconMaskOn ? 'masked' : 'clean'}`,
    noise: `${s.wobble}px · ${ROUGHNESS[s.roughness - 1]}`
      + (s.waveform > 1 ? ` · ${waveformLabel(s.waveform)}` : ''),
  });

  /** Shipped and saved presets are one choice, so they share one radio group:
      picking a saved one clears the shipped selection natively. */
  const PRESET_RADIO_GROUP = 'sketch-preset';

  /** What the readout under the grid says. The selection survives a dial move,
      so the base keeps its name here and the blurb reports the drift instead. */
  let active = $derived(
    $sketchDirty
      ? { name: s.label, blurb: `Modified from ${s.label}. Save it to keep it.` }
      : { name: s.label, blurb: s.blurb || 'Your saved preset.' },
  );

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
    { value: 'hatched', label: 'Hatched' },
  ] as const;

  const STROKE_STYLES = [
    { value: 'solid', label: 'Solid' },
    { value: 'dashed', label: 'Dashed' },
  ] as const;

  const PASSES = [
    { value: 'single', label: 'Single' },
    { value: 'double', label: 'Double' },
  ] as const;

  const RETRACE_PASSES = [
    { value: 'copy', label: 'Copy' },
    { value: 'reseeded', label: 'Reseeded' },
  ] as const;

  const GRAINS = [
    { value: 'fractal', label: 'Cloudy' },
    { value: 'turbulence', label: 'Veined' },
  ] as const;

  // The mask's dials are the stages the field is built in, in the order they
  // run: make the noise, level it, soften it.
  /** Blobs much bigger than a component stop reading as coverage: one patch
      spans a whole button, so it is either untouched or gone entirely. The
      ceiling is a few blobs across a card, which is where it still reads as
      uneven ink. */
  const SIZE = { min: 20, max: 250 };
  const BLUR_MAX = 64;
  /** Squared response. A blur only reads as a different blur while it is small,
      so a linear walk to 64px would spend a tenth of the dial on everything
      legible and the rest sliding between shades of gone. */
  const blurPos = (px: number) => Math.round(Math.sqrt(px / BLUR_MAX) * 100);
  const blurVal = (t: number) => Math.round(BLUR_MAX * (t / 100) ** 2 * 4) / 4;

  /** Tones the field is flattened into, in the order the dial walks them:
      smooth, then coarsening all the way down to two. The stored value is the
      tone count, with 1 for no quantising at all, so the dial carries a position
      into this list rather than the count itself. Ordered by count it ran
      backwards, straight from smooth to the hardest cut and then easing off. */
  const STEP_TONES = [1, 16, 15, 14, 13, 12, 11, 10, 9, 8, 7, 6, 5, 4, 3, 2];

  // Log: the small end of Scale is where a step is legible, and a linear walk
  // would spend most of the dial past the point anything more is visible.
  const logPos = (v: number, r: { min: number; max: number }) =>
    Math.min(100, Math.max(0, Math.round((Math.log(v / r.min) / Math.log(r.max / r.min)) * 100)));
  const logVal = (t: number, r: { min: number; max: number }) =>
    r.min * Math.pow(r.max / r.min, Math.min(1, Math.max(0, t)));

  let scalePos = $derived(logPos(s.maskBlob, SIZE));
  const setScale = (v: number) =>
    updateSketchSettings({ maskBlob: Math.round(logVal(v / 100, SIZE) / 5) * 5 });
  let outputMin = $derived(Math.round(s.maskOutputMin * 100));
  let outputMax = $derived(Math.round(s.maskOutputMax * 100));
  let stepPos = $derived(Math.max(0, STEP_TONES.indexOf(s.maskPosterize)));
  let blurStep = $derived(blurPos(s.maskSoftness));
  const setOutput = (min: number, max: number) =>
    updateSketchSettings({ maskOutputMin: min / 100, maskOutputMax: max / 100 });

  // The finished field, the last stage and the one the components get.
  let maskPreview = $derived(buildMaskUri(s));
</script>

<div class="sketch-tab">
  <header class="head">
    <div class="head-row">
      <h2 class="section-title">Sketch</h2>
      <div class="switch">
        <Toggle
          label="Sketch mode"
          labelFirst
          checked={$sketchEnabled}
          onchange={setSketchEnabled}
        />
        <UIInfoPopover title="Sketch mode">
          <p>
            An effect layer over the active theme. It repaints each component's fill and
            outline from the tokens that component already owns, then pushes them around a
            shared noise field. Save in the Theme panel folds the dials into the open theme.
          </p>
          <p>
            While it is on, the effect applies to the page behind this editor as well as to the
            preview. Turning it off removes every trace of it.
          </p>
        </UIInfoPopover>
      </div>
    </div>

    <div class="picker">
      <div class="readout" aria-live="polite">
        <span class="readout-name">{active.name}</span>
        <p class="readout-blurb">{active.blurb}</p>
        {#if $sketchOffLook}
          {#if $sketchEnabled}
            <p class="readout-off-look">
              {#if activeIsProtected}
                Motion Proto is read-only, and these dials are ahead of it. Use Save As in the
                Theme panel to keep them in a new theme.
              {:else}
                These dials are ahead of the saved theme. Save it in the Theme panel to fold them
                in.
              {/if}
            </p>
          {:else}
            <p class="readout-off-look">
              The theme carries a sketch layer this page is not painting. Saving now would drop
              it.
            </p>
          {/if}
        {/if}
      </div>

      <div class="presets">
        {#each Object.entries(SKETCH_PRESETS) as [name, preset] (name)}
          <label class="preset">
            <input
              type="radio"
              name={PRESET_RADIO_GROUP}
              value={name}
              checked={$sketchPreset === name}
              onchange={() => selectSketchPreset(name)}
            />
            <span class="preset-name">{preset.label}</span>
          </label>
        {/each}
      </div>

      <div class="saved">
        <div class="saved-head">
          <span class="band-label">Saved</span>
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
              <div class="saved-item">
                <label class="preset">
                  <input
                    type="radio"
                    name={PRESET_RADIO_GROUP}
                    value={USER_PRESET_PREFIX + saved.fileName}
                    checked={$sketchPreset === USER_PRESET_PREFIX + saved.fileName}
                    onchange={() => runPresetAction(selectUserSketchPreset(saved.fileName))}
                  />
                  <span class="preset-name">{saved.name}</span>
                </label>
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
        {/if}

        {#if presetError}
          <p class="saved-error">{presetError}</p>
        {/if}
      </div>
    </div>

    {#if !$sketchEnabled}
      <p class="dormant">Turn Sketch mode on to see these dials take effect.</p>
    {/if}
  </header>

  <div class="body">
    <div class="controls">
      <section class="section" id="sketch-border">
        <button
          type="button"
          class="sec-head"
          class:expanded={open.border}
          aria-expanded={open.border}
          aria-controls="sketch-border-body"
          onclick={() => toggle('border')}
        >
          <i class="fas fa-chevron-right chevron"></i>
          <h3 class="group-title">Border</h3>
          <span class="sec-summary">{summary.border}</span>
        </button>
        <UIReveal open={open.border}>
        <div id="sketch-border-body" class="sec-body">
        <p class="group-note">
          Redraws the component's border along the noise field. Width, style and colour
          still come from the theme.
        </p>

        <div class="phase">
          <h4>Shape</h4>
          <SketchDial
            label="Magnitude" value={s.strokeTravel} min={0} max={7} step={0.25}
            readout={px(s.strokeTravel)}
            hint="Furthest the outline moves. Zero traces the component exactly."
            onchange={(v) => updateSketchSettings({ strokeTravel: v })}
          />
          <SketchDial
            label="Wavelength" value={s.borderWavelength} min={0.25} max={2.5} step={0.05}
            readout={against(s.borderWavelength)}
            hint="The outline's wavelength, as a multiple of the shared one under Noise. Below 1 it chatters over the fill; above 1 it draws longer curves."
            onchange={(v) => updateSketchSettings({ borderWavelength: v })}
          />
        </div>

        <div class="phase">
          <h4>Weight</h4>
          <SketchDial
            label="Width" value={s.strokeWidth} min={0} max={6} step={0.25}
            readout={`${s.strokeWidth}px`}
            hint="Outline thickness, before per-component variation."
            onchange={(v) => updateSketchSettings({ strokeWidth: v })}
          />
          <SketchDial
            label="Ink" value={s.strokeInk} min={0.2} max={1} step={0.02}
            readout={`${Math.round(s.strokeInk * 100)}%`}
            hint="Stroke opacity. Below full, the second pass shows through the first and the overlap darkens."
            onchange={(v) => updateSketchSettings({ strokeInk: v })}
          />
          <SketchDial
            label="Pressure" value={s.pressure} min={0} max={0.7} step={0.05}
            readout={`±${Math.round(s.pressure * 100)}%`}
            hint="Range of stroke weight variation between components."
            onchange={(v) => updateSketchSettings({ pressure: v })}
          />
          <SketchDial
            label="Along stroke" value={s.pressureMod} min={0} max={1} step={0.05}
            readout={s.pressureMod.toFixed(2)}
            hint="Thins the line in patches along its length. Zero holds an even weight; high values break it up."
            onchange={(v) => updateSketchSettings({ pressureMod: v })}
          />
        </div>

        <div class="phase">
          <h4>Rendering</h4>
          <SketchDial
            label="Ink pooling" value={s.pooling} min={0} max={6} step={0.1}
            readout={s.pooling.toFixed(1)}
            hint="Merges runs of outline that sit close together, so corners thicken where the line meets itself."
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
          <div class="seg-row" data-hint="Double draws the outline twice.">
            <span class="seg-label">Passes</span>
            <UISegmentedControl
              value={s.doubleStroke ? 'double' : 'single'}
              options={PASSES}
              ariaLabel="Outline passes"
              onchange={(v) => updateSketchSettings({ doubleStroke: v === 'double' })}
            />
          </div>
          {#if s.doubleStroke}
            <div class="seg-row" data-hint="Copy repeats the line already drawn, offset. Reseeded draws it again on a new seed, so the two part along their length.">
              <span class="seg-label">Second pass</span>
              <UISegmentedControl
                value={s.retracePass}
                options={RETRACE_PASSES}
                ariaLabel="Second pass"
                onchange={(v) => updateSketchSettings({ retracePass: v })}
              />
            </div>
            <SketchDial
              label="Pass offset" value={s.retraceOffset} min={0} max={8} step={0.1}
              readout={`±${px(s.retraceOffset)}`}
              hint="How far the second pass lands from the first. Each component takes its own distance inside the range; at zero the passes overlap and only darken the line."
              onchange={(v) => updateSketchSettings({ retraceOffset: v })}
            />
          {/if}
        </div>
        </div>
        </UIReveal>
      </section>

      <section class="section" id="sketch-fill">
        <button
          type="button"
          class="sec-head"
          class:expanded={open.fill}
          aria-expanded={open.fill}
          aria-controls="sketch-fill-body"
          onclick={() => toggle('fill')}
        >
          <i class="fas fa-chevron-right chevron"></i>
          <h3 class="group-title">Fill</h3>
          <span class="sec-summary">{summary.fill}</span>
        </button>
        <UIReveal open={open.fill}>
        <div id="sketch-fill-body" class="sec-body">
        <p class="group-note">
          Redraws the surface behind the content on its own seed, so its edges part from
          the outline.
        </p>
        <p class="group-note">
          Rules and dividers follow these dials, not the Line ones. They are short boxes,
          so the effect draws them as fills.
        </p>

        <div class="phase">
          <h4>Surface</h4>
          <div class="seg-row" data-hint="Solid paints the theme colour. Hatched lays angled shading over it.">
            <span class="seg-label">Style</span>
            <UISegmentedControl
              value={s.fillStyle}
              options={FILL_STYLES}
              ariaLabel="Fill style"
              onchange={(v) => updateSketchSettings({ fillStyle: v })}
            />
          </div>
          {#if s.fillStyle === 'hatched'}
            <SketchDial
              label="Hatch opacity" value={s.hatchInk} min={0.1} max={1} step={0.05}
              readout={`${Math.round(s.hatchInk * 100)}%`}
              hint="Opacity of the hatch lines. Low reads as pencil shading; full draws them in the outline colour."
              onchange={(v) => updateSketchSettings({ hatchInk: v })}
            />
          {/if}
          <SketchDial
            label="Magnitude" value={s.fillTravel} min={0} max={7} step={0.25}
            readout={px(s.fillTravel)}
            hint="Furthest the fill moves. Runs on a different seed from the outline."
            onchange={(v) => updateSketchSettings({ fillTravel: v })}
          />
        </div>

        <div class="phase">
          <h4>Offset per instance</h4>
          <SketchDial
            label="Offset X" value={s.jitterX} min={0} max={12} step={0.5}
            readout={`±${s.jitterX}px`}
            hint="Range of sideways offset per component."
            onchange={(v) => updateSketchSettings({ jitterX: v })}
          />
          <SketchDial
            label="Offset Y" value={s.jitterY} min={0} max={12} step={0.5}
            readout={`±${s.jitterY}px`}
            hint="Range of vertical offset per component."
            onchange={(v) => updateSketchSettings({ jitterY: v })}
          />
          <SketchDial
            label="Rotation" value={s.jitterRot} min={0} max={4} step={0.1}
            readout={`±${s.jitterRot.toFixed(1)}°`}
            hint="Range of tilt per component. A fraction of a degree is enough to break the grid."
            onchange={(v) => updateSketchSettings({ jitterRot: v })}
          />
          <SketchDial
            label="Scale" value={s.jitterScale} min={0} max={0.12} step={0.005}
            readout={`+${(s.jitterScale * 100).toFixed(1)}%`}
            hint="Oversize per component. Every fill grows a little, so a tilted one never exposes a bare corner."
            onchange={(v) => updateSketchSettings({ jitterScale: v })}
          />
        </div>

        <div class="phase">
          <div class="phase-head">
            <h4>Ink coverage</h4>
            <Toggle
              label="On"
              labelFirst
              checked={s.maskOn}
              onchange={(v) => updateSketchSettings({ maskOn: v })}
            />
          </div>

          <figure class="scope" class:muted={!s.maskOn}>
            <div class="field" style:mask-image={maskPreview}></div>
          </figure>

          <h5>Noise</h5>
          <div class="seg-row" data-hint="Cloudy is soft blotches. Veined is marbled.">
            <span class="seg-label">Type</span>
            <UISegmentedControl
              value={s.maskGrain}
              options={GRAINS}
              ariaLabel="Noise type"
              onchange={(v) => updateSketchSettings({ maskGrain: v as 'fractal' | 'turbulence' })}
            />
          </div>
          <SketchDial
            label="Scale" value={scalePos} min={0} max={100} step={1}
            readout={`${s.maskBlob}px`}
            ends={['speckle', 'patches']}
            hint="Blob size on the page. Small reads as speckle, large as patches."
            onchange={setScale}
          />
          <SketchDial
            label="Detail" value={s.maskOctaves} min={1} max={4} step={1}
            readout={layers(s.maskOctaves)}
            ends={['one wave', 'grain']}
            hint="Finer layers over the first, each half the size. One gives smooth blobs; four goes cloudy."
            onchange={(v) => updateSketchSettings({ maskOctaves: v })}
          />

          <h5>Levels</h5>
          <p class="group-note">
            The field runs black to white before these apply. Output states the
            range of ink the mask paints between, 0 bare to 100 whole, and the
            whole field is squeezed into it: raise the low handle and the
            darkest patch rises with it, drop the high handle and the densest
            falls. Nothing is ever cut off at a handle.
          </p>
          <SketchRange
            label="Output" low={outputMin} high={outputMax} min={0} max={100} step={1}
            gap={0}
            readout={`${outputMin}–${outputMax}%`}
            hint="Bring the handles together for a flat wash, open them for strong blotches. Move the pair to ink more or less of the fill."
            onchange={setOutput}
          />
          <SketchDial
            label="Steps" value={stepPos} min={0} max={STEP_TONES.length - 1} step={1}
            readout={s.maskPosterize > 1 ? `${s.maskPosterize} tones` : 'smooth'}
            ends={['smooth', 'two tones']}
            hint="Flattens the field into this many tones. Fewer tones give harder ink, down to a two-tone cut."
            onchange={(v) => updateSketchSettings({ maskPosterize: STEP_TONES[v] })}
          />

          <h5>Blur</h5>
          <SketchDial
            label="Blur" value={blurStep} min={0} max={100} step={1}
            readout={px(s.maskSoftness)}
            ends={['hard', 'clouded']}
            hint="Softens the blotch edges. Few tones with a little blur give a hard blotch with a soft rim; wound right up the field goes to weather."
            onchange={(v) => updateSketchSettings({ maskSoftness: blurVal(v) })}
          />
        </div>
        </div>
        </UIReveal>
      </section>

      <section class="section" id="sketch-shape">
        <button
          type="button"
          class="sec-head"
          class:expanded={open.shape}
          aria-expanded={open.shape}
          aria-controls="sketch-shape-body"
          onclick={() => toggle('shape')}
        >
          <i class="fas fa-chevron-right chevron"></i>
          <h3 class="group-title">Shape</h3>
          <span class="sec-summary">{summary.shape}</span>
        </button>
        <UIReveal open={open.shape}>
        <div id="sketch-shape-body" class="sec-body">
        <p class="group-note">
          The box both layers are drawn around. Displacement wobbles the edges but leaves four
          matching corners; these two dials change the shape itself. Fill and outline take the
          same one.
        </p>

        <div class="phase">
          <h4>Corners</h4>
          <SketchDial
            label="Spread" value={s.cornerSpread} min={0} max={32} step={1}
            readout={`±${s.cornerSpread}px`}
            hint="Rounding added to each corner on top of the theme's radius. Each corner takes between half the dial and all of it, so the four differ."
            onchange={(v) => updateSketchSettings({ cornerSpread: v })}
          />
        </div>

        <div class="phase">
          <h4>Quadrangle</h4>
          <SketchDial
            label="Corner travel" value={s.cornerTravel} min={0} max={22} step={0.5}
            readout={px(s.cornerTravel)}
            hint="Pushes each corner a different way, so no two sides stay parallel. Every component moves the same number of pixels."
            onchange={(v) => updateSketchSettings({ cornerTravel: v })}
          />
        </div>
        </div>
        </UIReveal>
      </section>

      <section class="section" id="sketch-icons">
        <button
          type="button"
          class="sec-head"
          class:expanded={open.icons}
          aria-expanded={open.icons}
          aria-controls="sketch-icons-body"
          onclick={() => toggle('icons')}
        >
          <i class="fas fa-chevron-right chevron"></i>
          <h3 class="group-title">Icons and SVG</h3>
          <span class="sec-summary">{summary.icons}</span>
        </button>
        <UIReveal open={open.icons}>
        <div id="sketch-icons-body" class="sec-body">
        <p class="group-note">
          Icons take the displacement and the mask directly, having no box to redraw. Both dials
          are separate from Border and Noise, because a glyph needs more travel before the wobble
          reads. Body text is never filtered. A single element can go crisp or take a softened
          pass of its own; see the Sketch mode chapter in Docs.
        </p>

        <div class="phase">
          <h4>Displacement</h4>
          <SketchDial
            label="Magnitude" value={s.iconTravel} min={0} max={4} step={0.25}
            readout={s.iconTravel === 0 ? 'off' : px(s.iconTravel)}
            hint="Furthest the glyph outline moves. Zero leaves icons crisp."
            onchange={(v) => updateSketchSettings({ iconTravel: v })}
          />
          <SketchDial
            label="Wavelength" value={s.iconWavelength} min={0.25} max={2.5} step={0.05}
            readout={against(s.iconWavelength)}
            hint="The icon field's wavelength, as a multiple of the shared one under Noise. Above 1 bends the whole glyph; below half it ripples the outline."
            onchange={(v) => updateSketchSettings({ iconWavelength: v })}
          />
        </div>

        <div class="phase">
          <h4>Ink coverage</h4>
          <div class="seg-row switch" data-hint="Erases the glyph in patches, using the same field as the fill. Switched separately from the fill's.">
            <Toggle
              label="Mask"
              labelFirst
              checked={s.iconMaskOn}
              onchange={(v) => updateSketchSettings({ iconMaskOn: v })}
            />
          </div>
          <SketchDial
            label="Blotch size" value={s.iconMaskScale} min={0.5} max={5} step={0.1}
            readout={`${Math.round(s.iconMaskScale * 100)}% of glyph`}
            hint="Mask tile size, as a share of the glyph rather than a px size. At 100% every glyph gets one period of the field whatever its size. Below that the field repeats inside the glyph and the blotches get finer; above it a glyph reads part of one blotch, which thins the whole glyph unevenly."
            onchange={(v) => updateSketchSettings({ iconMaskScale: v })}
          />
        </div>
        </div>
        </UIReveal>
      </section>

      <section class="section" id="sketch-noise">
        <button
          type="button"
          class="sec-head"
          class:expanded={open.noise}
          aria-expanded={open.noise}
          aria-controls="sketch-noise-body"
          onclick={() => toggle('noise')}
        >
          <i class="fas fa-chevron-right chevron"></i>
          <h3 class="group-title">Noise</h3>
          <span class="sec-summary">{summary.noise}</span>
        </button>
        <UIReveal open={open.noise}>
        <div id="sketch-noise-body" class="sec-body">
        <p class="group-note">
          The wave every layer is pushed around. Length and shape are set here and shared;
          magnitude belongs to each layer, under Border, Fill and Icons. Fill and outline read it
          on separate seeds. It moves edges only: ink coverage is separate noise, under Fill.
        </p>

        <div class="phase">
          <h4>Displacement field</h4>
          <SketchDial
            label="Wavelength" value={s.wobble} min={10} max={240} step={2}
            readout={`${s.wobble}px`}
            hint="Length of one wobble. At 20 a button's side carries two full waves; at 200 a card leans on one curve."
            onchange={(v) => updateSketchSettings({ wobble: v })}
          />
          <SketchDial
            label="Roughness" value={s.roughness} min={1} max={3} step={1}
            readout={ROUGHNESS[s.roughness - 1]}
            hint="Finer waves over the main one, each at half the length and magnitude. One is a clean undulation; three reads as paper grain."
            onchange={(v) => updateSketchSettings({ roughness: v })}
          />
          <SketchDial
            label="Waveform" value={s.waveform} min={1} max={4} step={0.1}
            readout={waveformLabel(s.waveform)}
            hint="How much of an edge reaches full magnitude. Soft moves the edge only where the wave peaks; square moves nearly all of it."
            onchange={(v) => updateSketchSettings({ waveform: v })}
          />
        </div>
        </div>
        </UIReveal>
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


  /* Grid, saved band and readout are one control: which preset is on, and what
     that preset is. Splitting them left the description reading as a stray
     caption under the tab. */
  .picker {
    display: flex;
    flex-direction: column;
    gap: var(--ui-space-8);
    padding: var(--ui-space-10);
    background: var(--ui-surface-lower);
    border: 1px solid var(--ui-border-low);
    border-radius: var(--ui-radius-lg);
  }

  .presets {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(9rem, 1fr));
    gap: var(--ui-space-6);
  }

  .preset {
    position: relative;
    display: flex;
    align-items: center;
    gap: var(--ui-space-8);
    padding: var(--ui-space-6) var(--ui-space-10);
    background: var(--ui-surface-low);
    border: 1px solid var(--ui-border-low);
    border-radius: var(--ui-radius-md);
    color: var(--ui-text-tertiary);
    font-family: inherit;
    font-size: var(--ui-font-size-md);
    text-align: left;
    cursor: pointer;
    user-select: none;
    transition: color var(--ui-transition-fast), background var(--ui-transition-fast),
      border-color var(--ui-transition-fast);
  }

  .preset input {
    position: absolute;
    width: 1px;
    height: 1px;
    margin: 0;
    opacity: 0;
    pointer-events: none;
  }

  .preset::before {
    content: '';
    flex: none;
    width: 0.75rem;
    height: 0.75rem;
    border: 1px solid var(--ui-border-high);
    border-radius: var(--ui-radius-full);
    transition: border-color var(--ui-transition-fast), background var(--ui-transition-fast);
  }

  .preset-name {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .preset:hover {
    color: var(--ui-text-primary);
    background: var(--ui-hover);
  }

  .preset:hover::before {
    border-color: var(--ui-text-primary);
  }

  .preset:has(input:checked) {
    background: var(--ui-surface-highest);
    border-color: var(--ui-border-higher);
    color: var(--ui-text-primary);
  }

  .preset:has(input:checked)::before {
    border-color: var(--ui-text-primary);
    background: radial-gradient(circle, var(--ui-text-primary) 0 45%, transparent 46%);
  }

  /* Inset, not an outline: the saved row clips its children to its radius. */
  .preset:has(input:focus-visible) {
    box-shadow: inset 0 0 0 2px var(--ui-border-higher);
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
    min-height: 1.75rem;
  }

  .band-label {
    font-size: var(--ui-font-size-xs);
    font-weight: var(--ui-font-weight-semibold);
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
     and the inner .preset label drops its own. */
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
  }

  .saved-item:has(input:checked) {
    background: var(--ui-surface-highest);
    border-color: var(--ui-border-higher);
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

  .saved-error {
    margin: 0;
    font-size: var(--ui-font-size-sm);
    color: var(--ui-text-secondary);
  }

  /* The selection names itself at the head of the card, so the grid below reads
     as the choices for it rather than as eight loose buttons. */
  .readout-name {
    display: block;
    font-size: var(--ui-font-size-lg);
    font-weight: var(--ui-font-weight-semibold);
    color: var(--ui-text-primary);
  }

  .readout-blurb {
    margin: var(--ui-space-2) 0 0;
    min-height: 2.6em;
    font-size: var(--ui-font-size-md);
    line-height: var(--ui-line-height-relaxed);
    color: var(--ui-text-secondary);
  }

  .readout-off-look {
    margin: var(--ui-space-2) 0 0;
    font-size: var(--ui-font-size-sm);
    font-weight: var(--ui-font-weight-medium);
    color: var(--ui-text-primary);
  }

  .dormant {
    margin: 0;
    font-size: var(--ui-font-size-sm);
    color: var(--ui-text-secondary);
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

  /* Trigger row: chevron, title, and the summary that answers most questions
     without opening the section. */
  .sec-head {
    display: flex;
    align-items: baseline;
    gap: var(--ui-space-8);
    width: 100%;
    padding: 0;
    background: none;
    border: 0;
    color: inherit;
    font: inherit;
    text-align: left;
    cursor: pointer;
  }

  .sec-head .chevron {
    align-self: center;
    width: 0.75rem;
    font-size: 0.625rem;
    color: var(--ui-text-secondary);
    transition: transform var(--ui-transition-fast);
  }

  .sec-head.expanded .chevron {
    transform: rotate(90deg);
  }

  .sec-head:hover .chevron,
  .sec-head:hover .sec-summary {
    color: var(--ui-text-primary);
  }

  .sec-summary {
    font-size: var(--ui-font-size-sm);
    color: var(--ui-text-secondary);
    transition: color var(--ui-transition-fast);
  }

  .sec-body {
    display: flex;
    flex-direction: column;
    gap: var(--ui-space-16);
    padding-top: var(--ui-space-8);
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
    color: var(--ui-text-secondary);
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
    color: var(--ui-text-primary);
  }

  .phase h4::after {
    content: '';
    flex: 1;
    height: 1px;
    background: var(--ui-border-high);
  }

  .phase h5 {
    margin: var(--ui-space-8) 0 0;
    font-size: var(--ui-font-size-xs);
    font-weight: var(--ui-font-weight-medium);
    letter-spacing: 0.06em;
    text-transform: uppercase;
    color: var(--ui-text-tertiary);
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
    color: var(--ui-text-primary);
  }

  /* An on/off row is one switch, and the switch sits where a segmented control
     would: hard against the right edge, with its label reading as a row label
     rather than as the switch's own caption. */
  .seg-row.switch :global(.toggle) {
    grid-column: 1 / -1;
    width: 100%;
    justify-content: space-between;
  }

  .seg-row.switch :global(.toggle-label) {
    color: var(--ui-text-primary);
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

  /* The ground the field is cut out of, so a masked-away pixel reads as black
     rather than as the panel. */
  .scope {
    margin: 0;
    border: 1px solid var(--ui-border-low);
    border-radius: var(--ui-radius-sm);
    background: var(--ui-surface-lowest);
    overflow: hidden;
    transition: opacity var(--ui-transition-base);
  }

  .scope.muted {
    opacity: 0.4;
  }

  /* One readout of the finished field: the whole tile, repeated across the
     strip, white on that ground so 0 reads as black and 100 as white. Neither
     was readable before. The field was painted at page-px size, which showed a
     crop off the top of the tile that never reached the bright end, over an ink
     colour that could not have painted it if it had. */
  .field {
    height: 7rem;
    background: var(--ui-text-primary);
    mask-mode: luminance;
    mask-repeat: repeat;
    mask-size: contain;
  }

</style>
