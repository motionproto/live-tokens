// @vitest-environment happy-dom
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { get } from 'svelte/store';

const VIEW_KEY = 'lt.editorView';

// Each case imports the module fresh so `readView()` re-runs against the
// localStorage state the test set up.
beforeEach(() => {
  vi.resetModules();
  localStorage.clear();
});

describe('editorViewStore — view round-trip', () => {
  it('restores a persisted "colors" view', async () => {
    localStorage.setItem(VIEW_KEY, 'colors');
    const { editorView } = await import('./editorViewStore');
    expect(get(editorView)).toBe('colors');
  });

  it('restores tokens and components too', async () => {
    localStorage.setItem(VIEW_KEY, 'components');
    const { editorView } = await import('./editorViewStore');
    expect(get(editorView)).toBe('components');
  });

  it('falls back to tokens for an unknown persisted value', async () => {
    localStorage.setItem(VIEW_KEY, 'bogus');
    const { editorView } = await import('./editorViewStore');
    expect(get(editorView)).toBe('tokens');
  });

  it('persists the active view, colors included', async () => {
    const { editorView, setEditorView } = await import('./editorViewStore');
    setEditorView('colors');
    expect(localStorage.getItem(VIEW_KEY)).toBe('colors');
    expect(get(editorView)).toBe('colors');
  });

  it('mirrors a cross-window storage event for colors', async () => {
    const { editorView } = await import('./editorViewStore');
    window.dispatchEvent(new StorageEvent('storage', { key: VIEW_KEY, newValue: 'colors' }));
    expect(get(editorView)).toBe('colors');
  });

  it('ignores a storage event with an unknown view', async () => {
    const { editorView, setEditorView } = await import('./editorViewStore');
    setEditorView('components');
    window.dispatchEvent(new StorageEvent('storage', { key: VIEW_KEY, newValue: 'bogus' }));
    expect(get(editorView)).toBe('components');
  });
});
