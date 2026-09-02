<script module lang="ts">
  import { buildTypeGroupColorTokens } from './scaffolding/buildTypeGroupTokens';
  import type { Token, TypeGroupConfig } from './scaffolding/types';
  import { sliderVariants } from '../../system/components/Slider.svelte';

  export const component = 'slider';
  const variants = sliderVariants;
  type Variant = typeof variants[number];

  // Geometry and colour are identical across the two variants by default, so
  // every row is linkable: an edit to the single slider's track moves the range
  // slider's track until a user unlinks them on purpose.
  function variantDefaultTokens(v: Variant): Token[] {
    return [
      { label: 'surface', element: 'track', canBeLinked: true, groupKey: 'track-surface', variable: `--slider-${v}-track-surface` },
      { label: 'border', element: 'track', canBeLinked: true, groupKey: 'track-border', variable: `--slider-${v}-track-border` },
      { label: 'border width', element: 'track', canBeLinked: true, groupKey: 'track-border-width', variable: `--slider-${v}-track-border-width` },
      { label: 'height', element: 'track', canBeLinked: true, groupKey: 'track-height', variable: `--slider-${v}-track-height` },
      { label: 'corner radius', element: 'track', canBeLinked: true, groupKey: 'track-radius', variable: `--slider-${v}-track-radius` },
      { label: 'color', element: 'fill', canBeLinked: true, groupKey: 'fill', variable: `--slider-${v}-fill` },
      { label: 'surface', element: 'thumb', canBeLinked: true, groupKey: 'thumb-surface', variable: `--slider-${v}-thumb-surface` },
      { label: 'border', element: 'thumb', canBeLinked: true, groupKey: 'thumb-border', variable: `--slider-${v}-thumb-border` },
      { label: 'border width', element: 'thumb', canBeLinked: true, groupKey: 'thumb-border-width', variable: `--slider-${v}-thumb-border-width` },
      { label: 'size', element: 'thumb', canBeLinked: true, groupKey: 'thumb-size', variable: `--slider-${v}-thumb-size` },
      { label: 'corner radius', element: 'thumb', canBeLinked: true, groupKey: 'thumb-radius', variable: `--slider-${v}-thumb-radius` },
      { label: 'shadow', element: 'thumb', canBeLinked: true, groupKey: 'thumb-shadow', variable: `--slider-${v}-thumb-shadow` },
    ];
  }

  function variantHoverTokens(v: Variant): Token[] {
    return [
      { label: 'thumb surface', canBeLinked: true, groupKey: 'hover-thumb-surface', variable: `--slider-${v}-hover-thumb-surface` },
      { label: 'thumb border', canBeLinked: true, groupKey: 'hover-thumb-border', variable: `--slider-${v}-hover-thumb-border` },
    ];
  }

  function variantDisabledTokens(v: Variant): Token[] {
    return [
      { label: 'track surface', canBeLinked: true, groupKey: 'disabled-track-surface', variable: `--slider-${v}-disabled-track-surface` },
      { label: 'fill color', canBeLinked: true, groupKey: 'disabled-fill', variable: `--slider-${v}-disabled-fill` },
      { label: 'thumb surface', canBeLinked: true, groupKey: 'disabled-thumb-surface', variable: `--slider-${v}-disabled-thumb-surface` },
      { label: 'thumb border', canBeLinked: true, groupKey: 'disabled-thumb-border', variable: `--slider-${v}-disabled-thumb-border` },
    ];
  }

  function variantStates(v: Variant): Record<string, Token[]> {
    return {
      default: variantDefaultTokens(v),
      hover: variantHoverTokens(v),
      disabled: variantDisabledTokens(v),
    };
  }

  // The label and value readout are shared by both variants, so they live in
  // one type group outside the per-variant states.
  const typeGroups: Record<string, TypeGroupConfig[]> = {
    default: [
      {
        legend: '',
        element: 'label',
        colorVariable: '--slider-label',
        familyVariable: '--slider-label-font-family',
        sizeVariable: '--slider-label-font-size',
        weightVariable: '--slider-label-font-weight',
        lineHeightVariable: '--slider-label-line-height',
      },
      {
        legend: '',
        element: 'value',
        colorVariable: '--slider-value',
        familyVariable: '--slider-value-font-family',
        sizeVariable: '--slider-value-font-size',
        weightVariable: '--slider-value-font-weight',
        lineHeightVariable: '--slider-value-line-height',
      },
    ],
  };

  const typeGroupTokens: Token[] = [
    { label: 'label gap', groupKey: 'label-gap', variable: '--slider-label-gap' },
    { label: 'font family', canBeLinked: true, groupKey: 'label-font-family', variable: '--slider-label-font-family' },
    { label: 'font size', canBeLinked: true, groupKey: 'label-font-size', variable: '--slider-label-font-size' },
    { label: 'font weight', canBeLinked: true, groupKey: 'label-font-weight', variable: '--slider-label-font-weight' },
    { label: 'line height', canBeLinked: true, groupKey: 'label-line-height', variable: '--slider-label-line-height' },
    { label: 'font family', canBeLinked: true, groupKey: 'value-font-family', variable: '--slider-value-font-family' },
    { label: 'font size', canBeLinked: true, groupKey: 'value-font-size', variable: '--slider-value-font-size' },
    { label: 'font weight', canBeLinked: true, groupKey: 'value-font-weight', variable: '--slider-value-font-weight' },
    { label: 'line height', canBeLinked: true, groupKey: 'value-line-height', variable: '--slider-value-line-height' },
  ];

  export const allTokens: Token[] = [
    ...variants.flatMap((v) => Object.values(variantStates(v)).flat()),
    ...buildTypeGroupColorTokens(typeGroups, { component }),
    ...typeGroupTokens,
  ];

  const linkableContexts = new Map<string, string>([
    ...variants.flatMap((v) =>
      Object.entries(variantStates(v)).flatMap(([state, list]) =>
        list.filter((t) => t.canBeLinked).map((t) => [t.variable, `${v} ${state}`] as [string, string]),
      ),
    ),
    ...typeGroupTokens
      .filter((t) => t.canBeLinked)
      .map((t) => [t.variable, t.variable.includes('-label-') ? 'label' : 'value'] as [string, string]),
  ]);

  const variantOptions = variants.map((v) => ({ value: v, label: v.charAt(0).toUpperCase() + v.slice(1) }));
</script>

<script lang="ts">
  import Slider from '../../system/components/Slider.svelte';
  import VariantGroup from './scaffolding/VariantGroup.svelte';
  import ComponentEditorBase from './scaffolding/ComponentEditorBase.svelte';
  import { editorState } from '../core/store/editorStore';
  import { computeLinkedBlock, withLinkedDisabled } from './scaffolding/linkedBlock';
  import { buildSiblings } from './scaffolding/siblings';

  let linked = $derived(computeLinkedBlock(component, linkableContexts, allTokens, $editorState));
  let visibleVariantStates = $derived((v: Variant) => Object.fromEntries(
    Object.entries(variantStates(v)).map(([name, list]) => [name, withLinkedDisabled(list, linked.varSet)]),
  ) as Record<string, Token[]>);

  let value = $state(40);
  let low = $state(20);
  let high = $state(70);

  function previewProps(activeState: string) {
    return {
      disabled: activeState === 'disabled',
      forceClass: activeState === 'hover' ? 'force-hover' : '',
    };
  }
</script>

<ComponentEditorBase
  {component}
  title="Slider"
  description="A number chosen by position on a track. Single moves one thumb to a value; range moves two thumbs to a low and a high bound."
  tokens={allTokens}
  {linked}
  variants={variantOptions}
>
  {#each variants as v}
    <VariantGroup
      name={v}
      title={v.charAt(0).toUpperCase() + v.slice(1)}
      states={visibleVariantStates(v)}
      typeGroups={v === 'single' ? typeGroups : undefined}
      {component}
      siblings={buildSiblings(variants, v, variantStates)}
    >
      {#snippet children({ activeState })}
        {@const p = previewProps(activeState)}
        <div class="slider-demo-stack">
          {#if v === 'range'}
            <Slider
              variant="range"
              label="Price"
              {low}
              {high}
              disabled={p.disabled}
              class={p.forceClass}
              onrangechange={(l, h) => { low = l; high = h; }}
            />
          {:else}
            <Slider label="Volume" {value} disabled={p.disabled} class={p.forceClass} onchange={(n) => (value = n)} />
          {/if}
        </div>
      {/snippet}
    </VariantGroup>
  {/each}
</ComponentEditorBase>

<style>
  .slider-demo-stack {
    display: flex;
    flex-direction: column;
    gap: var(--space-12);
    width: 100%;
    max-width: 32rem;
  }
</style>
