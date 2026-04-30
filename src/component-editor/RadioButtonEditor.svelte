<script lang="ts">
  import RadioButton from '../components/RadioButton.svelte';
  import VariantGroup from './scaffolding/VariantGroup.svelte';
  import SharedBlock from './scaffolding/SharedBlock.svelte';
  import ComponentEditorBase from './scaffolding/ComponentEditorBase.svelte';
  import { editorState, registerComponentSchema } from '../lib/editorStore';
  import { computeSharedBlock, withSharedDisabled } from './scaffolding/sharedBlock';
  const component = 'radiobutton';
  let selectedRadio = 'option-b';
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

  // Two objects per state: button (surface, border-width on dot, radius, padding) and the dot.
  // Plus label typography.
  const states: Record<string, Token[]> = {
    default: [
      { label: 'surface color', variable: '--radiobutton-default-surface' },
      { label: 'dot border color', variable: '--radiobutton-default-dot-border' },
      { label: 'dot border width', canBeShared: true, groupKey: 'dot-border-width', variable: '--radiobutton-default-dot-border-width' },
      { label: 'radius', canBeShared: true, groupKey: 'button-radius', variable: '--radiobutton-default-radius' },
      { label: 'padding', canBeShared: true, groupKey: 'button-padding', variable: '--radiobutton-default-padding' },
    ],
    hover: [
      { label: 'surface color', variable: '--radiobutton-hover-surface' },
      { label: 'dot border color', variable: '--radiobutton-hover-dot-border' },
      { label: 'dot border width', canBeShared: true, groupKey: 'dot-border-width', variable: '--radiobutton-hover-dot-border-width' },
      { label: 'radius', canBeShared: true, groupKey: 'button-radius', variable: '--radiobutton-hover-radius' },
      { label: 'padding', canBeShared: true, groupKey: 'button-padding', variable: '--radiobutton-hover-padding' },
    ],
    active: [
      { label: 'surface color', variable: '--radiobutton-active-surface' },
      { label: 'dot border color', variable: '--radiobutton-active-dot-border' },
      { label: 'dot border width', canBeShared: true, groupKey: 'dot-border-width', variable: '--radiobutton-active-dot-border-width' },
      { label: 'radius', canBeShared: true, groupKey: 'button-radius', variable: '--radiobutton-active-radius' },
      { label: 'padding', canBeShared: true, groupKey: 'button-padding', variable: '--radiobutton-active-padding' },
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
  registerComponentSchema(component, [...Object.values(states).flat(), ...typeGroupTokens]);

  const shareableContexts = new Map<string, string>([
    ['--radiobutton-default-dot-border-width', 'default'],
    ['--radiobutton-hover-dot-border-width', 'hover'],
    ['--radiobutton-active-dot-border-width', 'active'],
    ['--radiobutton-default-radius', 'default'],
    ['--radiobutton-hover-radius', 'hover'],
    ['--radiobutton-active-radius', 'active'],
    ['--radiobutton-default-padding', 'default'],
    ['--radiobutton-hover-padding', 'hover'],
    ['--radiobutton-active-padding', 'active'],
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
  const allTokens = [...Object.values(states).flat(), ...typeGroupTokens];

  $: shared = computeSharedBlock(component, shareableContexts, allTokens, $editorState);

  let highlightedVars = new Set<string>();
  function handleTokenHover(e: CustomEvent<{ variable: string | null }>) {
    const v = e.detail.variable;
    if (!v) {
      highlightedVars = new Set();
      return;
    }
    const group = shared.groups.find((g) => g.variables.includes(v));
    highlightedVars = group ? new Set(group.variables) : new Set();
  }

  $: visibleStates = Object.fromEntries(
    Object.entries(states).map(([name, list]) => [name, withSharedDisabled(list, shared.varSet)]),
  ) as Record<string, Token[]>;
  const allVariables = [
    ...Object.values(states).flatMap((list) => list.map((t) => t.variable)),
    ...typeGroupTokens.map((t) => t.variable),
  ];
</script>

<ComponentEditorBase {component} title="Radio Button" description="Styled radio buttons with icon and color support. Import from <code>components/RadioButton.svelte</code>" resetVariables={allVariables}>
  <VariantGroup
    name="radio"
    title="Radio Button"
    states={visibleStates}
    {typeGroups}
    {component}
    {highlightedVars}
    sharedOrder={shared.sharedOrder}
    on:tokenhover={handleTokenHover}
    let:activeState
  >
    {@const forceClass = activeState === 'hover' ? 'force-hover' : ''}
    {@const forceActive = activeState === 'active'}
    <div class="radio-demo-row">
      <RadioButton
        icon="fas fa-shield-alt"
        label="Defense"
        color="var(--text-info)"
        active={forceActive || selectedRadio === 'option-a'}
        class={forceClass}
        on:click={() => (selectedRadio = 'option-a')}
      />
      <RadioButton
        icon="fas fa-coins"
        label="Economy"
        color="var(--text-accent)"
        active={forceActive || selectedRadio === 'option-b'}
        class={forceClass}
        on:click={() => (selectedRadio = 'option-b')}
      />
      <RadioButton
        icon="fas fa-users"
        label="Loyalty"
        color="var(--text-success)"
        active={forceActive || selectedRadio === 'option-c'}
        class={forceClass}
        on:click={() => (selectedRadio = 'option-c')}
      />
    </div>
  </VariantGroup>
  <SharedBlock {component} {shared} {highlightedVars} on:tokenhover={handleTokenHover} on:change />
</ComponentEditorBase>

<style>
  .radio-demo-row {
    display: flex;
    gap: var(--space-16);
    flex-wrap: wrap;
  }
</style>
