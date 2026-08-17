// @vitest-environment happy-dom

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { get } from 'svelte/store';
import { API_BASE } from '../storage/apiBase';
import {
  __resetForTests,
  editorState,
  setComponentAlias,
} from '../store/editorStore';
import { initializeTheme } from './themeInit';

beforeEach(() => {
  __resetForTests();
  document.documentElement.removeAttribute('style');
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('initializeTheme component hydration', () => {
  it('treats a successful empty component list as authoritative', async () => {
    setComponentAlias('stale-component', '--stale-color', {
      kind: 'token',
      name: '--color-danger-500',
    });
    expect(document.documentElement.style.getPropertyValue('--stale-color')).not.toBe('');

    vi.stubGlobal('fetch', async (url: string) => {
      if (url === `${API_BASE}/component-configs`) {
        return new Response(JSON.stringify({ components: [] }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        });
      }
      return new Response(null, { status: 404 });
    });

    await initializeTheme();

    expect(get(editorState).components).toEqual({});
    expect(document.documentElement.style.getPropertyValue('--stale-color')).toBe('');
  });

  it('keeps local state when the component endpoint is unavailable', async () => {
    setComponentAlias('offline-component', '--offline-color', {
      kind: 'token',
      name: '--color-brand-500',
    });
    vi.stubGlobal('fetch', async () => new Response(null, { status: 503 }));

    await initializeTheme();

    expect(get(editorState).components['offline-component']).toBeDefined();
  });

  it('does not partially hydrate when one listed component read fails', async () => {
    setComponentAlias('local-component', '--local-color', {
      kind: 'token',
      name: '--color-brand-500',
    });
    vi.stubGlobal('fetch', async (url: string) => {
      if (url === `${API_BASE}/component-configs`) {
        return new Response(JSON.stringify({
          components: [
            { name: 'button', source: 'theme' },
            { name: 'card', source: 'theme' },
          ],
        }), { status: 200, headers: { 'Content-Type': 'application/json' } });
      }
      if (url === `${API_BASE}/component-configs/button/active`) {
        return new Response(JSON.stringify({
          name: 'Button',
          component: 'button',
          createdAt: 'x',
          updatedAt: 'x',
          aliases: { '--button-primary-text': '--text-primary' },
        }), { status: 200, headers: { 'Content-Type': 'application/json' } });
      }
      return new Response(null, { status: 503 });
    });

    await initializeTheme();

    expect(get(editorState).components['local-component']).toBeDefined();
    expect(get(editorState).components.button).toBeUndefined();
  });
});
