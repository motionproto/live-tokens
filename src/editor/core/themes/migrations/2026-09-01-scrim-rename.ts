import type { Migration } from './index';

/**
 * Scrim rename (2026-09-01): `--overlay-*` became `--scrim-*`.
 *
 * An overlay is a scrim, a translucent layer that dims what is behind it. The
 * name had spread to cover surface tints too, which are the opposite operation,
 * and it collided with `backdrop`, an exported concept about what paints behind
 * an element. Each name now means one thing.
 *
 * Values are unchanged, so this is a pure key rename in colors-and-type files.
 * Component configs need both halves: Dialog's `--dialog-overlay-surface` is a
 * key, and any alias *value* pointing at a scrim stop is a bare token name that
 * has to be rebound.
 */
const RENAMED: Record<string, string> = {
  '--overlay-low': '--scrim-low',
  '--overlay': '--scrim',
  '--overlay-high': '--scrim-high',
};

const RENAMED_COMPONENT_KEYS: Record<string, string> = {
  '--dialog-overlay-surface': '--dialog-scrim-surface',
};

export const colorsAndTypeMigration_2026_09_01_scrimRename: Migration = {
  id: '2026-09-01-scrim-rename-theme',
  fromVersion: 5,
  toVersion: 6,
  appliesTo: 'colors-and-type',
  apply(rawVars) {
    const out: Record<string, string> = {};
    for (const [key, value] of Object.entries(rawVars)) {
      out[RENAMED[key] ?? key] = value;
    }
    return out;
  },
};

export const componentMigration_2026_09_01_scrimRename: Migration = {
  id: '2026-09-01-scrim-rename-component',
  fromVersion: 21,
  toVersion: 22,
  appliesTo: 'component-config',
  apply(rawVars) {
    const out: Record<string, string> = {};
    for (const [key, value] of Object.entries(rawVars)) {
      out[RENAMED_COMPONENT_KEYS[key] ?? key] = RENAMED[value] ?? value;
    }
    return out;
  },
};
