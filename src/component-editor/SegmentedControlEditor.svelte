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

  type Token = { label: string; variable: string; canBeShared?: boolean; groupKey?: string };

  // One block, six rows. The first two are chrome (the bar wrapper and the
  // dividers between segments); the last four are the per-option states.
  // "selected hover" is intentionally absent — the selected pill looks the
  // same regardless of pointer state.
  const states: Record<string, Token[]> = {
    'control bar': [
      { label: 'surface color', variable: '--segmentedcontrol-bar-surface' },
      { label: 'border color', variable: '--segmentedcontrol-bar-border' },
      { label: 'border width', variable: '--segmentedcontrol-bar-border-width' },
      { label: 'radius', canBeShared: true, groupKey: 'radius', variable: '--segmentedcontrol-bar-radius' },
    ],
    divider: [
      { label: 'color', variable: '--segmentedcontrol-divider-color' },
      { label: 'width', canBeShared: true, groupKey: 'divider-thickness', variable: '--segmentedcontrol-divider-thickness' },
      { label: 'height', canBeShared: true, groupKey: 'divider-height', variable: '--segmentedcontrol-divider-height' },
    ],
    'default option': [
      { label: 'text color', variable: '--segmentedcontrol-option-text' },
      { label: 'font family', canBeShared: true, groupKey: 'font-family', variable: '--segmentedcontrol-option-text-font-family' },
      { label: 'font weight', canBeShared: true, groupKey: 'font-weight', variable: '--segmentedcontrol-option-text-font-weight' },
      { label: 'icon color', variable: '--segmentedcontrol-option-icon' },
    ],
    'selected option': [
      { label: 'surface color', variable: '--segmentedcontrol-selected-surface' },
      { label: 'text color', variable: '--segmentedcontrol-selected-text' },
      { label: 'font weight', canBeShared: true, groupKey: 'font-weight', variable: '--segmentedcontrol-selected-text-font-weight' },
      { label: 'icon color', variable: '--segmentedcontrol-selected-icon' },
      { label: 'border color', variable: '--segmentedcontrol-selected-border' },
      { label: 'border width', canBeShared: true, groupKey: 'border-width', variable: '--segmentedcontrol-selected-border-width' },
      { label: 'radius', canBeShared: true, groupKey: 'radius', variable: '--segmentedcontrol-selected-radius' },
    ],
    'hover option': [
      { label: 'surface color', variable: '--segmentedcontrol-option-hover-surface' },
      { label: 'text color', variable: '--segmentedcontrol-option-hover-text' },
      { label: 'icon color', variable: '--segmentedcontrol-option-hover-icon' },
    ],
    'disabled option': [
      { label: 'surface color', variable: '--segmentedcontrol-disabled-surface' },
      { label: 'text color', variable: '--segmentedcontrol-disabled-text' },
      { label: 'font weight', canBeShared: true, groupKey: 'font-weight', variable: '--segmentedcontrol-disabled-text-font-weight' },
      { label: 'icon color', variable: '--segmentedcontrol-disabled-icon' },
    ],
  };

  registerComponentSchema(component, Object.values(states).flat());

  const shareableContexts = new Map<string, string>([
    ['--segmentedcontrol-bar-radius', 'control bar'],
    ['--segmentedcontrol-divider-thickness', 'divider'],
    ['--segmentedcontrol-divider-height', 'divider'],
    ['--segmentedcontrol-option-text-font-family', 'default option'],
    ['--segmentedcontrol-option-text-font-weight', 'default option'],
    ['--segmentedcontrol-selected-text-font-weight', 'selected option'],
    ['--segmentedcontrol-disabled-text-font-weight', 'disabled option'],
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
    return Object.values(states).flat().find((t) => t.variable === variable);
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

  const allVariables: string[] = Object.values(states).flatMap((list) => list.map((t) => t.variable));
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
    <SegmentedControl
      {segments}
      value={previewValue}
      forceHoverValue={previewForceHover}
      disabled={previewDisabled}
    />
  </VariantGroup>
</ComponentEditorBase>
