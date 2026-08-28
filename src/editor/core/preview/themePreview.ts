import { get } from 'svelte/store';
import type { FontSource, Theme, ColorsAndType } from '../themes/themeTypes';
import { editorState, colorsAndTypeToState, toComponentSlice } from '../store/editorStore';
import { deriveCssVars } from '../store/editorRenderer';
import { batchCssVarChanges, setCssVar, removeCssVar } from '../cssVarSync';
import { applyFontSources } from '../fonts/fontLoader';
import { migrateColorsAndTypeFonts } from '../fonts/fontMigration';
import { loadTheme } from '../themes/themeService';
import { previewSketchStyle, revertSketchStylePreview } from '../sketch/sketchStore';

/**
 * Client-side rendering of a saved file, for browsing themes without committing
 * one. A theme previews as a whole next; a colors-and-type file previews as
 * colors and type over the components the user has right now. Nothing here writes to the server,
 * mutates the editor store, or marks anything dirty: a preview is paint only.
 * Save-As stays honest because `captureThemeContent` reads the server's active files,
 * which a preview never touches.
 *
 * Both painting and reverting run the same derivation the renderer runs on
 * store state (`deriveCssVars`), so a preview cannot drift from what an Apply
 * of the same theme produces, and a revert re-derives from the live store
 * rather than replaying DOM values scraped before the preview.
 *
 * A theme's sketchstyle rides along the same way: `previewTheme` paints it
 * through `previewSketchStyle`, which reaches the page without touching the
 * live sketch buffer, and a revert re-derives from that buffer exactly as the
 * CSS vars do.
 *
 * One preview is live at a time, whichever kind it is: painting reverts first,
 * so every next is a diff against the user's real state.
 */

/** Everything a next puts on the page: the full var set (colors and type,
 *  components and the composed `--font-*` stacks) plus the sources its faces
 *  come from. */
export interface RenderedTheme {
  vars: Record<string, string>;
  fontSources: FontSource[];
}

/**
 * The full var set a theme paints. Components the theme carries no config
 * for render `defaults`' config, matching Apply's complete-next semantics;
 * configs for components this install lacks are skipped, as Apply skips them.
 */
export function renderTheme(theme: Theme, defaults: Theme): RenderedTheme {
  const colorsAndType = structuredClone(theme.colorsAndType);
  migrateColorsAndTypeFonts(colorsAndType);
  const state = colorsAndTypeToState(colorsAndType);
  state.components = {};
  for (const [comp, config] of Object.entries(defaults.componentConfigs)) {
    state.components[comp] = toComponentSlice(comp, config.aliases, config.config, config.schemaVersion);
  }
  for (const [comp, config] of Object.entries(theme.componentConfigs)) {
    if (!(comp in state.components)) continue;
    state.components[comp] = toComponentSlice(comp, config.aliases, config.config, config.schemaVersion);
  }
  const vars = deriveCssVars(state);
  return { vars, fontSources: colorsAndType.fontSources ?? [] };
}

/**
 * The full var set colors and type paint on their own. They are not a whole next,
 * so the components stay as the user has them: `colorsAndTypeToState` carries the live
 * component slice forward (`loadComponentsFromVars`) and strips component-owned
 * vars out of their own bag, which is exactly the composition a preview
 * wants. No defaults fetch, no component reset.
 */
export function renderColorsAndType(colorsAndType: ColorsAndType): RenderedTheme {
  const next = structuredClone(colorsAndType);
  migrateColorsAndTypeFonts(next);
  const vars = deriveCssVars(colorsAndTypeToState(next));
  return { vars, fontSources: next.fontSources ?? [] };
}

/** The next the editor store currently describes — the state a revert returns to. */
export function liveTheme(): RenderedTheme {
  const state = get(editorState);
  const vars = deriveCssVars(state);
  return { vars, fontSources: state.fonts.sources };
}

let livePreview: RenderedTheme | null = null;
let defaultsPromise: Promise<Theme> | null = null;
// Whether the current preview session has a sketchstyle painted over the live
// buffer, so a colors-only preview (which never previews sketch) and revert
// know whether there is anything to hand back.
let sketchPreviewActive = false;
// Bumped whenever a preview session ends or is superseded. `previewTheme` awaits
// the defaults theme, and a Cancel landing inside that await was overwritten when
// it resolved, stranding a preview the picker believed it had already taken down.
let generation = 0;

function loadDefaults(): Promise<Theme> {
  // A rejected promise must not be memoized, or one failed fetch (a dev-server
  // restart mid-dialog) poisons every later preview until a page reload.
  defaultsPromise ??= loadTheme('default').catch((err) => {
    defaultsPromise = null;
    throw err;
  });
  return defaultsPromise;
}

function paint(next: RenderedTheme, from: RenderedTheme): void {
  batchCssVarChanges(() => {
    for (const [name, value] of Object.entries(next.vars)) {
      if (from.vars[name] !== value) setCssVar(name, value);
    }
    for (const name of Object.keys(from.vars)) {
      if (!(name in next.vars)) removeCssVar(name);
    }
    applyFontSources(next.fontSources);
  });
}

/**
 * Show `next` on the page. Re-entrant previews diff directly from the next
 * already painted; only Cancel restores the live store projection. This avoids
 * repainting the live theme as an invisible intermediate on every picker row.
 */
function applyPreview(next: RenderedTheme): void {
  paint(next, livePreview ?? liveTheme());
  livePreview = next;
}

/** Paint a whole next: the theme's colors and type, every component config
 *  it carries, and its sketchstyle — present or not, since a theme with none
 *  paints crisp regardless of what is live (invariant 3). */
export async function previewTheme(theme: Theme): Promise<void> {
  const gen = generation;
  const defaults = await loadDefaults();
  if (gen !== generation) return;
  applyPreview(renderTheme(theme, defaults));
  previewSketchStyle(theme.sketchSettings);
  sketchPreviewActive = true;
}

/** Paint colors and type over the components as they stand. Not a whole
 *  next, so the sketchstyle stays live too — reverting a sketch preview a
 *  prior row left painted, if one is running. */
export function previewColorsAndType(colorsAndType: ColorsAndType): void {
  generation++;
  applyPreview(renderColorsAndType(colorsAndType));
  if (sketchPreviewActive) {
    revertSketchStylePreview();
    sketchPreviewActive = false;
  }
}

/** Restore the live editor state. No-op when no preview is running. */
export function revertPreview(): void {
  generation++;
  if (!livePreview) return;
  paint(liveTheme(), livePreview);
  livePreview = null;
  if (sketchPreviewActive) {
    revertSketchStylePreview();
    sketchPreviewActive = false;
  }
}

/** Release the preview without repainting. The caller must immediately load
 * the exact next being previewed into the store. This is the Save handoff: the
 * selected theme is already on screen, so restoring the old live next before
 * applying it would add work and create a visible flash across the request.
 * The sketchstyle stays painted for the same reason, though the handoff is not
 * quite free: when the live state was crisp, `openThemeSketchSettings` writes the
 * settings before the flag, so the sheet and the filter bank come down and go
 * straight back up in between. That order is still the right one, since writing
 * the flag first would paint the OLD dials for a frame. */
export function commitPreview(): void {
  generation++;
  livePreview = null;
  sketchPreviewActive = false;
}

export function isPreviewing(): boolean {
  return livePreview !== null;
}

/** Test-only: drop the live preview and the cached defaults theme. */
export function __resetPreviewForTests(): void {
  generation++;
  livePreview = null;
  defaultsPromise = null;
  sketchPreviewActive = false;
}
