import type { Migration } from './index';

/**
 * Toggle's label color drops the redundant `-text` suffix (2026-09-13).
 *
 * The bare part already names the color everywhere else; `-font-*` carries
 * the type. Toggle was the one component still saying `-label-text`. Values
 * are unchanged, so this is a pure key rename.
 */
const RENAMES: Record<string, Record<string, string>> = {
  toggle: {
    '--toggle-label-text': '--toggle-label',
    '--toggle-disabled-label-text': '--toggle-disabled-label',
  },
};

export const componentMigration_2026_09_13_toggleLabel: Migration = {
  id: '2026-09-13-toggle-label',
  fromVersion: 32,
  toVersion: 33,
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
