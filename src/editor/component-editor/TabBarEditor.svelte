<script module lang="ts">
  import { buildTypeGroupColorTokens } from './scaffolding/buildTypeGroupTokens';
  import type { Token, TypeGroupConfig, IntrinsicSpec } from './scaffolding/types';

  export const component = 'tabbar';

  // The tab object — four states (default/hover/active/disabled) of the same tab button.
  const tabStateNames = ['default', 'hover', 'active', 'disabled'] as const;
  type TabState = typeof tabStateNames[number];
  // `element` tags split each tab state into frame / icon / indicator / text.
  // No elementOrder: it would force the flat `bar` state into grouped mode.
  // Frame tokens lead so sections read frame → icon → indicator → text (typeGroup last).
  function tabStateTokens(s: TabState): Token[] {
    return [
      { label: 'surface color', element: 'frame', groupKey: 'surface', variable: `--tabbar-${s}-surface` },
      { label: 'top radius', element: 'frame', canBeLinked: true, groupKey: 'tab-top-radius', variable: `--tabbar-${s}-tab-top-radius` },
      { label: 'bottom radius', element: 'frame', canBeLinked: true, groupKey: 'tab-bottom-radius', variable: `--tabbar-${s}-tab-bottom-radius` },
      { label: 'border color', element: 'frame', canBeLinked: true, groupKey: 'tab-border-color', variable: `--tabbar-${s}-tab-border-color` },
      { label: 'border width', element: 'frame', canBeLinked: true, groupKey: 'tab-border-width', variable: `--tabbar-${s}-tab-border-width` },
      { label: 'padding', element: 'frame', canBeLinked: true, groupKey: 'padding', variable: `--tabbar-${s}-padding` },
      { label: 'size', element: 'icon', canBeLinked: true, groupKey: 'icon-size', variable: `--tabbar-${s}-icon-size` },
      { label: 'color', element: 'indicator', groupKey: 'indicator-color', variable: `--tabbar-${s}-border` },
      { label: 'width', element: 'indicator', canBeLinked: true, groupKey: 'indicator-border-width', variable: `--tabbar-${s}-indicator-border-width` },
    ];
  }
  function tabStateTypeGroups(s: TabState): TypeGroupConfig[] {
    return [{
      legend: '',
      element: 'text',
      colorVariable: `--tabbar-${s}-text`,
      familyVariable: `--tabbar-${s}-text-font-family`,
      sizeVariable: `--tabbar-${s}-text-font-size`,
      weightVariable: `--tabbar-${s}-text-font-weight`,
      lineHeightVariable: `--tabbar-${s}-text-line-height`,
    }];
  }

  // One VariantGroup with the bar exposed as a state alongside the three tab
  // states (mirrors SegmentedControl's "control bar" + per-option states layout).
  const states: Record<string, Token[]> = {
    bar: [
      { label: 'divider color', groupKey: 'bar-divider', variable: '--tabbar-bar-divider' },
      { label: 'divider thickness', groupKey: 'bar-divider-thickness', variable: '--tabbar-bar-divider-thickness' },
      { label: 'space above', groupKey: 'bar-top-margin', variable: '--tabbar-bar-top-margin' },
      // Consumed via `padding-bottom: var(--tabbar-bar-bottom-padding)` — a
      // one-axis read. Splitting would produce top/left/right values that have
      // nowhere to render.
      { label: 'space below tabs', groupKey: 'bar-bottom-padding', variable: '--tabbar-bar-bottom-padding', splittable: false },
      { label: 'space under divider', groupKey: 'bar-bottom-margin', variable: '--tabbar-bar-bottom-margin' },
      { label: 'tab gap', groupKey: 'tab-gap', variable: '--tabbar-tab-gap' },
    ],
    ...Object.fromEntries(tabStateNames.map((s) => [`${s} tab`, tabStateTokens(s)])),
  };
  const typeGroups: Record<string, TypeGroupConfig[]> = Object.fromEntries(
    tabStateNames.map((s) => [`${s} tab`, tabStateTypeGroups(s)]),
  );
  const tabTypeGroupTokens: Token[] = tabStateNames.flatMap((s) => [
    { label: 'font family', canBeLinked: true, groupKey: 'font-family', variable: `--tabbar-${s}-text-font-family` },
    { label: 'font size', canBeLinked: true, groupKey: 'font-size', variable: `--tabbar-${s}-text-font-size` },
    { label: 'font weight', canBeLinked: true, groupKey: 'font-weight', variable: `--tabbar-${s}-text-font-weight` },
    { label: 'line height', canBeLinked: true, groupKey: 'line-height', variable: `--tabbar-${s}-text-line-height` },
  ]);
  export const allTokens: Token[] = [
    ...Object.values(states).flat(),
    ...buildTypeGroupColorTokens(typeGroups, { component, variants: [...tabStateNames] }),
    ...tabTypeGroupTokens,
  ];

  // Linking: shape props across tab states (same tab object).
  const linkableContexts = new Map<string, string>([
    ...tabStateNames.flatMap((s) => [
    [`--tabbar-${s}-tab-border-color`, `${s} tab`] as const,
    [`--tabbar-${s}-tab-border-width`, `${s} tab`] as const,
    [`--tabbar-${s}-tab-top-radius`, `${s} tab`] as const,
    [`--tabbar-${s}-tab-bottom-radius`, `${s} tab`] as const,
    [`--tabbar-${s}-padding`, `${s} tab`] as const,
    [`--tabbar-${s}-icon-size`, `${s} tab`] as const,
    [`--tabbar-${s}-text-font-family`, `${s} tab`] as const,
    [`--tabbar-${s}-text-font-size`, `${s} tab`] as const,
    [`--tabbar-${s}-text-font-weight`, `${s} tab`] as const,
    [`--tabbar-${s}-text-line-height`, `${s} tab`] as const,
  ]),
  ]);

  // The hover tint is off unless a project turns it on: the gate holds a
  // transparent layer, a no-op, until it holds the tint itself.
  export const intrinsics: IntrinsicSpec[] = [
    {
      key: 'hover-tint',
      variants: ['default'],
      variable: () => '--tabbar-hover-tint-enabled',
      values: ['var(--color-transparent)', 'var(--tabbar-hover-tint)'],
      default: { default: 'var(--color-transparent)' },
    },
  ];
</script>

<script lang="ts">
  import TabBar from '../../system/components/TabBar.svelte';
  import VariantGroup from './scaffolding/VariantGroup.svelte';
  import ComponentEditorBase from './scaffolding/ComponentEditorBase.svelte';
  import { editorState, setComponentAlias, clearComponentAlias } from '../core/store/editorStore';
  import { computeLinkedBlock, withLinkedDisabled } from './scaffolding/linkedBlock';
  import Toggle from '../ui/Toggle.svelte';
  import UIPaletteSelector from '../ui/UIPaletteSelector.svelte';

  // One switch. Turning the tint on also stands each hover surface down to its
  // own base, so hover is the tint alone rather than a swap wearing a wash.
  // Written as aliases rather than gated in CSS: a component token's value is
  // substituted at :root, so it can never name a per-variant private var.
  // Off clears the overrides, returning each surface to its shipped default.
  const HOVER_SWAPS: readonly (readonly [hover: string, base: string])[] = [
    ['--tabbar-hover-surface', '--tabbar-default-surface'],
  ];
  const TINT_ON = 'var(--tabbar-hover-tint)';
  const TINT_OFF = 'var(--color-transparent)';

  let tintOn = $derived.by(() => {
    const ref = $editorState.components.tabbar?.aliases['--tabbar-hover-tint-enabled'];
    return (ref?.kind === 'literal' ? ref.value : TINT_OFF) === TINT_ON;
  });

  function setTintOn(checked: boolean) {
    setComponentAlias('tabbar', '--tabbar-hover-tint-enabled', {
      kind: 'literal',
      value: checked ? TINT_ON : TINT_OFF,
    });
    for (const [hover, base] of HOVER_SWAPS) {
      if (checked) setComponentAlias('tabbar', hover, { kind: 'token', name: base });
      else clearComponentAlias('tabbar', hover);
    }
  }

  let selectedDemoTab = $state('overview');
  const demoTabs = [
    { id: 'overview', label: 'Overview', icon: 'fas fa-home' },
    { id: 'details', label: 'Details', icon: 'fas fa-info-circle' },
    { id: 'settings', label: 'Settings', icon: 'fas fa-cog' },
    { id: 'disabled', label: 'Disabled', icon: 'fas fa-ban', disabled: true },
  ];

  let linked = $derived(computeLinkedBlock(component, linkableContexts, allTokens, $editorState));

  let visibleStates = $derived(Object.fromEntries(
    Object.entries(states).map(([name, list]) => [
      name,
      withLinkedDisabled(list, linked.varSet).map((t) =>
        tintOn && t.variable.endsWith('-hover-surface') ? { ...t, disabled: true } : t,
      ),
    ]),
  ) as Record<string, Token[]>);
</script>

<ComponentEditorBase {component} title="Tab Bar" description="Tab navigation with icon support and disabled state." tokens={allTokens} {linked}>
  <VariantGroup
    name="tabbar"
    title="Tab Bar"
    states={visibleStates}
    {typeGroups}
    {component}
    
  >
    {#snippet extraPropertyRows(stateName)}
      {#if stateName === 'hover tab'}
        <div class="property-row" data-token-variables="--tabbar-hover-tint-enabled">
          <span class="property-label">tint layer</span>
          <Toggle checked={tintOn} onchange={setTintOn} />
        </div>
        {#if tintOn}
          <div class="property-row">
            <span class="property-label">tint color</span>
            <UIPaletteSelector variable="--tabbar-hover-tint" {component} showNone={false} />
          </div>
        {/if}
      {/if}
    {/snippet}
    {#snippet children({ activeState })}
        {@const forceClass = activeState === 'hover tab' ? 'force-hover' : ''}
      <TabBar tabs={demoTabs} selectedTab={selectedDemoTab} class={forceClass} on:tabChange={(e) => (selectedDemoTab = e.detail)} />
      <div class="tab-content-demo">
        <p style="margin: 0;">placeholder tab content</p>
      </div>
          {/snippet}
    </VariantGroup>
</ComponentEditorBase>

<style>
  .tab-content-demo {
    width: 100%;
    padding: var(--space-16);
    color: var(--ui-text-secondary);
    background: var(--ui-surface-low);
  }
</style>
