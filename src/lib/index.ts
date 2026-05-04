export { default as LiveEditorOverlay } from './LiveEditorOverlay.svelte';
export type { NavLink } from './navLinkTypes';
export { default as ColumnsOverlay } from './ColumnsOverlay.svelte';

export { columnsVisible, toggleColumns, init as initColumnsOverlay } from './columnsOverlay';
export { configureEditor, storageKey } from './editorConfig';
export { activeFileName } from './editorConfigStore';
export { init as initRouter, route, navigate } from './router';
export { init as initCssVarSync } from './cssVarSync';
export { init as initEditorStore } from './editorStore';

export {
  setCssVar,
  removeCssVar,
  applyCssVariables,
  clearAllCssVarOverrides,
  scrapeCssVariables,
} from './cssVarSync';

export {
  listThemes,
  loadTheme,
  saveTheme,
  deleteTheme,
  getActiveTheme,
  setActiveFile,
  getProductionInfo,
  setProductionFile,
  listBackups,
  getBackupContent,
  restoreBackup,
  getCurrentCss,
  sanitizeFileName,
} from './themeService';
export type { ProductionInfo, BackupEntry } from './themeService';

export type {
  PaletteConfig,
  Theme,
  ThemeMeta,
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
} from './themeTypes';

export {
  applyFontSources,
  applyFontStacks,
  resolveFontStackValues,
  SYSTEM_CASCADES,
} from './fontLoader';
export { migrateThemeFonts, defaultFontSources, defaultFontStacks } from './fontMigration';

export { hexToOklch, oklchToHex, gamutClamp } from './oklch';
export type { Oklch } from './oklch';

export { initializeTheme } from './themeInit';
