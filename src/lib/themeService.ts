import type { Theme, ThemeMeta } from './themeTypes';
import {
  versionedFileResource,
  sanitizeFileName as sanitizeFileNameImpl,
} from './files/versionedFileResource';

// ── API helpers ──────────────────────────────────────────────
//
// All theme CRUD goes through `versionedFileResource('/api/themes')` —
// shared with `componentConfigService`'s per-component clients. Theme-specific
// response shapes (ThemeMeta list payload, ProductionInfo) are layered on top
// via the generic type parameters.

export interface ProductionInfo {
  fileName: string;
  name: string;
  updatedAt: string;
  cssVariables: Record<string, string>;
}

const themeResource = versionedFileResource<Theme, ThemeMeta, ProductionInfo>({
  baseUrl: '/api/themes',
});

export async function listThemes(): Promise<ThemeMeta[]> {
  const data = await themeResource.list();
  return data.files;
}

export const loadTheme = (fileName: string): Promise<Theme> => themeResource.load(fileName);
export const saveTheme = (fileName: string, data: Theme): Promise<void> =>
  themeResource.save(fileName, data);
export const deleteTheme = (fileName: string): Promise<void> => themeResource.remove(fileName);

export async function getActiveTheme(): Promise<Theme | null> {
  return themeResource.getActive();
}

export const setActiveFile = (fileName: string): Promise<void> => themeResource.setActive(fileName);

// ── Production API helpers ─────────────────────────────────

export const getProductionInfo = (): Promise<ProductionInfo> => themeResource.getProductionInfo();

export async function setProductionFile(
  fileName: string,
): Promise<{ ok: boolean; fileName: string; name: string }> {
  const data = await themeResource.setProduction(fileName);
  return { ok: data.ok, fileName: data.fileName, name: data.name };
}

/** Sanitize a display name to a safe file name. Re-exported from the shared
 * `files/versionedFileResource` so the dev-server plugin can import the
 * canonical pure helper without depending on this module's CSS imports. */
export const sanitizeFileName = sanitizeFileNameImpl;
