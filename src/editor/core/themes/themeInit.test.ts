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
import { SKETCH_STYLES } from '../sketch/sketchStyles';

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

function stubActiveTheme(sketchStyle: unknown) {
  vi.stubGlobal('fetch', async (url: string) => {
    if (url === `${API_BASE}/themes/active`) {
      return new Response(JSON.stringify({ name: 'Sketchy', sketchStyle }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }
    return new Response(null, { status: 404 });
  });
}

// Each case reimports both modules fresh, from a cleared localStorage, so
// "this browser never recorded a sketch decision" is a state the test sets
// up rather than a side effect of what ran earlier in the file (`sketchStore`
// computes `sketchTouched` once, at import).
describe('initializeTheme sketchstyle reconcile', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.resetModules();
  });

  it('seeds the live buffer from the theme when this browser never recorded a sketch decision', async () => {
    stubActiveTheme(SKETCH_STYLES.napkin);
    const { initializeTheme } = await import('./themeInit');
    const { sketchEnabled, sketchSettings, themeSketchStyle } = await import('../sketch/sketchStore');

    await initializeTheme();

    expect(get(sketchEnabled)).toBe(true);
    expect(get(sketchSettings)).toEqual(SKETCH_STYLES.napkin);
    expect(get(themeSketchStyle)).toEqual(SKETCH_STYLES.napkin);
  });

  it('leaves an unsaved buffer alone once this browser has recorded a decision, and only learns the theme', async () => {
    const { initializeTheme } = await import('./themeInit');
    const { sketchEnabled, sketchSettings, themeSketchStyle, updateSketchSettings } = await import('../sketch/sketchStore');
    updateSketchSettings({}); // records a decision without changing the dials
    sketchEnabled.set(true);
    const liveBefore = get(sketchSettings);
    stubActiveTheme(SKETCH_STYLES.napkin);

    await initializeTheme();

    expect(get(sketchSettings)).toEqual(liveBefore);
    expect(get(sketchEnabled)).toBe(true);
    expect(get(themeSketchStyle)).toEqual(SKETCH_STYLES.napkin);
  });

  it('leaves the sketch state alone when the active-theme fetch fails, rather than reading that as no sketchstyle', async () => {
    const { initializeTheme } = await import('./themeInit');
    const { sketchEnabled, sketchSettings, themeSketchStyle, updateSketchSettings } = await import('../sketch/sketchStore');
    updateSketchSettings({});
    sketchEnabled.set(true);
    const liveBefore = get(sketchSettings);
    themeSketchStyle.set(SKETCH_STYLES.pencil);
    vi.stubGlobal('fetch', async () => new Response(null, { status: 503 }));

    await initializeTheme();

    expect(get(sketchSettings)).toEqual(liveBefore);
    expect(get(themeSketchStyle)).toEqual(SKETCH_STYLES.pencil);
  });
});
