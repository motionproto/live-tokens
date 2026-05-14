import type { Preset, PresetMeta, Theme, ComponentConfig } from './themeTypes';
import { versionedFileResource } from './files/versionedFileResource';
import { listComponents } from './componentConfigService';
import { getActiveTheme, getProductionInfo } from './themeService';

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

// ── Production preset ──────────────────────────────────────────────────────
//
// The production preset is the manifest whose references describe what
// tokens.css + the component overrides block currently encode. A separate
// pointer (`presets/_production.json`) from the active preset lets the editor
// run experiments without disturbing what end users see. Applying a preset to
// production flips every per-artifact `_production.json` pointer to match the
// manifest and re-bakes css.

export interface PresetProductionInfo {
  fileName: string;
  name: string;
  theme: string;
  componentConfigs: Record<string, string>;
  updatedAt: string;
}

export async function getProductionPreset(): Promise<PresetProductionInfo | null> {
  try {
    const res = await fetch('/api/presets/production');
    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  }
}

export async function applyPresetToProduction(fileName: string): Promise<PresetProductionInfo> {
  const res = await fetch('/api/presets/production', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: fileName }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Apply to production failed' }));
    throw new Error(err.error || 'Apply to production failed');
  }
  return res.json();
}

/**
 * Snapshot whatever each artifact's `_production.json` currently points at
 * into a new preset manifest. Recovery path when individual component Adopts
 * have drifted production away from the production preset and the user wants
 * to preserve that state under a name rather than re-converge to a preset.
 *
 * Does NOT flip `presets/_production.json` — the new preset's references
 * already match production by construction, but tagging it as the production
 * preset is a separate UX decision left to the caller.
 */
export async function captureProductionAsPreset(
  fileName: string,
  displayName: string,
): Promise<void> {
  const themeInfo = await getProductionInfo();
  const components = await listComponents();
  const componentConfigs: Record<string, string> = {};
  for (const c of components) {
    componentConfigs[c.name] = c.productionFile || 'default';
  }
  const now = new Date().toISOString();
  const manifest: Preset = {
    name: displayName,
    createdAt: now,
    updatedAt: now,
    theme: themeInfo.fileName,
    componentConfigs,
  };
  await savePreset(fileName, manifest);
}

/**
 * Three states comparing the active preset against current production:
 *   - 'in-production' — active preset IS the production preset AND every
 *      manifest reference matches the per-artifact production pointer.
 *   - 'editor-only'   — the production preset is a different preset; applying
 *      this one would flip pointers.
 *   - 'diverged'      — this IS the production preset, but per-artifact
 *      production has drifted (individual component Adopt clicks since the
 *      last apply). Two recovery paths: re-apply to converge, or capture
 *      production as a new preset to name the divergence.
 */
export type ProductionPresetStatus = 'in-production' | 'editor-only' | 'diverged';

export interface ProductionComparison {
  status: ProductionPresetStatus;
  productionPreset: PresetProductionInfo | null;
  themeDrift: boolean;
  driftedComponents: string[];
}

export async function compareActiveToProduction(
  activePreset: Preset,
): Promise<ProductionComparison> {
  const [productionPreset, themeInfo, components] = await Promise.all([
    getProductionPreset(),
    getProductionInfo(),
    listComponents(),
  ]);
  const componentProdMap = new Map(components.map((c) => [c.name, c.productionFile]));
  const themeDrift = themeInfo.fileName !== activePreset.theme;
  const driftedComponents: string[] = [];
  for (const [comp, file] of Object.entries(activePreset.componentConfigs)) {
    const prod = componentProdMap.get(comp);
    if (prod !== file) driftedComponents.push(comp);
  }
  const manifestMatches = !themeDrift && driftedComponents.length === 0;
  const activeFile = activePreset._fileName;
  const isActiveProductionPreset =
    !!activeFile && !!productionPreset && productionPreset.fileName === activeFile;

  let status: ProductionPresetStatus;
  if (!isActiveProductionPreset) {
    status = 'editor-only';
  } else {
    status = manifestMatches ? 'in-production' : 'diverged';
  }
  return { status, productionPreset, themeDrift, driftedComponents };
}
