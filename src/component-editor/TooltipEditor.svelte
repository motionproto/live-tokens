<script lang="ts">
  import Button from '../components/Button.svelte';
  import Tooltip from '../components/Tooltip.svelte';
  import VariantGroup from './scaffolding/VariantGroup.svelte';
  import ComponentEditorBase from './scaffolding/ComponentEditorBase.svelte';
  import { registerComponentSchema } from '../lib/editorStore';
  const component = 'tooltip';
  type Token = { label: string; variable: string; canBeShared?: boolean; groupKey?: string; hidden?: boolean };
  type TypeGroupConfig = {
    legend?: string;
    colorVariable: string;
    colorLabel?: string;
    familyVariable?: string;
    sizeVariable?: string;
    weightVariable?: string;
    lineHeightVariable?: string;
  };

  // Tooltip is a single object — surface/border/padding/radius/shadow live together.
  const states: Record<string, Token[]> = {
    tooltip: [
      { label: 'surface color', variable: '--tooltip-surface' },
      { label: 'border color', variable: '--tooltip-border' },
      { label: 'border width', variable: '--tooltip-border-width' },
      { label: 'radius', variable: '--tooltip-radius' },
      { label: 'padding', variable: '--tooltip-padding' },
      { label: 'shadow', variable: '--tooltip-shadow' },
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
  registerComponentSchema(component, [...Object.values(states).flat(), ...typeGroupTokens]);
  const allVariables = [
    ...Object.values(states).flatMap((list) => list.map((t) => t.variable)),
    ...typeGroupTokens.map((t) => t.variable),
  ];
</script>

<ComponentEditorBase {component} title="Tooltip" description="Hover tooltip with configurable position. Import from <code>components/Tooltip.svelte</code>" resetVariables={allVariables}>
  <VariantGroup
    name="tooltip"
    title="Tooltip"
    {states}
    {typeGroups}
    {component}
  >
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
