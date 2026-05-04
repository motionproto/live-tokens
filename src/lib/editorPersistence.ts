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
import { makeDefaultGradients } from './slices/gradients';
import { seedShadowsFromDom } from './slices/shadows';

export const PERSIST_KEY = storageKey('editor-state');
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
  try {
    localStorage.setItem(PERSIST_KEY, JSON.stringify(get(store)));
  } catch {
    // quota / serialization errors — silent, not fatal
  }
}

function migrateGradients(state: EditorState): EditorState {
  // Gradients are a fixed-slot scale (--gradient-1 … --gradient-4). If the
  // persisted state predates the migration to fixed slots (e.g. it still has
  // a token named --gradient-progress, or the count doesn't match), replace
  // the gradients block with defaults rather than carrying stale entries.
  const expected = makeDefaultGradients().map((g) => g.variable).sort();
  const have = (state.gradients?.tokens ?? []).map((g) => g.variable).sort();
  const matches =
    have.length === expected.length &&
    expected.every((v, i) => v === have[i]);
  if (matches) return state;
  return { ...state, gradients: { tokens: makeDefaultGradients() } };
}

export function hydrate(): void {
  if (typeof localStorage !== 'undefined') {
    try {
      const raw = localStorage.getItem(PERSIST_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed && typeof parsed === 'object') {
          // Shallow-merge onto default shape so older persisted state missing
          // newly-added domain fields still loads.
          const merged = { ...emptyStateFactory(), ...parsed } as EditorState;
          store.set(migrateGradients(merged));
        }
      }
    } catch {
      // corrupt state — leave defaults
    }
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
