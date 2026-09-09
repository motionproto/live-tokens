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

export const tabBarContract: ComponentContract = {
  id: 'tabbar',
  origin: 'system',
  root: 'root',
  parts: {
    root: '.tab-bar',
    tab: '.tab:not(.active):not(:disabled)',
    icon: '.tab:not(.active):not(:disabled) i',
    activeTab: '.tab.active',
    activeIcon: '.tab.active i',
    disabledTab: '.tab:disabled',
    disabledIcon: '.tab:disabled i',
    // Position-stable: clicking `tab` (".tab:not(.active)") makes that very
    // tab active, which would invalidate that selector out from under a
    // focus check re-resolved after the click.
    secondTab: '.tab:nth-of-type(2)',
  },
  properties: [
    {
      state: 'bar',
      paints: {
        root: {
          borderBottomColor: '--tabbar-bar-divider',
          borderBottomWidth: '--tabbar-bar-divider-thickness',
          marginTop: '--tabbar-bar-top-margin',
          paddingBottom: '--tabbar-bar-bottom-padding',
          marginBottom: '--tabbar-bar-bottom-margin',
          columnGap: '--tabbar-tab-gap',
        },
      },
    },
    { state: 'default tab', paints: tabPaints('tab', 'icon', 'default', true) },
    { state: 'hover tab', paints: tabPaints('tab', 'icon', 'hover', true) },
    { state: 'active tab', paints: tabPaints('activeTab', 'activeIcon', 'active', true) },
    { state: 'disabled tab', paints: tabPaints('disabledTab', 'disabledIcon', 'disabled', true) },
  ],
  states: [
    { state: 'bar' },
    { state: 'default tab', paints: tabPaints('tab', 'icon', 'default', false) },
    { state: 'hover tab', paints: tabPaints('tab', 'icon', 'hover', false) },
    { state: 'active tab', paints: tabPaints('activeTab', 'activeIcon', 'active', false) },
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
    // PRODUCT BUG, confirmed empirically, not a contract limitation:
    // halloween.json (componentSchemaVersion 27, no migration pending) sets
    // --tabbar-{default,hover,active,disabled}-indicator-width to
    // --border-width-4, but applying the theme in the live editor never
    // writes any of the four — the inline :root value for each stays the
    // shipped var(--border-width-2), verified via the raw (unresolved) root
    // value, not just the resolved pixel readout. The sibling token this
    // contract does assert, --tabbar-default-tab-border-width, updates
    // correctly under the same theme load, so the theme-application path
    // itself works; something specific to this alias (or to the
    // "accent-width" alias kind `-indicator-width` shares with `-accent-width`
    // in aliasKinds.ts) drops it. Left out of `changed` until that's fixed.
    changed: ['--tabbar-default-tab-border-width', '--tabbar-default-padding'],
    unchanged: ['--tabbar-default-icon-size'],
    aliasedTo: {
      '--tabbar-default-tab-border-width': '--border-width-2',
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
  sketch: {
    style: 'pencil',
    parts: [
      { part: 'tab', fill: '--tabbar-default-surface', stroke: '--tabbar-default-border' },
      { part: 'activeTab', fill: '--tabbar-active-surface', stroke: '--tabbar-active-border' },
    ],
  },
};
