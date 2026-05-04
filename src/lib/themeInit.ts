import { getActiveTheme } from './themeService';
import { activeFileName } from './editorConfigStore';
import { migrateThemeFonts } from './fontMigration';
import { applyFontSources, applyFontStacks } from './fontLoader';
import { loadFromFile, seedComponentsFromApi } from './editorStore';
import { listComponents, getActiveComponentConfig } from './componentConfigService';

/**
 * Fetch the active theme from the server and apply its CSS variables
 * to :root before the app mounts. Seeds the editor store so PaletteEditors
 * initialize from the theme instead of stale localStorage.
 *
 * Routes the theme through `loadFromFile` so palette-derived vars in
 * `deriveCssVars` correctly overwrite any stale hexes baked into
 * `theme.cssVariables` by `handleSave`'s scrape. Writing
 * `theme.cssVariables` directly to inline :root (the previous approach)
 * bypassed the store and left the subscriber's `lastApplied` diff cache
 * out of sync, so palette-derived values stayed stale until a
 * `PaletteEditor` mounted and re-emitted them.
 */
export async function initializeTheme(): Promise<void> {
  try {
    const theme = await getActiveTheme();
    if (theme) {
      migrateThemeFonts(theme);
      loadFromFile(theme);
      if (theme.fontSources && theme.fontSources.length > 0) {
        applyFontSources(theme.fontSources);
      }
      if (theme.fontStacks && theme.fontStacks.length > 0) {
        applyFontStacks(theme.fontStacks, theme.fontSources ?? []);
      }
      const fileName = theme._fileName || 'default';
      activeFileName.set(fileName);
    }
  } catch {
    // Silent fallback — tokens.css provides defaults
  }

  try {
    const components = await listComponents();
    const configs: Record<
      string,
      { activeFile: string; aliases: Record<string, string>; config?: Record<string, unknown>; schemaVersion?: number }
    > = {};
    await Promise.all(
      components.map(async (c) => {
        const cfg = await getActiveComponentConfig(c.name);
        if (cfg) {
          configs[c.name] = {
            activeFile: c.activeFile,
            aliases: cfg.aliases,
            config: cfg.config,
            schemaVersion: cfg.schemaVersion,
          };
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
