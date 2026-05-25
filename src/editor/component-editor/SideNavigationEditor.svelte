<script module lang="ts">
  import { buildTypeGroupColorTokens } from './scaffolding/buildTypeGroupTokens';
  import type { Token, TypeGroupConfig } from './scaffolding/types';

  export const component = 'sidenavigation';

  // Single-variant component with five structural parts. Three of them (Title,
  // Item, Footer) carry default/hover/active interaction sub-states; Toggle
  // carries default/hover. Panel is geometry only. Keys use the " / " convention
  // VariantGroup recognises for two-tier parts/state strips.
  const STATEFUL_STATES = ['default', 'hover', 'active'] as const;
  const TOGGLE_STATES = ['default', 'hover'] as const;
  type StatefulState = typeof STATEFUL_STATES[number];
  type ToggleState = typeof TOGGLE_STATES[number];

  const STATE_LABELS: Record<string, string> = {
    default: 'Default',
    hover: 'Hover',
    active: 'Active',
  };

  // --- Panel --------------------------------------------------------------
  const panelTokens: Token[] = [
    { label: 'surface color', groupKey: 'panel-surface', variable: '--sidenavigation-panel-surface' },
    { label: 'border color', groupKey: 'panel-border', variable: '--sidenavigation-panel-border' },
    { label: 'border width', canBeLinked: true, groupKey: 'border-width', variable: '--sidenavigation-panel-border-width' },
    { label: 'padding', canBeLinked: true, groupKey: 'padding', variable: '--sidenavigation-panel-padding' },
    { label: 'section gap', groupKey: 'panel-section-gap', variable: '--sidenavigation-panel-section-gap' },
    { label: 'item indent', splittable: false, groupKey: 'panel-item-padding', variable: '--sidenavigation-panel-item-padding' },
    { label: 'footer gap', groupKey: 'panel-footer-gap', variable: '--sidenavigation-panel-footer-gap' },
  ];

  // --- Title --------------------------------------------------------------
  function titleStateTokens(s: StatefulState): Token[] {
    return [
      { label: 'surface color', groupKey: 'title-surface', variable: `--sidenavigation-title-${s}-surface` },
      { label: 'divider color', groupKey: 'title-border', variable: `--sidenavigation-title-${s}-border` },
      { label: 'divider width', canBeLinked: true, groupKey: 'title-border-width', variable: `--sidenavigation-title-${s}-border-width` },
      { label: 'padding', canBeLinked: true, groupKey: 'title-padding', variable: `--sidenavigation-title-${s}-padding` },
      { label: 'indicator color', groupKey: 'title-indicator', variable: `--sidenavigation-title-${s}-indicator` },
      { label: 'indicator width', canBeLinked: true, groupKey: 'title-indicator-width', variable: `--sidenavigation-title-${s}-indicator-width` },
    ];
  }
  function titleStateTypeGroups(s: StatefulState): TypeGroupConfig[] {
    return [{
      legend: 'title label',
      colorVariable: `--sidenavigation-title-${s}-label`,
      familyVariable: `--sidenavigation-title-${s}-label-font-family`,
      sizeVariable: `--sidenavigation-title-${s}-label-font-size`,
      weightVariable: `--sidenavigation-title-${s}-label-font-weight`,
      lineHeightVariable: `--sidenavigation-title-${s}-label-line-height`,
    }];
  }
  const titleTypographyTokens: Token[] = STATEFUL_STATES.flatMap((s) => [
    { label: 'font family', canBeLinked: true, groupKey: 'title-label-font-family', variable: `--sidenavigation-title-${s}-label-font-family` },
    { label: 'font size', canBeLinked: true, groupKey: 'title-label-font-size', variable: `--sidenavigation-title-${s}-label-font-size` },
    { label: 'font weight', canBeLinked: true, groupKey: 'title-label-font-weight', variable: `--sidenavigation-title-${s}-label-font-weight` },
    { label: 'line height', canBeLinked: true, groupKey: 'title-label-line-height', variable: `--sidenavigation-title-${s}-label-line-height` },
  ]);

  // --- Toggle -------------------------------------------------------------
  function toggleStateTokens(s: ToggleState): Token[] {
    return [
      { label: 'surface color', groupKey: 'toggle-surface', variable: `--sidenavigation-toggle-${s}-surface` },
      { label: 'border color', groupKey: 'toggle-border', variable: `--sidenavigation-toggle-${s}-border` },
      { label: 'border width', canBeLinked: true, groupKey: 'toggle-border-width', variable: `--sidenavigation-toggle-${s}-border-width` },
      { label: 'corner radius', canBeLinked: true, groupKey: 'toggle-radius', variable: `--sidenavigation-toggle-${s}-radius` },
      { label: 'padding', canBeLinked: true, groupKey: 'toggle-padding', variable: `--sidenavigation-toggle-${s}-padding` },
      { label: 'icon color', groupKey: 'toggle-icon', variable: `--sidenavigation-toggle-${s}-icon` },
      { label: 'icon size', canBeLinked: true, groupKey: 'toggle-icon-size', variable: `--sidenavigation-toggle-${s}-icon-size` },
    ];
  }

  // --- Item ---------------------------------------------------------------
  function itemStateTokens(s: StatefulState): Token[] {
    return [
      { label: 'surface color', groupKey: 'item-surface', variable: `--sidenavigation-item-${s}-surface` },
      { label: 'padding', canBeLinked: true, groupKey: 'item-padding', variable: `--sidenavigation-item-${s}-padding` },
      { label: 'indicator color', groupKey: 'item-indicator', variable: `--sidenavigation-item-${s}-indicator` },
      { label: 'indicator width', canBeLinked: true, groupKey: 'item-indicator-width', variable: `--sidenavigation-item-${s}-indicator-width` },
    ];
  }
  function itemStateTypeGroups(s: StatefulState): TypeGroupConfig[] {
    return [{
      legend: 'item text',
      colorVariable: `--sidenavigation-item-${s}-text`,
      familyVariable: `--sidenavigation-item-${s}-text-font-family`,
      sizeVariable: `--sidenavigation-item-${s}-text-font-size`,
      weightVariable: `--sidenavigation-item-${s}-text-font-weight`,
      lineHeightVariable: `--sidenavigation-item-${s}-text-line-height`,
    }];
  }
  const itemTypographyTokens: Token[] = STATEFUL_STATES.flatMap((s) => [
    { label: 'font family', canBeLinked: true, groupKey: 'item-text-font-family', variable: `--sidenavigation-item-${s}-text-font-family` },
    { label: 'font size', canBeLinked: true, groupKey: 'item-text-font-size', variable: `--sidenavigation-item-${s}-text-font-size` },
    { label: 'font weight', canBeLinked: true, groupKey: 'item-text-font-weight', variable: `--sidenavigation-item-${s}-text-font-weight` },
    { label: 'line height', canBeLinked: true, groupKey: 'item-text-line-height', variable: `--sidenavigation-item-${s}-text-line-height` },
  ]);

  // --- Footer -------------------------------------------------------------
  function footerStateTokens(s: StatefulState): Token[] {
    return [
      { label: 'surface color', groupKey: 'footer-surface', variable: `--sidenavigation-footer-${s}-surface` },
      { label: 'padding', canBeLinked: true, groupKey: 'footer-padding', variable: `--sidenavigation-footer-${s}-padding` },
      { label: 'icon gap', groupKey: 'footer-gap', variable: `--sidenavigation-footer-${s}-gap` },
      { label: 'indicator color', groupKey: 'footer-indicator', variable: `--sidenavigation-footer-${s}-indicator` },
      { label: 'indicator width', canBeLinked: true, groupKey: 'footer-indicator-width', variable: `--sidenavigation-footer-${s}-indicator-width` },
      { label: 'icon color', groupKey: 'footer-icon', variable: `--sidenavigation-footer-${s}-icon` },
      { label: 'icon size', canBeLinked: true, groupKey: 'footer-icon-size', variable: `--sidenavigation-footer-${s}-icon-size` },
    ];
  }
  function footerStateTypeGroups(s: StatefulState): TypeGroupConfig[] {
    return [{
      legend: 'footer text',
      colorVariable: `--sidenavigation-footer-${s}-text`,
      familyVariable: `--sidenavigation-footer-${s}-text-font-family`,
      sizeVariable: `--sidenavigation-footer-${s}-text-font-size`,
      weightVariable: `--sidenavigation-footer-${s}-text-font-weight`,
      lineHeightVariable: `--sidenavigation-footer-${s}-text-line-height`,
    }];
  }
  const footerTypographyTokens: Token[] = STATEFUL_STATES.flatMap((s) => [
    { label: 'font family', canBeLinked: true, groupKey: 'footer-text-font-family', variable: `--sidenavigation-footer-${s}-text-font-family` },
    { label: 'font size', canBeLinked: true, groupKey: 'footer-text-font-size', variable: `--sidenavigation-footer-${s}-text-font-size` },
    { label: 'font weight', canBeLinked: true, groupKey: 'footer-text-font-weight', variable: `--sidenavigation-footer-${s}-text-font-weight` },
    { label: 'line height', canBeLinked: true, groupKey: 'footer-text-line-height', variable: `--sidenavigation-footer-${s}-text-line-height` },
  ]);

  // Assemble part/state map. " / " separator triggers the two-tier strip.
  const states: Record<string, Token[]> = {
    'Panel': panelTokens,
    ...Object.fromEntries(STATEFUL_STATES.map((s) => [`Title / ${STATE_LABELS[s]}`, titleStateTokens(s)])),
    ...Object.fromEntries(TOGGLE_STATES.map((s) => [`Toggle / ${STATE_LABELS[s]}`, toggleStateTokens(s)])),
    ...Object.fromEntries(STATEFUL_STATES.map((s) => [`Item / ${STATE_LABELS[s]}`, itemStateTokens(s)])),
    ...Object.fromEntries(STATEFUL_STATES.map((s) => [`Footer / ${STATE_LABELS[s]}`, footerStateTokens(s)])),
  };
  const typeGroups: Record<string, TypeGroupConfig[]> = {
    ...Object.fromEntries(STATEFUL_STATES.map((s) => [`Title / ${STATE_LABELS[s]}`, titleStateTypeGroups(s)])),
    ...Object.fromEntries(STATEFUL_STATES.map((s) => [`Item / ${STATE_LABELS[s]}`, itemStateTypeGroups(s)])),
    ...Object.fromEntries(STATEFUL_STATES.map((s) => [`Footer / ${STATE_LABELS[s]}`, footerStateTypeGroups(s)])),
  };

  export const allTokens: Token[] = [
    ...Object.values(states).flat(),
    ...buildTypeGroupColorTokens(typeGroups),
    ...titleTypographyTokens,
    ...itemTypographyTokens,
    ...footerTypographyTokens,
  ];

  // Link contexts: within each part, the per-state values share a link tree so
  // a single edit can fan padding/border-width/typography across default/hover/active.
  const linkableContexts = new Map<string, string>([
    ...STATEFUL_STATES.flatMap((s): Array<[string, string]> => [
      [`--sidenavigation-title-${s}-border-width`, `title ${s}`],
      [`--sidenavigation-title-${s}-padding`, `title ${s}`],
      [`--sidenavigation-title-${s}-indicator-width`, `title ${s}`],
      [`--sidenavigation-title-${s}-label-font-family`, `title ${s}`],
      [`--sidenavigation-title-${s}-label-font-size`, `title ${s}`],
      [`--sidenavigation-title-${s}-label-font-weight`, `title ${s}`],
      [`--sidenavigation-title-${s}-label-line-height`, `title ${s}`],
    ]),
    ...TOGGLE_STATES.flatMap((s): Array<[string, string]> => [
      [`--sidenavigation-toggle-${s}-border-width`, `toggle ${s}`],
      [`--sidenavigation-toggle-${s}-radius`, `toggle ${s}`],
      [`--sidenavigation-toggle-${s}-padding`, `toggle ${s}`],
      [`--sidenavigation-toggle-${s}-icon-size`, `toggle ${s}`],
    ]),
    ...STATEFUL_STATES.flatMap((s): Array<[string, string]> => [
      [`--sidenavigation-item-${s}-padding`, `item ${s}`],
      [`--sidenavigation-item-${s}-indicator-width`, `item ${s}`],
      [`--sidenavigation-item-${s}-text-font-family`, `item ${s}`],
      [`--sidenavigation-item-${s}-text-font-size`, `item ${s}`],
      [`--sidenavigation-item-${s}-text-font-weight`, `item ${s}`],
      [`--sidenavigation-item-${s}-text-line-height`, `item ${s}`],
    ]),
    ...STATEFUL_STATES.flatMap((s): Array<[string, string]> => [
      [`--sidenavigation-footer-${s}-padding`, `footer ${s}`],
      [`--sidenavigation-footer-${s}-indicator-width`, `footer ${s}`],
      [`--sidenavigation-footer-${s}-icon-size`, `footer ${s}`],
      [`--sidenavigation-footer-${s}-text-font-family`, `footer ${s}`],
      [`--sidenavigation-footer-${s}-text-font-size`, `footer ${s}`],
      [`--sidenavigation-footer-${s}-text-font-weight`, `footer ${s}`],
      [`--sidenavigation-footer-${s}-text-line-height`, `footer ${s}`],
    ]),
    ['--sidenavigation-panel-border-width', 'panel'],
    ['--sidenavigation-panel-padding', 'panel'],
  ]);
</script>

<script lang="ts">
  import SideNavigation, { type SideNavSection, type SideNavFooter } from '../../system/components/SideNavigation.svelte';
  import VariantGroup from './scaffolding/VariantGroup.svelte';
  import ComponentEditorBase from './scaffolding/ComponentEditorBase.svelte';
  import { editorState } from '../core/store/editorStore';
  import { computeLinkedBlock, withLinkedDisabled } from './scaffolding/linkedBlock';

  const demoSections: SideNavSection[] = [
    {
      path: 'learn',
      title: 'Learn to Play',
      items: [
        { path: 'learn/overview', title: 'Overview' },
        { path: 'learn/setup', title: 'Setup' },
        { path: 'learn/first-turn', title: 'Your First Turn' },
      ],
    },
    {
      path: 'rules',
      title: 'Rules Reference',
      items: [
        { path: 'rules/combat', title: 'Combat' },
        { path: 'rules/movement', title: 'Movement' },
      ],
    },
  ];
  const demoFooter: SideNavFooter = {
    path: 'license',
    title: 'License',
    icon: 'fa-solid fa-file-lines',
  };

  let linked = $derived(computeLinkedBlock(component, linkableContexts, allTokens, $editorState));

  let visibleStates = $derived(Object.fromEntries(
    Object.entries(states).map(([name, list]) => [name, withLinkedDisabled(list, linked.varSet)]),
  ) as Record<string, Token[]>);

  // Map the active part/state to the demo's force-hover / force-active hooks
  // so token edits always have a row painted in that state for the viewer.
  function deriveForce(activeState: string) {
    const [part, sub] = activeState.includes(' / ') ? activeState.split(' / ') : [activeState, ''];
    const partKey = part.toLowerCase();
    const subKey = sub.toLowerCase();
    let forceHoverPart: 'title' | 'toggle' | 'item' | 'footer' | null = null;
    let forceActivePart: 'title' | 'item' | 'footer' | null = null;
    if (subKey === 'hover' && (partKey === 'title' || partKey === 'toggle' || partKey === 'item' || partKey === 'footer')) {
      forceHoverPart = partKey;
    } else if (subKey === 'active' && (partKey === 'title' || partKey === 'item' || partKey === 'footer')) {
      forceActivePart = partKey;
    }
    return { forceHoverPart, forceActivePart };
  }
</script>

<ComponentEditorBase
  {component}
  title="Side Navigation"
  description="Collapsible left panel with title header, sections, sub-page links, and an optional footer link."
  tokens={allTokens}
  {linked}
>
  <VariantGroup
    name="sidenavigation"
    title="Side Navigation"
    states={visibleStates}
    {typeGroups}
    {component}
    selectorLabel="Part"
  >
    {#snippet children({ activeState })}
      {@const { forceHoverPart, forceActivePart } = deriveForce(activeState)}
      <div class="sn-preview-frame">
        <SideNavigation
          sections={demoSections}
          footer={demoFooter}
          titleLabel="Reignmaker"
          titleHref="#"
          currentPath="learn/setup"
          open={true}
          {forceHoverPart}
          {forceActivePart}
        />
      </div>
    {/snippet}
  </VariantGroup>
</ComponentEditorBase>

<style>
  /* Bound the preview to a sidebar-shaped column so the panel's flex layout
     resolves to a realistic width inside the canvas. */
  .sn-preview-frame {
    width: 16rem;
    min-height: 26rem;
    display: flex;
    align-items: stretch;
  }
  .sn-preview-frame :global(.sidenavigation) {
    flex: 1;
    height: auto;
  }
</style>
