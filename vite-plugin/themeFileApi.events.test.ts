/**
 * The `/events` stream: an outside write to a buffer or the active pointer
 * reaches a subscriber as one `live-state` frame, and the server's own writes
 * do not. Real files in a temp dir, real `fs.watch`.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
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
let mw: (req: any, res: any, next: any) => any;

function makeReq(method: string, url: string, body?: unknown) {
  const handlers: Record<string, (arg?: any) => void> = {};
  return {
    method,
    url,
    handlers,
    on(event: string, cb: (arg?: any) => void) {
      handlers[event] = cb;
      if (event === 'data' && body !== undefined) cb(Buffer.from(JSON.stringify(body)));
      if (event === 'end') cb();
    },
  };
}

function makeRes() {
  return {
    statusCode: 0,
    headers: {} as Record<string, string>,
    payload: '',
    chunks: [] as string[],
    writableEnded: false,
    setHeader(this: any, k: string, v: string) {
      this.headers[k] = v;
    },
    write(this: any, chunk: string) {
      this.chunks.push(chunk);
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

// A recursive watcher on macOS can miss a write made in the instant it is
// created, so give it a beat before the test writes.
async function openStream() {
  const req = makeReq('GET', `${API}/events`);
  const res = makeRes();
  await mw(req, res, () => {});
  await new Promise((r) => setTimeout(r, 150));
  const frames = () =>
    res.chunks
      .filter((c) => c.startsWith('event: live-state'))
      .map((c) => JSON.parse(c.slice(c.indexOf('data: ') + 6).trim()));
  return { res, frames, close: () => req.handlers.close?.() };
}

const settle = () => new Promise((r) => setTimeout(r, 400));

const BUFFER = {
  name: 'Buffer',
  updatedAt: '2026-01-01T00:00:00.000Z',
  editorConfigs: {},
  cssVariables: { '--surface-default': '#ffffff' },
};

beforeEach(() => {
  tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'ltev-'));
  colorsAndTypeDir = path.join(tmp, 'colors-and-type');
  configsDir = path.join(tmp, 'component-configs');
  themesDir = path.join(tmp, 'themes');
  const componentsDir = path.join(tmp, 'components');
  fs.mkdirSync(componentsDir, { recursive: true });
  fs.writeFileSync(
    path.join(componentsDir, 'Widget.svelte'),
    '<div></div>\n<style>\n:global(:root) {\n  --widget-radius: var(--radius-md);\n}\n</style>\n',
  );
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
});

afterEach(() => {
  fs.rmSync(tmp, { recursive: true, force: true });
});

describe('GET /events', () => {
  it('opens an event stream', async () => {
    const stream = await openStream();
    expect(stream.res.statusCode).toBe(200);
    expect(stream.res.headers['Content-Type']).toBe('text/event-stream');
    expect(stream.res.writableEnded).toBe(false);
    stream.close();
  });

  it('streams the live state after an outside buffer write, and again after its removal', async () => {
    const stream = await openStream();
    const working = path.join(colorsAndTypeDir, '_working.json');
    fs.writeFileSync(working, JSON.stringify(BUFFER));
    await vi.waitFor(() => expect(stream.frames()).toHaveLength(1), { timeout: 3000 });
    const [frame] = stream.frames();
    expect(frame.fileName).toBe('default');
    expect(frame.colorsAndType._source).toBe('working');
    expect(frame.colorsAndType.cssVariables['--surface-default']).toBe('#ffffff');
    expect(frame.componentConfigs.widget._source).toBe('theme');

    fs.unlinkSync(working);
    await vi.waitFor(() => expect(stream.frames()).toHaveLength(2), { timeout: 3000 });
    expect(stream.frames()[1].colorsAndType._source).toBe('theme');
    stream.close();
  });

  it('streams after an outside component buffer write', async () => {
    const stream = await openStream();
    const dir = path.join(configsDir, 'widget');
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(
      path.join(dir, '_working.json'),
      JSON.stringify({ name: 'widget', component: 'widget', aliases: { '--widget-radius': '--radius-xl' } }),
    );
    await vi.waitFor(() => expect(stream.frames()).toHaveLength(1), { timeout: 3000 });
    const [frame] = stream.frames();
    expect(frame.componentConfigs.widget._source).toBe('working');
    expect(frame.componentConfigs.widget.aliases['--widget-radius']).toBe('--radius-xl');
    stream.close();
  });

  it('streams after an outside change to the active pointer', async () => {
    const saved = await request('PUT', `${API}/themes/meadow`, {
      ...(await request('GET', `${API}/themes/default`)).json,
      name: 'Meadow',
    });
    expect(saved.status).toBe(200);
    const stream = await openStream();
    fs.writeFileSync(path.join(themesDir, '_active.json'), JSON.stringify({ activeFile: 'meadow' }));
    await vi.waitFor(() => expect(stream.frames()).toHaveLength(1), { timeout: 3000 });
    expect(stream.frames()[0].fileName).toBe('meadow');
    expect(stream.frames()[0].theme.name).toBe('Meadow');
    stream.close();
  });

  it("does not echo the server's own writes", async () => {
    const stream = await openStream();
    expect((await request('PUT', `${API}/colors-and-type/working`, BUFFER)).status).toBe(200);
    expect((await request('DELETE', `${API}/colors-and-type/working`)).status).toBe(200);
    await settle();
    expect(stream.frames()).toHaveLength(0);
    stream.close();
  });

  it('stops watching when the last subscriber leaves', async () => {
    const stream = await openStream();
    stream.close();
    fs.writeFileSync(path.join(colorsAndTypeDir, '_working.json'), JSON.stringify(BUFFER));
    await settle();
    expect(stream.frames()).toHaveLength(0);
  });
});
