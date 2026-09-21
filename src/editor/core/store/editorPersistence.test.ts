import { describe, it, expect } from 'vitest';
import type { EditorState } from './editorTypes';
import { normalizeComponents, normalizePaletteBasis, normalizeWashes } from './editorPersistence';
import { palettesToVars } from '../palettes/paletteDerivation';
import { makeDefaultWashesState } from '../themes/slices/washes';

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

describe('normalizeWashes', () => {
  const opacities = (scale: { stops: { opacity: number }[] }) => scale.stops.map((s) => s.opacity);

  it('carries a pre-rename overlays slice across as a colour and its stops', () => {
    const out = normalizeWashes({
      overlays: {
        tokens: [
          { variable: '--overlay-low', label: 'Low', alias: '--surface-neutral-low', opacity: 0.4 },
          { variable: '--overlay', label: 'Base', alias: '--surface-neutral-lowest', opacity: 0.5 },
        ],
        hoverTokens: [{ variable: '--hover', label: 'Base', alias: '--text-secondary', opacity: 0.2 }],
      },
    } as unknown as EditorState);

    expect(out.washes.scrim.color).toBe('--surface-neutral-lowest');
    expect(opacities(out.washes.scrim)).toEqual([0.4, 0.5, 0.9]);
    expect(out.washes.tint.color).toBe('--text-secondary');
    expect(opacities(out.washes.tint)).toEqual([0.05, 0.2, 0.15]);
    expect('overlays' in out).toBe(false);
  });

  it('reshapes per-stop lists saved before the colour split', () => {
    const out = normalizeWashes({
      washes: {
        scrims: [{ variable: '--scrim-high', label: 'High', alias: '--surface-neutral-lowest', opacity: 0.6 }],
        hoverTokens: [{ variable: '--hover-high', label: 'High', alias: '--text-primary', opacity: 0.3 }],
      },
    } as unknown as EditorState);

    expect(opacities(out.washes.scrim)).toEqual([0.7, 0.8, 0.6]);
    expect(opacities(out.washes.tint)).toEqual([0.05, 0.1, 0.3]);
  });

  it('falls back to defaults when a family is missing or unusable', () => {
    for (const state of [{}, { washes: {} }, { washes: { scrims: [], tints: 'nope' } }]) {
      const out = normalizeWashes(state as unknown as EditorState);
      expect(out.washes).toEqual(makeDefaultWashesState());
    }
  });

  it('leaves a current slice alone', () => {
    const current = makeDefaultWashesState();
    current.scrim.color = '--color-white';
    const out = normalizeWashes({ washes: current } as unknown as EditorState);
    expect(out.washes).toEqual(current);
  });
});
