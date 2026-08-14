// @vitest-environment happy-dom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { get } from 'svelte/store';
import type { ComponentConfig, Manifest, ColorsAndType } from '../themes/themeTypes';
import { API_BASE } from '../storage/apiBase';
import {
  editorState,
  loadFromFile,
  seedComponentsFromApi,
  __resetForTests,
} from '../store/editorStore';
import {
  manifestLook,
  colorsAndTypeLook,
  liveLook,
  previewManifest,
  previewColorsAndType,
  revertPreview,
  isPreviewing,
  __resetPreviewForTests,
} from './lookPreview';

// A font-face source, not a google one: applyFontSources injects the real node
// and happy-dom would go to the network for a <link href>.
const MOUNTAINS = {
  id: 'src_preset_mountains',
  kind: 'font-face' as const,
  cssText: '@font-face { font-family: "Mountains of Christmas"; src: local("Mountains of Christmas"); }',
  families: [
    {
      id: 'src_preset_mountains:mountains-of-christmas',
      name: 'Mountains of Christmas',
      cssName: '"Mountains of Christmas"',
    },
  ],
};

const CINZEL = {
  id: 'src_preset_cinzel',
  kind: 'font-face' as const,
  cssText: '@font-face { font-family: "Cinzel"; src: local("Cinzel"); }',
  families: [{ id: 'src_preset_cinzel:cinzel', name: 'Cinzel', cssName: '"Cinzel"' }],
};

function colorsAndType(cssVariables: Record<string, string>, extra: Partial<ColorsAndType> = {}): ColorsAndType {
  return {
    name: 'T',
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    editorConfigs: {},
    cssVariables,
    fontSources: [MOUNTAINS],
    fontStacks: [
      {
        variable: '--font-display',
        slots: [
          { kind: 'project', familyId: 'src_preset_mountains:mountains-of-christmas' },
          { kind: 'generic', value: 'serif' },
        ],
      },
    ],
    ...extra,
  };
}

function config(component: string, aliases: Record<string, string>): ComponentConfig {
  return {
    name: component,
    component,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    aliases,
    schemaVersion: 3,
  };
}

function manifest(
  name: string,
  colorsAndTypeValue: ColorsAndType,
  componentConfigs: Record<string, ComponentConfig>,
): Manifest {
  return {
    name,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    schemaVersion: 2,
    theme: colorsAndTypeValue,
    componentConfigs,
    _fileName: name,
  };
}

const defaults = manifest('default', colorsAndType({ '--surface-canvas': '#ffffff' }), {
  card: config('card', { '--card-default-radius': '--radius-lg' }),
  button: config('button', {
    '--button-primary-radius': '--radius-xl',
    '--button-primary-padding': '--space-8',
  }),
  badge: config('badge', { '--badge-default-radius': '--radius-sm' }),
});

const yuletide = manifest('yuletide', colorsAndType({ '--surface-canvas': '#0b3d2e' }), {
  card: config('card', { '--card-default-radius': '--radius-3xl' }),
  button: config('button', {
    '--button-primary-radius': '--radius-full',
    '--button-primary-padding': '--space-8',
  }),
});

describe('manifestLook', () => {
  it('overlays the manifest configs on the default set', () => {
    const { vars } = manifestLook(yuletide, defaults);
    expect(vars['--card-default-radius']).toBe('var(--radius-3xl)');
    expect(vars['--button-primary-radius']).toBe('var(--radius-full)');
    expect(vars['--surface-canvas']).toBe('#0b3d2e');
  });

  it('renders components the manifest omits from their default config', () => {
    const { vars } = manifestLook(yuletide, defaults);
    expect(vars['--badge-default-radius']).toBe('var(--radius-sm)');
  });

  it('skips configs for components this install does not have', () => {
    const withStat = manifest('stat-look', colorsAndType({}), {
      stat: config('stat', { '--stat-default-radius': '--radius-none' }),
    });
    const { vars } = manifestLook(withStat, defaults);
    expect(vars).not.toHaveProperty('--stat-default-radius');
  });

  it('resolves the embedded font stacks into --font-* values', () => {
    const { vars, fontSources } = manifestLook(yuletide, defaults);
    expect(vars['--font-display']).toBe('"Mountains of Christmas", serif');
    expect(fontSources.map((s) => s.id)).toContain('src_preset_mountains');
  });
});

const royalVelvet = colorsAndType(
  { '--surface-canvas': '#2b1b45' },
  {
    fontSources: [CINZEL],
    fontStacks: [
      {
        variable: '--font-display',
        slots: [
          { kind: 'project', familyId: 'src_preset_cinzel:cinzel' },
          { kind: 'generic', value: 'serif' },
        ],
      },
    ],
  },
);

describe('colorsAndTypeLook', () => {
  beforeEach(() => {
    __resetForTests();
    __resetPreviewForTests();
    loadFromFile(colorsAndType({ '--surface-canvas': '#111111' }));
    seedComponentsFromApi({
      card: { activeFile: 'my-card', aliases: { '--card-default-radius': '--radius-md' } },
    });
  });

  it('swaps the colors-and-type vars and keeps the live component ones', () => {
    const { vars } = colorsAndTypeLook(royalVelvet);
    expect(vars['--surface-canvas']).toBe('#2b1b45');
    expect(vars['--card-default-radius']).toBe('var(--radius-md)');
  });

  it('resolves the candidate font stacks and reports its sources', () => {
    const { vars, fontSources } = colorsAndTypeLook(royalVelvet);
    expect(vars['--font-display']).toBe('"Cinzel", serif');
    expect(fontSources.map((s) => s.id)).toEqual(['src_preset_cinzel']);
  });

  it('live component aliases win over values the colors-and-type file carries for them', () => {
    const { vars } = colorsAndTypeLook(colorsAndType({ '--card-default-radius': 'var(--radius-none)' }));
    expect(vars['--card-default-radius']).toBe('var(--radius-md)');
  });

  it('paints colors-and-type vars for component names the live slice does not alias', () => {
    const { vars } = colorsAndTypeLook(colorsAndType({ '--card-default-padding': 'var(--space-99)' }));
    expect(vars['--card-default-padding']).toBe('var(--space-99)');
  });
});

// What the Load window's "colors and type only" toggle does to a look row: the
// same look, through the other engine.
describe('a look previewed colors and type only', () => {
  beforeEach(() => {
    __resetForTests();
    __resetPreviewForTests();
    loadFromFile(colorsAndType({ '--surface-canvas': '#111111' }));
    seedComponentsFromApi({
      card: { activeFile: 'my-card', aliases: { '--card-default-radius': '--radius-md' } },
    });
  });

  it('takes the colors-and-type half and leaves the components as the user has them', () => {
    const { vars } = colorsAndTypeLook(yuletide.theme);
    expect(vars['--surface-canvas']).toBe('#0b3d2e');
    expect(vars['--card-default-radius']).toBe('var(--radius-md)');
  });

  it('differs from the whole look on the component half alone', () => {
    const whole = manifestLook(yuletide, defaults).vars;
    const colors = colorsAndTypeLook(yuletide.theme).vars;
    expect(whole['--surface-canvas']).toBe(colors['--surface-canvas']);
    expect(whole['--font-display']).toBe(colors['--font-display']);
    expect(whole['--card-default-radius']).toBe('var(--radius-3xl)');
  });
});

describe('liveLook', () => {
  beforeEach(() => {
    __resetForTests();
    __resetPreviewForTests();
  });

  it('derives from the editor store, not the DOM', () => {
    loadFromFile(colorsAndType({ '--surface-canvas': '#111111' }));
    seedComponentsFromApi({
      card: { activeFile: 'my-card', aliases: { '--card-default-radius': '--radius-md' } },
    });
    document.documentElement.style.setProperty('--card-default-radius', 'var(--radius-none)');

    const { vars } = liveLook();
    expect(vars['--card-default-radius']).toBe('var(--radius-md)');
    expect(vars['--surface-canvas']).toBe('#111111');
    expect(vars['--font-display']).toBe('"Mountains of Christmas", serif');
  });
});

describe('previewManifest', () => {
  const requests: string[] = [];

  beforeEach(() => {
    __resetForTests();
    __resetPreviewForTests();
    requests.length = 0;
    document.documentElement.removeAttribute('style');
    vi.stubGlobal('fetch', async (url: string, init?: RequestInit) => {
      requests.push(`${init?.method ?? 'GET'} ${url}`);
      return new Response(JSON.stringify(defaults), {
        headers: { 'Content-Type': 'application/json' },
      });
    });
    loadFromFile(colorsAndType({ '--surface-canvas': '#111111', '--live-only': '1px' }));
    seedComponentsFromApi({
      card: { activeFile: 'my-card', aliases: { '--card-default-radius': '--radius-md' } },
    });
  });

  afterEach(() => {
    revertPreview();
    vi.unstubAllGlobals();
  });

  const read = (name: string) => document.documentElement.style.getPropertyValue(name);

  it('paints the manifest look and restores the live one on revert', async () => {
    await previewManifest(yuletide);
    expect(isPreviewing()).toBe(true);
    expect(read('--card-default-radius')).toBe('var(--radius-3xl)');
    expect(read('--surface-canvas')).toBe('#0b3d2e');
    expect(read('--badge-default-radius')).toBe('var(--radius-sm)');

    revertPreview();
    expect(isPreviewing()).toBe(false);
    expect(read('--card-default-radius')).toBe('var(--radius-md)');
    expect(read('--surface-canvas')).toBe('#111111');
    expect(read('--badge-default-radius')).toBe('');
  });

  it('restores vars the live state carries and the preview drops', async () => {
    await previewManifest(yuletide);
    expect(read('--live-only')).toBe('');
    revertPreview();
    expect(read('--live-only')).toBe('1px');
  });

  it('re-previewing diffs against the live look, not the previous preview', async () => {
    const halloween = manifest('halloween', colorsAndType({ '--surface-canvas': '#4d2300' }), {
      card: config('card', { '--card-default-radius': '--radius-none' }),
      spooky: config('spooky', { '--spooky-glow': '1' }),
    });

    await previewManifest(yuletide);
    await previewManifest(halloween);
    expect(read('--card-default-radius')).toBe('var(--radius-none)');
    expect(read('--surface-canvas')).toBe('#4d2300');
    expect(read('--button-primary-radius')).toBe('var(--radius-xl)');

    revertPreview();
    expect(read('--card-default-radius')).toBe('var(--radius-md)');
    expect(read('--surface-canvas')).toBe('#111111');
    expect(read('--live-only')).toBe('1px');
    expect(read('--badge-default-radius')).toBe('');
    expect(read('--button-primary-radius')).toBe('');

    revertPreview();
    expect(read('--card-default-radius')).toBe('var(--radius-md)');
  });

  it('leaves the editor store untouched', async () => {
    const before = JSON.stringify(get(editorState));
    await previewManifest(yuletide);
    expect(JSON.stringify(get(editorState))).toBe(before);
    revertPreview();
    expect(JSON.stringify(get(editorState))).toBe(before);
  });

  it('reads only, so a capture of the look still sees the saved files', async () => {
    await previewManifest(yuletide);
    expect(requests).toEqual([`GET ${API_BASE}/manifests/default`]);
  });
});

describe('previewColorsAndType', () => {
  beforeEach(() => {
    __resetForTests();
    __resetPreviewForTests();
    document.documentElement.removeAttribute('style');
    vi.stubGlobal(
      'fetch',
      async () =>
        new Response(JSON.stringify(defaults), {
          headers: { 'Content-Type': 'application/json' },
        }),
    );
    loadFromFile(colorsAndType({ '--surface-canvas': '#111111', '--live-only': '1px' }));
    seedComponentsFromApi({
      card: { activeFile: 'my-card', aliases: { '--card-default-radius': '--radius-md' } },
    });
  });

  afterEach(() => {
    revertPreview();
    vi.unstubAllGlobals();
  });

  const read = (name: string) => document.documentElement.style.getPropertyValue(name);

  it('paints the colors and type over the live components and restores on revert', () => {
    previewColorsAndType(royalVelvet);
    expect(read('--surface-canvas')).toBe('#2b1b45');
    expect(read('--font-display')).toBe('"Cinzel", serif');
    expect(read('--card-default-radius')).toBe('var(--radius-md)');
    expect(read('--live-only')).toBe('');

    revertPreview();
    expect(isPreviewing()).toBe(false);
    expect(read('--surface-canvas')).toBe('#111111');
    expect(read('--font-display')).toBe('"Mountains of Christmas", serif');
    expect(read('--live-only')).toBe('1px');
  });

  it('hands a live colors-and-type preview over to a manifest preview and back', async () => {
    previewColorsAndType(royalVelvet);
    await previewManifest(yuletide);
    expect(read('--surface-canvas')).toBe('#0b3d2e');
    expect(read('--card-default-radius')).toBe('var(--radius-3xl)');
    expect(read('--font-display')).toBe('"Mountains of Christmas", serif');

    revertPreview();
    expect(read('--surface-canvas')).toBe('#111111');
    expect(read('--card-default-radius')).toBe('var(--radius-md)');
    expect(read('--badge-default-radius')).toBe('');
    expect(read('--live-only')).toBe('1px');
  });

  it('drops a manifest preview cleanly when a colors-and-type preview follows it', async () => {
    await previewManifest(yuletide);
    previewColorsAndType(royalVelvet);
    expect(read('--surface-canvas')).toBe('#2b1b45');
    expect(read('--card-default-radius')).toBe('var(--radius-md)');
    expect(read('--badge-default-radius')).toBe('');
  });

  it('commits by reverting first, so the load repaints from the store', () => {
    previewColorsAndType(royalVelvet);
    // What Save does: hand the page back, then hydrate the file.
    revertPreview();
    loadFromFile(royalVelvet);
    expect(read('--surface-canvas')).toBe('#2b1b45');
    expect(read('--card-default-radius')).toBe('var(--radius-md)');
    expect(read('--live-only')).toBe('');
  });

  it('reverting first cannot strand a var the hydrated file no longer carries', () => {
    // The renderer diffs against its own last-applied set, which never saw the
    // preview's writes: skipping the revert leaves --preview-only painted
    // forever when the committed file diverges from the previewed one.
    previewColorsAndType(colorsAndType({ '--surface-canvas': '#2b1b45', '--preview-only': '2px' }));
    expect(read('--preview-only')).toBe('2px');

    revertPreview();
    loadFromFile(royalVelvet);
    expect(read('--preview-only')).toBe('');
    expect(read('--surface-canvas')).toBe('#2b1b45');
  });
});
