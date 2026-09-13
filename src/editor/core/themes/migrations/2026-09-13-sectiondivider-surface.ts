import type { Migration } from './index';

/**
 * SectionDivider's fill reads surface (2026-09-13).
 *
 * SectionDivider said `-background` for its container fill where every other
 * component says `-surface`. The three `--sectiondivider-{lg,md,sm}-background`
 * properties read `-surface`. Values are unchanged, so this is a pure key
 * rename.
 */
const SECTIONDIVIDER_VARIANTS = ['lg', 'md', 'sm'];

const RENAMES: Record<string, Record<string, string>> = {
  sectiondivider: Object.fromEntries(
    SECTIONDIVIDER_VARIANTS.map((v) => [
      `--sectiondivider-${v}-background`,
      `--sectiondivider-${v}-surface`,
    ]),
  ),
};

export const componentMigration_2026_09_13_sectiondividerSurface: Migration = {
  id: '2026-09-13-sectiondivider-surface',
  fromVersion: 30,
  toVersion: 31,
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
