<script lang="ts">
  import { editorState } from '../../core/store/editorStore';
  import {
    PALETTE_STEPS,
    derivePaletteValues,
    serializeDerivedValue,
    type PaletteSpec,
  } from '../../core/palettes/paletteDerivation';
  import { contrastRatio, AA_BODY } from '../../core/palettes/contrast';
  import { defaultPaletteConfig } from '../palette/paletteMath';
  import { dockGrow } from '../palette/dockMagnify';

  let { spec }: { spec: PaletteSpec } = $props();

  let config = $derived($editorState.palettes[spec.label]);
  let isGradient = $derived(!!spec.emptySelector && (config?.emptyMode ?? 'solid') === 'gradient');

  function withContrast(hex: string) {
    const onWhite = contrastRatio(hex, '#ffffff');
    const onBlack = contrastRatio(hex, '#000000');
    const best = Math.max(onWhite, onBlack);
    return { hex, textHex: onWhite >= onBlack ? '#ffffff' : '#000000', best, aa: best >= AA_BODY };
  }

  let effectiveConfig = $derived(config ?? defaultPaletteConfig({ baseColor: spec.initialColor, neutral: spec.neutral }));

  let steps = $derived.by(() => {
    const values = derivePaletteValues(spec, effectiveConfig);
    return PALETTE_STEPS.map((ps) => ({
      label: ps.label,
      ...withContrast(serializeDerivedValue(values[`--color-${spec.cssNamespace}-${ps.label}`])),
    }));
  });

  // Dock magnification, mirroring PaletteEditor's swatch grid: the flex-grow
  // transition animates the walk as lightness is dialed.
  let anchoredStep = $derived(effectiveConfig.anchorToBase === false ? null : effectiveConfig.anchorPlacement?.step ?? null);
  // The page background follows the base anchor; there is no separate spot.
  let backgroundStep = $derived(spec.emptySelector && !isGradient ? anchoredStep : null);

  // Floor, don't round: the readout must never overstate a contrast ratio.
  function verdict(s: { best: number; aa: boolean }): string {
    const ratio = `${(Math.floor(s.best * 10) / 10).toFixed(1)}:1`;
    return s.aa ? `best text contrast ${ratio}` : `no text reaches AA (best ${ratio})`;
  }

  function stepTitle(s: (typeof steps)[number], i: number): string {
    const anchor = i === anchoredStep ? ' · base color' : '';
    const bg = i === backgroundStep ? ' · page background' : '';
    return `${spec.label} ${s.label}${anchor}${bg} · ${verdict(s)}`;
  }
</script>

<div class="strip" role="group" aria-label={`${spec.label} derived scale`}>
  {#each steps as s, i (s.label)}
    <div
      class="spot"
      class:anchored={anchoredStep === i}
      class:background={backgroundStep === i}
      style:flex-grow={dockGrow(i, anchoredStep)}
      title={stepTitle(s, i)}
    >
      <span class="chip" style:background={s.hex}>
        <span class="aa" class:fail={!s.aa} style:color={s.textHex}>Aa</span>
      </span>
      <span class="step-label">{s.label}</span>
    </div>
  {/each}
</div>
{#if isGradient}
  <p class="hint">The page background is currently a gradient; the base color takes over when gradient mode is off.</p>
{/if}

<style>
  .strip {
    display: flex;
    align-items: flex-end;
    gap: var(--ui-space-4);
  }

  .spot {
    flex: 1 1 0;
    min-width: 0;
    display: flex;
    flex-direction: column;
    gap: var(--ui-space-4);
    transition: flex-grow var(--ui-transition-fast);
  }

  .chip {
    display: flex;
    align-items: center;
    justify-content: center;
    height: 2.25rem;
    /* Compensating margin: height + margin-top is constant every frame of the
       magnification, so the strip's layout height never dips mid-transition
       (the dip bounced everything below). Chip grows upward, label pinned. */
    margin-top: 0.5rem;
    border-radius: var(--ui-radius-sm);
    border: 1px solid var(--ui-border-low);
    transition: border-color var(--ui-transition-fast), height var(--ui-transition-fast), margin-top var(--ui-transition-fast);
  }

  .spot.anchored .chip {
    height: 2.75rem;
    margin-top: 0;
    border-color: var(--ui-border-higher);
  }

  /* The ring marks the page background, which is the anchored base color. */
  .spot.background .chip {
    outline: 2px solid var(--ui-text-primary);
    outline-offset: 1px;
  }

  .aa {
    font-size: var(--ui-font-size-xs);
    font-weight: var(--ui-font-weight-semibold);
  }

  .aa.fail {
    opacity: 0.55;
    text-decoration: line-through;
  }

  .step-label {
    font-size: var(--ui-font-size-xs);
    color: var(--ui-text-secondary);
    text-align: center;
  }

  .spot.anchored .step-label {
    color: var(--ui-text-primary);
    font-weight: var(--ui-font-weight-semibold);
  }

  .hint {
    margin: 0;
    font-size: var(--ui-font-size-sm);
    color: var(--ui-text-secondary);
  }
</style>
