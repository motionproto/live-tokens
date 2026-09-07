import type { Migration } from './index';

/**
 * Stroke role renames (2026-09-07).
 *
 * Three stroke roles share the `--border-width-*` scale: a border encloses, a
 * divider separates, an accent emphasises. `set-geometry` moves each role on
 * its own, and `aliasKinds` reads the role off the suffix, so a divider that
 * was still named `-border` moved with the borders. These four components
 * renamed their dividers and accents to say which line they are. Values are
 * unchanged, so this is a pure key rename.
 */
const RENAMES: Record<string, Record<string, string>> = {
  tabbar: Object.fromEntries(
    ['default', 'hover', 'active', 'disabled'].map((s) => [
      `--tabbar-${s}-indicator-border-width`,
      `--tabbar-${s}-indicator-width`,
    ]),
  ),
  collapsiblesection: Object.fromEntries(
    ['default', 'hover'].flatMap((s) => [
      [`--collapsiblesection-divider-${s}-border`, `--collapsiblesection-divider-${s}-hairline-color`],
      [`--collapsiblesection-divider-${s}-border-width`, `--collapsiblesection-divider-${s}-hairline-thickness`],
    ]),
  ),
  dialog: Object.fromEntries(
    ['header', 'footer'].flatMap((part) => [
      [`--dialog-${part}-border`, `--dialog-${part}-divider`],
      [`--dialog-${part}-border-width`, `--dialog-${part}-divider-width`],
    ]),
  ),
  table: {
    '--table-default-header-border': '--table-default-header-divider',
    '--table-default-header-border-width': '--table-default-header-divider-width',
  },
};

export const componentMigration_2026_09_07_strokeRoleRenames: Migration = {
  id: '2026-09-07-stroke-role-renames',
  fromVersion: 26,
  toVersion: 27,
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
