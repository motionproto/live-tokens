<script lang="ts">
  import Button from '../components/Button.svelte';
  import Tooltip from '../components/Tooltip.svelte';
  import VariantGroup from './scaffolding/VariantGroup.svelte';
  import ComponentEditorBase from './scaffolding/ComponentEditorBase.svelte';
  import type { Token, TypeGroupConfig } from './scaffolding/types';
  import ShadowBackdrop from './scaffolding/ShadowBackdrop.svelte';
  import ShadowBackdropControls from './scaffolding/ShadowBackdropControls.svelte';
  const component = 'tooltip';

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
  const allTokens: Token[] = [...Object.values(states).flat(), ...typeGroupTokens];
  let bgMode: 'image' | 'color' = 'image';
  const bgVar = '--backdrop-tooltip-surface';
</script>

<ComponentEditorBase {component} title="Tooltip" description="Hover tooltip with configurable position. Import from <code>components/Tooltip.svelte</code>" tokens={allTokens}>
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
        <Tooltip text="This is a top tooltip">
          <Button variant="outline">Hover me (top)</Button>
        </Tooltip>
        <Tooltip text="Bottom tooltip" position="bottom">
          <Button variant="outline">Hover me (bottom)</Button>
        </Tooltip>
        <Tooltip text="Tooltips work on any element">
          <span class="tooltip-demo-text">Hover this text</span>
        </Tooltip>
      </div>
    </ShadowBackdrop>
  </VariantGroup>
</ComponentEditorBase>

<style>
  .tooltip-demo-row {
    display: flex;
    gap: var(--space-24);
    align-items: center;
    padding-top: var(--space-32);
  }

  .tooltip-demo-text {
    color: var(--ui-text-secondary);
    text-decoration: underline;
    text-decoration-style: dotted;
    cursor: help;
  }
</style>
