// @vitest-environment happy-dom
//
// Drives the panel against a fake server, because the two things at stake are
// orderings across services: the colors and type reach disk before a capture
// reads files, and one Adopt forks the protected look at most once.

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { flushSync, mount, unmount } from 'svelte';
import { API_BASE } from '../core/storage/apiBase';
import { activeFileName } from '../core/store/editorConfigStore';
import { mutate, setComponentAlias, __resetForTests } from '../core/store/editorStore';
import { activeManifest, colorsAndTypeProductionInfo } from '../core/productionPulse';
import { isPreviewing, __resetPreviewForTests } from '../core/preview/lookPreview';
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
  schemaVersion: 2,
  theme: COLORS_AND_TYPE,
  componentConfigs: {},
};

let target: HTMLDivElement;
let component: ReturnType<typeof mount> | null = null;
let calls: string[];
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
  const override = overrides[route];
  if (override) return override();
  switch (route) {
    case 'GET /manifests':
      return json({ files: [{ fileName: 'my-theme', name: 'My Theme' }] });
    case 'GET /themes':
      return json({ files: [{ fileName: 'my-colors', name: 'My Colors', isActive: true }] });
    case 'GET /manifests/active':
      return json(LOOK);
    case 'GET /themes/active':
      return json(COLORS_AND_TYPE);
    // A theme other than the live one, so the look reads out of sync and Adopt
    // is live.
    case 'GET /themes/production':
      return json({ fileName: 'shipped', name: 'Shipped', updatedAt: 'x', cssVariables: {} });
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
  activeFileName.set('my-colors');
  // Module-level caches: the panel remounts against them in the real editor,
  // and a leftover from the last test would answer for the fetch under test.
  colorsAndTypeProductionInfo.set(null);
  activeManifest.set(null);
  calls = [];
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

async function mountPanel() {
  component = mount(ThemePanel, { target, props: { showComponentsLink: false } });
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

function editComponent() {
  setComponentAlias('button', '--button-background', { kind: 'token', name: '--surface-high' });
  flushSync();
}

/** The dialog's own confirm — the panel's Save button carries the same label. */
const dialogSave = () => target.querySelector<HTMLButtonElement>('.ui-dialog-btn.primary')!;

describe('Save', () => {
  it('writes the colors and type before it captures the look', async () => {
    await mountPanel();
    editColors();

    button('Save').click();
    await settle();

    const colorsAndTypePut = calls.indexOf(`PUT /themes/my-colors`);
    const lookPut = calls.indexOf(`PUT /manifests/my-theme`);
    expect(colorsAndTypePut).toBeGreaterThan(-1);
    expect(lookPut).toBeGreaterThan(colorsAndTypePut);
  });

  it('writes nothing to the layer when the colors and type are saved', async () => {
    await mountPanel();

    button('Save').click();
    await settle();

    expect(calls).not.toContain('PUT /themes/my-colors');
    expect(calls).toContain('PUT /manifests/my-theme');
  });

  it('does not warn about colors and type it is about to write', async () => {
    await mountPanel();
    editColors();

    button('Save').click();
    await settle();

    expect(confirms).toEqual([]);
  });

  it('warns that a dirty component stays out, and says how many', async () => {
    await mountPanel();
    editComponent();

    button('Save').click();
    await settle();

    expect(confirms).toEqual([
      '1 component has unsaved edits. Those stay out until you save them in the '
        + 'component editor. Save the theme anyway?',
    ]);
  });
});

describe('Save As', () => {
  it('writes the colors and type before it captures the look', async () => {
    await mountPanel();
    editColors();

    button('Save As').click();
    await settle();
    const input = target.querySelector<HTMLInputElement>('.save-as-input')!;
    input.value = 'Fresh';
    input.dispatchEvent(new Event('input'));
    dialogSave().click();
    await settle();

    const colorsAndTypePut = calls.indexOf('PUT /themes/my-colors');
    expect(colorsAndTypePut).toBeGreaterThan(-1);
    expect(calls.indexOf('PUT /manifests/fresh')).toBeGreaterThan(colorsAndTypePut);
  });
});

// The editor's history counts component edits too, so a signal that reads it
// cannot stand in for "the colors and type differ from their file".
describe('Component-only edits', () => {
  it('leave the layer file alone on Save', async () => {
    await mountPanel();
    editComponent();

    button('Save').click();
    await settle();

    expect(calls.filter((c) => c.startsWith('PUT /themes/'))).toEqual([]);
    expect(calls).toContain('PUT /manifests/my-theme');
  });

  it('do not fork colors and type out of the protected Default look', async () => {
    overrides['GET /manifests/active'] = () => json({ ...LOOK, name: 'Default', _fileName: 'default' });
    overrides['GET /themes'] = () =>
      json({ files: [{ fileName: 'default', name: 'Default', isActive: true, isPackage: true }] });
    overrides['PUT /production'] = () =>
      json({ error: 'Active theme is protected.', code: 'ACTIVE_IS_PROTECTED' }, 409);
    await mountPanel();
    editComponent();

    button('Adopt').click();
    await settle();

    expect(calls.filter((c) => c.startsWith('PUT /themes/'))).toEqual([]);
  });
});

describe('Adopt', () => {
  it('flushes the colors and type, then ships', async () => {
    await mountPanel();
    editColors();

    button('Adopt').click();
    await settle();

    expect(calls.indexOf('PUT /production')).toBeGreaterThan(calls.indexOf('PUT /themes/my-colors'));
  });

  it('reads as neither state and stays clickable while production is unread', async () => {
    overrides['GET /themes/production'] = () => json({ error: 'nope' }, 500);
    await mountPanel();

    const status = target.querySelector('.mfm-prod-status')!;
    expect(status.textContent?.trim()).toBe('production unknown');
    expect(status.classList.contains('applied')).toBe(false);
    expect(button('Adopt').disabled).toBe(false);
  });

  it('forks the protected look once and gives up on a second refusal', async () => {
    overrides['PUT /production'] = () =>
      json({ error: 'Active theme is protected.', code: 'ACTIVE_IS_PROTECTED' }, 409);
    await mountPanel();

    button('Adopt').click();
    await settle();

    expect(calls.filter((c) => c === 'PUT /production')).toHaveLength(2);
    expect(calls.filter((c) => c.startsWith('PUT /manifests/my-theme'))).toHaveLength(1);
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
    overrides['GET /themes/my-colors'] = () => json(COLORS_AND_TYPE);
    await mountPanel();

    button('Load').click();
    await settle();
    button('My Colors').click();
    await settle();

    expect(alerts).toEqual([]);
    expect(isPreviewing()).toBe(true);
  });

  // Selecting the ACTIVE look is a designed no-op, so this previews another one.
  it('paints a look row', async () => {
    overrides['GET /manifests'] = () =>
      json({ files: [{ fileName: 'my-theme', name: 'My Theme' }, { fileName: 'ocean', name: 'Ocean' }] });
    overrides['GET /manifests/ocean'] = () => json({ ...LOOK, _fileName: 'ocean', name: 'Ocean' });
    overrides['GET /manifests/default'] = () =>
      json({ ...LOOK, _fileName: 'default', name: 'Default' });
    await mountPanel();

    button('Load').click();
    await settle();
    button('Ocean').click();
    await settle();

    expect(alerts).toEqual([]);
    expect(isPreviewing()).toBe(true);
  });
});
