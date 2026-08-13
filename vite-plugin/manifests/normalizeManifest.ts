/**
 * Manifest schema v1 → v2. v1 manifests pointed at a theme file and a config
 * file per component by basename; v2 carries that data by value, so deleting a
 * working file can never break a saved look.
 *
 * Pure: every disk (or bundle) lookup arrives through `ManifestResolvers`, and
 * unresolvable refs come back in `dropped` rather than being logged here — the
 * boot migration reports them once, read doors stay quiet.
 */

export const MANIFEST_SCHEMA_VERSION = 2;

type Json = Record<string, unknown>;

export interface ManifestResolvers {
  readTheme(name: string): unknown;
  readComponentConfig(comp: string, name: string): unknown;
  /**
   * Applied to a theme at the moment it is embedded. Read doors trust already
   * embedded themes: every write path that embeds one runs it through here
   * first, so the stored copy is already reconciled.
   */
  normalizeTheme(theme: Json): Json;
}

export interface EncapsulatedManifest {
  name: string;
  createdAt: string;
  updatedAt: string;
  schemaVersion: typeof MANIFEST_SCHEMA_VERSION;
  /** Full theme content. `null` only when nothing resolved, including the
   *  default — callers surface that as an error. */
  theme: Json | null;
  /** Component id → its config, embedded by value. Delta encoding: a component
   *  absent here is on its default. */
  componentConfigs: Record<string, Json>;
}

export interface NormalizedManifest {
  manifest: EncapsulatedManifest;
  /** Refs that resolved to nothing, as `theme:<name>` / `<comp>/<name>`. Each
   *  fell back to the default. */
  dropped: string[];
  /** The input was pointer-form and got resolved and embedded. */
  migrated: boolean;
}

function asObject(value: unknown): Json | null {
  return value && typeof value === 'object' && !Array.isArray(value) ? (value as Json) : null;
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

export function normalizeManifest(
  raw: unknown,
  resolvers: ManifestResolvers,
): NormalizedManifest {
  const src = asObject(raw) ?? {};
  const dropped: string[] = [];
  const now = new Date().toISOString();

  const embeddedTheme = asObject(src.theme);
  let theme: Json | null = null;
  if (embeddedTheme) {
    theme = stripFileMarker(embeddedTheme);
  } else {
    const themeName = asString(src.theme, 'default');
    theme = asObject(resolvers.readTheme(themeName));
    if (!theme) {
      dropped.push(`theme:${themeName}`);
      if (themeName !== 'default') theme = asObject(resolvers.readTheme('default'));
    }
    if (theme) theme = resolvers.normalizeTheme(stripFileMarker(theme));
  }

  const componentConfigs: Record<string, Json> = {};
  for (const [comp, value] of Object.entries(asObject(src.componentConfigs) ?? {})) {
    const embedded = asObject(value);
    if (embedded) {
      componentConfigs[comp] = stripFileMarker(embedded);
      continue;
    }
    const configName = asString(value, 'default');
    if (configName === 'default') continue; // delta encoding: default means absent
    const resolved = asObject(resolvers.readComponentConfig(comp, configName));
    if (!resolved) {
      dropped.push(`${comp}/${configName}`);
      continue;
    }
    componentConfigs[comp] = stripFileMarker(resolved);
  }

  return {
    manifest: {
      name: asString(src.name, 'Untitled'),
      createdAt: asString(src.createdAt, now),
      updatedAt: asString(src.updatedAt, now),
      schemaVersion: MANIFEST_SCHEMA_VERSION,
      theme,
      componentConfigs,
    },
    dropped,
    migrated: src.schemaVersion !== MANIFEST_SCHEMA_VERSION,
  };
}
