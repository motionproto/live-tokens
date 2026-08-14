import type { Migration } from './index';

/**
 * Legacy shape/space keys (2026-08-13): eleven radius/padding entries that
 * predate the per-component config system and outlived the restructures that
 * renamed their components' tokens (Badge's `trait` variant, Dialog's
 * variant×state axes, SectionDivider's flat padding). Nothing reads them —
 * shape and space now live only in `component-configs/<id>/*.json` — so they
 * are a second, dead home for state the adjust engine writes elsewhere.
 */
const DROPPED = new Set([
  '--badge-trait-radius',
  '--badge-trait-padding',
  '--sectiondivider-padding',
  '--dialog-primary-default-radius',
  '--dialog-primary-default-padding',
  '--dialog-primary-hover-radius',
  '--dialog-primary-hover-padding',
  '--dialog-secondary-default-radius',
  '--dialog-secondary-default-padding',
  '--dialog-secondary-hover-radius',
  '--dialog-secondary-hover-padding',
]);

export const colorsAndTypeMigration_2026_08_13_dropLegacyShapeSpaceKeys: Migration = {
  id: '2026-08-13-drop-legacy-shape-space-keys',
  fromVersion: 3,
  toVersion: 4,
  appliesTo: 'colors-and-type',
  apply(rawVars) {
    const out: Record<string, string> = {};
    for (const [key, value] of Object.entries(rawVars)) {
      if (DROPPED.has(key)) continue;
      out[key] = value;
    }
    return out;
  },
};
