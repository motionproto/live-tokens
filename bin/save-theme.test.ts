import { describe, it, expect, afterEach } from 'vitest';
import { mkdtempSync, mkdirSync, rmSync, readFileSync, existsSync, writeFileSync, readdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { sanitizeFileName } from '../src/editor/core/storage/files/versionedFileResourceClient';
import { CURRENT_COMPONENT_SCHEMA_VERSION } from '../src/editor/core/themes/migrations';
import { THEME_SCHEMA_VERSION } from '../vite-plugin/themes/normalizeTheme';
// @ts-expect-error — plain .mjs module, no types
import { runSaveTheme, formatSaveThemeResult } from './save-theme.mjs';

const engine = { sanitizeFileName, CURRENT_COMPONENT_SCHEMA_VERSION };

const roots: string[] = [];

function project(components: string[] = ['button', 'card']): string {
  const root = mkdtempSync(join(tmpdir(), 'lt-save-theme-'));
  roots.push(root);
  mkdirSync(join(root, 'colors-and-type'), { recursive: true });
  mkdirSync(join(root, 'themes'), { recursive: true });
  writeFileSync(
    join(root, 'colors-and-type', 'default.json'),
    JSON.stringify({ name: 'Default', schemaVersion: 8, cssVariables: { '--radius-lg': 'from-default' } }),
  );
  for (const comp of components) {
    mkdirSync(join(root, 'component-configs', comp), { recursive: true });
    writeFileSync(
      join(root, 'component-configs', comp, 'default.json'),
      JSON.stringify({ name: 'default', component: comp, aliases: {} }),
    );
  }
  // Boot derives a local Default theme in every tree; without one the package
  // fallback would serve this repo's own.
  writeFileSync(
    join(root, 'themes', 'default.json'),
    JSON.stringify({ name: 'Default', schemaVersion: THEME_SCHEMA_VERSION, componentConfigs: {} }),
  );
  return root;
}

function dirs(root: string) {
  return {
    colorsAndTypeDir: join(root, 'colors-and-type'),
    componentConfigsDir: join(root, 'component-configs'),
    themesDir: join(root, 'themes'),
  };
}

function run(root: string, opts: Record<string, unknown> = {}) {
  return runSaveTheme({ name: 'Audit Check', engine, ...dirs(root), ...opts });
}

const readJson = (path: string) => JSON.parse(readFileSync(path, 'utf8'));
const saved = (root: string) => readJson(join(root, 'themes', 'audit-check.json'));
const activeFile = (root: string) => readJson(join(root, 'themes', '_active.json')).activeFile;

function openTheme(root: string, slug: string, theme: Record<string, unknown>) {
  writeFileSync(
    join(root, 'themes', `${slug}.json`),
    JSON.stringify({ name: slug, schemaVersion: THEME_SCHEMA_VERSION, componentConfigs: {}, ...theme }),
  );
  writeFileSync(join(root, 'themes', '_active.json'), JSON.stringify({ activeFile: slug }));
}

function colorsBuffer(root: string, colorsAndType: Record<string, unknown>) {
  writeFileSync(join(root, 'colors-and-type', '_working.json'), JSON.stringify(colorsAndType));
}

function componentBuffer(root: string, comp: string, config: Record<string, unknown>) {
  writeFileSync(join(root, 'component-configs', comp, '_working.json'), JSON.stringify(config));
}

afterEach(() => {
  while (roots.length) rmSync(roots.pop()!, { recursive: true, force: true });
});

describe('runSaveTheme', () => {
  it('composes every layer, buffers first', async () => {
    const root = project();
    openTheme(root, 'sunset', {
      colorsAndType: { name: 'Sunset', cssVariables: { '--radius-lg': 'from-theme' } },
      componentConfigs: { card: { name: 'sunset', component: 'card', aliases: { '--card-radius': '--radius-lg' } } },
    });
    colorsBuffer(root, { name: 'Sunset', cssVariables: { '--radius-lg': 'from-buffer' } });
    componentBuffer(root, 'button', { name: 'edited', component: 'button', aliases: { '--button-radius': '--radius-sm' } });

    const result = await run(root);

    const theme = saved(root);
    expect(theme.name).toBe('Audit Check');
    expect(theme.schemaVersion).toBe(THEME_SCHEMA_VERSION);
    expect(theme.componentSchemaVersion).toBe(CURRENT_COMPONENT_SCHEMA_VERSION);
    expect(theme.colorsAndType.cssVariables['--radius-lg']).toBe('from-buffer');
    // The document names itself at both levels; the buffer's own name is stale.
    expect(theme.colorsAndType.name).toBe('Audit Check');
    expect(theme.componentConfigs.button.aliases['--button-radius']).toBe('--radius-sm');
    expect(theme.componentConfigs.card.aliases['--card-radius']).toBe('--radius-lg');
    expect(result.buffered).toEqual({ colorsAndType: true, components: ['button'] });
    expect(result.previousActive).toBe('sunset');
  });

  it('fills a component the open theme omits from its shipped default', async () => {
    const root = project(['button', 'card', 'panel']);
    openTheme(root, 'sunset', {
      colorsAndType: { name: 'Sunset', cssVariables: {} },
      componentConfigs: { card: { name: 'sunset', component: 'card', aliases: { '--card-radius': '--radius-lg' } } },
    });

    const result = await run(root);

    const theme = saved(root);
    expect(theme.componentConfigs.card.aliases['--card-radius']).toBe('--radius-lg');
    expect(theme.componentConfigs.button).toEqual(readJson(join(root, 'component-configs', 'button', 'default.json')));
    expect(theme.componentConfigs.panel).toEqual(readJson(join(root, 'component-configs', 'panel', 'default.json')));
    expect(result.components).toBe(3);
    expect(result.buffered.components).toEqual([]);
  });

  it('carries the open theme sketch settings', async () => {
    const root = project();
    openTheme(root, 'sunset', {
      colorsAndType: { name: 'Sunset', cssVariables: {} },
      sketchSettings: { enabled: true, style: 'pencil' },
    });

    const result = await run(root);

    expect(saved(root).sketchSettings).toEqual({ enabled: true, style: 'pencil' });
    expect(result.sketchSettings).toBe(true);
  });

  it('strips the read-door markers from what it embeds', async () => {
    const root = project();
    colorsBuffer(root, { name: 'Sunset', cssVariables: {}, _fileName: 'sunset', _source: 'working' });
    componentBuffer(root, 'button', { name: 'edited', component: 'button', aliases: {}, _source: 'working' });

    await run(root);

    const theme = saved(root);
    expect(theme.colorsAndType).not.toHaveProperty('_fileName');
    expect(theme.colorsAndType).not.toHaveProperty('_source');
    expect(theme.componentConfigs.button).not.toHaveProperty('_source');
  });

  it('refuses the protected default name', async () => {
    const root = project();
    await expect(run(root, { name: 'Default' })).rejects.toThrow(/protected package theme/);
    await expect(run(root, { name: '  ' })).rejects.toThrow(/needs a theme name/);
    expect(readdirSync(join(root, 'themes')).sort()).toEqual(['default.json']);
  });

  it('keeps createdAt when saving over an existing slug', async () => {
    const root = project();
    const first = await run(root);
    expect(first.existed).toBe(false);
    expect(saved(root).createdAt).toBe(saved(root).updatedAt);

    writeFileSync(
      join(root, 'themes', 'audit-check.json'),
      JSON.stringify({ ...saved(root), createdAt: '2020-01-01T00:00:00.000Z' }),
    );
    const second = await run(root);

    expect(second.existed).toBe(true);
    expect(saved(root).createdAt).toBe('2020-01-01T00:00:00.000Z');
    expect(saved(root).updatedAt).not.toBe('2020-01-01T00:00:00.000Z');
  });

  it('opens the theme and clears every buffer', async () => {
    const root = project();
    openTheme(root, 'sunset', { colorsAndType: { name: 'Sunset', cssVariables: {} } });
    colorsBuffer(root, { name: 'Sunset', cssVariables: { '--radius-lg': 'from-buffer' } });
    componentBuffer(root, 'button', { name: 'edited', component: 'button', aliases: {} });

    const result = await run(root);

    expect(result.activated).toBe(true);
    expect(activeFile(root)).toBe('audit-check');
    expect(existsSync(join(root, 'colors-and-type', '_working.json'))).toBe(false);
    expect(existsSync(join(root, 'component-configs', 'button', '_working.json'))).toBe(false);
    expect(existsSync(join(root, 'themes', '_production.json'))).toBe(false);
  });

  it('leaves the buffers and the open theme alone with activate false', async () => {
    const root = project();
    openTheme(root, 'sunset', { colorsAndType: { name: 'Sunset', cssVariables: {} } });
    colorsBuffer(root, { name: 'Sunset', cssVariables: { '--radius-lg': 'from-buffer' } });

    const result = await run(root, { activate: false });

    expect(result.activated).toBe(false);
    expect(existsSync(join(root, 'themes', 'audit-check.json'))).toBe(true);
    expect(activeFile(root)).toBe('sunset');
    expect(readJson(join(root, 'colors-and-type', '_working.json')).cssVariables['--radius-lg']).toBe('from-buffer');
  });

  it('saves a copy of the open theme when nothing is unsaved', async () => {
    const root = project();
    openTheme(root, 'sunset', {
      colorsAndType: { name: 'Sunset', cssVariables: { '--radius-lg': 'from-theme' } },
    });

    const result = await run(root);

    expect(result.buffered).toEqual({ colorsAndType: false, components: [] });
    expect(saved(root).colorsAndType.cssVariables['--radius-lg']).toBe('from-theme');
    expect(readJson(join(root, 'themes', 'sunset.json')).name).toBe('sunset');
  });

  it('writes nothing on a dry run', async () => {
    const root = project();
    colorsBuffer(root, { name: 'Sunset', cssVariables: {} });
    const before = readdirSync(join(root, 'themes')).sort();

    const result = await run(root, { dryRun: true });

    expect(result.activated).toBe(false);
    expect(readdirSync(join(root, 'themes')).sort()).toEqual(before);
    expect(existsSync(join(root, 'colors-and-type', '_working.json'))).toBe(true);
  });
});

describe('formatSaveThemeResult', () => {
  it('names the file, the unsaved layers it kept, and the theme it opened', async () => {
    const root = project();
    openTheme(root, 'sunset', { colorsAndType: { name: 'Sunset', cssVariables: {} } });
    colorsBuffer(root, { name: 'Sunset', cssVariables: {} });
    componentBuffer(root, 'button', { name: 'edited', component: 'button', aliases: {} });

    const out = formatSaveThemeResult(await run(root));

    expect(out).toContain('Created theme "Audit Check"');
    expect(out).toContain('themes/audit-check.json');
    expect(out).toContain('Saved your unsaved edits: colors and type, button.');
    expect(out).toContain('Everything else came from the open theme "sunset"');
    expect(out).toContain('Opened "audit-check" (previously open: "sunset")');
    expect(out).toContain('Adopt it there to publish it');
  });

  it('says a run with no buffers copied the open theme', async () => {
    const root = project();
    openTheme(root, 'sunset', { colorsAndType: { name: 'Sunset', cssVariables: {} } });

    const out = formatSaveThemeResult(await run(root));

    expect(out).toContain('No unsaved edits; saved a copy of the open theme "sunset".');
  });

  it('says what --no-activate and --dry-run did instead', async () => {
    const root = project();
    expect(formatSaveThemeResult(await run(root, { activate: false }))).toContain('Not opened (--no-activate)');
    expect(formatSaveThemeResult(await run(root, { dryRun: true }))).toContain('Dry run: nothing written under');
  });
});
