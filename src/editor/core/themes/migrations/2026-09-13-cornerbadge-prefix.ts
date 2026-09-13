import type { Migration } from './index';

/**
 * CornerBadge's prefix is its id (2026-09-13).
 *
 * CornerBadge was registered `cornerbadge` but named its forty properties
 * `--corner-badge-*`, the one shipped component whose prefix was not its id
 * verbatim. They read `--cornerbadge-*`. Values are unchanged, so this is a
 * pure key rename.
 */
const RENAMES: Record<string, Record<string, string>> = {
  cornerbadge: {
    '--corner-badge-margin': '--cornerbadge-margin',
    '--corner-badge-outer-radius': '--cornerbadge-outer-radius',
    '--corner-badge-inner-radius': '--cornerbadge-inner-radius',
    '--corner-badge-h-axis-radius': '--cornerbadge-h-axis-radius',
    '--corner-badge-v-axis-radius': '--cornerbadge-v-axis-radius',
    '--corner-badge-padding': '--cornerbadge-padding',
    '--corner-badge-text-font-family': '--cornerbadge-text-font-family',
    '--corner-badge-text-font-size': '--cornerbadge-text-font-size',
    '--corner-badge-text-font-weight': '--cornerbadge-text-font-weight',
    '--corner-badge-text-line-height': '--cornerbadge-text-line-height',
    '--corner-badge-primary-surface': '--cornerbadge-primary-surface',
    '--corner-badge-primary-border': '--cornerbadge-primary-border',
    '--corner-badge-primary-text': '--cornerbadge-primary-text',
    '--corner-badge-accent-surface': '--cornerbadge-accent-surface',
    '--corner-badge-accent-border': '--cornerbadge-accent-border',
    '--corner-badge-accent-text': '--cornerbadge-accent-text',
    '--corner-badge-neutral-surface': '--cornerbadge-neutral-surface',
    '--corner-badge-neutral-border': '--cornerbadge-neutral-border',
    '--corner-badge-neutral-text': '--cornerbadge-neutral-text',
    '--corner-badge-alternate-surface': '--cornerbadge-alternate-surface',
    '--corner-badge-alternate-border': '--cornerbadge-alternate-border',
    '--corner-badge-alternate-text': '--cornerbadge-alternate-text',
    '--corner-badge-canvas-surface': '--cornerbadge-canvas-surface',
    '--corner-badge-canvas-border': '--cornerbadge-canvas-border',
    '--corner-badge-canvas-text': '--cornerbadge-canvas-text',
    '--corner-badge-special-surface': '--cornerbadge-special-surface',
    '--corner-badge-special-border': '--cornerbadge-special-border',
    '--corner-badge-special-text': '--cornerbadge-special-text',
    '--corner-badge-success-surface': '--cornerbadge-success-surface',
    '--corner-badge-success-border': '--cornerbadge-success-border',
    '--corner-badge-success-text': '--cornerbadge-success-text',
    '--corner-badge-warning-surface': '--cornerbadge-warning-surface',
    '--corner-badge-warning-border': '--cornerbadge-warning-border',
    '--corner-badge-warning-text': '--cornerbadge-warning-text',
    '--corner-badge-danger-surface': '--cornerbadge-danger-surface',
    '--corner-badge-danger-border': '--cornerbadge-danger-border',
    '--corner-badge-danger-text': '--cornerbadge-danger-text',
    '--corner-badge-info-surface': '--cornerbadge-info-surface',
    '--corner-badge-info-border': '--cornerbadge-info-border',
    '--corner-badge-info-text': '--cornerbadge-info-text',
  },
};

export const componentMigration_2026_09_13_cornerbadgePrefix: Migration = {
  id: '2026-09-13-cornerbadge-prefix',
  fromVersion: 31,
  toVersion: 32,
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
