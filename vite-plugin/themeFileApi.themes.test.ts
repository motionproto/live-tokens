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

const COLORS_AND_TYPE = { name: 'Custom', createdAt: 'x', updatedAt: 'x', editorConfigs: {}, cssVariables: {} };
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
    expect(theme.name).toBe('Default');
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

describe('deletability', () => {
  it('deleting the production theme heals the pointer and resyncs the CSS', async () => {
    seedPointerTheme();
    boot();
    await request('PUT', `${API}/themes/look/apply`);
    expect(readJson(path.join(colorsAndTypeDir, '_production.json')).productionFile).toBe('look');

    const { status } = await request('DELETE', `${API}/colors-and-type/look`);
    expect(status).toBe(200);
    expect(fs.existsSync(path.join(colorsAndTypeDir, 'look.json'))).toBe(false);
    expect(readJson(path.join(colorsAndTypeDir, '_production.json')).productionFile).toBe('default');
    expect(readJson(path.join(colorsAndTypeDir, '_active.json')).activeFile).toBe('default');
    expect(fs.readFileSync(path.join(tmp, 'tokens.generated.css'), 'utf-8')).toContain(
      '/* Production theme: default */',
    );
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

  it('deleting the active theme heals the pointer to default', async () => {
    seedPointerTheme();
    boot();
    await request('PUT', `${API}/themes/active`, { name: 'look' });

    const { status } = await request('DELETE', `${API}/themes/look`);
    expect(status).toBe(200);
    expect(fs.existsSync(path.join(themesDir, 'look.json'))).toBe(false);
    expect(readJson(path.join(themesDir, '_active.json')).activeFile).toBe('default');
  });
});

describe('apply', () => {
  it('materialises the embedded data under the theme slug', async () => {
    seedPointerTheme();
    boot();
    const { status, json } = await request('PUT', `${API}/themes/look/apply`);
    expect(status).toBe(200);

    expect(readJson(path.join(colorsAndTypeDir, 'look.json')).name).toBe('Custom');
    expect(readJson(path.join(configsDir, 'button', 'look.json')).aliases).toEqual(
      BUTTON_CONFIG.aliases,
    );
    expect(json.theme._fileName).toBe('look');
    expect(readJson(path.join(colorsAndTypeDir, '_active.json')).activeFile).toBe('look');
    expect(readJson(path.join(colorsAndTypeDir, '_production.json')).productionFile).toBe('look');
    expect(readJson(path.join(configsDir, 'button', '_active.json')).activeFile).toBe('look');
    expect(readJson(path.join(configsDir, 'button', '_production.json')).productionFile).toBe('look');
    expect(readJson(path.join(themesDir, '_active.json')).activeFile).toBe('look');
  });

  it('resets components the theme does not carry to their defaults', async () => {
    seedPointerTheme();
    writeJson(path.join(configsDir, 'card', 'other.json'), { name: 'other', component: 'card' });
    boot();
    await request('PUT', `${API}/component-configs/card/active`, { name: 'other' });
    expect(readJson(path.join(configsDir, 'card', '_active.json')).activeFile).toBe('other');

    await request('PUT', `${API}/themes/look/apply`);
    expect(readJson(path.join(configsDir, 'card', '_active.json')).activeFile).toBe('default');
    expect(readJson(path.join(configsDir, 'card', '_production.json')).productionFile).toBe('default');
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

  it('applies pure defaults for the default theme and materialises nothing', async () => {
    seedPointerTheme();
    boot();
    await request('PUT', `${API}/themes/look/apply`);
    expect(readJson(path.join(configsDir, 'button', '_production.json')).productionFile).toBe('look');

    const { status, json } = await request('PUT', `${API}/themes/default/apply`);
    expect(status).toBe(200);
    expect(json.theme._fileName).toBe('default');
    expect(fs.existsSync(path.join(colorsAndTypeDir, 'default.json'))).toBe(false);
    expect(readJson(path.join(colorsAndTypeDir, '_production.json')).productionFile).toBe('default');
    expect(readJson(path.join(configsDir, 'button', '_production.json')).productionFile).toBe(
      'default',
    );
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

describe('adopt patches the active theme', () => {
  async function bootWithActiveLook() {
    seedPointerTheme();
    boot();
    await request('PUT', `${API}/themes/active`, { name: 'look' });
  }

  it('embeds the adopted config', async () => {
    await bootWithActiveLook();
    writeJson(path.join(configsDir, 'card', 'bold.json'), {
      name: 'bold',
      component: 'card',
      aliases: { '--card-radius': '0' },
    });

    const { status } = await request('PUT', `${API}/component-configs/card/production`, {
      name: 'bold',
    });
    expect(status).toBe(200);
    expect(readJson(path.join(themesDir, 'look.json')).componentConfigs.card.aliases).toEqual({
      '--card-radius': '0',
    });
  });

  it('drops the entry when a component is adopted back to default', async () => {
    await bootWithActiveLook();
    const { status } = await request('PUT', `${API}/component-configs/button/production`, {
      name: 'default',
    });
    expect(status).toBe(200);
    expect(readJson(path.join(themesDir, 'look.json')).componentConfigs).toEqual({});
  });

  it('embeds the adopted colors and type', async () => {
    await bootWithActiveLook();
    writeJson(path.join(colorsAndTypeDir, 'other.json'), { ...COLORS_AND_TYPE, name: 'Other' });

    const { status } = await request('PUT', `${API}/colors-and-type/production`, { name: 'other' });
    expect(status).toBe(200);
    expect(readJson(path.join(themesDir, 'look.json')).colorsAndType.name).toBe('Other');
  });
});

describe('adopting the whole look', () => {
  const generatedCss = () => path.join(tmp, 'tokens.generated.css');

  async function bootWithActiveLook() {
    seedPointerTheme();
    boot();
    await request('PUT', `${API}/themes/active`, { name: 'look' });
  }

  /** Move the colors and type and two components off what production runs. */
  async function driftFromProduction() {
    await request('PUT', `${API}/colors-and-type/active`, { name: 'custom' });
    await request('PUT', `${API}/component-configs/button/active`, { name: 'fancy' });
    writeJson(path.join(configsDir, 'card', 'bold.json'), {
      name: 'bold',
      component: 'card',
      aliases: { '--card-radius': '0' },
    });
    await request('PUT', `${API}/component-configs/card/active`, { name: 'bold' });
  }

  it('promotes the colors and type and every component behind it in one call', async () => {
    await bootWithActiveLook();
    await driftFromProduction();

    const { status, json } = await request('PUT', `${API}/production`);
    expect(status).toBe(200);
    expect(json.promoted).toBe(true);
    expect(json.colorsAndType).toEqual({ fileName: 'custom', name: 'Custom' });
    expect(json.components.sort()).toEqual(['button', 'card']);

    expect(readJson(path.join(colorsAndTypeDir, '_production.json')).productionFile).toBe('custom');
    expect(readJson(path.join(configsDir, 'button', '_production.json')).productionFile).toBe('fancy');
    expect(readJson(path.join(configsDir, 'card', '_production.json')).productionFile).toBe('bold');
    expect(readJson(path.join(colorsAndTypeDir, '_active.json')).activeFile).toBe('custom');
  });

  it('rebuilds the generated CSS once for the whole promotion', async () => {
    await bootWithActiveLook();
    await driftFromProduction();

    const { written } = await trackWrites(() => request('PUT', `${API}/production`));

    expect(written.filter((p) => p === generatedCss())).toHaveLength(1);
    expect(fs.readFileSync(generatedCss(), 'utf-8')).toContain('--button-radius: 99px');
  });

  it('writes the active look once, whatever it promoted', async () => {
    await bootWithActiveLook();
    await driftFromProduction();

    const { written } = await trackWrites(() => request('PUT', `${API}/production`));

    expect(written.filter((p) => p === path.join(themesDir, 'look.json'))).toHaveLength(1);
  });

  it('re-embeds the promoted slices and leaves the rest of the look alone', async () => {
    await bootWithActiveLook();
    writeJson(path.join(colorsAndTypeDir, 'other.json'), { ...COLORS_AND_TYPE, name: 'Other' });
    await request('PUT', `${API}/colors-and-type/active`, { name: 'other' });
    writeJson(path.join(configsDir, 'card', 'bold.json'), {
      name: 'bold',
      component: 'card',
      aliases: { '--card-radius': '0' },
    });
    await request('PUT', `${API}/component-configs/card/active`, { name: 'bold' });

    await request('PUT', `${API}/production`);

    const look = readJson(path.join(themesDir, 'look.json'));
    expect(look.colorsAndType.name).toBe('Other');
    expect(look.componentConfigs.card.aliases).toEqual({ '--card-radius': '0' });
    // The button never moved, so the adopt has nothing to say about it and the
    // config the look carries survives.
    expect(look.componentConfigs.button.aliases).toEqual({ '--button-radius': '99px' });
  });

  it('keeps a look entry for a component sitting on the default at both pointers', async () => {
    await bootWithActiveLook();
    // The button's active and production are both the default, and the look
    // carries a config for it regardless — that is what a saved look is for.
    writeJson(path.join(colorsAndTypeDir, 'other.json'), { ...COLORS_AND_TYPE, name: 'Other' });
    await request('PUT', `${API}/colors-and-type/active`, { name: 'other' });

    const { json } = await request('PUT', `${API}/production`);
    expect(json.components).toEqual([]);

    const look = readJson(path.join(themesDir, 'look.json'));
    expect(look.componentConfigs.button.aliases).toEqual({ '--button-radius': '99px' });
  });

  it('writes nothing when production already runs the look', async () => {
    await bootWithActiveLook();
    await request('PUT', `${API}/themes/look/apply`);
    const lookBefore = readJson(path.join(themesDir, 'look.json'));

    const { result, written } = await trackWrites(() => request('PUT', `${API}/production`));
    const { status, json } = result;

    expect(status).toBe(200);
    expect(json).toEqual({ ok: true, promoted: false, colorsAndType: null, components: [] });
    expect(written).toEqual([]);
    expect(readJson(path.join(themesDir, 'look.json'))).toEqual(lookBefore);
  });

  it('promotes the components alone when only they drifted', async () => {
    await bootWithActiveLook();
    await request('PUT', `${API}/themes/look/apply`);
    writeJson(path.join(configsDir, 'card', 'bold.json'), {
      name: 'bold',
      component: 'card',
      aliases: { '--card-radius': '0' },
    });
    await request('PUT', `${API}/component-configs/card/active`, { name: 'bold' });

    const { json } = await request('PUT', `${API}/production`);
    expect(json.colorsAndType).toBeNull();
    expect(json.components).toEqual(['card']);
    expect(readJson(path.join(colorsAndTypeDir, '_production.json')).productionFile).toBe('look');
  });

  it('refuses while the protected Default look is active, before any write', async () => {
    seedPointerTheme();
    boot();
    await request('PUT', `${API}/colors-and-type/active`, { name: 'custom' });

    const { status, json } = await request('PUT', `${API}/production`);
    expect(status).toBe(409);
    expect(json.code).toBe('ACTIVE_IS_PROTECTED');
    expect(readJson(path.join(colorsAndTypeDir, '_production.json')).productionFile).toBe('default');
  });
});
