// @vitest-environment happy-dom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { get } from 'svelte/store';
import type { ComponentConfig, Theme, ColorsAndType } from '../themes/themeTypes';
import { CURRENT_COMPONENT_SCHEMA_VERSION } from '../themes/migrations';
import { THEME_SCHEMA_VERSION } from '../themes/themeTypes';
import { API_BASE } from '../storage/apiBase';
import { CSS_VAR_CHANGE_EVENT, CSS_VARS_CHANGE_EVENT } from '../cssVarSync';
import {
  editorState,
  loadFromFile,
  seedComponentsFromApi,
  __resetForTests,
} from '../store/editorStore';
import {
  themeLook,
  colorsAndTypeLook,
  liveLook,
  previewTheme,
  previewColorsAndType,
  revertPreview,
  commitPreview,
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

function theme(
  name: string,
  colorsAndTypeValue: ColorsAndType,
  componentConfigs: Record<string, ComponentConfig>,
): Theme {
  return {
    name,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    schemaVersion: THEME_SCHEMA_VERSION,
    colorsAndType: colorsAndTypeValue,
    componentConfigs,
    componentSchemaVersion: CURRENT_COMPONENT_SCHEMA_VERSION,
    _fileName: name,
  };
}

const defaults = theme('default', colorsAndType({ '--surface-canvas': '#ffffff' }), {
  card: config('card', { '--card-default-radius': '--radius-lg' }),
  button: config('button', {
    '--button-primary-radius': '--radius-xl',
    '--button-primary-padding': '--space-8',
  }),
  badge: config('badge', { '--badge-default-radius': '--radius-sm' }),
});

const yuletide = theme('yuletide', colorsAndType({ '--surface-canvas': '#0b3d2e' }), {
  card: config('card', { '--card-default-radius': '--radius-3xl' }),
  button: config('button', {
    '--button-primary-radius': '--radius-full',
    '--button-primary-padding': '--space-8',
  }),
});

describe('themeLook', () => {
  it('overlays the theme configs on the default set', () => {
    const { vars } = themeLook(yuletide, defaults);
    expect(vars['--card-default-radius']).toBe('var(--radius-3xl)');
    expect(vars['--button-primary-radius']).toBe('var(--radius-full)');
    expect(vars['--surface-canvas']).toBe('#0b3d2e');
  });

  it('renders components the theme omits from their default config', () => {
    const { vars } = themeLook(yuletide, defaults);
    expect(vars['--badge-default-radius']).toBe('var(--radius-sm)');
  });

  it('skips configs for components this install does not have', () => {
    const withStat = theme('stat-look', colorsAndType({}), {
      stat: config('stat', { '--stat-default-radius': '--radius-none' }),
    });
    const { vars } = themeLook(withStat, defaults);
    expect(vars).not.toHaveProperty('--stat-default-radius');
  });

  it('migrates a config the theme embedded at an older stamp', () => {
    const stale = theme('stale', colorsAndType({}), {
      card: config('card', { '--card-default-title-line-height': '--line-height-md' }),
    });
    const { vars } = themeLook(stale, defaults);
    expect(vars['--card-default-title-line-height']).toBe('var(--line-height-normal)');
  });

  it('resolves the embedded font stacks into --font-* values', () => {
    const { vars, fontSources } = themeLook(yuletide, defaults);
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
      card: { aliases: { '--card-default-radius': '--radius-md' } },
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
      card: { aliases: { '--card-default-radius': '--radius-md' } },
    });
  });

  it('takes the colors-and-type half and leaves the components as the user has them', () => {
    const { vars } = colorsAndTypeLook(yuletide.colorsAndType);
    expect(vars['--surface-canvas']).toBe('#0b3d2e');
    expect(vars['--card-default-radius']).toBe('var(--radius-md)');
  });

  it('differs from the whole look on the component half alone', () => {
    const whole = themeLook(yuletide, defaults).vars;
    const colors = colorsAndTypeLook(yuletide.colorsAndType).vars;
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
      card: { aliases: { '--card-default-radius': '--radius-md' } },
    });
    document.documentElement.style.setProperty('--card-default-radius', 'var(--radius-none)');

    const { vars } = liveLook();
    expect(vars['--card-default-radius']).toBe('var(--radius-md)');
    expect(vars['--surface-canvas']).toBe('#111111');
    expect(vars['--font-display']).toBe('"Mountains of Christmas", serif');
  });
});

describe('previewTheme', () => {
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
      card: { aliases: { '--card-default-radius': '--radius-md' } },
    });
  });

  afterEach(() => {
    revertPreview();
    vi.unstubAllGlobals();
  });

  const read = (name: string) => document.documentElement.style.getPropertyValue(name);

  it('paints the theme look and restores the live one on revert', async () => {
    await previewTheme(yuletide);
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
    await previewTheme(yuletide);
    expect(read('--live-only')).toBe('');
    revertPreview();
    expect(read('--live-only')).toBe('1px');
  });

  it('re-previewing diffs directly from the previous preview', async () => {
    const halloween = theme('halloween', colorsAndType({ '--surface-canvas': '#4d2300' }), {
      card: config('card', { '--card-default-radius': '--radius-none' }),
      spooky: config('spooky', { '--spooky-glow': '1' }),
    });

    await previewTheme(yuletide);
    const changedNames: string[] = [];
    const batches: string[][] = [];
    const onChange = (event: Event) => changedNames.push(
      (event as CustomEvent<{ name: string }>).detail.name,
    );
    const onBatch = (event: Event) => batches.push(
      (event as CustomEvent<{ names: string[] }>).detail.names,
    );
    document.addEventListener(CSS_VAR_CHANGE_EVENT, onChange);
    document.addEventListener(CSS_VARS_CHANGE_EVENT, onBatch);
    await previewTheme(halloween);
    document.removeEventListener(CSS_VAR_CHANGE_EVENT, onChange);
    document.removeEventListener(CSS_VARS_CHANGE_EVENT, onBatch);

    // The canvas changes once, yuletide → halloween. The former
    // yuletide → live → halloween route emitted it twice.
    expect(changedNames.filter((name) => name === '--surface-canvas')).toHaveLength(1);
    expect(batches).toHaveLength(1);
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
    await previewTheme(yuletide);
    expect(JSON.stringify(get(editorState))).toBe(before);
    revertPreview();
    expect(JSON.stringify(get(editorState))).toBe(before);
  });

  it('hands an accepted preview to the following store load without repainting live', async () => {
    await previewTheme(yuletide);
    const changedNames: string[] = [];
    const onChange = (event: Event) => changedNames.push(
      (event as CustomEvent<{ name: string }>).detail.name,
    );
    document.addEventListener(CSS_VAR_CHANGE_EVENT, onChange);

    commitPreview();
    document.removeEventListener(CSS_VAR_CHANGE_EVENT, onChange);

    expect(isPreviewing()).toBe(false);
    expect(changedNames).toEqual([]);
    expect(read('--surface-canvas')).toBe('#0b3d2e');
    expect(read('--card-default-radius')).toBe('var(--radius-3xl)');
  });

  it('reads only, so a capture of the look still sees the saved files', async () => {
    await previewTheme(yuletide);
    expect(requests).toEqual([`GET ${API_BASE}/themes/default`]);
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
      card: { aliases: { '--card-default-radius': '--radius-md' } },
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

  it('hands a live colors-and-type preview over to a theme preview and back', async () => {
    previewColorsAndType(royalVelvet);
    await previewTheme(yuletide);
    expect(read('--surface-canvas')).toBe('#0b3d2e');
    expect(read('--card-default-radius')).toBe('var(--radius-3xl)');
    expect(read('--font-display')).toBe('"Mountains of Christmas", serif');

    revertPreview();
    expect(read('--surface-canvas')).toBe('#111111');
    expect(read('--card-default-radius')).toBe('var(--radius-md)');
    expect(read('--badge-default-radius')).toBe('');
    expect(read('--live-only')).toBe('1px');
  });

  it('drops a theme preview cleanly when a colors-and-type preview follows it', async () => {
    await previewTheme(yuletide);
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
