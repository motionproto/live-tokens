import type { Theme, ThemeMeta, ThemeBundle, ColorsAndType, ComponentConfig } from './themeTypes';
import { versionedFileResource } from '../storage/files/versionedFileResourceClient';
import { API_BASE } from '../storage/apiBase';
import { listComponents, loadComponentConfig } from '../components/componentConfigService';
import { getActiveColorsAndType } from './colorsAndTypeService';

/**
 * REST client for theme files. A theme carries a whole look by value: the
 * colors and type plus a config for every component that is off its default. The
 * active theme is the single live snapshot — colors-and-type and component
 * Adopts re-embed that slice server-side.
 *
 * `default` is the protected baseline — cannot be overwritten or deleted, and
 * Adopts return 409 ACTIVE_IS_PROTECTED while it is active.
 */

const themesResource = versionedFileResource<Theme, ThemeMeta, never>({
  baseUrl: `${API_BASE}/themes`,
});

export const listThemes = async (): Promise<ThemeMeta[]> => {
  const data = await themesResource.list();
  return data.files;
};

export const loadTheme = (fileName: string): Promise<Theme> =>
  themesResource.load(fileName);
export const saveTheme = (fileName: string, data: Theme): Promise<void> =>
  themesResource.save(fileName, data);
export const deleteTheme = (fileName: string): Promise<void> =>
  themesResource.remove(fileName);
export const getActiveTheme = (): Promise<Theme | null> => themesResource.getActive();
export const setActiveTheme = (fileName: string): Promise<void> =>
  themesResource.setActive(fileName);

export interface ApplyThemeResult {
  ok: boolean;
  theme: Theme;
  colorsAndType: ColorsAndType;
  componentConfigs: Record<string, ComponentConfig>;
  /** Components the theme carries data for that this install doesn't have. */
  skippedComponents: string[];
}

/**
 * Server-side apply: materialise the theme's embedded colors and type and configs into
 * working files under its slug, flip each `_active.json` / `_production.json`
 * pointer at them, sync tokens.css/fonts.css, mark the theme active, and
 * return the resolved state in one payload. Components the theme doesn't
 * carry go back to their defaults — a theme is a complete look. Clients
 * usually follow with a full page reload; theme load is a "blow up the
 * world" action.
 */
export async function applyTheme(fileName: string): Promise<ApplyThemeResult> {
  const res = await fetch(`${API_BASE}/themes/${encodeURIComponent(fileName)}/apply`, {
    method: 'PUT',
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Apply failed' }));
    throw new Error(err.error || 'Apply failed');
  }
  return res.json();
}

export interface AdoptLookResult {
  ok: boolean;
  /** False when production was already running the look: nothing was written. */
  promoted: boolean;
  /** The colors and type promoted, or null when production already ran them. */
  colorsAndType: { fileName: string; name: string } | null;
  /** Names of the components promoted. */
  components: string[];
}

/**
 * Ship the whole look: one door that promotes the colors-and-type layer and every
 * component whose active config is not what production runs, then re-embeds
 * the shipped state in the active look. What is saved goes; unsaved editor
 * state is not visible to the server and stays behind.
 *
 * Answers 409 `ACTIVE_IS_PROTECTED` while the Default look is active, which
 * the caller recovers from by forking it and retrying.
 */
export async function adoptLook(): Promise<AdoptLookResult> {
  const res = await fetch(`${API_BASE}/production`, { method: 'PUT' });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    const err = new Error(body.error || 'Adopt failed') as Error & {
      status?: number;
      code?: string;
    };
    err.status = res.status;
    if (body.code) err.code = body.code;
    throw err;
  }
  return res.json();
}

/** `_fileName` marks which file a read door answered from; it is never part of
 *  the content we send back. */
function withoutFileMarker<T extends { _fileName?: string }>(value: T): T {
  const { _fileName, ...rest } = value;
  return rest as T;
}

/**
 * The look as it stands: the active colors and type plus the active config of
 * every component that sits off its default, all by value. Delta encoding — a
 * component absent from the map runs the local default, which stays canonical.
 *
 * The colors and type come from `GET /colors-and-type/active`, which normalises before it
 * answers. That matters: the server trusts an already-embedded copy and runs
 * no migrations over it on write.
 */
async function captureLook(): Promise<Pick<Theme, 'colorsAndType' | 'componentConfigs'>> {
  const activeColorsAndType = await getActiveColorsAndType();
  if (!activeColorsAndType) {
    throw new Error('No active theme to capture');
  }
  const overridden = (await listComponents()).filter(
    (c) => c.activeFile && c.activeFile !== 'default',
  );
  const configs = await Promise.all(
    overridden.map((c) => loadComponentConfig(c.name, c.activeFile)),
  );
  const componentConfigs: Record<string, ComponentConfig> = {};
  overridden.forEach((c, i) => {
    componentConfigs[c.name] = withoutFileMarker(configs[i]);
  });
  return { colorsAndType: withoutFileMarker(activeColorsAndType), componentConfigs };
}

/**
 * Capture the current look into a new theme file and set it active. Used by
 * the theme panel's Save As action and by the SaveAs-then-Adopt recovery
 * flow when active is `default`.
 */
export async function saveAsTheme(
  fileName: string,
  displayName: string,
): Promise<void> {
  const look = await captureLook();
  const now = new Date().toISOString();
  await saveTheme(fileName, {
    name: displayName,
    createdAt: now,
    updatedAt: now,
    schemaVersion: 3,
    ...look,
  });
  await setActiveTheme(fileName);
}

/**
 * Re-capture the current look into the *currently active* theme file. Used
 * by the theme panel's Save action. Server rejects with 403 if active is
 * `default` (protected).
 */
export async function saveActiveTheme(displayName?: string): Promise<void> {
  const active = await getActiveTheme();
  if (!active || !active._fileName) {
    throw new Error('No active theme');
  }
  const look = await captureLook();
  await saveTheme(active._fileName, {
    name: displayName ?? active.name,
    createdAt: active.createdAt,
    updatedAt: new Date().toISOString(),
    schemaVersion: 3,
    ...look,
  });
}

export interface ImportThemeResult {
  ok: boolean;
  /** Final theme filename (may be renamed if it collided with an existing one). */
  theme: string;
  /** Keyed `theme:<orig>` → final name. */
  renames: Record<string, string>;
  /** Refs a v1 bundle failed to carry, as `colors-and-type:<name>` /
   *  `<comp>/<name>`. Each fell back to the default. */
  dropped: string[];
}

/**
 * Fetch the theme as a `ThemeBundle` and trigger a browser download.
 * Hidden-anchor trick — no infrastructure beyond the existing GET
 * `/api/themes/:name/export` endpoint.
 */
export async function exportTheme(fileName: string): Promise<void> {
  const res = await fetch(`${API_BASE}/themes/${encodeURIComponent(fileName)}/export`);
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Export failed' }));
    throw new Error(err.error || 'Export failed');
  }
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  try {
    const a = document.createElement('a');
    a.href = url;
    a.download = `${fileName}.bundle.json`;
    document.body.appendChild(a);
    a.click();
    a.remove();
  } finally {
    URL.revokeObjectURL(url);
  }
}

/**
 * POST a `ThemeBundle` to the import endpoint. The server writes one
 * theme file (renaming on collision) and returns its final name; nothing is
 * materialised until Apply. v1 bundles from older installs are accepted too.
 */
export async function importTheme(bundle: ThemeBundle): Promise<ImportThemeResult> {
  const res = await fetch(`${API_BASE}/themes/import`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(bundle),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Import failed' }));
    throw new Error(err.error || 'Import failed');
  }
  return res.json();
}
