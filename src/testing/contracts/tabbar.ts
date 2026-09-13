import type { ComponentContract, PaintMap } from '../componentContract';

/**
 * `full` adds `lineHeight`. `assertPaintsFromToken` (properties) drives a
 * controlled pixel probe, so a unitless line-height round-trips fine there;
 * `assertPaintMap` (states) reads the token's real, already-resolved value
 * through `normalize()`, which cannot recompute a unitless multiplier outside
 * the tab's own font-size context. States skip it; properties cover it.
 */
function tabPaints(part: string, iconPart: string, s: string, full: boolean): PaintMap {
  const tab: PaintMap[string] = {
    backgroundColor: `--tabbar-${s}-surface`,
    borderTopColor: `--tabbar-${s}-tab-border-color`,
    borderTopWidth: `--tabbar-${s}-tab-border-width`,
    borderBottomColor: `--tabbar-${s}-border`,
    borderBottomWidth: `--tabbar-${s}-indicator-width`,
    borderTopLeftRadius: `--tabbar-${s}-tab-top-radius`,
    borderBottomLeftRadius: `--tabbar-${s}-tab-bottom-radius`,
    paddingTop: `--tabbar-${s}-padding`,
    color: `--tabbar-${s}-text`,
    fontFamily: `--tabbar-${s}-text-font-family`,
    fontSize: `--tabbar-${s}-text-font-size`,
    fontWeight: `--tabbar-${s}-text-font-weight`,
  };
  if (full) tab.lineHeight = `--tabbar-${s}-text-line-height`;
  return {
    [part]: tab,
    [iconPart]: { fontSize: `--tabbar-${s}-icon-size` },
  };
}

const behaviorTabs = [
  { id: 'one', label: 'One' },
  { id: 'two', label: 'Two' },
];

export const tabBarContract: ComponentContract = {
  id: 'tabbar',
  origin: 'system',
  root: 'root',
  parts: {
    root: '.tab-bar',
    tab: '.tab:not(.selected):not(:disabled)',
    icon: '.tab:not(.selected):not(:disabled) i',
    selectedTab: '.tab.selected',
    selectedIcon: '.tab.selected i',
    disabledTab: '.tab:disabled',
    disabledIcon: '.tab:disabled i',
    // Position-stable: clicking `tab` (".tab:not(.selected)") makes that very
    // tab selected, which would invalidate that selector out from under a
    // focus check re-resolved after the click.
    secondTab: '.tab:nth-of-type(2)',
  },
  properties: [
    {
      state: 'bar',
      paints: {
        root: {
          borderBottomColor: '--tabbar-bar-hairline-color',
          borderBottomWidth: '--tabbar-bar-hairline-width',
          marginTop: '--tabbar-bar-top-margin',
          paddingBottom: '--tabbar-bar-bottom-padding',
          marginBottom: '--tabbar-bar-bottom-margin',
          columnGap: '--tabbar-tab-gap',
        },
      },
    },
    { state: 'default tab', paints: tabPaints('tab', 'icon', 'default', true) },
    { state: 'hover tab', paints: tabPaints('tab', 'icon', 'hover', true) },
    { state: 'selected tab', paints: tabPaints('selectedTab', 'selectedIcon', 'selected', true) },
    { state: 'disabled tab', paints: tabPaints('disabledTab', 'disabledIcon', 'disabled', true) },
  ],
  states: [
    { state: 'bar' },
    { state: 'default tab', paints: tabPaints('tab', 'icon', 'default', false) },
    { state: 'hover tab', paints: tabPaints('tab', 'icon', 'hover', false) },
    { state: 'selected tab', paints: tabPaints('selectedTab', 'selectedIcon', 'selected', false) },
    {
      state: 'disabled tab',
      attributes: { disabledTab: { disabled: '' } },
      paints: tabPaints('disabledTab', 'disabledIcon', 'disabled', false),
    },
  ],
  uncovered: {
    '--tabbar-hover-tint': 'consumed inside a background-image tint wash, never appearing verbatim in a computed style',
    '--tabbar-hover-tint-enabled': 'the gate for the tint wash above, same limitation',
  },
  persistence: {
    cases: [
      {
        shape: 'token',
        state: 'default tab',
        variable: '--tabbar-default-tab-border-width',
        observe: { part: 'tab', css: 'borderTopWidth' },
      },
    ],
    resetVariable: '--tabbar-default-tab-border-width',
  },
  theme: {
    theme: 'halloween',
    // The indicator width is the canary for re-migration replay: the tabbar
    // pair (2026-05-29-tabbar-indicator-thickness-to-per-state-width,
    // 2026-09-07-stroke-role-renames) rewrites it to --border-width-2 if a
    // reader migrates a theme-embedded config off a stamp of 0 instead of the
    // theme's componentSchemaVersion.
    changed: [
      '--tabbar-default-tab-border-width',
      '--tabbar-default-padding',
      '--tabbar-default-indicator-width',
    ],
    unchanged: ['--tabbar-default-icon-size'],
    aliasedTo: {
      '--tabbar-default-tab-border-width': '--border-width-2',
      '--tabbar-default-indicator-width': '--border-width-4',
    },
    observe: { part: 'tab', css: 'borderTopWidth', variable: '--tabbar-default-tab-border-width' },
  },
  interaction: {
    part: 'secondTab',
    role: 'button',
    cases: [
      {
        name: 'clicking a tab focuses it',
        action: { kind: 'click', part: 'secondTab' },
        expect: { kind: 'focused', part: 'secondTab', value: true },
      },
      {
        name: 'a disabled tab refuses focus',
        state: 'disabled tab',
        action: { kind: 'click', part: 'disabledTab' },
        expect: { kind: 'focused', part: 'disabledTab', value: false },
      },
    ],
  },
  behavior: {
    cases: [
      {
        name: 'clicking a tab asks for it',
        props: { tabs: behaviorTabs, selectedTab: 'one' },
        action: { kind: 'click', part: 'secondTab' },
        expect: { kind: 'callback', prop: 'ontabChange', args: ['two'] },
      },
      {
        name: 'clicking leaves the selection where the prop put it',
        props: { tabs: behaviorTabs, selectedTab: 'one' },
        action: { kind: 'click', part: 'secondTab' },
        expect: { kind: 'text', part: 'selectedTab', value: 'One' },
      },
      {
        name: 'a disabled tab stays silent',
        props: { tabs: [behaviorTabs[0], { ...behaviorTabs[1], disabled: true }], selectedTab: 'one' },
        action: { kind: 'click', part: 'secondTab' },
        expect: { kind: 'no-callback', prop: 'ontabChange' },
      },
    ],
  },
  sketch: {
    style: 'pencil',
    parts: [
      { part: 'tab', fill: '--tabbar-default-surface', stroke: '--tabbar-default-border' },
      { part: 'selectedTab', fill: '--tabbar-selected-surface', stroke: '--tabbar-selected-border' },
    ],
  },
};
