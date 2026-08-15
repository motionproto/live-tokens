/**
 * The reserved `_working` slot: the doors that must refuse a `_`-prefixed name
 * and the buffer routes that own the slot. Driven through the real route table
 * with mock req/res, local data in a temp dir — same harness as the other
 * themeFileApi suites.
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

function boot() {
  const plugin = themeFileApi({
    dataDir: tmp,
    colorsAndTypeDir,
    componentConfigsDir: configsDir,
    themesDir,
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
}

/** Record every path written while `run` executes, the write itself untouched.
 *  The patch comes off in `finally`: leaking it would follow every later test. */
async function trackWrites<T>(run: () => Promise<T>): Promise<string[]> {
  const written: string[] = [];
  const original = fs.writeFileSync;
  (fs as any).writeFileSync = (file: any, data: any, options?: any) => {
    written.push(String(file));
    return original(file, data, options);
  };
  try {
    await run();
  } finally {
    (fs as any).writeFileSync = original;
  }
  return written;
}

const BUFFER = {
  name: 'Buffer',
  updatedAt: '2026-01-01T00:00:00.000Z',
  editorConfigs: {},
  cssVariables: { '--surface-default': '#ffffff' },
};

const WIDGET_BUFFER = {
  name: 'widget',
  component: 'widget',
  aliases: { '--widget-radius': '--radius-xl' },
};

beforeEach(() => {
  tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'ltwk-'));
  colorsAndTypeDir = path.join(tmp, 'colors-and-type');
  configsDir = path.join(tmp, 'component-configs');
  themesDir = path.join(tmp, 'themes');
  componentsDir = path.join(tmp, 'components');
  fs.mkdirSync(componentsDir, { recursive: true });
  fs.writeFileSync(
    path.join(componentsDir, 'Widget.svelte'),
    '<div></div>\n<style>\n:global(:root) {\n  --widget-radius: var(--radius-md);\n}\n</style>\n',
  );
  boot();
});

afterEach(() => {
  fs.rmSync(tmp, { recursive: true, force: true });
});

describe('reserved names', () => {
  // `_active` names a file that really is on disk under `themes/`, so a door
  // that reads or applies it corrupts the tree rather than 404ing on nothing.
  const names = ['_working', '_active'];
  const doors: Array<{ method: string; url: (name: string) => string }> = [
    { method: 'GET', url: (n) => `${API}/colors-and-type/${n}` },
    { method: 'PUT', url: (n) => `${API}/colors-and-type/${n}` },
    { method: 'DELETE', url: (n) => `${API}/colors-and-type/${n}` },
    { method: 'GET', url: (n) => `${API}/component-configs/widget/${n}` },
    { method: 'PUT', url: (n) => `${API}/component-configs/widget/${n}` },
    { method: 'DELETE', url: (n) => `${API}/component-configs/widget/${n}` },
    { method: 'GET', url: (n) => `${API}/themes/${n}` },
    { method: 'PUT', url: (n) => `${API}/themes/${n}` },
    { method: 'DELETE', url: (n) => `${API}/themes/${n}` },
    { method: 'PUT', url: (n) => `${API}/themes/${n}/apply` },
    { method: 'GET', url: (n) => `${API}/themes/${n}/export` },
  ];

  const machineState = () => ({
    activeTheme: fs.readFileSync(path.join(themesDir, '_active.json'), 'utf-8'),
    productionTheme: fs.readFileSync(path.join(themesDir, '_production.json'), 'utf-8'),
    generatedCss: fs.readFileSync(path.join(tmp, 'tokens.generated.css'), 'utf-8'),
    colorsAndTypeFiles: fs.readdirSync(colorsAndTypeDir).sort(),
  });

  for (const name of names) {
    for (const { method, url } of doors) {
      it(`${method} ${url(name)} is refused and changes nothing`, async () => {
        const before = machineState();
        const { status, json } = await request(method, url(name), { name });
        expect(status).toBe(400);
        expect(json.code).toBe('RESERVED_NAME');
        expect(machineState()).toEqual(before);
      });
    }
  }

  it('leaves no file behind on a refused PUT', async () => {
    await request('PUT', `${API}/colors-and-type/_working`, BUFFER);
    await request('PUT', `${API}/themes/_working`, { name: '_working' });
    expect(fs.existsSync(path.join(colorsAndTypeDir, '_working.json'))).toBe(false);
    expect(fs.existsSync(path.join(themesDir, '_working.json'))).toBe(false);
  });

  it('allocates an import named "_working" outside the reserved space', async () => {
    const { status, json } = await request('POST', `${API}/themes/import`, {
      kind: 'theme-bundle',
      schemaVersion: 3,
      liveTokensVersion: '0.1.0',
      exportedAt: '2026-01-01T00:00:00.000Z',
      manifest: {
        name: '_working',
        createdAt: '2026-01-01T00:00:00.000Z',
        updatedAt: '2026-01-01T00:00:00.000Z',
        schemaVersion: 3,
        colorsAndType: BUFFER,
        componentConfigs: {},
      },
    });
    expect(status).toBe(200);
    expect(json.theme).toBe('working');
    expect(fs.existsSync(path.join(themesDir, '_working.json'))).toBe(false);
  });
});

describe('the colors-and-type buffer', () => {
  it('GET is 404 while the slot is empty', async () => {
    expect((await request('GET', `${API}/colors-and-type/working`)).status).toBe(404);
  });

  it('round-trips what the client flushed', async () => {
    expect((await request('PUT', `${API}/colors-and-type/working`, BUFFER)).status).toBe(200);
    const { status, json } = await request('GET', `${API}/colors-and-type/working`);
    expect(status).toBe(200);
    expect(json).toEqual(BUFFER);
  });

  it('writes the slot and nothing else', async () => {
    const written = await trackWrites(() =>
      request('PUT', `${API}/colors-and-type/working`, BUFFER),
    );
    expect(written).toEqual([path.join(colorsAndTypeDir, '_working.json')]);
  });

  it('DELETE empties the slot', async () => {
    await request('PUT', `${API}/colors-and-type/working`, BUFFER);
    expect((await request('DELETE', `${API}/colors-and-type/working`)).status).toBe(200);
    expect(fs.existsSync(path.join(colorsAndTypeDir, '_working.json'))).toBe(false);
    expect((await request('GET', `${API}/colors-and-type/working`)).status).toBe(404);
  });

  // A stored scalar would round-trip as content while reading back falsy, which
  // is the one thing absence is allowed to mean.
  it('refuses a body that is not a JSON object', async () => {
    const { status, json } = await request('PUT', `${API}/colors-and-type/working`, 'not an object');
    expect(status).toBe(400);
    expect(json.code).toBe('INVALID_BODY');
    expect(fs.existsSync(path.join(colorsAndTypeDir, '_working.json'))).toBe(false);
  });
});

describe('the component buffer', () => {
  it('GET is 404 while the slot is empty', async () => {
    expect((await request('GET', `${API}/component-configs/widget/working`)).status).toBe(404);
  });

  it('round-trips per component', async () => {
    await request('PUT', `${API}/component-configs/widget/working`, WIDGET_BUFFER);
    const { status, json } = await request('GET', `${API}/component-configs/widget/working`);
    expect(status).toBe(200);
    expect(json).toEqual(WIDGET_BUFFER);
  });

  it('writes the slot and nothing else', async () => {
    const written = await trackWrites(() =>
      request('PUT', `${API}/component-configs/widget/working`, WIDGET_BUFFER),
    );
    expect(written).toEqual([path.join(configsDir, 'widget', '_working.json')]);
  });

  it('DELETE empties the slot', async () => {
    await request('PUT', `${API}/component-configs/widget/working`, WIDGET_BUFFER);
    expect((await request('DELETE', `${API}/component-configs/widget/working`)).status).toBe(200);
    expect(fs.existsSync(path.join(configsDir, 'widget', '_working.json'))).toBe(false);
    expect((await request('GET', `${API}/component-configs/widget/working`)).status).toBe(404);
  });

  it('refuses a component this install does not have, creating no directory', async () => {
    const { status, json } = await request(
      'PUT',
      `${API}/component-configs/ghost/working`,
      WIDGET_BUFFER,
    );
    expect(status).toBe(404);
    expect(json.code).toBe('UNKNOWN_COMPONENT');
    expect(fs.existsSync(path.join(configsDir, 'ghost'))).toBe(false);
  });
});
