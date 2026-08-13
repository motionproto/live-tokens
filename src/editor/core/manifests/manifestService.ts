import type { Manifest, ManifestMeta, ManifestBundle, Theme, ComponentConfig } from '../themes/themeTypes';
import { versionedFileResource } from '../storage/files/versionedFileResourceClient';
import { API_BASE } from '../storage/apiBase';
import { listComponents } from '../components/componentConfigService';
import { getActiveTheme } from '../themes/themeService';

/**
 * REST client for manifest files. A manifest carries a whole look by value: the
 * theme plus a config for every component that is off its default. The active
 * manifest is the single live snapshot — theme and component Adopts re-embed
 * that slice server-side.
 *
 * `default` is the protected baseline — cannot be overwritten or deleted, and
 * Adopts return 409 ACTIVE_IS_PROTECTED while it is active.
 */

/**
 * What the save functions below still send: file names rather than content. The
 * server resolves and embeds them on write, so disk holds the encapsulated form
 * either way.
 */
type ManifestPointerPayload = {
  name: string;
  createdAt: string;
  updatedAt: string;
  theme: string;
  componentConfigs: Record<string, string>;
};

const manifestsResource = versionedFileResource<Manifest, ManifestMeta, never>({
  baseUrl: `${API_BASE}/manifests`,
});

export const listManifests = async (): Promise<ManifestMeta[]> => {
  const data = await manifestsResource.list();
  return data.files;
};

export const loadManifest = (fileName: string): Promise<Manifest> =>
  manifestsResource.load(fileName);
export const saveManifest = (fileName: string, data: Manifest): Promise<void> =>
  manifestsResource.save(fileName, data);
export const deleteManifest = (fileName: string): Promise<void> =>
  manifestsResource.remove(fileName);
export const getActiveManifest = (): Promise<Manifest | null> => manifestsResource.getActive();
export const setActiveManifest = (fileName: string): Promise<void> =>
  manifestsResource.setActive(fileName);

export interface ApplyManifestResult {
  ok: boolean;
  manifest: Manifest;
  theme: Theme;
  componentConfigs: Record<string, ComponentConfig>;
  /** Components the manifest carries data for that this install doesn't have. */
  skippedComponents: string[];
}

/**
 * Server-side apply: materialise the manifest's embedded theme and configs into
 * working files under its slug, flip each `_active.json` / `_production.json`
 * pointer at them, sync tokens.css/fonts.css, mark the manifest active, and
 * return the resolved state in one payload. Components the manifest doesn't
 * carry go back to their defaults — a manifest is a complete look. Clients
 * usually follow with a full page reload; manifest load is a "blow up the
 * world" action.
 */
export async function applyManifest(fileName: string): Promise<ApplyManifestResult> {
  const res = await fetch(`${API_BASE}/manifests/${encodeURIComponent(fileName)}/apply`, {
    method: 'PUT',
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Apply failed' }));
    throw new Error(err.error || 'Apply failed');
  }
  return res.json();
}

/**
 * Snapshot the currently-active theme + component-config file pointers into
 * a new manifest file and set it active. Used by the manifest panel's Save As
 * action and by the SaveAs-then-Adopt recovery flow when active is `default`.
 */
export async function saveAsManifest(
  fileName: string,
  displayName: string,
): Promise<void> {
  const activeTheme = await getActiveTheme();
  if (!activeTheme || !activeTheme._fileName) {
    throw new Error('No active theme on disk to capture');
  }
  const components = await listComponents();
  const componentConfigs: Record<string, string> = {};
  for (const c of components) {
    componentConfigs[c.name] = c.activeFile || 'default';
  }
  const now = new Date().toISOString();
  const manifest: ManifestPointerPayload = {
    name: displayName,
    createdAt: now,
    updatedAt: now,
    theme: activeTheme._fileName,
    componentConfigs,
  };
  await saveManifest(fileName, manifest as unknown as Manifest);
  await setActiveManifest(fileName);
}

/**
 * Re-snapshot the editor's current active pointers into the *currently active*
 * manifest file. Used by the manifest panel's Save action. Server rejects with
 * 403 if active is `default` (protected).
 */
export async function saveActiveManifest(displayName?: string): Promise<void> {
  const active = await getActiveManifest();
  if (!active || !active._fileName) {
    throw new Error('No active manifest');
  }
  const activeTheme = await getActiveTheme();
  if (!activeTheme || !activeTheme._fileName) {
    throw new Error('No active theme on disk');
  }
  const components = await listComponents();
  const componentConfigs: Record<string, string> = {};
  for (const c of components) {
    componentConfigs[c.name] = c.activeFile || 'default';
  }
  const manifest: ManifestPointerPayload = {
    name: displayName ?? active.name,
    createdAt: active.createdAt,
    updatedAt: new Date().toISOString(),
    theme: activeTheme._fileName,
    componentConfigs,
  };
  await saveManifest(active._fileName, manifest as unknown as Manifest);
}

export interface ImportManifestResult {
  ok: boolean;
  /** Final manifest filename (may be renamed if it collided with an existing one). */
  manifest: string;
  /** Keyed `manifest:<orig>` → final name. */
  renames: Record<string, string>;
  /** Refs a v1 bundle failed to carry, as `theme:<name>` / `<comp>/<name>`.
   *  Each fell back to the default. */
  dropped: string[];
}

/**
 * Fetch the manifest as a `ManifestBundle` and trigger a browser download.
 * Hidden-anchor trick — no infrastructure beyond the existing GET
 * `/api/manifests/:name/export` endpoint.
 */
export async function exportManifest(fileName: string): Promise<void> {
  const res = await fetch(`${API_BASE}/manifests/${encodeURIComponent(fileName)}/export`);
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
 * POST a `ManifestBundle` to the import endpoint. The server writes one
 * manifest file (renaming on collision) and returns its final name; nothing is
 * materialised until Apply. v1 bundles from older installs are accepted too.
 */
export async function importManifest(bundle: ManifestBundle): Promise<ImportManifestResult> {
  const res = await fetch(`${API_BASE}/manifests/import`, {
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
