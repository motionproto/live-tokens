<script module lang="ts">
  import { buildTypeGroupColorTokens } from './scaffolding/buildTypeGroupTokens';
  import type { Token, TypeGroupConfig } from './scaffolding/types';

  export const component = 'radiobutton';

  const states: Record<string, Token[]> = {
    default: [
      { label: 'border color', groupKey: 'color', variable: '--radiobutton-default-dot-border-color' },
      { label: 'border thickness', canBeLinked: true, groupKey: 'border-width', variable: '--radiobutton-default-dot-border-width' },
      { label: 'dot fill', groupKey: 'fill', variable: '--radiobutton-default-dot-fill' },
      { label: 'dot size', groupKey: 'size', variable: '--radiobutton-default-dot-size' },
    ],
    hover: [
      { label: 'border color', groupKey: 'color', variable: '--radiobutton-hover-dot-border-color' },
      { label: 'border thickness', canBeLinked: true, groupKey: 'border-width', variable: '--radiobutton-hover-dot-border-width' },
      { label: 'dot fill', groupKey: 'fill', variable: '--radiobutton-hover-dot-fill' },
      { label: 'dot size', groupKey: 'size', variable: '--radiobutton-hover-dot-size' },
    ],
    selected: [
      { label: 'border color', groupKey: 'color', variable: '--radiobutton-selected-dot-border-color' },
      { label: 'border thickness', canBeLinked: true, groupKey: 'border-width', variable: '--radiobutton-selected-dot-border-width' },
      { label: 'dot fill', groupKey: 'fill', variable: '--radiobutton-selected-dot-fill' },
      { label: 'dot size', groupKey: 'size', variable: '--radiobutton-selected-dot-size' },
    ],
  };

  const typeGroups: Record<string, TypeGroupConfig[]> = {
    default: [{
      legend: 'label',
      colorVariable: '--radiobutton-default-label',
      familyVariable: '--radiobutton-default-label-font-family',
      sizeVariable: '--radiobutton-default-label-font-size',
      weightVariable: '--radiobutton-default-label-font-weight',
      lineHeightVariable: '--radiobutton-default-label-line-height',
    }],
    hover: [{
      legend: 'label',
      colorVariable: '--radiobutton-hover-label',
      familyVariable: '--radiobutton-hover-label-font-family',
      sizeVariable: '--radiobutton-hover-label-font-size',
      weightVariable: '--radiobutton-hover-label-font-weight',
      lineHeightVariable: '--radiobutton-hover-label-line-height',
    }],
    selected: [{
      legend: 'label',
      colorVariable: '--radiobutton-selected-label',
      familyVariable: '--radiobutton-selected-label-font-family',
      sizeVariable: '--radiobutton-selected-label-font-size',
      weightVariable: '--radiobutton-selected-label-font-weight',
      lineHeightVariable: '--radiobutton-selected-label-line-height',
    }],
  };
  const typeGroupTokens: Token[] = (['default', 'hover', 'selected'] as const).flatMap((s) => [
    { label: 'font family', canBeLinked: true, groupKey: 'font-family', variable: `--radiobutton-${s}-label-font-family` },
    { label: 'font size', canBeLinked: true, groupKey: 'font-size', variable: `--radiobutton-${s}-label-font-size` },
    { label: 'font weight', canBeLinked: true, groupKey: 'font-weight', variable: `--radiobutton-${s}-label-font-weight` },
    { label: 'line height', canBeLinked: true, groupKey: 'line-height', variable: `--radiobutton-${s}-label-line-height` },
  ]);
  const linkableContexts = new Map<string, string>([
    ['--radiobutton-default-dot-border-width', 'default'],
    ['--radiobutton-hover-dot-border-width', 'hover'],
    ['--radiobutton-selected-dot-border-width', 'selected'],
    ['--radiobutton-default-label-font-family', 'default'],
    ['--radiobutton-hover-label-font-family', 'hover'],
    ['--radiobutton-selected-label-font-family', 'selected'],
    ['--radiobutton-default-label-font-size', 'default'],
    ['--radiobutton-hover-label-font-size', 'hover'],
    ['--radiobutton-selected-label-font-size', 'selected'],
    ['--radiobutton-default-label-font-weight', 'default'],
    ['--radiobutton-hover-label-font-weight', 'hover'],
    ['--radiobutton-selected-label-font-weight', 'selected'],
    ['--radiobutton-default-label-line-height', 'default'],
    ['--radiobutton-hover-label-line-height', 'hover'],
    ['--radiobutton-selected-label-line-height', 'selected'],
  ]);
  export const allTokens: Token[] = [
    ...Object.values(states).flat(),
    ...buildTypeGroupColorTokens(typeGroups, { component, variants: Object.keys(states) }),
    ...typeGroupTokens,
  ];
</script>

<script lang="ts">
  import RadioButton from '../../system/components/RadioButton.svelte';
  import VariantGroup from './scaffolding/VariantGroup.svelte';
  import ComponentEditorBase from './scaffolding/ComponentEditorBase.svelte';
  import { editorState } from '../core/store/editorStore';
  import { computeLinkedBlock, withLinkedDisabled } from './scaffolding/linkedBlock';

  let selectedRadio = $state('option-b');

  let linked = $derived(computeLinkedBlock(component, linkableContexts, allTokens, $editorState));

  let visibleStates = $derived(Object.fromEntries(
    Object.entries(states).map(([name, list]) => [name, withLinkedDisabled(list, linked.varSet)]),
  ) as Record<string, Token[]>);
</script>

<ComponentEditorBase {component} title="Radio Button" description="Styled radio buttons with icon and color support." tokens={allTokens} {linked}>
  <VariantGroup
    name="radio"
    title="Radio Button"
    states={visibleStates}
    {typeGroups}
    {component}
    
  >
    {#snippet children({ activeState })}
        {@const forceClass = activeState === 'hover' ? 'force-hover' : ''}
      {@const forceSelected = activeState === 'selected'}
      <div class="radio-demo-row">
        <RadioButton
          label="Defense"
          selected={forceSelected || selectedRadio === 'option-a'}
          class={forceClass}
          on:click={() => (selectedRadio = 'option-a')}
        />
        <RadioButton
          label="Economy"
          selected={forceSelected || selectedRadio === 'option-b'}
          class={forceClass}
          on:click={() => (selectedRadio = 'option-b')}
        />
        <RadioButton
          label="Loyalty"
          selected={forceSelected || selectedRadio === 'option-c'}
          class={forceClass}
          on:click={() => (selectedRadio = 'option-c')}
        />
      </div>
          {/snippet}
    </VariantGroup>
</ComponentEditorBase>

<style>
  .radio-demo-row {
    display: flex;
    gap: var(--space-16);
    flex-wrap: wrap;
  }
</style>
