/**
 * Integration tests for the package-default fallback, driven through the real
 * route table with mock req/res — no live Vite server. The plugin computes its
 * package data dir from this file's location (`../src/live-tokens/data`), which
 * in the live-tokens repo holds the shipped `colors-and-type/default.json` (the default
 * theme is not shipped; boot materializes it locally). Pointing the plugin's
 * local data dir at an empty temp dir reproduces a fresh consumer: local has
 * nothing, the package supplies the colors and type and boot writes the rest.
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
let themesDir: string;
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
  let nextCalled = false;
  await mw(req, res, () => {
    nextCalled = true;
  });
  return { status: res.statusCode, json: res.payload ? JSON.parse(res.payload) : null, nextCalled };
}

function boot() {
  const plugin = themeFileApi({
    dataDir: tmp,
    colorsAndTypeDir,
    componentConfigsDir: path.join(tmp, 'component-configs'),
    themesDir,
    tokensCssPath: path.join(REPO_ROOT, 'src/system/styles/tokens.css'),
    fontsCssPath: path.join(tmp, 'fonts.css'),
    tokensGeneratedCssPath: path.join(tmp, 'tokens.generated.css'),
  });
  const captured: any[] = [];
  const server = {
    middlewares: { use: (fn: any) => captured.push(fn) },
    config: { logger: { warn: () => {} } },
  };
  (plugin as any).configureServer(server);
  mw = captured[0];
}

beforeEach(() => {
  tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'ltfb-'));
  colorsAndTypeDir = path.join(tmp, 'colors-and-type');
  themesDir = path.join(tmp, 'themes');
  boot();
});

afterEach(() => {
  fs.rmSync(tmp, { recursive: true, force: true });
});

describe('package-default fallback on a fresh consumer', () => {
  it('writes no local default colors and type on boot (seed writers removed)', () => {
    expect(fs.existsSync(path.join(colorsAndTypeDir, 'default.json'))).toBe(false);
  });

  it('materialises the default theme locally, carrying the package colors and type', () => {
    const theme = JSON.parse(
      fs.readFileSync(path.join(themesDir, 'default.json'), 'utf-8'),
    );
    expect(theme.schemaVersion).toBe(3);
    expect(Object.keys(theme.colorsAndType.editorConfigs).length).toBeGreaterThan(0);
    expect(Object.keys(theme.componentConfigs).length).toBeGreaterThan(0);
  });

  it('regenerates tokens.generated.css from the package default (palette not flattened)', () => {
    const css = fs.readFileSync(path.join(tmp, 'tokens.generated.css'), 'utf-8');
    expect(css).toContain(':root:root {');
    // A flattened/empty fallback would emit only the header comments.
    expect(css.split('\n').length).toBeGreaterThan(50);
  });

  it('GET /colors-and-type lists the package default', async () => {
    const { status, json } = await request('GET', `${API}/colors-and-type`);
    expect(status).toBe(200);
    expect(json.files.map((f: any) => f.fileName)).toContain('default');
  });

  it('GET /colors-and-type marks the package default isPackage', async () => {
    const { json } = await request('GET', `${API}/colors-and-type`);
    expect(json.files.find((f: any) => f.fileName === 'default').isPackage).toBe(true);
  });

  it('GET /colors-and-type/active resolves to the package default', async () => {
    const { status, json } = await request('GET', `${API}/colors-and-type/active`);
    expect(status).toBe(200);
    expect(json._fileName).toBe('default');
    expect(Object.keys(json.editorConfigs).length).toBeGreaterThan(0);
  });

  it('GET /themes lists the boot-materialized default', async () => {
    const { status, json } = await request('GET', `${API}/themes`);
    expect(status).toBe(200);
    expect(json.files.map((f: any) => f.fileName)).toContain('default');
  });

  it('PUT /colors-and-type/active default → 200 (existence check uses package fallback)', async () => {
    const { status } = await request('PUT', `${API}/colors-and-type/active`, { name: 'default' });
    expect(status).toBe(200);
  });

  it('PUT /themes/active default → 200', async () => {
    const { status } = await request('PUT', `${API}/themes/active`, { name: 'default' });
    expect(status).toBe(200);
  });

  it('PUT /component-configs/button/active default → 200', async () => {
    const { status } = await request('PUT', `${API}/component-configs/button/active`, { name: 'default' });
    expect(status).toBe(200);
  });

  it('PUT /colors-and-type/production default → 409 (past existence, blocked by protected theme)', async () => {
    const { status, json } = await request('PUT', `${API}/colors-and-type/production`, { name: 'default' });
    expect(status).toBe(409);
    expect(json.code).toBe('ACTIVE_IS_PROTECTED');
  });

  it('PUT /component-configs/button/production default → 409 (past existence)', async () => {
    const { status, json } = await request('PUT', `${API}/component-configs/button/production`, {
      name: 'default',
    });
    expect(status).toBe(409);
    expect(json.code).toBe('ACTIVE_IS_PROTECTED');
  });

  it('PUT /production → 409 while the Default look is active, 200 once the client forks it', async () => {
    await request('PUT', `${API}/colors-and-type/mine`, { name: 'Mine', cssVariables: {} });
    await request('PUT', `${API}/colors-and-type/active`, { name: 'mine' });

    const blocked = await request('PUT', `${API}/production`);
    expect(blocked.status).toBe(409);
    expect(blocked.json.code).toBe('ACTIVE_IS_PROTECTED');
    expect(
      JSON.parse(fs.readFileSync(path.join(colorsAndTypeDir, '_production.json'), 'utf-8')).productionFile,
    ).toBe('default');

    // The client's recovery: capture the live look under a name of its own,
    // make it active, retry.
    await request('PUT', `${API}/themes/my-theme`, {
      name: 'My Theme',
      theme: 'mine',
      componentConfigs: {},
    });
    await request('PUT', `${API}/themes/active`, { name: 'my-theme' });

    const { status, json } = await request('PUT', `${API}/production`);
    expect(status).toBe(200);
    expect(json.colorsAndType).toEqual({ fileName: 'mine', name: 'Mine' });
    expect(
      JSON.parse(fs.readFileSync(path.join(colorsAndTypeDir, '_production.json'), 'utf-8')).productionFile,
    ).toBe('mine');
  });

  it('PUT /themes/default/apply → 200 with resolved colors and type + component configs (headline restore path)', async () => {
    const { status, json } = await request('PUT', `${API}/themes/default/apply`);
    expect(status).toBe(200);
    expect(json.theme._fileName).toBe('default');
    expect(Object.keys(json.colorsAndType.editorConfigs).length).toBeGreaterThan(0);
    expect(Object.keys(json.componentConfigs).length).toBeGreaterThan(0);
    const css = fs.readFileSync(path.join(tmp, 'tokens.generated.css'), 'utf-8');
    expect(css).toContain(':root:root {');
  });

  it('PUT /colors-and-type/default → 403 (default is live from package, immutable)', async () => {
    const { status } = await request('PUT', `${API}/colors-and-type/default`, { name: 'hacked', cssVariables: {} });
    expect(status).toBe(403);
  });
});

describe('shipped preset colors and type on a fresh consumer', () => {
  it('GET /colors-and-type lists the shipped presets alongside default', async () => {
    const { json } = await request('GET', `${API}/colors-and-type`);
    const names = json.files.map((f: any) => f.fileName);
    for (const preset of ['sunset', 'halloween', 'spring-meadow', 'royal-velvet']) {
      expect(names).toContain(preset);
    }
  });

  it('GET /colors-and-type/sunset resolves via the package fallback', async () => {
    const { status, json } = await request('GET', `${API}/colors-and-type/sunset`);
    expect(status).toBe(200);
    expect(Object.keys(json.editorConfigs).length).toBeGreaterThan(0);
  });

  it('marks the presets isPackage until a local copy shadows them', async () => {
    const before = await request('GET', `${API}/colors-and-type`);
    expect(before.json.files.find((f: any) => f.fileName === 'ocean').isPackage).toBe(true);

    await request('PUT', `${API}/colors-and-type/ocean`, { name: 'Ocean Mine', cssVariables: {} });

    const after = await request('GET', `${API}/colors-and-type`);
    const row = after.json.files.find((f: any) => f.fileName === 'ocean');
    expect(row.isPackage).toBe(false);
    expect(row.name).toBe('Ocean Mine');
  });

  it('marks a local-only colors-and-type file isPackage false', async () => {
    await request('PUT', `${API}/colors-and-type/mine`, { name: 'Mine', cssVariables: {} });
    const { json } = await request('GET', `${API}/colors-and-type`);
    expect(json.files.find((f: any) => f.fileName === 'mine').isPackage).toBe(false);
  });

  it('DELETE /colors-and-type/sunset with no local copy → 403 PACKAGE_COLORS_AND_TYPE', async () => {
    const { status, json } = await request('DELETE', `${API}/colors-and-type/sunset`);
    expect(status).toBe(403);
    expect(json.code).toBe('PACKAGE_COLORS_AND_TYPE');
  });

  it('PUT then DELETE on a preset removes the local shadow and restores the shipped version', async () => {
    const put = await request('PUT', `${API}/colors-and-type/sunset`, { name: 'Sunset', cssVariables: {} });
    expect(put.status).toBe(200);
    expect(fs.existsSync(path.join(colorsAndTypeDir, 'sunset.json'))).toBe(true);

    const del = await request('DELETE', `${API}/colors-and-type/sunset`);
    expect(del.status).toBe(200);
    expect(fs.existsSync(path.join(colorsAndTypeDir, 'sunset.json'))).toBe(false);

    const { json } = await request('GET', `${API}/colors-and-type`);
    expect(json.files.map((f: any) => f.fileName)).toContain('sunset');
  });

  it('deleting a production shadow of a shipped preset keeps the pointer and resyncs', async () => {
    await request('PUT', `${API}/colors-and-type/sunset`, { name: 'Sunset Local', cssVariables: {} });
    fs.writeFileSync(path.join(colorsAndTypeDir, '_active.json'), JSON.stringify({ activeFile: 'sunset' }));
    fs.writeFileSync(path.join(colorsAndTypeDir, '_production.json'), JSON.stringify({ productionFile: 'sunset' }));

    const del = await request('DELETE', `${API}/colors-and-type/sunset`);
    expect(del.status).toBe(200);

    const active = await request('GET', `${API}/colors-and-type/active`);
    expect(active.json._fileName).toBe('sunset');
    const production = await request('GET', `${API}/colors-and-type/production`);
    expect(production.json.fileName).toBe('sunset');
    const generated = fs.readFileSync(path.join(tmp, 'tokens.generated.css'), 'utf-8');
    expect(generated).toContain('sunset');
  });

  it('deleting production colors and type with no shipped counterpart heals to default', async () => {
    await request('PUT', `${API}/colors-and-type/local-only`, { name: 'Local Only', cssVariables: {} });
    fs.writeFileSync(path.join(colorsAndTypeDir, '_active.json'), JSON.stringify({ activeFile: 'local-only' }));
    fs.writeFileSync(path.join(colorsAndTypeDir, '_production.json'), JSON.stringify({ productionFile: 'local-only' }));

    const del = await request('DELETE', `${API}/colors-and-type/local-only`);
    expect(del.status).toBe(200);

    const active = await request('GET', `${API}/colors-and-type/active`);
    expect(active.json._fileName).toBe('default');
    const production = await request('GET', `${API}/colors-and-type/production`);
    expect(production.json.fileName).toBe('default');
  });
});

/**
 * The package data dir is the repo's own `src/live-tokens/data`, so a shipped
 * example theme is staged by writing one there for the length of the suite.
 */
describe('a package-shipped theme on a fresh consumer', () => {
  const FIXTURE = 'package-fixture-look';
  const packageThemePath = path.join(
    REPO_ROOT,
    'src/live-tokens/data/themes',
    `${FIXTURE}.json`,
  );
  const localThemePath = () => path.join(themesDir, `${FIXTURE}.json`);
  const shipped = {
    name: 'Package Fixture',
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    schemaVersion: 3,
    colorsAndType: {
      name: 'Package Fixture Theme',
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z',
      editorConfigs: {},
      cssVariables: { '--radius-md': '4px' },
    },
    componentConfigs: {
      button: {
        name: 'package-fixture',
        component: 'button',
        aliases: { '--button-radius': '99px' },
      },
    },
  };

  beforeEach(() => {
    fs.writeFileSync(packageThemePath, JSON.stringify(shipped, null, 2));
    boot();
  });

  afterEach(() => {
    fs.rmSync(packageThemePath, { force: true });
  });

  it('boot materialises the local default and leaves the shipped file untouched', () => {
    const past = new Date(Date.now() - 60_000);
    fs.utimesSync(packageThemePath, past, past);
    boot();

    expect(fs.statSync(packageThemePath).mtime.getTime()).toBe(past.getTime());
    expect(JSON.parse(fs.readFileSync(packageThemePath, 'utf-8'))).toEqual(shipped);
    expect(fs.existsSync(localThemePath())).toBe(false);
    expect(fs.existsSync(path.join(themesDir, 'default.json'))).toBe(true);
  });

  it('GET /themes lists it alongside the local default', async () => {
    const { json } = await request('GET', `${API}/themes`);
    const row = json.files.find((f: any) => f.fileName === FIXTURE);
    expect(row.name).toBe('Package Fixture');
    expect(row.isProtected).toBe(false);
    expect(json.files.map((f: any) => f.fileName)).toContain('default');
  });

  it('GET :name serves the shipped theme as-is', async () => {
    const { status, json } = await request('GET', `${API}/themes/${FIXTURE}`);
    expect(status).toBe(200);
    expect(json.schemaVersion).toBe(3);
    expect(json.colorsAndType.name).toBe('Package Fixture Theme');
    expect(json.componentConfigs.button.aliases).toEqual({ '--button-radius': '99px' });
  });

  it('apply materialises the embedded data into local working files', async () => {
    const { status, json } = await request('PUT', `${API}/themes/${FIXTURE}/apply`);
    expect(status).toBe(200);
    expect(json.theme._fileName).toBe(FIXTURE);

    expect(JSON.parse(fs.readFileSync(path.join(colorsAndTypeDir, `${FIXTURE}.json`), 'utf-8')).name).toBe(
      'Package Fixture Theme',
    );
    expect(
      JSON.parse(
        fs.readFileSync(path.join(tmp, 'component-configs', 'button', `${FIXTURE}.json`), 'utf-8'),
      ).aliases,
    ).toEqual({ '--button-radius': '99px' });
    expect(
      JSON.parse(fs.readFileSync(path.join(themesDir, '_active.json'), 'utf-8')).activeFile,
    ).toBe(FIXTURE);
    expect(fs.readFileSync(path.join(tmp, 'tokens.generated.css'), 'utf-8')).toContain(
      '--radius-md: 4px',
    );
    expect(fs.existsSync(localThemePath())).toBe(false);
  });

  it('export serves the envelope with the shipped content', async () => {
    const { status, json } = await request('GET', `${API}/themes/${FIXTURE}/export`);
    expect(status).toBe(200);
    expect(json.kind).toBe('theme-bundle');
    expect(json.manifest.colorsAndType.name).toBe('Package Fixture Theme');
  });

  it('DELETE with no local copy → 403 PACKAGE_THEME', async () => {
    const { status, json } = await request('DELETE', `${API}/themes/${FIXTURE}`);
    expect(status).toBe(403);
    expect(json.code).toBe('PACKAGE_THEME');
    expect(fs.existsSync(packageThemePath)).toBe(true);
  });

  it('PUT then DELETE removes the shadow and restores the shipped version', async () => {
    const put = await request('PUT', `${API}/themes/${FIXTURE}`, {
      ...shipped,
      name: 'Local Fork',
    });
    expect(put.status).toBe(200);
    expect(fs.existsSync(localThemePath())).toBe(true);

    const del = await request('DELETE', `${API}/themes/${FIXTURE}`);
    expect(del.status).toBe(200);
    expect(fs.existsSync(localThemePath())).toBe(false);

    const { json } = await request('GET', `${API}/themes/${FIXTURE}`);
    expect(json.name).toBe('Package Fixture');
  });

  it('deleting the shadow of the active theme keeps the pointer on the restored version', async () => {
    await request('PUT', `${API}/themes/${FIXTURE}`, { ...shipped, name: 'Local Fork' });
    await request('PUT', `${API}/themes/active`, { name: FIXTURE });

    await request('DELETE', `${API}/themes/${FIXTURE}`);

    const active = await request('GET', `${API}/themes/active`);
    expect(active.json._fileName).toBe(FIXTURE);
    expect(active.json.name).toBe('Package Fixture');
  });

  it('adopting a theme while it is active forks it locally', async () => {
    await request('PUT', `${API}/themes/active`, { name: FIXTURE });
    await request('PUT', `${API}/colors-and-type/adopted`, { name: 'Adopted', cssVariables: {} });

    const { status } = await request('PUT', `${API}/colors-and-type/production`, { name: 'adopted' });
    expect(status).toBe(200);

    expect(JSON.parse(fs.readFileSync(localThemePath(), 'utf-8')).colorsAndType.name).toBe('Adopted');
    expect(JSON.parse(fs.readFileSync(packageThemePath, 'utf-8')).colorsAndType.name).toBe(
      'Package Fixture Theme',
    );
  });
});

describe('the library repo itself (local data dir IS the package dir)', () => {
  it('lists every colors and type file in the repo data dir as a package file', async () => {
    const repoData = path.join(REPO_ROOT, 'src/live-tokens/data');
    const plugin = themeFileApi({
      dataDir: repoData,
      colorsAndTypeDir: path.join(repoData, 'colors-and-type'),
      componentConfigsDir: path.join(repoData, 'component-configs'),
      themesDir: path.join(repoData, 'themes'),
      tokensCssPath: path.join(REPO_ROOT, 'src/system/styles/tokens.css'),
      fontsCssPath: path.join(tmp, 'fonts.css'),
      tokensGeneratedCssPath: path.join(tmp, 'tokens.generated.css'),
    });
    const captured: any[] = [];
    (plugin as any).configureServer({
      middlewares: { use: (fn: any) => captured.push(fn) },
      config: { logger: { warn: () => {} } },
    });
    const selfMw = captured[0];
    const req = makeReq('GET', `${API}/colors-and-type`);
    const res = makeRes();
    await selfMw(req, res, () => {});
    const byName = Object.fromEntries(
      JSON.parse(res.payload).files.map((f: any) => [f.fileName, f.isPackage]),
    );
    expect(byName['ocean']).toBe(true);
    expect(byName['default']).toBe(true);
    // The repo data dir holds only shipped files: a `false` here is a personal
    // file that would publish with the package.
    expect(Object.entries(byName).filter(([, isPackage]) => !isPackage)).toEqual([]);
  });
});
