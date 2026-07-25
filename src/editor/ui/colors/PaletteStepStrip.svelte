<script lang="ts">
  import { editorState } from '../../core/store/editorStore';
  import {
    PALETTE_SPECS,
    PALETTE_STEPS,
    derivePaletteValues,
    serializeDerivedValue,
  } from '../../core/palettes/paletteDerivation';
  import { contrastRatio, AA_BODY } from '../../core/palettes/contrast';
  import { defaultPaletteConfig } from '../palette/paletteMath';
  import { setBackgroundSpot } from './paletteBaseColor';

  const spec = PALETTE_SPECS.find((s) => s.emptySelector)!;

  let config = $derived($editorState.palettes[spec.label]);
  let isGradient = $derived((config?.emptyMode ?? 'solid') === 'gradient');
  let currentStep = $derived(isGradient ? null : (config?.emptyStep ?? '850'));

  let steps = $derived.by(() => {
    const values = derivePaletteValues(
      spec,
      config ?? defaultPaletteConfig({ baseColor: spec.initialColor, neutral: spec.neutral }),
    );
    return PALETTE_STEPS.map((ps) => {
      const hex = serializeDerivedValue(values[`--color-${spec.cssNamespace}-${ps.label}`]);
      const onWhite = contrastRatio(hex, '#ffffff');
      const onBlack = contrastRatio(hex, '#000000');
      const best = Math.max(onWhite, onBlack);
      return {
        label: ps.label,
        hex,
        textHex: onWhite >= onBlack ? '#ffffff' : '#000000',
        best,
        aa: best >= AA_BODY,
      };
    });
  });

  // Floor, don't round: the readout must never overstate a contrast ratio.
  function title(s: (typeof steps)[number]): string {
    const ratio = `${(Math.floor(s.best * 10) / 10).toFixed(1)}:1`;
    const verdict = s.aa ? `best text contrast ${ratio}` : `no text reaches AA (best ${ratio})`;
    return `${spec.label} ${s.label} · set as page background · ${verdict}`;
  }
</script>

<div class="strip" role="group" aria-label="Page background spot">
  {#each steps as s (s.label)}
    <button
      type="button"
      class="spot"
      class:active={currentStep === s.label}
      title={title(s)}
      aria-label={title(s)}
      aria-pressed={currentStep === s.label}
      onclick={() => setBackgroundSpot(s.label)}
    >
      <span class="chip" style:background={s.hex}>
        <span class="aa" class:fail={!s.aa} style:color={s.textHex}>Aa</span>
      </span>
      <span class="step-label">{s.label}</span>
    </button>
  {/each}
</div>
{#if isGradient}
  <p class="hint">The background is currently a gradient. Picking a spot switches it to a solid background.</p>
{/if}

<style>
  .strip {
    display: flex;
    gap: var(--ui-space-4);
  }

  .spot {
    flex: 1 1 0;
    min-width: 0;
    display: flex;
    flex-direction: column;
    gap: var(--ui-space-4);
    padding: 0;
    background: none;
    border: none;
    cursor: pointer;
  }

  .chip {
    display: flex;
    align-items: center;
    justify-content: center;
    height: 2.25rem;
    border-radius: var(--ui-radius-sm);
    border: 1px solid var(--ui-border-low);
    transition: border-color var(--ui-transition-fast);
  }

  .spot:hover .chip {
    border-color: var(--ui-border-high);
  }

  .spot.active .chip {
    border-color: var(--ui-border-higher);
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

  .spot.active .step-label {
    color: var(--ui-text-primary);
  }

  .hint {
    margin: 0;
    font-size: var(--ui-font-size-sm);
    color: var(--ui-text-secondary);
  }
</style>
