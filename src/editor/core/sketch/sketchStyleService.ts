import { API_BASE } from '../storage/apiBase';
import { hydrateSketchSettings, type SketchStyleSettings } from './sketchStyles';

export interface SketchStyleFile {
  name: string;
  createdAt?: string;
  updatedAt?: string;
  settings: SketchStyleSettings;
}

export interface SketchStyleMeta {
  name: string;
  fileName: string;
  updatedAt: string;
  /** Served from the package rather than this project, so there is no local
      file to write over or delete. Saving over one creates that file. */
  isPackage: boolean;
}

const BASE = `${API_BASE}/sketch-styles`;

/** Slug for the file name. The display name is stored inside the file, so this
    only has to be stable, unique-ish and inside the route's charset. */
export function slugifySketchStyle(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60);
}

export async function listSketchStyles(): Promise<SketchStyleMeta[]> {
  const res = await fetch(BASE);
  if (!res.ok) throw new Error('Failed to list sketchstyles');
  const body = await res.json();
  return body.files ?? [];
}

export async function loadSketchStyle(fileName: string): Promise<SketchStyleFile> {
  const res = await fetch(`${BASE}/${encodeURIComponent(fileName)}`);
  if (!res.ok) throw new Error(`Failed to load sketchstyle: ${fileName}`);
  const body = await res.json();
  return { ...body, settings: hydrateSketchSettings(body.settings) };
}

export async function saveSketchStyle(
  fileName: string,
  name: string,
  settings: SketchStyleSettings,
): Promise<void> {
  const res = await fetch(`${BASE}/${encodeURIComponent(fileName)}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, settings }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Save failed' }));
    throw new Error(err.error || 'Save failed');
  }
}

export async function deleteSketchStyle(fileName: string): Promise<void> {
  const res = await fetch(`${BASE}/${encodeURIComponent(fileName)}`, { method: 'DELETE' });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Delete failed' }));
    throw new Error(err.error || 'Delete failed');
  }
}
