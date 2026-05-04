/**
 * Central editor state store — the single mutation funnel.
 *
 * All editor state (palettes, fonts, shadows, overlays, columns, ad-hoc CSS
 * vars) lives in one `EditorState` tree. Every change must go through
 * `mutate` (or a transaction). History is captured automatically; the
 * renderer subscribes and writes derived CSS vars to :root via `cssVarSync`
 * (which fans out to the parent document for the overlay iframe).
 *
 * This module is now a barrel: it re-exports the public API from
 *  - `editorCore` (history machine + transaction/session primitives)
 *  - `slices/*` (per-domain factories + actions)
 *  - `editorRenderer` (DOM subscriber)
 *  - `editorPersistence` (debounced localStorage)
 *
 * Component-config + theme migrations live in `./migrations` (Wave 4).
 * `loadComponentActive` / `seedComponentsFromApi` / `loadFromFile` / `toTheme`
 * orchestrate across slices and stay here.
 */

import type { CssVarRef, EditorState } from './editorTypes';
import type { Theme } from './themeTypes';
import { KNOWN_COMPONENT_CONFIG_KEYS } from './componentConfigKeys';
import {
  CURRENT_THEME_SCHEMA_VERSION,
  CURRENT_COMPONENT_SCHEMA_VERSION,
  runMigrations,
} from './migrations';
import { __resetRendererCacheForTests, installRenderer } from './editorRenderer';
import {
  store,
  mutate,
  setEmptyStateFactory as setCoreEmptyStateFactory,
  setPersistHook,
  resetHistoryForLoad,
  __resetCoreForTests,
} from './editorCore';
import {
  schedulePersist,
  setEmptyStateFactory as setPersistenceEmptyStateFactory,
  ensureHydrated,
  initializeEditorStore,
} from './editorPersistence';
import {
  DEFAULT_COLUMNS,
  columnsEqualsDefault,
  columnsToVars,
  loadColumnsFromVars,
} from './slices/columns';
import {
  loadOverlaysFromVars,
  makeDefaultOverlaysState,
  overlaysEqualsDefault,
  overlaysToVars,
} from './slices/overlays';
import {
  loadShadowsFromVars,
  shadowsToVars,
} from './slices/shadows';
import { makeDefaultGradients } from './slices/gradients';
import {
  componentBaseline,
  loadComponentsFromVars,
  notifyComponentSavedChanged,
  setSavedComponentBaseline,
  __resetComponentsForTests,
} from './slices/components';

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
    gradients: { tokens: makeDefaultGradients() },
    cssVars: {},
  };
}

// ── editorCore re-exports ─────────────────────────────────────────────────

export {
  editorState,
  mutate,
  transaction,
  beginScope,
  commitScope,
  cancelScope,
  beginSliderGesture,
  undo,
  redo,
  canUndo,
  canRedo,
  dirty,
  markSaved,
  __getHistoryLengths,
  __getPastAt,
} from './editorCore';
export type { Scope } from './editorCore';

// Wire the factory in both editorCore and editorPersistence. Resetting the
// store lands a proper EditorState before any helper below runs `mutate`.
setCoreEmptyStateFactory(emptyState);
setPersistenceEmptyStateFactory(emptyState);
store.set(emptyState());

// ── Slice re-exports ──────────────────────────────────────────────────────

export {
  DOMAIN_VAR_NAMES,
} from './slices/domainVars';

export {
  columnsToVars,
  columnsEqualsDefault,
  COLUMN_VAR_NAMES,
  DEFAULT_COLUMNS,
  parseColumnVars,
} from './slices/columns';

export {
  overlaysToVars,
  overlaysEqualsDefault,
  OVERLAY_VAR_NAMES,
  applyOverlayVarsToState,
  makeDefaultOverlaysState,
  overlayTokenToRgba,
  parseRgba,
  RGBA_RE,
  HEX_RE,
} from './slices/overlays';

export {
  shadowsToVars,
  applyShadowVarsToState,
  SHADOW_VAR_NAMES,
  SCALE_SHADOW_VARIABLES,
  computeShadowXY,
  shadowTokenCss,
  defaultShadowOverride,
  parseShadowCss,
  seedShadowsFromDom,
} from './slices/shadows';

export {
  gradientsToVars,
  makeDefaultGradients,
  setGradientType,
  setGradientAngle,
  setGradientStop,
  addGradientStop,
  removeGradientStop,
  addGradientToken,
  removeGradientToken,
} from './slices/gradients';

export {
  componentsToVars,
  getComponentOwnedVarNames,
  componentDirty,
  setComponentAlias,
  clearComponentAlias,
  setComponentConfig,
  clearComponentConfig,
  registerComponentSchema,
  getComponentPropertySiblings,
  isComponentPropertyShared,
  setComponentAliasShared,
  clearComponentAliasShared,
  unlinkComponentProperty,
  markComponentSaved,
} from './slices/components';

export {
  setFontSources,
  setFontStacks,
  seedFontsFromTheme,
} from './slices/fonts';

export {
  setPaletteConfig,
  seedPalettesFromTheme,
} from './slices/palettes';

// ── Component-config load orchestration ───────────────────────────────────
//
// Component-config migrations now live in `./migrations` (Wave 4): the
// migration runner pipes `aliases` through any registered transforms whose
// `fromVersion >= file.schemaVersion`, then `splitAliasesAndConfig` routes
// literal-valued knobs (per `KNOWN_COMPONENT_CONFIG_KEYS`) into the config
// bucket and wraps the remainder as `CssVarRef` discriminated unions.

function migrateComponentAliases(
  component: string,
  aliases: Record<string, string>,
  fileVersion: number,
): Record<string, string> {
  return runMigrations('component-config', fileVersion, aliases, { component });
}

/**
 * Disk-shape → in-memory split. Routes legacy single-bucket aliases that
 * carry literal-valued knobs (per `KNOWN_COMPONENT_CONFIG_KEYS`) into the
 * config bucket, and wraps the remainder as `CssVarRef` discriminated unions.
 */
function splitAliasesAndConfig(
  rawAliases: Record<string, string>,
  rawConfig: Record<string, unknown> | undefined,
): { aliases: Record<string, CssVarRef>; config: Record<string, unknown> } {
  const aliases: Record<string, CssVarRef> = {};
  const config: Record<string, unknown> = { ...(rawConfig ?? {}) };
  for (const [key, value] of Object.entries(rawAliases)) {
    if (KNOWN_COMPONENT_CONFIG_KEYS.has(key)) {
      if (config[key] === undefined) config[key] = value;
      continue;
    }
    aliases[key] = value.startsWith('--')
      ? { kind: 'token', name: value }
      : { kind: 'literal', value };
  }
  return { aliases, config };
}

/**
 * Replace a component's slice with a loaded config file's contents. Uses
 * `mutate()` so the load is one undoable entry; updates the dirty baseline
 * so the post-load state reads clean for this component.
 *
 * `schemaVersion` is the stamp on the loaded file (0 for legacy files
 * with no stamp). The runner applies any migrations between that and
 * `CURRENT_COMPONENT_SCHEMA_VERSION` before the slice is stored — in-memory
 * state is always at the current version.
 */
export function loadComponentActive(
  component: string,
  activeFile: string,
  aliases: Record<string, string>,
  config?: Record<string, unknown>,
  schemaVersion: number = 0,
): void {
  const migrated = migrateComponentAliases(component, aliases, schemaVersion);
  const split = splitAliasesAndConfig(migrated, config);
  mutate(`load ${component}/${activeFile}`, (s) => {
    s.components[component] = { activeFile, aliases: { ...split.aliases }, config: { ...split.config } };
  });
  setSavedComponentBaseline(component, componentBaseline(split));
  notifyComponentSavedChanged();
}

export interface ComponentSeed {
  activeFile: string;
  aliases: Record<string, string>;
  config?: Record<string, unknown>;
  schemaVersion?: number;
}

/**
 * Boot-path hydration from the server's /api/component-configs fetch. No
 * history entry, no dirty flag — components are clean relative to disk.
 *
 * Each seed may carry a `schemaVersion`; absent entries are treated as 0
 * and migrated up to current.
 */
export function seedComponentsFromApi(
  configs: Record<string, ComponentSeed>,
): void {
  store.update((s) => {
    s.components = {};
    for (const [comp, cfg] of Object.entries(configs)) {
      const migrated = migrateComponentAliases(comp, cfg.aliases, cfg.schemaVersion ?? 0);
      const split = splitAliasesAndConfig(migrated, cfg.config);
      s.components[comp] = { activeFile: cfg.activeFile, aliases: { ...split.aliases }, config: { ...split.config } };
      setSavedComponentBaseline(comp, componentBaseline(split));
    }
    return s;
  });
  notifyComponentSavedChanged();
  schedulePersist();
}

// ── Theme load / save ──────────────────────────────────────────────────────

/**
 * Per-domain loader: routes a freshly-loaded theme's `cssVariables` bag
 * into typed state on `next`, then removes the routed entries so the
 * remainder lands as the catch-all `cssVars` bag. Each loader owns its
 * domain's parser + name list; this table is the only place editorStore
 * needs to know about the per-slice loading contract.
 */
type DomainLoader = (next: EditorState, rawVars: Record<string, string>) => void;

const domainLoaders: Record<string, DomainLoader> = {
  columns: loadColumnsFromVars,
  overlays: loadOverlaysFromVars,
  shadows: loadShadowsFromVars,
  components: loadComponentsFromVars,
};

/**
 * Replace state with a loaded theme. Clears history and marks saved —
 * "open a different document" semantics. Undo cannot cross a theme load.
 *
 * Reads `theme.schemaVersion` (absent = 0) and runs theme migrations up to
 * `CURRENT_THEME_SCHEMA_VERSION` before splitting the bag into domains.
 */
export function loadFromFile(theme: Theme): void {
  const next = emptyState();
  next.palettes = structuredClone(theme.editorConfigs ?? {});
  next.fonts.sources = structuredClone(theme.fontSources ?? []);
  next.fonts.stacks  = structuredClone(theme.fontStacks  ?? []);
  const rawVars = runMigrations(
    'theme',
    theme.schemaVersion ?? 0,
    theme.cssVariables ?? {},
  );
  // Route domain-owned entries out of the catch-all bag into typed state.
  // Order doesn't matter — each loader claims a disjoint set of var names
  // (or in components' case, vars that wouldn't have been in the theme to
  // begin with).
  for (const load of Object.values(domainLoaders)) load(next, rawVars);
  next.cssVars = rawVars;
  resetHistoryForLoad();
  store.set(next);
  schedulePersist();
}

/**
 * Serialize current state for saving. Domains with their own typed state
 * (columns, overlays, shadows) fold derived vars into `cssVariables` only
 * when they diverge from defaults; the catch-all `cssVars` bag carries
 * everything not yet migrated to a typed domain.
 *
 * Stamps the file with `CURRENT_THEME_SCHEMA_VERSION` so future loads can
 * skip migrations the file is already past.
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
    schemaVersion: CURRENT_THEME_SCHEMA_VERSION,
  };
}

// ── Persistence ────────────────────────────────────────────────────────────
//
// `schedulePersist` + `hydrate` + the eager-hydrate gate live in
// `./editorPersistence`. The barrel re-exports `initializeEditorStore` for
// API parity.

export { initializeEditorStore };

// ── Test-only reset ────────────────────────────────────────────────────────

/**
 * Test-only: clear all history + transient session/transaction state and
 * reset the store to `emptyState()`. Not exported from the public barrel.
 */
export function __resetForTests(): void {
  __resetCoreForTests();
  __resetRendererCacheForTests();
  __resetComponentsForTests();
}

// ── Wiring ─────────────────────────────────────────────────────────────────
//
// `setPersistHook(schedulePersist)` lets editorCore's mutate/undo/redo
// debounce-persist through the same path. `ensureHydrated()` runs the
// eager localStorage load (pre-Svelte-mount so children see persisted
// state in onMount). `installRenderer()` runs the `store.subscribe(...)`
// wiring legacy `import '.../editorStore'` paths depended on; it must run
// *after* this module's exports are initialized — the renderer imports
// `editorState` back from editorCore, and calling it earlier would TDZ
// because of the circular import.
setPersistHook(schedulePersist);
ensureHydrated();
export { deriveCssVars } from './editorRenderer';
installRenderer();
