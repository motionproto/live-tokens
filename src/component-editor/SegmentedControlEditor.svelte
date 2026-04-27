<script lang="ts">
  import SegmentedControl from '../components/SegmentedControl.svelte';
  import FieldsetWrapper from './scaffolding/FieldsetWrapper.svelte';
  import TokenLayout from './scaffolding/TokenLayout.svelte';
  import VariantGroup from './scaffolding/VariantGroup.svelte';
  import ComponentEditorBase from './scaffolding/ComponentEditorBase.svelte';
  import {
    editorState,
    isComponentPropertyShared,
    getComponentPropertySiblings,
    registerComponentSchema,
  } from '../lib/editorStore';

  const component = 'segmentedcontrol';

  type Segment = { value: string; label: string; icon?: string; disabled?: boolean };

  const segments: Segment[] = [
    { value: 'option-1', label: 'Option 1', icon: 'fas fa-star' },
    { value: 'option-2', label: 'Option 2', icon: 'fas fa-check' },
    { value: 'option-3', label: 'Option 3', icon: 'fas fa-heart' },
  ];

  type Token = { label: string; variable: string; canBeShared?: boolean; groupKey?: string; hidden?: boolean };
  type TypeGroupConfig = {
    legend?: string;
    colorVariable: string;
    colorLabel?: string;
    familyVariable?: string;
    familyLabel?: string;
    sizeVariable?: string;
    sizeLabel?: string;
    weightVariable?: string;
    weightLabel?: string;
    lineHeightVariable?: string;
    lineHeightLabel?: string;
  };

  // Non-text tokens per state. Text/font properties live in `typeGroups` below
  // and are rendered via TypeEditor instead of TokenLayout.
  const states: Record<string, Token[]> = {
    'control bar': [
      { label: 'surface color', variable: '--segmentedcontrol-bar-surface' },
      { label: 'border color', variable: '--segmentedcontrol-bar-border' },
      { label: 'border width', variable: '--segmentedcontrol-bar-border-width' },
      { label: 'radius', canBeShared: true, groupKey: 'radius', variable: '--segmentedcontrol-bar-radius' },
      { label: 'padding', variable: '--segmentedcontrol-bar-padding', groupKey: 'bar-padding' },
      { label: 'padding-top', variable: '--segmentedcontrol-bar-padding-top', groupKey: 'bar-padding-top', hidden: true },
      { label: 'padding-right', variable: '--segmentedcontrol-bar-padding-right', groupKey: 'bar-padding-right', hidden: true },
      { label: 'padding-bottom', variable: '--segmentedcontrol-bar-padding-bottom', groupKey: 'bar-padding-bottom', hidden: true },
      { label: 'padding-left', variable: '--segmentedcontrol-bar-padding-left', groupKey: 'bar-padding-left', hidden: true },
    ],
    divider: [
      { label: 'color', variable: '--segmentedcontrol-divider-color' },
      { label: 'width', canBeShared: true, groupKey: 'divider-thickness', variable: '--segmentedcontrol-divider-thickness' },
      { label: 'height', canBeShared: true, groupKey: 'divider-height', variable: '--segmentedcontrol-divider-height' },
    ],
    'default option': [
      { label: 'icon color', variable: '--segmentedcontrol-option-icon' },
    ],
    'selected option': [
      { label: 'surface color', variable: '--segmentedcontrol-selected-surface' },
      { label: 'icon color', variable: '--segmentedcontrol-selected-icon' },
      { label: 'border color', variable: '--segmentedcontrol-selected-border' },
      { label: 'border width', canBeShared: true, groupKey: 'border-width', variable: '--segmentedcontrol-selected-border-width' },
      { label: 'radius', canBeShared: true, groupKey: 'radius', variable: '--segmentedcontrol-selected-radius' },
    ],
    'hover option': [
      { label: 'surface color', variable: '--segmentedcontrol-option-hover-surface' },
      { label: 'icon color', variable: '--segmentedcontrol-option-hover-icon' },
    ],
    'disabled option': [
      { label: 'surface color', variable: '--segmentedcontrol-disabled-surface' },
      { label: 'icon color', variable: '--segmentedcontrol-disabled-icon' },
    ],
  };

  // Per-state typography groups for the option text element. All five
  // properties are exposed and individually share-able via groupKey across
  // the four states.
  const typeGroups: Record<string, TypeGroupConfig[]> = {
    'default option': [{
      legend: 'option text',
      colorVariable: '--segmentedcontrol-option-text',
      familyVariable: '--segmentedcontrol-option-text-font-family',
      sizeVariable: '--segmentedcontrol-option-text-font-size',
      weightVariable: '--segmentedcontrol-option-text-font-weight',
      lineHeightVariable: '--segmentedcontrol-option-text-line-height',
    }],
    'selected option': [{
      legend: 'option text',
      colorVariable: '--segmentedcontrol-selected-text',
      familyVariable: '--segmentedcontrol-selected-text-font-family',
      sizeVariable: '--segmentedcontrol-selected-text-font-size',
      weightVariable: '--segmentedcontrol-selected-text-font-weight',
      lineHeightVariable: '--segmentedcontrol-selected-text-line-height',
    }],
    'hover option': [{
      legend: 'option text',
      colorVariable: '--segmentedcontrol-option-hover-text',
      familyVariable: '--segmentedcontrol-option-hover-text-font-family',
      sizeVariable: '--segmentedcontrol-option-hover-text-font-size',
      weightVariable: '--segmentedcontrol-option-hover-text-font-weight',
      lineHeightVariable: '--segmentedcontrol-option-hover-text-line-height',
    }],
    'disabled option': [{
      legend: 'option text',
      colorVariable: '--segmentedcontrol-disabled-text',
      familyVariable: '--segmentedcontrol-disabled-text-font-family',
      sizeVariable: '--segmentedcontrol-disabled-text-font-size',
      weightVariable: '--segmentedcontrol-disabled-text-font-weight',
      lineHeightVariable: '--segmentedcontrol-disabled-text-line-height',
    }],
  };

  // Schema entries for the type-group variables — registered for groupKey
  // resolution but not rendered through TokenLayout.
  const typeGroupTokens: Token[] = [
    { label: 'font family', canBeShared: true, groupKey: 'font-family', variable: '--segmentedcontrol-option-text-font-family' },
    { label: 'font size', canBeShared: true, groupKey: 'font-size', variable: '--segmentedcontrol-option-text-font-size' },
    { label: 'font weight', canBeShared: true, groupKey: 'font-weight', variable: '--segmentedcontrol-option-text-font-weight' },
    { label: 'line height', canBeShared: true, groupKey: 'line-height', variable: '--segmentedcontrol-option-text-line-height' },
    { label: 'font family', canBeShared: true, groupKey: 'font-family', variable: '--segmentedcontrol-selected-text-font-family' },
    { label: 'font size', canBeShared: true, groupKey: 'font-size', variable: '--segmentedcontrol-selected-text-font-size' },
    { label: 'font weight', canBeShared: true, groupKey: 'font-weight', variable: '--segmentedcontrol-selected-text-font-weight' },
    { label: 'line height', canBeShared: true, groupKey: 'line-height', variable: '--segmentedcontrol-selected-text-line-height' },
    { label: 'font family', canBeShared: true, groupKey: 'font-family', variable: '--segmentedcontrol-option-hover-text-font-family' },
    { label: 'font size', canBeShared: true, groupKey: 'font-size', variable: '--segmentedcontrol-option-hover-text-font-size' },
    { label: 'font weight', canBeShared: true, groupKey: 'font-weight', variable: '--segmentedcontrol-option-hover-text-font-weight' },
    { label: 'line height', canBeShared: true, groupKey: 'line-height', variable: '--segmentedcontrol-option-hover-text-line-height' },
    { label: 'font family', canBeShared: true, groupKey: 'font-family', variable: '--segmentedcontrol-disabled-text-font-family' },
    { label: 'font size', canBeShared: true, groupKey: 'font-size', variable: '--segmentedcontrol-disabled-text-font-size' },
    { label: 'font weight', canBeShared: true, groupKey: 'font-weight', variable: '--segmentedcontrol-disabled-text-font-weight' },
    { label: 'line height', canBeShared: true, groupKey: 'line-height', variable: '--segmentedcontrol-disabled-text-line-height' },
  ];

  registerComponentSchema(component, [...Object.values(states).flat(), ...typeGroupTokens]);

  const shareableContexts = new Map<string, string>([
    ['--segmentedcontrol-bar-radius', 'control bar'],
    ['--segmentedcontrol-divider-thickness', 'divider'],
    ['--segmentedcontrol-divider-height', 'divider'],
    ['--segmentedcontrol-selected-border-width', 'selected option'],
    ['--segmentedcontrol-selected-radius', 'selected option'],
  ]);

  type SharedGroup = {
    token: Token;
    contexts: string[];
    variables: string[];
    shared: boolean;
  };

  function findToken(variable: string): Token | undefined {
    return [...Object.values(states).flat(), ...typeGroupTokens].find((t) => t.variable === variable);
  }

  function computeShared(_state: typeof $editorState): { groups: SharedGroup[]; vars: Set<string> } {
    const groups: SharedGroup[] = [];
    const vars = new Set<string>();
    const seen = new Set<string>();

    for (const [variable] of shareableContexts) {
      if (seen.has(variable)) continue;

      const siblings = getComponentPropertySiblings(component, variable);
      if (siblings.length < 2) continue;
      for (const s of siblings) seen.add(s);

      const rep = findToken(variable);
      if (!rep) continue;

      const isShared = isComponentPropertyShared(component, variable);
      const ctxs = [
        ...new Set(siblings.map((s) => shareableContexts.get(s)).filter((c): c is string => !!c)),
      ];

      groups.push({ token: { ...rep, canBeShared: true }, contexts: ctxs, variables: siblings, shared: isShared });
      if (isShared) {
        for (const s of siblings) vars.add(s);
      }
    }

    return { groups, vars };
  }

  $: ({ groups: sharedGroups, vars: sharedVarSet } = computeShared($editorState));
  $: sharedContexts = Object.fromEntries(sharedGroups.map((g) => [g.token.variable, g.contexts]));
  $: sharedOrder = new Map<string, number>(
    sharedGroups.flatMap((g, i) => [
      [g.token.variable, i] as const,
      ...g.variables.map((v) => [v, i] as const),
    ]),
  );

  let highlightedVars = new Set<string>();

  function handleTokenHover(e: CustomEvent<{ variable: string | null }>) {
    const v = e.detail.variable;
    if (!v) {
      highlightedVars = new Set();
      return;
    }
    const group = sharedGroups.find((g) => g.variables.includes(v));
    highlightedVars = group ? new Set(group.variables) : new Set();
  }

  function withSharedDisabled(tokens: Token[], shared: Set<string>): (Token & { disabled?: boolean })[] {
    return tokens.map((t) => (shared.has(t.variable) ? { ...t, disabled: true } : t));
  }

  $: visibleStates = Object.fromEntries(
    Object.entries(states).map(([name, list]) => [name, withSharedDisabled(list, sharedVarSet)]),
  ) as Record<string, Token[]>;

  const allVariables: string[] = [
    ...Object.values(states).flatMap((list) => list.map((t) => t.variable)),
    ...typeGroupTokens.map((t) => t.variable),
  ];
</script>

<ComponentEditorBase {component} title="Segmented Control" description="A connected set of buttons for toggling between mutually exclusive options." resetVariables={allVariables} let:targetFile>
  {#if sharedGroups.length > 0}
    <FieldsetWrapper legend="shared">
      <TokenLayout
        tokens={sharedGroups.map((g) => ({ ...g.token, disabled: !g.shared }))}
        {component}
        contexts={sharedContexts}
        {highlightedVars}
        {sharedOrder}
        isSharedBlock
        on:tokenhover={handleTokenHover}
        on:change
      />
    </FieldsetWrapper>
  {/if}

  <VariantGroup
    name="segmentedcontrol"
    title="Segmented Control"
    variantNoun="component"
    states={visibleStates}
    {typeGroups}
    {targetFile}
    {component}
    {highlightedVars}
    {sharedOrder}
    on:tokenhover={handleTokenHover}
    let:activeState
  >
    {@const previewValue = activeState === 'selected option' ? 'option-2' : ''}
    {@const previewForceHover = activeState === 'hover option' ? 'option-1' : null}
    {@const previewDisabled = activeState === 'disabled option'}
    <div>
      <SegmentedControl
        {segments}
        value={previewValue}
        forceHoverValue={previewForceHover}
        disabled={previewDisabled}
      />
    </div>
  </VariantGroup>
</ComponentEditorBase>
