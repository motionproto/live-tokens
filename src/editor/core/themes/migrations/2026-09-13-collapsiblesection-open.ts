import type { Migration } from './index';

/**
 * CollapsibleSection's expanded state reads open (2026-09-13).
 *
 * `expanded` is a prop rename to `open`, matching Dialog and Tooltip. The
 * four `-expanded-` properties read `-open-`. Values are unchanged, so this
 * is a pure key rename.
 */
const RENAMES: Record<string, Record<string, string>> = {
  collapsiblesection: {
    '--collapsiblesection-chromeless-expanded-padding': '--collapsiblesection-chromeless-open-padding',
    '--collapsiblesection-hairline-expanded-padding': '--collapsiblesection-hairline-open-padding',
    '--collapsiblesection-container-expanded-surface': '--collapsiblesection-container-open-surface',
    '--collapsiblesection-container-expanded-padding': '--collapsiblesection-container-open-padding',
  },
};

export const componentMigration_2026_09_13_collapsiblesectionOpen: Migration = {
  id: '2026-09-13-collapsiblesection-open',
  fromVersion: 33,
  toVersion: 34,
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
