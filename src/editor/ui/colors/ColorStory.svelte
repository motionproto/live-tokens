<script lang="ts">
  import { cssColorToOklch, oklchToHexClamped } from '../../core/palettes/oklch';
  import { palettesToVars } from '../../core/palettes/paletteDerivation';
  import { contrastRatio } from '../../core/palettes/contrast';
  import type { PaletteConfig } from '../../core/themes/themeTypes';

  interface Props {
    /** Every family's config, spec defaults filled in (palettesWithDefaults). */
    full: Record<string, PaletteConfig>;
  }

  let { full }: Props = $props();

  // 60-30-10 as an area composition: the background surface is the dominant 60%
  // field (the page), and Brand/Accent/Special are the tones shown against it.
  // Shares are flex-grow weights, not exact percentages.
  const TONES = [
    { label: 'Brand', ns: 'brand', share: 30 },
    { label: 'Accent', ns: 'accent', share: 8 },
    { label: 'Special', ns: 'special', share: 2 },
  ] as const;

  const TEXT_STEPS = ['primary', 'secondary', 'tertiary'] as const;

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
  function seedHex(label: string): string {
    const { l, c, h } = full[label].baseColor;
    return oklchToHexClamped(l, c, h);
  }

  // Text renders from this map (text derivation tracks the seed), never from the
  // ambient :root variables — those stay at vendored defaults for families a
  // loaded theme doesn't configure, so a story bound to them silently goes static.
  let vars = $derived(palettesToVars(full));

  // Shadow the consumed text variables locally with the store-derived values;
  // the page field is the Canvas family's SEED, not its derived page step.
  let storyVars = $derived(
    ['--text-primary', '--text-secondary', '--text-tertiary', '--text-inverted']
      .concat([...TONES, ...FUNCTIONAL].map((t) => `--text-${t.ns}`))
      .filter((name) => vars[name] !== undefined)
      .map((name) => `${name}: ${vars[name]}`)
      .concat(`--page-bg: ${seedHex('Canvas')}`)
      .join('; '),
  );

  // Ratios are measured against the DISPLAYED field — the Canvas seed —
  // so the numbers always describe what the story shows.
  // Derived vars serialize as `oklch()`; contrastRatio is sRGB-terminated.
  function varHex(name: string): string | null {
    const parsed = cssColorToOklch(vars[name] ?? '');
    return parsed ? oklchToHexClamped(parsed.l, parsed.c, parsed.h) : null;
  }

  function ratioOnBg(textVar: string): number | null {
    const text = varHex(textVar);
    return text === null ? null : contrastRatio(text, seedHex('Canvas'));
  }

  // Floor, don't round: the readout must never overstate a contrast ratio.
  function fmt(r: number | null): string | null {
    return r === null ? null : `${(Math.floor(r * 10) / 10).toFixed(1)}:1`;
  }

  // Inverted is measured against the fill it sits on (primary), not the page:
  // the pill below IS that pairing, so the number describes what is shown. A
  // mid-lightness primary makes this pairing inherently low-contrast — the
  // readout surfaces that rather than hiding the pill.
  let invertedRatio = $derived.by(() => {
    const inverted = varHex('--text-inverted');
    const primary = varHex('--text-primary');
    return inverted !== null && primary !== null ? contrastRatio(inverted, primary) : null;
  });
</script>

<div class="story" style={storyVars}>
  <div class="field">
    <span class="field-label">Canvas</span>

    <!-- Each step renders in its own token, so the word IS the sample and the
         ratio beside it measures exactly what you are reading. -->
    <div class="text-steps">
      {#each TEXT_STEPS as step (step)}
        {@const r = fmt(ratioOnBg(`--text-${step}`))}
        <p class="text-step" style:color="var(--text-{step})">
          {step}
          {#if r}<span class="ratio">{r}</span>{/if}
        </p>
      {/each}
    </div>

    <p class="inverted-row">
      <span class="inverted-pill">
        Inverted text flips onto primary.
        {#if fmt(invertedRatio)}<span class="ratio">{fmt(invertedRatio)}</span>{/if}
      </span>
    </p>

    <div class="functional-row">
      {#each FUNCTIONAL as fn (fn.ns)}
        {@const r = fmt(ratioOnBg(`--text-${fn.ns}`))}
        <span class="fn-chip">
          <!-- The dot shows the TEXT color the ratio measures (shadowed via
               storyVars), matching the label — not the family's seed fill. -->
          <span class="fn-dot" style:--dot="var(--text-{fn.ns})"></span>
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
  /* No min-height: 0 — the field must keep its content min-height so tall
     text wrapping grows the frame instead of overflowing onto the tone bars. */
  .field {
    flex-grow: 60;
    flex-basis: 0;
    display: flex;
    flex-direction: column;
    gap: var(--ui-space-8);
    padding: var(--ui-space-12);
    color: var(--text-primary);
  }

  .field-label {
    font-size: var(--ui-font-size-md);
    font-weight: var(--ui-font-weight-semibold);
  }

  .inverted-row {
    margin: var(--ui-space-8) 0 0;
  }

  /* The pill's fill IS the primary text color: the flip is shown literally,
     and any illegibility of the pairing is visible right here. */
  .inverted-pill {
    display: inline-flex;
    align-items: baseline;
    gap: var(--ui-space-8);
    padding: var(--ui-space-2) var(--ui-space-8);
    border-radius: var(--ui-radius-full);
    background: var(--text-primary);
    color: var(--text-inverted);
    font-size: var(--ui-font-size-md);
  }

  .text-steps {
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    gap: var(--ui-space-6);
  }

  .text-step {
    display: flex;
    align-items: baseline;
    gap: var(--ui-space-8);
    margin: 0;
    font-size: var(--ui-font-size-md);
  }

  .functional-row {
    display: flex;
    gap: var(--ui-space-8) var(--ui-space-12);
    flex-wrap: wrap;
    margin-top: auto;
    padding-top: var(--ui-space-16);
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
    font-size: var(--ui-font-size-md);
    font-weight: var(--ui-font-weight-semibold);
  }

  /* Like .field, no min-height: 0 — the bars' min heights must grow the frame
     rather than spill past its border when the field's text is tall. */
  .tones {
    display: flex;
    flex-direction: column;
    gap: var(--ui-space-8);
    flex-grow: 40;
    flex-basis: 0;
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
    font-size: var(--ui-font-size-md);
    font-weight: var(--ui-font-weight-semibold);
  }

  .ratio {
    font-size: var(--ui-font-size-md);
    font-family: var(--ui-font-mono);
    opacity: 0.75;
  }
</style>
