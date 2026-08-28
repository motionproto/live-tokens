import type { AliasDiskValue, ColorsAndType, Theme } from './themeTypes';
import { openThemeSlug } from '../store/editorConfigStore';
import { migrateColorsAndTypeFonts } from '../fonts/fontMigration';
import { loadFromFile, seedComponentsFromApi } from '../store/editorStore';
import { getActiveComponentConfig, type ComponentSummary } from '../components/componentConfigService';
import { safeFetch } from '../storage/storage';
import { API_BASE } from '../storage/apiBase';
import { seedSketchFromTheme } from '../sketch/sketchStore';

interface ListComponentsDto {
  components: ComponentSummary[];
}

/**
 * Fetch the live colors and type from the server and apply their CSS
 * variables to :root before the app mounts. Seeds the editor store so
 * PaletteEditors initialize from the server state instead of stale localStorage.
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
    openThemeSlug.set(colorsAndType._fileName || 'default');
  }

  const list = await safeFetch<ListComponentsDto>(`${API_BASE}/component-configs`);
  if (list && Array.isArray(list.components)) {
    const configs: Record<
      string,
      { aliases: Record<string, AliasDiskValue>; config?: Record<string, unknown>; schemaVersion?: number }
    > = {};
    let componentReadFailed = false;
    await Promise.all(
      list.components.map(async (c) => {
        const cfg = await getActiveComponentConfig(c.name);
        if (cfg) {
          configs[c.name] = {
            aliases: cfg.aliases,
            config: cfg.config,
            schemaVersion: cfg.schemaVersion,
          };
        } else {
          componentReadFailed = true;
        }
      }),
    );
    // A successful empty list is authoritative. A partial read is not: avoid
    // replacing the visible design system with a mixture of active configs
    // and CSS defaults because one request happened to fail during boot.
    if (!componentReadFailed) seedComponentsFromApi(configs);
  }

  const active = await safeFetch<Theme>(`${API_BASE}/themes/active`);
  // A failed fetch is not "the theme carries no sketchstyle": treating null as
  // absent would tell the panel the look is off the theme, or hand a fresh
  // browser a blank buffer, over a fetch that will likely succeed next time.
  // The same call a built site makes (`@motion-proto/live-tokens/sketch`), so
  // one rule decides what a theme's sketchstyle means at boot in both.
  if (active) seedSketchFromTheme(active.sketchStyle);
}
