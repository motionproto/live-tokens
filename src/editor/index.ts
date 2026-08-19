export { default as LiveEditorOverlay } from './overlay/LiveEditorOverlay.svelte';
export type { NavLink } from './core/routing/navLinkTypes';
export { default as ColumnsOverlay } from './overlay/ColumnsOverlay.svelte';
export { default as LiveTokensRouter } from './overlay/LiveTokensRouter.svelte';
export type { RouteEntry, EditorRouteOverrides } from './overlay/LiveTokensRouter.svelte';
export { bootLiveTokens } from './bootstrap';
export type { BootLiveTokensOptions } from './bootstrap';

export { columnsVisible, toggleColumns, init as initColumnsOverlay } from './overlay/columnsOverlay';
export { configureEditor, storageKey } from './core/store/editorConfig';
export { openThemeSlug } from './core/store/editorConfigStore';
export { init as initRouter, route, navigate, setScrollReset } from './core/routing/router';
export { init as initCssVarSync } from './core/cssVarSync';
export {
  init as initEditorStore,
  editorState,
  setComponentAlias,
  setComponentConfig,
  registerComponentSchema,
} from './core/store/editorStore';

export { setCssVar, removeCssVar } from './core/cssVarSync';

export {
  listColorsAndType,
  loadColorsAndType,
  saveColorsAndType,
  deleteColorsAndType,
  getActiveColorsAndType,
  writeWorkingColorsAndType,
  sanitizeFileName,
} from './core/themes/colorsAndTypeService';

export type {
  PaletteConfig,
  ColorsAndType,
  ColorsAndTypeMeta,
  LiveSource,
  ColorsAndTypeSource,
  GradientStyle,
  GradientStop,
  FontSource,
  FontSourceKind,
  FontFamily,
  FontStack,
  FontStackSlot,
  FontStackVariable,
  SystemCascadePreset,
  GenericFamily,
  Theme,
  ThemeMeta,
} from './core/themes/themeTypes';

export {
  listThemes,
  loadTheme,
  saveTheme,
  deleteTheme,
  getActiveTheme,
  setActiveTheme,
  getProductionTheme,
  applyTheme,
  adoptLook,
  saveAsTheme,
  saveActiveTheme,
} from './core/themes/themeService';
export type { AdoptLookResult, ApplyThemeResult } from './core/themes/themeService';

export {
  applyFontSources,
  applyFontStacks,
  resolveFontStackValues,
  SYSTEM_CASCADES,
} from './core/fonts/fontLoader';
export { migrateColorsAndTypeFonts, defaultFontSources, defaultFontStacks } from './core/fonts/fontMigration';

export { hexToOklch, oklchToHex, gamutClamp } from './core/palettes/oklch';
export type { Oklch } from './core/palettes/oklch';

export { initializeTheme } from './core/themes/themeInit';

export { registerComponent } from './component-editor/registry';
export type { RegisterComponentEntry, RegistryEntry, ComponentId } from './component-editor/registry';
