import { describe, it, expect, afterEach } from 'vitest';
import { mkdtempSync, mkdirSync, rmSync, readFileSync, existsSync, writeFileSync, readdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { buildColors } from '../src/editor/core/themes/buildColors';
import type { Oklch } from '../src/editor/core/palettes/oklch';
// @ts-expect-error — plain .mjs module, no types
import { runSetColors, formatSetColorsResult } from './set-colors.mjs';

const engine = { buildColors };

const BASE_COLORS: Record<string, Oklch> = {
  Brand: { l: 0.62, c: 0.17, h: 145 },
  Accent: { l: 0.8, c: 0.15, h: 95 },
  Special: { l: 0.6, c: 0.19, h: 300 },
  Canvas: { l: 0.97, c: 0.01, h: 120 },
  Neutral: { l: 0.55, c: 0.012, h: 140 },
  Alternate: { l: 0.58, c: 0.009, h: 60 },
  Info: { l: 0.6, c: 0.15, h: 255 },
  Success: { l: 0.6, c: 0.16, h: 150 },
  Warning: { l: 0.75, c: 0.15, h: 85 },
  Danger: { l: 0.58, c: 0.2, h: 25 },
};

const BASE_COLORS_FILE = { scheme: 'light', baseColors: BASE_COLORS };

const fonts = (marker: string) => [{ variable: '--font-sans', slots: [{ kind: 'generic', value: marker }] }];

const roots: string[] = [];

/** A tree whose three colors-and-type layers are all present and distinct: the
 *  shipped default under a Default theme that carries no copy of its own. */
function project(): string {
  const root = mkdtempSync(join(tmpdir(), 'lt-set-colors-'));
  roots.push(root);
  mkdirSync(join(root, 'colors-and-type'), { recursive: true });
  mkdirSync(join(root, 'themes'), { recursive: true });
  writeFileSync(
    join(root, 'colors-and-type', 'default.json'),
    JSON.stringify({ name: 'Default', schemaVersion: 8, cssVariables: {}, fontStacks: fonts('from-default') }),
  );
  // Boot derives a local Default theme in every tree; without one the package
  // fallback would serve this repo's own.
  writeFileSync(
    join(root, 'themes', 'default.json'),
    JSON.stringify({ name: 'Default', schemaVersion: 5, componentConfigs: {} }),
  );
  return root;
}

function dirs(root: string) {
  return { colorsAndTypeDir: join(root, 'colors-and-type'), themesDir: join(root, 'themes') };
}

function run(root: string, opts: Record<string, unknown> = {}, input: unknown = BASE_COLORS_FILE) {
  const baseColorsPath = join(root, 'base-colors.json');
  writeFileSync(baseColorsPath, JSON.stringify(input));
  return runSetColors({ baseColorsPath, engine, ...dirs(root), ...opts });
}

const readJson = (path: string) => JSON.parse(readFileSync(path, 'utf8'));
const buffer = (root: string) => readJson(join(root, 'colors-and-type', '_working.json'));
const hasBuffer = (root: string) => existsSync(join(root, 'colors-and-type', '_working.json'));

function openTheme(root: string, slug: string, colorsAndType: Record<string, unknown>) {
  writeFileSync(
    join(root, 'themes', `${slug}.json`),
    JSON.stringify({ name: slug, schemaVersion: 5, colorsAndType, componentConfigs: {} }),
  );
  writeFileSync(join(root, 'themes', '_active.json'), JSON.stringify({ activeFile: slug }));
}

afterEach(() => {
  while (roots.length) rmSync(roots.pop()!, { recursive: true, force: true });
});

describe('runSetColors', () => {
  it('writes the color state into the unsaved buffer', async () => {
    const root = project();
    const result = await run(root);

    expect(result.wrote).toBe('buffer');
    expect(result.source).toBe('default');
    const next = buffer(root);
    expect(Object.keys(next.editorConfigs)).toHaveLength(10);
    expect(next.harmonyAxes).toHaveLength(4);
    expect(next.cssVariables['--gradient-1']).toContain('var(--color-brand-400)');
  });

  it('writes no theme and moves no pointer', async () => {
    const root = project();
    openTheme(root, 'sunset', { name: 'Sunset', cssVariables: {} });
    const before = readdirSync(join(root, 'themes')).sort();
    const theme = readFileSync(join(root, 'themes', 'sunset.json'), 'utf8');
    const active = readFileSync(join(root, 'themes', '_active.json'), 'utf8');

    await run(root);

    expect(readdirSync(join(root, 'themes')).sort()).toEqual(before);
    expect(readFileSync(join(root, 'themes', 'sunset.json'), 'utf8')).toBe(theme);
    expect(readFileSync(join(root, 'themes', '_active.json'), 'utf8')).toBe(active);
    expect(readdirSync(join(root, 'colors-and-type')).sort()).toEqual(['_working.json', 'default.json']);
  });

  it('discards the buffer when the result matches what the open theme already holds', async () => {
    const root = project();
    openTheme(root, 'sunset', { name: 'Sunset', cssVariables: {} });
    await run(root);
    expect(hasBuffer(root)).toBe(true);

    // The theme now carries that color state, so building it again is a return
    // to saved rather than an edit.
    openTheme(root, 'sunset', buffer(root));
    const result = await run(root);

    expect(result.wrote).toBe('cleared');
    expect(hasBuffer(root)).toBe(false);
  });

  it('keeps the fonts of the buffer over the open theme over the package default', async () => {
    const root = project();
    expect((await run(root)).source).toBe('default');
    expect(buffer(root).fontStacks).toEqual(fonts('from-default'));

    rmSync(join(root, 'colors-and-type', '_working.json'));
    openTheme(root, 'sunset', { name: 'Sunset', cssVariables: {}, fontStacks: fonts('from-theme') });
    expect((await run(root)).source).toBe('theme');
    expect(buffer(root).fontStacks).toEqual(fonts('from-theme'));

    writeFileSync(
      join(root, 'colors-and-type', '_working.json'),
      JSON.stringify({ cssVariables: {}, fontStacks: fonts('from-buffer'), _source: 'working' }),
    );
    expect((await run(root)).source).toBe('working');
    expect(buffer(root).fontStacks).toEqual(fonts('from-buffer'));
    expect(buffer(root)).not.toHaveProperty('_source');
  });

  it('carries every override no palette owns, and replaces the shadow opacity', async () => {
    const root = project();
    openTheme(root, 'sunset', {
      name: 'Sunset',
      cssVariables: {
        '--radius-lg': '1rem',
        '--surface-brand': 'from-theme',
        '--shadow-md': '9px 9px 20px 2px hsla(20, 40%, 10%, 0.9)',
      },
    });

    await run(root);

    const vars = buffer(root).cssVariables;
    expect(vars['--radius-lg']).toBe('1rem');
    // A palette owns --surface-brand, so the derivation replaces it rather than
    // leaving a stale override in the bag.
    expect(vars['--surface-brand']).toBeUndefined();
    expect(vars['--shadow-md']).toBe('9px 9px 20px 2px hsla(20, 40%, 10%, 0.2)');
  });

  it('rebuilds stock swatch gradients and keeps tuned ones', async () => {
    const root = project();
    const stock = await run(root);
    expect(stock.report.gradients).toBe('recipes');
    expect(buffer(root).gradients[0].stops.map((s: { color: string }) => s.color)).toEqual([
      '--color-brand-400',
      '--color-brand-700',
    ]);

    const tuned = [
      {
        variable: '--gradient-1',
        type: 'linear',
        angle: 33,
        stops: [{ position: 0, color: '--color-brand-200' }, { position: 100, color: '--color-brand-900' }],
      },
    ];
    openTheme(root, 'sunset', { name: 'Sunset', cssVariables: {}, gradients: tuned });
    rmSync(join(root, 'colors-and-type', '_working.json'));

    const carried = await run(root);
    expect(carried.report.gradients).toBe('carried');
    expect(buffer(root).gradients).toEqual(tuned);
    expect(buffer(root).cssVariables['--gradient-1']).toContain('33deg');
  });

  it('reports a name in the base color file as ignored', async () => {
    const root = project();
    expect((await run(root)).ignoredName).toBe(null);
    expect((await run(root, {}, { ...BASE_COLORS_FILE, name: 'Spring Meadow' })).ignoredName).toBe('Spring Meadow');
  });

  it('writes nothing on a dry run', async () => {
    const root = project();
    const result = await run(root, { dryRun: true });

    expect(result.report.checks.length).toBeGreaterThan(0);
    expect(result.wrote).toBe(null);
    expect(hasBuffer(root)).toBe(false);
  });

  it('rejects a base color file that is not there or not JSON', async () => {
    const root = project();
    await expect(runSetColors({ baseColorsPath: join(root, 'nope.json'), engine, ...dirs(root) })).rejects.toThrow(
      /base color file not found/,
    );
    writeFileSync(join(root, 'bad.json'), '{');
    await expect(runSetColors({ baseColorsPath: join(root, 'bad.json'), engine, ...dirs(root) })).rejects.toThrow(
      /base color file is not valid JSON/,
    );
  });

  it('names the live file it could not parse', async () => {
    const root = project();
    writeFileSync(join(root, 'colors-and-type', '_working.json'), '{ "cssVariables":');
    await expect(run(root)).rejects.toThrow(/_working\.json is not valid JSON/);
  });
});

describe('formatSetColorsResult', () => {
  it('names the layer it read, the contrast report, and what to do next', async () => {
    const root = project();
    openTheme(root, 'sunset', { name: 'Sunset', cssVariables: {} });
    const out = formatSetColorsResult(await run(root));

    expect(out).toContain('Replaced the color identity, carrying everything else forward from theme "sunset"');
    expect(out).toContain('Contrast report (light scheme)');
    expect(out).toContain('Gradients: swatch tokens rebuilt from the theme families.');
    expect(out).toContain('or run save-theme to write a new one');
    expect(out).not.toContain('Opened');
  });

  it('names the open theme when the buffer is discarded against it', async () => {
    const root = project();
    openTheme(root, 'sunset', { name: 'Sunset', cssVariables: {} });
    await run(root);
    openTheme(root, 'sunset', buffer(root));

    expect(formatSetColorsResult(await run(root))).toContain(
      'That is what theme "sunset" already holds, so the unsaved buffer was discarded',
    );
  });

  it('names the package default, not a theme, when no theme is open', async () => {
    const root = project();
    await run(root);
    writeFileSync(join(root, 'colors-and-type', 'default.json'), JSON.stringify(buffer(root)));

    const out = formatSetColorsResult(await run(root));

    expect(out).toContain('That is what the package default already holds, so the unsaved buffer was discarded');
    expect(out).not.toContain('theme');
  });

  it('says nothing was written when the colors already match and no buffer exists', async () => {
    const root = project();
    await run(root);
    writeFileSync(join(root, 'colors-and-type', 'default.json'), JSON.stringify(buffer(root)));
    rmSync(join(root, 'colors-and-type', '_working.json'));

    expect(formatSetColorsResult(await run(root))).toContain(
      'That is what the package default already holds, and there was no unsaved buffer, so nothing was written',
    );
  });

  it('says nothing was written on a dry run, and names an ignored name', async () => {
    const root = project();
    const out = formatSetColorsResult(await run(root, { dryRun: true }, { ...BASE_COLORS_FILE, name: 'Spring Meadow' }));

    expect(out).toContain('Would replace the color identity');
    expect(out).toContain('Ignored "name": "Spring Meadow"');
    expect(out).toContain('name it when you run save-theme');
    expect(out).toContain('Dry run: nothing written under');
  });
});
