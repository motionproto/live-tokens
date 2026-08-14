import type { AliasDiskValue, ColorsAndType } from './themeTypes';
import { activeFileName } from '../store/editorConfigStore';
import { migrateColorsAndTypeFonts } from '../fonts/fontMigration';
import { applyFontSources, applyFontStacks } from '../fonts/fontLoader';
import { loadFromFile, seedComponentsFromApi } from '../store/editorStore';
import { getActiveComponentConfig } from '../components/componentConfigService';
import { safeFetch } from '../storage/storage';
import { API_BASE } from '../storage/apiBase';

interface ComponentSummaryDto {
  name: string;
  activeFile: string;
  productionFile: string;
}

interface ListComponentsDto {
  components: ComponentSummaryDto[];
}

/**
 * Fetch the active colors and type from the server and apply their CSS
 * variables to :root before the app mounts. Seeds the editor store so
 * PaletteEditors initialize from the file instead of stale localStorage.
 *
 * Routes the payload through `loadFromFile` so palette-derived vars in
 * `deriveCssVars` correctly overwrite any stale hexes baked into
 * `cssVariables` by `handleSave`'s scrape. Writing
 * `cssVariables` directly to inline :root (the previous approach)
 * bypassed the store and left the subscriber's `lastApplied` diff cache
 * out of sync, so palette-derived values stayed stale until a
 * `PaletteEditor` mounted and re-emitted them.
 *
 * Network/parse failures fall through silently — `tokens.css` provides
 * defaults and the components slice stays empty until first edit. We use
 * `safeFetch` (instead of empty try/catch) to make the silence intentional.
 */
export async function initializeTheme(): Promise<void> {
  const colorsAndType = await safeFetch<ColorsAndType>(`${API_BASE}/colors-and-type/active`);
  if (colorsAndType) {
    migrateColorsAndTypeFonts(colorsAndType);
    loadFromFile(colorsAndType);
    if (colorsAndType.fontSources && colorsAndType.fontSources.length > 0) {
      applyFontSources(colorsAndType.fontSources);
    }
    if (colorsAndType.fontStacks && colorsAndType.fontStacks.length > 0) {
      applyFontStacks(colorsAndType.fontStacks, colorsAndType.fontSources ?? []);
    }
    const fileName = colorsAndType._fileName || 'default';
    activeFileName.set(fileName);
  }

  const list = await safeFetch<ListComponentsDto>(`${API_BASE}/component-configs`);
  if (list && Array.isArray(list.components)) {
    const configs: Record<
      string,
      { activeFile: string; aliases: Record<string, AliasDiskValue>; config?: Record<string, unknown>; schemaVersion?: number }
    > = {};
    await Promise.all(
      list.components.map(async (c) => {
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
  }
}
