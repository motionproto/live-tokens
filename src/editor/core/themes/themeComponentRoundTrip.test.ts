// @vitest-environment happy-dom

import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { toComponentSlice } from '../store/editorStore';
import { refToDiskValue } from '../store/cssVarRef';
import { CURRENT_COMPONENT_SCHEMA_VERSION } from './migrations';
import type { ComponentConfig, Theme } from './themeTypes';

const dataDir = join(process.cwd(), 'src/live-tokens/data');
const themesDir = join(dataDir, 'themes');
const componentConfigsDir = join(dataDir, 'component-configs');

function readJson<T>(path: string): T {
  return JSON.parse(readFileSync(path, 'utf8')) as T;
}

function normalizeComponent(component: string, config: ComponentConfig): ComponentConfig {
  const slice = toComponentSlice(
    component,
    config.aliases,
    config.config,
    config.schemaVersion ?? 0,
  );
  return {
    name: config.name,
    component,
    createdAt: config.createdAt,
    updatedAt: config.updatedAt,
    aliases: Object.fromEntries(
      Object.entries(slice.aliases).map(([name, ref]) => [name, refToDiskValue(ref)]),
    ),
    config: { ...slice.config },
    schemaVersion: CURRENT_COMPONENT_SCHEMA_VERSION,
  };
}

describe('bundled theme component snapshots', () => {
  const themeFiles = readdirSync(themesDir)
    .filter((name) => name.endsWith('.json') && !name.startsWith('_'))
    .sort();

  for (const themeFile of themeFiles) {
    const theme = readJson<Theme>(join(themesDir, themeFile));

    it(`${themeFile} migrates to declared component tokens and round-trips stably`, () => {
      for (const [component, config] of Object.entries(theme.componentConfigs)) {
        const componentDefault = readJson<ComponentConfig>(
          join(componentConfigsDir, component, 'default.json'),
        );
        const first = normalizeComponent(component, config);
        const second = normalizeComponent(component, first);
        const declaredNames = new Set([
          ...Object.keys(componentDefault.aliases),
          ...Object.keys(componentDefault.config ?? {}),
        ]);
        const unknownNames = [
          ...Object.keys(first.aliases),
          ...Object.keys(first.config ?? {}),
        ].filter((name) => !declaredNames.has(name));

        expect(
          unknownNames,
          `${themeFile}: ${component} produced token names absent from its current defaults`,
        ).toEqual([]);
        expect(second.aliases, `${themeFile}: ${component} aliases changed on second load/save`)
          .toEqual(first.aliases);
        expect(second.config, `${themeFile}: ${component} config changed on second load/save`)
          .toEqual(first.config);
      }
    });
  }
});
