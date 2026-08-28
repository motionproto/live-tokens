// @vitest-environment happy-dom
//
// Drives the panel against a fake server, because the two things at stake are
// orderings across services: the colors and type reach the buffer before a
// capture reads it, and Adopt saves the theme it is about to publish.

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { flushSync, mount, unmount } from 'svelte';
import { get } from 'svelte/store';
import { API_BASE } from '../core/storage/apiBase';
import { openThemeSlug } from '../core/store/editorConfigStore';
import { mutate, setComponentAlias, __resetForTests } from '../core/store/editorStore';
import { CURRENT_COMPONENT_SCHEMA_VERSION } from '../core/themes/migrations';
import { liveMovedSinceBake, productionTheme } from '../core/productionPulse';
import { isPreviewing, __resetPreviewForTests } from '../core/preview/themePreview';
import { editorView } from '../core/store/editorViewStore';
import ThemePanel from './ThemePanel.svelte';

const COLORS_AND_TYPE = {
  name: 'My Colors',
  createdAt: 'x',
  updatedAt: 'x',
  editorConfigs: {},
  cssVariables: {},
};

const LOOK = {
  name: 'My Theme',
  _fileName: 'my-theme',
  createdAt: 'x',
  updatedAt: 'x',
  schemaVersion: 3,
  colorsAndType: COLORS_AND_TYPE,
  componentConfigs: {},
};

let target: HTMLDivElement;
let component: ReturnType<typeof mount> | null = null;
let calls: string[];
let requestBodies: Array<{ route: string; body: unknown }>;
let confirms: string[];
/** Route → response, consulted before the defaults. */
let overrides: Record<string, () => Response>;

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

function server(url: string, init?: RequestInit): Response {
  const route = `${init?.method ?? 'GET'} ${url.replace(API_BASE, '')}`;
  calls.push(route);
  if (typeof init?.body === 'string') {
    requestBodies.push({ route, body: JSON.parse(init.body) });
  }
  const override = overrides[route];
  if (override) return override();
  switch (route) {
    case 'GET /themes':
      return json({ files: [{ fileName: 'my-theme', name: 'My Theme' }] });
    case 'GET /colors-and-type':
      return json({ files: [{ fileName: 'my-colors', name: 'My Colors' }] });
    case 'GET /themes/active':
      return json(LOOK);
    case 'GET /colors-and-type/active':
      return json({ ...COLORS_AND_TYPE, _fileName: 'my-theme', _source: 'working' });
    // A theme other than the open one, so the theme reads out of sync and Adopt
    // is live.
    case 'GET /themes/production':
      return json({ ...LOOK, _fileName: 'shipped', name: 'Shipped' });
    case 'GET /component-configs':
      return json({ components: [] });
    default:
      return json({ ok: true });
  }
}

/** Let the panel's chain of awaited fetches settle. Each turn of the macrotask
 *  queue drains every microtask the last one scheduled, so a handful covers a
 *  chain that awaits its way through several doors. */
async function settle(rounds = 6) {
  for (let i = 0; i < rounds; i++) {
    await new Promise((resolve) => setTimeout(resolve, 0));
    flushSync();
  }
}

const button = (label: string) =>
  Array.from(target.querySelectorAll('button')).find((b) => b.textContent?.includes(label))!;

beforeEach(async () => {
  __resetForTests();
  openThemeSlug.set('my-theme');
  // Module-level state: the panel remounts against it in the real editor, and a
  // leftover from the last test would answer for the run under test.
  productionTheme.set(null);
  liveMovedSinceBake.set(false);
  calls = [];
  requestBodies = [];
  confirms = [];
  overrides = {};
  vi.stubGlobal('fetch', async (url: string, init?: RequestInit) => server(url, init));
  vi.stubGlobal('confirm', (message: string) => {
    confirms.push(message);
    return true;
  });
  document.body.innerHTML = '';
  target = document.createElement('div');
  document.body.appendChild(target);
});

afterEach(() => {
  if (component) {
    unmount(component);
    component = null;
  }
  vi.unstubAllGlobals();
});

async function mountPanel(showComponentsLink = false) {
  component = mount(ThemePanel, { target, props: { showComponentsLink } });
  flushSync();
  await settle();
  calls.length = 0;
}

function editColors() {
  mutate('edit', (s) => {
    s.cssVars['--surface-canvas'] = '#123456';
  });
  flushSync();
}

function editComponent(componentName = 'button') {
  setComponentAlias(componentName, `--${componentName}-background`, { kind: 'token', name: '--surface-high' });
  flushSync();
}

/** The dialog's own confirm — the panel's Save button carries the same label. */
const dialogSave = () => target.querySelector<HTMLButtonElement>('.ui-dialog-btn.primary')!;

describe('Save', () => {
  it('writes the colors and type to the buffer before it captures the theme', async () => {
    await mountPanel();
    editColors();

    button('Save').click();
    await settle();

    const bufferPut = calls.indexOf('PUT /colors-and-type/working');
    const themePut = calls.indexOf('PUT /themes/my-theme');
    expect(bufferPut).toBeGreaterThan(-1);
    expect(themePut).toBeGreaterThan(bufferPut);
  });

  it('writes no buffer when the colors and type are unchanged', async () => {
    await mountPanel();

    button('Save').click();
    await settle();

    expect(calls).not.toContain('PUT /colors-and-type/working');
    expect(calls).toContain('PUT /themes/my-theme');
  });

  it('never writes a named colors-and-type file', async () => {
    await mountPanel();
    editColors();

    button('Save').click();
    await settle();

    expect(calls.filter((c) => c.startsWith('PUT /colors-and-type/'))).toEqual([
      'PUT /colors-and-type/working',
    ]);
  });

  it('does not warn about colors and type it is about to write', async () => {
    await mountPanel();
    editColors();

    button('Save').click();
    await settle();

    expect(confirms).toEqual([]);
  });

  it('offers to save every dirty component before it captures the theme', async () => {
    await mountPanel();
    editComponent();
    editComponent('card');

    button('Save').click();
    await settle();

    expect(target.querySelector('.ui-dialog-title')?.textContent).toBe('Unsaved component edits');
    expect(dialogSave().textContent?.trim()).toBe('Save all components');
    expect(calls).not.toContain('PUT /component-configs/button/working');
    expect(calls).not.toContain('PUT /themes/my-theme');

    dialogSave().click();
    await settle();

    const buttonPut = calls.indexOf('PUT /component-configs/button/working');
    const cardPut = calls.indexOf('PUT /component-configs/card/working');
    const themePut = calls.indexOf('PUT /themes/my-theme');
    expect(buttonPut).toBeGreaterThan(-1);
    expect(cardPut).toBeGreaterThan(-1);
    expect(themePut).toBeGreaterThan(buttonPut);
    expect(themePut).toBeGreaterThan(cardPut);
    const buttonBody = requestBodies.find(
      (request) => request.route === 'PUT /component-configs/button/working',
    )?.body as { aliases: Record<string, string>; schemaVersion: number };
    expect(buttonBody.aliases['--button-background']).toBe('--surface-high');
    expect(buttonBody.schemaVersion).toBe(CURRENT_COMPONENT_SCHEMA_VERSION);
    expect(confirms).toEqual([]);
  });

  it('cancels without saving when dirty components need review', async () => {
    await mountPanel();
    editComponent();

    button('Save').click();
    await settle();
    target.querySelector<HTMLButtonElement>('.ui-dialog-btn:not(.primary)')!.click();
    await settle();

    expect(calls).not.toContain('PUT /component-configs/button/working');
    expect(calls).not.toContain('PUT /themes/my-theme');
  });
});

describe('Save As', () => {
  it('writes the buffer before it captures the theme', async () => {
    await mountPanel();
    editColors();

    button('Save As').click();
    await settle();
    const input = target.querySelector<HTMLInputElement>('.save-as-input')!;
    input.value = 'Fresh';
    input.dispatchEvent(new Event('input'));
    dialogSave().click();
    await settle();

    const bufferPut = calls.indexOf('PUT /colors-and-type/working');
    expect(bufferPut).toBeGreaterThan(-1);
    expect(calls.indexOf('PUT /themes/fresh')).toBeGreaterThan(bufferPut);
  });
});

// The editor's history counts component edits too, so a signal that reads it
// cannot stand in for "the colors and type differ from what the server holds".
describe('Component-only edits', () => {
  it('write the component buffer without touching colors and type', async () => {
    await mountPanel();
    editComponent();

    button('Save').click();
    await settle();
    dialogSave().click();
    await settle();

    expect(calls.filter((c) => c.startsWith('PUT /colors-and-type/'))).toEqual([]);
    expect(calls).toContain('PUT /component-configs/button/working');
    expect(calls).toContain('PUT /themes/my-theme');
  });
});

describe('Adopt', () => {
  it('flushes the colors and type, saves the theme, then ships', async () => {
    await mountPanel();
    editColors();

    button('Adopt').click();
    await settle();

    const bufferPut = calls.indexOf('PUT /colors-and-type/working');
    const themePut = calls.indexOf('PUT /themes/my-theme');
    expect(themePut).toBeGreaterThan(bufferPut);
    expect(calls.indexOf('PUT /production')).toBeGreaterThan(themePut);
  });

  it('flushes dirty components before it saves and ships the theme', async () => {
    await mountPanel();
    editComponent();

    button('Adopt').click();
    await settle();
    expect(dialogSave().textContent?.trim()).toBe('Save component');
    dialogSave().click();
    await settle();

    const componentPut = calls.indexOf('PUT /component-configs/button/working');
    const themePut = calls.indexOf('PUT /themes/my-theme');
    expect(componentPut).toBeGreaterThan(-1);
    expect(themePut).toBeGreaterThan(componentPut);
    expect(calls.indexOf('PUT /production')).toBeGreaterThan(themePut);
  });

  it('reads as neither state and stays clickable while production is unread', async () => {
    overrides['GET /themes/production'] = () => json({ error: 'nope' }, 500);
    await mountPanel();

    const status = target.querySelector('.mfm-prod-status')!;
    expect(status.textContent?.trim()).toBe('production unknown');
    expect(status.classList.contains('applied')).toBe(false);
    expect(button('Adopt').disabled).toBe(false);
  });

  it('reads as out of sync once the theme is saved past what shipped', async () => {
    overrides['GET /themes/production'] = () => json(LOOK);
    await mountPanel();
    expect(target.querySelector('.mfm-prod-status')!.textContent?.trim()).toBe('in production');

    button('Save').click();
    await settle();

    expect(target.querySelector('.mfm-prod-status')!.textContent?.trim()).toBe('out of sync');
  });

  it('forks the protected theme, then ships the fork', async () => {
    overrides['GET /themes/active'] = () => json({ ...LOOK, name: 'Default', _fileName: 'default' });
    overrides['GET /themes'] = () => json({ files: [{ fileName: 'default', name: 'Default' }] });
    await mountPanel();

    button('Adopt').click();
    await settle();

    expect(calls).toContain('PUT /themes/my-theme');
    expect(calls).toContain('PUT /themes/active');
    expect(calls.filter((c) => c === 'PUT /production')).toHaveLength(1);
    expect(calls.filter((c) => c.startsWith('PUT /colors-and-type/'))).toEqual([]);
  });
});

// The preview engine structuredClones what it is handed, and a fetched file
// held in deep `$state` arrives as an uncloneable proxy — every row select
// alerted "Failed to preview theme" instead of painting.
describe('Load preview', () => {
  let alerts: string[];

  beforeEach(() => {
    alerts = [];
    vi.stubGlobal('alert', (message: string) => alerts.push(message));
    __resetPreviewForTests();
  });

  it('paints a colors-and-type row', async () => {
    overrides['GET /colors-and-type/my-colors'] = () => json(COLORS_AND_TYPE);
    await mountPanel();

    button('Load').click();
    await settle();
    button('My Colors').click();
    await settle();

    expect(alerts).toEqual([]);
    expect(isPreviewing()).toBe(true);
  });

  // Selecting the OPEN theme is a designed no-op, so this previews another one.
  it('paints a theme row', async () => {
    overrides['GET /themes'] = () =>
      json({ files: [{ fileName: 'my-theme', name: 'My Theme' }, { fileName: 'ocean', name: 'Ocean' }] });
    overrides['GET /themes/ocean'] = () => json({ ...LOOK, _fileName: 'ocean', name: 'Ocean' });
    overrides['GET /themes/default'] = () =>
      json({ ...LOOK, _fileName: 'default', name: 'Default' });
    await mountPanel();

    button('Load').click();
    await settle();
    button('Ocean').click();
    await settle();

    expect(alerts).toEqual([]);
    expect(isPreviewing()).toBe(true);
  });

  it('opens the Theme Picker when the current theme name is clicked', async () => {
    await mountPanel();

    target.querySelector<HTMLButtonElement>('.theme-name-trigger')!.click();
    await settle();

    expect(target.querySelector('.ui-dialog-title')?.textContent).toBe('Theme Picker');
  });

  it('loads and adopts a selected theme with the picker Save action', async () => {
    const ocean = { ...LOOK, _fileName: 'ocean', name: 'Ocean' };
    let active = LOOK;
    overrides['GET /themes/active'] = () => json(active);
    overrides['GET /themes'] = () =>
      json({ files: [{ fileName: 'my-theme', name: 'My Theme' }, { fileName: 'ocean', name: 'Ocean' }] });
    overrides['GET /themes/ocean'] = () => json(ocean);
    overrides['GET /themes/default'] = () =>
      json({ ...LOOK, _fileName: 'default', name: 'Default' });
    overrides['PUT /themes/ocean/apply'] = () => {
      active = ocean;
      return json({
        ok: true,
        theme: ocean,
        colorsAndType: COLORS_AND_TYPE,
        componentConfigs: {},
        skippedComponents: [],
        filled: { components: [], aliases: 0, orphans: 0 },
      });
    };
    await mountPanel();

    button('Load').click();
    await settle();
    button('Ocean').click();
    await settle();
    calls.length = 0;
    dialogSave().click();
    await settle(10);

    const apply = calls.indexOf('PUT /themes/ocean/apply');
    const adopt = calls.indexOf('PUT /production');
    expect(apply).toBeGreaterThan(-1);
    expect(adopt).toBeGreaterThan(apply);
    expect(get(openThemeSlug)).toBe('ocean');
    expect(isPreviewing()).toBe(false);
  });

  it('loads colors and type alone into the buffer, leaving named files alone', async () => {
    overrides['GET /colors-and-type/my-colors'] = () => json(COLORS_AND_TYPE);
    await mountPanel();

    button('Load').click();
    await settle();
    button('My Colors').click();
    await settle();
    calls.length = 0;
    dialogSave().click();
    await settle();

    expect(calls.filter((c) => c.startsWith('PUT /colors-and-type/'))).toEqual([
      'PUT /colors-and-type/working',
    ]);
    expect(isPreviewing()).toBe(false);
  });
});

describe('Theme-part Open pills', () => {
  const pill = (title: string) => target.querySelector<HTMLButtonElement>(`button[title="${title}"]`);
  const components = () => pill('Open the component editors');
  const sketchSettings = () => pill('Open the Sketchstyle view');

  afterEach(() => editorView.set('tokens'));

  it('hides both where the panel renders outside the view switcher', async () => {
    await mountPanel(false);
    expect(components()).toBeNull();
    expect(sketchSettings()).toBeNull();
  });

  it('shows both inside the editor shell', async () => {
    await mountPanel(true);
    expect(components()).not.toBeNull();
    expect(sketchSettings()).not.toBeNull();
  });

  it('hides only the pill for the view already open', async () => {
    editorView.set('sketch');
    await mountPanel(true);
    expect(sketchSettings()).toBeNull();
    expect(components()).not.toBeNull();
  });
});
