/**
 * Central editor state store — the single mutation funnel.
 *
 * All editor state (palettes, fonts, shadows, washes, columns, ad-hoc CSS
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
 * Component-config + colors-and-type migrations live in `./migrations` (Wave 4).
 * `loadComponentActive` / `seedComponentsFromApi` / `loadFromFile` / `toColorsAndType`
 * orchestrate across slices and stay here.
 */

import { derived, writable, type Readable } from 'svelte/store';
import type { CssVarRef, EditorState, GradientAliasValue } from './editorTypes';
import type { AliasDiskValue, ColorsAndType } from '../themes/themeTypes';
import { KNOWN_COMPONENT_CONFIG_KEYS } from '../components/componentConfigKeys';
import { cssStringToRef } from './cssVarRef';
import {
  CURRENT_COLORS_AND_TYPE_SCHEMA_VERSION,
  CURRENT_COMPONENT_SCHEMA_VERSION,
  runMigrations,
} from '../themes/migrations';
import { migrateComponentConfig } from '../themes/migrateComponentConfig';
import { renamePrimaryPaletteKey } from '../themes/migrations/2026-05-13-primary-to-brand';
import {
  renameBackgroundPaletteKey,
  renameBackgroundHarmonyFamily,
} from '../themes/migrations/2026-07-29-background-palette-to-canvas';
import { unifyGrayPalettes } from '../themes/migrations/2026-06-05-palette-unification';
import { migratePaletteColorsToOklch, type PreOklchPaletteConfig } from '../themes/migrations/2026-07-21-palette-oklch-basis';
import { adoptLegacyBaseAnchor } from '../themes/migrations/2026-07-24-base-anchor-placement';
import { placeUnplacedBaseAnchors } from '../themes/migrations/2026-07-29-place-base-anchors';
import { adoptBackgroundSpotAsBase } from '../themes/migrations/2026-07-25-background-spot-to-base';
import { defaultHarmonyAxes, sanitizeHarmonyAxes } from '../palettes/colorHarmony';
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
} from '../themes/slices/columns';
import {
  loadWashesFromVars,
  makeDefaultWashesState,
  washesToVars,
} from '../themes/slices/washes';
import {
  loadShadowsFromVars,
  shadowsToVars,
} from '../themes/slices/shadows';
import {
  gradientsToVars,
  loadGradientsFromFile,
  makeDefaultGradients,
} from '../themes/slices/gradients';
import {
  componentBaseline,
  getComponentOwnedVarNames,
  loadComponentsFromVars,
  notifyComponentSavedChanged,
  setSavedComponentBaseline,
  __resetComponentsForTests,
} from '../themes/slices/components';

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
    washes: makeDefaultWashesState(),
    columns: { ...DEFAULT_COLUMNS },
    components: {},
    gradients: { tokens: makeDefaultGradients() },
    harmonyAxes: defaultHarmonyAxes(),
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
} from '../themes/slices/domainVars';

export {
  columnsToVars,
  columnsEqualsDefault,
  COLUMN_VAR_NAMES,
  DEFAULT_COLUMNS,
  parseColumnVars,
} from '../themes/slices/columns';

export {
  washesToVars,
  WASH_VAR_NAMES,
  applyWashVarsToState,
  makeDefaultWashesState,
  makeDefaultScrimTokens,
  makeDefaultTintTokens,
  washTokenToCss,
  parseWashCss,
} from '../themes/slices/washes';

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
} from '../themes/slices/shadows';

export {
  gradientsToVars,
  makeDefaultGradients,
  setGradient,
  setGradientType,
  setGradientAngle,
  setGradientStop,
  addGradientStop,
  removeGradientStop,
  addGradientToken,
  removeGradientToken,
} from '../themes/slices/gradients';

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
  isComponentPropertyLinked,
  setComponentAliasLinked,
  clearComponentAliasLinked,
  unlinkComponentProperty,
  relinkComponentProperty,
  markComponentSaved,
} from '../themes/slices/components';

export {
  setFontSources,
  setFontStacks,
  seedFontsFromColorsAndType,
} from '../themes/slices/fonts';

export {
  setPaletteConfig,
  seedPalettesFromColorsAndType,
} from '../themes/slices/palettes';

// ── Component-config load orchestration ───────────────────────────────────
//
// Component-config migrations now live in `./migrations` (Wave 4): the
// migration runner pipes `aliases` through any registered transforms whose
// `fromVersion >= file.schemaVersion`, then `splitAliasesAndConfig` routes
// literal-valued knobs (per `KNOWN_COMPONENT_CONFIG_KEYS`) into the config
// bucket and wraps the remainder as `CssVarRef` discriminated unions.
//
// The migration itself — `migrateComponentConfig`, plus its sectiondivider
// gradient helpers — lives in `../themes/migrateComponentConfig` so the
// server (`normalizeTheme`) can run the same pass over an embedded theme
// config instead of reading it raw.

/**
 * Disk-shape → in-memory split. Routes legacy single-bucket aliases that
 * carry literal-valued knobs (per `KNOWN_COMPONENT_CONFIG_KEYS`) into the
 * config bucket, and wraps the remainder as `CssVarRef` discriminated unions.
 */
function splitAliasesAndConfig(
  rawAliases: Record<string, AliasDiskValue>,
  rawConfig: Record<string, unknown> | undefined,
): { aliases: Record<string, CssVarRef>; config: Record<string, unknown> } {
  const aliases: Record<string, CssVarRef> = {};
  const config: Record<string, unknown> = { ...(rawConfig ?? {}) };
  for (const [key, value] of Object.entries(rawAliases)) {
    if (typeof value !== 'string') {
      if (value.kind === 'gradient') {
        aliases[key] = { kind: 'gradient', value: value.value as GradientAliasValue };
      }
      continue;
    }
    if (KNOWN_COMPONENT_CONFIG_KEYS.has(key)) {
      if (config[key] === undefined) config[key] = value;
      continue;
    }
    aliases[key] = cssStringToRef(value);
  }
  return { aliases, config };
}

/**
 * Disk-shape config → in-memory slice, migrations included. `schemaVersion` is
 * the stamp on the loaded file (0 for legacy files with no stamp); the runner
 * applies any migrations between that and `CURRENT_COMPONENT_SCHEMA_VERSION`,
 * so in-memory state is always at the current version.
 *
 * Pure: the store paths below commit the result, the theme preview renders
 * one without committing.
 */
export function toComponentSlice(
  component: string,
  aliases: Record<string, AliasDiskValue>,
  config?: Record<string, unknown>,
  schemaVersion: number = 0,
): { aliases: Record<string, CssVarRef>; config: Record<string, unknown> } {
  const migrated = migrateComponentConfig(component, aliases, config, schemaVersion);
  return splitAliasesAndConfig(migrated.aliases, migrated.config);
}

/**
 * Replace a component's slice with a loaded config's contents. Uses `mutate()`
 * so the load is one undoable entry; updates the dirty baseline so the
 * post-load state reads clean for this component.
 */
export function loadComponentActive(
  component: string,
  aliases: Record<string, AliasDiskValue>,
  config?: Record<string, unknown>,
  schemaVersion: number = 0,
): void {
  const split = toComponentSlice(component, aliases, config, schemaVersion);
  mutate(`load ${component}`, (s) => {
    s.components[component] = { aliases: { ...split.aliases }, config: { ...split.config } };
  });
  setSavedComponentBaseline(component, componentBaseline(split));
  notifyComponentSavedChanged();
}

export interface ComponentSeed {
  aliases: Record<string, AliasDiskValue>;
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
      const split = toComponentSlice(comp, cfg.aliases, cfg.config, cfg.schemaVersion ?? 0);
      s.components[comp] = { aliases: { ...split.aliases }, config: { ...split.config } };
      setSavedComponentBaseline(comp, componentBaseline(split));
    }
    return s;
  });
  notifyComponentSavedChanged();
  schedulePersist();
}

/**
 * Replace colors/type and every component slice as one theme transaction.
 * Theme application used to call `loadFromFile` and `seedComponentsFromApi`
 * separately, causing two complete renderer passes and briefly exposing a
 * mixed old-components/new-tokens state. Build the final state first and emit
 * it once instead.
 */
export function loadThemeFromApi(
  colorsAndType: ColorsAndType,
  configs: Record<string, ComponentSeed>,
): void {
  const next = colorsAndTypeToState(colorsAndType);
  next.components = {};
  for (const [comp, cfg] of Object.entries(configs)) {
    const split = toComponentSlice(comp, cfg.aliases, cfg.config, cfg.schemaVersion ?? 0);
    next.components[comp] = { aliases: { ...split.aliases }, config: { ...split.config } };
    setSavedComponentBaseline(comp, componentBaseline(split));
  }
  // Defensive legacy cleanup: a colors-and-type payload may still carry
  // component-owned variables in its catch-all bag. The component slice is
  // authoritative for a whole-theme load.
  for (const name of getComponentOwnedVarNames(next)) delete next.cssVars[name];

  resetHistoryForLoad();
  store.set(next);
  markColorsAndTypeSaved(next);
  notifyComponentSavedChanged();
  schedulePersist();
}

// ── Colors and type load / save ────────────────────────────────────────────

/**
 * Per-domain loader: routes a freshly-loaded file's `cssVariables` bag
 * into typed state on `next`, then removes the routed entries so the
 * remainder lands as the catch-all `cssVars` bag. Each loader owns its
 * domain's parser + name list; this table is the only place editorStore
 * needs to know about the per-slice loading contract.
 */
type DomainLoader = (next: EditorState, rawVars: Record<string, string>) => void;

const domainLoaders: Record<string, DomainLoader> = {
  columns: loadColumnsFromVars,
  washes: loadWashesFromVars,
  shadows: loadShadowsFromVars,
  components: loadComponentsFromVars,
};

/**
 * Project a colors-and-type file onto a fresh `EditorState` without committing
 * it. `loadFromFile` commits the projection; the theme preview renders one
 * without touching the store, so both paths derive vars from the same shape.
 *
 * Reads `schemaVersion` (absent = 0) and runs colors-and-type migrations up to
 * `CURRENT_COLORS_AND_TYPE_SCHEMA_VERSION` before splitting the bag into domains.
 */
export function colorsAndTypeToState(colorsAndType: ColorsAndType): EditorState {
  const next = emptyState();
  // Structural palette migrations, innermost → outermost: rename Primary→Brand
  // and Background→Canvas (both key renames, so they precede anything that looks
  // a palette up by label), drop the gray "mode", convert every color channel to
  // the numeric OKLCH basis, adopt any legacy locked-500 anchor as a persisted
  // placement, fold a legacy background spot into the base color, then place any
  // still-unplaced anchor by base luminance. The clone is still pre-basis (hex
  // or already-numeric) on disk.
  const raw = structuredClone(colorsAndType.editorConfigs ?? {}) as Record<string, PreOklchPaletteConfig>;
  next.palettes = placeUnplacedBaseAnchors(adoptBackgroundSpotAsBase(adoptLegacyBaseAnchor(migratePaletteColorsToOklch(unifyGrayPalettes(renameBackgroundPaletteKey(renamePrimaryPaletteKey(raw)))))));
  next.fonts.sources = structuredClone(colorsAndType.fontSources ?? []);
  next.fonts.stacks  = structuredClone(colorsAndType.fontStacks  ?? []);
  const rawVars = runMigrations(
    'colors-and-type',
    colorsAndType.schemaVersion ?? 0,
    colorsAndType.cssVariables ?? {},
  );
  // Route domain-owned entries out of the catch-all bag into typed state.
  // Order doesn't matter — each loader claims a disjoint set of var names
  // (or in components' case, vars that wouldn't have been in the file to
  // begin with).
  for (const load of Object.values(domainLoaders)) load(next, rawVars);
  loadGradientsFromFile(next, colorsAndType.gradients, rawVars);
  next.harmonyAxes = sanitizeHarmonyAxes(renameBackgroundHarmonyFamily(colorsAndType.harmonyAxes), next.palettes);
  next.cssVars = rawVars;
  return next;
}

/**
 * Replace state with a loaded colors-and-type file. Clears history and marks
 * saved — "open a different document" semantics. Undo cannot cross a load.
 */
export function loadFromFile(colorsAndType: ColorsAndType): void {
  const next = colorsAndTypeToState(colorsAndType);
  resetHistoryForLoad();
  store.set(next);
  markColorsAndTypeSaved(next);
  schedulePersist();
}

/**
 * Everything a colors-and-type file carries except its identity and timestamps.
 * Split out of `toColorsAndType` so the dirty baseline below compares exactly
 * what a save would write, with nothing that changes on its own between two saves.
 */
function colorsAndTypeContent(state: EditorState): Omit<ColorsAndType, 'name' | 'createdAt' | 'updatedAt'> {
  const cssVariables: Record<string, string> = { ...state.cssVars };
  if (!columnsEqualsDefault(state.columns)) {
    Object.assign(cssVariables, columnsToVars(state.columns));
  }
  Object.assign(cssVariables, washesToVars(state.washes));
  if (state.shadows.tokens.length > 0) {
    Object.assign(cssVariables, shadowsToVars(state.shadows));
  }
  // Rendered gradient strings ride along in cssVariables for the production
  // CSS pipeline; the structured `gradients` field is the editable basis.
  if (state.gradients.tokens.length > 0) {
    Object.assign(cssVariables, gradientsToVars(state.gradients));
  }
  return {
    editorConfigs: state.palettes,
    cssVariables,
    fontSources: state.fonts.sources,
    fontStacks: state.fonts.stacks,
    gradients: state.gradients.tokens,
    harmonyAxes: state.harmonyAxes,
    schemaVersion: CURRENT_COLORS_AND_TYPE_SCHEMA_VERSION,
  };
}

/**
 * Serialize current state for saving. Domains with their own typed state
 * (columns, washes, shadows) fold derived vars into `cssVariables` only
 * when they diverge from defaults; the catch-all `cssVars` bag carries
 * everything not yet migrated to a typed domain.
 *
 * Stamps the file with `CURRENT_COLORS_AND_TYPE_SCHEMA_VERSION` so future loads
 * can skip migrations the file is already past.
 */
export function toColorsAndType(state: EditorState, meta: { name: string }): ColorsAndType {
  const now = new Date().toISOString();
  return { name: meta.name, createdAt: now, updatedAt: now, ...colorsAndTypeContent(state) };
}

// ── Colors-and-type dirty tracking ─────────────────────────────────────────
//
// `dirty` counts history entries, and component edits push history too, so it
// cannot answer whether the colors and type differ from their file. This is
// the components slice's baseline mechanism at colors-and-type scope: the
// serialized content of the last file read or written, compared against live
// state.

let savedColorsAndTypeContent = JSON.stringify(colorsAndTypeContent(emptyState()));
const colorsAndTypeSavedTick = writable(0);

export const colorsAndTypeDirty: Readable<boolean> = derived(
  [store, colorsAndTypeSavedTick],
  ([$state]) => JSON.stringify(colorsAndTypeContent($state)) !== savedColorsAndTypeContent,
);

/** Take `state` as what the colors-and-type file now holds. `loadFromFile`
 *  passes what it loaded, `persistColorsAndType` what it wrote. */
export function markColorsAndTypeSaved(state: EditorState): void {
  savedColorsAndTypeContent = JSON.stringify(colorsAndTypeContent(state));
  colorsAndTypeSavedTick.update((n) => n + 1);
}

// ── Persistence ────────────────────────────────────────────────────────────
//
// `schedulePersist` + `hydrate` + the eager-hydrate gate live in
// `./editorPersistence`. The barrel re-exports `initializeEditorStore` for
// API parity.

export { initializeEditorStore };
/** Idempotent host hook — call once during boot. Alias for `initializeEditorStore`
 *  matching the `module.init()` convention used by `cssVarSync` / `router` /
 *  `columnsOverlay` so `main.ts` can call them uniformly. */
export const init = initializeEditorStore;

// ── Test-only reset ────────────────────────────────────────────────────────

/**
 * Test-only: clear all history + transient session/transaction state and
 * reset the store to `emptyState()`. Not exported from the public barrel.
 */
export function __resetForTests(): void {
  __resetCoreForTests();
  __resetRendererCacheForTests();
  __resetComponentsForTests();
  markColorsAndTypeSaved(emptyState());
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
