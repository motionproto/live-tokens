import { describe, it, expect } from 'vitest';
import type { EditorState } from './editorTypes';
import { normalizeComponents } from './editorPersistence';

function stateWith(components: unknown): EditorState {
  return { components } as unknown as EditorState;
}

describe('normalizeComponents', () => {
  it('backfills config on a slice persisted before the alias/config split', () => {
    const out = normalizeComponents(
      stateWith({ card: { activeFile: 'default', aliases: { '--card-bg': { kind: 'token', name: '--surface' } } } }),
    );
    expect(out.components.card.config).toEqual({});
    expect(out.components.card.aliases).toEqual({ '--card-bg': { kind: 'token', name: '--surface' } });
  });

  it('backfills aliases and activeFile when absent', () => {
    const out = normalizeComponents(stateWith({ button: { config: { '--button-variant': 'primary' } } }));
    expect(out.components.button.aliases).toEqual({});
    expect(out.components.button.activeFile).toBe('default');
  });

  it('preserves the optional unlinked list', () => {
    const out = normalizeComponents(
      stateWith({ card: { activeFile: 'a', aliases: {}, config: {}, unlinked: ['--card-bg'] } }),
    );
    expect(out.components.card.unlinked).toEqual(['--card-bg']);
  });

  it('drops a null or non-object slice rather than crashing the renderer', () => {
    const out = normalizeComponents(stateWith({ good: { activeFile: 'd', aliases: {}, config: {} }, bad: null }));
    expect(Object.keys(out.components)).toEqual(['good']);
  });

  it('replaces a missing components bag with an empty map', () => {
    expect(normalizeComponents(stateWith(undefined)).components).toEqual({});
  });
});
