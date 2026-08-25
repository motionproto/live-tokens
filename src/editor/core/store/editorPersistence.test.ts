import { describe, it, expect } from 'vitest';
import type { EditorState } from './editorTypes';
import { normalizeComponents, normalizePaletteBasis } from './editorPersistence';
import { palettesToVars } from '../palettes/paletteDerivation';

function stateWith(components: unknown): EditorState {
  return { components } as unknown as EditorState;
}

describe('normalizeComponents', () => {
  it('backfills config on a slice persisted before the alias/config split', () => {
    const out = normalizeComponents(
      stateWith({ card: { aliases: { '--card-bg': { kind: 'token', name: '--surface' } } } }),
    );
    expect(out.components.card.config).toEqual({});
    expect(out.components.card.aliases).toEqual({ '--card-bg': { kind: 'token', name: '--surface' } });
  });

  it('backfills aliases when absent', () => {
    const out = normalizeComponents(stateWith({ button: { config: { '--button-variant': 'primary' } } }));
    expect(out.components.button.aliases).toEqual({});
  });

  it('preserves the optional unlinked list', () => {
    const out = normalizeComponents(
      stateWith({ card: { aliases: {}, config: {}, unlinked: ['--card-bg'] } }),
    );
    expect(out.components.card.unlinked).toEqual(['--card-bg']);
  });

  it('drops a null or non-object slice rather than crashing the renderer', () => {
    const out = normalizeComponents(stateWith({ good: { aliases: {}, config: {} }, bad: null }));
    expect(Object.keys(out.components)).toEqual(['good']);
  });

  it('replaces a missing components bag with an empty map', () => {
    expect(normalizeComponents(stateWith(undefined)).components).toEqual({});
  });
});

describe('normalizePaletteBasis', () => {
  const hexSession = () =>
    ({
      palettes: {
        Neutral: { baseColor: '#70787e', overrides: { 'Palette-500': '#abcdef' } },
      },
    }) as unknown as EditorState;

  it('converts a session persisted before the numeric OKLCH basis', () => {
    const { Neutral } = normalizePaletteBasis(hexSession()).palettes;

    expect(typeof Neutral.baseColor).toBe('object');
    expect(Neutral.baseColor.h).toBeTypeOf('number');
    expect(Neutral.overrides['Palette-500'].h).toBeTypeOf('number');
  });

  it('lets such a session reach the renderer instead of throwing on an undefined hue', () => {
    expect(() => palettesToVars(hexSession().palettes)).toThrow();
    expect(() => palettesToVars(normalizePaletteBasis(hexSession()).palettes)).not.toThrow();
  });

  it('passes a current-shape session through unchanged', () => {
    const current = {
      palettes: { Neutral: { baseColor: { l: 0.5, c: 0.02, h: 240 }, overrides: {} } },
    } as unknown as EditorState;

    expect(normalizePaletteBasis(current).palettes.Neutral.baseColor).toEqual({ l: 0.5, c: 0.02, h: 240 });
  });
});
