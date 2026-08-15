/**
 * Boot against a tree from 0.47.1 or earlier, where `themes/` still holds the
 * colors and type and `manifests/` holds the whole-look files. Every writer in
 * the boot sequence would read those palettes as themes and rewrite them, so
 * the plugin has to recognise the layout and stop. The consumer's saved work
 * survives on the strength of this one test.
 */
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { themeFileApi } from './themeFileApi';
import { migrateData } from './migrateData/migrateData';

const API = '/api/live-tokens';
const REPO_ROOT = process.cwd();

let tmp: string;
let dataDir: string;
let componentsDir: string;
let outDir: string;
let tokensCssPath: string;
let generatedCssPath: string;
let warnings: string[];
let plugin: any;
let mw: (req: any, res: any, next: any) => any;

const SUNSET_COLORS = {
  name: 'Sunset',
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
  schemaVersion: 1,
  editorConfigs: {},
  cssVariables: { '--surface-default': '#fff5e6' },
};

const DEFAULT_COLORS = {
  name: 'Default',
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
  schemaVersion: 2,
  editorConfigs: {},
  cssVariables: { '--surface-default': '#ffffff' },
};

const WIDGET_DEFAULT = { name: 'default', component: 'widget', aliases: { '--widget-radius': '--radius-md' } };

const SENTINEL_CSS = ':root:root { --surface-default: #fff5e6; }\n';

function writeJson(file: string, data: unknown) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, JSON.stringify(data, null, 2));
}

function preRenameTree() {
  writeJson(path.join(dataDir, 'themes', 'default.json'), DEFAULT_COLORS);
  writeJson(path.join(dataDir, 'themes', 'sunset.json'), SUNSET_COLORS);
  writeJson(path.join(dataDir, 'themes', '_active.json'), { activeFile: 'sunset' });
  writeJson(path.join(dataDir, 'themes', '_production.json'), { productionFile: 'sunset' });

  writeJson(path.join(dataDir, 'manifests', 'sunset.json'), {
    name: 'Sunset',
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    theme: 'sunset',
    componentConfigs: {},
  });
  writeJson(path.join(dataDir, 'manifests', '_active.json'), { activeFile: 'sunset' });

  writeJson(path.join(dataDir, 'component-configs', 'widget', 'default.json'), WIDGET_DEFAULT);
  writeJson(path.join(dataDir, 'component-configs', 'widget', '_active.json'), { activeFile: 'default' });
  writeJson(path.join(dataDir, 'component-configs', 'widget', '_production.json'), {
    productionFile: 'default',
  });

  fs.writeFileSync(generatedCssPath, SENTINEL_CSS);
}

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
    payload: '',
    writableEnded: false,
    setHeader() {},
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

function boot() {
  plugin = themeFileApi({
    dataDir,
    componentsSrcDir: componentsDir,
    tokensCssPath,
    fontsCssPath: path.join(outDir, 'fonts.css'),
    tokensGeneratedCssPath: generatedCssPath,
  });
  const captured: any[] = [];
  (plugin as any).configureServer({
    middlewares: { use: (fn: any) => captured.push(fn) },
    config: { logger: { warn: (m: string) => warnings.push(m), info: () => {} } },
  });
  mw = captured[0];
}

/** Directories included: creating an empty `colors-and-type/` is a write. */
function snapshot(root: string): Map<string, string> {
  const entries = new Map<string, string>();
  const walk = (dir: string) => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const p = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        entries.set(p, '<dir>');
        walk(p);
      } else {
        entries.set(p, fs.readFileSync(p, 'utf-8'));
      }
    }
  };
  walk(root);
  return entries;
}

function changedSince(before: Map<string, string>, after: Map<string, string>): string[] {
  const changed = [...after].filter(([p, content]) => before.get(p) !== content).map(([p]) => p);
  const removed = [...before.keys()].filter((p) => !after.has(p));
  return [...changed, ...removed];
}

beforeEach(() => {
  tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'ltll-'));
  dataDir = path.join(tmp, 'data');
  outDir = path.join(tmp, 'out');
  componentsDir = path.join(tmp, 'components');
  tokensCssPath = path.join(outDir, 'tokens.css');
  generatedCssPath = path.join(dataDir, 'tokens.generated.css');
  warnings = [];
  fs.mkdirSync(outDir, { recursive: true });
  fs.mkdirSync(componentsDir, { recursive: true });
  fs.copyFileSync(path.join(REPO_ROOT, 'src/system/styles/tokens.css'), tokensCssPath);
  fs.writeFileSync(
    path.join(componentsDir, 'Widget.svelte'),
    '<div></div>\n<style>\n:global(:root) {\n  --widget-radius: var(--radius-md);\n}\n</style>\n',
  );
  preRenameTree();
});

afterEach(() => {
  fs.rmSync(tmp, { recursive: true, force: true });
});

describe('boot on a pre-0.48 layout', () => {
  it('writes nothing anywhere in the project', () => {
    const before = snapshot(tmp);

    boot();

    expect(changedSince(before, snapshot(tmp))).toEqual([]);
  });

  it('leaves the palettes and the generated CSS exactly as they were', () => {
    boot();

    expect(JSON.parse(fs.readFileSync(path.join(dataDir, 'themes', 'sunset.json'), 'utf-8'))).toEqual(
      SUNSET_COLORS,
    );
    expect(fs.existsSync(path.join(dataDir, 'colors-and-type'))).toBe(false);
    expect(fs.readFileSync(generatedCssPath, 'utf-8')).toBe(SENTINEL_CSS);
  });

  it('warns once, naming the layout and the fix', () => {
    boot();

    expect(warnings).toHaveLength(1);
    expect(warnings[0]).toContain('data layout from 0.47 and earlier');
    expect(warnings[0]).toContain(path.join(dataDir, 'manifests'));
    expect(warnings[0]).toContain('npx live-tokens migrate');
  });

  it('refuses every write door until the tree is healed', async () => {
    boot();

    const { status, json } = await request('PUT', `${API}/themes/active`, { name: 'sunset' });

    expect(status).toBe(409);
    expect(json.code).toBe('LEGACY_LAYOUT');
  });

  it('is still recognised when one colors file was moved across by hand', () => {
    // The half-moved tree: `colors-and-type/` exists and holds something, so
    // only the manifests directory is left to tell the truth.
    fs.mkdirSync(path.join(dataDir, 'colors-and-type'), { recursive: true });
    fs.renameSync(
      path.join(dataDir, 'themes', 'sunset.json'),
      path.join(dataDir, 'colors-and-type', 'sunset.json'),
    );
    const before = snapshot(tmp);

    boot();

    expect(changedSince(before, snapshot(tmp))).toEqual([]);
    expect(warnings[0]).toContain('data layout from 0.47 and earlier');
    expect(JSON.parse(fs.readFileSync(path.join(dataDir, 'themes', 'default.json'), 'utf-8'))).toEqual(
      DEFAULT_COLORS,
    );
  });

  it('is still recognised with no manifests directory and only pointers left', () => {
    // The consumer ran on the shipped presets, so their themes directory holds
    // the pointers and nothing else. Those slugs name package *themes* now.
    fs.rmSync(path.join(dataDir, 'manifests'), { recursive: true, force: true });
    fs.rmSync(path.join(dataDir, 'themes', 'sunset.json'));
    fs.rmSync(path.join(dataDir, 'themes', 'default.json'));
    const before = snapshot(tmp);

    boot();

    expect(changedSince(before, snapshot(tmp))).toEqual([]);
    expect(warnings[0]).toContain('data layout from 0.47 and earlier');
  });

  it('leaves a hot component update alone while the layout is legacy', () => {
    boot();
    const before = snapshot(tmp);

    (plugin as any).handleHotUpdate({ file: path.join(componentsDir, 'Widget.svelte') });

    expect(changedSince(before, snapshot(tmp))).toEqual([]);
  });

  /** git does not track an empty directory, so a healed tree can arrive from a
   *  fresh clone with no `colors-and-type/` at all. The theme beside the
   *  pointers is what says the rename has already run. */
  it('does not fire on a healed tree whose empty colors-and-type never made it into git', () => {
    fs.rmSync(path.join(dataDir, 'manifests'), { recursive: true, force: true });
    fs.rmSync(path.join(dataDir, 'themes', 'sunset.json'));
    writeJson(path.join(dataDir, 'themes', 'default.json'), {
      name: 'Motion Proto',
      schemaVersion: 3,
      colorsAndType: { ...DEFAULT_COLORS, schemaVersion: 5 },
      componentConfigs: {},
    });

    boot();

    expect(warnings.filter((w) => w.includes('data layout'))).toEqual([]);
    expect(fs.existsSync(path.join(dataDir, 'colors-and-type'))).toBe(true);
  });

  it('boots normally once the migration has run', () => {
    migrateData({
      dataDir,
      colorsAndTypeDir: path.join(dataDir, 'colors-and-type'),
      componentConfigsDir: path.join(dataDir, 'component-configs'),
      themesDir: path.join(dataDir, 'themes'),
    });

    boot();

    expect(warnings.filter((w) => w.includes('data layout'))).toEqual([]);
    expect(
      JSON.parse(fs.readFileSync(path.join(dataDir, 'themes', '_production.json'), 'utf-8'))
        .productionFile,
    ).toBe('sunset');
    const css = fs.readFileSync(generatedCssPath, 'utf-8');
    expect(css).toContain('--surface-default: #fff5e6');
    expect(css).not.toBe(SENTINEL_CSS);
  });
});
