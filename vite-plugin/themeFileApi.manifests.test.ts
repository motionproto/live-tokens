/**
 * Integration tests for encapsulated manifests, driven through the real route
 * table with mock req/res — no live Vite server. Local data lives in a temp dir
 * (a fresh consumer); the package data dir resolves to this repo's own
 * `src/live-tokens/data`, which supplies the default theme and manifest.
 *
 * Each test seeds files first and calls `boot()` itself, because the boot-time
 * v1 → v2 migration is one of the things under test.
 */
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { themeFileApi } from './themeFileApi';

const API = '/api/live-tokens';
const REPO_ROOT = process.cwd();

let tmp: string;
let themesDir: string;
let configsDir: string;
let manifestsDir: string;
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
    themesDir,
    componentConfigsDir: configsDir,
    manifestsDir,
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

const THEME = { name: 'Custom', createdAt: 'x', updatedAt: 'x', editorConfigs: {}, cssVariables: {} };
const BUTTON_CONFIG = { name: 'fancy', component: 'button', aliases: { '--button-radius': '99px' } };

/** A v1 pointer manifest naming a live theme, a live config, a component on
 *  default, and a config that has since been deleted. */
function seedPointerManifest() {
  writeJson(path.join(themesDir, 'custom.json'), THEME);
  writeJson(path.join(configsDir, 'button', 'fancy.json'), BUTTON_CONFIG);
  writeJson(path.join(manifestsDir, 'look.json'), {
    name: 'look',
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    theme: 'custom',
    componentConfigs: { button: 'fancy', card: 'default', panel: 'deleted-config' },
  });
}

beforeEach(() => {
  tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'ltme-'));
  themesDir = path.join(tmp, 'themes');
  configsDir = path.join(tmp, 'component-configs');
  manifestsDir = path.join(tmp, 'manifests');
  warnings = [];
});

afterEach(() => {
  fs.rmSync(tmp, { recursive: true, force: true });
});

describe('boot migration', () => {
  it('rewrites a v1 manifest with the data it referenced', () => {
    seedPointerManifest();
    boot();

    const migrated = readJson(path.join(manifestsDir, 'look.json'));
    expect(migrated.schemaVersion).toBe(2);
    expect(migrated.theme.name).toBe('Custom');
    expect(migrated.componentConfigs.button.aliases).toEqual(BUTTON_CONFIG.aliases);
    expect(migrated.createdAt).toBe('2026-01-01T00:00:00.000Z');
  });

  it('omits a component pinned to default and drops one whose config is gone', () => {
    seedPointerManifest();
    boot();

    const migrated = readJson(path.join(manifestsDir, 'look.json'));
    expect(Object.keys(migrated.componentConfigs)).toEqual(['button']);
    expect(warnings.join('\n')).toContain('panel/deleted-config');
  });

  it('leaves an already-encapsulated manifest alone', () => {
    const file = path.join(manifestsDir, 'v2.json');
    const manifest = {
      name: 'v2',
      createdAt: 'a',
      updatedAt: 'a',
      schemaVersion: 2,
      theme: THEME,
      componentConfigs: {},
    };
    writeJson(file, manifest);
    boot();
    expect(readJson(file)).toEqual(manifest);
  });
});

describe('the default manifest', () => {
  const defaultPath = () => path.join(manifestsDir, 'default.json');

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
    const manifest = readJson(defaultPath());
    expect(manifest.schemaVersion).toBe(2);
    expect(manifest.name).toBe('Default');
    expect(Object.keys(manifest.theme.editorConfigs).length).toBeGreaterThan(0);
    // Every component, including the ones sitting on pure defaults.
    expect(Object.keys(manifest.componentConfigs).sort()).toEqual(
      fs.readdirSync(configsDir).sort(),
    );
    expect(manifest.componentConfigs.button.aliases['--button-primary-radius']).toBe('--radius-xl');
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
    // The orphaned config dir survives; the manifest follows the sources.
    expect(fs.existsSync(path.join(configsDir, 'gizmo'))).toBe(true);
  });

  it('regenerates after deletion outside the file manager', () => {
    boot();
    const before = readJson(defaultPath());
    fs.rmSync(defaultPath());

    boot();
    const after = readJson(defaultPath());
    expect(after.componentConfigs).toEqual(before.componentConfigs);
    expect(after.theme).toEqual(before.theme);
  });

  it('DELETE stays 403', async () => {
    boot();
    const { status } = await request('DELETE', `${API}/manifests/default`);
    expect(status).toBe(403);
    expect(fs.existsSync(defaultPath())).toBe(true);
  });
});

describe('read doors', () => {
  it('GET :name returns the materialised default set', async () => {
    boot();
    const { status, json } = await request('GET', `${API}/manifests/default`);
    expect(status).toBe(200);
    expect(json.schemaVersion).toBe(2);
    expect(Object.keys(json.theme.editorConfigs).length).toBeGreaterThan(0);
    expect(json.componentConfigs.button.aliases['--button-primary-radius']).toBe('--radius-xl');
  });

  it('GET active returns the encapsulated form', async () => {
    seedPointerManifest();
    boot();
    await request('PUT', `${API}/manifests/active`, { name: 'look' });

    const { json } = await request('GET', `${API}/manifests/active`);
    expect(json._fileName).toBe('look');
    expect(json.theme.name).toBe('Custom');
  });

  it('PUT stores a pointer body in encapsulated form', async () => {
    seedPointerManifest();
    boot();
    const { status } = await request('PUT', `${API}/manifests/copy`, {
      name: 'copy',
      theme: 'custom',
      componentConfigs: { button: 'fancy' },
    });
    expect(status).toBe(200);

    const written = readJson(path.join(manifestsDir, 'copy.json'));
    expect(written.schemaVersion).toBe(2);
    expect(written.theme.name).toBe('Custom');
    expect(written.componentConfigs.button.aliases).toEqual(BUTTON_CONFIG.aliases);
  });

  it('leaves a corrupt manifest out of the list instead of failing the door', async () => {
    seedPointerManifest();
    boot();
    fs.writeFileSync(path.join(manifestsDir, 'broken.json'), '{ not json');

    const { status, json } = await request('GET', `${API}/manifests`);
    expect(status).toBe(200);
    const names = json.files.map((f: any) => f.fileName);
    expect(names).toContain('look');
    expect(names).not.toContain('broken');
  });

  it('GET on a corrupt manifest names the file rather than claiming it is missing', async () => {
    boot();
    fs.writeFileSync(path.join(manifestsDir, 'broken.json'), '{ not json');

    const { status, json } = await request('GET', `${API}/manifests/broken`);
    expect(status).toBe(422);
    expect(json.error).toContain('broken');
    expect((await request('GET', `${API}/manifests/absent`)).status).toBe(404);
  });
});

describe('deletability', () => {
  it('deleting the production theme heals the pointer and resyncs the CSS', async () => {
    seedPointerManifest();
    boot();
    await request('PUT', `${API}/manifests/look/apply`);
    expect(readJson(path.join(themesDir, '_production.json')).productionFile).toBe('look');

    const { status } = await request('DELETE', `${API}/themes/look`);
    expect(status).toBe(200);
    expect(fs.existsSync(path.join(themesDir, 'look.json'))).toBe(false);
    expect(readJson(path.join(themesDir, '_production.json')).productionFile).toBe('default');
    expect(readJson(path.join(themesDir, '_active.json')).activeFile).toBe('default');
    expect(fs.readFileSync(path.join(tmp, 'tokens.generated.css'), 'utf-8')).toContain(
      '/* Production theme: default */',
    );
  });

  it('refuses the protected default in the vocabulary the UI speaks', async () => {
    boot();
    const del = await request('DELETE', `${API}/manifests/default`);
    expect(del.status).toBe(403);
    expect(del.json.error).toBe('Cannot delete the default theme');

    const put = await request('PUT', `${API}/manifests/default`, { name: 'Hacked' });
    expect(put.status).toBe(403);
    expect(put.json.error).toBe('Cannot overwrite the default theme');
  });

  it('deleting the active manifest heals the pointer to default', async () => {
    seedPointerManifest();
    boot();
    await request('PUT', `${API}/manifests/active`, { name: 'look' });

    const { status } = await request('DELETE', `${API}/manifests/look`);
    expect(status).toBe(200);
    expect(fs.existsSync(path.join(manifestsDir, 'look.json'))).toBe(false);
    expect(readJson(path.join(manifestsDir, '_active.json')).activeFile).toBe('default');
  });
});

describe('apply', () => {
  it('materialises the embedded data under the manifest slug', async () => {
    seedPointerManifest();
    boot();
    const { status, json } = await request('PUT', `${API}/manifests/look/apply`);
    expect(status).toBe(200);

    expect(readJson(path.join(themesDir, 'look.json')).name).toBe('Custom');
    expect(readJson(path.join(configsDir, 'button', 'look.json')).aliases).toEqual(
      BUTTON_CONFIG.aliases,
    );
    expect(json.theme._fileName).toBe('look');
    expect(readJson(path.join(themesDir, '_active.json')).activeFile).toBe('look');
    expect(readJson(path.join(themesDir, '_production.json')).productionFile).toBe('look');
    expect(readJson(path.join(configsDir, 'button', '_active.json')).activeFile).toBe('look');
    expect(readJson(path.join(configsDir, 'button', '_production.json')).productionFile).toBe('look');
    expect(readJson(path.join(manifestsDir, '_active.json')).activeFile).toBe('look');
  });

  it('resets components the manifest does not carry to their defaults', async () => {
    seedPointerManifest();
    writeJson(path.join(configsDir, 'card', 'other.json'), { name: 'other', component: 'card' });
    boot();
    await request('PUT', `${API}/component-configs/card/active`, { name: 'other' });
    expect(readJson(path.join(configsDir, 'card', '_active.json')).activeFile).toBe('other');

    await request('PUT', `${API}/manifests/look/apply`);
    expect(readJson(path.join(configsDir, 'card', '_active.json')).activeFile).toBe('default');
    expect(readJson(path.join(configsDir, 'card', '_production.json')).productionFile).toBe('default');
  });

  it('reports embedded data for components this install does not have', async () => {
    writeJson(path.join(manifestsDir, 'ghosted.json'), {
      name: 'ghosted',
      createdAt: 'a',
      updatedAt: 'a',
      schemaVersion: 2,
      theme: THEME,
      componentConfigs: { ghost: { name: 'ghost', aliases: {} } },
    });
    boot();
    const { json } = await request('PUT', `${API}/manifests/ghosted/apply`);
    expect(json.skippedComponents).toEqual(['ghost']);
  });

  it('applies pure defaults for the default manifest and materialises nothing', async () => {
    seedPointerManifest();
    boot();
    await request('PUT', `${API}/manifests/look/apply`);
    expect(readJson(path.join(configsDir, 'button', '_production.json')).productionFile).toBe('look');

    const { status, json } = await request('PUT', `${API}/manifests/default/apply`);
    expect(status).toBe(200);
    expect(json.theme._fileName).toBe('default');
    expect(fs.existsSync(path.join(themesDir, 'default.json'))).toBe(false);
    expect(readJson(path.join(themesDir, '_production.json')).productionFile).toBe('default');
    expect(readJson(path.join(configsDir, 'button', '_production.json')).productionFile).toBe(
      'default',
    );
  });
});

describe('export and import', () => {
  it('exports the envelope alone', async () => {
    seedPointerManifest();
    boot();
    const { status, json } = await request('GET', `${API}/manifests/look/export`);
    expect(status).toBe(200);
    expect(json.kind).toBe('manifest-bundle');
    expect(json.schemaVersion).toBe(2);
    expect(json.manifest.theme.name).toBe('Custom');
    expect(json).not.toHaveProperty('theme');
    expect(json).not.toHaveProperty('componentConfigs');
  });

  it('imports a v2 bundle as one file, renamed past the collision', async () => {
    seedPointerManifest();
    boot();
    const exported = (await request('GET', `${API}/manifests/look/export`)).json;
    const themeFilesBefore = fs.readdirSync(themesDir).length;

    const { status, json } = await request('POST', `${API}/manifests/import`, exported);
    expect(status).toBe(200);
    expect(json.manifest).toBe('look-2');
    expect(json.renames).toEqual({ 'manifest:look': 'look-2' });
    expect(readJson(path.join(manifestsDir, 'look-2.json')).theme.name).toBe('Custom');
    expect(fs.readdirSync(themesDir).length).toBe(themeFilesBefore);
  });

  it('imports a v1 bundle by embedding what the bundle carries', async () => {
    boot();
    const { status, json } = await request('POST', `${API}/manifests/import`, {
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
      theme: { ...THEME, name: 'Their Theme' },
      componentConfigs: { 'button/fancy': BUTTON_CONFIG },
    });
    expect(status).toBe(200);
    expect(json.dropped).toEqual(['panel/absent']);

    const written = readJson(path.join(manifestsDir, 'shared.json'));
    expect(written.schemaVersion).toBe(2);
    expect(written.theme.name).toBe('Their Theme');
    expect(Object.keys(written.componentConfigs)).toEqual(['button']);
    expect(fs.existsSync(path.join(themesDir, 'their-theme.json'))).toBe(false);
    expect(fs.existsSync(path.join(configsDir, 'button', 'fancy.json'))).toBe(false);
  });

  it('rejects a bundle whose schemaVersion it does not know', async () => {
    boot();
    const { status } = await request('POST', `${API}/manifests/import`, {
      kind: 'manifest-bundle',
      schemaVersion: 99,
      manifest: {},
    });
    expect(status).toBe(400);
  });
});

describe('adopt patches the active manifest', () => {
  async function bootWithActiveLook() {
    seedPointerManifest();
    boot();
    await request('PUT', `${API}/manifests/active`, { name: 'look' });
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
    expect(readJson(path.join(manifestsDir, 'look.json')).componentConfigs.card.aliases).toEqual({
      '--card-radius': '0',
    });
  });

  it('drops the entry when a component is adopted back to default', async () => {
    await bootWithActiveLook();
    const { status } = await request('PUT', `${API}/component-configs/button/production`, {
      name: 'default',
    });
    expect(status).toBe(200);
    expect(readJson(path.join(manifestsDir, 'look.json')).componentConfigs).toEqual({});
  });

  it('embeds the adopted theme', async () => {
    await bootWithActiveLook();
    writeJson(path.join(themesDir, 'other.json'), { ...THEME, name: 'Other' });

    const { status } = await request('PUT', `${API}/themes/production`, { name: 'other' });
    expect(status).toBe(200);
    expect(readJson(path.join(manifestsDir, 'look.json')).theme.name).toBe('Other');
  });
});

describe('adopting the whole look', () => {
  const generatedCss = () => path.join(tmp, 'tokens.generated.css');

  async function bootWithActiveLook() {
    seedPointerManifest();
    boot();
    await request('PUT', `${API}/manifests/active`, { name: 'look' });
  }

  /** Move the theme and two components off what production runs. */
  async function driftFromProduction() {
    await request('PUT', `${API}/themes/active`, { name: 'custom' });
    await request('PUT', `${API}/component-configs/button/active`, { name: 'fancy' });
    writeJson(path.join(configsDir, 'card', 'bold.json'), {
      name: 'bold',
      component: 'card',
      aliases: { '--card-radius': '0' },
    });
    await request('PUT', `${API}/component-configs/card/active`, { name: 'bold' });
  }

  it('promotes the theme and every component behind it in one call', async () => {
    await bootWithActiveLook();
    await driftFromProduction();

    const { status, json } = await request('PUT', `${API}/production`);
    expect(status).toBe(200);
    expect(json.promoted).toBe(true);
    expect(json.theme).toEqual({ fileName: 'custom', name: 'Custom' });
    expect(json.components.sort()).toEqual(['button', 'card']);

    expect(readJson(path.join(themesDir, '_production.json')).productionFile).toBe('custom');
    expect(readJson(path.join(configsDir, 'button', '_production.json')).productionFile).toBe('fancy');
    expect(readJson(path.join(configsDir, 'card', '_production.json')).productionFile).toBe('bold');
    expect(readJson(path.join(themesDir, '_active.json')).activeFile).toBe('custom');
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

    expect(written.filter((p) => p === path.join(manifestsDir, 'look.json'))).toHaveLength(1);
  });

  it('re-embeds the promoted slices and leaves the rest of the look alone', async () => {
    await bootWithActiveLook();
    writeJson(path.join(themesDir, 'other.json'), { ...THEME, name: 'Other' });
    await request('PUT', `${API}/themes/active`, { name: 'other' });
    writeJson(path.join(configsDir, 'card', 'bold.json'), {
      name: 'bold',
      component: 'card',
      aliases: { '--card-radius': '0' },
    });
    await request('PUT', `${API}/component-configs/card/active`, { name: 'bold' });

    await request('PUT', `${API}/production`);

    const look = readJson(path.join(manifestsDir, 'look.json'));
    expect(look.theme.name).toBe('Other');
    expect(look.componentConfigs.card.aliases).toEqual({ '--card-radius': '0' });
    // The button never moved, so the adopt has nothing to say about it and the
    // config the look carries survives.
    expect(look.componentConfigs.button.aliases).toEqual({ '--button-radius': '99px' });
  });

  it('keeps a look entry for a component sitting on the default at both pointers', async () => {
    await bootWithActiveLook();
    // The button's active and production are both the default, and the look
    // carries a config for it regardless — that is what a saved look is for.
    writeJson(path.join(themesDir, 'other.json'), { ...THEME, name: 'Other' });
    await request('PUT', `${API}/themes/active`, { name: 'other' });

    const { json } = await request('PUT', `${API}/production`);
    expect(json.components).toEqual([]);

    const look = readJson(path.join(manifestsDir, 'look.json'));
    expect(look.componentConfigs.button.aliases).toEqual({ '--button-radius': '99px' });
  });

  it('writes nothing when production already runs the look', async () => {
    await bootWithActiveLook();
    await request('PUT', `${API}/manifests/look/apply`);
    const lookBefore = readJson(path.join(manifestsDir, 'look.json'));

    const { result, written } = await trackWrites(() => request('PUT', `${API}/production`));
    const { status, json } = result;

    expect(status).toBe(200);
    expect(json).toEqual({ ok: true, promoted: false, theme: null, components: [] });
    expect(written).toEqual([]);
    expect(readJson(path.join(manifestsDir, 'look.json'))).toEqual(lookBefore);
  });

  it('promotes the components alone when only they drifted', async () => {
    await bootWithActiveLook();
    await request('PUT', `${API}/manifests/look/apply`);
    writeJson(path.join(configsDir, 'card', 'bold.json'), {
      name: 'bold',
      component: 'card',
      aliases: { '--card-radius': '0' },
    });
    await request('PUT', `${API}/component-configs/card/active`, { name: 'bold' });

    const { json } = await request('PUT', `${API}/production`);
    expect(json.theme).toBeNull();
    expect(json.components).toEqual(['card']);
    expect(readJson(path.join(themesDir, '_production.json')).productionFile).toBe('look');
  });

  it('refuses while the protected Default look is active, before any write', async () => {
    seedPointerManifest();
    boot();
    await request('PUT', `${API}/themes/active`, { name: 'custom' });

    const { status, json } = await request('PUT', `${API}/production`);
    expect(status).toBe(409);
    expect(json.code).toBe('ACTIVE_IS_PROTECTED');
    expect(readJson(path.join(themesDir, '_production.json')).productionFile).toBe('default');
  });
});
