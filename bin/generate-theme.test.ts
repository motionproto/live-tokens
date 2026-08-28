import { describe, it, expect, afterEach } from 'vitest';
import { mkdtempSync, mkdirSync, rmSync, readFileSync, existsSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { buildColorsAndTypeFromSeeds } from '../src/editor/core/themes/generateColorsAndType';
import type { Oklch } from '../src/editor/core/palettes/oklch';
// @ts-expect-error — plain .mjs module, no types
import { runGenerateTheme, formatGenerateThemeResult } from './generate-theme.mjs';
import { THEME_SCHEMA_VERSION } from '../vite-plugin/themes/normalizeTheme';
import { CURRENT_COMPONENT_SCHEMA_VERSION } from '../src/editor/core/themes/migrations';

const engine = { buildColorsAndTypeFromSeeds, CURRENT_COMPONENT_SCHEMA_VERSION };

const SEEDS: Record<string, Oklch> = {
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

const BRIEF = { name: 'Spring Meadow', scheme: 'light', seeds: SEEDS };

const roots: string[] = [];

function project(components: string[] = ['button', 'card']): string {
  const root = mkdtempSync(join(tmpdir(), 'lt-gen-'));
  roots.push(root);
  mkdirSync(join(root, 'colors-and-type'), { recursive: true });
  mkdirSync(join(root, 'themes'), { recursive: true });
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
    JSON.stringify({
      name: 'Default',
      schemaVersion: 3,
      colorsAndType: { name: 'Default', cssVariables: { '--badge-trait-surface': 'var(--surface-brand)' }, fontStacks: [] },
      componentConfigs: {},
    }),
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

function run(root: string, opts: Record<string, unknown> = {}, brief: unknown = BRIEF) {
  const briefPath = join(root, 'brief.json');
  writeFileSync(briefPath, JSON.stringify(brief));
  return runGenerateTheme({ briefPath, engine, ...dirs(root), ...opts });
}

const readJson = (path: string) => JSON.parse(readFileSync(path, 'utf8'));

function openTheme(root: string, slug: string, theme: Record<string, unknown>) {
  writeFileSync(join(root, 'themes', `${slug}.json`), JSON.stringify({ schemaVersion: 3, ...theme }));
  writeFileSync(join(root, 'themes', '_active.json'), JSON.stringify({ activeFile: slug }));
}

afterEach(() => {
  while (roots.length) rmSync(roots.pop()!, { recursive: true, force: true });
});

describe('runGenerateTheme', () => {
  it('writes a theme document and opens it', async () => {
    const root = project();
    const result = await run(root);

    expect(result.slug).toBe('spring-meadow');
    const theme = readJson(join(root, 'themes', 'spring-meadow.json'));
    expect(theme.name).toBe('Spring Meadow');
    expect(theme.schemaVersion).toBe(THEME_SCHEMA_VERSION);
    expect(Object.keys(theme.colorsAndType.editorConfigs)).toHaveLength(10);

    expect(readJson(join(root, 'themes', '_active.json')).activeFile).toBe('spring-meadow');
    expect(existsSync(join(root, 'colors-and-type', '_working.json'))).toBe(false);
  });

  // Without this stamp `normalizeTheme` reads `componentSchemaVersion ?? 0`
  // and replays every component migration on every read, forever — the TTL
  // Wave 1 built never fires for a theme this CLI produces.
  it('stamps the current component schema version', async () => {
    const root = project();
    await run(root);

    const theme = readJson(join(root, 'themes', 'spring-meadow.json'));
    expect(theme.componentSchemaVersion).toBe(CURRENT_COMPONENT_SCHEMA_VERSION);
  });

  it('writes no named colors-and-type file and never touches production', async () => {
    const root = project();
    await run(root);

    expect(existsSync(join(root, 'colors-and-type', 'spring-meadow.json'))).toBe(false);
    expect(existsSync(join(root, 'colors-and-type', '_active.json'))).toBe(false);
    expect(existsSync(join(root, 'themes', '_production.json'))).toBe(false);
  });

  it('carries the live theme forward: buffers first, then the open theme', async () => {
    const root = project();
    openTheme(root, 'sunset', {
      name: 'Sunset',
      colorsAndType: { name: 'Sunset', cssVariables: { '--badge-trait-surface': 'from-theme' } },
      componentConfigs: { card: { name: 'sunset', aliases: { '--card-radius': '--radius-lg' } } },
    });
    writeFileSync(
      join(root, 'colors-and-type', '_working.json'),
      JSON.stringify({ cssVariables: { '--badge-trait-surface': 'from-buffer' }, _source: 'working' }),
    );
    writeFileSync(
      join(root, 'component-configs', 'button', '_working.json'),
      JSON.stringify({ name: 'edited', component: 'button', aliases: { '--button-radius': '--radius-sm' } }),
    );

    const result = await run(root);

    const theme = readJson(join(root, 'themes', 'spring-meadow.json'));
    expect(theme.colorsAndType.cssVariables['--badge-trait-surface']).toBe('from-buffer');
    expect(theme.componentConfigs.button.aliases['--button-radius']).toBe('--radius-sm');
    expect(theme.componentConfigs.card.aliases['--card-radius']).toBe('--radius-lg');
    expect(result.componentsCarried).toBe(2);
    expect(result.previousActive).toBe('sunset');
  });

  // Correction 1 of docs/plans/theme-completeness.md: the live path was
  // missing the third resolution layer `bin/adjust.mjs` and the dev server
  // both have, so a component neither the open theme nor a buffer carried
  // was silently dropped instead of falling through to its default.
  it('fills the gaps of an incomplete open theme from the component defaults', async () => {
    const root = project(['button', 'card', 'panel']);
    openTheme(root, 'sunset', {
      name: 'Sunset',
      colorsAndType: { name: 'Sunset' },
      componentConfigs: { card: { name: 'sunset', aliases: { '--card-radius': '--radius-lg' } } },
    });

    const result = await run(root);

    const theme = readJson(join(root, 'themes', 'spring-meadow.json'));
    expect(theme.componentConfigs.card.aliases['--card-radius']).toBe('--radius-lg');
    expect(theme.componentConfigs.button).toEqual(
      readJson(join(root, 'component-configs', 'button', 'default.json')),
    );
    expect(theme.componentConfigs.panel).toEqual(
      readJson(join(root, 'component-configs', 'panel', 'default.json')),
    );
    expect(result.componentsCarried).toBe(3);
  });

  it('strips read-door markers from what it embeds', async () => {
    const root = project();
    writeFileSync(
      join(root, 'colors-and-type', '_working.json'),
      JSON.stringify({ cssVariables: {}, _fileName: 'sunset', _source: 'working' }),
    );
    await run(root);

    const theme = readJson(join(root, 'themes', 'spring-meadow.json'));
    expect(theme.colorsAndType).not.toHaveProperty('_fileName');
    expect(theme.colorsAndType).not.toHaveProperty('_source');
  });

  it('clears the buffer of a component the new theme does not carry', async () => {
    const root = project();
    writeFileSync(
      join(root, 'component-configs', 'card', '_working.json'),
      JSON.stringify({ name: 'edited', component: 'card', aliases: {} }),
    );
    openTheme(root, 'sunset', {
      name: 'Sunset',
      colorsAndType: { name: 'Sunset' },
      componentConfigs: {},
    });

    // `--carry-from default` names a theme that carries no entries of its own;
    // `card` comes from the shipped default, not from this edited buffer, and
    // the buffer is cleared either way.
    await run(root, { carryFrom: 'default' });

    expect(existsSync(join(root, 'component-configs', 'card', '_working.json'))).toBe(false);
  });

  // Correction 1 of docs/plans/theme-completeness.md: `--carry-from` copied
  // only the entries the source theme happened to hold, so an incomplete
  // source produced an incomplete result.
  it('fills the gaps of an incomplete --carry-from theme from the component defaults', async () => {
    const root = project(['button', 'card', 'panel']);
    writeFileSync(
      join(root, 'themes', 'ocean.json'),
      JSON.stringify({
        name: 'Ocean',
        schemaVersion: 3,
        colorsAndType: { cssVariables: { '--badge-trait-surface': 'from-ocean' } },
        componentConfigs: { button: { name: 'ocean', aliases: { '--button-radius': '--radius-xl' } } },
      }),
    );

    const result = await run(root, { carryFrom: 'ocean' });

    const theme = readJson(join(root, 'themes', 'spring-meadow.json'));
    expect(theme.componentConfigs.button.aliases['--button-radius']).toBe('--radius-xl');
    expect(theme.componentConfigs.card).toEqual(
      readJson(join(root, 'component-configs', 'card', 'default.json')),
    );
    expect(theme.componentConfigs.panel).toEqual(
      readJson(join(root, 'component-configs', 'panel', 'default.json')),
    );
    expect(result.componentsCarried).toBe(3);
  });

  it('carries from a named theme instead of the live state', async () => {
    const root = project();
    writeFileSync(
      join(root, 'colors-and-type', '_working.json'),
      JSON.stringify({ cssVariables: { '--badge-trait-surface': 'from-buffer' } }),
    );
    writeFileSync(
      join(root, 'themes', 'ocean.json'),
      JSON.stringify({
        name: 'Ocean',
        schemaVersion: 3,
        colorsAndType: { cssVariables: { '--badge-trait-surface': 'from-ocean' } },
        componentConfigs: { button: { name: 'ocean', aliases: { '--button-radius': '--radius-xl' } } },
      }),
    );

    const result = await run(root, { carryFrom: 'ocean' });

    const theme = readJson(join(root, 'themes', 'spring-meadow.json'));
    expect(theme.colorsAndType.cssVariables['--badge-trait-surface']).toBe('from-ocean');
    expect(theme.componentConfigs.button.aliases['--button-radius']).toBe('--radius-xl');
    expect(result.carriedFrom).toBe('ocean');
  });

  it('rejects an unknown --carry-from theme', async () => {
    const root = project();
    await expect(run(root, { carryFrom: 'nope' })).rejects.toThrow(/--carry-from theme "nope" not found/);
  });

  it('keeps createdAt when regenerating an existing slug', async () => {
    const root = project();
    await run(root);
    const first = readJson(join(root, 'themes', 'spring-meadow.json'));

    const second = await run(root);
    expect(readJson(join(root, 'themes', 'spring-meadow.json')).createdAt).toBe(first.createdAt);
    expect(second.existed).toBe(true);
  });

  it('leaves the open theme alone with activate false', async () => {
    const root = project();
    await run(root, { activate: false });

    expect(existsSync(join(root, 'themes', 'spring-meadow.json'))).toBe(true);
    expect(existsSync(join(root, 'themes', '_active.json'))).toBe(false);
    expect(existsSync(join(root, 'colors-and-type', '_working.json'))).toBe(false);
  });

  it('writes nothing on a dry run', async () => {
    const root = project();
    const result = await run(root, { dryRun: true });

    expect(result.report.checks.length).toBeGreaterThan(0);
    expect(existsSync(join(root, 'themes', 'spring-meadow.json'))).toBe(false);
    expect(existsSync(join(root, 'colors-and-type', '_working.json'))).toBe(false);
  });

  it('rejects a brief that is not there or not JSON', async () => {
    const root = project();
    await expect(runGenerateTheme({ briefPath: join(root, 'nope.json'), engine, ...dirs(root) })).rejects.toThrow(
      /brief not found/,
    );
    writeFileSync(join(root, 'bad.json'), '{');
    await expect(runGenerateTheme({ briefPath: join(root, 'bad.json'), engine, ...dirs(root) })).rejects.toThrow(
      /not valid JSON/,
    );
  });
});

describe('formatGenerateThemeResult', () => {
  it('names the theme file, the carry source and the open document', async () => {
    const root = project();
    const out = formatGenerateThemeResult(await run(root));

    expect(out).toContain('Created theme "Spring Meadow"');
    expect(out).toContain('themes/spring-meadow.json');
    expect(out).toContain('Carried forward from the live state');
    expect(out).toContain('Opened "spring-meadow" (previously open: "default")');
    expect(out).toContain('Adopt it there to publish it');
    expect(out).toContain('Contrast report (light scheme)');
  });

  it('says nothing was written on a dry run', async () => {
    const root = project();
    const out = formatGenerateThemeResult(await run(root, { dryRun: true }));

    expect(out).toContain('Would write theme "Spring Meadow"');
    expect(out).not.toContain('Opened');
  });
});
