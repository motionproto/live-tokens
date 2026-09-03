import { describe, it, expect, afterEach } from 'vitest';
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
// @ts-expect-error — plain .mjs module, no types
import * as liveState from './liveState.mjs';

const {
  componentNames,
  readActiveTheme,
  readLiveColorsAndType,
  readLiveComponentConfigs,
  readSavedColorsAndType,
  stripMarkers,
} = liveState;

const roots: string[] = [];

function project(components: string[] = ['button', 'card']): string {
  const root = mkdtempSync(join(tmpdir(), 'lt-live-state-'));
  roots.push(root);
  mkdirSync(join(root, 'colors-and-type'), { recursive: true });
  mkdirSync(join(root, 'themes'), { recursive: true });
  for (const comp of components) {
    mkdirSync(join(root, 'component-configs', comp), { recursive: true });
    write(root, `component-configs/${comp}/default.json`, {
      name: 'default',
      component: comp,
      aliases: { '--radius': 'from-default' },
    });
  }
  write(root, 'colors-and-type/default.json', { name: 'Default', cssVariables: { '--surface': 'from-default' } });
  return root;
}

function write(root: string, rel: string, value: unknown): void {
  writeFileSync(join(root, rel), JSON.stringify(value));
}

function dirs(root: string) {
  return {
    colorsAndTypeDir: join(root, 'colors-and-type'),
    componentConfigsDir: join(root, 'component-configs'),
    themesDir: join(root, 'themes'),
  };
}

function openTheme(root: string, slug: string, theme: Record<string, unknown>): void {
  write(root, `themes/${slug}.json`, { name: slug, schemaVersion: 5, ...theme });
  write(root, 'themes/_active.json', { activeFile: slug });
}

afterEach(() => {
  while (roots.length) rmSync(roots.pop()!, { recursive: true, force: true });
});

describe('readActiveTheme', () => {
  it('reads the slug _active.json names', () => {
    const root = project();
    openTheme(root, 'sunset', { colorsAndType: { name: 'Sunset' } });

    expect(readActiveTheme(dirs(root).themesDir)).toMatchObject({ slug: 'sunset' });
  });

  it('defaults to "default" with no _active.json', () => {
    const root = project();
    write(root, 'themes/default.json', { name: 'Local Default' });

    expect(readActiveTheme(dirs(root).themesDir)).toMatchObject({
      slug: 'default',
      theme: { name: 'Local Default' },
    });
  });

  it('falls back to the theme the installed package ships', () => {
    const root = project();

    const active = readActiveTheme(dirs(root).themesDir);

    expect(active.slug).toBe('default');
    expect(active.theme.colorsAndType).toBeTruthy();
  });

  it('answers null for a slug no layer carries', () => {
    const root = project();
    write(root, 'themes/_active.json', { activeFile: 'nothing-here' });

    expect(readActiveTheme(dirs(root).themesDir)).toBeNull();
    expect(readActiveTheme(undefined)).toBeNull();
  });
});

describe('readLiveColorsAndType', () => {
  it('prefers the unsaved buffer', () => {
    const root = project();
    openTheme(root, 'sunset', { colorsAndType: { cssVariables: { '--surface': 'from-theme' } } });
    write(root, 'colors-and-type/_working.json', { cssVariables: { '--surface': 'from-buffer' } });

    const active = readActiveTheme(dirs(root).themesDir);
    const live = readLiveColorsAndType(dirs(root).colorsAndTypeDir, active);

    expect(live.source).toBe('working');
    expect(live.colorsAndType.cssVariables['--surface']).toBe('from-buffer');
  });

  it('falls through to the open theme, then the shipped default', () => {
    const root = project();
    openTheme(root, 'sunset', { colorsAndType: { cssVariables: { '--surface': 'from-theme' } } });

    const withTheme = readLiveColorsAndType(
      dirs(root).colorsAndTypeDir,
      readActiveTheme(dirs(root).themesDir),
    );
    expect(withTheme.source).toBe('theme');
    expect(withTheme.colorsAndType.cssVariables['--surface']).toBe('from-theme');

    const withoutTheme = readLiveColorsAndType(dirs(root).colorsAndTypeDir, null);
    expect(withoutTheme.source).toBe('default');
    expect(withoutTheme.colorsAndType.cssVariables['--surface']).toBe('from-default');
  });

  it('strips read-door markers', () => {
    const root = project();
    write(root, 'colors-and-type/_working.json', {
      cssVariables: {},
      _fileName: 'sunset',
      _source: 'working',
    });

    const { colorsAndType } = readLiveColorsAndType(dirs(root).colorsAndTypeDir, null);

    expect(colorsAndType).not.toHaveProperty('_fileName');
    expect(colorsAndType).not.toHaveProperty('_source');
  });

  it('falls back to the default the installed package ships', () => {
    const root = project();
    rmSync(join(root, 'colors-and-type', 'default.json'));

    const live = readLiveColorsAndType(dirs(root).colorsAndTypeDir, null);

    expect(live.source).toBe('default');
    expect(live.colorsAndType.cssVariables['--surface']).toBeUndefined();
    expect(live.colorsAndType.fontStacks).toBeTruthy();
  });
});

describe('readSavedColorsAndType', () => {
  it('answers the layer under the buffer, never the buffer', () => {
    const root = project();
    openTheme(root, 'sunset', { colorsAndType: { cssVariables: { '--surface': 'from-theme' } } });
    write(root, 'colors-and-type/_working.json', { cssVariables: { '--surface': 'from-buffer' } });

    const active = readActiveTheme(dirs(root).themesDir);

    expect(readSavedColorsAndType(dirs(root).colorsAndTypeDir, active).cssVariables['--surface']).toBe(
      'from-theme',
    );
    expect(readSavedColorsAndType(dirs(root).colorsAndTypeDir, null).cssVariables['--surface']).toBe(
      'from-default',
    );
  });
});

describe('readLiveComponentConfigs', () => {
  it('resolves buffer, then the open theme, then the shipped default', () => {
    const root = project(['button', 'card', 'panel']);
    openTheme(root, 'sunset', {
      componentConfigs: { card: { name: 'sunset', aliases: { '--radius': 'from-theme' } } },
    });
    write(root, 'component-configs/button/_working.json', {
      name: 'edited',
      aliases: { '--radius': 'from-buffer' },
    });

    const active = readActiveTheme(dirs(root).themesDir);
    const { configs, sources } = readLiveComponentConfigs(dirs(root).componentConfigsDir, active);

    expect(configs.button.aliases['--radius']).toBe('from-buffer');
    expect(configs.card.aliases['--radius']).toBe('from-theme');
    expect(configs.panel.aliases['--radius']).toBe('from-default');
    expect(sources).toEqual({ button: 'working', card: 'theme', panel: 'theme' });
  });

  it('strips read-door markers', () => {
    const root = project(['button']);
    write(root, 'component-configs/button/_working.json', {
      name: 'edited',
      aliases: {},
      _fileName: 'sunset',
      _source: 'working',
    });

    const { configs } = readLiveComponentConfigs(dirs(root).componentConfigsDir, null);

    expect(configs.button).not.toHaveProperty('_fileName');
    expect(configs.button).not.toHaveProperty('_source');
  });

  it('falls back to the default the installed package ships', () => {
    const root = project(['button']);
    rmSync(join(root, 'component-configs', 'button', 'default.json'));

    const { configs } = readLiveComponentConfigs(dirs(root).componentConfigsDir, null);

    expect(configs.button.component).toBe('button');
    expect(configs.button.aliases['--radius']).toBeUndefined();
  });

  it('skips a component no layer answers for', () => {
    const root = project(['button']);
    mkdirSync(join(root, 'component-configs', 'ghost'));

    const { configs, sources } = readLiveComponentConfigs(dirs(root).componentConfigsDir, null);

    expect(Object.keys(configs)).toEqual(['button']);
    expect(sources).toEqual({ button: 'theme' });
  });
});

describe('componentNames', () => {
  it('sorts the directories and ignores files', () => {
    const root = project(['tooltip', 'button']);
    writeFileSync(join(root, 'component-configs', 'notes.txt'), 'x');

    expect(componentNames(dirs(root).componentConfigsDir)).toEqual(['button', 'tooltip']);
    expect(componentNames(join(root, 'nowhere'))).toEqual([]);
  });
});

describe('stripMarkers', () => {
  it('leaves a non-object alone', () => {
    expect(stripMarkers(null)).toBeNull();
    expect(stripMarkers('x')).toBe('x');
  });
});
