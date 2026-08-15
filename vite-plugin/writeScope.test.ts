/**
 * The write-scope invariant: no route and no CLI writes outside the resolved
 * data dirs, `tokensCssPath`, and `fonts.css`. Every filesystem mutation is
 * recorded while the doors run, then checked against that allow-list, so a new
 * door that reaches for the package dir or the project root fails here.
 */
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { themeFileApi } from './themeFileApi';
import { adjustAliases } from '../src/editor/core/components/adjustAliases';
import { matchesKind } from '../src/editor/core/components/aliasKinds';
import { sanitizeFileName } from '../src/editor/core/storage/files/versionedFileResourceClient';
// @ts-expect-error — plain .mjs module, no types
import { runAdjust } from '../bin/adjust.mjs';

const API = '/api/live-tokens';
const REPO_ROOT = process.cwd();

let tmp: string;
let dataDir: string;
let colorsAndTypeDir: string;
let configsDir: string;
let themesDir: string;
let outDir: string;
let tokensCssPath: string;
let fontsCssPath: string;
let generatedCssPath: string;
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
    dataDir,
    colorsAndTypeDir,
    componentConfigsDir: configsDir,
    themesDir,
    componentsSrcDir: componentsDir,
    tokensCssPath,
    fontsCssPath,
    tokensGeneratedCssPath: generatedCssPath,
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
] as const;
const TWO_PATH_MUTATORS = ['renameSync', 'copyFileSync', 'cpSync'] as const;

/** Run `fn` with every filesystem mutation recorded, the mutation itself
 *  untouched. Restores in `finally`: a leaked patch would follow the suite. */
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

/** The CLI workers are plain `.mjs` with named `node:fs` imports, which a patch
 *  on the `fs` module object cannot reach — so their scope is checked by diffing
 *  the sandbox tree instead. */
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

function outsideOf(written: string[], dirs: string[], files: string[]): string[] {
  const allowedDirs = dirs.map((d) => path.resolve(d));
  const allowedFiles = files.map((f) => path.resolve(f));
  return [...new Set(written.map((p) => path.resolve(p)))].filter(
    (p) =>
      !allowedFiles.includes(p) &&
      !allowedDirs.some((d) => p === d || p.startsWith(d + path.sep)),
  );
}

const COLORS_AND_TYPE = {
  name: 'Mine',
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
  editorConfigs: {},
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

const WIDGET_CONFIG = { name: 'mine', component: 'widget', aliases: { '--widget-radius': '--radius-xl' } };

/** Every mutating door, in an order where each one has something to do.
 *  Returns the statuses so a door that quietly stopped writing (404, 409) can
 *  never pass the scope check by writing nothing. */
async function exerciseEveryDoor(): Promise<number[]> {
  const calls: Array<[string, string, unknown?]> = [
    ['PUT', `${API}/colors-and-type/mine`, COLORS_AND_TYPE],
    ['PUT', `${API}/colors-and-type/active`, { name: 'mine' }],
    ['PUT', `${API}/colors-and-type/working`, COLORS_AND_TYPE],
    ['PUT', `${API}/component-configs/widget/mine`, WIDGET_CONFIG],
    ['PUT', `${API}/component-configs/widget/active`, { name: 'mine' }],
    ['PUT', `${API}/component-configs/widget/working`, WIDGET_CONFIG],
    ['PUT', `${API}/themes/mine`, THEME],
    ['PUT', `${API}/themes/active`, { name: 'mine' }],
    ['PUT', `${API}/colors-and-type/production`, { name: 'mine' }],
    ['PUT', `${API}/component-configs/widget/production`, { name: 'mine' }],
    ['PUT', `${API}/production`],
    ['PUT', `${API}/themes/mine/apply`],
    [
      'POST',
      `${API}/themes/import`,
      {
        kind: 'theme-bundle',
        schemaVersion: 3,
        liveTokensVersion: '0.1.0',
        exportedAt: '2026-01-01T00:00:00.000Z',
        manifest: { ...THEME, name: 'imported' },
      },
    ],
    ['DELETE', `${API}/colors-and-type/working`],
    ['DELETE', `${API}/component-configs/widget/working`],
    ['DELETE', `${API}/component-configs/widget/mine`],
    ['DELETE', `${API}/colors-and-type/mine`],
    ['DELETE', `${API}/themes/mine`],
  ];
  const statuses: number[] = [];
  for (const [method, url, body] of calls) {
    statuses.push((await request(method, url, body)).status);
  }
  return statuses;
}

beforeEach(() => {
  tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'ltws-'));
  dataDir = path.join(tmp, 'data');
  colorsAndTypeDir = path.join(dataDir, 'colors-and-type');
  configsDir = path.join(dataDir, 'component-configs');
  themesDir = path.join(dataDir, 'themes');
  outDir = path.join(tmp, 'out');
  tokensCssPath = path.join(outDir, 'tokens.css');
  fontsCssPath = path.join(outDir, 'fonts.css');
  generatedCssPath = path.join(outDir, 'tokens.generated.css');
  componentsDir = path.join(tmp, 'components');
  fs.mkdirSync(outDir, { recursive: true });
  fs.mkdirSync(componentsDir, { recursive: true });
  fs.copyFileSync(path.join(REPO_ROOT, 'src/system/styles/tokens.css'), tokensCssPath);
  fs.writeFileSync(
    path.join(componentsDir, 'Widget.svelte'),
    '<div></div>\n<style>\n:global(:root) {\n  --widget-radius: var(--radius-md);\n}\n</style>\n',
  );
});

afterEach(() => {
  fs.rmSync(tmp, { recursive: true, force: true });
});

describe('write scope', () => {
  it('boot writes only inside the data dirs and the generated CSS', async () => {
    const { written } = await pathsWrittenBy(boot);
    expect(written.length).toBeGreaterThan(0);
    expect(outsideOf(written, [dataDir], [tokensCssPath, fontsCssPath, generatedCssPath])).toEqual([]);
  });

  it('every mutating route writes only inside the data dirs, tokens.css and fonts.css', async () => {
    boot();
    const { written, result: statuses } = await pathsWrittenBy(exerciseEveryDoor);
    expect(statuses.filter((s) => s >= 400)).toEqual([]);
    expect(outsideOf(written, [dataDir], [tokensCssPath, fontsCssPath, generatedCssPath])).toEqual([]);
  });

  it('leaves the developer-authored tokens.css untouched', async () => {
    const before = fs.readFileSync(tokensCssPath, 'utf-8');
    boot();
    await exerciseEveryDoor();
    expect(fs.readFileSync(tokensCssPath, 'utf-8')).toBe(before);
  });

  it('the adjust CLI writes only inside the component-configs dir it was given', async () => {
    fs.mkdirSync(path.join(configsDir, 'widget'), { recursive: true });
    fs.writeFileSync(
      path.join(configsDir, 'widget', 'default.json'),
      JSON.stringify({ name: 'default', component: 'widget', aliases: { '--widget-radius': '--radius-md' } }),
    );
    fs.writeFileSync(path.join(configsDir, 'widget', '_active.json'), JSON.stringify({ activeFile: 'default' }));
    const opsPath = path.join(tmp, 'ops.json');
    fs.writeFileSync(opsPath, JSON.stringify({ ops: [{ kind: 'radius', shift: 1 }] }));

    const before = snapshotTree(tmp);
    await runAdjust({
      opsPath,
      componentConfigsDir: configsDir,
      engine: { adjustAliases, matchesKind, sanitizeFileName },
    });
    const touched = changedSince(before, snapshotTree(tmp));

    expect(touched.length).toBeGreaterThan(0);
    expect(outsideOf(touched, [configsDir], [])).toEqual([]);
  });
});
