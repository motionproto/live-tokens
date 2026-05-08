<script context="module" lang="ts">
  import { buildTypeGroupColorTokens } from './scaffolding/buildTypeGroupTokens';
  import type { Token, TypeGroupConfig } from './scaffolding/types';

  export const component = 'tooltip';

  // Tooltip is a single object — surface/border/padding/radius/shadow live together.
  const states: Record<string, Token[]> = {
    tooltip: [
      { label: 'surface color', variable: '--tooltip-surface' },
      { label: 'border color', variable: '--tooltip-border' },
      { label: 'border width', variable: '--tooltip-border-width' },
      { label: 'corner radius', variable: '--tooltip-radius' },
      { label: 'padding', variable: '--tooltip-padding' },
      { label: 'tooltip shadow', variable: '--tooltip-shadow' },
    ],
  };

  const typeGroups: Record<string, TypeGroupConfig[]> = {
    tooltip: [{
      legend: 'tooltip text',
      colorVariable: '--tooltip-text',
      familyVariable: '--tooltip-text-font-family',
      sizeVariable: '--tooltip-text-font-size',
      weightVariable: '--tooltip-text-font-weight',
      lineHeightVariable: '--tooltip-text-line-height',
    }],
  };
  const typeGroupTokens: Token[] = [
    { label: 'font family', variable: '--tooltip-text-font-family' },
    { label: 'font size', variable: '--tooltip-text-font-size' },
    { label: 'font weight', variable: '--tooltip-text-font-weight' },
    { label: 'line height', variable: '--tooltip-text-line-height' },
  ];
  export const allTokens: Token[] = [
    ...Object.values(states).flat(),
    ...buildTypeGroupColorTokens(typeGroups),
    ...typeGroupTokens,
  ];
</script>

<script lang="ts">
  import Tooltip from '../components/Tooltip.svelte';
  import VariantGroup from './scaffolding/VariantGroup.svelte';
  import ComponentEditorBase from './scaffolding/ComponentEditorBase.svelte';
  import ShadowBackdrop from './scaffolding/ShadowBackdrop.svelte';
  import ShadowBackdropControls from './scaffolding/ShadowBackdropControls.svelte';

  let bgMode: 'image' | 'color' = 'image';
  const bgVar = '--backdrop-tooltip-surface';
</script>

<ComponentEditorBase {component} title="Tooltip" description="Hover tooltip with configurable position. Import from <code>components/Tooltip.svelte</code>" tokens={allTokens} tabbable>
  <svelte:fragment slot="config">
    <ShadowBackdropControls bind:mode={bgMode} colorVariable={bgVar} />
  </svelte:fragment>
  <VariantGroup
    name="tooltip"
    title="Tooltip"
    {states}
    {typeGroups}
    {component}
  >
    <ShadowBackdrop mode={bgMode} colorVariable={bgVar}>
      <div class="tooltip-demo-row">
        <div class="tooltip-demo-block">
          <Tooltip text="Always visible tooltip" open>
            <span class="tooltip-demo-target">Always shown</span>
          </Tooltip>
          <span class="tooltip-demo-caption">always shown</span>
        </div>
        <div class="tooltip-demo-block">
          <Tooltip text="Hover-only tooltip" position="bottom">
            <span class="tooltip-demo-target">Hover to reveal</span>
          </Tooltip>
          <span class="tooltip-demo-caption">on hover</span>
        </div>
      </div>
    </ShadowBackdrop>
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

  .tooltip-demo-block {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: var(--space-12);
  }

  .tooltip-demo-target {
    display: inline-block;
    padding: var(--space-8) var(--space-16);
    color: var(--ui-text-secondary);
    font-size: var(--font-size-sm);
    border: 1px dashed var(--ui-border-subtle);
    border-radius: var(--radius-sm);
    background: transparent;
  }

  .tooltip-demo-caption {
    color: var(--ui-text-tertiary);
    font-size: var(--font-size-xs);
    text-transform: uppercase;
    letter-spacing: 0.04em;
  }
</style>
