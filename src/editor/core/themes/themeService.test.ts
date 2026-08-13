// @vitest-environment happy-dom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { get } from 'svelte/store';
import { API_BASE } from '../storage/apiBase';
import { activeFileName } from '../store/editorConfigStore';
import { dirty, editorState, mutate, themeDirty, __resetForTests } from '../store/editorStore';
import { persistTheme } from './themeService';

describe('persistTheme', () => {
  let requests: { method: string; url: string; body: any }[];

  beforeEach(() => {
    __resetForTests();
    activeFileName.set('default');
    requests = [];
    vi.stubGlobal('fetch', async (url: string, init?: RequestInit) => {
      requests.push({
        method: init?.method ?? 'GET',
        url,
        body: init?.body ? JSON.parse(init.body as string) : null,
      });
      return new Response(JSON.stringify({ ok: true }), {
        headers: { 'Content-Type': 'application/json' },
      });
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('writes the file, points active at it and clears the dirty flag', async () => {
    mutate('edit', (s) => {
      s.cssVars['--surface-canvas'] = '#123456';
    });
    expect(get(dirty)).toBe(true);
    expect(get(themeDirty)).toBe(true);

    await persistTheme(get(editorState), 'my-colors', 'My Colors');

    expect(requests.map((r) => `${r.method} ${r.url}`)).toEqual([
      `PUT ${API_BASE}/themes/my-colors`,
      `PUT ${API_BASE}/themes/active`,
    ]);
    expect(requests[0].body.name).toBe('My Colors');
    expect(requests[0].body.cssVariables['--surface-canvas']).toBe('#123456');
    expect(requests[1].body).toEqual({ name: 'my-colors' });
    expect(get(activeFileName)).toBe('my-colors');
    expect(get(dirty)).toBe(false);
    expect(get(themeDirty)).toBe(false);
  });
});
