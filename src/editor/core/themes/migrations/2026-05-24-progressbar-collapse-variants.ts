import type { Migration } from './index';

/**
 * Component-config migration (2026-05-24, progressbar only): ProgressBar
 * collapsed from a per-variant token namespace (primary/success/warning/
 * danger/info) to a single token set. Fill color is now a runtime `fill`
 * prop on the consumer side, not a variant axis.
 *
 * Strategy: keep the `primary` namespace's values as the canonical defaults
 * (rename `--progressbar-primary-X` → `--progressbar-X`); drop the four
 * remaining variant namespaces entirely. Consumers that previously selected
 * a non-primary variant lose their variant-specific surface/border/fill
 * customizations and fall back to the merged single set.
 */
const PRIMARY_PREFIX = '--progressbar-primary-';
const NEW_PREFIX = '--progressbar-';
const DROP_PREFIXES = [
  '--progressbar-success-',
  '--progressbar-warning-',
  '--progressbar-danger-',
  '--progressbar-info-',
];

export const componentMigration_2026_05_24_progressbarCollapseVariants: Migration = {
  id: '2026-05-24-progressbar-collapse-variants',
  fromVersion: 13,
  toVersion: 14,
  appliesTo: 'component-config',
  apply(rawVars, meta) {
    if (meta.component !== 'progressbar') return { ...rawVars };
    const out: Record<string, string> = {};
    for (const [oldKey, value] of Object.entries(rawVars)) {
      if (DROP_PREFIXES.some((p) => oldKey.startsWith(p))) continue;
      const key = oldKey.startsWith(PRIMARY_PREFIX)
        ? NEW_PREFIX + oldKey.slice(PRIMARY_PREFIX.length)
        : oldKey;
      if (!(key in out)) out[key] = value;
    }
    return out;
  },
};
