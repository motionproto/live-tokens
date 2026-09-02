/**
 * Persistence layer for the editor store — debounced localStorage write +
 * eager hydrate at module load.
 *
 * `editorStore.ts` wires the persist hook to `schedulePersist` exported here
 * so editorCore's mutate/undo/redo debounce-write through the same path.
 * Seed paths that bypass `mutate` call `editorCore.persist()` (which routes
 * to `schedulePersist`).
 *
 * Hydrate runs eagerly at first import so child components reading
 * `$editorState` in their onMount see persisted state, not the transient
 * empty default — Svelte mounts children before parents, so waiting for
 * Editor's onMount is too late.
 */

import { get } from 'svelte/store';
import type { EditorState } from './editorTypes';
import { storageKey } from './editorConfig';
import { store } from './editorCore';
import { quietGet, quietSet } from '../storage/storage';
import { isGradientSlot, makeDefaultGradients } from '../themes/slices/gradients';
import { seedShadowsFromDom } from '../themes/slices/shadows';
import { makeDefaultScrimTokens, makeDefaultTintTokens } from '../themes/slices/washes';
import { sanitizeHarmonyAxes } from '../palettes/colorHarmony';
import {
  renameBackgroundPaletteKey,
  renameBackgroundHarmonyFamily,
} from '../themes/migrations/2026-07-29-background-palette-to-canvas';
import { placeUnplacedBaseAnchors } from '../themes/migrations/2026-07-29-place-base-anchors';
import {
  migratePaletteColorsToOklch,
  type PreOklchPaletteConfig,
} from '../themes/migrations/2026-07-21-palette-oklch-basis';

// Resolve the persist key lazily (per-call) so library consumers that invoke
// `configureEditor({storagePrefix})` before the first store write get the
// configured prefix even if `editorPersistence` was imported at module-load
// time (M8). The function call is cheap; do not memoise — that defeats the point.
function getPersistKey(): string {
  return storageKey('editor-state');
}
export const PERSIST_DEBOUNCE_MS = 300;

let emptyStateFactory: () => EditorState = () => ({} as EditorState);

/** Wired by editorStore at boot — the factory composes per-slice defaults. */
export function setEmptyStateFactory(fn: () => EditorState): void {
  emptyStateFactory = fn;
}

let persistTimer: ReturnType<typeof setTimeout> | null = null;

export function schedulePersist(): void {
  if (typeof localStorage === 'undefined') return;
  if (persistTimer) clearTimeout(persistTimer);
  persistTimer = setTimeout(persistNow, PERSIST_DEBOUNCE_MS);
}

export function persistNow(): void {
  persistTimer = null;
  // quota / serialization errors are not fatal; quietSet swallows them.
  quietSet(getPersistKey(), JSON.stringify(get(store)));
}

function migrateGradients(state: EditorState): EditorState {
  // The library is an open `--gradient-N` set, so any number of numbered slots
  // carries forward. Persisted state that predates the numbering (e.g. a token
  // named --gradient-progress) is stale-shaped and falls back to defaults
  // rather than carrying entries no slot name can address.
  const tokens = state.gradients?.tokens ?? [];
  if (tokens.length > 0 && tokens.every((g) => isGradientSlot(g.variable))) return state;
  return { ...state, gradients: { tokens: makeDefaultGradients() } };
}

// `hydrate` shallow-merges the persisted `components` bag over the default, so
// a slice serialized by an older build can lack fields added since (e.g.
// `config`, added with the two-field alias/config split). `componentsToVars`
// calls `Object.entries(slice.config)` unconditionally, so backfill the
// required fields and drop any non-object slice before the state reaches the
// renderer. Spread preserves optional fields like `unlinked`.
// The washes slice was `overlays: { tokens, hoverTokens }` before the scrim and
// tint renames, and `hydrate` shallow-merges, so a persisted state from an
// older build replaces `washes` wholesale and arrives without `tints`.
// `washesToVars` iterates both lists unconditionally, so reshape here: carry the
// stops across under their new names, and rewrite the variable each one carries.
const WASH_VAR_RENAMES: Record<string, string> = {
  '--overlay-low': '--scrim-low',
  '--overlay': '--scrim',
  '--overlay-high': '--scrim-high',
  '--hover-low': '--tint-low',
  '--hover': '--tint',
  '--hover-high': '--tint-high',
};

type LegacyWashes = {
  scrims?: unknown;
  tints?: unknown;
  hoverTokens?: unknown;
  tokens?: unknown;
};

/** Carry a persisted stop list forward, or fall back to the shipped defaults. */
function washList(raw: unknown, fallback: () => EditorState['washes']['scrims']) {
  if (!Array.isArray(raw) || raw.length === 0) return fallback();
  const carried = raw
    .filter((t): t is EditorState['washes']['scrims'][number] => !!t && typeof t === 'object' && 'variable' in t)
    .map((t) => ({ ...t, variable: WASH_VAR_RENAMES[t.variable] ?? t.variable }));
  return carried.length > 0 ? carried : fallback();
}

export function normalizeWashes(state: EditorState): EditorState {
  const washes = (state.washes ?? {}) as LegacyWashes;
  const legacy = ((state as unknown as { overlays?: LegacyWashes }).overlays ?? {}) as LegacyWashes;
  const next = { ...state } as EditorState & { overlays?: unknown };
  next.washes = {
    scrims: washList(washes.scrims ?? legacy.tokens, makeDefaultScrimTokens),
    tints: washList(washes.tints ?? washes.hoverTokens ?? legacy.hoverTokens, makeDefaultTintTokens),
  };
  delete next.overlays;
  return next;
}

export function normalizeComponents(state: EditorState): EditorState {
  const raw = state.components;
  if (!raw || typeof raw !== 'object') return { ...state, components: {} };
  const components: EditorState['components'] = {};
  for (const [name, slice] of Object.entries(raw)) {
    if (!slice || typeof slice !== 'object') continue;
    components[name] = {
      ...slice,
      aliases: slice.aliases && typeof slice.aliases === 'object' ? slice.aliases : {},
      config: slice.config && typeof slice.config === 'object' ? slice.config : {},
    };
  }
  return { ...state, components };
}

// A session persisted before the rename keys its palette by the old label and
// binds an axis to it. Both have to move before the axes are sanitized, which
// would otherwise drop the now-ineligible family and unbind the axis.
export function normalizePaletteLabels(state: EditorState): EditorState {
  return { ...state, palettes: renameBackgroundPaletteKey(state.palettes) };
}

// `hydrate` shallow-merges persisted state over `emptyState()`, so the axes that
// arrive here may be the injected defaults sitting over the session's real
// palettes. Reconcile them against those palettes.
export function normalizeHarmonyAxes(state: EditorState): EditorState {
  const axes = renameBackgroundHarmonyFamily(state.harmonyAxes);
  return { ...state, harmonyAxes: sanitizeHarmonyAxes(axes, state.palettes) };
}

// A session persisted before placements existed has anchored palettes with no
// `anchorPlacement`, so their ramps never show the anchored slot.
export function normalizeBaseAnchors(state: EditorState): EditorState {
  return { ...state, palettes: placeUnplacedBaseAnchors(state.palettes) };
}

// A session persisted before the numeric OKLCH basis holds hex strings where
// every palette color is now `{ l, c, h }`. `loadFromFile` migrates those on the
// way in; hydrate did not, so such a session reached the renderer with an
// undefined hue and threw on the first serialization. Idempotent, so a
// current-shape session passes straight through.
export function normalizePaletteBasis(state: EditorState): EditorState {
  const raw = state.palettes as unknown as Record<string, PreOklchPaletteConfig>;
  return { ...state, palettes: migratePaletteColorsToOklch(raw) };
}

export function hydrate(): void {
  // Corrupt state, missing key, or unavailable storage all return null;
  // the editor falls through to the empty default in that case.
  const parsed = quietGet<unknown>(getPersistKey(), { parse: true });
  if (parsed && typeof parsed === 'object') {
    // Shallow-merge onto default shape so older persisted state missing
    // newly-added domain fields still loads.
    const merged = { ...emptyStateFactory(), ...(parsed as object) } as EditorState;
    store.set(
      normalizeHarmonyAxes(
        normalizeBaseAnchors(
          normalizePaletteBasis(normalizePaletteLabels(normalizeComponents(normalizeWashes(migrateGradients(merged))))),
        ),
      ),
    );
  }
  // m13 fix: seed shadows from the DOM at hydrate time so the editor
  // captures the tokens.css baseline regardless of whether the user opens
  // the shadows tab. `seedShadowsFromDom` is a no-op when state already
  // has tokens (e.g. we just loaded persisted state with shadows saved),
  // so the seed only fires on a truly fresh boot. Deferred to next frame
  // because tokens.css may not be applied yet at module-load time —
  // `getComputedStyle` would return empty strings and `parseShadowCss`
  // would reject every entry.
  if (typeof requestAnimationFrame !== 'undefined') {
    requestAnimationFrame(() => seedShadowsFromDom());
  } else {
    seedShadowsFromDom();
  }
}

let hydrated = false;
export function ensureHydrated(): void {
  if (hydrated) return;
  hydrated = true;
  hydrate();
}

/**
 * Kept for API parity with callers that opt-in from onMount. A no-op after
 * the eager load below, but cheap to call multiple times.
 */
export async function initializeEditorStore(): Promise<void> {
  ensureHydrated();
}
