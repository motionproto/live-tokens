<script lang="ts">
  import { editorState } from '../../core/store/editorStore';
  import { palettesToVars, PALETTE_SPECS } from '../../core/palettes/paletteDerivation';
  import { defaultPaletteConfig } from '../palette/paletteMath';
  import { contrastRatio } from '../../core/palettes/contrast';
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

  // Every color the story renders comes from this store-derived map — the same
  // source as the ratios — never from the ambient :root variables. Ambient vars
  // stay at their vendored defaults for families a loaded theme doesn't
  // configure, so a story bound to them silently goes static. Unconfigured
  // families derive from their spec defaults instead.
  let vars = $derived.by(() => {
    const full: Record<string, PaletteConfig> = {};
    for (const spec of PALETTE_SPECS) {
      full[spec.label] =
        $editorState.palettes[spec.label] ??
        defaultPaletteConfig({ baseColor: spec.initialColor, neutral: spec.neutral ?? false });
    }
    return palettesToVars(full);
  });

  // Shadow the consumed variables locally with the store-derived values, so the
  // markup below can keep referencing var(--…) while never reading :root.
  let storyVars = $derived(
    ['--page-bg', '--text-primary', '--text-secondary']
      .concat([...TONES, ...FUNCTIONAL].flatMap((t) => [`--surface-${t.ns}`, `--text-${t.ns}`]))
      .filter((name) => vars[name] !== undefined)
      .map((name) => `${name}: ${vars[name]}`)
      .join('; '),
  );

  // The guaranteed, real-use pairing: a family's text on the BACKGROUND page,
  // not on its own saturated surface. That is what "Derive accessible text"
  // solves for, and what text/icons on a page actually sit on. Neutral supplies
  // the light-or-dark text the background's luminance calls for.
  function ratioOnBg(textVar: string): number | null {
    const text = vars[textVar];
    const bg = vars['--page-bg'];
    return typeof text === 'string' && typeof bg === 'string' ? contrastRatio(text, bg) : null;
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
    <p class="secondary">Secondary text follows the same field.</p>

    <div class="functional-row">
      {#each FUNCTIONAL as fn (fn.ns)}
        {@const r = fmt(ratioOnBg(`--text-${fn.ns}`))}
        <span class="fn-chip">
          <span class="fn-dot" style:--dot="var(--surface-{fn.ns})"></span>
          <span class="fn-label" style:color="var(--text-{fn.ns})">{fn.label}</span>
          {#if r}<span class="ratio">{r}</span>{/if}
        </span>
      {/each}
    </div>
  </div>

  <div class="tones">
    {#each TONES as tone (tone.ns)}
      {@const r = fmt(ratioOnBg(`--text-${tone.ns}`))}
      <div class="tone" style:--tone-fill="var(--surface-{tone.ns})" style:--tone-share={tone.share}>
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
