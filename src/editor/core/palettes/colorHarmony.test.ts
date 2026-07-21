import { describe, expect, it } from 'vitest';
import { harmonyHues, applyHarmony, tintNeutralsFromBrand, type HarmonyMode } from './colorHarmony';
import { hexToOklch, oklchToHex } from './oklch';
import { DEFAULT_PALETTE_LIGHTNESS, DEFAULT_PALETTE_SATURATION, defaultScaleCurves } from './paletteDerivation';
import type { PaletteConfig } from '../themes/themeTypes';

function mkP(baseColorHex: string): PaletteConfig {
  return {
    baseColor: hexToOklch(baseColorHex),
    lightnessCurve: DEFAULT_PALETTE_LIGHTNESS(),
    saturationCurve: DEFAULT_PALETTE_SATURATION(),
    scaleCurves: {
      Surfaces: { lightness: defaultScaleCurves.Surfaces.lightness(), saturation: defaultScaleCurves.Surfaces.saturation() },
      Borders: { lightness: defaultScaleCurves.Borders.lightness(), saturation: defaultScaleCurves.Borders.saturation() },
      Text: { lightness: defaultScaleCurves.Text.lightness(), saturation: defaultScaleCurves.Text.saturation() },
    },
    curveOffset: {},
    overrides: {},
    snappedScales: [],
  };
}

describe('harmonyHues geometry', () => {
  it('pins each mode relative to the anchor', () => {
    expect(harmonyHues('complementary', 30)).toEqual([30, 30, 210]);
    expect(harmonyHues('split-complementary', 30)).toEqual([30, 180, 240]);
    expect(harmonyHues('triadic', 30)).toEqual([30, 150, 270]);
    expect(harmonyHues('square', 30)).toEqual([30, 120, 210]);
    expect(harmonyHues('analogous', 30)).toEqual([30, 0, 60]);
    expect(harmonyHues('monochromatic', 30)).toEqual([30, 30, 30]);
    expect(harmonyHues('custom', 30)).toEqual([30, 30, 30]);
  });

  it('normalizes wrap-around into 0..360', () => {
    expect(harmonyHues('complementary', 350)).toEqual([350, 350, 170]);
    expect(harmonyHues('analogous', 10)).toEqual([10, 340, 40]);
    expect(harmonyHues('triadic', 300)).toEqual([300, 60, 180]);
  });
});

describe('applyHarmony', () => {
  // In-gamut seeds so the hex round-trip stays tight enough to assert preservation.
  const palettes: Record<string, PaletteConfig> = {
    Brand: mkP(oklchToHex(0.6, 0.1, 30)),
    Background: mkP(oklchToHex(0.65, 0.08, 200)),
    Accent: mkP(oklchToHex(0.55, 0.12, 100)),
    Special: mkP(oklchToHex(0.5, 0.15, 280)),
    Neutral: mkP(oklchToHex(0.6, 0.02, 50)),
  };

  it('rotates only [Brand, Background, Accent] hue; each own c + L unchanged', () => {
    const out = applyHarmony('triadic', palettes);
    expect(Object.keys(out).sort()).toEqual(['Accent', 'Background', 'Brand']);
    expect('Special' in out).toBe(false);
    expect('Neutral' in out).toBe(false);

    const hues = harmonyHues('triadic', palettes.Brand.baseColor.h);
    (['Brand', 'Background', 'Accent'] as const).forEach((label, i) => {
      const before = palettes[label].baseColor;
      // Exact: only the hue moves; L and C are the seed's own, unclamped.
      expect(out[label]).toEqual({ l: before.l, c: before.c, h: hues[i] });
    });
  });

  it('is deterministic', () => {
    expect(applyHarmony('split-complementary', palettes)).toEqual(applyHarmony('split-complementary', palettes));
  });

  it('custom imposes no constraint (no changes)', () => {
    expect(applyHarmony('custom', palettes)).toEqual({});
  });

  it('every mode leaves L and C untouched for the trio (hue-only, no chroma clamp)', () => {
    const modes: HarmonyMode[] = ['complementary', 'split-complementary', 'triadic', 'square', 'analogous', 'monochromatic'];
    for (const mode of modes) {
      const out = applyHarmony(mode, palettes);
      const hues = harmonyHues(mode, palettes.Brand.baseColor.h);
      (['Brand', 'Background', 'Accent'] as const).forEach((label, i) => {
        const before = palettes[label].baseColor;
        expect(out[label]).toEqual({ l: before.l, c: before.c, h: hues[i] });
      });
    }
  });
});

describe('tintNeutralsFromBrand', () => {
  it('re-hues Neutral + Alternate to Brand hue, keeping their own c + L', () => {
    const palettes: Record<string, PaletteConfig> = {
      Brand: mkP(oklchToHex(0.6, 0.12, 120)),
      Neutral: mkP(oklchToHex(0.6, 0.02, 50)),
      Alternate: mkP(oklchToHex(0.62, 0.03, 300)),
      Special: mkP(oklchToHex(0.5, 0.15, 280)),
    };
    const out = tintNeutralsFromBrand(palettes);
    expect(Object.keys(out).sort()).toEqual(['Alternate', 'Neutral']);

    const brandHue = palettes.Brand.baseColor.h;
    for (const label of ['Neutral', 'Alternate']) {
      const before = palettes[label].baseColor;
      expect(out[label]).toEqual({ l: before.l, c: before.c, h: brandHue });
    }
    expect('Special' in out).toBe(false);
    expect('Brand' in out).toBe(false);
  });
});
