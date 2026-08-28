/**
 * The `sketch-styles` doors. Driven through the real route table with mock
 * req/res, local data in a temp dir — same harness as the other themeFileApi
 * suites.
 */
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { themeFileApi } from './themeFileApi';

const API = '/api/live-tokens';
const REPO_ROOT = process.cwd();

let tmp: string;
let componentsDir: string;
let plugin: any;
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

const SETTINGS = { mode: 'layered', strokeWidth: 2.25, jitterX: 4, label: 'Blueprint' };

beforeEach(() => {
  tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'ltsk-'));
  componentsDir = path.join(tmp, 'components');
  fs.mkdirSync(componentsDir, { recursive: true });
  plugin = themeFileApi({
    dataDir: tmp,
    colorsAndTypeDir: path.join(tmp, 'colors-and-type'),
    componentConfigsDir: path.join(tmp, 'component-configs'),
    themesDir: path.join(tmp, 'themes'),
    componentsSrcDir: componentsDir,
    tokensCssPath: path.join(REPO_ROOT, 'src/system/styles/tokens.css'),
    fontsCssPath: path.join(tmp, 'fonts.css'),
    tokensGeneratedCssPath: path.join(tmp, 'tokens.generated.css'),
  });
  const captured: any[] = [];
  plugin.configureServer({
    middlewares: { use: (fn: any) => captured.push(fn) },
    config: { logger: { warn: () => {} } },
  });
  mw = captured[0];
});

afterEach(() => {
  fs.rmSync(tmp, { recursive: true, force: true });
});

describe('sketchstyles', () => {
  it('lists nothing before anything is saved', async () => {
    const res = await request('GET', `${API}/sketch-styles`);
    expect(res.status).toBe(200);
    expect(res.json.files).toEqual([]);
  });

  it('round-trips a saved sketchstyle and lists its display name', async () => {
    const put = await request('PUT', `${API}/sketch-styles/blueprint`, {
      name: 'Blueprint',
      settings: SETTINGS,
    });
    expect(put.status).toBe(200);

    const got = await request('GET', `${API}/sketch-styles/blueprint`);
    expect(got.json.settings).toEqual(SETTINGS);
    expect(got.json._fileName).toBe('blueprint');

    const list = await request('GET', `${API}/sketch-styles`);
    expect(list.json.files).toHaveLength(1);
    expect(list.json.files[0]).toMatchObject({ name: 'Blueprint', fileName: 'blueprint' });
  });

  it('keeps createdAt when a sketchstyle is overwritten', async () => {
    await request('PUT', `${API}/sketch-styles/blueprint`, { name: 'Blueprint', settings: SETTINGS });
    const first = await request('GET', `${API}/sketch-styles/blueprint`);

    await request('PUT', `${API}/sketch-styles/blueprint`, {
      name: 'Blueprint',
      settings: { ...SETTINGS, strokeWidth: 4 },
    });
    const second = await request('GET', `${API}/sketch-styles/blueprint`);

    expect(second.json.createdAt).toBe(first.json.createdAt);
    expect(second.json.settings.strokeWidth).toBe(4);
  });

  it('refuses a body with no settings', async () => {
    const res = await request('PUT', `${API}/sketch-styles/blueprint`, { name: 'Blueprint' });
    expect(res.status).toBe(400);
    expect(fs.existsSync(path.join(tmp, 'sketch-styles/blueprint.json'))).toBe(false);
  });

  it('refuses a reserved name', async () => {
    const res = await request('PUT', `${API}/sketch-styles/_working`, {
      name: 'x',
      settings: SETTINGS,
    });
    expect(res.status).toBe(400);
    expect(res.json.code).toBe('RESERVED_NAME');
  });

  it('deletes a sketchstyle', async () => {
    await request('PUT', `${API}/sketch-styles/blueprint`, { name: 'Blueprint', settings: SETTINGS });
    const del = await request('DELETE', `${API}/sketch-styles/blueprint`);
    expect(del.status).toBe(200);

    const list = await request('GET', `${API}/sketch-styles`);
    expect(list.json.files).toEqual([]);
    expect((await request('GET', `${API}/sketch-styles/blueprint`)).status).toBe(404);
  });

  it('rejects POST to the collection', async () => {
    const res = await request('POST', `${API}/sketch-styles`, {});
    expect(res.status).toBe(405);
  });
});

// Saving used to reload the page. A project registers this directory with
// `import.meta.glob` — `create` writes that into `main.ts` — so writing a file
// in it invalidates the entry module, and Vite answers an entry it cannot hot
// update with a full reload. The Sketchstyle view the save came from went with
// it, mid-edit.
describe('the dev watcher', () => {
  it('lets the editor write its own JSON without reloading the page', () => {
    const ignored = plugin.config().server.watch.ignored[0];

    expect(ignored(path.join(tmp, 'sketch-styles', 'mine.json'))).toBe(true);
    expect(ignored(path.join(tmp, 'themes', 'brand.json'))).toBe(true);
    expect(ignored(path.join(tmp, '_working.json'))).toBe(true);
  });

  it('keeps watching the stylesheets the page really imports', () => {
    const ignored = plugin.config().server.watch.ignored[0];

    // CSS updates in place, so these cost no reload and carry an Adopt to the
    // page. A source file is nobody else's business.
    expect(ignored(path.join(tmp, 'tokens.generated.css'))).toBe(false);
    expect(ignored(path.join(tmp, 'fonts.css'))).toBe(false);
    expect(ignored(path.join(REPO_ROOT, 'src/app/main.ts'))).toBe(false);
    // A directory whose name merely starts the same way is not the data one.
    expect(ignored(`${tmp}-elsewhere/brand.json`)).toBe(false);
  });
});
