import type { Migration } from './index';

/**
 * Gate suffix, state word to `-enabled` (2026-09-01).
 *
 * An optional interaction is switched by a gate variable. Those gates were named
 * with a state word at the end (`--card-hover-border-active`,
 * `--image-zoom-hover`), which reads as state-after-property and fails
 * `check-component`. A gate is not a state: it says whether the interaction is
 * on at all, so it takes `-enabled`.
 *
 * Values are unchanged; a gate still holds either its off value or its on value.
 */
const RENAMED: Record<string, string> = {
  '--card-hover-border-active': '--card-hover-border-enabled',
  '--card-hover-shadow-active': '--card-hover-shadow-enabled',
  '--image-zoom-hover': '--image-zoom-enabled',
  '--image-grow-hover': '--image-grow-enabled',
};

export const componentMigration_2026_09_01_gateSuffixEnabled: Migration = {
  id: '2026-09-01-gate-suffix-enabled',
  fromVersion: 24,
  toVersion: 25,
  appliesTo: 'component-config',
  apply(rawVars) {
    const out: Record<string, string> = {};
    for (const [key, value] of Object.entries(rawVars)) out[RENAMED[key] ?? key] = value;
    return out;
  },
};
