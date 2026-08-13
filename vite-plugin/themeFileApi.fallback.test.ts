/**
 * Integration tests for the package-default fallback, driven through the real
 * route table with mock req/res — no live Vite server. The plugin computes its
 * package data dir from this file's location (`../src/live-tokens/data`), which
 * in the live-tokens repo holds the shipped `themes/default.json` +
 * `manifests/default.json`. Pointing the plugin's local data dir at an empty
 * temp dir reproduces a fresh consumer: local has nothing, the package supplies
 * the defaults.
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

beforeEach(() => {
  tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'ltfb-'));
  themesDir = path.join(tmp, 'themes');
  manifestsDir = path.join(tmp, 'manifests');
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

  it('GET /themes/active resolves to the package default', async () => {
    const { status, json } = await request('GET', `${API}/themes/active`);
    expect(status).toBe(200);
    expect(json._fileName).toBe('default');
    expect(Object.keys(json.editorConfigs).length).toBeGreaterThan(0);
  });

  it('GET /manifests lists the package default', async () => {
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
    for (const preset of ['christmas', 'halloween', 'spring-meadow', 'royal-velvet']) {
      expect(names).toContain(preset);
    }
  });

  it('GET /themes/christmas resolves via the package fallback', async () => {
    const { status, json } = await request('GET', `${API}/themes/christmas`);
    expect(status).toBe(200);
    expect(Object.keys(json.editorConfigs).length).toBeGreaterThan(0);
  });

  it('DELETE /themes/christmas with no local copy → 403 PACKAGE_THEME', async () => {
    const { status, json } = await request('DELETE', `${API}/themes/christmas`);
    expect(status).toBe(403);
    expect(json.code).toBe('PACKAGE_THEME');
  });

  it('PUT then DELETE on a preset removes the local shadow and restores the shipped version', async () => {
    const put = await request('PUT', `${API}/themes/christmas`, { name: 'Christmas', cssVariables: {} });
    expect(put.status).toBe(200);
    expect(fs.existsSync(path.join(themesDir, 'christmas.json'))).toBe(true);

    const del = await request('DELETE', `${API}/themes/christmas`);
    expect(del.status).toBe(200);
    expect(fs.existsSync(path.join(themesDir, 'christmas.json'))).toBe(false);

    const { json } = await request('GET', `${API}/themes`);
    expect(json.files.map((f: any) => f.fileName)).toContain('christmas');
  });

  it('deleting a production shadow of a shipped preset keeps the pointer and resyncs', async () => {
    await request('PUT', `${API}/themes/christmas`, { name: 'Christmas Local', cssVariables: {} });
    fs.writeFileSync(path.join(themesDir, '_active.json'), JSON.stringify({ activeFile: 'christmas' }));
    fs.writeFileSync(path.join(themesDir, '_production.json'), JSON.stringify({ productionFile: 'christmas' }));

    const del = await request('DELETE', `${API}/themes/christmas`);
    expect(del.status).toBe(200);

    const active = await request('GET', `${API}/themes/active`);
    expect(active.json._fileName).toBe('christmas');
    const production = await request('GET', `${API}/themes/production`);
    expect(production.json.fileName).toBe('christmas');
    const generated = fs.readFileSync(path.join(tmp, 'tokens.generated.css'), 'utf-8');
    expect(generated).toContain('christmas');
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
