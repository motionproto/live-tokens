import type { Theme, ThemeMeta } from './themeTypes';
import {
  applyCssVariables as applyCssVariablesSync,
  clearAllCssVarOverrides as clearAllCssVarOverridesSync,
  scrapeCssVariables as scrapeCssVariablesSync,
} from './cssVarSync';

// ── API helpers ──────────────────────────────────────────────

export async function listThemes(): Promise<ThemeMeta[]> {
  const res = await fetch('/api/themes');
  const data = await res.json();
  return data.files;
}

export async function loadTheme(fileName: string): Promise<Theme> {
  const res = await fetch(`/api/themes/${encodeURIComponent(fileName)}`);
  if (!res.ok) throw new Error(`Failed to load theme: ${fileName}`);
  return res.json();
}

export async function saveTheme(fileName: string, data: Theme): Promise<void> {
  const res = await fetch(`/api/themes/${encodeURIComponent(fileName)}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Unknown error' }));
    throw new Error(err.error || 'Save failed');
  }
}

export async function deleteTheme(fileName: string): Promise<void> {
  const res = await fetch(`/api/themes/${encodeURIComponent(fileName)}`, {
    method: 'DELETE',
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Unknown error' }));
    throw new Error(err.error || 'Delete failed');
  }
}

export async function getActiveTheme(): Promise<Theme | null> {
  try {
    const res = await fetch('/api/themes/active');
    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  }
}

export async function setActiveFile(fileName: string): Promise<void> {
  await fetch('/api/themes/active', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: fileName }),
  });
}

// ── Production API helpers ─────────────────────────────────

export interface ProductionInfo {
  fileName: string;
  name: string;
  updatedAt: string;
  cssVariables: Record<string, string>;
}

export async function getProductionInfo(): Promise<ProductionInfo> {
  const res = await fetch('/api/themes/production');
  return res.json();
}

export async function setProductionFile(fileName: string): Promise<{ ok: boolean; fileName: string; name: string }> {
  const res = await fetch('/api/themes/production', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: fileName }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Unknown error' }));
    throw new Error(err.error || 'Update failed');
  }
  return res.json();
}

// ── Backup API helpers ──────────────────────────────────────

export interface BackupEntry {
  type: 'themes' | 'css';
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

/** Sanitize a display name to a safe file name */
export function sanitizeFileName(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9\-_]/g, '')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    || 'unnamed';
}
