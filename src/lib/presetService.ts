import type { Preset, PresetMeta, Theme, ComponentConfig } from './themeTypes';
import { versionedFileResource } from './files/versionedFileResource';
import { listComponents } from './componentConfigService';
import { getActiveTheme } from './themeService';

/**
 * REST client for preset (bundle) manifest files. Each preset file references
 * a theme file basename + a per-component config file basename. Loading a
 * preset flips the corresponding `_active.json` pointers via `applyPreset`,
 * leaving the underlying theme + component-config files as the source of
 * truth.
 *
 * Mirrors the lifecycle of `themeService.ts` and `componentConfigService.ts`
 * but adds one custom route — `PUT /api/presets/:name/apply` — that the
 * server uses to atomically validate every reference and flip every pointer
 * in one shot.
 */

const presetsResource = versionedFileResource<Preset, PresetMeta, never>({
  baseUrl: '/api/presets',
});

export const listPresets = async (): Promise<PresetMeta[]> => {
  const data = await presetsResource.list();
  return data.files;
};

export const loadPreset = (fileName: string): Promise<Preset> =>
  presetsResource.load(fileName);
export const savePreset = (fileName: string, data: Preset): Promise<void> =>
  presetsResource.save(fileName, data);
export const deletePreset = (fileName: string): Promise<void> =>
  presetsResource.remove(fileName);
export const getActivePreset = (): Promise<Preset | null> => presetsResource.getActive();
export const setActivePreset = (fileName: string): Promise<void> =>
  presetsResource.setActive(fileName);

export interface ApplyPresetResult {
  ok: boolean;
  preset: Preset;
  theme: Theme;
  componentConfigs: Record<string, ComponentConfig>;
}

/**
 * Server-side atomic apply: validate every referenced file exists, flip the
 * theme + each component's `_active.json` pointer, and return the resolved
 * theme + component configs in one payload.
 *
 * The client typically follows this with a full page reload — loading a
 * preset is a "blow up the world" action and preserving editor session
 * state across that boundary is low value.
 */
export async function applyPreset(fileName: string): Promise<ApplyPresetResult> {
  const res = await fetch(`/api/presets/${encodeURIComponent(fileName)}/apply`, {
    method: 'PUT',
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Apply failed' }));
    throw new Error(err.error || 'Apply failed');
  }
  return res.json();
}

/**
 * Build a manifest from the *currently active files on disk* (not in-memory
 * editor state) and persist it. Dirty editor state isn't a file yet, so it's
 * not part of any preset until the user saves it. Callers should warn the
 * user via the UI if `$dirty` is true before invoking this.
 */
export async function captureCurrentAsPreset(
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
  const manifest: Preset = {
    name: displayName,
    createdAt: now,
    updatedAt: now,
    theme: activeTheme._fileName,
    componentConfigs,
  };
  await savePreset(fileName, manifest);
  await setActivePreset(fileName);
}
