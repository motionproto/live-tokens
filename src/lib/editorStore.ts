/**
 * Central editor state store — the single mutation funnel.
 *
 * All editor state (palettes, fonts, shadows, overlays, columns, ad-hoc CSS
 * vars) lives in one `EditorState` tree. Every change must go through
 * `mutate` (or a transaction). History is captured automatically; a single
 * subscriber derives CSS vars from the tree and writes them to :root via
 * `cssVarSync` (which fans out to the parent document for the overlay
 * iframe).
 *
 * Phase 1: the funnel exists and routes to the DOM, but no components have
 * been migrated yet. `deriveCssVars` only emits the catch-all `cssVars` bag;
 * domain-specific derivations come online as each tab migrates.
 */

import { writable, derived, get, type Readable } from 'svelte/store';
import type { EditorState, ColumnsState, ComponentSlice, OverlayToken, ShadowToken } from './editorTypes';
import type { Theme, FontSource, FontStack, PaletteConfig } from './themeTypes';
import { setCssVar, removeCssVar } from './cssVarSync';
import { storageKey } from './editorConfig';

const HISTORY_MAX = 100;
const PERSIST_DEBOUNCE_MS = 300;
const PERSIST_KEY = storageKey('editor-state');

const DEFAULT_COLUMNS: ColumnsState = { count: 12, maxWidth: 1440, gutter: 16, margin: 0 };

// Editor-defined overlay/hover token schema. The token *names* and positional
// order are load-bearing (template binds by index); rgba values mirror what
// VariablesTab historically initialised into local let state — which diverges
// from tokens.css (rgba(20,3,0,…)) by design: the editor starts with a
// neutral palette and tokens.css continues to win until first edit.
function makeDefaultOverlayTokens(): OverlayToken[] {
  return [
    { variable: '--overlay-lowest', label: 'Lowest', r: 0, g: 0, b: 0, opacity: 0.05 },
    { variable: '--overlay-lower',  label: 'Lower',  r: 0, g: 0, b: 0, opacity: 0.1  },
    { variable: '--overlay-low',    label: 'Low',    r: 0, g: 0, b: 0, opacity: 0.2  },
    { variable: '--overlay',        label: 'Base',   r: 0, g: 0, b: 0, opacity: 0.3  },
    { variable: '--overlay-high',   label: 'High',   r: 0, g: 0, b: 0, opacity: 0.5  },
    { variable: '--overlay-higher', label: 'Higher', r: 0, g: 0, b: 0, opacity: 0.7  },
    { variable: '--overlay-highest',label: 'Highest',r: 0, g: 0, b: 0, opacity: 0.95 },
  ];
}
function makeDefaultHoverTokens(): OverlayToken[] {
  return [
    { variable: '--hover-low',  label: 'Low',  r: 255, g: 255, b: 255, opacity: 0.05 },
    { variable: '--hover',      label: 'Base', r: 255, g: 255, b: 255, opacity: 0.1  },
    { variable: '--hover-high', label: 'High', r: 255, g: 255, b: 255, opacity: 0.15 },
  ];
}

function makeDefaultOverlaysState(): EditorState['overlays'] {
  return {
    tokens: makeDefaultOverlayTokens(),
    hoverTokens: makeDefaultHoverTokens(),
    globals: {
      overlay: { hue: 0, saturation: 0, lightness: 0, opacityMin: 0.05, opacityMax: 0.95 },
      hover:   { hue: 0, saturation: 0, lightness: 100, opacityMin: 0.05, opacityMax: 0.15 },
    },
  };
}

function emptyState(): EditorState {
  return {
    palettes: {},
    fonts: { sources: [], stacks: [] },
    shadows: {
      globals: {
        angle: 90, opacityMin: 0.15, opacityMax: 0.15, opacityLocked: true,
        distanceMin: 1, distanceMax: 25,
        blurMin: 2, blurMax: 50, blurLocked: false,
        sizeMin: 0, sizeMax: 0, sizeLocked: true,
        hue: 0, saturation: 0, lightness: 0,
      },
      tokens: [],
      overrides: {},
    },
    overlays: makeDefaultOverlaysState(),
    columns: { ...DEFAULT_COLUMNS },
    components: {},
    cssVars: {},
  };
}

function columnsToVars(c: ColumnsState): Record<string, string> {
  return {
    '--columns-count': String(c.count),
    '--columns-max-width': `${c.maxWidth}px`,
    '--columns-gutter': `${c.gutter}px`,
    '--columns-margin': `${c.margin}px`,
  };
}

/**
 * Only emit column CSS vars once the user has actually modified columns.
 * While columns match the default, we leave tokens.css in charge — which
 * preserves the `clamp()` in `--columns-gutter` until the editor overrides it.
 */
function columnsEqualsDefault(c: ColumnsState): boolean {
  return c.count === DEFAULT_COLUMNS.count
    && c.maxWidth === DEFAULT_COLUMNS.maxWidth
    && c.gutter === DEFAULT_COLUMNS.gutter
    && c.margin === DEFAULT_COLUMNS.margin;
}

const COLUMN_VAR_NAMES = ['--columns-count', '--columns-max-width', '--columns-gutter', '--columns-margin'] as const;

function parseColumnVars(vars: Record<string, string>): Partial<ColumnsState> {
  const out: Partial<ColumnsState> = {};
  const count = parseInt(vars['--columns-count'] ?? '', 10);
  if (Number.isFinite(count) && count > 0) out.count = count;
  const maxWidth = parseFloat(vars['--columns-max-width'] ?? '');
  if (Number.isFinite(maxWidth)) out.maxWidth = Math.round(maxWidth);
  const gutter = parseFloat(vars['--columns-gutter'] ?? '');
  if (Number.isFinite(gutter)) out.gutter = Math.round(gutter);
  const margin = parseFloat(vars['--columns-margin'] ?? '');
  if (Number.isFinite(margin)) out.margin = Math.round(margin);
  return out;
}

function overlayTokenToRgba(t: OverlayToken): string {
  return `rgba(${t.r}, ${t.g}, ${t.b}, ${t.opacity})`;
}

function overlaysToVars(o: EditorState['overlays']): Record<string, string> {
  const out: Record<string, string> = {};
  for (const t of o.tokens) out[t.variable] = overlayTokenToRgba(t);
  for (const t of o.hoverTokens) out[t.variable] = overlayTokenToRgba(t);
  return out;
}

function tokensEqualDefault(tokens: OverlayToken[], defaults: OverlayToken[]): boolean {
  if (tokens.length !== defaults.length) return false;
  for (let i = 0; i < tokens.length; i++) {
    const a = tokens[i]; const b = defaults[i];
    if (a.variable !== b.variable || a.r !== b.r || a.g !== b.g || a.b !== b.b || a.opacity !== b.opacity) return false;
  }
  return true;
}

/**
 * Same pattern as columns: only emit overlay CSS vars once state diverges
 * from the editor defaults. tokens.css owns the rgba values until the
 * user touches any overlay control (or loads a theme that already
 * contains overrides).
 */
function overlaysEqualsDefault(o: EditorState['overlays']): boolean {
  return tokensEqualDefault(o.tokens, makeDefaultOverlayTokens())
    && tokensEqualDefault(o.hoverTokens, makeDefaultHoverTokens());
}

const OVERLAY_VAR_NAMES = [
  '--overlay-lowest', '--overlay-lower', '--overlay-low', '--overlay',
  '--overlay-high', '--overlay-higher', '--overlay-highest',
  '--hover-low', '--hover', '--hover-high',
] as const;

// Accepts rgb(), rgba(), and #rrggbb[aa] — themes saved by the editor
// always use rgba(), but loading hand-written files shouldn't break.
const RGBA_RE = /rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*(?:,\s*([\d.]+)\s*)?\)/i;
const HEX_RE = /^#([0-9a-f]{6})([0-9a-f]{2})?$/i;

function parseRgba(raw: string): { r: number; g: number; b: number; opacity: number } | null {
  const s = raw.trim();
  const m = s.match(RGBA_RE);
  if (m) {
    const r = parseInt(m[1], 10);
    const g = parseInt(m[2], 10);
    const b = parseInt(m[3], 10);
    const a = m[4] !== undefined ? parseFloat(m[4]) : 1;
    if (![r, g, b].every((n) => Number.isFinite(n) && n >= 0 && n <= 255)) return null;
    return { r, g, b, opacity: Number.isFinite(a) ? a : 1 };
  }
  const h = s.match(HEX_RE);
  if (h) {
    const hex = h[1];
    const alpha = h[2] !== undefined ? parseInt(h[2], 16) / 255 : 1;
    return {
      r: parseInt(hex.slice(0, 2), 16),
      g: parseInt(hex.slice(2, 4), 16),
      b: parseInt(hex.slice(4, 6), 16),
      opacity: Math.round(alpha * 100) / 100,
    };
  }
  return null;
}

// ── Shadows ────────────────────────────────────────────────────────────────
//
// Shadow defaults come from tokens.css (not the editor), so state.shadows
// starts with `tokens: []` and we do not emit any shadow CSS vars until the
// editor has populated tokens (via seedShadowsFromDom on mount, or via
// loadFromFile). Once tokens exist, the subscriber writes one CSS var per
// token derived from its x/y/blur/spread/hsla fields.
const SHADOW_VAR_NAMES = [
  '--shadow-sm', '--shadow-md', '--shadow-lg', '--shadow-xl', '--shadow-2xl',
] as const;

/**
 * Every CSS var owned by a store domain (emitted by `deriveCssVars` /
 * `toTheme` from typed state, not the catch-all `cssVars` bag).
 * Consumers that scrape the DOM (e.g. the save flow still pulling palette
 * ramps emitted by PaletteEditor) use this to drop domain-owned keys from
 * their scraped bag so the store stays the single source of truth.
 */
export const DOMAIN_VAR_NAMES: readonly string[] = [
  ...COLUMN_VAR_NAMES,
  ...OVERLAY_VAR_NAMES,
  ...SHADOW_VAR_NAMES,
];

export function computeShadowXY(angle: number, distance: number): { x: number; y: number } {
  const rad = angle * (Math.PI / 180);
  return {
    x: Math.round(-distance * Math.cos(rad)),
    y: Math.round(distance * Math.sin(rad)),
  };
}

function computeAngleDistance(x: number, y: number): { angle: number; distance: number } {
  const distance = Math.round(Math.sqrt(x * x + y * y));
  if (distance === 0) return { angle: 135, distance: 0 };
  let angle = Math.atan2(y, -x) * (180 / Math.PI);
  if (angle < 0) angle += 360;
  return { angle: Math.round(angle), distance };
}

export function shadowTokenCss(t: ShadowToken): string {
  return `${t.x}px ${t.y}px ${t.blur}px ${t.spread}px hsla(${t.hue}, ${t.saturation}%, ${t.lightness}%, ${t.opacity})`;
}

export const SCALE_SHADOW_VARIABLES = new Set([
  '--shadow-sm', '--shadow-md', '--shadow-lg', '--shadow-xl', '--shadow-2xl',
]);

export function defaultShadowOverride(): import('./editorTypes').ShadowOverrideFlags {
  return { angle: false, opacity: false, color: false, distance: false, blur: false, size: false };
}

function parseShadowCss(variable: string, raw: string): ShadowToken | null {
  const m = raw.trim().match(/^(-?\d+)px\s+(-?\d+)px\s+(\d+)px\s+(-?\d+)px\s+hsla\(([\d.]+),\s*([\d.]+)%,\s*([\d.]+)%,\s*([\d.]+)\)$/);
  if (!m) return null;
  const x = parseInt(m[1], 10);
  const y = parseInt(m[2], 10);
  const blur = parseInt(m[3], 10);
  const spread = parseInt(m[4], 10);
  const hue = Math.round(parseFloat(m[5]));
  const saturation = Math.round(parseFloat(m[6]));
  const lightness = Math.round(parseFloat(m[7]));
  const opacity = parseFloat(m[8]);
  const { angle, distance } = computeAngleDistance(x, y);
  return { variable, x, y, blur, spread, opacity, hue, saturation, lightness, angle, distance };
}

function shadowsToVars(shadows: EditorState['shadows']): Record<string, string> {
  const out: Record<string, string> = {};
  for (const t of shadows.tokens) out[t.variable] = shadowTokenCss(t);
  return out;
}

function applyShadowVarsToState(shadows: EditorState['shadows'], vars: Record<string, string>): void {
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
 * Seed state.shadows.tokens from computed styles on the document element.
 * Called once from the shadows UI when state has no tokens yet — captures the
 * tokens.css baseline so the editor can mutate it. Does NOT push a history
 * entry; the seed is treated as an initial snapshot, not a user edit.
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
  // No bumpTick — seed is hydration-equivalent, not an edit. Persist so a
  // reload doesn't re-seed from the DOM on every fresh session.
  schedulePersist();
}

function applyOverlayVarsToState(overlays: EditorState['overlays'], vars: Record<string, string>): void {
  const applyTo = (list: OverlayToken[]) => {
    for (const t of list) {
      const raw = vars[t.variable];
      if (!raw) continue;
      const parsed = parseRgba(raw);
      if (!parsed) continue;
      t.r = parsed.r; t.g = parsed.g; t.b = parsed.b; t.opacity = parsed.opacity;
    }
  };
  applyTo(overlays.tokens);
  applyTo(overlays.hoverTokens);
}

const store = writable<EditorState>(emptyState());

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
  schedulePersist();
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
  schedulePersist();
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
  schedulePersist();
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
    schedulePersist();
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
  schedulePersist();
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
  schedulePersist();
  return true;
}

export const canUndo: Readable<boolean> = derived(historyTick, () => past.length > 0);
export const canRedo: Readable<boolean> = derived(historyTick, () => future.length > 0);
export const dirty:   Readable<boolean> = derived(historyTick, () => past.length !== savedAtIndex);

/**
 * Test-only: clear all history + transient session/transaction state and
 * reset the store to `emptyState()`. Not exported from the public barrel.
 */
export function __resetForTests(): void {
  past.length = 0;
  future.length = 0;
  savedAtIndex = 0;
  pendingTransaction = null;
  paletteSession = null;
  lastApplied = {};
  for (const k of Object.keys(savedComponents)) delete savedComponents[k];
  store.set(emptyState());
  bumpTick();
  bumpComponentSavedTick();
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
  for (const [k, v] of Object.entries(s.palettes)) {
    out[k] = { base: v.baseColor, overrides: Object.keys(v.overrides).length };
  }
  return out;
}

export function markSaved(): void {
  savedAtIndex = past.length;
  bumpTick();
}

// ── Fonts ──────────────────────────────────────────────────────────────────
//
// Fonts have no derived CSS vars owned by this store — the --font-* vars are
// written by `applyFontStacks` in fontLoader, and @font-face rules by
// `applyFontSources`. We own the *data* (sources + stacks); callers still
// invoke the DOM-side-effect helpers themselves after mutating.

export function setFontSources(sources: FontSource[]): void {
  mutate('update font sources', (s) => { s.fonts.sources = sources; });
}

export function setFontStacks(stacks: FontStack[]): void {
  mutate('update font stacks', (s) => { s.fonts.stacks = stacks; });
}

/**
 * Populate fonts from the server's active theme at boot. Does not push
 * a history entry — the boot load is a starting point, not an edit.
 */
export function seedFontsFromTheme(sources: FontSource[], stacks: FontStack[]): void {
  store.update((s) => {
    s.fonts.sources = structuredClone(sources);
    s.fonts.stacks = structuredClone(stacks);
    return s;
  });
  schedulePersist();
}

// ── Palettes ───────────────────────────────────────────────────────────────
//
// Each PaletteEditor instance is keyed by `label` (e.g. "Neutral", "Primary").
// This store owns the full `PaletteConfig` for each label; CSS var emission
// is still done by the editor component itself (derivation lives in
// PaletteEditor.svelte and involves OKLCH + bezier curves). A future phase
// can move that derivation here to unify with the subscriber pattern.

export function setPaletteConfig(label: string, config: PaletteConfig): void {
  mutate(`update palette ${label}`, (s) => {
    s.palettes[label] = config;
  });
}

/**
 * Server-boot path: populate all palettes at once without a history entry.
 * Mirrors `seedFontsFromTheme`.
 */
export function seedPalettesFromTheme(palettes: Record<string, PaletteConfig>): void {
  store.update((s) => {
    s.palettes = structuredClone(palettes);
    return s;
  });
  schedulePersist();
}

// ── Components ─────────────────────────────────────────────────────────────
//
// Each component owns a `{ activeFile, aliases }` slice. Aliases are the full
// component-token → semantic-token map for whatever config is active (not a
// diff); `deriveCssVars` emits every entry as `var(--<semantic>)`. Themes and
// components are orthogonal: `loadFromFile` preserves `state.components`.

function componentsToVars(components: EditorState['components']): Record<string, string> {
  const out: Record<string, string> = {};
  for (const slice of Object.values(components)) {
    for (const [varName, semanticName] of Object.entries(slice.aliases)) {
      out[varName] = semanticName.startsWith('--') ? `var(${semanticName})` : semanticName;
    }
  }
  return out;
}

export function getComponentOwnedVarNames(state: EditorState): string[] {
  const names: string[] = [];
  for (const slice of Object.values(state.components)) {
    for (const name of Object.keys(slice.aliases)) names.push(name);
  }
  return names;
}

// Module-private baseline for per-component dirty detection. Parallels
// `savedAtIndex` + `historyTick` for the global flag; `componentSavedTick`
// drives re-derivation when the baseline changes.
const savedComponents: Record<string, string> = {};
const componentSavedTick = writable(0);
function bumpComponentSavedTick(): void { componentSavedTick.update((n) => n + 1); }

export const componentDirty: Readable<Record<string, boolean>> = derived(
  [store, componentSavedTick],
  ([$state]) => {
    const out: Record<string, boolean> = {};
    for (const [comp, slice] of Object.entries($state.components)) {
      out[comp] = JSON.stringify(slice.aliases) !== (savedComponents[comp] ?? '{}');
    }
    return out;
  },
);

export function setComponentAlias(component: string, varName: string, semanticName: string): void {
  mutate(`set alias ${component}/${varName}`, (s) => {
    const existing = s.components[component];
    if (existing) {
      existing.aliases[varName] = semanticName;
    } else {
      s.components[component] = { activeFile: 'default', aliases: { [varName]: semanticName } };
    }
  });
}

export function clearComponentAlias(component: string, varName: string): void {
  mutate(`clear alias ${component}/${varName}`, (s) => {
    const slice = s.components[component];
    if (!slice) return;
    delete slice.aliases[varName];
  });
}

function componentVarPrefix(component: string): string {
  return `--${component}-`;
}

/**
 * Per-component groupKey schema registered by editor modules. Maps each
 * declared variable to its groupKey (the explicit sibling-set identifier).
 * Tokens with the same groupKey are siblings; tokens not in the schema fall
 * back to last-dash property inference so unmigrated editors keep working.
 */
const componentSchemas: Record<string, Map<string, string>> = {};

/**
 * Register a component's token → groupKey mapping. Editors call this at
 * module load (top of `<script>`) so sibling lookups can prefer explicit
 * groupKeys over name-derived inference. Re-registration overwrites prior
 * entries for the same component.
 */
export function registerComponentSchema(
  component: string,
  tokens: ReadonlyArray<{ variable: string; groupKey?: string }>,
): void {
  const map = new Map<string, string>();
  for (const t of tokens) {
    if (t.groupKey) map.set(t.variable, t.groupKey);
  }
  componentSchemas[component] = map;
}

/**
 * Resolve a variable's groupKey. Schema entries win; otherwise fall back to
 * the last-dash property suffix (legacy behaviour). Returns null when the
 * variable is not under the component prefix.
 */
function getGroupKey(component: string, varName: string): string | null {
  const schema = componentSchemas[component];
  const explicit = schema?.get(varName);
  if (explicit) return explicit;
  const prefix = componentVarPrefix(component);
  if (!varName.startsWith(prefix)) return null;
  const rest = varName.slice(prefix.length);
  const lastDash = rest.lastIndexOf('-');
  if (lastDash <= 0) return null;
  return rest.slice(lastDash + 1);
}

/**
 * All keys in the component slice that share `varName`'s groupKey.
 * Includes `varName` itself if it lives in the slice.
 */
export function getComponentPropertySiblings(component: string, varName: string): string[] {
  const groupKey = getGroupKey(component, varName);
  if (!groupKey) return [];
  const slice = get(store).components[component];
  if (!slice) return [];
  const siblings: string[] = [];
  for (const v of Object.keys(slice.aliases)) {
    if (getGroupKey(component, v) === groupKey) siblings.push(v);
  }
  return siblings;
}

/** True iff `varName` has ≥2 siblings, all resolve to the same alias, and the groupKey is not explicitly unlinked. */
export function isComponentPropertyShared(component: string, varName: string): boolean {
  const slice = get(store).components[component];
  if (!slice) return false;
  const groupKey = getGroupKey(component, varName);
  if (groupKey && slice.unlinked?.includes(groupKey)) return false;
  const siblings = getComponentPropertySiblings(component, varName);
  if (siblings.length < 2) return false;
  const first = slice.aliases[siblings[0]];
  if (!first) return false;
  return siblings.every((v) => slice.aliases[v] === first);
}

/** Write `semanticName` to every sibling that shares `varName`'s groupKey, and clear the unlinked flag. */
export function setComponentAliasShared(component: string, varName: string, semanticName: string): void {
  const groupKey = getGroupKey(component, varName);
  const siblings = getComponentPropertySiblings(component, varName);
  if (!groupKey || siblings.length === 0) {
    setComponentAlias(component, varName, semanticName);
    return;
  }
  mutate(`share ${component}/${groupKey}`, (s) => {
    const slice = s.components[component] ?? (s.components[component] = { activeFile: 'default', aliases: {} });
    for (const v of siblings) slice.aliases[v] = semanticName;
    if (!siblings.includes(varName)) slice.aliases[varName] = semanticName;
    if (slice.unlinked) {
      slice.unlinked = slice.unlinked.filter((p) => p !== groupKey);
      if (slice.unlinked.length === 0) delete slice.unlinked;
    }
  });
}

/** Clear every sibling that shares `varName`'s groupKey. */
export function clearComponentAliasShared(component: string, varName: string): void {
  const groupKey = getGroupKey(component, varName);
  const siblings = getComponentPropertySiblings(component, varName);
  if (!groupKey || siblings.length === 0) {
    clearComponentAlias(component, varName);
    return;
  }
  mutate(`clear shared ${component}/${groupKey}`, (s) => {
    const slice = s.components[component];
    if (!slice) return;
    for (const v of siblings) delete slice.aliases[v];
  });
}

/** Mark `varName`'s groupKey as unlinked so siblings are independently editable. Aliases are preserved. */
export function unlinkComponentProperty(component: string, varName: string): void {
  const groupKey = getGroupKey(component, varName);
  if (!groupKey) return;
  const siblings = getComponentPropertySiblings(component, varName);
  if (siblings.length < 2) return;
  mutate(`unlink ${component}/${groupKey}`, (s) => {
    const slice = s.components[component];
    if (!slice) return;
    const unlinked = slice.unlinked ?? [];
    if (!unlinked.includes(groupKey)) {
      slice.unlinked = [...unlinked, groupKey];
    }
  });
}

/**
 * Rewrite abbreviated component-prefix keys to the long-form convention
 * (`--segment-*` → `--segmentedcontrol-*`, etc.). Keeps saved configs loading
 * after the prefix-unabbreviation refactor. Drop these entries once every
 * on-disk config has been resaved under the new names.
 */
const COMPONENT_PREFIX_RENAMES: Record<string, string> = {
  '--segment-': '--segmentedcontrol-',
  '--collapsible-': '--collapsiblesection-',
  '--progress-': '--progressbar-',
  '--section-divider-': '--sectiondivider-',
  '--radio-': '--radiobutton-',
  '--inline-edit-': '--inlineeditactions-',
};

/**
 * Per-component suffix rewrites applied after the prefix migration — these
 * cover the `bg` → `surface` and hover-state reorder that landed alongside
 * the prefix rename for progressbar and inlineeditactions.
 */
const COMPONENT_SUFFIX_RENAMES: Record<string, Array<[string, string]>> = {
  progressbar: [['-track-bg', '-track-surface']],
  inlineeditactions: [
    ['-bg-hover', '-hover-surface'],
    ['-bg', '-surface'],
  ],
};

/**
 * SegmentedControl component-state refactor (2026-04-27): the disabled
 * component state used to be modeled as an interaction state on the
 * default option (`--segmentedcontrol-option-disabled-*`); it's now its
 * own top-level component state (`--segmentedcontrol-disabled-*`).
 * Selected-disabled was briefly introduced as a state then removed —
 * a disabled control can't have a selected option. Drop those keys on
 * load.
 */
const SEGMENTEDCONTROL_OPTION_DISABLED_PREFIX = '--segmentedcontrol-option-disabled-';
const SEGMENTEDCONTROL_DISABLED_PREFIX = '--segmentedcontrol-disabled-';
const SEGMENTEDCONTROL_SELECTED_DISABLED_PREFIX = '--segmentedcontrol-selected-disabled-';

function migrateComponentAliases(component: string, aliases: Record<string, string>): Record<string, string> {
  const out: Record<string, string> = {};
  const suffixRules = COMPONENT_SUFFIX_RENAMES[component] ?? [];
  for (const [oldKey, value] of Object.entries(aliases)) {
    let key = oldKey;
    // One-off whole-key rename (detailnav's only abbreviated token).
    if (key === '--detail-nav-bg') key = '--detailnav-surface';
    for (const [oldPrefix, newPrefix] of Object.entries(COMPONENT_PREFIX_RENAMES)) {
      if (key.startsWith(oldPrefix)) {
        key = newPrefix + key.slice(oldPrefix.length);
        break;
      }
    }
    for (const [oldSuffix, newSuffix] of suffixRules) {
      if (key.endsWith(oldSuffix)) {
        key = key.slice(0, -oldSuffix.length) + newSuffix;
        break;
      }
    }
    if (component === 'segmentedcontrol') {
      // Drop short-lived selected-disabled tokens (impossible state).
      if (key.startsWith(SEGMENTEDCONTROL_SELECTED_DISABLED_PREFIX)) continue;
      // Move option-disabled-* tokens to disabled-* (component-state level).
      if (key.startsWith(SEGMENTEDCONTROL_OPTION_DISABLED_PREFIX)) {
        key = SEGMENTEDCONTROL_DISABLED_PREFIX + key.slice(SEGMENTEDCONTROL_OPTION_DISABLED_PREFIX.length);
      }
    }
    if (!(key in out)) out[key] = value;
  }
  return out;
}

/**
 * Replace a component's slice with a loaded config file's contents. Uses
 * `mutate()` so the load is one undoable entry; updates the dirty baseline
 * so the post-load state reads clean for this component.
 */
export function loadComponentActive(
  component: string,
  activeFile: string,
  aliases: Record<string, string>,
): void {
  const migrated = migrateComponentAliases(component, aliases);
  mutate(`load ${component}/${activeFile}`, (s) => {
    s.components[component] = { activeFile, aliases: { ...migrated } };
  });
  savedComponents[component] = JSON.stringify(migrated);
  bumpComponentSavedTick();
}

/**
 * Boot-path hydration from the server's /api/component-configs fetch. No
 * history entry, no dirty flag — components are clean relative to disk.
 */
export function seedComponentsFromApi(
  configs: Record<string, ComponentSlice>,
): void {
  store.update((s) => {
    s.components = {};
    for (const [comp, cfg] of Object.entries(configs)) {
      const migrated = migrateComponentAliases(comp, cfg.aliases);
      s.components[comp] = { activeFile: cfg.activeFile, aliases: { ...migrated } };
      savedComponents[comp] = JSON.stringify(migrated);
    }
    return s;
  });
  bumpComponentSavedTick();
  schedulePersist();
}

export function markComponentSaved(component: string): void {
  const slice = get(store).components[component];
  if (!slice) return;
  savedComponents[component] = JSON.stringify(slice.aliases);
  bumpComponentSavedTick();
}

/**
 * Rewrite legacy CSS-var keys in a loaded theme bag to their current names.
 * Old themes saved before a rename keep working without re-saving; the migrated
 * bag then flows through the normal domain routing below.
 *
 * Drop entries here once all on-disk themes have been resaved under the new
 * names (the rewrites are cheap but accumulate indefinitely otherwise).
 */
const LEGACY_KEY_RENAMES: Record<string, string | null> = {
  '--empty': '--page-bg',
  '--empty-attachment': '--page-bg-attachment',
  // Orphan exports dropped from tokens.css; no new home — silently discard.
  '--border-neutral': null,
  // Shadow cleanup: these five tokens were removed (low/zero consumers,
  // aesthetic drift). Dialog migrated onto --shadow-2xl; focus rings moved
  // to their own --ring-focus-* namespace, which themes don't carry by
  // default — tokens.css provides the canonical values.
  '--shadow-app': null,
  '--shadow-card': null,
  '--shadow-overlay': null,
  '--shadow-focus': null,
  '--shadow-glow-green': null,
};

// bg → canvas: rename every key in the --color-bg-*, --surface-bg(-*)?,
// --border-bg(-*)?, --text-bg(-*)? families to their canvas equivalents.
// Handled as a pattern match (rather than static entries in LEGACY_KEY_RENAMES)
// because the families carry ~28 keys between them and listing each is noise.
const BG_TO_CANVAS_PREFIXES = ['--color-bg-', '--surface-bg', '--border-bg', '--text-bg'] as const;

function migrateBgToCanvas(rawVars: Record<string, string>): void {
  for (const oldKey of Object.keys(rawVars)) {
    for (const prefix of BG_TO_CANVAS_PREFIXES) {
      if (!oldKey.startsWith(prefix)) continue;
      // Only the -bg boundary should swap; don't accidentally rename
      // --text-bgthing or similar.
      const suffix = oldKey.slice(prefix.length);
      if (suffix && !suffix.startsWith('-')) continue;
      const newKey = prefix.replace('-bg', '-canvas') + suffix;
      if (newKey === oldKey) continue;
      const value = rawVars[oldKey];
      delete rawVars[oldKey];
      if (!(newKey in rawVars)) rawVars[newKey] = value;
      break;
    }
  }
}

function migrateLegacyKeys(rawVars: Record<string, string>): void {
  for (const [oldKey, newKey] of Object.entries(LEGACY_KEY_RENAMES)) {
    if (!(oldKey in rawVars)) continue;
    const value = rawVars[oldKey];
    delete rawVars[oldKey];
    if (newKey && !(newKey in rawVars)) rawVars[newKey] = value;
  }
  migrateBgToCanvas(rawVars);
}

/**
 * Replace state with a loaded theme. Clears history and marks saved —
 * "open a different document" semantics. Undo cannot cross a theme load.
 */
export function loadFromFile(theme: Theme): void {
  const next = emptyState();
  next.palettes = structuredClone(theme.editorConfigs ?? {});
  next.fonts.sources = structuredClone(theme.fontSources ?? []);
  next.fonts.stacks  = structuredClone(theme.fontStacks  ?? []);
  const rawVars = { ...(theme.cssVariables ?? {}) };
  migrateLegacyKeys(rawVars);
  // Column vars live in state.columns; strip them out of the catch-all bag
  // so derivation stays single-source.
  const colOverrides = parseColumnVars(rawVars);
  next.columns = { ...DEFAULT_COLUMNS, ...colOverrides };
  for (const name of COLUMN_VAR_NAMES) delete rawVars[name];
  // Overlay / hover vars likewise route into state.overlays.tokens; any that
  // fail to parse are left in the catch-all bag as a fallback.
  applyOverlayVarsToState(next.overlays, rawVars);
  for (const name of OVERLAY_VAR_NAMES) delete rawVars[name];
  // Shadow vars populate state.shadows.tokens; globals/overrides stay at
  // whatever the user has accumulated in this session (themes don't
  // carry them — they persist via this store's own localStorage).
  applyShadowVarsToState(next.shadows, rawVars);
  for (const name of SHADOW_VAR_NAMES) delete rawVars[name];
  // Preserve shadow globals/overrides across theme loads so the editor UI
  // reopens with the same controls the user was working with.
  next.shadows.globals = structuredClone(get(store).shadows.globals);
  next.shadows.overrides = structuredClone(get(store).shadows.overrides);
  // Themes and components are orthogonal: component aliases live in their
  // own files, not the theme JSON. Preserve the current slice across theme
  // loads and strip any component-owned vars that may have leaked into the
  // theme's cssVariables bag.
  next.components = structuredClone(get(store).components);
  for (const name of getComponentOwnedVarNames(next)) delete rawVars[name];
  next.cssVars = rawVars;
  past.length = 0;
  future.length = 0;
  savedAtIndex = 0;
  pendingTransaction = null;
  store.set(next);
  bumpTick();
  schedulePersist();
}

/**
 * Serialize current state for saving. Phase 1 emits the escape-hatch
 * `cssVars` bag as-is; domain-derived vars fold in during later phases when
 * `deriveCssVars` grows beyond the bag.
 */
export function toTheme(state: EditorState, meta: { name: string }): Theme {
  const now = new Date().toISOString();
  const cssVariables: Record<string, string> = { ...state.cssVars };
  if (!columnsEqualsDefault(state.columns)) {
    Object.assign(cssVariables, columnsToVars(state.columns));
  }
  if (!overlaysEqualsDefault(state.overlays)) {
    Object.assign(cssVariables, overlaysToVars(state.overlays));
  }
  if (state.shadows.tokens.length > 0) {
    Object.assign(cssVariables, shadowsToVars(state.shadows));
  }
  return {
    name: meta.name,
    createdAt: now,
    updatedAt: now,
    editorConfigs: state.palettes,
    cssVariables,
    fontSources: state.fonts.sources,
    fontStacks: state.fonts.stacks,
  };
}

// ── Persistence ────────────────────────────────────────────────────────────

let persistTimer: ReturnType<typeof setTimeout> | null = null;
function schedulePersist(): void {
  if (typeof localStorage === 'undefined') return;
  if (persistTimer) clearTimeout(persistTimer);
  persistTimer = setTimeout(persistNow, PERSIST_DEBOUNCE_MS);
}
function persistNow(): void {
  persistTimer = null;
  try {
    localStorage.setItem(PERSIST_KEY, JSON.stringify(get(store)));
  } catch {
    // quota / serialization errors — silent, not fatal
  }
}

function hydrate(): void {
  if (typeof localStorage === 'undefined') return;
  try {
    const raw = localStorage.getItem(PERSIST_KEY);
    if (!raw) return;
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed === 'object') {
      // Shallow-merge onto default shape so older persisted state missing
      // newly-added domain fields still loads.
      store.set({ ...emptyState(), ...parsed });
    }
  } catch {
    // corrupt state — leave defaults
  }
}

// Hydrate eagerly at module load so child components reading `$editorState`
// in their onMount see persisted state, not the transient empty default.
// Svelte mounts children before parents — waiting for Editor's onMount is
// too late.
let hydrated = false;
function ensureHydrated(): void {
  if (hydrated) return;
  hydrated = true;
  hydrate();
}
ensureHydrated();

/**
 * Kept for API parity with callers that opt-in from onMount. A no-op after
 * the eager load above, but cheap to call multiple times.
 */
export async function initializeEditorStore(): Promise<void> {
  ensureHydrated();
}

// ── Derived CSS-var subscription ───────────────────────────────────────────
//
// Phase 2 derivation: columns + overlays derive from their domains; the
// catch-all cssVars bag covers everything not yet migrated. As remaining
// domains come online (shadows → fonts → palettes), their logic moves here.
function deriveCssVars(state: EditorState): Record<string, string> {
  const out: Record<string, string> = { ...state.cssVars };
  if (!columnsEqualsDefault(state.columns)) {
    Object.assign(out, columnsToVars(state.columns));
  }
  if (!overlaysEqualsDefault(state.overlays)) {
    Object.assign(out, overlaysToVars(state.overlays));
  }
  if (state.shadows.tokens.length > 0) {
    Object.assign(out, shadowsToVars(state.shadows));
  }
  Object.assign(out, componentsToVars(state.components));
  return out;
}

let lastApplied: Record<string, string> = {};

if (typeof window !== 'undefined') {
  store.subscribe((state) => {
    const next = deriveCssVars(state);
    for (const name in next) {
      if (next[name] !== lastApplied[name]) setCssVar(name, next[name]);
    }
    for (const name in lastApplied) {
      if (!(name in next)) removeCssVar(name);
    }
    lastApplied = next;
  });
}
