/**
 * State-core for the editor store.
 *
 * Owns the writable, history stacks (undo/redo), transaction primitive
 * (gesture-grouped history entry), and the palette edit session bracket
 * that clips intra-session undo. Exposes `editorState` (Readable) for
 * subscribers and `mutate`/`transaction` as the single mutation entry
 * points. Domain slices import `mutate` and friends from here.
 *
 * Two side-effect hooks are wired by `editorStore.ts` at boot:
 *  - `setEmptyStateFactory` — produces a fresh state tree (lives in editorStore
 *    today; will move into the persistence layer when factories spread across
 *    slices solidify).
 *  - `setPersistHook` — debounced localStorage write (lives in editorStore for
 *    now; moves to editorPersistence in stage 6.5).
 *
 * Hooks are nullable on first import so the module evaluates cleanly even
 * when consumed from contexts that don't need persistence (SSR, isolated
 * unit tests).
 */

import { writable, derived, get, type Readable } from 'svelte/store';
import type { EditorState } from './editorTypes';

const HISTORY_MAX = 100;

// ── Hooks (wired by editorStore at boot) ──────────────────────────────────

let emptyStateFactory: () => EditorState = () => ({} as EditorState);
let persistHook: () => void = () => {};

export function setEmptyStateFactory(fn: () => EditorState): void {
  emptyStateFactory = fn;
}
export function setPersistHook(fn: () => void): void {
  persistHook = fn;
}

// ── Store + history machine ───────────────────────────────────────────────

export const store = writable<EditorState>(emptyStateFactory());

// History stacks hold snapshots that are independent of the current state
// reference (always created via structuredClone at push time). This lets
// mutate / undo / redo use in-place mutation on the live state without
// corrupting history entries.
const past: EditorState[] = [];
const future: EditorState[] = [];
let savedAtIndex = 0;

// A counter that bumps on every history-affecting change, so `derived`
// stores (canUndo, canRedo, dirty) re-evaluate. The history arrays
// themselves live outside Svelte reactivity.
const historyTick = writable(0);
function bumpTick() { historyTick.update((n) => n + 1); }

// Transaction groups many in-gesture mutations into one history entry.
// `snapshot` is the pre-gesture state; `changed` flips to true on any
// intermediate mutate so empty gestures skip the commit.
interface Transaction {
  snapshot: EditorState;
  label: string;
  changed: boolean;
}
let pendingTransaction: Transaction | null = null;

// Palette edit session: bounds a period (panel open → close) during which
// undo is clipped to intra-session entries and the whole session collapses
// to a single history entry on commit (or drops entirely on cancel).
interface PaletteSession {
  snapshot: EditorState;
  historyIdx: number;
}
let paletteSession: PaletteSession | null = null;

export const editorState: Readable<EditorState> = { subscribe: store.subscribe };

export function mutate(label: string, fn: (draft: EditorState) => void): void {
  if (import.meta.env.DEV && !label) {
    console.warn('[editorStore] mutate() called without a label');
  }
  if (pendingTransaction) {
    pendingTransaction.changed = true;
    store.update((s) => { fn(s); return s; });
    return;
  }
  const current = get(store);
  past.push(structuredClone(current));
  if (past.length > HISTORY_MAX) {
    past.shift();
    if (savedAtIndex > 0) savedAtIndex--;
  }
  future.length = 0;
  store.update((s) => { fn(s); return s; });
  bumpTick();
  persistHook();
}

export function beginTransaction(label: string): void {
  if (pendingTransaction) {
    if (import.meta.env.DEV) {
      console.warn(
        `[editorStore] beginTransaction("${label}") while "${pendingTransaction.label}" is still open; aborting previous`,
      );
    }
    abortTransaction();
  }
  pendingTransaction = {
    snapshot: structuredClone(get(store)),
    label,
    changed: false,
  };
}

export function commitTransaction(): void {
  if (!pendingTransaction) return;
  const { snapshot, changed } = pendingTransaction;
  pendingTransaction = null;
  if (!changed) return;
  past.push(snapshot);
  if (past.length > HISTORY_MAX) {
    past.shift();
    if (savedAtIndex > 0) savedAtIndex--;
  }
  future.length = 0;
  bumpTick();
  persistHook();
}

export function abortTransaction(): void {
  if (!pendingTransaction) return;
  const { snapshot } = pendingTransaction;
  pendingTransaction = null;
  store.set(snapshot);
  // No history entry, no tick — observers see the revert but dirty state
  // reflects the pre-transaction history position.
}

/**
 * Slider-drag helper: opens a transaction on pointerdown and commits on the
 * next window-level pointerup / pointercancel. Groups a drag gesture under
 * one history entry so undo rolls the whole drag back as a single step.
 */
export function beginSliderGesture(label: string): void {
  if (typeof window === 'undefined') return;
  beginTransaction(label);
  const end = () => {
    commitTransaction();
    window.removeEventListener('pointerup', end);
    window.removeEventListener('pointercancel', end);
  };
  window.addEventListener('pointerup', end);
  window.addEventListener('pointercancel', end);
}

export function transaction<T>(label: string, fn: (draft: EditorState) => T): T {
  beginTransaction(label);
  try {
    let result!: T;
    mutate(label, (draft) => { result = fn(draft); });
    commitTransaction();
    return result;
  } catch (e) {
    abortTransaction();
    throw e;
  }
}

export function undo(): boolean {
  if (pendingTransaction) abortTransaction();
  const floor = paletteSession ? paletteSession.historyIdx : 0;
  if (past.length <= floor) return false;
  future.push(structuredClone(get(store)));
  const previous = past.pop()!;
  store.set(previous);
  bumpTick();
  persistHook();
  if (import.meta.env.DEV) {
    console.debug('[editorStore] undo →', {
      pastLen: past.length, floor,
      palettes: paletteSnapshot(previous),
      inSession: !!paletteSession,
    });
  }
  return true;
}

/**
 * Begin a palette edit session (panel opens). Captures the pre-open state
 * and the current history length so intra-session undo can be clipped, and
 * so commit/cancel can collapse or drop everything pushed during the
 * session. No history entry is pushed here — opening the panel is not an
 * edit by itself.
 */
export function beginPaletteEditSession(): void {
  if (paletteSession) commitPaletteEditSession();
  paletteSession = {
    snapshot: structuredClone(get(store)),
    historyIdx: past.length,
  };
}

/**
 * Commit the session (user pressed Check). All intra-session history
 * entries are collapsed into a single entry representing the pre-open
 * state so one outside-panel undo restores it. Current state stays.
 */
export function commitPaletteEditSession(): void {
  if (!paletteSession) return;
  const { snapshot, historyIdx } = paletteSession;
  paletteSession = null;
  if (pendingTransaction) abortTransaction();
  past.length = historyIdx;
  const snapshotSerialized = JSON.stringify(snapshot);
  const currentSerialized = JSON.stringify(get(store));
  const changed = currentSerialized !== snapshotSerialized;
  if (changed) {
    past.push(snapshot);
    if (past.length > HISTORY_MAX) {
      past.shift();
      if (savedAtIndex > 0) savedAtIndex--;
    }
    future.length = 0;
    persistHook();
  }
  bumpTick();
  if (import.meta.env.DEV) {
    console.debug('[editorStore] commitPaletteEditSession →', {
      pastLen: past.length, changed,
      snapshotPalettes: paletteSnapshot(snapshot),
      currentPalettes: paletteSnapshot(get(store)),
    });
  }
}

/**
 * Cancel the session (user pressed X). All intra-session history entries
 * are dropped and state is restored to the snapshot — as if the panel was
 * never opened.
 */
export function cancelPaletteEditSession(): void {
  if (!paletteSession) return;
  const { snapshot, historyIdx } = paletteSession;
  paletteSession = null;
  if (pendingTransaction) abortTransaction();
  past.length = historyIdx;
  future.length = 0;
  store.set(snapshot);
  bumpTick();
  persistHook();
  if (import.meta.env.DEV) {
    console.debug('[editorStore] cancelPaletteEditSession →', {
      pastLen: past.length,
      restoredPalettes: paletteSnapshot(snapshot),
    });
  }
}

export function redo(): boolean {
  if (pendingTransaction) abortTransaction();
  if (future.length === 0) return false;
  past.push(structuredClone(get(store)));
  const next = future.pop()!;
  store.set(next);
  bumpTick();
  persistHook();
  return true;
}

export const canUndo: Readable<boolean> = derived(historyTick, () => past.length > 0);
export const canRedo: Readable<boolean> = derived(historyTick, () => future.length > 0);
export const dirty:   Readable<boolean> = derived(historyTick, () => past.length !== savedAtIndex);

export function markSaved(): void {
  savedAtIndex = past.length;
  bumpTick();
}

/**
 * Reset history + transient session/transaction state without touching the
 * store. Used by `loadFromFile` ("open a different document" — undo cannot
 * cross a theme load). The caller is responsible for `store.set(next)` and
 * `persistHook()`.
 */
export function resetHistoryForLoad(): void {
  past.length = 0;
  future.length = 0;
  savedAtIndex = 0;
  pendingTransaction = null;
  bumpTick();
}

/**
 * Test-only: clear all core history + transient session/transaction state and
 * reset the store to `emptyStateFactory()`. The full `__resetForTests` in
 * editorStore also resets renderer + per-slice baselines.
 */
export function __resetCoreForTests(): void {
  past.length = 0;
  future.length = 0;
  savedAtIndex = 0;
  pendingTransaction = null;
  paletteSession = null;
  store.set(emptyStateFactory());
  bumpTick();
}

/** Test-only accessors — internal history state is module-private otherwise. */
export function __getHistoryLengths(): { past: number; future: number } {
  return { past: past.length, future: future.length };
}
export function __getPastAt(idx: number): EditorState | undefined {
  return past[idx];
}

/** Dev-only: compact digest of each palette's baseColor + overrides count. */
function paletteSnapshot(s: EditorState): Record<string, { base: string; overrides: number }> {
  const out: Record<string, { base: string; overrides: number }> = {};
  for (const [k, v] of Object.entries(s.palettes ?? {})) {
    out[k] = { base: v.baseColor, overrides: Object.keys(v.overrides).length };
  }
  return out;
}
