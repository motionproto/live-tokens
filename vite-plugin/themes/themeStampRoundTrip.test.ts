// @vitest-environment happy-dom
/**
 * The read door strips a theme's per-entry `schemaVersion` and stamps the
 * theme instead, so every client reader has to migrate off
 * `componentSchemaVersion`. Reading the entry's own field yields undefined,
 * and a `?? 0` default replays all 27 component migrations over already
 * current data. That is not a no-op: the tabbar pair
 * `2026-05-29-tabbar-indicator-thickness-to-per-state-width` and
 * `2026-09-07-stroke-role-renames` re-adds the indicator width at its
 * `--border-width-2` fallback and then renames it over the theme's own value.
 *
 * Halloween declares `--border-width-4` on all four states, so it is the
 * canary for the whole class.
 */
import fs from 'node:fs';
import path from 'node:path';
import { beforeEach, describe, expect, it } from 'vitest';
import { get } from 'svelte/store';
import { normalizeTheme, type ThemeResolvers } from './normalizeTheme';
import { renderTheme } from '../../src/editor/core/preview/themePreview';
import {
  editorState,
  loadThemeFromApi,
  __resetForTests,
} from '../../src/editor/core/store/editorStore';
import { refToDiskValue } from '../../src/editor/core/store/cssVarRef';
import type { ColorsAndType, Theme } from '../../src/editor/core/themes/themeTypes';

const DATA = path.join(process.cwd(), 'src/live-tokens/data');
const readJson = (p: string) => JSON.parse(fs.readFileSync(p, 'utf-8'));
const KNOWN_COMPONENTS = fs.readdirSync(path.join(DATA, 'component-configs')).sort();

const resolvers: ThemeResolvers = {
  readColorsAndType: (name) => readJson(path.join(DATA, 'colors-and-type', `${name}.json`)),
  readComponentConfig: (comp, name) =>
    readJson(path.join(DATA, 'component-configs', comp, `${name}.json`)),
  listComponentNames: () => KNOWN_COMPONENTS,
  normalizeColorsAndType: (colorsAndType) => colorsAndType,
};

const serve = (slug: string): Theme =>
  normalizeTheme(readJson(path.join(DATA, 'themes', `${slug}.json`)), resolvers).theme as unknown as Theme;

const INDICATOR_WIDTHS = ['default', 'hover', 'active', 'disabled'].map(
  (state) => `--tabbar-${state}-indicator-width`,
);

describe('a theme keeps its declared component values across a load', () => {
  let halloween: Theme;
  let defaults: Theme;

  beforeEach(() => {
    __resetForTests();
    halloween = serve('halloween');
    defaults = serve('default');
  });

  it('strips the per-entry stamp and stamps the theme', () => {
    expect(halloween.componentSchemaVersion).toBeGreaterThan(0);
    for (const config of Object.values(halloween.componentConfigs)) {
      expect(config.schemaVersion).toBeUndefined();
    }
  });

  it('declares --border-width-4 indicators, which is what a preview paints', () => {
    for (const name of INDICATOR_WIDTHS) {
      expect(halloween.componentConfigs.tabbar.aliases[name]).toBe('--border-width-4');
    }

    const { vars } = renderTheme(halloween, defaults);
    for (const name of INDICATOR_WIDTHS) {
      expect(vars[name]).toBe('var(--border-width-4)');
    }
  });

  it('carries those indicators into the store on apply', () => {
    const configs = Object.fromEntries(
      Object.entries(halloween.componentConfigs).map(([comp, config]) => [
        comp,
        { aliases: config.aliases, config: config.config, schemaVersion: config.schemaVersion },
      ]),
    );
    loadThemeFromApi(
      halloween.colorsAndType as ColorsAndType,
      configs,
      halloween.componentSchemaVersion,
    );

    const tabbar = get(editorState).components.tabbar;
    for (const name of INDICATOR_WIDTHS) {
      expect(refToDiskValue(tabbar.aliases[name])).toBe('--border-width-4');
    }
  });
});
