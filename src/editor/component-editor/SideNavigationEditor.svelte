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

  // --- Animation ----------------------------------------------------------
  const animationTokens: Token[] = [
    { label: 'open duration', groupKey: 'open-duration', variable: '--sidenavigation-open-duration' },
    { label: 'open easing', groupKey: 'open-easing', variable: '--sidenavigation-open-easing' },
    { label: 'close duration', groupKey: 'close-duration', variable: '--sidenavigation-close-duration' },
    { label: 'close easing', groupKey: 'close-easing', variable: '--sidenavigation-close-easing' },
  ];

  // --- Title --------------------------------------------------------------
  // Title is a flex card containing the label box + toggle box. Per-state
  // tokens drive the card chrome (surface, border, padding); stateless gap
  // and radius live in `titleLayoutTokens` since they don't vary across
  // default/hover/active.
  function titleStateTokens(s: StatefulState): Token[] {
    return [
      { label: 'surface color', groupKey: 'title-surface', variable: `--sidenavigation-title-${s}-surface` },
      { label: 'border color', groupKey: 'title-border', variable: `--sidenavigation-title-${s}-border` },
      { label: 'border width', canBeLinked: true, groupKey: 'title-border-width', variable: `--sidenavigation-title-${s}-border-width` },
      { label: 'padding', canBeLinked: true, groupKey: 'title-padding', variable: `--sidenavigation-title-${s}-padding` },
    ];
  }
  const titleLayoutTokens: Token[] = [
    { label: 'gap', canBeLinked: true, groupKey: 'title-gap', variable: '--sidenavigation-title-gap' },
    { label: 'corner radius', canBeLinked: true, groupKey: 'title-radius', variable: '--sidenavigation-title-radius' },
  ];
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
  // Title label — structural inner box (stateless, like Panel). Sits inside
  // the title bar so the header reads as: outer bar → [label box] [toggle box].
  const titleLabelTokens: Token[] = [
    { label: 'surface color', groupKey: 'title-label-surface', variable: '--sidenavigation-title-label-surface' },
    { label: 'corner radius', canBeLinked: true, groupKey: 'title-label-radius', variable: '--sidenavigation-title-label-radius' },
    { label: 'padding', canBeLinked: true, groupKey: 'title-label-padding', variable: '--sidenavigation-title-label-padding' },
  ];

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

  // --- Section ------------------------------------------------------------
  // Section header is a CollapsibleSection wrapped in `.sn-section-header`;
  // the wrapper paints surface + left indicator and forwards section text
  // tokens into the inner CollapsibleSection (chromeless variant) by
  // shadowing its slots, so section typography is editable per-state
  // without modifying CollapsibleSection itself.
  function sectionStateTokens(s: StatefulState): Token[] {
    return [
      { label: 'surface color', groupKey: 'section-surface', variable: `--sidenavigation-section-${s}-surface` },
      { label: 'indicator color', groupKey: 'section-accent', variable: `--sidenavigation-section-${s}-accent` },
      { label: 'indicator width', canBeLinked: true, groupKey: 'section-accent-width', variable: `--sidenavigation-section-${s}-accent-width` },
    ];
  }
  function sectionStateTypeGroups(s: StatefulState): TypeGroupConfig[] {
    return [{
      legend: 'section text',
      colorVariable: `--sidenavigation-section-${s}-text`,
      familyVariable: `--sidenavigation-section-${s}-text-font-family`,
      sizeVariable: `--sidenavigation-section-${s}-text-font-size`,
      weightVariable: `--sidenavigation-section-${s}-text-font-weight`,
      lineHeightVariable: `--sidenavigation-section-${s}-text-line-height`,
    }];
  }
  const sectionTypographyTokens: Token[] = STATEFUL_STATES.flatMap((s) => [
    { label: 'font family', canBeLinked: true, groupKey: 'section-text-font-family', variable: `--sidenavigation-section-${s}-text-font-family` },
    { label: 'font size', canBeLinked: true, groupKey: 'section-text-font-size', variable: `--sidenavigation-section-${s}-text-font-size` },
    { label: 'font weight', canBeLinked: true, groupKey: 'section-text-font-weight', variable: `--sidenavigation-section-${s}-text-font-weight` },
    { label: 'line height', canBeLinked: true, groupKey: 'section-text-line-height', variable: `--sidenavigation-section-${s}-text-line-height` },
  ]);

  // --- Item ---------------------------------------------------------------
  function itemStateTokens(s: StatefulState): Token[] {
    return [
      { label: 'surface color', groupKey: 'item-surface', variable: `--sidenavigation-item-${s}-surface` },
      { label: 'padding', canBeLinked: true, groupKey: 'item-padding', variable: `--sidenavigation-item-${s}-padding` },
      { label: 'indicator color', groupKey: 'item-accent', variable: `--sidenavigation-item-${s}-accent` },
      { label: 'indicator width', canBeLinked: true, groupKey: 'item-accent-width', variable: `--sidenavigation-item-${s}-accent-width` },
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
      { label: 'indicator color', groupKey: 'footer-accent', variable: `--sidenavigation-footer-${s}-accent` },
      { label: 'indicator width', canBeLinked: true, groupKey: 'footer-accent-width', variable: `--sidenavigation-footer-${s}-accent-width` },
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
    'Title Layout': titleLayoutTokens,
    'Title Label': titleLabelTokens,
    ...Object.fromEntries(TOGGLE_STATES.map((s) => [`Toggle / ${STATE_LABELS[s]}`, toggleStateTokens(s)])),
    ...Object.fromEntries(STATEFUL_STATES.map((s) => [`Section / ${STATE_LABELS[s]}`, sectionStateTokens(s)])),
    ...Object.fromEntries(STATEFUL_STATES.map((s) => [`Item / ${STATE_LABELS[s]}`, itemStateTokens(s)])),
    ...Object.fromEntries(STATEFUL_STATES.map((s) => [`Footer / ${STATE_LABELS[s]}`, footerStateTokens(s)])),
    'Animation': animationTokens,
  };
  const typeGroups: Record<string, TypeGroupConfig[]> = {
    ...Object.fromEntries(STATEFUL_STATES.map((s) => [`Title / ${STATE_LABELS[s]}`, titleStateTypeGroups(s)])),
    ...Object.fromEntries(STATEFUL_STATES.map((s) => [`Section / ${STATE_LABELS[s]}`, sectionStateTypeGroups(s)])),
    ...Object.fromEntries(STATEFUL_STATES.map((s) => [`Item / ${STATE_LABELS[s]}`, itemStateTypeGroups(s)])),
    ...Object.fromEntries(STATEFUL_STATES.map((s) => [`Footer / ${STATE_LABELS[s]}`, footerStateTypeGroups(s)])),
  };

  export const allTokens: Token[] = [
    ...Object.values(states).flat(),
    ...buildTypeGroupColorTokens(typeGroups),
    ...titleTypographyTokens,
    ...sectionTypographyTokens,
    ...itemTypographyTokens,
    ...footerTypographyTokens,
  ];

  // Link contexts: within each part, the per-state values share a link tree so
  // a single edit can fan padding/border-width/typography across default/hover/active.
  const linkableContexts = new Map<string, string>([
    ...STATEFUL_STATES.flatMap((s): Array<[string, string]> => [
      [`--sidenavigation-title-${s}-border-width`, `title ${s}`],
      [`--sidenavigation-title-${s}-padding`, `title ${s}`],
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
      [`--sidenavigation-section-${s}-accent-width`, `section ${s}`],
      [`--sidenavigation-section-${s}-text-font-family`, `section ${s}`],
      [`--sidenavigation-section-${s}-text-font-size`, `section ${s}`],
      [`--sidenavigation-section-${s}-text-font-weight`, `section ${s}`],
      [`--sidenavigation-section-${s}-text-line-height`, `section ${s}`],
    ]),
    ...STATEFUL_STATES.flatMap((s): Array<[string, string]> => [
      [`--sidenavigation-item-${s}-padding`, `item ${s}`],
      [`--sidenavigation-item-${s}-accent-width`, `item ${s}`],
      [`--sidenavigation-item-${s}-text-font-family`, `item ${s}`],
      [`--sidenavigation-item-${s}-text-font-size`, `item ${s}`],
      [`--sidenavigation-item-${s}-text-font-weight`, `item ${s}`],
      [`--sidenavigation-item-${s}-text-line-height`, `item ${s}`],
    ]),
    ...STATEFUL_STATES.flatMap((s): Array<[string, string]> => [
      [`--sidenavigation-footer-${s}-padding`, `footer ${s}`],
      [`--sidenavigation-footer-${s}-accent-width`, `footer ${s}`],
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
      path: 'section-1',
      title: 'Section 1',
      hasIndexPage: true,
      items: [
        { path: 'section-1/item-1', title: 'Item 1' },
        { path: 'section-1/item-2', title: 'Item 2' },
        { path: 'section-1/item-3', title: 'Item 3' },
      ],
    },
    {
      path: 'section-2',
      title: 'Section 2',
      hasIndexPage: true,
      items: [],
    },
  ];
  const demoFooter: SideNavFooter = {
    path: 'footer',
    title: 'Footer',
    icon: 'fa-solid fa-file-lines',
  };

  let linked = $derived(computeLinkedBlock(component, linkableContexts, allTokens, $editorState));
  let previewOpen = $state(true);

  let visibleStates = $derived(Object.fromEntries(
    Object.entries(states).map(([name, list]) => [name, withLinkedDisabled(list, linked.varSet)]),
  ) as Record<string, Token[]>);

  // Map the active part/state to the demo's force-hover / force-active hooks
  // so token edits always have a row painted in that state for the viewer.
  function deriveForce(activeState: string) {
    const [part, sub] = activeState.includes(' / ') ? activeState.split(' / ') : [activeState, ''];
    const partKey = part.toLowerCase();
    const subKey = sub.toLowerCase();
    let forceHoverPart: 'title' | 'toggle' | 'item' | 'footer' | 'section' | null = null;
    let forceActivePart: 'title' | 'item' | 'footer' | 'section' | null = null;
    if (subKey === 'hover' && (partKey === 'title' || partKey === 'toggle' || partKey === 'item' || partKey === 'footer' || partKey === 'section')) {
      forceHoverPart = partKey;
    } else if (subKey === 'active' && (partKey === 'title' || partKey === 'item' || partKey === 'footer' || partKey === 'section')) {
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
          titleLabel="Title"
          titleHref="#"
          currentPath="section-1/item-2"
          open={previewOpen}
          ontoggle={() => (previewOpen = !previewOpen)}
          {forceHoverPart}
          {forceActivePart}
        />
      </div>
    {/snippet}
  </VariantGroup>
</ComponentEditorBase>

<style>
  /* Frame reserves room for the panel at its widest (so collapse animates into
     empty space rather than reshaping the canvas), and lets the panel manage
     its own width via the open/closed tokens. */
  .sn-preview-frame {
    min-width: 16rem;
    min-height: 26rem;
    display: flex;
    align-items: stretch;
  }
  .sn-preview-frame :global(.sidenavigation) {
    height: auto;
  }
</style>
