import type { Migration } from './index';

/**
 * The column grid's stored values move to their desktop names (2026-10-15).
 *
 * tokens.css points `--columns-count`, `--columns-gutter` and
 * `--columns-margin` at a per-viewport value for the window's width. A theme
 * that stores one of the three overrides every breakpoint, so each moves to
 * its desktop name with its value. The theme stores no tablet or phone value
 * and inherits those from tokens.css. The names freeze those of 2026-10-15.
 */
const RENAMES: Record<string, string> = {
  '--columns-count': '--columns-desktop-count',
  '--columns-gutter': '--columns-desktop-gutter',
  '--columns-margin': '--columns-desktop-margin',
};

export const colorsAndTypeMigration_2026_10_15_responsiveColumns: Migration = {
  id: '2026-10-15-responsive-columns',
  fromVersion: 9,
  toVersion: 10,
  appliesTo: 'colors-and-type',
  apply(rawVars) {
    return Object.fromEntries(Object.entries(rawVars).map(([name, value]) => [RENAMES[name] ?? name, value]));
  },
};
