import { getActiveTheme, applyCssVariables } from './themeService';
import { activeFileName } from './editorConfigStore';
import { migrateThemeFonts } from './fontMigration';
import { applyFontSources, applyFontStacks } from './fontLoader';
import { seedFontsFromTheme, seedPalettesFromTheme, seedComponentsFromApi } from './editorStore';
import { listComponents, getActiveComponentConfig } from './componentConfigService';

/**
 * Fetch the active theme from the server and apply its CSS variables
 * to :root before the app mounts. Seeds the editor store so PaletteEditors
 * initialize from the theme instead of stale localStorage.
 */
export async function initializeTheme(): Promise<void> {
  try {
    const theme = await getActiveTheme();
    if (theme) {
      migrateThemeFonts(theme);
      if (theme.cssVariables && Object.keys(theme.cssVariables).length > 0) {
        applyCssVariables(theme.cssVariables);
      }
      const hasFonts =
        (theme.fontSources && theme.fontSources.length > 0) ||
        (theme.fontStacks && theme.fontStacks.length > 0);
      if (hasFonts) {
        seedFontsFromTheme(theme.fontSources ?? [], theme.fontStacks ?? []);
      }
      if (theme.fontSources && theme.fontSources.length > 0) {
        applyFontSources(theme.fontSources);
      }
      if (theme.fontStacks && theme.fontStacks.length > 0) {
        applyFontStacks(theme.fontStacks, theme.fontSources ?? []);
      }
      const fileName = (theme as any)._fileName || 'default';
      activeFileName.set(fileName);
      if (theme.editorConfigs && Object.keys(theme.editorConfigs).length > 0) {
        seedPalettesFromTheme(theme.editorConfigs);
      }
    }
  } catch {
    // Silent fallback — tokens.css provides defaults
  }

  try {
    const components = await listComponents();
    const configs: Record<string, { activeFile: string; aliases: Record<string, string> }> = {};
    await Promise.all(
      components.map(async (c) => {
        const cfg = await getActiveComponentConfig(c.name);
        if (cfg) {
          configs[c.name] = { activeFile: c.activeFile, aliases: cfg.aliases };
        }
      }),
    );
    if (Object.keys(configs).length > 0) {
      seedComponentsFromApi(configs);
    }
  } catch {
    // Silent fallback — components slice stays empty until first edit
  }
}
