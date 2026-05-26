import type { Migration } from './index';

/**
 * Overlay scale trim (2026-05-26): `--overlay-lowest`, `--overlay-lower`,
 * `--overlay-higher`, and `--overlay-highest` were retired. The kept stops
 * are `--overlay-low`, `--overlay`, and `--overlay-high`. Theme files
 * stripped of the dropped keys; component configs whose aliases referenced
 * a dropped stop rebind to the nearest survivor.
 */
const DROPPED_TO_KEPT: Record<string, string> = {
  '--overlay-lowest': '--overlay-low',
  '--overlay-lower': '--overlay-low',
  '--overlay-higher': '--overlay-high',
  '--overlay-highest': '--overlay-high',
};

export const themeMigration_2026_05_26_dropOverlayExtraStops: Migration = {
  id: '2026-05-26-drop-overlay-extra-stops-theme',
  fromVersion: 2,
  toVersion: 3,
  appliesTo: 'theme',
  apply(rawVars) {
    const out: Record<string, string> = {};
    for (const [key, value] of Object.entries(rawVars)) {
      if (key in DROPPED_TO_KEPT) continue;
      out[key] = value;
    }
    return out;
  },
};

export const componentMigration_2026_05_26_dropOverlayExtraStops: Migration = {
  id: '2026-05-26-drop-overlay-extra-stops-component',
  fromVersion: 16,
  toVersion: 17,
  appliesTo: 'component-config',
  apply(rawVars) {
    const out: Record<string, string> = {};
    for (const [key, value] of Object.entries(rawVars)) {
      // Alias values are bare token names like "--overlay-higher" — rebind
      // those to the nearest kept stop. Literal CSS values are left alone.
      out[key] = DROPPED_TO_KEPT[value] ?? value;
    }
    return out;
  },
};
