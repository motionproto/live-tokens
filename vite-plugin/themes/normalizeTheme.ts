/**
 * Theme schema v1/v2/v3 → v4, in one pass. v1 themes pointed at a
 * colors-and-type file and a config file per component by basename; v2
 * carries that data by value, so deleting a working file can never break a
 * saved look; v3 spells the embedded layer `colorsAndType` instead of
 * `theme`, which now names the whole look; v4 makes the theme complete
 * (`docs/plans/theme-completeness.md`, Wave 2) — every known component and
 * every alias key its `default.json` declares, by value.
 *
 * Alongside the theme-shape migration, every embedded component config is run
 * through the same migration pipeline the client applies on load
 * (`migrateComponentConfig`), off the theme-level `componentSchemaVersion`
 * rather than any per-entry stamp (RJC 9 of `docs/plans/theme-completeness.md`:
 * a per-entry `schemaVersion` inside a theme is ignored and stripped). Without
 * this, an embedded config written before a token rename bakes its pre-rename
 * keys into `tokens.generated.css` forever, since nothing else ever migrates it.
 *
 * Order: migrate, then fill, then stamp (RJC 6) — filling first would write a
 * file carrying both a stale key and its fresh replacement.
 *
 * Pure: every disk (or bundle) lookup arrives through `ThemeResolvers`, and
 * unresolvable refs come back in `dropped` rather than being logged here — the
 * boot migration reports them once, read doors stay quiet.
 */

import { migrateComponentConfig } from '../../src/editor/core/themes/migrateComponentConfig';
import { CURRENT_COMPONENT_SCHEMA_VERSION } from '../../src/editor/core/themes/migrations';
import type { AliasDiskValue, ThemeFillReport } from '../../src/editor/core/themes/themeTypes';
import { THEME_SCHEMA_VERSION } from '../../src/editor/core/themes/themeTypes';
import { KNOWN_COMPONENT_CONFIG_KEYS } from '../../src/editor/core/components/componentConfigKeys';

// Owned by `themeTypes.ts` so the editor can read it without importing build
// tooling that the published tarball does not carry.
export { THEME_SCHEMA_VERSION };

type Json = Record<string, unknown>;

export interface ThemeResolvers {
  readColorsAndType(name: string): unknown;
  readComponentConfig(comp: string, name: string): unknown;
  /** Every component this install has, for the completeness fill (Wave 2).
   *  Installed components are a property of the running install, not of a
   *  theme or a bundle, so the disk and bundle resolvers share one answer. */
  listComponentNames(): string[];
  /**
   * Applied to colors and type at the moment they are embedded. Read doors
   * trust an already embedded copy: every write path that embeds one runs it
   * through here first, so the stored copy is already reconciled.
   */
  normalizeColorsAndType(colorsAndType: Json): Json;
}

export interface EncapsulatedTheme {
  name: string;
  createdAt: string;
  updatedAt: string;
  schemaVersion: typeof THEME_SCHEMA_VERSION;
  /** Full colors-and-type content. `null` only when nothing resolved, including
   *  the default — callers surface that as an error. */
  colorsAndType: Json | null;
  /** Component id → its config, by value, one entry per component this
   *  install has and every alias key that component's `default.json`
   *  declares (Wave 2 of `docs/plans/theme-completeness.md`): `normalizeTheme`
   *  fills any gap from the local default on every read, and the fill is
   *  persisted on the next write. A config for a component this install does
   *  not have, or an alias key its current default no longer declares,
   *  survives untouched (RJC 3) but is never a *gap* in the completeness
   *  sense — see `NormalizedTheme.filled`. */
  componentConfigs: Record<string, Json>;
  /** Migration stamp for every embedded component config in this theme, one
   *  field for all of them (RJC 9): `CURRENT_COMPONENT_SCHEMA_VERSION` is a
   *  single global counter over every component migration, so a per-entry
   *  stamp would buy no isolation and the theme is rewritten wholesale anyway. */
  componentSchemaVersion: number;
}

export interface NormalizedTheme {
  theme: EncapsulatedTheme;
  /** Refs that resolved to nothing, as `colors-and-type:<name>` /
   *  `<comp>/<name>`. Each fell back to the default. */
  dropped: string[];
  /** The input was below the current schema version and got upgraded. */
  migrated: boolean;
  /** What the completeness fill (Wave 2) had to add, reported and never acted
   *  on silently (RJC 3). Kept in the file, but orphans are skipped by the
   *  bake. */
  filled: ThemeFillReport;
}

function asObject(value: unknown): Json | null {
  return value && typeof value === 'object' && !Array.isArray(value) ? (value as Json) : null;
}

/**
 * A colors-and-type file, not a theme: it carries its content at the top level
 * and names no inner layer, where every theme names one (`theme` at v1 and v2,
 * `colorsAndType` at v3).
 *
 * Both file kinds carry a `schemaVersion`, and the two sequences overlap, so
 * the version says nothing. Left unchecked, `normalizeTheme` reads such a file
 * as a current theme whose colors resolve to the package default: the stale
 * file would list as a theme that paints the shipped look, and the boot
 * migration would rewrite it, destroying the palette. Every door that reads a
 * theme off disk refuses it instead.
 */
export function isColorsAndTypeShaped(raw: unknown): boolean {
  const obj = asObject(raw);
  if (!obj) return false;
  if ('theme' in obj || 'colorsAndType' in obj) return false;
  return 'cssVariables' in obj || 'editorConfigs' in obj;
}

/** `_fileName` is attached by read doors, never stored. Embedded copies come
 *  from those doors, so strip it before it becomes persisted state. */
function stripFileMarker(value: Json): Json {
  if (!('_fileName' in value)) return value;
  const { _fileName, ...rest } = value;
  return rest;
}

function asString(value: unknown, fallback: string): string {
  return typeof value === 'string' && value ? value : fallback;
}

/**
 * v1 and v2 spelled the embedded layer `theme` — v1 as a file name, v2 by
 * value. `colorsAndType` is the spelling a v3 (or later) file already carries.
 *
 * Landmine (Wave 2, docs/plans/theme-completeness.md): the caller must gate
 * this on the *input's* version being below 3, never on it being below the
 * current version. A v3 file already has `colorsAndType`, and rerunning this
 * against it destructures `{ theme, ...rest }` with `theme` absent, then
 * overwrites the real `colorsAndType` with `undefined`. Gating on "below
 * current" made every v3 file "migrated" the moment `THEME_SCHEMA_VERSION`
 * bumped past 3, which would have silently replaced every consumer theme's
 * palette with the default on the next boot.
 */
function migrateEmbeddedKey(src: Json): Json {
  const { theme, ...rest } = src;
  return { ...rest, colorsAndType: theme };
}

/**
 * `migrateComponentConfig` merges string-valued config entries into its
 * aliases output as an intermediate step — the client always follows it with
 * `splitAliasesAndConfig`, which routes `KNOWN_COMPONENT_CONFIG_KEYS` matches
 * back into config (and parses the rest into `CssVarRef`). The server has no
 * such follow-up, so it does the same routing itself, in disk shape: a KNOWN
 * key a migration passes through unrenamed would otherwise persist to disk in
 * the wrong bucket. Config wins on a same-key collision, matching the client's
 * rule.
 */
function routeKnownConfigKeys(
  aliases: Record<string, AliasDiskValue>,
  config: Record<string, unknown>,
): { aliases: Record<string, AliasDiskValue>; config: Record<string, unknown> } {
  const outAliases = { ...aliases };
  const outConfig = { ...config };
  for (const key of Object.keys(outAliases)) {
    if (!KNOWN_COMPONENT_CONFIG_KEYS.has(key)) continue;
    if (outConfig[key] === undefined) outConfig[key] = outAliases[key];
    delete outAliases[key];
  }
  return { aliases: outAliases, config: outConfig };
}

/**
 * Run one component config through `migrateComponentConfig`, off the theme's
 * `componentSchemaVersion` (never a per-entry stamp — RJC 9, stripped here).
 * A config with no `aliases` bag (a legacy/synthetic fixture, or metadata-only
 * entry) has nothing to migrate and passes through unchanged.
 */
function migrateEmbeddedComponentConfig(comp: string, config: Json, fileVersion: number): Json {
  const { schemaVersion: _entryStamp, aliases: rawAliases, config: rawConfig, ...rest } = config;
  const aliasesIn = asObject(rawAliases);
  if (!aliasesIn) {
    return rawConfig !== undefined ? { ...rest, config: rawConfig } : rest;
  }
  const migratedConfig = migrateComponentConfig(
    comp,
    aliasesIn as Record<string, AliasDiskValue>,
    asObject(rawConfig) ?? undefined,
    fileVersion,
  );
  const split = routeKnownConfigKeys(migratedConfig.aliases, migratedConfig.config);
  const out: Json = { ...rest, aliases: split.aliases };
  if (rawConfig !== undefined || Object.keys(split.config).length > 0) {
    out.config = split.config;
  }
  return out;
}

export function normalizeTheme(
  raw: unknown,
  resolvers: ThemeResolvers,
): NormalizedTheme {
  const input = asObject(raw) ?? {};
  const migrated = input.schemaVersion !== THEME_SCHEMA_VERSION;
  const inputVersion = typeof input.schemaVersion === 'number' ? input.schemaVersion : 0;
  const src = inputVersion < 3 ? migrateEmbeddedKey(input) : input;
  const componentSchemaVersion =
    typeof input.componentSchemaVersion === 'number' ? input.componentSchemaVersion : 0;
  const dropped: string[] = [];
  const now = new Date().toISOString();

  const embeddedColorsAndType = asObject(src.colorsAndType);
  let colorsAndType: Json | null = null;
  if (embeddedColorsAndType) {
    colorsAndType = stripFileMarker(embeddedColorsAndType);
  } else {
    const colorsAndTypeName = asString(src.colorsAndType, 'default');
    colorsAndType = asObject(resolvers.readColorsAndType(colorsAndTypeName));
    if (!colorsAndType) {
      dropped.push(`colors-and-type:${colorsAndTypeName}`);
      if (colorsAndTypeName !== 'default') colorsAndType = asObject(resolvers.readColorsAndType('default'));
    }
    if (colorsAndType) colorsAndType = resolvers.normalizeColorsAndType(stripFileMarker(colorsAndType));
  }

  const componentConfigs: Record<string, Json> = {};
  for (const [comp, value] of Object.entries(asObject(src.componentConfigs) ?? {})) {
    const embedded = asObject(value);
    let resolvedConfig: Json;
    if (embedded) {
      resolvedConfig = stripFileMarker(embedded);
    } else {
      const configName = asString(value, 'default');
      const resolved = asObject(resolvers.readComponentConfig(comp, configName));
      if (!resolved) {
        dropped.push(`${comp}/${configName}`);
        continue;
      }
      resolvedConfig = stripFileMarker(resolved);
    }
    componentConfigs[comp] = migrateEmbeddedComponentConfig(comp, resolvedConfig, componentSchemaVersion);
  }

  // Completeness fill (Wave 2, docs/plans/theme-completeness.md), after
  // migration (RJC 6): every component this install has, and every alias key
  // its default declares, ends up in the theme by value. Reads
  // `readComponentConfig(comp, 'default')` — the derivation product of
  // `:global(:root)` — never the Default theme, which `normalizeTheme` runs
  // ahead of at boot (RJC 11). Never deletes: a component absent from
  // `listComponentNames()` (this install does not have it) or an alias key
  // absent from the current default (an orphan, RJC 3) is left exactly as the
  // input carried it.
  const filled: NormalizedTheme['filled'] = { components: [], aliases: 0, orphans: 0 };
  for (const comp of resolvers.listComponentNames()) {
    const base = asObject(resolvers.readComponentConfig(comp, 'default'));
    const baseAliases = base ? (asObject(base.aliases) as Record<string, AliasDiskValue> | null) : null;
    if (!base || !baseAliases) continue; // no derived default to fill this component from

    const entry = componentConfigs[comp];
    if (!entry) {
      const { schemaVersion: _standaloneStamp, ...rest } = stripFileMarker(base);
      componentConfigs[comp] = structuredClone(rest);
      filled.components.push(comp);
      continue;
    }

    const entryAliases = (asObject(entry.aliases) as Record<string, AliasDiskValue> | null) ?? {};
    for (const key of Object.keys(baseAliases)) {
      if (key in entryAliases) continue;
      entryAliases[key] = structuredClone(baseAliases[key]);
      filled.aliases++;
    }
    entry.aliases = entryAliases;
    for (const key of Object.keys(entryAliases)) {
      if (!(key in baseAliases)) filled.orphans++;
    }
  }

  return {
    theme: {
      name: asString(src.name, 'Untitled'),
      createdAt: asString(src.createdAt, now),
      updatedAt: asString(src.updatedAt, now),
      schemaVersion: THEME_SCHEMA_VERSION,
      colorsAndType,
      componentConfigs,
      componentSchemaVersion: CURRENT_COMPONENT_SCHEMA_VERSION,
    },
    dropped,
    migrated,
    filled,
  };
}
