import type { Migration } from './index';

/**
 * Badge and CornerBadge say brand (2026-09-13).
 *
 * `primary` meant two things: the one primary action on Button and
 * IconButton, and the brand color family on Badge and CornerBadge. The
 * badges take the name their tokens already carry (`--surface-brand`);
 * Button's and IconButton's `primary` is untouched. Values are unchanged, so
 * this is a pure key rename.
 */
const BADGE_SUFFIXES = [
  'surface', 'text', 'border',
  'text-font-family', 'text-font-size', 'text-font-weight', 'text-line-height',
  'border-width', 'radius', 'padding', 'shadow', 'blur', 'icon-size',
];
const CORNERBADGE_SUFFIXES = ['surface', 'border', 'text'];

const RENAMES: Record<string, Record<string, string>> = {
  badge: Object.fromEntries(
    BADGE_SUFFIXES.map((s) => [`--badge-primary-${s}`, `--badge-brand-${s}`]),
  ),
  cornerbadge: Object.fromEntries(
    CORNERBADGE_SUFFIXES.map((s) => [`--cornerbadge-primary-${s}`, `--cornerbadge-brand-${s}`]),
  ),
};

export const componentMigration_2026_09_13_badgeBrand: Migration = {
  id: '2026-09-13-badge-brand',
  fromVersion: 34,
  toVersion: 35,
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
