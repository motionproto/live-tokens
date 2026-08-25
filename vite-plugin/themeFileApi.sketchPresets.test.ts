/**
 * The `sketch-presets` doors. Driven through the real route table with mock
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

const SETTINGS = { mode: 'layered', strokeWidth: 2.25, fillDx: 4, label: 'Blueprint' };

beforeEach(() => {
  tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'ltsk-'));
  componentsDir = path.join(tmp, 'components');
  fs.mkdirSync(componentsDir, { recursive: true });
  const plugin = themeFileApi({
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
  (plugin as any).configureServer({
    middlewares: { use: (fn: any) => captured.push(fn) },
    config: { logger: { warn: () => {} } },
  });
  mw = captured[0];
});

afterEach(() => {
  fs.rmSync(tmp, { recursive: true, force: true });
});

describe('sketch presets', () => {
  it('lists nothing before anything is saved', async () => {
    const res = await request('GET', `${API}/sketch-presets`);
    expect(res.status).toBe(200);
    expect(res.json.files).toEqual([]);
  });

  it('round-trips a saved preset and lists its display name', async () => {
    const put = await request('PUT', `${API}/sketch-presets/blueprint`, {
      name: 'Blueprint',
      settings: SETTINGS,
    });
    expect(put.status).toBe(200);

    const got = await request('GET', `${API}/sketch-presets/blueprint`);
    expect(got.json.settings).toEqual(SETTINGS);
    expect(got.json._fileName).toBe('blueprint');

    const list = await request('GET', `${API}/sketch-presets`);
    expect(list.json.files).toHaveLength(1);
    expect(list.json.files[0]).toMatchObject({ name: 'Blueprint', fileName: 'blueprint' });
  });

  it('keeps createdAt when a preset is overwritten', async () => {
    await request('PUT', `${API}/sketch-presets/blueprint`, { name: 'Blueprint', settings: SETTINGS });
    const first = await request('GET', `${API}/sketch-presets/blueprint`);

    await request('PUT', `${API}/sketch-presets/blueprint`, {
      name: 'Blueprint',
      settings: { ...SETTINGS, strokeWidth: 4 },
    });
    const second = await request('GET', `${API}/sketch-presets/blueprint`);

    expect(second.json.createdAt).toBe(first.json.createdAt);
    expect(second.json.settings.strokeWidth).toBe(4);
  });

  it('refuses a body with no settings', async () => {
    const res = await request('PUT', `${API}/sketch-presets/blueprint`, { name: 'Blueprint' });
    expect(res.status).toBe(400);
    expect(fs.existsSync(path.join(tmp, 'sketch-presets/blueprint.json'))).toBe(false);
  });

  it('refuses a reserved name', async () => {
    const res = await request('PUT', `${API}/sketch-presets/_working`, {
      name: 'x',
      settings: SETTINGS,
    });
    expect(res.status).toBe(400);
    expect(res.json.code).toBe('RESERVED_NAME');
  });

  it('deletes a preset', async () => {
    await request('PUT', `${API}/sketch-presets/blueprint`, { name: 'Blueprint', settings: SETTINGS });
    const del = await request('DELETE', `${API}/sketch-presets/blueprint`);
    expect(del.status).toBe(200);

    const list = await request('GET', `${API}/sketch-presets`);
    expect(list.json.files).toEqual([]);
    expect((await request('GET', `${API}/sketch-presets/blueprint`)).status).toBe(404);
  });

  it('rejects POST to the collection', async () => {
    const res = await request('POST', `${API}/sketch-presets`, {});
    expect(res.status).toBe(405);
  });
});
