import type { Theme, ThemeMeta, ThemeBundle, ColorsAndType, ComponentConfig, ThemeFillReport } from './themeTypes';
import { versionedFileResource } from '../storage/files/versionedFileResourceClient';
import { API_BASE } from '../storage/apiBase';
import { liveMovedSinceBake } from '../productionPulse';
import { listComponents, getActiveComponentConfig } from '../components/componentConfigService';
import { getActiveColorsAndType } from './colorsAndTypeService';
import { broadcastAppliedTheme, hydrateAppliedTheme } from './themeDocumentSync';
import { CURRENT_COMPONENT_SCHEMA_VERSION } from './migrations';
import { THEME_SCHEMA_VERSION } from './themeTypes';
import { liveSketchSettings, themeSketchSettings } from '../sketch/sketchStore';

export type { ThemeFillReport };

/**
 * REST client for theme files, the documents of the editor. A theme carries a
 * whole content by value: the colors and type plus a config for every component
 * this install has. One theme is open (`themes/_active.json`) and one is
 * published (`themes/_production.json`); the live content is the open theme plus
 * whatever the `_working` buffers hold over it.
 *
 * `default` is the protected baseline — cannot be overwritten or deleted, and
 * Adopt returns 409 ACTIVE_IS_PROTECTED while it is open.
 */

const themesResource = versionedFileResource<Theme, ThemeMeta>({
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

/** The published theme, served whole so the client can tell what production
 *  runs from the document itself. */
export async function getProductionTheme(): Promise<Theme> {
  const res = await fetch(`${API_BASE}/themes/production`);
  if (!res.ok) throw new Error('Failed to read the production theme');
  return res.json();
}

/** Step past the theme names already on disk rather than clobbering one. */
export function freshName(base: string, taken: Set<string>): string {
  if (!taken.has(base)) return base;
  for (let n = 1; n < 1000; n++) {
    const candidate = `${base}_${String(n).padStart(2, '0')}`;
    if (!taken.has(candidate)) return candidate;
  }
  return `${base}_${Date.now()}`;
}

export interface ApplyThemeResult {
  ok: boolean;
  theme: Theme;
  colorsAndType: ColorsAndType;
  componentConfigs: Record<string, ComponentConfig>;
  /** Components the theme carries data for that this install doesn't have. */
  skippedComponents: string[];
  /** What the completeness fill (`normalizeTheme`) had to add to reach this
   *  theme, reported so the panel can name it. */
  filled: ThemeFillReport;
}

/**
 * Open a theme: the server clears the `_working` buffers, points
 * `themes/_active.json` at it, and returns the resolved state in one payload.
 * Live reads then fall through to the theme's embedded layers.
 * Production is untouched, so trying a content cannot change what the site ships.
 * The resolved response hydrates the caller immediately, then broadcasts the
 * same typed state to every already-open same-origin host/editor document.
 * Each store renderer projects that state into its own document, so a theme
 * loaded from either side keeps the controls, aliases, and visible components
 * on the same design system without a reload.
 */
export async function applyTheme(fileName: string): Promise<ApplyThemeResult> {
  const res = await fetch(`${API_BASE}/themes/${encodeURIComponent(fileName)}/apply`, {
    method: 'PUT',
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Apply failed' }));
    throw new Error(err.error || 'Apply failed');
  }
  const result = await res.json() as ApplyThemeResult;
  hydrateAppliedTheme(fileName, result);
  broadcastAppliedTheme(fileName, result);
  return result;
}

export interface AdoptThemeResult {
  ok: boolean;
  /** The theme production now ships. */
  productionTheme: { fileName: string; name: string; updatedAt: string };
}

/**
 * Publish the open theme: `themes/_production.json` names it and
 * `tokens.generated.css` plus `fonts.css` are rebaked from its embedded
 * content. What is SAVED ships, so the caller saves the theme first; a buffer
 * the server has not been handed is invisible from here.
 *
 * Answers 409 `ACTIVE_IS_PROTECTED` while the Default theme is open, which the
 * caller recovers from by forking it under a name of the user's own.
 */
export async function adoptTheme(): Promise<AdoptThemeResult> {
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
  liveMovedSinceBake.set(false);
  return res.json();
}

/** `_fileName` and `_source` mark which document and which layer a read door
 *  answered from; neither is part of the content we send back. */
function withoutLiveMarkers<T extends { _fileName?: string; _source?: unknown }>(value: T): T {
  const { _fileName, _source, ...rest } = value;
  return rest as T;
}

/**
 * The content as it stands: the live colors and type plus the live config of
 * every component this install has, all by value. A theme is a complete
 * document (`docs/plans/theme-completeness.md`), so the capture carries every
 * component, not just the ones off their default.
 *
 * Everything comes from the live read doors, so a capture takes the buffers
 * over the open theme's own copies. The colors and type are normalised on the
 * way out of `GET /colors-and-type/active`, which matters: the server trusts an
 * already-embedded copy and runs no migrations over it on write.
 */
async function captureThemeContent(): Promise<Pick<Theme, 'colorsAndType' | 'componentConfigs' | 'sketchSettings'>> {
  const liveColorsAndType = await getActiveColorsAndType();
  if (!liveColorsAndType) {
    throw new Error('No live colors and type to capture');
  }
  const components = await listComponents();
  const configs = await Promise.all(components.map((c) => getActiveComponentConfig(c.name)));
  const componentConfigs: Record<string, ComponentConfig> = {};
  components.forEach((c, i) => {
    const config = configs[i];
    if (config) componentConfigs[c.name] = withoutLiveMarkers(config);
  });
  // Sketchstyle has no server door of its own (RJC 8): the live buffer, not a
  // fetch, is the source of truth for what the dials currently say.
  return { colorsAndType: withoutLiveMarkers(liveColorsAndType), componentConfigs, sketchSettings: liveSketchSettings() };
}

/**
 * Capture the current content into a new theme file and open it. Used by the
 * theme panel's Save As action and by the fork-then-Adopt flow the protected
 * Default theme forces.
 */
export async function saveAsTheme(
  fileName: string,
  displayName: string,
): Promise<void> {
  const content = await captureThemeContent();
  const now = new Date().toISOString();
  await saveTheme(fileName, {
    name: displayName,
    createdAt: now,
    updatedAt: now,
    schemaVersion: THEME_SCHEMA_VERSION,
    componentSchemaVersion: CURRENT_COMPONENT_SCHEMA_VERSION,
    ...content,
  });
  themeSketchSettings.set(content.sketchSettings);
  liveMovedSinceBake.set(true);
  await setActiveTheme(fileName);
}

/**
 * Re-capture the current content into the open theme file. Used by the theme
 * panel's Save action and by both Adopt paths, which publish what is saved.
 * The server rejects with 403 while the protected `default` theme is open.
 */
export async function saveActiveTheme(displayName?: string): Promise<void> {
  const active = await getActiveTheme();
  if (!active || !active._fileName) {
    throw new Error('No active theme');
  }
  const content = await captureThemeContent();
  await saveTheme(active._fileName, {
    name: displayName ?? active.name,
    createdAt: active.createdAt,
    updatedAt: new Date().toISOString(),
    schemaVersion: THEME_SCHEMA_VERSION,
    componentSchemaVersion: CURRENT_COMPONENT_SCHEMA_VERSION,
    ...content,
  });
  themeSketchSettings.set(content.sketchSettings);
  liveMovedSinceBake.set(true);
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
  /** What the completeness fill (`normalizeTheme`) had to add to reach this
   *  theme, reported so the panel can name it. */
  filled: ThemeFillReport;
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
