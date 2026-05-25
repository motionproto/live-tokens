import type { Migration } from './index';

/**
 * 2026-05-25: drop the per-variant token axis from cornerbadge.
 *
 * CornerBadge's "variants" carried only shape + spacing + type aliases — never
 * colors (those come from the composed Badge). With every variant's defaults
 * identical, the axis was 10× duplication that the editor had to tile across
 * a variant strip for no semantic gain. Collapsing to a single flat token set
 * removes the strip and the duplication.
 *
 * For each `--corner-badge-{variant}-{prop}`, fold into `--corner-badge-{prop}`.
 * First-occurrence wins on conflict — defaults were uniform so this is a no-op
 * in the typical case, and any tuned divergence is rare enough that picking
 * one is better than silently averaging.
 */
const VARIANTS = ['primary', 'accent', 'neutral', 'alternate', 'canvas', 'special', 'success', 'warning', 'danger', 'info'] as const;
const RE = new RegExp(`^--corner-badge-(${VARIANTS.join('|')})-(.+)$`);

function flattenVariants(rawVars: Record<string, string>, meta: { component?: string }): Record<string, string> {
  if (meta.component !== 'cornerbadge') return rawVars;
  const out: Record<string, string> = {};
  const collected: Map<string, string> = new Map();
  for (const [key, value] of Object.entries(rawVars)) {
    const m = key.match(RE);
    if (m) {
      const prop = m[2];
      if (!collected.has(prop)) collected.set(prop, value);
      continue;
    }
    out[key] = value;
  }
  for (const [prop, value] of collected) {
    const flatKey = `--corner-badge-${prop}`;
    if (!(flatKey in out)) out[flatKey] = value;
  }
  return out;
}

export const componentMigration_2026_05_25_cornerbadgeFlattenVariants: Migration = {
  id: '2026-05-25-cornerbadge-flatten-variants',
  fromVersion: 15,
  toVersion: 16,
  appliesTo: 'component-config',
  apply: flattenVariants,
};
