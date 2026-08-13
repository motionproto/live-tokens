import { get } from 'svelte/store';
import type { FontSource, Manifest } from '../themes/themeTypes';
import { editorState, themeToState, toComponentSlice } from '../store/editorStore';
import { deriveCssVars } from '../store/editorRenderer';
import { setCssVar, removeCssVar } from '../cssVarSync';
import { applyFontSources, resolveFontStackValues } from '../fonts/fontLoader';
import { migrateThemeFonts } from '../fonts/fontMigration';
import { loadManifest } from './manifestService';

/**
 * Client-side rendering of a manifest, for browsing looks without committing
 * one. Nothing here writes to the server, mutates the editor store, or marks
 * anything dirty: a preview is paint only. Save-As stays honest because
 * `captureLook` reads the server's active files, which a preview never touches.
 *
 * Both painting and reverting run the same derivation the renderer runs on
 * store state (`deriveCssVars`), so a preview cannot drift from what an Apply
 * of the same manifest would produce, and a revert re-derives from the live
 * store rather than replaying DOM values scraped before the preview.
 */

/** Everything a look puts on the page: the full var set (theme, components and
 *  the composed `--font-*` stacks) plus the sources its faces come from. */
export interface RenderedLook {
  vars: Record<string, string>;
  fontSources: FontSource[];
}

/**
 * The full var set a manifest paints. Components the manifest carries no config
 * for render `defaults`' config, matching Apply's complete-look semantics;
 * configs for components this install lacks are skipped, as Apply skips them.
 */
export function manifestLook(manifest: Manifest, defaults: Manifest): RenderedLook {
  const theme = structuredClone(manifest.theme);
  migrateThemeFonts(theme);
  const state = themeToState(theme);
  state.components = {};
  for (const [comp, config] of Object.entries(defaults.componentConfigs)) {
    state.components[comp] = {
      activeFile: 'default',
      ...toComponentSlice(comp, config.aliases, config.config, config.schemaVersion),
    };
  }
  // `activeFile` is the name Apply would materialise the config under. Nothing
  // in the derivation reads it; it keeps the projected slice coherent.
  const slug = manifest._fileName ?? 'default';
  for (const [comp, config] of Object.entries(manifest.componentConfigs)) {
    if (!(comp in state.components)) continue;
    state.components[comp] = {
      activeFile: slug,
      ...toComponentSlice(comp, config.aliases, config.config, config.schemaVersion),
    };
  }
  const vars = deriveCssVars(state);
  Object.assign(vars, resolveFontStackValues(theme.fontStacks ?? [], theme.fontSources ?? []));
  return { vars, fontSources: theme.fontSources ?? [] };
}

/** The look the editor store currently describes — the state a revert returns to. */
export function liveLook(): RenderedLook {
  const state = get(editorState);
  const vars = deriveCssVars(state);
  Object.assign(vars, resolveFontStackValues(state.fonts.stacks, state.fonts.sources));
  return { vars, fontSources: state.fonts.sources };
}

let livePreview: RenderedLook | null = null;
let defaultsPromise: Promise<Manifest> | null = null;

function loadDefaults(): Promise<Manifest> {
  // A rejected promise must not be memoized, or one failed fetch (a dev-server
  // restart mid-dialog) poisons every later preview until a page reload.
  defaultsPromise ??= loadManifest('default').catch((err) => {
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
 * Paint `manifest` over the page. Re-entrant: a live preview is reverted first,
 * so every look is painted as a diff against the user's real state and a var one
 * look sets but the next does not returns to its live value instead of vanishing.
 * The two passes run in one task, so the browser never paints the intermediate.
 */
export async function previewManifest(manifest: Manifest): Promise<void> {
  const look = manifestLook(manifest, await loadDefaults());
  revertPreview();
  paint(look, liveLook());
  livePreview = look;
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

/** Test-only: drop the live preview and the cached defaults manifest. */
export function __resetPreviewForTests(): void {
  livePreview = null;
  defaultsPromise = null;
}
