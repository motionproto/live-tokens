<script module lang="ts">
  import { buildTypeGroupColorTokens } from './scaffolding/buildTypeGroupTokens';
  import type { Token, TypeGroupConfig } from './scaffolding/types';

  export const component = 'tooltip';

  // Element tags split the panel into frame + text via StateBlock.
  const states: Record<string, Token[]> = {
    tooltip: [
      { label: 'surface color', element: 'frame', variable: '--tooltip-surface' },
      { label: 'border color', element: 'frame', variable: '--tooltip-border' },
      { label: 'border width', element: 'frame', groupKey: 'width', variable: '--tooltip-border-width' },
      { label: 'corner radius', element: 'frame', variable: '--tooltip-radius' },
      { label: 'padding', element: 'frame', variable: '--tooltip-padding' },
      { label: 'shadow', element: 'frame', variable: '--tooltip-shadow' },
    ],
  };

  const typeGroups: Record<string, TypeGroupConfig[]> = {
    tooltip: [{
      legend: '',
      element: 'text',
      colorVariable: '--tooltip-text',
      familyVariable: '--tooltip-text-font-family',
      sizeVariable: '--tooltip-text-font-size',
      weightVariable: '--tooltip-text-font-weight',
      lineHeightVariable: '--tooltip-text-line-height',
    }],
  };
  const typeGroupTokens: Token[] = [
    { label: 'font family', groupKey: 'family', variable: '--tooltip-text-font-family' },
    { label: 'font size', groupKey: 'size', variable: '--tooltip-text-font-size' },
    { label: 'font weight', groupKey: 'weight', variable: '--tooltip-text-font-weight' },
    { label: 'line height', groupKey: 'height', variable: '--tooltip-text-line-height' },
  ];
  export const allTokens: Token[] = [
    ...Object.values(states).flat(),
    ...buildTypeGroupColorTokens(typeGroups, { component }),
    ...typeGroupTokens,
  ];
</script>

<script lang="ts">
  import Tooltip from '../../system/components/Tooltip.svelte';
  import VariantGroup from './scaffolding/VariantGroup.svelte';
  import ComponentEditorBase from './scaffolding/ComponentEditorBase.svelte';

  const hintText = 'Helpful Hint';
</script>

<ComponentEditorBase {component} title="Tooltip" description="Hover tooltip with configurable position." tokens={allTokens}>
  <VariantGroup
    name="tooltip"
    title="Tooltip"
    {states}
    {typeGroups}
    {component}
  >
    <div class="tooltip-demo-row">
      <Tooltip text={hintText} open>
        <span class="tooltip-demo-target">Helpful Hint</span>
      </Tooltip>
      <Tooltip text={hintText} position="bottom">
        <span class="tooltip-demo-target">Hover me</span>
      </Tooltip>
    </div>
  </VariantGroup>
</ComponentEditorBase>

<style>
  .tooltip-demo-row {
    display: flex;
    gap: var(--space-48);
    align-items: flex-start;
    justify-content: center;
    padding: var(--space-48) 0;
  }

  .tooltip-demo-target {
    display: inline-block;
    padding: var(--space-8) var(--space-16);
    color: var(--ui-text-secondary);
    font-size: var(--font-size-sm);
    border: 1px dashed var(--ui-border-low);
    border-radius: var(--radius-sm);
    background: transparent;
  }

</style>
