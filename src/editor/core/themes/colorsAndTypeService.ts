import { tick } from 'svelte';
import type { ColorsAndType, ColorsAndTypeMeta } from './themeTypes';
import type { EditorState } from '../store/editorTypes';
import {
  versionedFileResource,
  sanitizeFileName as sanitizeFileNameImpl,
} from '../storage/files/versionedFileResourceClient';
import { API_BASE } from '../storage/apiBase';
import { loadFromFile as loadEditorState, toColorsAndType, markSaved, markColorsAndTypeSaved } from '../store/editorStore';
import { activeFileName } from '../store/editorConfigStore';
import { applyFontSources, applyFontStacks } from '../fonts/fontLoader';
import { migrateColorsAndTypeFonts } from '../fonts/fontMigration';

// ── API helpers ──────────────────────────────────────────────
//
// All colors-and-type CRUD goes through
// `versionedFileResource(`${API_BASE}/themes`)` — shared with
// `componentConfigService`'s per-component clients. The resource-specific
// response shapes (ColorsAndTypeMeta list payload, ProductionInfo) are layered
// on top via the generic type parameters.

export interface ProductionInfo {
  fileName: string;
  name: string;
  updatedAt: string;
  cssVariables: Record<string, string>;
}

const colorsAndTypeResource = versionedFileResource<ColorsAndType, ColorsAndTypeMeta, ProductionInfo>({
  baseUrl: `${API_BASE}/themes`,
});

export async function listColorsAndType(): Promise<ColorsAndTypeMeta[]> {
  const data = await colorsAndTypeResource.list();
  return data.files;
}

export const loadColorsAndType = (fileName: string): Promise<ColorsAndType> => colorsAndTypeResource.load(fileName);
export const saveColorsAndType = (fileName: string, data: ColorsAndType): Promise<void> =>
  colorsAndTypeResource.save(fileName, data);
export const deleteColorsAndType = (fileName: string): Promise<void> => colorsAndTypeResource.remove(fileName);

export async function getActiveColorsAndType(): Promise<ColorsAndType | null> {
  return colorsAndTypeResource.getActive();
}

export const setActiveFile = (fileName: string): Promise<void> => colorsAndTypeResource.setActive(fileName);

// ── Production API helpers ─────────────────────────────────

export const getProductionInfo = (): Promise<ProductionInfo> => colorsAndTypeResource.getProductionInfo();

export async function setProductionFile(
  fileName: string,
): Promise<{ ok: boolean; fileName: string; name: string }> {
  const data = await colorsAndTypeResource.setProduction(fileName);
  return { ok: data.ok, fileName: data.fileName, name: data.name };
}

/** Sanitize a display name to a safe file name. Re-exported from the shared
 * `files/versionedFileResource` so the dev-server plugin can import the
 * canonical pure helper without depending on this module's CSS imports. */
export const sanitizeFileName = sanitizeFileNameImpl;

// ── Colors and type save/load orchestration ────────────────
//
// `persistColorsAndType` and `hydrateColorsAndType` are the canonical entry
// points for round-tripping editor state to disk. The caller — `ThemePanel`,
// which flushes the colors and type on screen before it captures or ships —
// needs only handle UI-level concerns (status flashing, error chrome) and
// delegate the actual orchestration here.

/** Snapshot the editor state to disk under `fileName`, mark the file active,
 *  and clear the dirty flag. The caller is responsible for surfacing
 *  saving / saved / error UI states around this call. */
export async function persistColorsAndType(
  state: EditorState,
  fileName: string,
  displayName: string,
): Promise<void> {
  await tick();
  const colorsAndType = toColorsAndType(state, { name: displayName });
  await saveColorsAndType(fileName, colorsAndType);
  await setActiveFile(fileName);
  activeFileName.set(fileName);
  markSaved();
  markColorsAndTypeSaved(state);
}

/** Load a colors-and-type file into the editor state and re-apply font
 *  side-effects (@font-face rules + `--font-*` CSS vars on :root). */
export async function hydrateColorsAndType(fileName: string): Promise<void> {
  const colorsAndType = await loadColorsAndType(fileName);
  migrateColorsAndTypeFonts(colorsAndType);
  loadEditorState(colorsAndType);
  // Font data is in state.fonts via loadEditorState; the DOM-side-effect
  // helpers still need to run so @font-face rules and --font-* CSS vars
  // land on :root.
  if (colorsAndType.fontSources && colorsAndType.fontSources.length > 0) {
    applyFontSources(colorsAndType.fontSources);
  }
  if (colorsAndType.fontStacks && colorsAndType.fontStacks.length > 0) {
    applyFontStacks(colorsAndType.fontStacks, colorsAndType.fontSources ?? []);
  }
}
