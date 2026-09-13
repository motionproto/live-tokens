import type { Migration } from './index';

/**
 * Selection says selected (2026-09-13).
 *
 * `active` carried two senses: pressed, from `:active`, on Button and
 * IconButton, and selected on RadioButton, TabBar, and SideNavigation. These
 * three components hold a selection, so their state segment now reads
 * `selected` and `active` survives as the pressed state only. Button's and
 * IconButton's `--*-active-*` are pressed and never move. Values are
 * unchanged, so this is a pure key rename.
 */
const RADIOBUTTON_SUFFIXES = [
  'dot-border-color',
  'dot-border-width',
  'dot-fill',
  'dot-size',
  'label',
  'label-font-family',
  'label-font-size',
  'label-font-weight',
  'label-line-height',
];

const TABBAR_SUFFIXES = [
  'border',
  'icon-size',
  'indicator-width',
  'padding',
  'surface',
  'tab-border-color',
  'tab-border-width',
  'tab-bottom-radius',
  'tab-top-radius',
  'text',
  'text-font-family',
  'text-font-size',
  'text-font-weight',
  'text-line-height',
];

const SIDENAVIGATION_SUFFIXES: Record<string, string[]> = {
  title: [
    'accent',
    'accent-width',
    'border',
    'border-width',
    'label',
    'label-font-family',
    'label-font-size',
    'label-font-weight',
    'label-line-height',
    'padding',
    'surface',
  ],
  section: [
    'accent',
    'accent-width',
    'surface',
    'text',
    'text-font-family',
    'text-font-size',
    'text-font-weight',
    'text-line-height',
  ],
  item: [
    'accent',
    'accent-width',
    'padding',
    'surface',
    'text',
    'text-font-family',
    'text-font-size',
    'text-font-weight',
    'text-line-height',
  ],
  footer: [
    'accent',
    'accent-width',
    'gap',
    'icon',
    'icon-size',
    'padding',
    'surface',
    'text',
    'text-font-family',
    'text-font-size',
    'text-font-weight',
    'text-line-height',
  ],
};

const RENAMES: Record<string, Record<string, string>> = {
  radiobutton: Object.fromEntries(
    RADIOBUTTON_SUFFIXES.map((s) => [`--radiobutton-active-${s}`, `--radiobutton-selected-${s}`]),
  ),
  tabbar: Object.fromEntries(
    TABBAR_SUFFIXES.map((s) => [`--tabbar-active-${s}`, `--tabbar-selected-${s}`]),
  ),
  sidenavigation: Object.fromEntries(
    Object.entries(SIDENAVIGATION_SUFFIXES).flatMap(([part, suffixes]) =>
      suffixes.map((s) => [
        `--sidenavigation-${part}-active-${s}`,
        `--sidenavigation-${part}-selected-${s}`,
      ]),
    ),
  ),
};

export const componentMigration_2026_09_13_selectedState: Migration = {
  id: '2026-09-13-selected-state',
  fromVersion: 27,
  toVersion: 28,
  appliesTo: 'component-config',
  apply(rawVars, meta) {
    const renames = meta.component ? RENAMES[meta.component] : undefined;
    if (!renames) return { ...rawVars };
    const out: Record<string, string> = {};
    for (const [key, value] of Object.entries(rawVars)) {
      out[renames[key] ?? key] = value;
    }
    return out;
  },
};
