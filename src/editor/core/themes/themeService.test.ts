// @vitest-environment happy-dom

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { get } from 'svelte/store';
import { applyTheme, freshName } from './themeService';
import { API_BASE } from '../storage/apiBase';
import { editorState, __resetForTests } from '../store/editorStore';
import { openThemeSlug } from '../store/editorConfigStore';
import { liveMovedSinceBake } from '../productionPulse';

beforeEach(() => {
  __resetForTests();
  openThemeSlug.set('default');
  document.documentElement.removeAttribute('style');
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('freshName', () => {
  it('takes the base name when nothing holds it', () => {
    expect(freshName('my-theme', new Set())).toBe('my-theme');
  });

  it('steps past the themes already on disk', () => {
    expect(freshName('my-theme', new Set(['my-theme', 'my-theme_01']))).toBe('my-theme_02');
  });
});

describe('applyTheme', () => {
  it('hydrates the returned design system into the editor and live CSS', async () => {
    const colorsAndType = {
      name: 'Spring Meadow',
      createdAt: 'x',
      updatedAt: 'x',
      editorConfigs: {},
      cssVariables: { '--loaded-color': '#74c67a' },
      fontSources: [],
      fontStacks: [],
    };
    const componentConfigs = {
      sectiondivider: {
        name: 'Spring Meadow / Section Divider',
        component: 'sectiondivider',
        createdAt: 'x',
        updatedAt: 'x',
        aliases: {
          '--sectiondivider-lg-title-outline-color': '--color-danger-600',
        },
      },
    };
    vi.stubGlobal('fetch', async (url: string, init?: RequestInit) => {
      expect(`${init?.method} ${url}`).toBe(`PUT ${API_BASE}/themes/spring-meadow/apply`);
      return new Response(JSON.stringify({
        ok: true,
        theme: {
          name: 'Spring Meadow',
          _fileName: 'spring-meadow',
          createdAt: 'x',
          updatedAt: 'x',
          schemaVersion: 3,
          colorsAndType,
          componentConfigs,
        },
        colorsAndType,
        componentConfigs,
        skippedComponents: [],
      }), { status: 200, headers: { 'Content-Type': 'application/json' } });
    });
    liveMovedSinceBake.set(true);

    await applyTheme('spring-meadow');

    const state = get(editorState);
    expect(get(openThemeSlug)).toBe('spring-meadow');
    expect(get(liveMovedSinceBake)).toBe(false);
    expect(state.cssVars['--loaded-color']).toBe('#74c67a');
    expect(state.components.sectiondivider.aliases['--sectiondivider-lg-title-outline-color'])
      .toEqual({ kind: 'token', name: '--color-danger-600' });
    expect(document.documentElement.style.getPropertyValue('--loaded-color')).toBe('#74c67a');
    expect(document.documentElement.style.getPropertyValue('--sectiondivider-lg-title-outline-color'))
      .toBe('var(--color-danger-600)');
  });
});
