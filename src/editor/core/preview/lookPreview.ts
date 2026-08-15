import { get } from 'svelte/store';
import type { FontSource, Theme, ColorsAndType } from '../themes/themeTypes';
import { editorState, colorsAndTypeToState, toComponentSlice } from '../store/editorStore';
import { deriveCssVars } from '../store/editorRenderer';
import { setCssVar, removeCssVar } from '../cssVarSync';
import { applyFontSources, resolveFontStackValues } from '../fonts/fontLoader';
import { migrateColorsAndTypeFonts } from '../fonts/fontMigration';
import { loadTheme } from '../themes/themeService';

/**
 * Client-side rendering of a saved file, for browsing looks without committing
 * one. A theme previews as a whole look; a colors-and-type file previews as
 * colors and type over the components the user has right now. Nothing here writes to the server,
 * mutates the editor store, or marks anything dirty: a preview is paint only.
 * Save-As stays honest because `captureLook` reads the server's active files,
 * which a preview never touches.
 *
 * Both painting and reverting run the same derivation the renderer runs on
 * store state (`deriveCssVars`), so a preview cannot drift from what an Apply
 * of the same theme produces, and a revert re-derives from the live store
 * rather than replaying DOM values scraped before the preview.
 *
 * One preview is live at a time, whichever kind it is: painting reverts first,
 * so every look is a diff against the user's real state.
 */

/** Everything a look puts on the page: the full var set (colors and type,
 *  components and the composed `--font-*` stacks) plus the sources its faces
 *  come from. */
export interface RenderedLook {
  vars: Record<string, string>;
  fontSources: FontSource[];
}

/**
 * The full var set a theme paints. Components the theme carries no config
 * for render `defaults`' config, matching Apply's complete-look semantics;
 * configs for components this install lacks are skipped, as Apply skips them.
 */
export function themeLook(theme: Theme, defaults: Theme): RenderedLook {
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
  Object.assign(vars, resolveFontStackValues(colorsAndType.fontStacks ?? [], colorsAndType.fontSources ?? []));
  return { vars, fontSources: colorsAndType.fontSources ?? [] };
}

/**
 * The full var set colors and type paint on their own. They are not a whole look,
 * so the components stay as the user has them: `colorsAndTypeToState` carries the live
 * component slice forward (`loadComponentsFromVars`) and strips component-owned
 * vars out of their own bag, which is exactly the composition a preview
 * wants. No defaults fetch, no component reset.
 */
export function colorsAndTypeLook(colorsAndType: ColorsAndType): RenderedLook {
  const next = structuredClone(colorsAndType);
  migrateColorsAndTypeFonts(next);
  const vars = deriveCssVars(colorsAndTypeToState(next));
  Object.assign(vars, resolveFontStackValues(next.fontStacks ?? [], next.fontSources ?? []));
  return { vars, fontSources: next.fontSources ?? [] };
}

/** The look the editor store currently describes — the state a revert returns to. */
export function liveLook(): RenderedLook {
  const state = get(editorState);
  const vars = deriveCssVars(state);
  Object.assign(vars, resolveFontStackValues(state.fonts.stacks, state.fonts.sources));
  return { vars, fontSources: state.fonts.sources };
}

let livePreview: RenderedLook | null = null;
let defaultsPromise: Promise<Theme> | null = null;

function loadDefaults(): Promise<Theme> {
  // A rejected promise must not be memoized, or one failed fetch (a dev-server
  // restart mid-dialog) poisons every later preview until a page reload.
  defaultsPromise ??= loadTheme('default').catch((err) => {
    defaultsPromise = null;
    throw err;
  });
  return defaultsPromise;
}

function paint(next: RenderedLook, from: RenderedLook): void {
  for (const [name, value] of Object.entries(next.vars)) {
    if (from.vars[name] !== value) setCssVar(name, value);
  }
  for (const name of Object.keys(from.vars)) {
    if (!(name in next.vars)) removeCssVar(name);
  }
  applyFontSources(next.fontSources);
}

/**
 * Show `look` on the page. Re-entrant: a live preview is reverted first, so
 * every look is painted as a diff against the user's real state and a var one
 * look sets but the next does not returns to its live value instead of vanishing.
 * The two passes run in one task, so the browser never paints the intermediate.
 */
function applyPreview(look: RenderedLook): void {
  revertPreview();
  paint(look, liveLook());
  livePreview = look;
}

/** Paint a whole look: the theme's colors and type and every component config
 *  it carries. */
export async function previewTheme(theme: Theme): Promise<void> {
  applyPreview(themeLook(theme, await loadDefaults()));
}

/** Paint colors and type over the components as they stand. */
export function previewColorsAndType(colorsAndType: ColorsAndType): void {
  applyPreview(colorsAndTypeLook(colorsAndType));
}

/** Restore the live editor state. No-op when no preview is running. */
export function revertPreview(): void {
  if (!livePreview) return;
  paint(liveLook(), livePreview);
  livePreview = null;
}

export function isPreviewing(): boolean {
  return livePreview !== null;
}

/** Test-only: drop the live preview and the cached defaults theme. */
export function __resetPreviewForTests(): void {
  livePreview = null;
  defaultsPromise = null;
}
