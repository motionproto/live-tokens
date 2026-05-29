import type { Migration } from './index';

/**
 * Component-config migration (2026-05-29, tabbar):
 *
 * Moves the indicator stroke width from a bar-level token to a per-state
 * token, mirroring how indicator color already rebinds per state. Also
 * renames the suffix from `-thickness` to `-border-width` so the editor's
 * suffix-based picker classifies it as a width input instead of a color.
 *
 *   --tabbar-bar-indicator-thickness  →  --tabbar-{state}-indicator-border-width
 *                                         for state in default/hover/active/disabled.
 *
 * The bar-level value seeds every state, preserving the visual default
 * (all four states had the same effective indicator width since only
 * color rebinds in the old model). Unset → falls back to `--border-width-2`
 * to match the new component default.
 */

const TABBAR_STATES = ['default', 'hover', 'active', 'disabled'] as const;
const OLD_KEY = '--tabbar-bar-indicator-thickness';
const FALLBACK = '--border-width-2';

export const componentMigration_2026_05_29_tabbarIndicatorThicknessToPerStateWidth: Migration = {
  id: '2026-05-29-tabbar-indicator-thickness-to-per-state-width',
  fromVersion: 17,
  toVersion: 18,
  appliesTo: 'component-config',
  apply(rawVars, meta) {
    if (meta.component !== 'tabbar') return { ...rawVars };
    const seed = rawVars[OLD_KEY] ?? FALLBACK;
    const out: Record<string, string> = {};
    for (const [key, value] of Object.entries(rawVars)) {
      if (key === OLD_KEY) continue;
      out[key] = value;
    }
    for (const state of TABBAR_STATES) {
      const newKey = `--tabbar-${state}-indicator-border-width`;
      if (!(newKey in out)) out[newKey] = seed;
    }
    return out;
  },
};
