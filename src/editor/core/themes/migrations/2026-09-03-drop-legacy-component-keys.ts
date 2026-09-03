import type { Migration } from './index';

/**
 * The color, type, and border-width siblings of the shape/space keys
 * 2026-08-13 removed. All 36 were left behind when Badge's `trait` variant,
 * SectionDivider's title and description slots, and Dialog's variant-by-state
 * axes were renamed. `tokens.css` declares none of them and nothing reads one,
 * so they are a dead second home for state the component configs now own.
 */
const DROPPED = new Set([
  '--badge-trait-surface',
  '--badge-trait-text',
  '--badge-trait-text-font-family',
  '--badge-trait-text-font-size',
  '--badge-trait-text-font-weight',
  '--badge-trait-text-line-height',
  '--badge-trait-border',
  '--badge-trait-border-width',
  '--badge-trait-shadow',
  '--sectiondivider-title',
  '--sectiondivider-title-font-family',
  '--sectiondivider-title-font-size',
  '--sectiondivider-title-font-weight',
  '--sectiondivider-title-line-height',
  '--sectiondivider-title-border-width',
  '--sectiondivider-title-stroke-color',
  '--sectiondivider-description',
  '--sectiondivider-description-font-family',
  '--sectiondivider-description-font-size',
  '--sectiondivider-description-font-weight',
  '--sectiondivider-description-line-height',
  '--dialog-primary-default-surface',
  '--dialog-primary-default-text',
  '--dialog-primary-default-border',
  '--dialog-primary-default-border-width',
  '--dialog-primary-hover-surface',
  '--dialog-primary-hover-text',
  '--dialog-primary-hover-border',
  '--dialog-primary-hover-border-width',
  '--dialog-secondary-default-text',
  '--dialog-secondary-default-border',
  '--dialog-secondary-default-border-width',
  '--dialog-secondary-hover-surface',
  '--dialog-secondary-hover-text',
  '--dialog-secondary-hover-border',
  '--dialog-secondary-hover-border-width',
]);

export const colorsAndTypeMigration_2026_09_03_dropLegacyComponentKeys: Migration = {
  id: '2026-09-03-drop-legacy-component-keys',
  fromVersion: 7,
  toVersion: 8,
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
