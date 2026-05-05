<script context="module" lang="ts">
  import { buildTypeGroupColorTokens } from './scaffolding/buildTypeGroupTokens';
  import type { Token, TypeGroupConfig } from './scaffolding/types';

  export const component = 'radiobutton';

  const states: Record<string, Token[]> = {
    default: [
      { label: 'border color', canBeShared: true, groupKey: 'dot-border-color', variable: '--radiobutton-default-dot-border-color' },
      { label: 'border thickness', canBeShared: true, groupKey: 'dot-border-width', variable: '--radiobutton-default-dot-border-width' },
      { label: 'dot fill', canBeShared: true, groupKey: 'dot-fill', variable: '--radiobutton-default-dot-fill' },
      { label: 'dot size', variable: '--radiobutton-default-dot-size' },
    ],
    hover: [
      { label: 'border color', canBeShared: true, groupKey: 'dot-border-color', variable: '--radiobutton-hover-dot-border-color' },
      { label: 'border thickness', canBeShared: true, groupKey: 'dot-border-width', variable: '--radiobutton-hover-dot-border-width' },
      { label: 'dot fill', canBeShared: true, groupKey: 'dot-fill', variable: '--radiobutton-hover-dot-fill' },
      { label: 'dot size', variable: '--radiobutton-hover-dot-size' },
    ],
    active: [
      { label: 'border color', canBeShared: true, groupKey: 'dot-border-color', variable: '--radiobutton-active-dot-border-color' },
      { label: 'border thickness', canBeShared: true, groupKey: 'dot-border-width', variable: '--radiobutton-active-dot-border-width' },
      { label: 'dot fill', canBeShared: true, groupKey: 'dot-fill', variable: '--radiobutton-active-dot-fill' },
      { label: 'dot size', variable: '--radiobutton-active-dot-size' },
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
    active: [{
      legend: 'label',
      colorVariable: '--radiobutton-active-label',
      familyVariable: '--radiobutton-active-label-font-family',
      sizeVariable: '--radiobutton-active-label-font-size',
      weightVariable: '--radiobutton-active-label-font-weight',
      lineHeightVariable: '--radiobutton-active-label-line-height',
    }],
  };
  const typeGroupTokens: Token[] = (['default', 'hover', 'active'] as const).flatMap((s) => [
    { label: 'font family', canBeShared: true, groupKey: 'label-font-family', variable: `--radiobutton-${s}-label-font-family` },
    { label: 'font size', canBeShared: true, groupKey: 'label-font-size', variable: `--radiobutton-${s}-label-font-size` },
    { label: 'font weight', canBeShared: true, groupKey: 'label-font-weight', variable: `--radiobutton-${s}-label-font-weight` },
    { label: 'line height', canBeShared: true, groupKey: 'label-line-height', variable: `--radiobutton-${s}-label-line-height` },
  ]);
  const shareableContexts = new Map<string, string>([
    ['--radiobutton-default-dot-border-color', 'default'],
    ['--radiobutton-hover-dot-border-color', 'hover'],
    ['--radiobutton-active-dot-border-color', 'active'],
    ['--radiobutton-default-dot-border-width', 'default'],
    ['--radiobutton-hover-dot-border-width', 'hover'],
    ['--radiobutton-active-dot-border-width', 'active'],
    ['--radiobutton-default-dot-fill', 'default'],
    ['--radiobutton-hover-dot-fill', 'hover'],
    ['--radiobutton-active-dot-fill', 'active'],
    ['--radiobutton-default-label-font-family', 'default'],
    ['--radiobutton-hover-label-font-family', 'hover'],
    ['--radiobutton-active-label-font-family', 'active'],
    ['--radiobutton-default-label-font-size', 'default'],
    ['--radiobutton-hover-label-font-size', 'hover'],
    ['--radiobutton-active-label-font-size', 'active'],
    ['--radiobutton-default-label-font-weight', 'default'],
    ['--radiobutton-hover-label-font-weight', 'hover'],
    ['--radiobutton-active-label-font-weight', 'active'],
    ['--radiobutton-default-label-line-height', 'default'],
    ['--radiobutton-hover-label-line-height', 'hover'],
    ['--radiobutton-active-label-line-height', 'active'],
  ]);
  export const allTokens: Token[] = [
    ...Object.values(states).flat(),
    ...buildTypeGroupColorTokens(typeGroups),
    ...typeGroupTokens,
  ];
</script>

<script lang="ts">
  import RadioButton from '../components/RadioButton.svelte';
  import VariantGroup from './scaffolding/VariantGroup.svelte';
  import ComponentEditorBase from './scaffolding/ComponentEditorBase.svelte';
  import { editorState } from '../lib/editorStore';
  import { computeSharedBlock, withSharedDisabled } from './scaffolding/sharedBlock';

  let selectedRadio = 'option-b';

  $: shared = computeSharedBlock(component, shareableContexts, allTokens, $editorState);

  $: visibleStates = Object.fromEntries(
    Object.entries(states).map(([name, list]) => [name, withSharedDisabled(list, shared.varSet)]),
  ) as Record<string, Token[]>;
</script>

<ComponentEditorBase {component} title="Radio Button" description="Styled radio buttons with icon and color support. Import from <code>components/RadioButton.svelte</code>" tokens={allTokens} {shared} tabbable>
  <VariantGroup
    name="radio"
    title="Radio Button"
    states={visibleStates}
    {typeGroups}
    {component}
    let:activeState
  >
    {@const forceClass = activeState === 'hover' ? 'force-hover' : ''}
    {@const forceActive = activeState === 'active'}
    <div class="radio-demo-row">
      <RadioButton
        label="Defense"
        active={forceActive || selectedRadio === 'option-a'}
        class={forceClass}
        on:click={() => (selectedRadio = 'option-a')}
      />
      <RadioButton
        label="Economy"
        active={forceActive || selectedRadio === 'option-b'}
        class={forceClass}
        on:click={() => (selectedRadio = 'option-b')}
      />
      <RadioButton
        label="Loyalty"
        active={forceActive || selectedRadio === 'option-c'}
        class={forceClass}
        on:click={() => (selectedRadio = 'option-c')}
      />
    </div>
  </VariantGroup>
</ComponentEditorBase>

<style>
  .radio-demo-row {
    display: flex;
    gap: var(--space-16);
    flex-wrap: wrap;
  }
</style>
