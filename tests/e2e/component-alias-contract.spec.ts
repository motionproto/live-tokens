import fs from 'node:fs';
import path from 'node:path';
import { expect, test } from '@playwright/test';
import { openOverlayEditor } from './support/editor';

interface AliasCase {
  component: string;
  variable: string;
}

function discoverDefaultAliases(): AliasCase[] {
  const root = path.resolve('src/live-tokens/data/component-configs');
  const cases: AliasCase[] = [];
  for (const directory of fs.readdirSync(root).sort()) {
    const file = path.join(root, directory, 'default.json');
    if (!fs.existsSync(file)) continue;
    const data = JSON.parse(fs.readFileSync(file, 'utf8')) as {
      component?: string;
      aliases?: Record<string, unknown>;
    };
    const component = data.component ?? directory;
    for (const variable of Object.keys(data.aliases ?? {}).sort()) {
      cases.push({ component, variable });
    }
  }
  return cases;
}

const aliasCases = discoverDefaultAliases();

test('every shipped component alias fans out set, update, and remove to the host root', async ({ page }) => {
  test.setTimeout(60_000);
  const frame = await openOverlayEditor(page, 'components');

  const result = await frame.evaluate(async (cases: AliasCase[]) => {
    const modulePath = '/src/editor/core/store/editorStore.ts';
    const editor = await import(/* @vite-ignore */ modulePath);
    let originalComponents: unknown;
    const unsubscribe = editor.editorState.subscribe((state: { components: unknown }) => {
      if (originalComponents === undefined) {
        originalComponents = structuredClone(state.components);
      }
    });
    unsubscribe();

    const selfStyle = document.documentElement.style;
    const hostStyle = window.parent.document.documentElement.style;
    const failures: string[] = [];
    const check = (expected: string, phase: string) => {
      for (const { variable } of cases) {
        const self = selfStyle.getPropertyValue(variable).trim();
        const host = hostStyle.getPropertyValue(variable).trim();
        if (self !== expected || host !== expected) {
          failures.push(`${phase} ${variable}: editor=${self}, host=${host}`);
          if (failures.length >= 20) return;
        }
      }
    };

    editor.mutate('Playwright: set every component alias', (state: any) => {
      for (const { component, variable } of cases) {
        const slice = state.components[component]
          ?? (state.components[component] = { aliases: {}, config: {} });
        slice.aliases[variable] = { kind: 'literal', value: '__playwright_set__' };
      }
    });
    check('__playwright_set__', 'set');

    editor.mutate('Playwright: update every component alias', (state: any) => {
      for (const { component, variable } of cases) {
        state.components[component].aliases[variable] = {
          kind: 'literal',
          value: '__playwright_update__',
        };
      }
    });
    check('__playwright_update__', 'update');

    editor.mutate('Playwright: remove every component alias', (state: any) => {
      for (const { component, variable } of cases) {
        delete state.components[component]?.aliases[variable];
      }
    });
    check('', 'remove');

    editor.mutate('Playwright: restore component aliases', (state: any) => {
      state.components = originalComponents;
    });

    return { checked: cases.length, failures };
  }, aliasCases);

  expect(aliasCases.length).toBeGreaterThan(1_000);
  expect(new Set(aliasCases.map(({ variable }) => variable)).size).toBe(aliasCases.length);
  expect(result.checked).toBe(aliasCases.length);
  expect(result.failures).toEqual([]);
});
