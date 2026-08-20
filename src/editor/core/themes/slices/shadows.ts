/**
 * Shadows slice — five-token scale (sm/md/lg/xl/2xl) plus globals/overrides
 * for the editor UI's shared sliders. Defaults come from tokens.css (not the
 * editor), so state.shadows starts with `tokens: []` and we do not emit any
 * shadow CSS vars until the editor has populated tokens (via
 * `seedShadowsFromDom` on hydrate, or via `loadFromFile`). Once tokens exist,
 * the renderer writes one CSS var per token derived from its
 * x/y/blur/spread/hsla fields.
 */
import { get } from 'svelte/store';
import type { EditorState, ShadowToken } from '../../store/editorTypes';
import { store, persist } from '../../store/editorCore';
import { SHADOW_VAR_NAMES, computeShadowXY, parseShadowCss, shadowTokenCss } from '../parsers/shadow';

export { SHADOW_VAR_NAMES, computeShadowXY, parseShadowCss, shadowTokenCss };

// Identical literal set as SHADOW_VAR_NAMES — derived to avoid drift.
export const SCALE_SHADOW_VARIABLES: ReadonlySet<string> = new Set(SHADOW_VAR_NAMES);

export function defaultShadowOverride(): import('../../store/editorTypes').ShadowOverrideFlags {
  return { angle: false, opacity: false, color: false, distance: false, blur: false, size: false };
}

export function shadowsToVars(shadows: EditorState['shadows']): Record<string, string> {
  const out: Record<string, string> = {};
  for (const t of shadows.tokens) out[t.variable] = shadowTokenCss(t);
  return out;
}

export function applyShadowVarsToState(shadows: EditorState['shadows'], vars: Record<string, string>): void {
  const parsed: ShadowToken[] = [];
  for (const name of SHADOW_VAR_NAMES) {
    const raw = vars[name];
    if (!raw) continue;
    const tok = parseShadowCss(name, raw);
    if (tok) parsed.push(tok);
  }
  if (parsed.length > 0) shadows.tokens = parsed;
}

/**
 * Loader: route shadow scale tokens from a freshly-loaded theme's vars bag
 * into `next.shadows.tokens` and remove them from the bag. Globals/overrides
 * are preserved across theme loads from the *current* state — themes don't
 * carry editor-UI state — so the caller copies them in. Mutates `next` and
 * `rawVars` in place.
 */
export function loadShadowsFromVars(
  next: EditorState,
  rawVars: Record<string, string>,
): void {
  applyShadowVarsToState(next.shadows, rawVars);
  for (const name of SHADOW_VAR_NAMES) delete rawVars[name];
  // Preserve shadow globals/overrides across theme loads so the editor UI
  // reopens with the same controls the user was working with.
  const current = get(store).shadows;
  next.shadows.globals = structuredClone(current.globals);
  next.shadows.overrides = structuredClone(current.overrides);
}

/**
 * Seed state.shadows.tokens from computed styles on the document element.
 * Captures the tokens.css baseline so the editor can mutate it. Does NOT push
 * a history entry; the seed is treated as an initial snapshot, not a user
 * edit. Persists so a reload doesn't re-seed from the DOM on every fresh
 * session.
 *
 * Called from the persistence layer's `hydrate()` so the seed lands once on
 * boot regardless of whether the user opens the shadows tab — m13 cleanup.
 */
export function seedShadowsFromDom(): void {
  if (typeof document === 'undefined') return;
  const current = get(store);
  if (current.shadows.tokens.length > 0) return;
  const cs = getComputedStyle(document.documentElement);
  const parsed: ShadowToken[] = [];
  for (const name of SHADOW_VAR_NAMES) {
    const raw = cs.getPropertyValue(name).trim();
    if (!raw) continue;
    const tok = parseShadowCss(name, raw);
    if (tok) parsed.push(tok);
  }
  if (parsed.length === 0) return;
  store.update((s) => { s.shadows.tokens = parsed; return s; });
  // No bumpTick — seed is hydration-equivalent, not an edit.
  persist();
}
