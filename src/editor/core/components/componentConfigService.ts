import type { ComponentConfig, ComponentConfigMeta, LiveSource } from '../themes/themeTypes';
import type { EditorState } from '../store/editorTypes';
import { versionedFileResource } from '../storage/files/versionedFileResourceClient';
import { API_BASE } from '../storage/apiBase';
import { liveMovedSinceBake } from '../productionPulse';
import { CURRENT_COMPONENT_SCHEMA_VERSION } from '../themes/migrations';
import { refToDiskValue } from '../store/cssVarRef';

/**
 * REST client for per-component config files. Parallel to `colorsAndTypeService.ts`
 * but scoped to `${API_BASE}/component-configs/*`. Each component (button,
 * card, …) has a `default.json` generated from its `.svelte` source, a reserved
 * `_working.json` buffer holding whatever the editor is running, and any number
 * of user-saved presets.
 */

export interface ComponentSummary {
  name: string;
  /** Where the component's live config resolves from. */
  source: LiveSource;
}

export interface ComponentConfigList {
  component: string;
  files: ComponentConfigMeta[];
}

export async function listComponents(): Promise<ComponentSummary[]> {
  const res = await fetch(`${API_BASE}/component-configs`);
  if (!res.ok) throw new Error('Failed to list components');
  const data = await res.json();
  return data.components;
}

function resourceFor(component: string) {
  return versionedFileResource<ComponentConfig, ComponentConfigMeta>({
    baseUrl: `${API_BASE}/component-configs/${encodeURIComponent(component)}`,
  });
}

export async function listComponentConfigs(component: string): Promise<ComponentConfigList> {
  const data = await resourceFor(component).list();
  return { component, files: data.files };
}

export const loadComponentConfig = (
  component: string,
  fileName: string,
): Promise<ComponentConfig> => resourceFor(component).load(fileName);

export const saveComponentConfig = (
  component: string,
  fileName: string,
  data: ComponentConfig,
): Promise<void> => resourceFor(component).save(fileName, data);

export const deleteComponentConfig = (component: string, fileName: string): Promise<void> =>
  resourceFor(component).remove(fileName);

/** The config the component is running: the buffer, else the open theme's
 *  copy (every theme carries every component by value). `_source` says which. */
export const getActiveComponentConfig = (component: string): Promise<ComponentConfig | null> =>
  resourceFor(component).getActive();

/** Serialize one live component slice into the on-disk config shape. Shared by
 * the component editor's local checkpoint and the theme-level save-all flow. */
export function componentConfigFromState(
  state: EditorState,
  component: string,
  displayName: string,
): ComponentConfig {
  const now = new Date().toISOString();
  const slice = state.components[component];
  return {
    name: displayName,
    component,
    createdAt: now,
    updatedAt: now,
    aliases: Object.fromEntries(
      Object.entries(slice?.aliases ?? {}).map(([name, ref]) => [name, refToDiskValue(ref)]),
    ),
    config: { ...(slice?.config ?? {}) },
    schemaVersion: CURRENT_COMPONENT_SCHEMA_VERSION,
  };
}

/** Write the component's unsaved buffer. */
export async function writeWorkingComponentConfig(
  component: string,
  data: ComponentConfig,
): Promise<void> {
  const res = await fetch(`${API_BASE}/component-configs/${encodeURIComponent(component)}/working`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Write failed' }));
    throw new Error(err.error || 'Write failed');
  }
  liveMovedSinceBake.set(true);
}
