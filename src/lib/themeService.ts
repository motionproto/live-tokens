import type { Theme, ThemeMeta } from './themeTypes';
import {
  applyCssVariables as applyCssVariablesSync,
  clearAllCssVarOverrides as clearAllCssVarOverridesSync,
  scrapeCssVariables as scrapeCssVariablesSync,
} from './cssVarSync';
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

// ── Backup API helpers ──────────────────────────────────────

export interface BackupEntry {
  type: 'themes' | 'css' | 'component-configs';
  file: string;
  name: string;
  timestamp: string;
  size: number;
}

export async function listBackups(): Promise<BackupEntry[]> {
  const res = await fetch('/api/backups');
  const data = await res.json();
  return data.backups;
}

export async function getBackupContent(type: string, file: string): Promise<string> {
  const res = await fetch(`/api/backups/${type}/${encodeURIComponent(file)}`);
  if (!res.ok) throw new Error('Failed to load backup');
  const data = await res.json();
  return data.content;
}

export async function restoreBackup(type: string, file: string): Promise<void> {
  const res = await fetch(`/api/backups/${type}/${encodeURIComponent(file)}/restore`, {
    method: 'POST',
  });
  if (!res.ok) throw new Error('Restore failed');
}

export async function getCurrentCss(): Promise<string> {
  const res = await fetch('/api/current-css');
  const data = await res.json();
  return data.content;
}

// ── CSS variable utilities ───────────────────────────────────
// Implementations live in cssVarSync.ts so writes can fan out to the
// parent document when running inside the live-preview overlay iframe.
// Re-exported here to preserve existing call sites.

export const clearAllCssVarOverrides = clearAllCssVarOverridesSync;
export const applyCssVariables = applyCssVariablesSync;
export const scrapeCssVariables = scrapeCssVariablesSync;

/** Sanitize a display name to a safe file name. Re-exported from the shared
 * `files/versionedFileResource` so the dev-server plugin can import the
 * canonical pure helper without depending on this module's CSS imports. */
export const sanitizeFileName = sanitizeFileNameImpl;
