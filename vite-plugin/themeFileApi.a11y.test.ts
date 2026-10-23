import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import fs from 'fs';
import os from 'os';
import path from 'path';
import type { CliOutcome } from './a11y/a11yRunServer';

const cli = vi.hoisted(() => ({
  runs: [] as { args: string[]; cwd: string; finish: (outcome: CliOutcome) => void }[],
}));

vi.mock('./a11y/a11yRunServer', async (importOriginal) => {
  const actual = await importOriginal<typeof import('./a11y/a11yRunServer')>();
  return {
    ...actual,
    spawnCli: () => (args: string[], cwd: string) => {
      let finish!: (outcome: CliOutcome) => void;
      const done = new Promise<CliOutcome>((resolve) => (finish = resolve));
      cli.runs.push({ args, cwd, finish });
      return { done, stop: () => {} };
    },
  };
});

import { themeFileApi } from './themeFileApi';

const API = '/api/live-tokens';
const REPO_ROOT = process.cwd();

let tmp: string;
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
  const res = makeRes();
  await mw(makeReq(method, url, body), res, () => {});
  return { status: res.statusCode, json: res.payload ? JSON.parse(res.payload) : null };
}

async function openStream() {
  const req = makeReq('GET', `${API}/events`);
  const res = makeRes();
  await mw(req, res, () => {});
  const frames = () =>
    res.chunks
      .filter((c) => c.startsWith('event: a11y\n'))
      .map((c) => JSON.parse(c.slice(c.indexOf('data: ') + 6).trim()));
  return { frames, close: () => req.handlers.close?.() };
}

function bootPlugin() {
  // The plugin reads the project root once, at construction.
  const cwd = vi.spyOn(process, 'cwd').mockReturnValue(tmp);
  const plugin = themeFileApi({
    dataDir: tmp,
    colorsAndTypeDir: path.join(tmp, 'colors-and-type'),
    componentConfigsDir: path.join(tmp, 'component-configs'),
    themesDir: path.join(tmp, 'themes'),
    componentsSrcDir: path.join(tmp, 'components'),
    tokensCssPath: path.join(REPO_ROOT, 'src/system/styles/tokens.css'),
    fontsCssPath: path.join(tmp, 'fonts.css'),
    tokensGeneratedCssPath: path.join(tmp, 'tokens.generated.css'),
  });
  cwd.mockRestore();
  const captured: any[] = [];
  (plugin as any).configureServer({
    middlewares: { use: (fn: any) => captured.push(fn) },
    config: { logger: { warn: () => {}, info: () => {} } },
  });
  mw = captured[0];
}

const FINISHED_CLI = JSON.stringify({ check: 'check-component --tests --a11y', theme: 'default', findings: [] });

beforeEach(() => {
  tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'lta11y-'));
  fs.mkdirSync(path.join(tmp, 'components'), { recursive: true });
  cli.runs = [];
  bootPlugin();
});

afterEach(() => {
  delete process.env.LIVE_TOKENS_TEST_DATA_DIR;
  fs.rmSync(tmp, { recursive: true, force: true });
});

describe('the a11y routes', () => {
  it('start a run from the project root and answer 409 until it settles', async () => {
    const first = await request('POST', `${API}/a11y/run`, { contrast: [] });
    expect(first.status).toBe(202);
    expect(first.json.state).toBe('running');
    expect(cli.runs.map((run) => run.cwd)).toEqual([tmp]);

    const second = await request('POST', `${API}/a11y/run`, { contrast: [] });
    expect(second.status).toBe(409);
    expect(second.json.code).toBe('A11Y_RUN_IN_PROGRESS');

    cli.runs[0].finish({ code: 0, stdout: FINISHED_CLI, stderr: '' });
    await vi.waitFor(async () => expect((await request('GET', `${API}/a11y/report`)).json.report.state).toBe('finished'));
    expect((await request('POST', `${API}/a11y/run`, { contrast: [] })).status).toBe(202);
  });

  it('answer 400 to a body that is no JSON', async () => {
    const res = makeRes();
    const req = makeReq('POST', `${API}/a11y/run`);
    req.on = (event: string, cb: (arg?: any) => void) => {
      if (event === 'data') cb(Buffer.from('not json'));
      if (event === 'end') cb();
    };
    await mw(req, res, () => {});
    expect(res.statusCode).toBe(400);
    expect(cli.runs).toHaveLength(0);
  });

  it('read the last report back after a restart', async () => {
    await request('POST', `${API}/a11y/run`, { contrast: [] });
    cli.runs[0].finish({ code: 0, stdout: FINISHED_CLI, stderr: '' });
    await vi.waitFor(() => expect(fs.existsSync(path.join(tmp, 'test-results/live-tokens/a11y-report.json'))).toBe(true));
    bootPlugin();
    const { status, json } = await request('GET', `${API}/a11y/report`);
    expect(status).toBe(200);
    expect(json.report).toMatchObject({ state: 'finished', theme: 'default', findings: [] });
  });

  it('send an a11y frame to every open stream on start and on finish', async () => {
    const one = await openStream();
    const two = await openStream();
    await request('POST', `${API}/a11y/run`, { contrast: [] });
    cli.runs[0].finish({ code: 0, stdout: FINISHED_CLI, stderr: '' });
    await vi.waitFor(() => expect(one.frames().map((f) => f.state)).toEqual(['running', 'finished']));
    expect(two.frames()).toEqual(one.frames());
    one.close();
    two.close();
  });

  it('stop writing to a stream once it closes', async () => {
    const stream = await openStream();
    stream.close();
    await request('POST', `${API}/a11y/run`, { contrast: [] });
    expect(stream.frames()).toEqual([]);
  });

  it('keep the report inside the isolated copy under test isolation', async () => {
    const projectReport = path.join(tmp, 'test-results/live-tokens/a11y-report.json');
    const seeded = `${JSON.stringify({ state: 'finished', startedAt: '', finishedAt: '', contrast: [], findings: [] })}\n`;
    fs.mkdirSync(path.dirname(projectReport), { recursive: true });
    fs.writeFileSync(projectReport, seeded);
    const isolated = path.join(tmp, 'isolated');
    fs.mkdirSync(isolated);
    process.env.LIVE_TOKENS_TEST_DATA_DIR = isolated;
    bootPlugin();

    expect((await request('GET', `${API}/a11y/report`)).json).toEqual({ report: null });
    await request('POST', `${API}/a11y/run`, { contrast: [] });
    cli.runs[0].finish({ code: 0, stdout: FINISHED_CLI, stderr: '' });
    await vi.waitFor(() => expect(fs.existsSync(path.join(isolated, 'a11y-report.json'))).toBe(true));
    expect(fs.readFileSync(projectReport, 'utf-8')).toBe(seeded);
  });
});
