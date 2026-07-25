<script lang="ts">
  import { editorState } from '../../core/store/editorStore';
  import { oklchToHexClamped } from '../../core/palettes/oklch';
  import { palettesToVars, PALETTE_SPECS, type PaletteSpec } from '../../core/palettes/paletteDerivation';
  import { defaultPaletteConfig } from '../palette/paletteMath';
  import { contrastRatio } from '../../core/palettes/contrast';
  import { recommendNeutralText } from '../../core/palettes/recommendText';
  import { applySuggestedNeutralText } from './paletteBaseColor';
  import UIPillButton from '../UIPillButton.svelte';
  import type { PaletteConfig } from '../../core/themes/themeTypes';

  // 60-30-10 as an area composition: the background surface is the dominant 60%
  // field (the page), and Brand/Accent/Special are the tones shown against it.
  // Shares are flex-grow weights, not exact percentages.
  const TONES = [
    { label: 'Brand', ns: 'brand', share: 30 },
    { label: 'Accent', ns: 'accent', share: 8 },
    { label: 'Special', ns: 'special', share: 2 },
  ] as const;

  const FUNCTIONAL = [
    { label: 'Info', ns: 'info' },
    { label: 'Success', ns: 'success' },
    { label: 'Warning', ns: 'warning' },
    { label: 'Danger', ns: 'danger' },
  ] as const;

  // The story is a seed-composition preview: every FILL is a family's base
  // color — exactly what the wheel dot and swatch show — so it tracks edits
  // 1:1. Derived --surface-* tokens deliberately do not appear here: their
  // lightness is curve-owned, which decouples the story from the wheel and
  // reads as broken.
  const SPEC_BY_LABEL: Record<string, PaletteSpec> = Object.fromEntries(PALETTE_SPECS.map((s) => [s.label, s]));

  function seedHex(label: string): string {
    const { l, c, h } = $editorState.palettes[label]?.baseColor ?? SPEC_BY_LABEL[label].initialColor;
    return oklchToHexClamped(l, c, h);
  }

  // Text still renders from this store-derived map (text derivation tracks the
  // seed), never from the ambient :root variables — those stay at vendored
  // defaults for families a loaded theme doesn't configure, so a story bound
  // to them silently goes static.
  let full = $derived.by(() => {
    const map: Record<string, PaletteConfig> = {};
    for (const spec of PALETTE_SPECS) {
      map[spec.label] =
        $editorState.palettes[spec.label] ??
        defaultPaletteConfig({ baseColor: spec.initialColor, neutral: spec.neutral ?? false });
    }
    return map;
  });

  let vars = $derived(palettesToVars(full));
  let useBlackWhite = $state(false);
  let rec = $derived(recommendNeutralText(full, undefined, useBlackWhite));
  let partialCoverage = $derived(rec.suggestions.filter((s) => !s.current.coverage.full));

  // Shadow the consumed text variables locally with the store-derived values;
  // the page field is the Background family's SEED, not its derived page step.
  let storyVars = $derived(
    ['--text-primary', '--text-secondary', '--text-tertiary']
      .concat([...TONES, ...FUNCTIONAL].map((t) => `--text-${t.ns}`))
      .filter((name) => vars[name] !== undefined)
      .map((name) => `${name}: ${vars[name]}`)
      .concat(`--page-bg: ${seedHex('Background')}`)
      .join('; '),
  );

  // Ratios are measured against the DISPLAYED field — the Background seed —
  // so the numbers always describe what the story shows.
  function ratioOnBg(textVar: string): number | null {
    const text = vars[textVar];
    return typeof text === 'string' ? contrastRatio(text, seedHex('Background')) : null;
  }

  // Floor, don't round: the readout must never overstate a contrast ratio.
  function fmt(r: number | null): string | null {
    return r === null ? null : `${(Math.floor(r * 10) / 10).toFixed(1)}:1`;
  }

  let bgRatio = $derived(ratioOnBg('--text-primary'));
</script>

<div class="story" style={storyVars}>
  <div class="field">
    <div class="field-head">
      <span class="field-label">Background</span>
      {#if fmt(bgRatio)}<span class="ratio">{fmt(bgRatio)}</span>{/if}
    </div>
    <p class="body">The dominant surface. Body text sits here.</p>
    <p class="secondary">
      Secondary text follows the same field.
      {#if fmt(ratioOnBg('--text-secondary'))}<span class="ratio">{fmt(ratioOnBg('--text-secondary'))}</span>{/if}
    </p>
    <p class="tertiary">
      Tertiary text steps back once more.
      {#if fmt(ratioOnBg('--text-tertiary'))}<span class="ratio">{fmt(ratioOnBg('--text-tertiary'))}</span>{/if}
    </p>

    <!-- Always rendered: toggling "Use black and white" changes the
         suggestion, so the toggle must stay reachable even when the current
         values already match. -->
    <div class="suggest-row">
      <span class="suggest-label">Suggested</span>
      {#each rec.suggestions as s (s.step)}
        <span class="suggest-entry" class:dim={!s.differs}>
          <span class="fn-dot" style:--dot={s.suggested.hex}></span>
          <span class="suggest-step">{s.step}</span>
          <span class="ratio">{fmt(contrastRatio(s.suggested.hex, seedHex('Background')))}</span>
        </span>
      {/each}
      <label class="bw-toggle" title="Anchor the suggestion at pure white or black instead of the softened extreme">
        <input type="checkbox" bind:checked={useBlackWhite} />
        <span>Use black and white</span>
      </label>
      {#if rec.anyDiffers}
        <UIPillButton
          icon="fa-arrow-down-short-wide"
          title="Anchor on primary and step secondary/tertiary down by even lightness drops, floored at WCAG AA (one undo)"
          onclick={() => applySuggestedNeutralText(useBlackWhite)}
        >
          Use suggested
        </UIPillButton>
      {/if}
    </div>

    {#if partialCoverage.length > 0}
      <div
        class="coverage-alert"
        title="WCAG AA (4.5:1) coverage across the neutral surface steps. Informational, nothing is blocked."
      >
        <i class="fa-solid fa-triangle-exclamation"></i>
        <span>
          AA reach: {partialCoverage
            .map((s) => `${s.step} ${s.current.coverage.cleared}/${s.current.coverage.total} surfaces`)
            .join(' · ')}
        </span>
      </div>
    {/if}

    <div class="functional-row">
      {#each FUNCTIONAL as fn (fn.ns)}
        {@const r = fmt(ratioOnBg(`--text-${fn.ns}`))}
        <span class="fn-chip">
          <span class="fn-dot" style:--dot={seedHex(fn.label)}></span>
          <span class="fn-label" style:color="var(--text-{fn.ns})">{fn.label}</span>
          {#if r}<span class="ratio">{r}</span>{/if}
        </span>
      {/each}
    </div>
  </div>

  <div class="tones">
    {#each TONES as tone (tone.ns)}
      {@const r = fmt(ratioOnBg(`--text-${tone.ns}`))}
      <div class="tone" style:--tone-fill={seedHex(tone.label)} style:--tone-share={tone.share}>
        <span class="tone-pill" style:color="var(--text-{tone.ns})">
          <span class="tone-name">{tone.label}</span>
          {#if r}<span class="ratio">{r}</span>{/if}
        </span>
      </div>
    {/each}
  </div>
</div>

<style>
  /* The story frame IS the 60% background surface; the tones are the accents
     shown against it. The neutral field shows through as the dominant page. */
  .story {
    display: flex;
    flex-direction: column;
    gap: var(--ui-space-8);
    min-height: 30rem;
    padding: var(--ui-space-12);
    border-radius: var(--ui-radius-md);
    border: 1px solid var(--ui-border-low);
    background: var(--page-bg);
  }

  /* Transparent: the background surface reads directly, no card over it. */
  .field {
    flex-grow: 60;
    flex-basis: 0;
    display: flex;
    flex-direction: column;
    gap: var(--ui-space-4);
    min-height: 0;
    padding: var(--ui-space-8) var(--ui-space-12);
    color: var(--text-primary);
  }

  .field-head {
    display: flex;
    align-items: baseline;
    justify-content: space-between;
    gap: var(--ui-space-8);
  }

  .field-label {
    font-size: var(--ui-font-size-sm);
    font-weight: var(--ui-font-weight-semibold);
  }

  .body {
    margin: 0;
    font-size: var(--ui-font-size-sm);
    color: var(--text-primary);
  }

  .secondary {
    margin: 0;
    font-size: var(--ui-font-size-xs);
    color: var(--text-secondary);
  }

  .tertiary {
    margin: 0;
    font-size: var(--ui-font-size-xs);
    color: var(--text-tertiary);
  }

  .suggest-row {
    display: flex;
    align-items: center;
    flex-wrap: wrap;
    gap: var(--ui-space-8);
  }

  .suggest-label {
    font-size: var(--ui-font-size-sm);
    font-weight: var(--ui-font-weight-semibold);
    opacity: 0.6;
  }

  .suggest-entry {
    display: flex;
    align-items: center;
    gap: var(--ui-space-6);
  }

  .suggest-entry.dim {
    opacity: 0.45;
  }

  .suggest-step {
    font-size: var(--ui-font-size-xs);
  }

  .bw-toggle {
    display: flex;
    align-items: center;
    gap: var(--ui-space-4);
    font-size: var(--ui-font-size-xs);
    cursor: pointer;
  }

  .bw-toggle input {
    margin: 0;
    cursor: pointer;
  }

  .coverage-alert {
    display: flex;
    align-items: center;
    gap: var(--ui-space-6);
    font-size: var(--ui-font-size-xs);
    opacity: 0.75;
  }

  .functional-row {
    display: flex;
    gap: var(--ui-space-8);
    flex-wrap: wrap;
    margin-top: auto;
    padding-top: var(--ui-space-12);
  }

  .fn-chip {
    display: flex;
    align-items: center;
    gap: var(--ui-space-6);
  }

  .fn-dot {
    width: 0.75rem;
    height: 0.75rem;
    border-radius: var(--ui-radius-full);
    background: var(--dot);
    border: 1px solid var(--page-bg);
  }

  .fn-label {
    font-size: var(--ui-font-size-xs);
    font-weight: var(--ui-font-weight-semibold);
  }

  .tones {
    display: flex;
    flex-direction: column;
    gap: var(--ui-space-8);
    flex-grow: 40;
    flex-basis: 0;
    min-height: 0;
  }

  .tone {
    flex-grow: var(--tone-share);
    flex-basis: 0;
    display: flex;
    align-items: center;
    min-height: 1.5rem;
    padding: var(--ui-space-8) var(--ui-space-12);
    border-radius: var(--ui-radius-sm);
    background: var(--tone-fill);
  }

  /* A pill of the background surface sitting on the tone: its label renders the
     family text on the background, so what you see is exactly the reported
     ratio. */
  .tone-pill {
    display: inline-flex;
    align-items: baseline;
    gap: var(--ui-space-8);
    padding: var(--ui-space-2) var(--ui-space-8);
    border-radius: var(--ui-radius-full);
    background: var(--page-bg);
  }

  .tone-name {
    font-size: var(--ui-font-size-xs);
    font-weight: var(--ui-font-weight-semibold);
  }

  .ratio {
    font-size: var(--ui-font-size-xs);
    font-family: var(--ui-font-mono);
    opacity: 0.75;
  }
</style>
