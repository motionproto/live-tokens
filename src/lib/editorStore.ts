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
 *  - `editorPersistence` (debounced localStorage; lives here until 6.5)
 *
 * Migration tables for legacy theme keys + abbreviated component prefixes
 * stay in this module pending Wave 4's migration extraction. `loadFromFile`
 * + `toTheme` orchestrate across slices and stay here for now.
 */

import { get } from 'svelte/store';
import type { EditorState, ComponentSlice } from './editorTypes';
import type { Theme } from './themeTypes';
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
import { DEFAULT_COLUMNS, COLUMN_VAR_NAMES, columnsEqualsDefault, columnsToVars, parseColumnVars } from './slices/columns';
import {
  OVERLAY_VAR_NAMES,
  applyOverlayVarsToState,
  makeDefaultOverlaysState,
  overlaysEqualsDefault,
  overlaysToVars,
} from './slices/overlays';
import {
  SHADOW_VAR_NAMES,
  applyShadowVarsToState,
  shadowsToVars,
} from './slices/shadows';
import { makeDefaultGradients } from './slices/gradients';
import {
  getComponentOwnedVarNames,
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
  beginTransaction,
  commitTransaction,
  abortTransaction,
  beginSliderGesture,
  undo,
  redo,
  canUndo,
  canRedo,
  dirty,
  markSaved,
  beginPaletteEditSession,
  commitPaletteEditSession,
  cancelPaletteEditSession,
  __getHistoryLengths,
  __getPastAt,
} from './editorCore';

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

// ── Component-config migrations ───────────────────────────────────────────
//
// The component-alias migration tables (prefix + suffix renames + the
// segmentedcontrol-specific block) stay in this module pending Wave 4's
// migration extraction. They feed `loadComponentActive` and
// `seedComponentsFromApi` below — both call into the components slice's
// dirty baseline after migrating.

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
 * a disabled control can't have a selected option. Selected-hover was
 * also briefly introduced then removed when the editor flattened to a
 * single 4-state list (default/selected/hover/disabled); the selected
 * pill now looks the same regardless of pointer state. Drop the legacy
 * keys on load.
 */
const SEGMENTEDCONTROL_OPTION_DISABLED_PREFIX = '--segmentedcontrol-option-disabled-';
const SEGMENTEDCONTROL_DISABLED_PREFIX = '--segmentedcontrol-disabled-';
const SEGMENTEDCONTROL_SELECTED_DISABLED_PREFIX = '--segmentedcontrol-selected-disabled-';
const SEGMENTEDCONTROL_SELECTED_HOVER_PREFIX = '--segmentedcontrol-selected-hover-';

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
      // Drop short-lived selected-hover tokens (selected pill no longer has a hover variation).
      if (key.startsWith(SEGMENTEDCONTROL_SELECTED_HOVER_PREFIX)) continue;
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
  setSavedComponentBaseline(component, JSON.stringify(migrated));
  notifyComponentSavedChanged();
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
      setSavedComponentBaseline(comp, JSON.stringify(migrated));
    }
    return s;
  });
  notifyComponentSavedChanged();
  schedulePersist();
}

// ── Theme-load migrations ──────────────────────────────────────────────────
//
// Like the component-config tables above, the theme-key rename map and the
// bg → canvas pattern stay here pending Wave 4. They feed `loadFromFile`.

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
  resetHistoryForLoad();
  store.set(next);
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

