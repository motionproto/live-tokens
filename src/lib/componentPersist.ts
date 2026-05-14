import { get } from 'svelte/store';
import type { ComponentConfig } from './themeTypes';
import { editorState, markComponentSaved } from './editorStore';
import type { CssVarRef } from './editorTypes';
import { CURRENT_COMPONENT_SCHEMA_VERSION } from './migrations';
import {
  listComponentConfigs,
  saveComponentConfig,
  setActiveComponentFile,
} from './componentConfigService';

/**
 * Save the current in-memory state of a component to its active file. Mirrors
 * the `persist` flow inside `ComponentFileManager.svelte` so callers without a
 * file-manager instance (e.g. the unsaved-components dialog in PresetFileManager)
 * can save a dirty component without duplicating the schema-version + aliases
 * stringification logic.
 *
 * Refuses to overwrite `default` — that's the protected source-derived snapshot.
 * Callers that hit `{ ok: false, reason: 'default' }` should prompt for a new
 * name and re-route to a Save-As flow.
 */
export type SaveActiveComponentResult =
  | { ok: true; fileName: string; displayName: string }
  | { ok: false; reason: 'default' | 'no-state' | 'error'; error?: unknown };

function refToString(ref: CssVarRef): string {
  return ref.kind === 'token' ? ref.name : ref.value;
}

export async function saveActiveComponentConfig(
  component: string,
): Promise<SaveActiveComponentResult> {
  const slice = get(editorState).components[component];
  if (!slice) return { ok: false, reason: 'no-state' };

  try {
    const list = await listComponentConfigs(component);
    const fileName = list.activeFile;
    if (fileName === 'default') return { ok: false, reason: 'default' };

    const active = list.files.find((f) => f.fileName === fileName);
    const displayName = active?.name ?? fileName;

    const now = new Date().toISOString();
    const aliases: Record<string, string> = {};
    for (const [k, ref] of Object.entries(slice.aliases)) aliases[k] = refToString(ref);

    const data: ComponentConfig = {
      name: displayName,
      component,
      createdAt: now,
      updatedAt: now,
      aliases,
      config: { ...slice.config },
      schemaVersion: CURRENT_COMPONENT_SCHEMA_VERSION,
    };
    await saveComponentConfig(component, fileName, data);
    await setActiveComponentFile(component, fileName);
    markComponentSaved(component);
    return { ok: true, fileName, displayName };
  } catch (error) {
    return { ok: false, reason: 'error', error };
  }
}
