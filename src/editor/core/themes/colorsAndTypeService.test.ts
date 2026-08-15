// @vitest-environment happy-dom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { get } from 'svelte/store';
import { API_BASE } from '../storage/apiBase';
import { dirty, editorState, mutate, colorsAndTypeDirty, __resetForTests } from '../store/editorStore';
import { persistColorsAndType } from './colorsAndTypeService';

describe('persistColorsAndType', () => {
  let requests: { method: string; url: string; body: any }[];

  beforeEach(() => {
    __resetForTests();
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

  it('writes the buffer under the open theme’s name and clears the dirty flag', async () => {
    mutate('edit', (s) => {
      s.cssVars['--surface-canvas'] = '#123456';
    });
    expect(get(dirty)).toBe(true);
    expect(get(colorsAndTypeDirty)).toBe(true);

    await persistColorsAndType(get(editorState), 'My Theme');

    expect(requests.map((r) => `${r.method} ${r.url}`)).toEqual([
      `PUT ${API_BASE}/colors-and-type/working`,
    ]);
    expect(requests[0].body.name).toBe('My Theme');
    expect(requests[0].body.cssVariables['--surface-canvas']).toBe('#123456');
    expect(get(dirty)).toBe(false);
    expect(get(colorsAndTypeDirty)).toBe(false);
  });
});
