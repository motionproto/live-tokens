<script lang="ts">
  import { editorState } from '../../core/store/editorStore';
  import { palettesToVars } from '../../core/palettes/paletteDerivation';
  import { contrastRatio } from '../../core/palettes/contrast';

  // Fixed v1 proportions (60-30-10): Brand 30 / Accent 8 / Special sliver 2 /
  // Background field 60. Shares are flex-grow weights, not exact percentages.
  const BANDS = [
    { label: 'Brand', ns: 'brand', share: 30 },
    { label: 'Accent', ns: 'accent', share: 8 },
    { label: 'Special', ns: 'special', share: 2 },
    { label: 'Background', ns: 'canvas', share: 60 },
  ] as const;

  const FUNCTIONAL = [
    { label: 'Info', ns: 'info' },
    { label: 'Success', ns: 'success' },
    { label: 'Warning', ns: 'warning' },
    { label: 'Danger', ns: 'danger' },
  ] as const;

  // Ratios come from the store-derived hexes, never getComputedStyle, so they
  // update live during drags and match what the theme will actually ship.
  let vars = $derived(palettesToVars($editorState.palettes));

  function ratioFor(ns: string): number | null {
    const text = vars[`--text-${ns}`];
    const surface = vars[`--surface-${ns}`];
    return text && surface ? contrastRatio(text, surface) : null;
  }

  // Floor, don't round: the readout must never overstate a contrast ratio.
  function fmt(r: number): string {
    return `${(Math.floor(r * 10) / 10).toFixed(1)}:1`;
  }

  function bandTitle(label: string, ns: string): string {
    const r = ratioFor(ns);
    return r === null ? label : `${label}: text ${fmt(r)}`;
  }
</script>

<div class="story">
  {#each BANDS as band (band.ns)}
    <div
      class="band"
      style:--band-share={band.share}
      style:--band-fill="var(--surface-{band.ns})"
      style:--band-text="var(--text-{band.ns})"
      title={bandTitle(band.label, band.ns)}
    >
      {#if band.share > 2}
        <div class="band-head">
          <span class="band-label">{band.label}</span>
          {#if ratioFor(band.ns) !== null}
            <span class="band-ratio">{fmt(ratioFor(band.ns)!)}</span>
          {/if}
        </div>
      {/if}
      {#if band.ns === 'canvas'}
        <div class="functional-row">
          {#each FUNCTIONAL as fn (fn.ns)}
            <span
              class="fn-chip"
              style:--band-fill="var(--surface-{fn.ns})"
              style:--band-text="var(--text-{fn.ns})"
              title={bandTitle(fn.label, fn.ns)}
            >
              <span class="fn-label">{fn.label}</span>
              {#if ratioFor(fn.ns) !== null}
                <span class="fn-ratio">{fmt(ratioFor(fn.ns)!)}</span>
              {/if}
            </span>
          {/each}
        </div>
      {/if}
    </div>
  {/each}
</div>

<style>
  /* The frame carries the real page background so the bands read in situ;
     padding + gap let it show through as the gutter. */
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

  .band {
    flex-grow: var(--band-share);
    flex-basis: 0;
    display: flex;
    flex-direction: column;
    justify-content: space-between;
    min-height: 0;
    padding: var(--ui-space-8) var(--ui-space-12);
    border-radius: var(--ui-radius-sm);
    background: var(--band-fill);
    color: var(--band-text);
  }

  .band-head {
    display: flex;
    align-items: baseline;
    justify-content: space-between;
    gap: var(--ui-space-8);
  }

  .band-label {
    font-size: var(--ui-font-size-sm);
    font-weight: var(--ui-font-weight-semibold);
  }

  .band-ratio,
  .fn-ratio {
    font-size: var(--ui-font-size-xs);
    font-family: var(--ui-font-mono);
    opacity: 0.75;
  }

  .functional-row {
    display: flex;
    gap: var(--ui-space-8);
    flex-wrap: wrap;
    margin-top: auto;
    padding-top: var(--ui-space-8);
  }

  .fn-chip {
    display: flex;
    align-items: baseline;
    gap: var(--ui-space-6);
    padding: var(--ui-space-4) var(--ui-space-8);
    border-radius: var(--ui-radius-sm);
    background: var(--band-fill);
    color: var(--band-text);
  }

  .fn-label {
    font-size: var(--ui-font-size-xs);
    font-weight: var(--ui-font-weight-semibold);
  }
</style>
