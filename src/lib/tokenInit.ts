import { getActiveTokens, applyCssVariables } from './tokenService';
import { activeFileName, loadedConfigs, configsLoadedFromFile } from './editorConfigStore';
import { migrateTokenFileFonts } from './fontMigration';
import { applyFontSources, applyFontStacks } from './fontLoader';
import { fontSources as fontSourcesStore, fontStacks as fontStacksStore } from './fontStore';

/**
 * Fetch the active token file from the server and apply its CSS variables
 * to :root before the app mounts. Also populates the loadedConfigs store
 * so PaletteEditors initialize from the token file instead of stale localStorage.
 */
export async function initializeTokens(): Promise<void> {
  try {
    const tokens = await getActiveTokens();
    if (tokens) {
      migrateTokenFileFonts(tokens);
      if (tokens.cssVariables && Object.keys(tokens.cssVariables).length > 0) {
        applyCssVariables(tokens.cssVariables);
      }
      if (tokens.fontSources && tokens.fontSources.length > 0) {
        applyFontSources(tokens.fontSources);
        fontSourcesStore.set(tokens.fontSources);
      }
      if (tokens.fontStacks && tokens.fontStacks.length > 0) {
        applyFontStacks(tokens.fontStacks, tokens.fontSources ?? []);
        fontStacksStore.set(tokens.fontStacks);
      }
      const fileName = (tokens as any)._fileName || 'default';
      activeFileName.set(fileName);
      // Push editor configs so PaletteEditors load from the token file on mount.
      // The store is left populated; PaletteEditors read on mount then
      // VisualsTab (or the mount lifecycle) clears it after tick().
      if (tokens.editorConfigs && Object.keys(tokens.editorConfigs).length > 0) {
        loadedConfigs.set(tokens.editorConfigs);
        configsLoadedFromFile.set(true);
      }
    }
  } catch {
    // Silent fallback — variables.css provides defaults
  }
}
