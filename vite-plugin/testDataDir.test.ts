/**
 * `LIVE_TOKENS_TEST_DATA_DIR` is what keeps a contract-test run off the
 * project's own design system. The dev server it boots is the consumer's, so
 * its plugin options name the real tree; this pins that the variable outranks
 * them everywhere the plugin writes.
 */
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { themeFileApi } from './themeFileApi';
import { resolveDataDirs, _resetLiveTokensConfigCache } from './files/dataPaths';
import { runAdditiveTokensCssMigrations } from './tokensCssMigrations';

const API = '/api/live-tokens';

let tmp: string;
let realDataDir: string;
let isolatedDataDir: string;
let outDir: string;
let tokensCssPath: string;
let fontsCssPath: string;
let generatedCssPath: string;
let componentsDir: string;
let mw: (req: any, res: any, next: any) => any;

/** Missing the `--scale-*` steps, so an additive migration is pending against
 *  it and `autoMigrate` has something to write. */
const TOKENS_CSS = ':root {\n  --radius-md: 8px;\n  --space-16: 16px;\n}\n';

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
  return res.statusCode;
}

/** Every option points at the real tree, and `autoMigrate` invites a write to
 *  the hand-authored stylesheet: the worst case the override has to survive. */
function boot() {
  const plugin = themeFileApi({
    dataDir: realDataDir,
    componentsSrcDir: componentsDir,
    tokensCssPath,
    fontsCssPath,
    tokensGeneratedCssPath: generatedCssPath,
    autoMigrate: true,
  });
  const captured: any[] = [];
  (plugin as any).configureServer({
    middlewares: { use: (fn: any) => captured.push(fn) },
    config: { logger: { warn: () => {}, info: () => {} } },
  });
  mw = captured[0];
}

const PATH_MUTATORS = [
  'writeFileSync',
  'appendFileSync',
  'mkdirSync',
  'rmSync',
  'rmdirSync',
  'unlinkSync',
  'truncateSync',
  'utimesSync',
] as const;
const TWO_PATH_MUTATORS = ['renameSync', 'copyFileSync', 'cpSync'] as const;

async function pathsWrittenBy<T>(fn: () => T | Promise<T>): Promise<{ written: string[]; result: T }> {
  const written: string[] = [];
  const originals = new Map<string, any>();
  for (const name of PATH_MUTATORS) {
    const original = (fs as any)[name];
    originals.set(name, original);
    (fs as any)[name] = (target: any, ...rest: any[]) => {
      written.push(String(target));
      return original(target, ...rest);
    };
  }
  for (const name of TWO_PATH_MUTATORS) {
    const original = (fs as any)[name];
    originals.set(name, original);
    (fs as any)[name] = (from: any, to: any, ...rest: any[]) => {
      written.push(String(from), String(to));
      return original(from, to, ...rest);
    };
  }
  try {
    return { written, result: await fn() };
  } finally {
    for (const [name, original] of originals) (fs as any)[name] = original;
  }
}

function snapshotTree(root: string): Map<string, string> {
  const files = new Map<string, string>();
  const walk = (dir: string) => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const p = path.join(dir, entry.name);
      if (entry.isDirectory()) walk(p);
      else files.set(p, fs.readFileSync(p, 'utf-8'));
    }
  };
  walk(root);
  return files;
}

function changedSince(before: Map<string, string>, after: Map<string, string>): string[] {
  const changed = [...after].filter(([p, content]) => before.get(p) !== content).map(([p]) => p);
  const removed = [...before.keys()].filter((p) => !after.has(p));
  return [...changed, ...removed];
}

function outsideOf(written: string[], dir: string): string[] {
  const allowed = path.resolve(dir);
  return [...new Set(written.map((p) => path.resolve(p)))].filter(
    (p) => p !== allowed && !p.startsWith(allowed + path.sep),
  );
}

const COLORS_AND_TYPE = {
  name: 'Mine',
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
  editorConfigs: {},
  // Present so the production bake reaches fonts.css: it returns early on a
  // document that names no font sources.
  fontSources: [],
  cssVariables: { '--surface-default': '#ffffff' },
};

const THEME = {
  name: 'mine',
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
  schemaVersion: 3,
  colorsAndType: COLORS_AND_TYPE,
  componentConfigs: {},
};

const WIDGET_CONFIG = {
  name: 'mine',
  component: 'widget',
  aliases: { '--widget-radius': '--radius-xl' },
};

/** Enough doors to reach every write target the plugin owns: the three data
 *  subdirectories, the generated stylesheet, and the fonts stylesheet. */
async function exerciseEveryDoor(): Promise<number[]> {
  const calls: Array<[string, string, unknown?]> = [
    ['PUT', `${API}/colors-and-type/mine`, COLORS_AND_TYPE],
    ['PUT', `${API}/colors-and-type/working`, COLORS_AND_TYPE],
    ['PUT', `${API}/component-configs/widget/mine`, WIDGET_CONFIG],
    ['PUT', `${API}/component-configs/widget/working`, WIDGET_CONFIG],
    ['PUT', `${API}/themes/mine`, THEME],
    ['PUT', `${API}/themes/active`, { name: 'mine' }],
    ['PUT', `${API}/production`],
    ['PUT', `${API}/themes/mine/apply`],
    ['DELETE', `${API}/component-configs/widget/working`],
    ['DELETE', `${API}/colors-and-type/working`],
  ];
  const statuses: number[] = [];
  for (const [method, url, body] of calls) statuses.push(await request(method, url, body));
  return statuses;
}

beforeEach(() => {
  tmp = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), 'lt-isolation-')));
  realDataDir = path.join(tmp, 'project', 'data');
  isolatedDataDir = path.join(tmp, 'isolated');
  outDir = path.join(tmp, 'project', 'out');
  tokensCssPath = path.join(outDir, 'tokens.css');
  fontsCssPath = path.join(outDir, 'fonts.css');
  generatedCssPath = path.join(outDir, 'tokens.generated.css');
  componentsDir = path.join(tmp, 'project', 'components');
  fs.mkdirSync(outDir, { recursive: true });
  fs.mkdirSync(componentsDir, { recursive: true });
  for (const sub of ['colors-and-type', 'component-configs', 'themes', 'sketch-styles']) {
    fs.mkdirSync(path.join(realDataDir, sub), { recursive: true });
  }
  fs.writeFileSync(tokensCssPath, TOKENS_CSS);
  fs.writeFileSync(fontsCssPath, '/* fonts */\n');
  fs.writeFileSync(generatedCssPath, '/* generated */\n');
  fs.writeFileSync(
    path.join(componentsDir, 'Widget.svelte'),
    '<div></div>\n<style>\n:global(:root) {\n  --widget-radius: var(--radius-md);\n}\n</style>\n',
  );
  fs.cpSync(realDataDir, isolatedDataDir, { recursive: true });
  process.env.LIVE_TOKENS_TEST_DATA_DIR = isolatedDataDir;
  _resetLiveTokensConfigCache();
});

afterEach(() => {
  delete process.env.LIVE_TOKENS_TEST_DATA_DIR;
  fs.rmSync(tmp, { recursive: true, force: true });
});

describe('LIVE_TOKENS_TEST_DATA_DIR', () => {
  it('outranks explicit options and the config file for every data directory', () => {
    const dirs = resolveDataDirs({
      dataDir: realDataDir,
      colorsAndTypeDir: path.join(realDataDir, 'elsewhere'),
      componentConfigsDir: path.join(realDataDir, 'elsewhere'),
      themesDir: path.join(realDataDir, 'elsewhere'),
    });
    expect(dirs).toEqual({
      dataDir: isolatedDataDir,
      colorsAndTypeDir: path.join(isolatedDataDir, 'colors-and-type'),
      componentConfigsDir: path.join(isolatedDataDir, 'component-configs'),
      themesDir: path.join(isolatedDataDir, 'themes'),
      sketchStylesDir: path.join(isolatedDataDir, 'sketch-styles'),
    });
  });

  it('confines boot and every mutating route to the isolated copy', async () => {
    const before = snapshotTree(path.join(tmp, 'project'));
    const { written } = await pathsWrittenBy(async () => {
      boot();
      const statuses = await exerciseEveryDoor();
      expect(statuses.filter((s) => s >= 400)).toEqual([]);
    });

    expect(written.length).toBeGreaterThan(0);
    expect(outsideOf(written, isolatedDataDir)).toEqual([]);
    expect(changedSince(before, snapshotTree(path.join(tmp, 'project')))).toEqual([]);
  });

  it('leaves tokens.css alone with autoMigrate on and a migration pending', async () => {
    expect(runAdditiveTokensCssMigrations(TOKENS_CSS).changed).toBe(true);
    boot();
    await exerciseEveryDoor();
    expect(fs.readFileSync(tokensCssPath, 'utf-8')).toBe(TOKENS_CSS);
  });

  it('bakes production into the copy rather than the configured stylesheets', async () => {
    boot();
    await exerciseEveryDoor();
    expect(fs.readFileSync(generatedCssPath, 'utf-8')).toBe('/* generated */\n');
    expect(fs.readFileSync(fontsCssPath, 'utf-8')).toBe('/* fonts */\n');
    expect(fs.existsSync(path.join(isolatedDataDir, 'tokens.generated.css'))).toBe(true);
    expect(fs.existsSync(path.join(isolatedDataDir, 'fonts.css'))).toBe(true);
  });
});
