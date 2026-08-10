// @vitest-environment happy-dom
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { get } from 'svelte/store';

beforeEach(() => {
  vi.resetModules();
  sessionStorage.clear();
  history.replaceState(null, '', '/');
});

describe('openPaletteInWheel', () => {
  it('selects the family and switches to the Colors view', async () => {
    const { openPaletteInWheel, selectedPalette } = await import('./paletteFocus');
    const { editorView } = await import('./editorViewStore');

    openPaletteInWheel('Success');

    expect(get(selectedPalette)).toBe('Success');
    expect(get(editorView)).toBe('colors');
  });
});

describe('openPaletteInTokens', () => {
  it('requests focus on the family and switches to the Tokens view', async () => {
    const { openPaletteInTokens, pendingPaletteFocus, selectedPalette } = await import('./paletteFocus');
    const { editorView } = await import('./editorViewStore');
    editorView.set('colors');

    openPaletteInTokens('Danger');

    expect(get(pendingPaletteFocus)).toBe('Danger');
    expect(get(selectedPalette)).toBe('Danger');
    expect(get(editorView)).toBe('tokens');
    expect(location.pathname).toBe('/');
  });

  it('leaves the standalone Colors page for the editor route', async () => {
    const { init, route } = await import('../routing/router');
    history.replaceState(null, '', '/live-tokens/colors');
    init();
    expect(get(route)).toBe('/live-tokens/colors');

    const { openPaletteInTokens } = await import('./paletteFocus');
    openPaletteInTokens('Brand');

    expect(location.pathname).toBe('/live-tokens/editor');
  });
});
