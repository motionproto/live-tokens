import type { Migration } from './index';

/**
 * One hairline (2026-09-13).
 *
 * The graphic line a component draws between its parts was `-divider` on
 * Dialog, Table and TabBar, `-divider-color` on SegmentedControl, and
 * `-hairline-color` on SectionDivider and CollapsibleSection; its width was
 * `-divider-width` on two components and `-thickness` on four. Both now read
 * `-hairline-color` and `-hairline-width`, and SegmentedControl's inset reads
 * `-hairline-inset`. CollapsibleSection's `divider` variant is `hairline`, so
 * its whole variant namespace moves with it. Values are unchanged, so this is
 * a pure key rename.
 */
const COLLAPSIBLESECTION_SUFFIXES = [
  'surface',
  'hairline-color',
  'padding',
  'label',
  'label-font-family',
  'label-font-size',
  'label-font-weight',
  'label-line-height',
  'icon',
  'icon-size',
];

const COLLAPSIBLESECTION_STATES = ['default', 'hover'];

const RENAMES: Record<string, Record<string, string>> = {
  dialog: {
    '--dialog-header-divider': '--dialog-header-hairline-color',
    '--dialog-header-divider-width': '--dialog-header-hairline-width',
    '--dialog-footer-divider': '--dialog-footer-hairline-color',
    '--dialog-footer-divider-width': '--dialog-footer-hairline-width',
  },
  table: {
    '--table-default-header-divider': '--table-default-header-hairline-color',
    '--table-default-header-divider-width': '--table-default-header-hairline-width',
    '--table-default-row-divider': '--table-default-row-hairline-color',
    '--table-default-row-divider-width': '--table-default-row-hairline-width',
    '--table-default-column-divider': '--table-default-column-hairline-color',
    '--table-default-column-divider-width': '--table-default-column-hairline-width',
  },
  tabbar: {
    '--tabbar-bar-divider': '--tabbar-bar-hairline-color',
    '--tabbar-bar-divider-thickness': '--tabbar-bar-hairline-width',
  },
  segmentedcontrol: {
    '--segmentedcontrol-divider-color': '--segmentedcontrol-hairline-color',
    '--segmentedcontrol-divider-thickness': '--segmentedcontrol-hairline-width',
    '--segmentedcontrol-divider-inset': '--segmentedcontrol-hairline-inset',
    '--segmentedcontrol-small-divider-thickness': '--segmentedcontrol-small-hairline-width',
    '--segmentedcontrol-small-divider-inset': '--segmentedcontrol-small-hairline-inset',
  },
  collapsiblesection: {
    ...Object.fromEntries(
      COLLAPSIBLESECTION_STATES.flatMap((state) => [
        ...COLLAPSIBLESECTION_SUFFIXES.map((s) => [
          `--collapsiblesection-divider-${state}-${s}`,
          `--collapsiblesection-hairline-${state}-${s}`,
        ]),
        [
          `--collapsiblesection-divider-${state}-hairline-thickness`,
          `--collapsiblesection-hairline-${state}-hairline-width`,
        ],
      ]),
    ),
    '--collapsiblesection-divider-expanded-padding': '--collapsiblesection-hairline-expanded-padding',
  },
  sectiondivider: {
    '--sectiondivider-lg-hairline-thickness': '--sectiondivider-lg-hairline-width',
    '--sectiondivider-md-hairline-thickness': '--sectiondivider-md-hairline-width',
    '--sectiondivider-sm-hairline-thickness': '--sectiondivider-sm-hairline-width',
  },
};

export const componentMigration_2026_09_13_hairline: Migration = {
  id: '2026-09-13-hairline',
  fromVersion: 28,
  toVersion: 29,
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
