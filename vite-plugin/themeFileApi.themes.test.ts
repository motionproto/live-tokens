/**
 * Integration tests for encapsulated themes, driven through the real route
 * table with mock req/res — no live Vite server. Local data lives in a temp dir
 * (a fresh consumer); the package data dir resolves to this repo's own
 * `src/live-tokens/data`, which supplies the default colors and type and theme.
 *
 * Each test seeds files first and calls `boot()` itself, because the boot-time
 * v1 → v3 migration is one of the things under test.
 */
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { themeFileApi } from './themeFileApi';

const API = '/api/live-tokens';
const REPO_ROOT = process.cwd();

let tmp: string;
let colorsAndTypeDir: string;
let configsDir: string;
let themesDir: string;
let warnings: string[];
let mw: (req: any, res: any, next: any) => any;

function makeReq(method: string, url: string, body?: unknown) {
  return {
    method,
    url,
    on(event: string, cb: (arg?: any) => void) {
      if (event === 'data') {
        if (body !== undefined) cb(Buffer.from(JSON.stringify(body)));
      } else if (event === 'end') {
        cb();
      }
    },
  };
}

function makeRes() {
  return {
    statusCode: 0,
    headers: {} as Record<string, string>,
    payload: '',
    writableEnded: false,
    setHeader(this: any, k: string, v: string) {
      this.headers[k] = v;
    },
    end(this: any, p?: string) {
      if (p !== undefined) this.payload = p;
      this.writableEnded = true;
    },
  };
}

async function request(method: string, url: string, body?: unknown) {
  const req = makeReq(method, url, body);
  const res = makeRes();
  await mw(req, res, () => {});
  return { status: res.statusCode, json: res.payload ? JSON.parse(res.payload) : null };
}

function boot(componentsSrcDir?: string) {
  const plugin = themeFileApi({
    dataDir: tmp,
    colorsAndTypeDir,
    componentConfigsDir: configsDir,
    themesDir,
    componentsSrcDir,
    tokensCssPath: path.join(REPO_ROOT, 'src/system/styles/tokens.css'),
    fontsCssPath: path.join(tmp, 'fonts.css'),
    tokensGeneratedCssPath: path.join(tmp, 'tokens.generated.css'),
  });
  const captured: any[] = [];
  (plugin as any).configureServer({
    middlewares: { use: (fn: any) => captured.push(fn) },
    config: { logger: { warn: (msg: string) => warnings.push(msg) } },
  });
  mw = captured[0];
}

function writeJson(file: string, data: unknown) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, JSON.stringify(data, null, 2));
}

/** Record every path written while `run` executes, the write itself untouched.
 *  Pins how many times a door rebuilds the generated CSS. The patch comes off
 *  in `finally`: leaking it would follow every later test in the file. */
async function trackWrites<T>(
  run: () => Promise<T>,
): Promise<{ result: T; written: string[] }> {
  const written: string[] = [];
  const original = fs.writeFileSync;
  (fs as any).writeFileSync = (file: any, data: any, options?: any) => {
    written.push(String(file));
    return original(file, data, options);
  };
  try {
    return { result: await run(), written };
  } finally {
    (fs as any).writeFileSync = original;
  }
}

const readJson = (file: string) => JSON.parse(fs.readFileSync(file, 'utf-8'));

const COLORS_AND_TYPE = {
  name: 'Custom',
  createdAt: 'x',
  updatedAt: 'x',
  editorConfigs: {},
  cssVariables: { '--radius-md': '4px' },
};
const BUTTON_CONFIG = { name: 'fancy', component: 'button', aliases: { '--button-radius': '99px' } };

/** A v1 pointer theme naming live colors and type, a live config, a component on
 *  default, and a config that has since been deleted. */
function seedPointerTheme() {
  writeJson(path.join(colorsAndTypeDir, 'custom.json'), COLORS_AND_TYPE);
  writeJson(path.join(configsDir, 'button', 'fancy.json'), BUTTON_CONFIG);
  writeJson(path.join(themesDir, 'look.json'), {
    name: 'look',
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    theme: 'custom',
    componentConfigs: { button: 'fancy', card: 'default', panel: 'deleted-config' },
  });
}

beforeEach(() => {
  tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'ltme-'));
  colorsAndTypeDir = path.join(tmp, 'colors-and-type');
  configsDir = path.join(tmp, 'component-configs');
  themesDir = path.join(tmp, 'themes');
  warnings = [];
});

afterEach(() => {
  fs.rmSync(tmp, { recursive: true, force: true });
});

describe('a tree still on the pre-working-set model', () => {
  const SHIPPED = '/* the look this consumer ships */\n';

  function seedLegacyTree() {
    seedPointerTheme();
    writeJson(path.join(colorsAndTypeDir, '_production.json'), { productionFile: 'custom' });
    fs.writeFileSync(path.join(tmp, 'tokens.generated.css'), SHIPPED);
  }

  it('holds the boot bake until migrate has named a production theme', () => {
    seedLegacyTree();

    boot();

    expect(fs.readFileSync(path.join(tmp, 'tokens.generated.css'), 'utf-8')).toBe(SHIPPED);
    expect(fs.existsSync(path.join(themesDir, '_production.json'))).toBe(false);
    expect(warnings.join('\n')).toContain('live-tokens migrate');
  });

  it('bakes anyway when there is no generated CSS to preserve', () => {
    seedLegacyTree();
    fs.rmSync(path.join(tmp, 'tokens.generated.css'));

    boot();

    expect(fs.existsSync(path.join(tmp, 'tokens.generated.css'))).toBe(true);
    expect(fs.existsSync(path.join(themesDir, '_production.json'))).toBe(false);
  });

  it('bakes as usual once the legacy pointers are gone', () => {
    seedLegacyTree();
    boot();

    fs.rmSync(path.join(colorsAndTypeDir, '_production.json'));
    boot();

    expect(fs.readFileSync(path.join(tmp, 'tokens.generated.css'), 'utf-8')).not.toBe(SHIPPED);
    expect(readJson(path.join(themesDir, '_production.json')).productionFile).toBe('default');
  });
});

describe('boot migration', () => {
  it('rewrites a v1 theme with the data it referenced', () => {
    seedPointerTheme();
    boot();

    const migrated = readJson(path.join(themesDir, 'look.json'));
    expect(migrated.schemaVersion).toBe(3);
    expect(migrated.colorsAndType.name).toBe('Custom');
    expect(migrated.componentConfigs.button.aliases).toEqual(BUTTON_CONFIG.aliases);
    expect(migrated.createdAt).toBe('2026-01-01T00:00:00.000Z');
  });

  it('omits a component pinned to default and drops one whose config is gone', () => {
    seedPointerTheme();
    boot();

    const migrated = readJson(path.join(themesDir, 'look.json'));
    expect(Object.keys(migrated.componentConfigs)).toEqual(['button']);
    expect(warnings.join('\n')).toContain('panel/deleted-config');
  });

  it('renames a v2 theme\'s embedded key', () => {
    const file = path.join(themesDir, 'v2.json');
    writeJson(file, {
      name: 'v2',
      createdAt: 'a',
      updatedAt: 'a',
      schemaVersion: 2,
      theme: COLORS_AND_TYPE,
      componentConfigs: {},
    });
    boot();
    const migrated = readJson(file);
    expect(migrated.schemaVersion).toBe(3);
    expect(migrated.colorsAndType).toEqual(COLORS_AND_TYPE);
    expect(migrated).not.toHaveProperty('theme');
  });

  it('leaves an already-encapsulated theme alone', () => {
    const file = path.join(themesDir, 'v3.json');
    const theme = {
      name: 'v3',
      createdAt: 'a',
      updatedAt: 'a',
      schemaVersion: 3,
      colorsAndType: COLORS_AND_TYPE,
      componentConfigs: {},
    };
    writeJson(file, theme);
    boot();
    expect(readJson(file)).toEqual(theme);
  });
});

describe('the default theme', () => {
  const defaultPath = () => path.join(themesDir, 'default.json');

  /** A component source dir the test owns, so removing a component is testable
   *  (the repo's own sources are re-derived on every boot). */
  function seedComponentSources(names: string[]): string {
    const dir = path.join(tmp, 'components');
    fs.mkdirSync(dir, { recursive: true });
    for (const name of names) {
      fs.writeFileSync(
        path.join(dir, `${name}.svelte`),
        `<div></div>\n<style>\n:global(:root) {\n  --${name.toLowerCase()}-radius: var(--radius-md);\n}\n</style>\n`,
      );
    }
    return dir;
  }

  it('materialises the full default set on boot', () => {
    boot();
    const theme = readJson(defaultPath());
    expect(theme.schemaVersion).toBe(3);
    expect(theme.name).toBe('Motion Proto');
    expect(Object.keys(theme.colorsAndType.editorConfigs).length).toBeGreaterThan(0);
    // Every component, including the ones sitting on pure defaults.
    expect(Object.keys(theme.componentConfigs).sort()).toEqual(
      fs.readdirSync(configsDir).sort(),
    );
    expect(theme.componentConfigs.button.aliases['--button-primary-radius']).toBe('--radius-xl');
  });

  it('rewrites nothing on a second boot', () => {
    boot();
    const first = readJson(defaultPath());
    const past = new Date(Date.now() - 60_000);
    fs.utimesSync(defaultPath(), past, past);

    boot();
    expect(readJson(defaultPath())).toEqual(first);
    expect(fs.statSync(defaultPath()).mtime.getTime()).toBe(past.getTime());
  });

  it('drops a component that no longer exists', () => {
    const srcDir = seedComponentSources(['Widget', 'Gizmo']);
    boot(srcDir);
    expect(Object.keys(readJson(defaultPath()).componentConfigs)).toContain('gizmo');

    fs.rmSync(path.join(srcDir, 'Gizmo.svelte'));
    boot(srcDir);
    const configs = Object.keys(readJson(defaultPath()).componentConfigs);
    expect(configs).toContain('widget');
    expect(configs).not.toContain('gizmo');
    // The orphaned config dir survives; the theme follows the sources.
    expect(fs.existsSync(path.join(configsDir, 'gizmo'))).toBe(true);
  });

  it('regenerates after deletion outside the file manager', () => {
    boot();
    const before = readJson(defaultPath());
    fs.rmSync(defaultPath());

    boot();
    const after = readJson(defaultPath());
    expect(after.componentConfigs).toEqual(before.componentConfigs);
    expect(after.colorsAndType).toEqual(before.colorsAndType);
  });

  it('DELETE stays 403', async () => {
    boot();
    const { status } = await request('DELETE', `${API}/themes/default`);
    expect(status).toBe(403);
    expect(fs.existsSync(defaultPath())).toBe(true);
  });
});

describe('read doors', () => {
  it('GET :name returns the materialised default set', async () => {
    boot();
    const { status, json } = await request('GET', `${API}/themes/default`);
    expect(status).toBe(200);
    expect(json.schemaVersion).toBe(3);
    expect(Object.keys(json.colorsAndType.editorConfigs).length).toBeGreaterThan(0);
    expect(json.componentConfigs.button.aliases['--button-primary-radius']).toBe('--radius-xl');
  });

  it('GET active returns the encapsulated form', async () => {
    seedPointerTheme();
    boot();
    await request('PUT', `${API}/themes/active`, { name: 'look' });

    const { json } = await request('GET', `${API}/themes/active`);
    expect(json._fileName).toBe('look');
    expect(json.colorsAndType.name).toBe('Custom');
  });

  it('PUT stores a pointer body in encapsulated form', async () => {
    seedPointerTheme();
    boot();
    const { status } = await request('PUT', `${API}/themes/copy`, {
      name: 'copy',
      theme: 'custom',
      componentConfigs: { button: 'fancy' },
    });
    expect(status).toBe(200);

    const written = readJson(path.join(themesDir, 'copy.json'));
    expect(written.schemaVersion).toBe(3);
    expect(written.colorsAndType.name).toBe('Custom');
    expect(written.componentConfigs.button.aliases).toEqual(BUTTON_CONFIG.aliases);
  });

  it('leaves a corrupt theme out of the list instead of failing the door', async () => {
    seedPointerTheme();
    boot();
    fs.writeFileSync(path.join(themesDir, 'broken.json'), '{ not json');

    const { status, json } = await request('GET', `${API}/themes`);
    expect(status).toBe(200);
    const names = json.files.map((f: any) => f.fileName);
    expect(names).toContain('look');
    expect(names).not.toContain('broken');
  });

  it('GET on a corrupt theme names the file rather than claiming it is missing', async () => {
    boot();
    fs.writeFileSync(path.join(themesDir, 'broken.json'), '{ not json');

    const { status, json } = await request('GET', `${API}/themes/broken`);
    expect(status).toBe(422);
    expect(json.error).toContain('broken');
    expect((await request('GET', `${API}/themes/absent`)).status).toBe(404);
  });
});

describe('the live layer doors', () => {
  it('serves the open theme\'s copy, named by the theme it belongs to', async () => {
    seedPointerTheme();
    boot();
    await request('PUT', `${API}/themes/look/apply`);
    await request('DELETE', `${API}/colors-and-type/working`);

    const { status, json } = await request('GET', `${API}/colors-and-type/active`);
    expect(status).toBe(200);
    expect(json.name).toBe('Custom');
    expect(json._fileName).toBe('look');
    expect(json._source).toBe('theme');
  });

  it('serves the buffer over the theme once one exists', async () => {
    seedPointerTheme();
    boot();
    await request('PUT', `${API}/themes/look/apply`);
    await request('PUT', `${API}/colors-and-type/working`, { ...COLORS_AND_TYPE, name: 'Edited' });

    const { json } = await request('GET', `${API}/colors-and-type/active`);
    expect(json.name).toBe('Edited');
    expect(json._fileName).toBe('look');
    expect(json._source).toBe('working');
  });

  it('falls back to the shipped default when the open theme is deleted outside the file manager', async () => {
    seedPointerTheme();
    boot();
    await request('PUT', `${API}/themes/look/apply`);
    await request('DELETE', `${API}/colors-and-type/working`);
    fs.rmSync(path.join(themesDir, 'look.json'));

    const { status, json } = await request('GET', `${API}/colors-and-type/active`);
    expect(status).toBe(200);
    expect(json._source).toBe('default');
    expect(Object.keys(json.editorConfigs).length).toBeGreaterThan(0);
  });

  it('resolves each component from the theme, the buffer, or its default', async () => {
    seedPointerTheme();
    boot();
    await request('PUT', `${API}/themes/look/apply`);
    await request('DELETE', `${API}/component-configs/button/working`);

    const button = await request('GET', `${API}/component-configs/button/active`);
    expect(button.json.aliases).toEqual(BUTTON_CONFIG.aliases);
    expect(button.json._source).toBe('theme');
    expect(button.json._fileName).toBe('look');

    const card = await request('GET', `${API}/component-configs/card/active`);
    expect(card.json._source).toBe('default');

    await request('PUT', `${API}/component-configs/card/working`, {
      name: 'bold',
      component: 'card',
      aliases: { '--card-radius': '0' },
    });
    expect((await request('GET', `${API}/component-configs/card/active`)).json._source).toBe('working');
  });

  it('lists every component with the source its live config comes from', async () => {
    seedPointerTheme();
    boot();
    await request('PUT', `${API}/themes/look/apply`);

    const { json } = await request('GET', `${API}/component-configs`);
    const byName = Object.fromEntries(json.components.map((c: any) => [c.name, c.source]));
    expect(byName.button).toBe('working');
    expect(byName.card).toBe('default');
  });
});

describe('deletability', () => {
  it('deleting a named colors-and-type preset touches nothing else', async () => {
    seedPointerTheme();
    boot();
    await request('PUT', `${API}/themes/look/apply`);
    const cssBefore = fs.readFileSync(path.join(tmp, 'tokens.generated.css'), 'utf-8');

    const { status } = await request('DELETE', `${API}/colors-and-type/custom`);
    expect(status).toBe(200);
    expect(fs.existsSync(path.join(colorsAndTypeDir, 'custom.json'))).toBe(false);
    // The look carries its colors by value, so the preset it was built from is
    // just a file the user can throw away.
    expect(readJson(path.join(themesDir, 'look.json')).colorsAndType.name).toBe('Custom');
    expect(readJson(path.join(colorsAndTypeDir, '_working.json')).name).toBe('Custom');
    expect(fs.readFileSync(path.join(tmp, 'tokens.generated.css'), 'utf-8')).toBe(cssBefore);
  });

  it('refuses the protected default in the vocabulary the UI speaks', async () => {
    boot();
    const del = await request('DELETE', `${API}/themes/default`);
    expect(del.status).toBe(403);
    expect(del.json.error).toBe('Cannot delete the default theme');

    const put = await request('PUT', `${API}/themes/default`, { name: 'Hacked' });
    expect(put.status).toBe(403);
    expect(put.json.error).toBe('Cannot overwrite the default theme');
  });

  it('refuses to delete the theme that is in production', async () => {
    seedPointerTheme();
    boot();
    await request('PUT', `${API}/themes/look/apply`);
    await request('PUT', `${API}/production`);

    const { status, json } = await request('DELETE', `${API}/themes/look`);
    expect(status).toBe(403);
    expect(json.code).toBe('PRODUCTION_THEME');
    expect(fs.existsSync(path.join(themesDir, 'look.json'))).toBe(true);
  });

  it('deleting the active theme heals the pointer to default and keeps the buffer', async () => {
    seedPointerTheme();
    boot();
    await request('PUT', `${API}/themes/look/apply`);

    const { status } = await request('DELETE', `${API}/themes/look`);
    expect(status).toBe(200);
    expect(fs.existsSync(path.join(themesDir, 'look.json'))).toBe(false);
    expect(readJson(path.join(themesDir, '_active.json')).activeFile).toBe('default');
    // The buffer outlives the document it came from: the user's live edits are
    // not the theme file's to take with it.
    expect(readJson(path.join(colorsAndTypeDir, '_working.json')).name).toBe('Custom');
  });
});

describe('apply', () => {
  /** Every `_working.json` the tree holds, as `<layer>` / `<comp>` ids. */
  function workingSet(): string[] {
    const found: string[] = [];
    if (fs.existsSync(path.join(colorsAndTypeDir, '_working.json'))) found.push('colors-and-type');
    if (fs.existsSync(configsDir)) {
      for (const comp of fs.readdirSync(configsDir)) {
        if (fs.existsSync(path.join(configsDir, comp, '_working.json'))) found.push(comp);
      }
    }
    return found.sort();
  }

  it('fills the buffers from the embedded data and opens the theme', async () => {
    seedPointerTheme();
    boot();
    const { status, json } = await request('PUT', `${API}/themes/look/apply`);
    expect(status).toBe(200);

    expect(readJson(path.join(colorsAndTypeDir, '_working.json')).name).toBe('Custom');
    expect(readJson(path.join(configsDir, 'button', '_working.json')).aliases).toEqual(
      BUTTON_CONFIG.aliases,
    );
    expect(json.theme._fileName).toBe('look');
    expect(json.colorsAndType._source).toBe('working');
    expect(json.componentConfigs.button._source).toBe('working');
    expect(json.componentConfigs.card._source).toBe('default');
    expect(readJson(path.join(themesDir, '_active.json')).activeFile).toBe('look');
  });

  it('writes no named file and leaves production alone', async () => {
    seedPointerTheme();
    boot();
    const cssBefore = fs.readFileSync(path.join(tmp, 'tokens.generated.css'), 'utf-8');
    const namedBefore = fs.readdirSync(colorsAndTypeDir).sort();

    await request('PUT', `${API}/themes/look/apply`);

    expect(fs.readdirSync(colorsAndTypeDir).filter((f) => !f.startsWith('_')).sort()).toEqual(
      namedBefore.filter((f) => !f.startsWith('_')),
    );
    expect(fs.existsSync(path.join(configsDir, 'button', 'look.json'))).toBe(false);
    expect(readJson(path.join(themesDir, '_production.json')).productionFile).toBe('default');
    expect(fs.readFileSync(path.join(tmp, 'tokens.generated.css'), 'utf-8')).toBe(cssBefore);
  });

  it('leaves exactly the second theme\'s buffers after applying two themes', async () => {
    seedPointerTheme();
    writeJson(path.join(themesDir, 'other.json'), {
      name: 'other',
      createdAt: 'a',
      updatedAt: 'a',
      schemaVersion: 3,
      colorsAndType: { ...COLORS_AND_TYPE, name: 'Other' },
      componentConfigs: { card: { name: 'bold', component: 'card', aliases: { '--card-radius': '0' } } },
    });
    boot();

    await request('PUT', `${API}/themes/look/apply`);
    expect(workingSet()).toEqual(['button', 'colors-and-type']);

    await request('PUT', `${API}/themes/other/apply`);
    expect(workingSet()).toEqual(['card', 'colors-and-type']);
    expect(readJson(path.join(colorsAndTypeDir, '_working.json')).name).toBe('Other');
  });

  it('leaves no buffer at all when the default theme is applied', async () => {
    seedPointerTheme();
    boot();
    await request('PUT', `${API}/themes/look/apply`);
    expect(workingSet().length).toBeGreaterThan(0);

    const { status, json } = await request('PUT', `${API}/themes/default/apply`);
    expect(status).toBe(200);
    expect(json.theme._fileName).toBe('default');
    expect(json.colorsAndType._source).toBe('theme');
    expect(workingSet()).toEqual([]);
    expect(fs.existsSync(path.join(colorsAndTypeDir, 'default.json'))).toBe(false);
  });

  it('reports embedded data for components this install does not have', async () => {
    writeJson(path.join(themesDir, 'ghosted.json'), {
      name: 'ghosted',
      createdAt: 'a',
      updatedAt: 'a',
      schemaVersion: 3,
      colorsAndType: COLORS_AND_TYPE,
      componentConfigs: { ghost: { name: 'ghost', aliases: {} } },
    });
    boot();
    const { json } = await request('PUT', `${API}/themes/ghosted/apply`);
    expect(json.skippedComponents).toEqual(['ghost']);
  });
});

describe('export and import', () => {
  it('exports the envelope alone', async () => {
    seedPointerTheme();
    boot();
    const { status, json } = await request('GET', `${API}/themes/look/export`);
    expect(status).toBe(200);
    expect(json.kind).toBe('theme-bundle');
    expect(json.schemaVersion).toBe(3);
    expect(json.manifest.colorsAndType.name).toBe('Custom');
    expect(json).not.toHaveProperty('theme');
    expect(json).not.toHaveProperty('componentConfigs');
  });

  it('imports a v2 bundle as one file, renamed past the collision', async () => {
    seedPointerTheme();
    boot();
    const exported = (await request('GET', `${API}/themes/look/export`)).json;
    const colorsAndTypeFilesBefore = fs.readdirSync(colorsAndTypeDir).length;

    const { status, json } = await request('POST', `${API}/themes/import`, exported);
    expect(status).toBe(200);
    expect(json.theme).toBe('look-2');
    expect(json.renames).toEqual({ 'theme:look': 'look-2' });
    expect(readJson(path.join(themesDir, 'look-2.json')).colorsAndType.name).toBe('Custom');
    expect(fs.readdirSync(colorsAndTypeDir).length).toBe(colorsAndTypeFilesBefore);
  });

  it('imports a v1 bundle by embedding what the bundle carries', async () => {
    boot();
    const { status, json } = await request('POST', `${API}/themes/import`, {
      kind: 'manifest-bundle',
      schemaVersion: 1,
      liveTokensVersion: '0.1.0',
      exportedAt: 'a',
      manifest: {
        name: 'shared',
        createdAt: 'a',
        updatedAt: 'a',
        theme: 'their-theme',
        componentConfigs: { button: 'fancy', card: 'default', panel: 'absent' },
      },
      theme: { ...COLORS_AND_TYPE, name: 'Their Theme' },
      componentConfigs: { 'button/fancy': BUTTON_CONFIG },
    });
    expect(status).toBe(200);
    expect(json.dropped).toEqual(['panel/absent']);

    const written = readJson(path.join(themesDir, 'shared.json'));
    expect(written.schemaVersion).toBe(3);
    expect(written.colorsAndType.name).toBe('Their Theme');
    expect(Object.keys(written.componentConfigs)).toEqual(['button']);
    expect(fs.existsSync(path.join(colorsAndTypeDir, 'their-theme.json'))).toBe(false);
    expect(fs.existsSync(path.join(configsDir, 'button', 'fancy.json'))).toBe(false);
  });

  it('rejects a bundle whose schemaVersion it does not know', async () => {
    boot();
    const { status } = await request('POST', `${API}/themes/import`, {
      kind: 'theme-bundle',
      schemaVersion: 99,
      manifest: {},
    });
    expect(status).toBe(400);
  });

  it('rejects a kind paired with a version no release wrote it at', async () => {
    boot();
    const bundle = { liveTokensVersion: '0.1.0', exportedAt: 'a', manifest: {} };
    expect(
      (await request('POST', `${API}/themes/import`, { ...bundle, kind: 'theme-bundle', schemaVersion: 1 })).status,
    ).toBe(400);
    expect(
      (await request('POST', `${API}/themes/import`, { ...bundle, kind: 'manifest-bundle', schemaVersion: 3 })).status,
    ).toBe(400);
  });
});

describe('adopting the whole look', () => {
  const generatedCss = () => fs.readFileSync(path.join(tmp, 'tokens.generated.css'), 'utf-8');

  async function bootWithOpenLook() {
    seedPointerTheme();
    boot();
    await request('PUT', `${API}/themes/look/apply`);
  }

  it('names the open theme as production and bakes its content', async () => {
    await bootWithOpenLook();

    const { status, json } = await request('PUT', `${API}/production`);
    expect(status).toBe(200);
    expect(json.productionTheme.fileName).toBe('look');
    expect(json.productionTheme.name).toBe('look');
    expect(readJson(path.join(themesDir, '_production.json')).productionFile).toBe('look');
    expect(generatedCss()).toContain('/* Production theme: look */');
    expect(generatedCss()).toContain('--button-radius: 99px');
  });

  it('bakes the theme, not the buffer: later edits wait for the next save', async () => {
    await bootWithOpenLook();
    await request('PUT', `${API}/production`);

    await request('PUT', `${API}/colors-and-type/working`, {
      ...COLORS_AND_TYPE,
      cssVariables: { '--radius-md': '99px' },
    });
    await request('PUT', `${API}/component-configs/button/working`, {
      name: 'edited',
      component: 'button',
      aliases: { '--button-radius': '1px' },
    });
    await request('PUT', `${API}/production`);

    expect(generatedCss()).not.toContain('--radius-md: 99px');
    expect(generatedCss()).toContain('--button-radius: 99px');
  });

  it('refuses to bake a production theme it cannot read', async () => {
    await bootWithOpenLook();
    await request('PUT', `${API}/production`);
    const baked = generatedCss();

    fs.writeFileSync(path.join(themesDir, 'look.json'), '{ not json');

    expect(() => boot()).toThrow(/look/);
    expect(generatedCss()).toBe(baked);
  });

  it('re-bakes what the theme now says once the client saves it', async () => {
    await bootWithOpenLook();
    await request('PUT', `${API}/production`);

    const look = readJson(path.join(themesDir, 'look.json'));
    look.componentConfigs.button.aliases = { '--button-radius': '1px' };
    await request('PUT', `${API}/themes/look`, look);
    await request('PUT', `${API}/production`);

    expect(generatedCss()).toContain('--button-radius: 1px');
  });

  it('writes the generated CSS once and no theme file at all', async () => {
    await bootWithOpenLook();

    const { written } = await trackWrites(() => request('PUT', `${API}/production`));

    expect(written.filter((p) => p === path.join(tmp, 'tokens.generated.css'))).toHaveLength(1);
    expect(written.filter((p) => p === path.join(themesDir, 'look.json'))).toEqual([]);
  });

  it('refuses while the protected Default theme is open, before any write', async () => {
    seedPointerTheme();
    boot();

    const { status, json } = await request('PUT', `${API}/production`);
    expect(status).toBe(409);
    expect(json.code).toBe('ACTIVE_IS_PROTECTED');
    expect(readJson(path.join(themesDir, '_production.json')).productionFile).toBe('default');
  });

  it('serves the production theme whole', async () => {
    await bootWithOpenLook();
    await request('PUT', `${API}/production`);

    const { status, json } = await request('GET', `${API}/themes/production`);
    expect(status).toBe(200);
    expect(json._fileName).toBe('look');
    expect(json.colorsAndType.name).toBe('Custom');
  });
});
