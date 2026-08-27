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
import { THEME_SCHEMA_VERSION } from './themes/normalizeTheme';
import { SKETCH_STYLES } from '../src/editor/core/sketch/sketchStyles';

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
// Wave 2 of docs/plans/theme-completeness.md: `normalizeTheme` fills a
// component entry's missing alias keys from the install's real default on
// every read, so a fixture with a single overridden alias would come back
// carrying the other ~100 button keys too. Building it against the real
// default up front keeps the fill a no-op here and every downstream
// `toEqual(BUTTON_CONFIG.aliases)` assertion honest.
const BUTTON_DEFAULT_ALIASES = readJson(
  path.join(REPO_ROOT, 'src/live-tokens/data/component-configs/button/default.json'),
).aliases;
const BUTTON_CONFIG = {
  name: 'fancy',
  component: 'button',
  aliases: { ...BUTTON_DEFAULT_ALIASES, '--button-primary-radius': '99px' },
};

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

describe('boot reconciliation of 0.48 working copies', () => {
  it('removes buffers that exactly match the active theme', () => {
    seedPointerTheme();
    writeJson(path.join(themesDir, '_active.json'), { activeFile: 'look' });
    writeJson(path.join(colorsAndTypeDir, '_working.json'), COLORS_AND_TYPE);
    writeJson(path.join(configsDir, 'button', '_working.json'), BUTTON_CONFIG);

    boot();

    expect(fs.existsSync(path.join(colorsAndTypeDir, '_working.json'))).toBe(false);
    expect(fs.existsSync(path.join(configsDir, 'button', '_working.json'))).toBe(false);
    expect(readJson(path.join(themesDir, '_active.json')).activeFile).toBe('look');
  });

  it('preserves buffers that differ from the active theme', () => {
    seedPointerTheme();
    writeJson(path.join(themesDir, '_active.json'), { activeFile: 'look' });
    writeJson(path.join(colorsAndTypeDir, '_working.json'), {
      ...COLORS_AND_TYPE,
      name: 'Unsaved colors',
    });
    writeJson(path.join(configsDir, 'button', '_working.json'), {
      ...BUTTON_CONFIG,
      aliases: { '--button-primary-radius': '1px' },
    });

    boot();

    expect(readJson(path.join(colorsAndTypeDir, '_working.json')).name).toBe('Unsaved colors');
    expect(
      readJson(path.join(configsDir, 'button', '_working.json')).aliases['--button-primary-radius'],
    ).toBe('1px');
  });

  it('preserves every buffer when the active theme is unreadable', () => {
    writeJson(path.join(themesDir, '_active.json'), { activeFile: 'broken' });
    writeJson(path.join(colorsAndTypeDir, '_working.json'), COLORS_AND_TYPE);
    fs.mkdirSync(themesDir, { recursive: true });
    fs.writeFileSync(path.join(themesDir, 'broken.json'), '{ not json');

    boot();

    expect(readJson(path.join(colorsAndTypeDir, '_working.json'))).toEqual(COLORS_AND_TYPE);
  });
});

describe('boot migration', () => {
  it('rewrites a v1 theme with the data it referenced', () => {
    seedPointerTheme();
    boot();

    const migrated = readJson(path.join(themesDir, 'look.json'));
    expect(migrated.schemaVersion).toBe(THEME_SCHEMA_VERSION);
    expect(migrated.colorsAndType.name).toBe('Custom');
    expect(migrated.componentConfigs.button.aliases).toEqual(BUTTON_CONFIG.aliases);
    expect(migrated.createdAt).toBe('2026-01-01T00:00:00.000Z');
  });

  it('drops a config that is gone and reports it, but the completeness fill still gives every component a value', () => {
    seedPointerTheme();
    boot();

    const migrated = readJson(path.join(themesDir, 'look.json'));
    expect(warnings.join('\n')).toContain('panel/deleted-config');
    // `card` (pinned to 'default') and `panel` (its named config gone) both
    // start with no embedded entry from the pointer-resolution pass, but the
    // completeness fill (Wave 2, docs/plans/theme-completeness.md) fills
    // every installed component in from its local default afterward — the
    // same local `default.json` boot just materialised, not a second
    // derivation of it.
    expect(migrated.componentConfigs.button.aliases).toEqual(BUTTON_CONFIG.aliases);
    expect(migrated.componentConfigs.card.aliases).toEqual(readJson(path.join(configsDir, 'card', 'default.json')).aliases);
    expect(migrated.componentConfigs.panel.aliases).toEqual(
      readJson(path.join(configsDir, 'panel', 'default.json')).aliases,
    );
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
    expect(migrated.schemaVersion).toBe(THEME_SCHEMA_VERSION);
    expect(migrated.colorsAndType).toEqual(COLORS_AND_TYPE);
    expect(migrated).not.toHaveProperty('theme');
  });

  it('bumps and fills an already-encapsulated v3 theme, rather than leaving it alone', () => {
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

    const rewritten = readJson(file);
    expect(rewritten.schemaVersion).toBe(THEME_SCHEMA_VERSION);
    expect(rewritten.colorsAndType).toEqual(COLORS_AND_TYPE);
    // A v3 file no longer passes through untouched at v4: the completeness
    // fill (Wave 2, docs/plans/theme-completeness.md) gives an empty
    // `componentConfigs` every installed component, filled from its local
    // default, and the boot rewrite persists it (`migrated` is true the
    // moment the schema version differs).
    expect(Object.keys(rewritten.componentConfigs).sort()).toEqual(fs.readdirSync(configsDir).sort());
    expect(rewritten.componentConfigs.button.aliases).toEqual(BUTTON_DEFAULT_ALIASES);
  });
});

/** Both file kinds carry a schemaVersion, so nothing but the shape says which
 *  is which. The tree here is on the current layout (a real colors-and-type
 *  file is in place); one palette was left behind in `themes/`. */
describe('a colors-and-type file left among the themes', () => {
  const STALE = {
    name: 'Sunset',
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    schemaVersion: 1,
    editorConfigs: {},
    cssVariables: { '--surface-default': '#fff5e6' },
  };

  function seedStaleColorsFile() {
    writeJson(path.join(colorsAndTypeDir, 'custom.json'), COLORS_AND_TYPE);
    writeJson(path.join(themesDir, 'sunset.json'), STALE);
  }

  it('is left byte for byte alone by the boot migration', () => {
    seedStaleColorsFile();

    boot();

    expect(readJson(path.join(themesDir, 'sunset.json'))).toEqual(STALE);
    expect(warnings.join('\n')).toContain('not a theme');
  });

  /** `default.json` is the one theme boot rewrites on its own, and on a
   *  hand-moved tree it is the consumer's default palette. */
  it('survives the one file boot regenerates, which then refuses to bake', () => {
    writeJson(path.join(colorsAndTypeDir, 'custom.json'), COLORS_AND_TYPE);
    writeJson(path.join(themesDir, 'default.json'), STALE);

    expect(() => boot()).toThrow(/is a colors-and-type file, not a theme/);

    expect(readJson(path.join(themesDir, 'default.json'))).toEqual(STALE);
    expect(warnings.join('\n')).toContain('not a theme');
  });

  it('is left out of the theme list', async () => {
    seedStaleColorsFile();
    boot();

    const { json } = await request('GET', `${API}/themes`);

    expect(json.files.map((f: any) => f.fileName)).not.toContain('sunset');
  });

  it('is refused by the door that answers one theme', async () => {
    seedStaleColorsFile();
    boot();

    const { status, json } = await request('GET', `${API}/themes/sunset`);

    expect(status).toBe(422);
    expect(json.code).toBe('CORRUPT_THEME');
    expect(json.error).toContain('colors-and-type file, not a theme');
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
    expect(theme.schemaVersion).toBe(THEME_SCHEMA_VERSION);
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
    expect(json.schemaVersion).toBe(THEME_SCHEMA_VERSION);
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
    expect(written.schemaVersion).toBe(THEME_SCHEMA_VERSION);
    expect(written.colorsAndType.name).toBe('Custom');
    expect(written.componentConfigs.button.aliases).toEqual(BUTTON_CONFIG.aliases);
  });

  // Wave 1 of docs/plans/sketch-in-the-theme.md, invariant 1: `sketchStyle`
  // must be named on `EncapsulatedTheme`'s whitelist, or a PUT normalizes it
  // away and the next GET reads back a theme with no sketchstyle at all.
  it('PUT a theme carrying a sketchstyle, and GET it back with the dials intact', async () => {
    seedPointerTheme();
    boot();
    await request('PUT', `${API}/themes/sketched`, {
      name: 'sketched',
      theme: 'custom',
      componentConfigs: { button: 'fancy' },
      sketchStyle: SKETCH_STYLES.marker,
    });

    const { json } = await request('GET', `${API}/themes/sketched`);
    expect(json.sketchStyle).toEqual(SKETCH_STYLES.marker);
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

  it('resolves each component from the theme or a working override', async () => {
    seedPointerTheme();
    boot();
    await request('PUT', `${API}/themes/look/apply`);
    await request('DELETE', `${API}/component-configs/button/working`);

    const button = await request('GET', `${API}/component-configs/button/active`);
    expect(button.json.aliases).toEqual(BUTTON_CONFIG.aliases);
    expect(button.json._source).toBe('theme');
    expect(button.json._fileName).toBe('look');

    // `look.json` pointed `card` at its own default (a v1 delta encoding), so
    // it carried no embedded entry — but Wave 2's completeness fill
    // (docs/plans/theme-completeness.md) fills it in from the local default,
    // by value, the moment the theme is read. It resolves as `'theme'` too,
    // with the same values a bare default would have given it.
    const card = await request('GET', `${API}/component-configs/card/active`);
    expect(card.json._source).toBe('theme');
    expect(card.json.aliases).toEqual(readJson(path.join(configsDir, 'card', 'default.json')).aliases);

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
    expect(byName.button).toBe('theme');
    // `card` was on `look.json`'s default pointer, but the completeness fill
    // (Wave 2, docs/plans/theme-completeness.md) embeds it in the theme by
    // value on read, so it now resolves as `'theme'` too.
    expect(byName.card).toBe('theme');
  });

  it('resolves every component as theme-sourced once the fill has run, with no buffers open', async () => {
    seedPointerTheme();
    boot();
    await request('PUT', `${API}/themes/look/apply`);

    const { json: list } = await request('GET', `${API}/component-configs`);
    const names: string[] = list.components.map((c: any) => c.name);
    expect(names.length).toBe(25);

    for (const name of names) {
      const { json } = await request('GET', `${API}/component-configs/${name}/active`);
      expect(json._source).toBe('theme');
    }
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
    expect(fs.existsSync(path.join(colorsAndTypeDir, '_working.json'))).toBe(false);
    expect((await request('GET', `${API}/colors-and-type/active`)).json.name).toBe('Custom');
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

  it('deleting the active theme heals the pointer and materialises preserving deltas', async () => {
    seedPointerTheme();
    boot();
    await request('PUT', `${API}/themes/look/apply`);

    const { status } = await request('DELETE', `${API}/themes/look`);
    expect(status).toBe(200);
    expect(fs.existsSync(path.join(themesDir, 'look.json'))).toBe(false);
    expect(readJson(path.join(themesDir, '_active.json')).activeFile).toBe('default');
    // The theme supplied this content before deletion, so the server writes
    // only the deltas required to preserve that visible look over Default.
    expect(readJson(path.join(colorsAndTypeDir, '_working.json')).name).toBe('Custom');
    expect(readJson(path.join(configsDir, 'button', '_working.json')).aliases).toEqual(
      BUTTON_CONFIG.aliases,
    );
    expect((await request('GET', `${API}/colors-and-type/active`)).json.name).toBe('Custom');
    expect((await request('GET', `${API}/component-configs/button/active`)).json.aliases).toEqual(
      BUTTON_CONFIG.aliases,
    );
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

  it('clears the buffers and opens the theme through the active pointer', async () => {
    seedPointerTheme();
    boot();
    const { status, json } = await request('PUT', `${API}/themes/look/apply`);
    expect(status).toBe(200);

    expect(workingSet()).toEqual([]);
    expect(json.theme._fileName).toBe('look');
    expect(json.colorsAndType._source).toBe('theme');
    expect(json.componentConfigs.button._source).toBe('theme');
    // `look.json` pointed `card` at its default; the completeness fill
    // (Wave 2, docs/plans/theme-completeness.md) embeds it in the theme by
    // value on read, so it resolves as `'theme'` rather than `'default'`.
    expect(json.componentConfigs.card._source).toBe('theme');
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

  it('leaves no buffers after applying two themes', async () => {
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
    expect(workingSet()).toEqual([]);

    await request('PUT', `${API}/themes/other/apply`);
    expect(workingSet()).toEqual([]);
    expect((await request('GET', `${API}/colors-and-type/active`)).json.name).toBe('Other');
  });

  it('leaves no buffer at all when the default theme is applied', async () => {
    seedPointerTheme();
    boot();
    await request('PUT', `${API}/themes/look/apply`);
    expect(workingSet()).toEqual([]);

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

  it('does not allocate a buffer for content equal to the active theme layer', async () => {
    seedPointerTheme();
    boot();
    await request('PUT', `${API}/themes/look/apply`);

    await request('PUT', `${API}/colors-and-type/working`, COLORS_AND_TYPE);
    await request('PUT', `${API}/component-configs/button/working`, BUTTON_CONFIG);

    expect(workingSet()).toEqual([]);
  });

  it('removes matching working deltas after the active theme is saved', async () => {
    seedPointerTheme();
    boot();
    await request('PUT', `${API}/themes/look/apply`);
    const editedColors = { ...COLORS_AND_TYPE, name: 'Edited' };
    const editedButton = {
      ...BUTTON_CONFIG,
      aliases: { ...BUTTON_CONFIG.aliases, '--button-primary-radius': '1px' },
    };
    await request('PUT', `${API}/colors-and-type/working`, editedColors);
    await request('PUT', `${API}/component-configs/button/working`, editedButton);
    expect(workingSet()).toEqual(['button', 'colors-and-type']);

    const look = readJson(path.join(themesDir, 'look.json'));
    look.colorsAndType = editedColors;
    look.componentConfigs.button = editedButton;
    await request('PUT', `${API}/themes/look`, look);

    expect(workingSet()).toEqual([]);
    expect((await request('GET', `${API}/colors-and-type/active`)).json._source).toBe('theme');
    expect((await request('GET', `${API}/component-configs/button/active`)).json._source).toBe('theme');
  });
});

describe('export and import', () => {
  it('exports the envelope alone', async () => {
    seedPointerTheme();
    boot();
    const { status, json } = await request('GET', `${API}/themes/look/export`);
    expect(status).toBe(200);
    expect(json.kind).toBe('theme-bundle');
    expect(json.schemaVersion).toBe(THEME_SCHEMA_VERSION);
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

  // Wave 1 of docs/plans/sketch-in-the-theme.md, invariant 4: `ThemeBundle.manifest`
  // is a whole `Theme` and import runs it back through `normalizeTheme`, so a
  // bundle exported with a sketchstyle must land with one, at no extra cost
  // past the whitelist fix this wave makes.
  it('carries a sketchstyle through export and back in through import', async () => {
    seedPointerTheme();
    boot();
    await request('PUT', `${API}/themes/sketched`, {
      name: 'sketched',
      theme: 'custom',
      componentConfigs: { button: 'fancy' },
      sketchStyle: SKETCH_STYLES.marker,
    });
    const exported = (await request('GET', `${API}/themes/sketched/export`)).json;
    expect(exported.manifest.sketchStyle).toEqual(SKETCH_STYLES.marker);

    const { json } = await request('POST', `${API}/themes/import`, exported);
    const written = readJson(path.join(themesDir, `${json.theme}.json`));
    expect(written.sketchStyle).toEqual(SKETCH_STYLES.marker);
  });

  it('imports a v1 bundle by embedding what the bundle carries, filled complete from the local defaults', async () => {
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
    // A named ref ('absent') still resolves inside the bundle only, and a
    // stale one is still dropped and reported.
    expect(json.dropped).toEqual(['panel/absent']);

    const written = readJson(path.join(themesDir, 'shared.json'));
    expect(written.schemaVersion).toBe(THEME_SCHEMA_VERSION);
    expect(written.colorsAndType.name).toBe('Their Theme');
    // `button` keeps the bundle's own values — a named ref resolves inside
    // the bundle only, never against this install's copy.
    expect(written.componentConfigs.button.aliases).toEqual(BUTTON_CONFIG.aliases);
    // `card` (pinned to the v1 'default' pointer) and `panel` (its named ref
    // unresolved) both start with no embedded entry from the
    // pointer-resolution pass. The completeness fill (Wave 2,
    // docs/plans/theme-completeness.md) fills every installed component in
    // from the *local* default afterward: 'default' always meant this
    // install's own default, never something the bundle carries, so the fill
    // must not leave an imported theme silently incomplete (RJC 10).
    expect(Object.keys(written.componentConfigs).sort()).toEqual(fs.readdirSync(configsDir).sort());
    expect(written.componentConfigs.card.aliases).toEqual(
      readJson(path.join(configsDir, 'card', 'default.json')).aliases,
    );
    expect(written.componentConfigs.panel.aliases).toEqual(
      readJson(path.join(configsDir, 'panel', 'default.json')).aliases,
    );
    expect(fs.existsSync(path.join(colorsAndTypeDir, 'their-theme.json'))).toBe(false);
    expect(fs.existsSync(path.join(configsDir, 'button', 'fancy.json'))).toBe(false);
  });

  it('imports a v3 theme-bundle (pre-completeness), filled complete from the local defaults', async () => {
    boot();
    const { status, json } = await request('POST', `${API}/themes/import`, {
      kind: 'theme-bundle',
      schemaVersion: 3,
      liveTokensVersion: '0.30.0',
      exportedAt: 'a',
      manifest: {
        name: 'pre-completeness',
        createdAt: 'a',
        updatedAt: 'a',
        schemaVersion: 3,
        colorsAndType: { ...COLORS_AND_TYPE, name: 'Pre-Completeness' },
        componentConfigs: { button: BUTTON_CONFIG },
      },
    });
    expect(status).toBe(200);
    expect(json.dropped).toEqual([]);

    const written = readJson(path.join(themesDir, 'pre-completeness.json'));
    expect(written.schemaVersion).toBe(THEME_SCHEMA_VERSION);
    expect(written.colorsAndType.name).toBe('Pre-Completeness');
    // The one component the bundle embedded keeps its own values.
    expect(written.componentConfigs.button.aliases).toEqual(BUTTON_CONFIG.aliases);
    // Every other installed component is filled in from the local default:
    // a v3 bundle predates completeness (Wave 2), and import must not leave
    // it silently incomplete.
    expect(Object.keys(written.componentConfigs).sort()).toEqual(fs.readdirSync(configsDir).sort());
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
    expect(generatedCss()).toContain('--button-primary-radius: 99px');
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
      aliases: { '--button-primary-radius': '1px' },
    });
    await request('PUT', `${API}/production`);

    expect(generatedCss()).not.toContain('--radius-md: 99px');
    expect(generatedCss()).toContain('--button-primary-radius: 99px');
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
    look.componentConfigs.button.aliases = { '--button-primary-radius': '1px' };
    await request('PUT', `${API}/themes/look`, look);
    await request('PUT', `${API}/production`);

    expect(generatedCss()).toContain('--button-primary-radius: 1px');
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

// Wave 1 of docs/plans/theme-completeness.md: `normalizeTheme` migrates an
// embedded component config wherever a theme is read, so the bake — which
// reads `productionTheme.componentConfigs` straight off that normalized
// result — sees post-rename keys even for a theme written before the rename.
// This closes a real bug: pre-Wave-1, `aliasValuesEqual(undefined, staleValue)`
// is `false`, so a stale key read raw looked like a real override and baked
// verbatim into `tokens.generated.css` forever.
describe('component-config migration and orphan handling reach the bake', () => {
  const generatedCss = () => fs.readFileSync(path.join(tmp, 'tokens.generated.css'), 'utf-8');

  function seedProductionTheme(componentConfigs: Record<string, unknown>) {
    writeJson(path.join(themesDir, 'look.json'), {
      name: 'look',
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z',
      schemaVersion: 3,
      colorsAndType: COLORS_AND_TYPE,
      componentConfigs,
    });
    writeJson(path.join(themesDir, '_active.json'), { activeFile: 'look' });
    writeJson(path.join(themesDir, '_production.json'), { productionFile: 'look' });
  }

  it('bakes the post-rename key for an embedded config written before the rename', () => {
    // `--progressbar-track-bg` → `--progressbar-track-surface`
    // (2026-04-24-component-prefix-and-suffix-renames.ts). No
    // `componentSchemaVersion` on this theme, so it migrates off 0.
    seedProductionTheme({
      progressbar: {
        name: 'look',
        component: 'progressbar',
        aliases: { '--progressbar-track-bg': '--surface-accent' },
      },
    });

    boot();

    expect(generatedCss()).toContain('--progressbar-track-surface: var(--surface-accent);');
    expect(generatedCss()).not.toContain('--progressbar-track-bg');
  });

  it('skips an orphaned alias key the current default no longer declares, while a real override still emits', () => {
    seedProductionTheme({
      card: {
        name: 'look',
        component: 'card',
        aliases: {
          // Not declared by card/default.json under any name a migration
          // would recognise — a component-config edge case RJC 3 says the
          // *file* must still carry, but the bake must never emit.
          '--card-removed-thing': '--surface-accent',
          // A real, current override — must still bake.
          '--card-default-radius': '--radius-full',
        },
      },
    });

    boot();

    const css = generatedCss();
    expect(css).not.toContain('--card-removed-thing');
    expect(css).toContain('--card-default-radius: var(--radius-full);');
  });
});
