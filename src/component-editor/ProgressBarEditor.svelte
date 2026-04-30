<script lang="ts">
  import ProgressBar from '../components/ProgressBar.svelte';
  import VariantGroup from './scaffolding/VariantGroup.svelte';
  import ComponentEditorBase from './scaffolding/ComponentEditorBase.svelte';
  import { editorState } from '../lib/editorStore';
  import { computeSharedBlock, withSharedDisabled } from './scaffolding/sharedBlock';
  import { buildSiblings } from './scaffolding/siblings';
  import type { Token, TypeGroupConfig } from './scaffolding/types';
  const component = 'progressbar';
  const variants = ['primary', 'success', 'warning', 'danger', 'info'] as const;
  type Variant = typeof variants[number];

  // Per variant: track (surface, border, border-width, radius, height) + fill (color).
  function variantTokens(v: Variant): Token[] {
    return [
      { label: 'fill color', variable: `--progressbar-${v}-fill` },
      { label: 'track surface color', variable: `--progressbar-${v}-track-surface` },
      { label: 'track border color', variable: `--progressbar-${v}-track-border` },
      { label: 'track border width', canBeShared: true, groupKey: 'track-border-width', variable: `--progressbar-${v}-track-border-width` },
      { label: 'radius', canBeShared: true, groupKey: 'radius', variable: `--progressbar-${v}-radius` },
      { label: 'track height', canBeShared: true, groupKey: 'track-height', variable: `--progressbar-${v}-track-height` },
    ];
  }

  // Two type groups per variant: label and value.
  function variantTypeGroups(v: Variant): TypeGroupConfig[] {
    return [
      {
        legend: 'label',
        colorVariable: `--progressbar-${v}-label`,
        familyVariable: `--progressbar-${v}-label-font-family`,
        sizeVariable: `--progressbar-${v}-label-font-size`,
        weightVariable: `--progressbar-${v}-label-font-weight`,
        lineHeightVariable: `--progressbar-${v}-label-line-height`,
      },
      {
        legend: 'value',
        colorVariable: `--progressbar-${v}-value`,
        familyVariable: `--progressbar-${v}-value-font-family`,
        sizeVariable: `--progressbar-${v}-value-font-size`,
        weightVariable: `--progressbar-${v}-value-font-weight`,
        lineHeightVariable: `--progressbar-${v}-value-line-height`,
      },
    ];
  }
  function variantTypeGroupTokens(v: Variant): Token[] {
    return [
      { label: 'font family', canBeShared: true, groupKey: 'label-font-family', variable: `--progressbar-${v}-label-font-family` },
      { label: 'font size', canBeShared: true, groupKey: 'label-font-size', variable: `--progressbar-${v}-label-font-size` },
      { label: 'font weight', canBeShared: true, groupKey: 'label-font-weight', variable: `--progressbar-${v}-label-font-weight` },
      { label: 'line height', canBeShared: true, groupKey: 'label-line-height', variable: `--progressbar-${v}-label-line-height` },
      { label: 'font family', canBeShared: true, groupKey: 'value-font-family', variable: `--progressbar-${v}-value-font-family` },
      { label: 'font size', canBeShared: true, groupKey: 'value-font-size', variable: `--progressbar-${v}-value-font-size` },
      { label: 'font weight', canBeShared: true, groupKey: 'value-font-weight', variable: `--progressbar-${v}-value-font-weight` },
      { label: 'line height', canBeShared: true, groupKey: 'value-line-height', variable: `--progressbar-${v}-value-line-height` },
    ];
  }
  const allTokens: Token[] = variants.flatMap((v) => [...variantTokens(v), ...variantTypeGroupTokens(v)]);

  // Cross-variant shared block surfaces shape and font props that may be linked.
  const shareableContexts = new Map<string, string>(variants.flatMap((v) => [
    [`--progressbar-${v}-track-border-width`, v] as const,
    [`--progressbar-${v}-radius`, v] as const,
    [`--progressbar-${v}-track-height`, v] as const,
    [`--progressbar-${v}-label-font-family`, v] as const,
    [`--progressbar-${v}-label-font-size`, v] as const,
    [`--progressbar-${v}-label-font-weight`, v] as const,
    [`--progressbar-${v}-label-line-height`, v] as const,
    [`--progressbar-${v}-value-font-family`, v] as const,
    [`--progressbar-${v}-value-font-size`, v] as const,
    [`--progressbar-${v}-value-font-weight`, v] as const,
    [`--progressbar-${v}-value-line-height`, v] as const,
  ]));

  $: shared = computeSharedBlock(component, shareableContexts, allTokens, $editorState);
  $: visibleVariantTokens = (v: Variant) => withSharedDisabled(variantTokens(v), shared.varSet);
</script>

<ComponentEditorBase {component} title="Progress Bar" description="Animated progress bar with variants. Import from <code>components/ProgressBar.svelte</code>" tokens={allTokens} {shared}>
  {#each variants as v}
    <VariantGroup
      name={v}
      title={v.charAt(0).toUpperCase() + v.slice(1)}
      states={{ [v]: visibleVariantTokens(v) }}
      typeGroups={{ [v]: variantTypeGroups(v) }}
      {component}
      siblings={buildSiblings(variants, v, variantTokens, variantTypeGroups)}
    >
      <div class="progress-demo-stack">
        {#if v === 'primary'}
          <ProgressBar value={25} label="Getting Started" variant="primary" />
          <ProgressBar value={60} variant="primary" size="compact" />
        {:else if v === 'success'}
          <ProgressBar value={100} label="Complete" variant="success" />
        {:else if v === 'warning'}
          <ProgressBar value={75} label="Almost Done" variant="warning" />
        {:else if v === 'danger'}
          <ProgressBar value={33} label="Danger Zone" variant="danger" />
        {:else if v === 'info'}
          <ProgressBar value={50} label="Halfway There" variant="info" />
        {/if}
      </div>
    </VariantGroup>
  {/each}
</ComponentEditorBase>

<style>
  .progress-demo-stack {
    display: flex;
    flex-direction: column;
    gap: var(--space-12);
  }
</style>
