import type { Migration } from './index';

/**
 * Tint rename (2026-09-01): `--hover-*` became `--tint-*`.
 *
 * A state is a segment of a property name (`--button-outline-hover-surface`),
 * not a token of its own, so the three stops are named for what they are: a
 * tint shades the surface it sits on. Values are unchanged.
 *
 * Nothing shipped read the old names, so this only touches saved files that
 * captured them from the editor's own stops.
 */
const RENAMED: Record<string, string> = {
  '--hover-low': '--tint-low',
  '--hover': '--tint',
  '--hover-high': '--tint-high',
};

export const colorsAndTypeMigration_2026_09_01_tintRename: Migration = {
  id: '2026-09-01-tint-rename-theme',
  fromVersion: 6,
  toVersion: 7,
  appliesTo: 'colors-and-type',
  apply(rawVars) {
    const out: Record<string, string> = {};
    for (const [key, value] of Object.entries(rawVars)) out[RENAMED[key] ?? key] = value;
    return out;
  },
};

export const componentMigration_2026_09_01_tintRename: Migration = {
  id: '2026-09-01-tint-rename-component',
  fromVersion: 22,
  toVersion: 23,
  appliesTo: 'component-config',
  apply(rawVars) {
    const out: Record<string, string> = {};
    // Alias values are bare token names; rebind any that pointed at a hover stop.
    for (const [key, value] of Object.entries(rawVars)) out[key] = RENAMED[value] ?? value;
    return out;
  },
};
