import { getActiveTokens, applyCssVariables } from './tokenService';
import { activeFileName } from './editorConfigStore';
import { migrateTokenFileFonts } from './fontMigration';
import { applyFontSources, applyFontStacks } from './fontLoader';
import { seedFontsFromTokens, seedPalettesFromTokens } from './editorStore';

/**
 * Fetch the active token file from the server and apply its CSS variables
 * to :root before the app mounts. Seeds the editor store so PaletteEditors
 * initialize from the token file instead of stale localStorage.
 */
export async function initializeTokens(): Promise<void> {
  try {
    const tokens = await getActiveTokens();
    if (tokens) {
      migrateTokenFileFonts(tokens);
      if (tokens.cssVariables && Object.keys(tokens.cssVariables).length > 0) {
        applyCssVariables(tokens.cssVariables);
      }
      const hasFonts =
        (tokens.fontSources && tokens.fontSources.length > 0) ||
        (tokens.fontStacks && tokens.fontStacks.length > 0);
      if (hasFonts) {
        seedFontsFromTokens(tokens.fontSources ?? [], tokens.fontStacks ?? []);
      }
      if (tokens.fontSources && tokens.fontSources.length > 0) {
        applyFontSources(tokens.fontSources);
      }
      if (tokens.fontStacks && tokens.fontStacks.length > 0) {
        applyFontStacks(tokens.fontStacks, tokens.fontSources ?? []);
      }
      const fileName = (tokens as any)._fileName || 'default';
      activeFileName.set(fileName);
      if (tokens.editorConfigs && Object.keys(tokens.editorConfigs).length > 0) {
        seedPalettesFromTokens(tokens.editorConfigs);
      }
    }
  } catch {
    // Silent fallback — variables.css provides defaults
  }
}
