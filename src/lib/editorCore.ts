/**
 * State-core for the editor store.
 *
 * Owns the writable, history stacks (undo/redo), and the unified `Scope`
 * primitive that backs both transactions (gesture-grouped history entry) and
 * palette edit sessions (panel-bracketed clip-floor + collapse). Exposes
 * `editorState` (Readable) for subscribers and `mutate`/`transaction` as the
 * single mutation entry points. Domain slices import `mutate` and friends
 * from here.
 *
 * History regimes (M6 fold): one composable scope primitive expressed as two
 * orthogonal axes:
 *  - `collapseToOne` — on commit, all intra-scope mutations collapse to a
 *    single history entry (the pre-scope snapshot).
 *  - `clipUndoFloor` — while the scope is active, undo() is clipped to the
 *    scope's start; on commit, intra-scope entries are dropped from history
 *    so the snapshot becomes the single undo target.
 *
 * Mapping back to public names:
 *  - `mutate`         = unscoped one-shot (no scope at all).
 *  - `transaction`    = scope { collapseToOne: true,  clipUndoFloor: false }.
 *  - `paletteSession` = scope { collapseToOne: true,  clipUndoFloor: true  }.
 *
 * Two side-effect hooks are wired by `editorStore.ts` at boot:
 *  - `setEmptyStateFactory` — produces a fresh state tree.
 *  - `setPersistHook` — debounced localStorage write.
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

/** Trigger the persistence hook. Used by seed paths that bypass `mutate`. */
export function persist(): void {
  persistHook();
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

/** Push `entry` onto past[], handling overflow + clearing future. */
function pushPast(entry: EditorState): void {
  past.push(entry);
  if (past.length > HISTORY_MAX) {
    past.shift();
    if (savedAtIndex > 0) savedAtIndex--;
  }
  future.length = 0;
}

// ── Scope primitive (the fold) ────────────────────────────────────────────

// A Scope brackets a series of mutations. Two orthogonal axes:
//  - collapseToOne: on commit, everything in the scope collapses to one
//    history entry (the pre-scope snapshot). True for both transaction and
//    paletteSession.
//  - clipUndoFloor: while the scope is active, undo() cannot pop past
//    entries pushed before the scope began; on commit, intra-scope past
//    entries are dropped (past.length = historyIdx). True for paletteSession.
interface Scope {
  snapshot: EditorState;
  label: string;
  collapseToOne: boolean;
  clipUndoFloor: boolean;
  /** past.length captured at scope start — only consulted when clipUndoFloor. */
  historyIdx: number;
  /** Set by `mutate()` when at least one mutation is applied within the scope. */
  changed: boolean;
}

// Two scope slots: one for in-flight transactions (drag gestures, atomic
// edits), one for palette edit sessions (panel open → close). They can
// coexist — a slider drag inside an open palette session is the canonical
// case — so they're tracked independently.
let pendingTransaction: Scope | null = null;
let paletteSession: Scope | null = null;

function beginScope(opts: {
  label: string;
  collapseToOne: boolean;
  clipUndoFloor: boolean;
}): Scope {
  return {
    snapshot: structuredClone(get(store)),
    label: opts.label,
    collapseToOne: opts.collapseToOne,
    clipUndoFloor: opts.clipUndoFloor,
    historyIdx: past.length,
    changed: false,
  };
}

/**
 * Commit the given scope. If collapseToOne, all intra-scope past entries
 * (those pushed since `historyIdx`) are dropped and the pre-scope snapshot
 * is pushed in their place — but only if anything actually changed.
 *
 * "Did anything change" is computed by state-equality (JSON) when
 * `clipUndoFloor` is set, because the session's intra-scope mutations were
 * applied to history AND then dropped — the only signal left is whether
 * the live state still matches the snapshot. For plain transactions
 * (no clip floor), the `changed` flag is the source of truth: empty
 * transactions skip the commit entirely.
 */
function commitScope(scope: Scope): void {
  if (scope.collapseToOne) {
    if (scope.clipUndoFloor) {
      // paletteSession path: intra-scope entries were each pushed by
      // mutate() (they had to be, so undo within the session could walk
      // them back). On commit, drop them and push the pre-session snapshot
      // iff state is not back at the snapshot.
      past.length = scope.historyIdx;
      const snapshotJson = JSON.stringify(scope.snapshot);
      const currentJson = JSON.stringify(get(store));
      const changedByEquality = snapshotJson !== currentJson;
      if (changedByEquality) {
        pushPast(scope.snapshot);
        persistHook();
      }
      bumpTick();
      return;
    }
    // Plain transaction path: intra-scope mutations were applied to the
    // store but NOT pushed individually. Push the pre-scope snapshot iff
    // anything changed.
    if (!scope.changed) return;
    pushPast(scope.snapshot);
    bumpTick();
    persistHook();
    return;
  }
  // Future: a non-collapsing scope would be a no-op on commit (entries
  // already live in past[]). Not used today.
  bumpTick();
}

/**
 * Cancel the given scope. Always reverts state to the snapshot and drops
 * intra-scope past entries. The `silent` flag controls whether the cancel
 * surfaces as a tick + persist:
 *  - silent: true  — used by transaction.abort (internal/error path). UI
 *    observes the state revert, but `dirty` reflects the pre-scope position
 *    because no tick fires and no persist runs.
 *  - silent: false — used by paletteSession.cancel (user pressed X). Must
 *    refresh dirty + persist so the UI reflects the discard.
 */
function cancelScope(scope: Scope, opts?: { silent?: boolean }): void {
  past.length = scope.historyIdx;
  if (scope.clipUndoFloor) future.length = 0;
  store.set(scope.snapshot);
  if (opts?.silent) return;
  bumpTick();
  persistHook();
}

export const editorState: Readable<EditorState> = { subscribe: store.subscribe };

export function mutate(label: string, fn: (draft: EditorState) => void): void {
  if (import.meta.env.DEV && !label) {
    console.warn('[editorStore] mutate() called without a label');
  }
  if (pendingTransaction) {
    // Inside a transaction: don't push individually; just mark the scope
    // dirty and apply. The transaction commit pushes one collapsed entry.
    pendingTransaction.changed = true;
    if (paletteSession) paletteSession.changed = true;
    store.update((s) => { fn(s); return s; });
    return;
  }
  // No transaction: each mutate is its own history entry. Inside a palette
  // session this still pushes per-mutate entries (so undo within the
  // session walks them back), and the session's commit will collapse them.
  if (paletteSession) paletteSession.changed = true;
  const current = get(store);
  pushPast(structuredClone(current));
  store.update((s) => { fn(s); return s; });
  bumpTick();
  persistHook();
}

// ── Transaction wrappers (thin, expose the public names) ──────────────────

export function beginTransaction(label: string): void {
  if (pendingTransaction) {
    if (import.meta.env.DEV) {
      console.warn(
        `[editorStore] beginTransaction("${label}") while "${pendingTransaction.label}" is still open; aborting previous`,
      );
    }
    abortTransaction();
  }
  pendingTransaction = beginScope({
    label,
    collapseToOne: true,
    clipUndoFloor: false,
  });
}

export function commitTransaction(): void {
  if (!pendingTransaction) return;
  const scope = pendingTransaction;
  pendingTransaction = null;
  commitScope(scope);
}

export function abortTransaction(): void {
  if (!pendingTransaction) return;
  const scope = pendingTransaction;
  pendingTransaction = null;
  // Silent: observers see the state revert, but `dirty` reflects pre-tx
  // position (no tick) and no persist runs.
  cancelScope(scope, { silent: true });
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

// ── Palette-session wrappers (thin, expose the public names) ──────────────

/**
 * Begin a palette edit session (panel opens). Captures the pre-open state
 * and the current history length so intra-session undo can be clipped, and
 * so commit/cancel can collapse or drop everything pushed during the
 * session. No history entry is pushed here — opening the panel is not an
 * edit by itself.
 */
export function beginPaletteEditSession(): void {
  if (paletteSession) commitPaletteEditSession();
  paletteSession = beginScope({
    label: 'paletteSession',
    collapseToOne: true,
    clipUndoFloor: true,
  });
}

/**
 * Commit the session (user pressed Check). All intra-session history
 * entries are collapsed into a single entry representing the pre-open
 * state so one outside-panel undo restores it. Current state stays.
 */
export function commitPaletteEditSession(): void {
  if (!paletteSession) return;
  if (pendingTransaction) abortTransaction();
  const scope = paletteSession;
  paletteSession = null;
  commitScope(scope);
  if (import.meta.env.DEV) {
    console.debug('[editorStore] commitPaletteEditSession →', {
      pastLen: past.length,
      snapshotPalettes: paletteSnapshot(scope.snapshot),
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
  if (pendingTransaction) abortTransaction();
  const scope = paletteSession;
  paletteSession = null;
  cancelScope(scope);
  if (import.meta.env.DEV) {
    console.debug('[editorStore] cancelPaletteEditSession →', {
      pastLen: past.length,
      restoredPalettes: paletteSnapshot(scope.snapshot),
    });
  }
}

// ── Undo / redo ───────────────────────────────────────────────────────────

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
