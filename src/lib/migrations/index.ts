/**
 * Schema-versioned migration runner.
 *
 * Each migration lives in its own dated file (`YYYY-MM-DD-<short-name>.ts`)
 * and exports a `Migration` object. Saved theme / component-config files
 * carry a `schemaVersion` stamp; on load, only migrations with
 * `fromVersion >= file.schemaVersion` are applied — once every on-disk file
 * is past a given version, that migration's bookkeeping is dead code and
 * the file can be deleted.
 *
 * Theme and component-config have INDEPENDENT version sequences. Every
 * theme migration steps the theme version; every component-config migration
 * steps the component-config version. There is no shared 'both' kind.
 */
export interface MigrationMeta {
  /** Component id when the migration runs in component-config context. */
  component?: string;
}

export interface Migration {
  /** Unique identifier; convention: `YYYY-MM-DD-<short-name>`. */
  id: string;
  /** Pre-condition version — files at or below this are unmigrated for this step. */
  fromVersion: number;
  /** Post-condition version — files past this no longer need this migration. */
  toVersion: number;
  /** Which storage flavor this applies to. */
  appliesTo: 'theme' | 'component-config';
  /** Pure transform on the raw vars map. May add, remove, or rename keys. */
  apply(rawVars: Record<string, string>, meta: MigrationMeta): Record<string, string>;
}

import { themeMigration_2026_04_24_legacyKeysAndBgToCanvas } from './2026-04-24-legacy-keys-and-bg-to-canvas';
import { componentMigration_2026_04_24_prefixAndSuffixRenames } from './2026-04-24-component-prefix-and-suffix-renames';
import { componentMigration_2026_04_27_segmentedcontrolDisabledFlatten } from './2026-04-27-segmentedcontrol-disabled-flatten';

/**
 * Registered migrations. Order in this array does not matter — the runner
 * filters by `appliesTo` and sorts by `toVersion` before applying.
 */
export const MIGRATIONS: Migration[] = [
  themeMigration_2026_04_24_legacyKeysAndBgToCanvas,
  componentMigration_2026_04_24_prefixAndSuffixRenames,
  componentMigration_2026_04_27_segmentedcontrolDisabledFlatten,
];

function countFor(kind: 'theme' | 'component-config'): number {
  return MIGRATIONS.filter((m) => m.appliesTo === kind).length;
}

/**
 * Current schema versions. Computed from the registered migrations so that
 * adding a new dated migration file (and importing it above) auto-bumps the
 * relevant constant.
 */
export const CURRENT_THEME_SCHEMA_VERSION = countFor('theme');
export const CURRENT_COMPONENT_SCHEMA_VERSION = countFor('component-config');

/**
 * Apply all migrations for a given kind whose fromVersion is at or above the
 * file's stamped version. Pure: returns a new map; never mutates the input.
 *
 * The "fromVersion >= fileVersion" filter is what gives this its TTL: once
 * every saved file has been resaved past version N, the migration with
 * fromVersion=N can be deleted without affecting any load path.
 */
export function runMigrations(
  kind: 'theme' | 'component-config',
  fileVersion: number,
  rawVars: Record<string, string>,
  meta: MigrationMeta = {},
): Record<string, string> {
  const applicable = MIGRATIONS
    .filter((m) => m.appliesTo === kind && m.fromVersion >= fileVersion)
    .sort((a, b) => a.toVersion - b.toVersion);
  let out = { ...rawVars };
  for (const m of applicable) {
    out = m.apply(out, meta);
  }
  return out;
}
