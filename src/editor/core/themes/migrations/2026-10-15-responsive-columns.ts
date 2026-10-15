import type { Migration } from './index';

/**
 * The column grid's stored gutter and margin move to their desktop names
 * (2026-10-15).
 *
 * tokens.css points `--columns-gutter` and `--columns-margin` at a
 * per-viewport value for the window's width. A theme that stores either
 * overrides every breakpoint, so each moves to its desktop name with its
 * value. `--columns-count` stays one value at every width and keeps its name.
 *
 * A stored value equal to the one every shipped theme held (`12`, `32px`,
 * `0px` or `0`) counts as unset and is dropped, so the theme inherits the
 * tokens.css default. The theme stores no tablet or phone value. The names
 * and values freeze those of 2026-10-15.
 */
const RENAMES: Record<string, string> = {
  '--columns-gutter': '--columns-desktop-gutter',
  '--columns-margin': '--columns-desktop-margin',
};

const SHIPPED: Record<string, readonly string[]> = {
  '--columns-count': ['12'],
  '--columns-gutter': ['32px'],
  '--columns-margin': ['0px', '0'],
};

export const colorsAndTypeMigration_2026_10_15_responsiveColumns: Migration = {
  id: '2026-10-15-responsive-columns',
  fromVersion: 9,
  toVersion: 10,
  appliesTo: 'colors-and-type',
  apply(rawVars) {
    return Object.fromEntries(
      Object.entries(rawVars)
        .filter(([name, value]) => !SHIPPED[name]?.includes(value.trim()))
        .map(([name, value]) => [RENAMES[name] ?? name, value]),
    );
  },
};
