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
  it('writes no local default theme or manifest on boot (seed writers removed)', () => {
    expect(fs.existsSync(path.join(themesDir, 'default.json'))).toBe(false);
    expect(fs.existsSync(path.join(manifestsDir, 'default.json'))).toBe(false);
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
