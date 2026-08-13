/**
 * Integration tests for the package-default fallback, driven through the real
 * route table with mock req/res — no live Vite server. The plugin computes its
 * package data dir from this file's location (`../src/live-tokens/data`), which
 * in the live-tokens repo holds the shipped `themes/default.json` (the default
 * manifest is not shipped; boot materializes it locally). Pointing the plugin's
 * local data dir at an empty temp dir reproduces a fresh consumer: local has
 * nothing, the package supplies the theme and boot writes the rest.
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
let manifestsDir: string;
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
    themesDir,
    componentConfigsDir: path.join(tmp, 'component-configs'),
    manifestsDir,
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
  themesDir = path.join(tmp, 'themes');
  manifestsDir = path.join(tmp, 'manifests');
  boot();
});

afterEach(() => {
  fs.rmSync(tmp, { recursive: true, force: true });
});

describe('package-default fallback on a fresh consumer', () => {
  it('writes no local default theme on boot (seed writers removed)', () => {
    expect(fs.existsSync(path.join(themesDir, 'default.json'))).toBe(false);
  });

  it('materialises the default manifest locally, carrying the package theme', () => {
    const manifest = JSON.parse(
      fs.readFileSync(path.join(manifestsDir, 'default.json'), 'utf-8'),
    );
    expect(manifest.schemaVersion).toBe(2);
    expect(Object.keys(manifest.theme.editorConfigs).length).toBeGreaterThan(0);
    expect(Object.keys(manifest.componentConfigs).length).toBeGreaterThan(0);
  });

  it('regenerates tokens.generated.css from the package default (palette not flattened)', () => {
    const css = fs.readFileSync(path.join(tmp, 'tokens.generated.css'), 'utf-8');
    expect(css).toContain(':root:root {');
    // A flattened/empty fallback would emit only the header comments.
    expect(css.split('\n').length).toBeGreaterThan(50);
  });

  it('GET /themes lists the package default', async () => {
    const { status, json } = await request('GET', `${API}/themes`);
    expect(status).toBe(200);
    expect(json.files.map((f: any) => f.fileName)).toContain('default');
  });

  it('GET /themes marks the package default isPackage', async () => {
    const { json } = await request('GET', `${API}/themes`);
    expect(json.files.find((f: any) => f.fileName === 'default').isPackage).toBe(true);
  });

  it('GET /themes/active resolves to the package default', async () => {
    const { status, json } = await request('GET', `${API}/themes/active`);
    expect(status).toBe(200);
    expect(json._fileName).toBe('default');
    expect(Object.keys(json.editorConfigs).length).toBeGreaterThan(0);
  });

  it('GET /manifests lists the boot-materialized default', async () => {
    const { status, json } = await request('GET', `${API}/manifests`);
    expect(status).toBe(200);
    expect(json.files.map((f: any) => f.fileName)).toContain('default');
  });

  it('PUT /themes/active default → 200 (existence check uses package fallback)', async () => {
    const { status } = await request('PUT', `${API}/themes/active`, { name: 'default' });
    expect(status).toBe(200);
  });

  it('PUT /manifests/active default → 200', async () => {
    const { status } = await request('PUT', `${API}/manifests/active`, { name: 'default' });
    expect(status).toBe(200);
  });

  it('PUT /component-configs/button/active default → 200', async () => {
    const { status } = await request('PUT', `${API}/component-configs/button/active`, { name: 'default' });
    expect(status).toBe(200);
  });

  it('PUT /themes/production default → 409 (past existence, blocked by protected manifest)', async () => {
    const { status, json } = await request('PUT', `${API}/themes/production`, { name: 'default' });
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

  it('PUT /manifests/default/apply → 200 with resolved theme + component configs (headline restore path)', async () => {
    const { status, json } = await request('PUT', `${API}/manifests/default/apply`);
    expect(status).toBe(200);
    expect(json.theme._fileName).toBe('default');
    expect(Object.keys(json.theme.editorConfigs).length).toBeGreaterThan(0);
    expect(Object.keys(json.componentConfigs).length).toBeGreaterThan(0);
    const css = fs.readFileSync(path.join(tmp, 'tokens.generated.css'), 'utf-8');
    expect(css).toContain(':root:root {');
  });

  it('PUT /themes/default → 403 (default is live from package, immutable)', async () => {
    const { status } = await request('PUT', `${API}/themes/default`, { name: 'hacked', cssVariables: {} });
    expect(status).toBe(403);
  });
});

describe('shipped preset themes on a fresh consumer', () => {
  it('GET /themes lists the shipped presets alongside default', async () => {
    const { json } = await request('GET', `${API}/themes`);
    const names = json.files.map((f: any) => f.fileName);
    for (const preset of ['yuletide', 'halloween', 'spring-meadow', 'royal-velvet']) {
      expect(names).toContain(preset);
    }
  });

  it('GET /themes/yuletide resolves via the package fallback', async () => {
    const { status, json } = await request('GET', `${API}/themes/yuletide`);
    expect(status).toBe(200);
    expect(Object.keys(json.editorConfigs).length).toBeGreaterThan(0);
  });

  it('marks the presets isPackage until a local copy shadows them', async () => {
    const before = await request('GET', `${API}/themes`);
    expect(before.json.files.find((f: any) => f.fileName === 'ocean').isPackage).toBe(true);

    await request('PUT', `${API}/themes/ocean`, { name: 'Ocean Mine', cssVariables: {} });

    const after = await request('GET', `${API}/themes`);
    const row = after.json.files.find((f: any) => f.fileName === 'ocean');
    expect(row.isPackage).toBe(false);
    expect(row.name).toBe('Ocean Mine');
  });

  it('marks a local-only theme isPackage false', async () => {
    await request('PUT', `${API}/themes/mine`, { name: 'Mine', cssVariables: {} });
    const { json } = await request('GET', `${API}/themes`);
    expect(json.files.find((f: any) => f.fileName === 'mine').isPackage).toBe(false);
  });

  it('DELETE /themes/yuletide with no local copy → 403 PACKAGE_THEME', async () => {
    const { status, json } = await request('DELETE', `${API}/themes/yuletide`);
    expect(status).toBe(403);
    expect(json.code).toBe('PACKAGE_THEME');
  });

  it('PUT then DELETE on a preset removes the local shadow and restores the shipped version', async () => {
    const put = await request('PUT', `${API}/themes/yuletide`, { name: 'Yuletide', cssVariables: {} });
    expect(put.status).toBe(200);
    expect(fs.existsSync(path.join(themesDir, 'yuletide.json'))).toBe(true);

    const del = await request('DELETE', `${API}/themes/yuletide`);
    expect(del.status).toBe(200);
    expect(fs.existsSync(path.join(themesDir, 'yuletide.json'))).toBe(false);

    const { json } = await request('GET', `${API}/themes`);
    expect(json.files.map((f: any) => f.fileName)).toContain('yuletide');
  });

  it('deleting a production shadow of a shipped preset keeps the pointer and resyncs', async () => {
    await request('PUT', `${API}/themes/yuletide`, { name: 'Yuletide Local', cssVariables: {} });
    fs.writeFileSync(path.join(themesDir, '_active.json'), JSON.stringify({ activeFile: 'yuletide' }));
    fs.writeFileSync(path.join(themesDir, '_production.json'), JSON.stringify({ productionFile: 'yuletide' }));

    const del = await request('DELETE', `${API}/themes/yuletide`);
    expect(del.status).toBe(200);

    const active = await request('GET', `${API}/themes/active`);
    expect(active.json._fileName).toBe('yuletide');
    const production = await request('GET', `${API}/themes/production`);
    expect(production.json.fileName).toBe('yuletide');
    const generated = fs.readFileSync(path.join(tmp, 'tokens.generated.css'), 'utf-8');
    expect(generated).toContain('yuletide');
  });

  it('deleting a production theme with no shipped counterpart heals to default', async () => {
    await request('PUT', `${API}/themes/local-only`, { name: 'Local Only', cssVariables: {} });
    fs.writeFileSync(path.join(themesDir, '_active.json'), JSON.stringify({ activeFile: 'local-only' }));
    fs.writeFileSync(path.join(themesDir, '_production.json'), JSON.stringify({ productionFile: 'local-only' }));

    const del = await request('DELETE', `${API}/themes/local-only`);
    expect(del.status).toBe(200);

    const active = await request('GET', `${API}/themes/active`);
    expect(active.json._fileName).toBe('default');
    const production = await request('GET', `${API}/themes/production`);
    expect(production.json.fileName).toBe('default');
  });
});

/**
 * The package data dir is the repo's own `src/live-tokens/data`, so a shipped
 * example manifest is staged by writing one there for the length of the suite.
 */
describe('a package-shipped manifest on a fresh consumer', () => {
  const FIXTURE = 'package-fixture-look';
  const packageManifestPath = path.join(
    REPO_ROOT,
    'src/live-tokens/data/manifests',
    `${FIXTURE}.json`,
  );
  const localManifestPath = () => path.join(manifestsDir, `${FIXTURE}.json`);
  const shipped = {
    name: 'Package Fixture',
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    schemaVersion: 2,
    theme: {
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
    fs.writeFileSync(packageManifestPath, JSON.stringify(shipped, null, 2));
    boot();
  });

  afterEach(() => {
    fs.rmSync(packageManifestPath, { force: true });
  });

  it('boot materialises the local default and leaves the shipped file untouched', () => {
    const past = new Date(Date.now() - 60_000);
    fs.utimesSync(packageManifestPath, past, past);
    boot();

    expect(fs.statSync(packageManifestPath).mtime.getTime()).toBe(past.getTime());
    expect(JSON.parse(fs.readFileSync(packageManifestPath, 'utf-8'))).toEqual(shipped);
    expect(fs.existsSync(localManifestPath())).toBe(false);
    expect(fs.existsSync(path.join(manifestsDir, 'default.json'))).toBe(true);
  });

  it('GET /manifests lists it alongside the local default', async () => {
    const { json } = await request('GET', `${API}/manifests`);
    const row = json.files.find((f: any) => f.fileName === FIXTURE);
    expect(row.name).toBe('Package Fixture');
    expect(row.isProtected).toBe(false);
    expect(json.files.map((f: any) => f.fileName)).toContain('default');
  });

  it('GET :name serves the shipped v2 manifest as-is', async () => {
    const { status, json } = await request('GET', `${API}/manifests/${FIXTURE}`);
    expect(status).toBe(200);
    expect(json.schemaVersion).toBe(2);
    expect(json.theme.name).toBe('Package Fixture Theme');
    expect(json.componentConfigs.button.aliases).toEqual({ '--button-radius': '99px' });
  });

  it('apply materialises the embedded data into local working files', async () => {
    const { status, json } = await request('PUT', `${API}/manifests/${FIXTURE}/apply`);
    expect(status).toBe(200);
    expect(json.theme._fileName).toBe(FIXTURE);

    expect(JSON.parse(fs.readFileSync(path.join(themesDir, `${FIXTURE}.json`), 'utf-8')).name).toBe(
      'Package Fixture Theme',
    );
    expect(
      JSON.parse(
        fs.readFileSync(path.join(tmp, 'component-configs', 'button', `${FIXTURE}.json`), 'utf-8'),
      ).aliases,
    ).toEqual({ '--button-radius': '99px' });
    expect(
      JSON.parse(fs.readFileSync(path.join(manifestsDir, '_active.json'), 'utf-8')).activeFile,
    ).toBe(FIXTURE);
    expect(fs.readFileSync(path.join(tmp, 'tokens.generated.css'), 'utf-8')).toContain(
      '--radius-md: 4px',
    );
    expect(fs.existsSync(localManifestPath())).toBe(false);
  });

  it('export serves the envelope with the shipped content', async () => {
    const { status, json } = await request('GET', `${API}/manifests/${FIXTURE}/export`);
    expect(status).toBe(200);
    expect(json.kind).toBe('manifest-bundle');
    expect(json.manifest.theme.name).toBe('Package Fixture Theme');
  });

  it('DELETE with no local copy → 403 PACKAGE_MANIFEST', async () => {
    const { status, json } = await request('DELETE', `${API}/manifests/${FIXTURE}`);
    expect(status).toBe(403);
    expect(json.code).toBe('PACKAGE_MANIFEST');
    expect(fs.existsSync(packageManifestPath)).toBe(true);
  });

  it('PUT then DELETE removes the shadow and restores the shipped version', async () => {
    const put = await request('PUT', `${API}/manifests/${FIXTURE}`, {
      ...shipped,
      name: 'Local Fork',
    });
    expect(put.status).toBe(200);
    expect(fs.existsSync(localManifestPath())).toBe(true);

    const del = await request('DELETE', `${API}/manifests/${FIXTURE}`);
    expect(del.status).toBe(200);
    expect(fs.existsSync(localManifestPath())).toBe(false);

    const { json } = await request('GET', `${API}/manifests/${FIXTURE}`);
    expect(json.name).toBe('Package Fixture');
  });

  it('deleting the shadow of the active manifest keeps the pointer on the restored version', async () => {
    await request('PUT', `${API}/manifests/${FIXTURE}`, { ...shipped, name: 'Local Fork' });
    await request('PUT', `${API}/manifests/active`, { name: FIXTURE });

    await request('DELETE', `${API}/manifests/${FIXTURE}`);

    const active = await request('GET', `${API}/manifests/active`);
    expect(active.json._fileName).toBe(FIXTURE);
    expect(active.json.name).toBe('Package Fixture');
  });

  it('adopting a theme while it is active forks it locally', async () => {
    await request('PUT', `${API}/manifests/active`, { name: FIXTURE });
    await request('PUT', `${API}/themes/adopted`, { name: 'Adopted', cssVariables: {} });

    const { status } = await request('PUT', `${API}/themes/production`, { name: 'adopted' });
    expect(status).toBe(200);

    expect(JSON.parse(fs.readFileSync(localManifestPath(), 'utf-8')).theme.name).toBe('Adopted');
    expect(JSON.parse(fs.readFileSync(packageManifestPath, 'utf-8')).theme.name).toBe(
      'Package Fixture Theme',
    );
  });
});

describe('the library repo itself (local data dir IS the package dir)', () => {
  it('lists shipped themes as package files and user themes as local ones', async () => {
    const repoData = path.join(REPO_ROOT, 'src/live-tokens/data');
    const plugin = themeFileApi({
      dataDir: repoData,
      themesDir: path.join(repoData, 'themes'),
      componentConfigsDir: path.join(repoData, 'component-configs'),
      manifestsDir: path.join(repoData, 'manifests'),
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
    const req = makeReq('GET', `${API}/themes`);
    const res = makeRes();
    await selfMw(req, res, () => {});
    const byName = Object.fromEntries(
      JSON.parse(res.payload).files.map((f: any) => [f.fileName, f.isPackage]),
    );
    expect(byName['ocean']).toBe(true);
    expect(byName['default']).toBe(true);
    expect(byName['my-theme']).toBe(false);
  });
});
