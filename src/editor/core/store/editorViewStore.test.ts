// @vitest-environment happy-dom
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { get } from 'svelte/store';

const VIEW_KEY = 'lt.editorView';

// Each case imports the module fresh so `readView()` re-runs against the
// storage state the test set up.
beforeEach(() => {
  vi.resetModules();
  localStorage.clear();
  sessionStorage.clear();
});

describe('editorViewStore — view round-trip', () => {
  it('restores a session "colors" view', async () => {
    sessionStorage.setItem(VIEW_KEY, 'colors');
    const { editorView } = await import('./editorViewStore');
    expect(get(editorView)).toBe('colors');
  });

  it('restores tokens and components too', async () => {
    sessionStorage.setItem(VIEW_KEY, 'components');
    const { editorView } = await import('./editorViewStore');
    expect(get(editorView)).toBe('components');
  });

  it('falls back to tokens for an unknown stored value', async () => {
    sessionStorage.setItem(VIEW_KEY, 'bogus');
    const { editorView } = await import('./editorViewStore');
    expect(get(editorView)).toBe('tokens');
  });

  it('opens on tokens with no stored view', async () => {
    const { editorView } = await import('./editorViewStore');
    expect(get(editorView)).toBe('tokens');
  });

  it('does not carry a view across sessions via localStorage', async () => {
    localStorage.setItem(VIEW_KEY, 'colors');
    const { editorView } = await import('./editorViewStore');
    expect(get(editorView)).toBe('tokens');
  });

  it('stores the active view, colors included', async () => {
    const { editorView, setEditorView } = await import('./editorViewStore');
    setEditorView('colors');
    expect(sessionStorage.getItem(VIEW_KEY)).toBe('colors');
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
