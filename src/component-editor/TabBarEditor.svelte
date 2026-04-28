<script lang="ts">
  import TabBar from '../components/TabBar.svelte';
  import VariantGroup from './scaffolding/VariantGroup.svelte';
  import FieldsetWrapper from './scaffolding/FieldsetWrapper.svelte';
  import TokenLayout from './scaffolding/TokenLayout.svelte';
  import ComponentEditorBase from './scaffolding/ComponentEditorBase.svelte';
  import { editorState, registerComponentSchema } from '../lib/editorStore';
  import { computeSharedBlock, withSharedDisabled } from './scaffolding/sharedBlock';
  const component = 'tabbar';
  let selectedDemoTab = 'overview';
  const demoTabs = [
    { id: 'overview', label: 'Overview', icon: 'fas fa-home' },
    { id: 'details', label: 'Details', icon: 'fas fa-info-circle' },
    { id: 'settings', label: 'Settings', icon: 'fas fa-cog' },
    { id: 'disabled', label: 'Disabled', icon: 'fas fa-ban', disabled: true },
  ];
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

  // The "bar" object — single state, holds container-level tokens.
  const barStates: Record<string, Token[]> = {
    bar: [
      { label: 'divider color', variable: '--tabbar-bar-divider' },
      { label: 'divider thickness', variable: '--tabbar-bar-divider-thickness' },
      { label: 'radius', variable: '--tabbar-bar-radius' },
      { label: 'padding', variable: '--tabbar-bar-padding' },
    ],
  };

  // The "tab" object — three states (default/hover/active) of the same tab button.
  const tabStateNames = ['default', 'hover', 'active'] as const;
  type TabState = typeof tabStateNames[number];
  function tabStateTokens(s: TabState): Token[] {
    const list: Token[] = [];
    if (s !== 'default') list.push({ label: 'surface color', variable: `--tabbar-${s}-surface` });
    list.push(
      { label: 'border width', canBeShared: true, groupKey: 'tab-border-width', variable: `--tabbar-${s}-border-width` },
      { label: 'padding', canBeShared: true, groupKey: 'tab-padding', variable: `--tabbar-${s}-padding` },
      { label: 'icon size', canBeShared: true, groupKey: 'tab-icon-size', variable: `--tabbar-${s}-icon-size` },
    );
    if (s === 'active') list.push({ label: 'border color', variable: '--tabbar-active-border' });
    return list;
  }
  function tabStateTypeGroups(s: TabState): TypeGroupConfig[] {
    return [{
      legend: 'tab text',
      colorVariable: `--tabbar-${s}-text`,
      familyVariable: `--tabbar-${s}-text-font-family`,
      sizeVariable: `--tabbar-${s}-text-font-size`,
      weightVariable: `--tabbar-${s}-text-font-weight`,
      lineHeightVariable: `--tabbar-${s}-text-line-height`,
    }];
  }

  const tabStates: Record<string, Token[]> = Object.fromEntries(
    tabStateNames.map((s) => [`${s} tab`, tabStateTokens(s)]),
  );
  const tabTypeGroups: Record<string, TypeGroupConfig[]> = Object.fromEntries(
    tabStateNames.map((s) => [`${s} tab`, tabStateTypeGroups(s)]),
  );
  const tabTypeGroupTokens: Token[] = tabStateNames.flatMap((s) => [
    { label: 'font family', canBeShared: true, groupKey: 'tab-font-family', variable: `--tabbar-${s}-text-font-family` },
    { label: 'font size', canBeShared: true, groupKey: 'tab-font-size', variable: `--tabbar-${s}-text-font-size` },
    { label: 'font weight', canBeShared: true, groupKey: 'tab-font-weight', variable: `--tabbar-${s}-text-font-weight` },
    { label: 'line height', canBeShared: true, groupKey: 'tab-line-height', variable: `--tabbar-${s}-text-line-height` },
  ]);
  const allTokens: Token[] = [...Object.values(barStates).flat(), ...Object.values(tabStates).flat(), ...tabTypeGroupTokens];
  registerComponentSchema(component, allTokens);

  // Linking: shape props across tab states (same tab object).
  const shareableContexts = new Map<string, string>(tabStateNames.flatMap((s) => [
    [`--tabbar-${s}-border-width`, `${s} tab`] as const,
    [`--tabbar-${s}-padding`, `${s} tab`] as const,
    [`--tabbar-${s}-icon-size`, `${s} tab`] as const,
    [`--tabbar-${s}-text-font-family`, `${s} tab`] as const,
    [`--tabbar-${s}-text-font-size`, `${s} tab`] as const,
    [`--tabbar-${s}-text-font-weight`, `${s} tab`] as const,
    [`--tabbar-${s}-text-line-height`, `${s} tab`] as const,
  ]));

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

  $: visibleTabStates = Object.fromEntries(
    Object.entries(tabStates).map(([name, list]) => [name, withSharedDisabled(list, shared.varSet)]),
  ) as Record<string, Token[]>;
  const allVariables = allTokens.map((t) => t.variable);
</script>

<ComponentEditorBase {component} title="Tab Bar" description="Tab navigation with icon support and disabled state. Import from <code>components/TabBar.svelte</code>" resetVariables={allVariables}>
  {#if shared.groups.length > 0}
    <FieldsetWrapper legend="shared">
      <TokenLayout
        tokens={shared.groups.map((g) => ({ ...g.token, disabled: !g.shared }))}
        {component}
        contexts={shared.contextsByVar}
        {highlightedVars}
        sharedOrder={shared.sharedOrder}
        isSharedBlock
        on:tokenhover={handleTokenHover}
        on:change
      />
    </FieldsetWrapper>
  {/if}

  <VariantGroup name="bar" title="Bar" states={barStates} {component}>
    <TabBar tabs={demoTabs} selectedTab={selectedDemoTab} on:tabChange={(e) => (selectedDemoTab = e.detail)} />
  </VariantGroup>

  <VariantGroup
    name="tab"
    title="Tab"
    states={visibleTabStates}
    typeGroups={tabTypeGroups}
    {component}
    {highlightedVars}
    sharedOrder={shared.sharedOrder}
    on:tokenhover={handleTokenHover}
    let:activeState
  >
    {@const forceClass = activeState === 'hover tab' ? 'force-hover' : ''}
    <TabBar tabs={demoTabs} selectedTab={selectedDemoTab} class={forceClass} on:tabChange={(e) => (selectedDemoTab = e.detail)} />
    <div class="tab-content-demo">
      {#if selectedDemoTab === 'overview'}
        <p style="margin: 0;">Overview tab content</p>
      {:else if selectedDemoTab === 'details'}
        <p style="margin: 0;">Details tab content</p>
      {:else if selectedDemoTab === 'settings'}
        <p style="margin: 0;">Settings tab content</p>
      {/if}
    </div>
  </VariantGroup>
</ComponentEditorBase>

<style>
  .tab-content-demo {
    padding: var(--space-16);
    color: var(--ui-text-secondary);
    background: var(--ui-surface-low);
    border: 1px solid var(--ui-border-faint);
    border-top: none;
    border-radius: 0 0 var(--radius-md) var(--radius-md);
  }
</style>
