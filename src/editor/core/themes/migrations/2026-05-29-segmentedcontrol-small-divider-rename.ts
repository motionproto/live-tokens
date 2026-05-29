import type { Migration } from './index';

/**
 * Component-config migration (2026-05-29, segmentedcontrol):
 *
 * Moves `small` ahead of `divider` in the small-size divider tokens so the
 * picker's suffix matcher recognises them. With `-small-` as an infix, the
 * variable's tail is `-small-thickness` / `-small-inset` — neither of which
 * is in `KIND_PATTERNS`, so the editor falls back to rendering them as
 * colour pickers. Reordering to `--segmentedcontrol-small-divider-*` puts
 * `-divider-thickness` / `-divider-inset` at the suffix, where the picker
 * classifies them as a stroke width and a divider inset respectively.
 *
 *   --segmentedcontrol-divider-small-thickness → --segmentedcontrol-small-divider-thickness
 *   --segmentedcontrol-divider-small-inset     → --segmentedcontrol-small-divider-inset
 */

const RENAMES: Record<string, string> = {
  '--segmentedcontrol-divider-small-thickness': '--segmentedcontrol-small-divider-thickness',
  '--segmentedcontrol-divider-small-inset': '--segmentedcontrol-small-divider-inset',
};

export const componentMigration_2026_05_29_segmentedcontrolSmallDividerRename: Migration = {
  id: '2026-05-29-segmentedcontrol-small-divider-rename',
  fromVersion: 18,
  toVersion: 19,
  appliesTo: 'component-config',
  apply(rawVars, meta) {
    if (meta.component !== 'segmentedcontrol') return { ...rawVars };
    const out: Record<string, string> = {};
    for (const [key, value] of Object.entries(rawVars)) {
      out[RENAMES[key] ?? key] = value;
    }
    return out;
  },
};
