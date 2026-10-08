<script lang="ts">
  import UIFontFamilySelector from '../UIFontFamilySelector.svelte';
  import UIFontWeightSelector from '../UIFontWeightSelector.svelte';
  import UILetterSpacingSelector from '../UILetterSpacingSelector.svelte';
  import UILineHeightSelector from '../UILineHeightSelector.svelte';
  import UITextTransformSelector from '../UITextTransformSelector.svelte';
  import type { TextStyle } from '../sections/textStyles';
  import {
    DEFAULTS,
    VIEWPORTS,
    axisName,
    sizeName,
    usageName,
    type StyleAxis,
    type Viewport,
  } from '../../core/typeScale/typeScale';
  import ControlBody from './ControlBody.svelte';
  import ResetIcon from './ResetIcon.svelte';
  import StyleControl from './StyleControl.svelte';
  import {
    SIZE_RANGE_PX,
    SMALL_SIZE_PX,
    faceLabel,
    formatPx,
    isLinked,
    isStored,
    linkExpression,
    sizesOf,
    valueOf,
    weightLabel,
    type LinkAxis,
    type StyleTarget,
    type TextStyleEdits,
    type TokenView,
  } from './textStyleEdits';

  interface Props {
    target: StyleTarget;
    style: TextStyle;
    view: TokenView;
    /** The viewport the sample renders at and the sizes highlight. */
    viewport: Viewport;
    edits: TextStyleEdits;
  }

  let { target, style, view, viewport, edits }: Props = $props();

  const VIEWPORT_LABEL: Record<Viewport, string> = { desktop: 'Desktop', tablet: 'Tablet', phone: 'Phone' };

  let sizes = $derived(sizesOf(view, target));
  let prefix = $derived(target.prefix);
  const axis = (a: StyleAxis) => axisName(prefix, a);
  let chip = $derived(
    target.step === null
      ? style.defaultElement
      : DEFAULTS.usages[target.usage].elements[target.step]?.join(', '),
  );

  let sampleStyle = $derived(
    [
      `font-family: var(${axis('font-family')})`,
      `font-size: var(${sizeName(prefix, viewport)})`,
      `font-weight: var(${axis('font-weight')})`,
      `line-height: var(${axis('line-height')})`,
      `letter-spacing: var(${axis('letter-spacing')})`,
      ...(style.hasTextTransform ? [`text-transform: var(${axis('text-transform')})`] : []),
    ].join('; '),
  );

  // A typed value that the store leaves unchanged would otherwise stay in the
  // input, so the input re-reads the size the store now resolves.
  function editSize(vp: Viewport, input: HTMLInputElement) {
    edits.setSize(target, vp, input.valueAsNumber);
    input.value = formatPx(sizesOf(edits.view(), target)[vp].px);
  }

  function link(a: LinkAxis, label: (value: string) => string) {
    return {
      linked: isLinked(view, target, a),
      text: label(valueOf(view, usageName(target.usage, a))),
      title: `Linked to ${linkExpression(target, a)}`,
      ontoggle: () => edits.toggleLink(target, a),
    };
  }

  const write = (a: StyleAxis) => (value: string | null) => edits.writeToken(axis(a), value);
  const reset = (a: StyleAxis) => () => edits.resetKey(axis(a));
</script>

<div class="step">
  <div class="step-id">
    <code class="step-name">{style.name}</code>
    {#if chip}
      <span class="chip">{chip}</span>
    {/if}
    {#if sizes[viewport].px < SMALL_SIZE_PX}
      <span class="flag">Below {SMALL_SIZE_PX}px</span>
    {/if}
  </div>

  <div class="sizes">
    {#each VIEWPORTS as vp (vp)}
      {@const size = sizes[vp]}
      <div class="size-row" class:is-current={vp === viewport} data-reset-scope>
        <span class="size-label">{VIEWPORT_LABEL[vp]}</span>
        <ControlBody width="4.75rem" linked={!size.edited}>
          <input
            class="size-input"
            type="number"
            min={SIZE_RANGE_PX.min}
            max={SIZE_RANGE_PX.max}
            step="any"
            value={formatPx(size.px)}
            aria-label="{style.name} {vp} size in px"
            title={size.edited ? `Recommended ${formatPx(size.recommendedPx)}px` : 'Recommended size'}
            onchange={(e) => editSize(vp, e.currentTarget)}
          />
          {#snippet after()}
            <span class="unit">px</span>
            <ResetIcon
              label="{style.name} {vp} size"
              visible={size.edited}
              onreset={() => edits.resetSize(target, vp)}
            />
          {/snippet}
        </ControlBody>
      </div>
    {/each}
  </div>

  <div class="step-sample" style={sampleStyle}>{style.preview}</div>

  <div class="step-controls">
    <StyleControl
      label="Face"
      name="{style.name} face"
      width="10rem"
      resetVisible={isStored(view, axis('font-family'))}
      onreset={reset('font-family')}
      link={link('font-family', faceLabel)}
    >
      <UIFontFamilySelector variable={axis('font-family')} onwrite={write('font-family')} />
    </StyleControl>
    <StyleControl
      label="Weight"
      name="{style.name} weight"
      width="8rem"
      resetVisible={isStored(view, axis('font-weight'))}
      onreset={reset('font-weight')}
      link={link('font-weight', weightLabel)}
    >
      <UIFontWeightSelector variable={axis('font-weight')} onwrite={write('font-weight')} />
    </StyleControl>
    <StyleControl
      label="Line height"
      name="{style.name} line height"
      width="8rem"
      resetVisible={isStored(view, axis('line-height'))}
      onreset={reset('line-height')}
    >
      <UILineHeightSelector variable={axis('line-height')} onwrite={write('line-height')} />
    </StyleControl>
    <StyleControl
      label="Letter spacing"
      name="{style.name} letter spacing"
      width="9.5rem"
      resetVisible={isStored(view, axis('letter-spacing'))}
      onreset={reset('letter-spacing')}
    >
      <UILetterSpacingSelector variable={axis('letter-spacing')} onwrite={write('letter-spacing')} />
    </StyleControl>
    {#if style.hasTextTransform}
      <StyleControl
        label="Transform"
        name="{style.name} transform"
        width="8rem"
        resetVisible={isStored(view, axis('text-transform'))}
        onreset={reset('text-transform')}
      >
        <UITextTransformSelector variable={axis('text-transform')} onwrite={write('text-transform')} />
      </StyleControl>
    {/if}
  </div>
</div>

<style>
  .step {
    display: grid;
    grid-template-columns: 7.5rem 11.5rem minmax(0, 1fr);
    column-gap: var(--ui-space-16);
    row-gap: var(--ui-space-10);
    padding: var(--ui-space-12) var(--ui-space-10);
    border-bottom: 1px solid var(--ui-border-low);
  }

  .step:last-child {
    border-bottom: none;
  }

  .step-id {
    grid-row: 1 / span 2;
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    gap: var(--ui-space-6);
    min-width: 0;
  }

  .step-name {
    font-family: var(--ui-font-mono);
    font-size: var(--ui-font-size-sm);
    color: var(--ui-text-primary);
  }

  .chip {
    padding: 1px var(--ui-space-8);
    border: 1px solid var(--ui-border-low);
    border-radius: var(--ui-radius-full);
    color: var(--ui-text-secondary);
    font-family: var(--ui-font-mono);
    font-size: var(--ui-font-size-xs);
  }

  .flag {
    padding: 1px var(--ui-space-8);
    border: 1px dashed var(--ui-border-high);
    border-radius: var(--ui-radius-full);
    color: var(--ui-text-primary);
    font-size: var(--ui-font-size-xs);
    white-space: nowrap;
  }

  .sizes {
    grid-row: 1 / span 2;
    display: grid;
    align-content: start;
    gap: var(--ui-space-6);
  }

  .size-row {
    display: grid;
    grid-template-columns: 3.5rem auto;
    align-items: center;
    gap: var(--ui-space-4);
  }

  .size-label {
    color: var(--ui-text-muted);
    font-size: var(--ui-font-size-xs);
  }

  .size-row.is-current .size-label {
    color: var(--ui-text-primary);
    font-weight: var(--ui-font-weight-semibold);
  }

  .size-input {
    box-sizing: border-box;
    width: 100%;
    height: 1.75rem;
    padding: 0 var(--ui-space-8);
    background: var(--ui-surface-high);
    border: 1px solid var(--ui-border-low);
    border-radius: var(--ui-radius-md);
    color: var(--ui-text-primary);
    font: inherit;
    font-size: var(--ui-font-size-sm);
    font-variant-numeric: tabular-nums;
  }

  .size-input:hover {
    border-color: var(--ui-border-high);
  }

  .size-input:focus-visible {
    outline: 2px solid var(--ui-text-primary);
    outline-offset: 2px;
  }

  .unit {
    flex: none;
    color: var(--ui-text-muted);
    font-size: var(--ui-font-size-xs);
  }

  /* Samples take the editor's ink; colour sits outside a text style. */
  .step-sample {
    grid-column: 3;
    min-width: 0;
    max-width: min(100%, 22ch);
    color: var(--ui-text-primary);
    display: -webkit-box;
    -webkit-line-clamp: 2;
    line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
    overflow-wrap: anywhere;
    text-wrap: balance;
  }

  .step-controls {
    grid-column: 3;
    align-self: end;
    display: flex;
    flex-wrap: wrap;
    gap: var(--ui-space-12);
  }

  @media (max-width: 720px) {
    .step {
      grid-template-columns: minmax(0, 1fr);
    }

    .step-id {
      grid-row: auto;
      flex-direction: row;
      align-items: center;
      flex-wrap: wrap;
    }

    .sizes {
      grid-row: auto;
    }

    .step-sample,
    .step-controls {
      grid-column: auto;
    }
  }
</style>
