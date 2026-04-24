<script lang="ts">
  import SegmentedControl from '../components/SegmentedControl.svelte';
  import FieldsetWrapper from './scaffolding/FieldsetWrapper.svelte';
  import TokenLayout from './scaffolding/TokenLayout.svelte';
  import ComponentEditorBase from './scaffolding/ComponentEditorBase.svelte';
  import {
    editorState,
    isComponentPropertyShared,
    getComponentPropertySiblings,
  } from '../lib/editorStore';

  const component = 'segmentedcontrol';

  let selectedValue = 'option-2';

  type Segment = { value: string; label: string; icon?: string; disabled?: boolean };

  const segments: Segment[] = [
    { value: 'option-1', label: 'Option 1', icon: 'fas fa-star' },
    { value: 'option-2', label: 'Option 2', icon: 'fas fa-check' },
    { value: 'option-3', label: 'Option 3', icon: 'fas fa-heart' },
  ];

  type Token = { label: string; variable: string; canBeShared?: boolean };

  const dividerTokens: Token[] = [
    { label: 'color', variable: '--segmentedcontrol-divider-color' },
    { label: 'width', canBeShared: true, variable: '--segmentedcontrol-divider-thickness' },
    { label: 'height', canBeShared: true, variable: '--segmentedcontrol-divider-height' },
  ];

  const barTokens: Token[] = [
    { label: 'surface color', variable: '--segmentedcontrol-bar-surface' },
    { label: 'border color', variable: '--segmentedcontrol-bar-border' },
    { label: 'border width', canBeShared: true, variable: '--segmentedcontrol-bar-border-width' },
    { label: 'radius', canBeShared: true, variable: '--segmentedcontrol-bar-radius' },
  ];

  const optionStates: Record<string, Token[]> = {
    default: [
      { label: 'text color', variable: '--segmentedcontrol-option-text' },
      { label: 'font family', canBeShared: true, variable: '--segmentedcontrol-option-text-font-family' },
      { label: 'font weight', canBeShared: true, variable: '--segmentedcontrol-option-text-font-weight' },
      { label: 'icon color', variable: '--segmentedcontrol-option-icon' },
    ],
    hover: [
      { label: 'surface color', variable: '--segmentedcontrol-option-hover-surface' },
      { label: 'text color', variable: '--segmentedcontrol-option-hover-text' },
      { label: 'icon color', variable: '--segmentedcontrol-option-hover-icon' },
    ],
    disabled: [
      { label: 'surface color', variable: '--segmentedcontrol-option-disabled-surface' },
      { label: 'text color', variable: '--segmentedcontrol-option-disabled-text' },
      { label: 'font weight', canBeShared: true, variable: '--segmentedcontrol-option-disabled-text-font-weight' },
      { label: 'icon color', variable: '--segmentedcontrol-option-disabled-icon' },
    ],
  };

  const selectedTokens: Token[] = [
    { label: 'surface color', variable: '--segmentedcontrol-selected-surface' },
    { label: 'text color', variable: '--segmentedcontrol-selected-text' },
    { label: 'font weight', canBeShared: true, variable: '--segmentedcontrol-selected-text-font-weight' },
    { label: 'icon color', variable: '--segmentedcontrol-selected-icon' },
    { label: 'border color', variable: '--segmentedcontrol-selected-border' },
    { label: 'border width', canBeShared: true, variable: '--segmentedcontrol-selected-border-width' },
    { label: 'radius', canBeShared: true, variable: '--segmentedcontrol-selected-radius' },
  ];

  const shareableContexts = new Map<string, string>([
    ['--segmentedcontrol-bar-border-width', 'control bar'],
    ['--segmentedcontrol-bar-radius', 'control bar'],
    ['--segmentedcontrol-divider-thickness', 'divider'],
    ['--segmentedcontrol-divider-height', 'divider'],
    ['--segmentedcontrol-option-text-font-family', 'default option'],
    ['--segmentedcontrol-option-text-font-weight', 'default option'],
    ['--segmentedcontrol-option-disabled-text-font-weight', 'disabled option'],
    ['--segmentedcontrol-selected-text-font-weight', 'selected option'],
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
    const all = [...barTokens, ...dividerTokens, ...Object.values(optionStates).flat(), ...selectedTokens];
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

  let optionState = 'default';
  $: optionStateNames = Object.keys(optionStates);
  $: visibleBarTokens = withSharedDisabled(barTokens, sharedVarSet);
  $: visibleDividerTokens = withSharedDisabled(dividerTokens, sharedVarSet);
  $: visibleOptionTokens = withSharedDisabled(optionStates[optionState] ?? [], sharedVarSet);
  $: visibleSelectedTokens = withSharedDisabled(selectedTokens, sharedVarSet);
</script>

<ComponentEditorBase {component} title="Segmented Control" description="A connected set of buttons for toggling between mutually exclusive options.">
  <div class="preview-row">
    <SegmentedControl {segments} bind:value={selectedValue} />
    <label class="state-selector">
      <span class="state-label">state</span>
      <select class="state-select" bind:value={optionState}>
        {#each optionStateNames as name}
          <option value={name}>{name}</option>
        {/each}
      </select>
    </label>
  </div>

  {#if sharedGroups.length > 0}
    <FieldsetWrapper legend="shared">
      <TokenLayout
        tokens={sharedGroups.map((g) => ({ ...g.token, disabled: !g.shared }))}
        {component}
        contexts={sharedContexts}
        {highlightedVars}
        {sharedOrder}
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

  <FieldsetWrapper legend="{optionState} option">
    {#key optionState}
      <TokenLayout tokens={visibleOptionTokens} {component} {highlightedVars} {sharedOrder} on:tokenhover={handleTokenHover} on:change />
    {/key}
  </FieldsetWrapper>

  <FieldsetWrapper legend="selected option">
    <TokenLayout tokens={visibleSelectedTokens} {component} {highlightedVars} {sharedOrder} on:tokenhover={handleTokenHover} on:change />
  </FieldsetWrapper>
</ComponentEditorBase>

<style>
  .preview-row {
    display: flex;
    align-items: center;
    gap: var(--ui-space-16);
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
