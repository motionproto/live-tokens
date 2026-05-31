<script module lang="ts">
  import { buildTypeGroupColorTokens } from './scaffolding/buildTypeGroupTokens';
  import type { Token, TypeGroupConfig } from './scaffolding/types';

  export const component = 'progressbar';

  // Single-variant component: fill color is a runtime prop on the consumer side,
  // not a per-variant token namespace.
  const states: Record<string, Token[]> = {
    default: [
      { label: 'color', element: 'fill', groupKey: 'fill', variable: '--progressbar-fill' },
      { label: 'surface', element: 'frame', groupKey: 'surface', variable: '--progressbar-track-surface' },
      { label: 'border', element: 'frame', groupKey: 'border', variable: '--progressbar-track-border' },
      { label: 'border width', element: 'frame', canBeLinked: true, groupKey: 'track-border-width', variable: '--progressbar-track-border-width' },
      { label: 'corner radius', element: 'frame', canBeLinked: true, groupKey: 'radius', variable: '--progressbar-radius' },
      { label: 'height', element: 'frame', canBeLinked: true, groupKey: 'track-height', variable: '--progressbar-track-height' },
      { label: 'label gap', element: 'frame', groupKey: 'label-gap', variable: '--progressbar-label-gap' },
    ],
  };

  const typeGroups: Record<string, TypeGroupConfig[]> = {
    default: [
      {
        legend: '',
        element: 'label',
        colorVariable: '--progressbar-label',
        familyVariable: '--progressbar-label-font-family',
        sizeVariable: '--progressbar-label-font-size',
        weightVariable: '--progressbar-label-font-weight',
        lineHeightVariable: '--progressbar-label-line-height',
      },
      {
        legend: '',
        element: 'value',
        colorVariable: '--progressbar-value',
        familyVariable: '--progressbar-value-font-family',
        sizeVariable: '--progressbar-value-font-size',
        weightVariable: '--progressbar-value-font-weight',
        lineHeightVariable: '--progressbar-value-line-height',
      },
    ],
  };

  const typeGroupTokens: Token[] = [
    { label: 'font family', canBeLinked: true, groupKey: 'label-font-family', variable: '--progressbar-label-font-family' },
    { label: 'font size', canBeLinked: true, groupKey: 'label-font-size', variable: '--progressbar-label-font-size' },
    { label: 'font weight', canBeLinked: true, groupKey: 'label-font-weight', variable: '--progressbar-label-font-weight' },
    { label: 'line height', canBeLinked: true, groupKey: 'label-line-height', variable: '--progressbar-label-line-height' },
    { label: 'font family', canBeLinked: true, groupKey: 'value-font-family', variable: '--progressbar-value-font-family' },
    { label: 'font size', canBeLinked: true, groupKey: 'value-font-size', variable: '--progressbar-value-font-size' },
    { label: 'font weight', canBeLinked: true, groupKey: 'value-font-weight', variable: '--progressbar-value-font-weight' },
    { label: 'line height', canBeLinked: true, groupKey: 'value-line-height', variable: '--progressbar-value-line-height' },
  ];

  const linkableContexts = new Map<string, string>([
    ['--progressbar-track-border-width', 'progressbar'],
    ['--progressbar-radius', 'progressbar'],
    ['--progressbar-track-height', 'progressbar'],
    ['--progressbar-label-font-family', 'label'],
    ['--progressbar-label-font-size', 'label'],
    ['--progressbar-label-font-weight', 'label'],
    ['--progressbar-label-line-height', 'label'],
    ['--progressbar-value-font-family', 'value'],
    ['--progressbar-value-font-size', 'value'],
    ['--progressbar-value-font-weight', 'value'],
    ['--progressbar-value-line-height', 'value'],
  ]);

  export const allTokens: Token[] = [
    ...Object.values(states).flat(),
    ...buildTypeGroupColorTokens(typeGroups),
    ...typeGroupTokens,
  ];
</script>

<script lang="ts">
  import ProgressBar from '../../system/components/ProgressBar.svelte';
  import VariantGroup from './scaffolding/VariantGroup.svelte';
  import ComponentEditorBase from './scaffolding/ComponentEditorBase.svelte';
  import { editorState } from '../core/store/editorStore';
  import { computeLinkedBlock, withLinkedDisabled } from './scaffolding/linkedBlock';

  let linked = $derived(computeLinkedBlock(component, linkableContexts, allTokens, $editorState));
  let visibleStates = $derived(Object.fromEntries(
    Object.entries(states).map(([name, list]) => [name, withLinkedDisabled(list, linked.varSet)]),
  ) as Record<string, Token[]>);
</script>

<ComponentEditorBase {component} title="Progress Bar" description="Animated progress bar; consumers pass a fill color via the fill prop." tokens={allTokens} {linked}>
  <VariantGroup
    name="progressbar"
    title="Progress Bar"
    states={visibleStates}
    {typeGroups}
    {component}
  >
    <div class="progress-demo-stack">
      <ProgressBar value={75} label="Loading" />
    </div>
  </VariantGroup>
</ComponentEditorBase>

<style>
  .progress-demo-stack {
    display: flex;
    flex-direction: column;
    gap: var(--space-12);
    width: 100%;
    max-width: 32rem;
  }
</style>
