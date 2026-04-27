<script lang="ts">
  import SegmentedControl from '../components/SegmentedControl.svelte';
  import FieldsetWrapper from './scaffolding/FieldsetWrapper.svelte';
  import TokenLayout from './scaffolding/TokenLayout.svelte';
  import ComponentEditorBase from './scaffolding/ComponentEditorBase.svelte';
  import {
    editorState,
    isComponentPropertyShared,
    getComponentPropertySiblings,
    registerComponentSchema,
  } from '../lib/editorStore';

  const component = 'segmentedcontrol';

  let selectedValue = 'option-2';

  type Segment = { value: string; label: string; icon?: string; disabled?: boolean };

  const segments: Segment[] = [
    { value: 'option-1', label: 'Option 1', icon: 'fas fa-star' },
    { value: 'option-2', label: 'Option 2', icon: 'fas fa-check' },
    { value: 'option-3', label: 'Option 3', icon: 'fas fa-heart' },
  ];

  type Token = { label: string; variable: string; canBeShared?: boolean; groupKey?: string };

  const dividerTokens: Token[] = [
    { label: 'color', variable: '--segmentedcontrol-divider-color' },
    { label: 'width', canBeShared: true, groupKey: 'divider-thickness', variable: '--segmentedcontrol-divider-thickness' },
    { label: 'height', canBeShared: true, groupKey: 'divider-height', variable: '--segmentedcontrol-divider-height' },
  ];

  const barTokens: Token[] = [
    { label: 'surface color', variable: '--segmentedcontrol-bar-surface' },
    { label: 'border color', variable: '--segmentedcontrol-bar-border' },
    { label: 'border width', canBeShared: true, groupKey: 'border-width', variable: '--segmentedcontrol-bar-border-width' },
    { label: 'radius', canBeShared: true, groupKey: 'radius', variable: '--segmentedcontrol-bar-radius' },
  ];

  // Default component state (a non-selected, non-disabled segment).
  // Has two interaction states: default and hover.
  const defaultStateInteractions: Record<string, Token[]> = {
    default: [
      { label: 'text color', variable: '--segmentedcontrol-option-text' },
      { label: 'font family', canBeShared: true, groupKey: 'font-family', variable: '--segmentedcontrol-option-text-font-family' },
      { label: 'font weight', canBeShared: true, groupKey: 'font-weight', variable: '--segmentedcontrol-option-text-font-weight' },
      { label: 'icon color', variable: '--segmentedcontrol-option-icon' },
    ],
    hover: [
      { label: 'surface color', variable: '--segmentedcontrol-option-hover-surface' },
      { label: 'text color', variable: '--segmentedcontrol-option-hover-text' },
      { label: 'icon color', variable: '--segmentedcontrol-option-hover-icon' },
    ],
  };

  // Selected component state — has interaction states plus state-independent frame tokens.
  const selectedFrameTokens: Token[] = [
    { label: 'border color', variable: '--segmentedcontrol-selected-border' },
    { label: 'border width', canBeShared: true, groupKey: 'border-width', variable: '--segmentedcontrol-selected-border-width' },
    { label: 'radius', canBeShared: true, groupKey: 'radius', variable: '--segmentedcontrol-selected-radius' },
  ];

  const selectedStateInteractions: Record<string, Token[]> = {
    default: [
      { label: 'surface color', variable: '--segmentedcontrol-selected-surface' },
      { label: 'text color', variable: '--segmentedcontrol-selected-text' },
      { label: 'font weight', canBeShared: true, groupKey: 'font-weight', variable: '--segmentedcontrol-selected-text-font-weight' },
      { label: 'icon color', variable: '--segmentedcontrol-selected-icon' },
    ],
    hover: [
      { label: 'surface color', variable: '--segmentedcontrol-selected-hover-surface' },
      { label: 'text color', variable: '--segmentedcontrol-selected-hover-text' },
      { label: 'icon color', variable: '--segmentedcontrol-selected-hover-icon' },
    ],
  };

  // Disabled component state — terminal, no interaction sub-states (a
  // disabled segment can't be hovered/focused/active, and selected-disabled
  // is impossible because you can't change selection while disabled).
  const disabledStateTokens: Token[] = [
    { label: 'surface color', variable: '--segmentedcontrol-disabled-surface' },
    { label: 'text color', variable: '--segmentedcontrol-disabled-text' },
    { label: 'font weight', canBeShared: true, groupKey: 'font-weight', variable: '--segmentedcontrol-disabled-text-font-weight' },
    { label: 'icon color', variable: '--segmentedcontrol-disabled-icon' },
  ];

  // Declare the explicit groupKey schema once at module load so sibling
  // resolution prefers data over name inference. Tokens without a groupKey
  // are solo (or fall back to last-dash property if a sibling needs it).
  registerComponentSchema(component, [
    ...dividerTokens,
    ...barTokens,
    ...Object.values(defaultStateInteractions).flat(),
    ...selectedFrameTokens,
    ...Object.values(selectedStateInteractions).flat(),
    ...disabledStateTokens,
  ]);

  const shareableContexts = new Map<string, string>([
    ['--segmentedcontrol-bar-border-width', 'control bar'],
    ['--segmentedcontrol-bar-radius', 'control bar'],
    ['--segmentedcontrol-divider-thickness', 'divider'],
    ['--segmentedcontrol-divider-height', 'divider'],
    ['--segmentedcontrol-option-text-font-family', 'default'],
    ['--segmentedcontrol-option-text-font-weight', 'default'],
    ['--segmentedcontrol-selected-text-font-weight', 'selected'],
    ['--segmentedcontrol-disabled-text-font-weight', 'disabled'],
    ['--segmentedcontrol-selected-border-width', 'selected'],
    ['--segmentedcontrol-selected-radius', 'selected'],
  ]);

  type SharedGroup = {
    token: Token;
    contexts: string[];
    variables: string[];
    shared: boolean;
  };

  function findToken(variable: string): Token | undefined {
    const all = [
      ...barTokens,
      ...dividerTokens,
      ...Object.values(defaultStateInteractions).flat(),
      ...selectedFrameTokens,
      ...Object.values(selectedStateInteractions).flat(),
      ...disabledStateTokens,
    ];
    return all.find((t) => t.variable === variable);
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

  let defaultInteraction = 'default';
  let selectedInteraction = 'default';
  $: interactionNames = Object.keys(defaultStateInteractions);
  $: visibleBarTokens = withSharedDisabled(barTokens, sharedVarSet);
  $: visibleDividerTokens = withSharedDisabled(dividerTokens, sharedVarSet);
  $: visibleDefaultTokens = withSharedDisabled(defaultStateInteractions[defaultInteraction] ?? [], sharedVarSet);
  $: visibleSelectedFrameTokens = withSharedDisabled(selectedFrameTokens, sharedVarSet);
  $: visibleSelectedTokens = withSharedDisabled(selectedStateInteractions[selectedInteraction] ?? [], sharedVarSet);
  $: visibleDisabledTokens = withSharedDisabled(disabledStateTokens, sharedVarSet);

  const allVariables: string[] = [
    ...barTokens.map((t) => t.variable),
    ...dividerTokens.map((t) => t.variable),
    ...Object.values(defaultStateInteractions).flatMap((list) => list.map((t) => t.variable)),
    ...selectedFrameTokens.map((t) => t.variable),
    ...Object.values(selectedStateInteractions).flatMap((list) => list.map((t) => t.variable)),
    ...disabledStateTokens.map((t) => t.variable),
  ];
</script>

<ComponentEditorBase {component} title="Segmented Control" description="A connected set of buttons for toggling between mutually exclusive options." resetVariables={allVariables}>
  <div class="preview-row">
    <SegmentedControl {segments} bind:value={selectedValue} />
  </div>

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

  <FieldsetWrapper legend="control bar">
    <TokenLayout tokens={visibleBarTokens} {component} {highlightedVars} {sharedOrder} on:tokenhover={handleTokenHover} on:change />
  </FieldsetWrapper>

  <FieldsetWrapper legend="divider">
    <TokenLayout tokens={visibleDividerTokens} {component} {highlightedVars} {sharedOrder} on:tokenhover={handleTokenHover} on:change />
  </FieldsetWrapper>

  <FieldsetWrapper legend="default state">
    <div class="state-row">
      <label class="state-selector">
        <span class="state-label">interaction</span>
        <select class="state-select" bind:value={defaultInteraction}>
          {#each interactionNames as name}
            <option value={name}>{name}</option>
          {/each}
        </select>
      </label>
    </div>
    {#key defaultInteraction}
      <TokenLayout tokens={visibleDefaultTokens} {component} {highlightedVars} {sharedOrder} on:tokenhover={handleTokenHover} on:change />
    {/key}
  </FieldsetWrapper>

  <FieldsetWrapper legend="selected state">
    <TokenLayout title="frame" tokens={visibleSelectedFrameTokens} {component} {highlightedVars} {sharedOrder} on:tokenhover={handleTokenHover} on:change />
    <div class="state-row">
      <label class="state-selector">
        <span class="state-label">interaction</span>
        <select class="state-select" bind:value={selectedInteraction}>
          {#each interactionNames as name}
            <option value={name}>{name}</option>
          {/each}
        </select>
      </label>
    </div>
    {#key selectedInteraction}
      <TokenLayout tokens={visibleSelectedTokens} {component} {highlightedVars} {sharedOrder} on:tokenhover={handleTokenHover} on:change />
    {/key}
  </FieldsetWrapper>

  <FieldsetWrapper legend="disabled state">
    <TokenLayout tokens={visibleDisabledTokens} {component} {highlightedVars} {sharedOrder} on:tokenhover={handleTokenHover} on:change />
  </FieldsetWrapper>
</ComponentEditorBase>

<style>
  .preview-row {
    display: flex;
    align-items: center;
    gap: var(--ui-space-16);
  }

  .state-row {
    display: flex;
    align-items: center;
    gap: var(--ui-space-12);
    flex: 0 0 100%;
  }

  .state-selector {
    display: inline-flex;
    align-items: center;
    gap: var(--ui-space-8);
  }

  .state-label {
    font-size: var(--ui-font-size-xs);
    font-weight: var(--ui-font-weight-medium);
    color: var(--ui-text-secondary);
  }

  .state-select {
    padding: var(--ui-space-4) var(--ui-space-10);
    background: var(--ui-surface-lowest);
    border: 1px solid var(--ui-border-subtle);
    border-radius: var(--ui-radius-sm);
    color: var(--ui-text-primary);
    font-size: var(--ui-font-size-xs);
    font-family: var(--ui-font-mono);
    cursor: pointer;
    align-self: flex-start;
  }

  .state-select:hover {
    background: var(--ui-hover);
    border-color: var(--ui-border-default);
  }

  .state-select:focus {
    outline: none;
    border-color: var(--ui-text-accent);
  }
</style>
