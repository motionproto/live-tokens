// @vitest-environment happy-dom
//
// Mount-level, because what is at stake is whether the bar can still ship what
// the user just saved. Saving writes the working buffer, which the last bake
// never saw, so the document identities alone would read as "already live".

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { flushSync, mount, unmount } from 'svelte';
import { API_BASE } from '../../core/storage/apiBase';
import { setComponentAlias, __resetForTests } from '../../core/store/editorStore';
import { liveMovedSinceBake, productionTheme } from '../../core/productionPulse';
import ComponentFileManager from './ComponentFileManager.svelte';

const CONFIG = {
  name: 'My Theme',
  component: 'button',
  createdAt: 'x',
  updatedAt: 'x',
  aliases: {},
  config: {},
};

/** Production ships the theme the editor has open, and it carries this
 *  component: the state where every identity agrees. */
const THEME = {
  name: 'My Theme',
  _fileName: 'my-theme',
  createdAt: 'x',
  updatedAt: 'x',
  schemaVersion: 3,
  colorsAndType: { name: 'My Theme', createdAt: 'x', updatedAt: 'x', editorConfigs: {}, cssVariables: {} },
  componentConfigs: { button: CONFIG },
};

let target: HTMLDivElement;
let component: ReturnType<typeof mount> | null = null;
let calls: string[];

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

function server(url: string, init?: RequestInit): Response {
  const route = `${init?.method ?? 'GET'} ${url.replace(API_BASE, '')}`;
  calls.push(route);
  switch (route) {
    case 'GET /component-configs/button':
      return json({ files: [{ fileName: 'default', name: 'Default', updatedAt: 'x' }] });
    case 'GET /component-configs/button/active':
      return json({ ...CONFIG, _fileName: 'my-theme', _source: 'working' });
    // A capture reads the live doors for every layer, which is how a component
    // Adopt ships the whole theme.
    case 'GET /component-configs':
      return json({ components: [{ name: 'button', source: 'working' }] });
    case 'GET /colors-and-type/active':
      return json({ ...THEME.colorsAndType, _fileName: 'my-theme', _source: 'working' });
    case 'GET /themes/active':
      return json(THEME);
    case 'GET /themes/production':
      return json(THEME);
    default:
      return json({ ok: true });
  }
}

async function settle(rounds = 6) {
  for (let i = 0; i < rounds; i++) {
    await new Promise((resolve) => setTimeout(resolve, 0));
    flushSync();
  }
}

const adoptButton = () =>
  Array.from(target.querySelectorAll('button')).find((b) => b.textContent?.includes('Adopt'))!;

async function mountBar() {
  component = mount(ComponentFileManager, { target, props: { component: 'button' } });
  flushSync();
  await settle();
  calls.length = 0;
}

function editComponent() {
  setComponentAlias('button', '--button-background', { kind: 'token', name: '--surface-high' });
  flushSync();
}

/** The bar's own Save, which it binds on window rather than rendering. */
function pressSave() {
  window.dispatchEvent(new KeyboardEvent('keydown', { key: 's', metaKey: true }));
}

beforeEach(() => {
  __resetForTests();
  liveMovedSinceBake.set(false);
  productionTheme.set(null);
  calls = [];
  vi.stubGlobal('fetch', async (url: string, init?: RequestInit) => server(url, init));
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

describe('Save', () => {
  it('leaves the component shippable: the buffer is not what production baked', async () => {
    await mountBar();
    expect(adoptButton().disabled).toBe(true);

    editComponent();
    pressSave();
    await settle();

    expect(calls).toContain('PUT /component-configs/button/working');
    expect(adoptButton().disabled).toBe(false);
  });

  it('survives the remount a view switch causes', async () => {
    await mountBar();
    editComponent();
    pressSave();
    await settle();

    unmount(component!);
    component = null;
    await mountBar();

    expect(adoptButton().disabled).toBe(false);
  });
});

describe('Adopt', () => {
  it('saves the open theme, then publishes it', async () => {
    await mountBar();
    editComponent();
    pressSave();
    await settle();
    calls.length = 0;

    adoptButton().click();
    await settle();

    const themePut = calls.indexOf('PUT /themes/my-theme');
    expect(themePut).toBeGreaterThan(-1);
    expect(calls.indexOf('PUT /production')).toBeGreaterThan(themePut);
    expect(adoptButton().disabled).toBe(true);
  });
});
