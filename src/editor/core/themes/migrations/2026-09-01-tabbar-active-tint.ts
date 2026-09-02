import type { Migration } from './index';

/**
 * TabBar active surface, scrim to tint (2026-09-01, tabbar only).
 *
 * The active tab is a wash *on* the bar, not a layer dimming what is behind it,
 * so it belongs to the tint family. It only ever read a scrim because no tint
 * family existed. Rebinding is a visible change: the 38% near-black scrim
 * becomes a 10% white tint, so the active tab reads lighter rather than darker.
 *
 * Scoped to the shipped default value. A theme that pointed this alias
 * somewhere else keeps its choice.
 */
export const componentMigration_2026_09_01_tabbarActiveTint: Migration = {
  id: '2026-09-01-tabbar-active-tint',
  fromVersion: 23,
  toVersion: 24,
  appliesTo: 'component-config',
  apply(rawVars, meta) {
    if (meta.component !== 'tabbar') return { ...rawVars };
    const out = { ...rawVars };
    if (out['--tabbar-active-surface'] === '--scrim-low') {
      out['--tabbar-active-surface'] = '--tint-low';
    }
    return out;
  },
};
