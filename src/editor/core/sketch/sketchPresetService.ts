import { API_BASE } from '../storage/apiBase';
import { hydrateSketchSettings, type SketchSettings } from './sketchPresets';

export interface SketchPresetFile {
  name: string;
  createdAt?: string;
  updatedAt?: string;
  settings: SketchSettings;
}

export interface SketchPresetMeta {
  name: string;
  fileName: string;
  updatedAt: string;
}

const BASE = `${API_BASE}/sketch-presets`;

/** Slug for the file name. The display name is stored inside the file, so this
    only has to be stable, unique-ish and inside the route's charset. */
export function slugifySketchPreset(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60);
}

export async function listSketchPresets(): Promise<SketchPresetMeta[]> {
  const res = await fetch(BASE);
  if (!res.ok) throw new Error('Failed to list sketch presets');
  const body = await res.json();
  return body.files ?? [];
}

export async function loadSketchPreset(fileName: string): Promise<SketchPresetFile> {
  const res = await fetch(`${BASE}/${encodeURIComponent(fileName)}`);
  if (!res.ok) throw new Error(`Failed to load sketch preset: ${fileName}`);
  const body = await res.json();
  return { ...body, settings: hydrateSketchSettings(body.settings) };
}

export async function saveSketchPreset(
  fileName: string,
  name: string,
  settings: SketchSettings,
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

export async function deleteSketchPreset(fileName: string): Promise<void> {
  const res = await fetch(`${BASE}/${encodeURIComponent(fileName)}`, { method: 'DELETE' });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Delete failed' }));
    throw new Error(err.error || 'Delete failed');
  }
}
