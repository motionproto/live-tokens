import { tick } from 'svelte';
import type { ColorsAndType, ColorsAndTypeMeta } from './themeTypes';
import type { EditorState } from '../store/editorTypes';
import {
  versionedFileResource,
  sanitizeFileName as sanitizeFileNameImpl,
} from '../storage/files/versionedFileResourceClient';
import { API_BASE } from '../storage/apiBase';
import { liveMovedSinceBake } from '../productionPulse';
import { loadFromFile as loadEditorState, toColorsAndType, markSaved, markColorsAndTypeSaved } from '../store/editorStore';
import { migrateColorsAndTypeFonts } from '../fonts/fontMigration';

// ── API helpers ──────────────────────────────────────────────
//
// Named colors-and-type files are presets: the user saves, loads and deletes
// them, and nothing machine-written lands among them. The live colors and type
// are the `_working` buffer, read back through `/colors-and-type/active`.

const colorsAndTypeResource = versionedFileResource<ColorsAndType, ColorsAndTypeMeta>({
  baseUrl: `${API_BASE}/colors-and-type`,
});

export async function listColorsAndType(): Promise<ColorsAndTypeMeta[]> {
  const data = await colorsAndTypeResource.list();
  return data.files;
}

export const loadColorsAndType = (fileName: string): Promise<ColorsAndType> => colorsAndTypeResource.load(fileName);
export const saveColorsAndType = (fileName: string, data: ColorsAndType): Promise<void> =>
  colorsAndTypeResource.save(fileName, data);
export const deleteColorsAndType = (fileName: string): Promise<void> => colorsAndTypeResource.remove(fileName);

/** The colors and type the page is running: the buffer, else the open theme's
 *  copy, else the shipped default. `_source` says which. */
export async function getActiveColorsAndType(): Promise<ColorsAndType | null> {
  return colorsAndTypeResource.getActive();
}

/** Write the unsaved buffer. Absence of the buffer means "the open theme's
 *  saved colors and type", so this is what puts the screen ahead of them. */
export async function writeWorkingColorsAndType(data: ColorsAndType): Promise<void> {
  const res = await fetch(`${API_BASE}/colors-and-type/working`, {
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

/** Sanitize a display name to a safe file name. Re-exported from the shared
 * `files/versionedFileResource` so the dev-server plugin can import the
 * canonical pure helper without depending on this module's CSS imports. */
export const sanitizeFileName = sanitizeFileNameImpl;

// ── Colors and type flush / load orchestration ─────────────
//
// `persistColorsAndType` and `hydrateColorsAndType` are the canonical entry
// points for round-tripping editor state through the server. The caller —
// `ThemePanel`, which flushes the colors and type on screen before it captures
// or ships — handles only UI-level concerns (status flashing, error chrome).

/** Flush the editor state to the buffer under `displayName`, the name of the
 *  theme the buffer belongs to, and clear the dirty flag. A capture reads the
 *  buffer back, so this is what makes Save and Adopt mean the look on screen. */
export async function persistColorsAndType(
  state: EditorState,
  displayName: string,
): Promise<void> {
  await tick();
  const colorsAndType = toColorsAndType(state, { name: displayName });
  await writeWorkingColorsAndType(colorsAndType);
  markSaved();
  markColorsAndTypeSaved(state);
}

/** Load colors and type into the editor state. The store renderer projects
 *  font sources, stacks, and all other CSS variables in one reactive pass. */
export function hydrateColorsAndType(colorsAndType: ColorsAndType): void {
  migrateColorsAndTypeFonts(colorsAndType);
  loadEditorState(colorsAndType);
}
