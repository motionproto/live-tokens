// @vitest-environment happy-dom
import { beforeEach, describe, expect, it } from 'vitest';
import { get } from 'svelte/store';
import {
  editorState,
  componentDirty,
  setComponentAlias,
  clearComponentAlias,
  loadComponentActive,
  markComponentSaved,
  seedComponentsFromApi,
  undo,
  redo,
  __resetForTests,
} from './editorStore';

beforeEach(() => {
  __resetForTests();
});

describe('component aliases — editor-state round trip', () => {
  it('setComponentAlias → undo restores previous state; redo reapplies', () => {
    setComponentAlias('button', '--button-primary-surface', '--surface-success-high');
    expect(get(editorState).components.button.aliases['--button-primary-surface']).toBe('--surface-success-high');

    setComponentAlias('button', '--button-primary-surface', '--surface-error-high');
    expect(get(editorState).components.button.aliases['--button-primary-surface']).toBe('--surface-error-high');

    undo();
    expect(get(editorState).components.button.aliases['--button-primary-surface']).toBe('--surface-success-high');

    redo();
    expect(get(editorState).components.button.aliases['--button-primary-surface']).toBe('--surface-error-high');
  });

  it('clearComponentAlias removes the entry and is undoable', () => {
    setComponentAlias('button', '--button-primary-surface', '--surface-success-high');
    clearComponentAlias('button', '--button-primary-surface');
    expect(get(editorState).components.button.aliases['--button-primary-surface']).toBeUndefined();

    undo();
    expect(get(editorState).components.button.aliases['--button-primary-surface']).toBe('--surface-success-high');
  });

  it('setComponentAlias implicitly registers the slice with activeFile "default"', () => {
    setComponentAlias('card', '--card-radius', '--radius-lg');
    expect(get(editorState).components.card.activeFile).toBe('default');
    expect(get(editorState).components.card.aliases['--card-radius']).toBe('--radius-lg');
  });
});

describe('componentDirty — per-component scoping', () => {
  it('marks a component dirty only after its aliases diverge from the saved baseline', () => {
    loadComponentActive('button', 'default', { '--button-primary-surface': '--surface-success-high' });
    expect(get(componentDirty).button).toBe(false);

    setComponentAlias('button', '--button-primary-surface', '--surface-error-high');
    expect(get(componentDirty).button).toBe(true);

    markComponentSaved('button');
    expect(get(componentDirty).button).toBe(false);
  });

  it('editing one component does not dirty another', () => {
    loadComponentActive('button', 'default', { '--button-primary-surface': '--surface-success-high' });
    loadComponentActive('card', 'default', { '--card-radius': '--radius-md' });
    expect(get(componentDirty).button).toBe(false);
    expect(get(componentDirty).card).toBe(false);

    setComponentAlias('button', '--button-primary-surface', '--surface-error-high');
    expect(get(componentDirty).button).toBe(true);
    expect(get(componentDirty).card).toBe(false);
  });

  it('undo after a saved state marks dirty again', () => {
    loadComponentActive('button', 'default', { '--button-primary-surface': '--surface-success-high' });
    setComponentAlias('button', '--button-primary-surface', '--surface-error-high');
    markComponentSaved('button');
    expect(get(componentDirty).button).toBe(false);

    undo();
    expect(get(editorState).components.button.aliases['--button-primary-surface']).toBe('--surface-success-high');
    expect(get(componentDirty).button).toBe(true);
  });
});

describe('seedComponentsFromApi — boot-time hydration', () => {
  it('populates state and establishes the clean baseline', () => {
    seedComponentsFromApi({
      button: { activeFile: 'myConfig', aliases: { '--button-primary-surface': '--surface-success-high' } },
    });
    expect(get(editorState).components.button.activeFile).toBe('myConfig');
    expect(get(editorState).components.button.aliases['--button-primary-surface']).toBe('--surface-success-high');
    expect(get(componentDirty).button).toBe(false);
  });

  it('replaces the full components slice', () => {
    setComponentAlias('card', '--card-radius', '--radius-md');
    seedComponentsFromApi({
      button: { activeFile: 'default', aliases: {} },
    });
    expect(get(editorState).components.card).toBeUndefined();
    expect(get(editorState).components.button).toBeDefined();
  });
});
