import { describe, expect, it } from 'vitest';
import { harmonyHues, applyHarmony, tintNeutralsFromAnchor, sanitizeHarmonyOrder, DEFAULT_HARMONY_ORDER, type HarmonyMode } from './colorHarmony';
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
  // Slot order (priority-ordered): slot 1 is the primary harmonic partner.
  it('pins each mode relative to the anchor', () => {
    expect(harmonyHues('complementary', 30, 3)).toEqual([30, 210, 30]);
    expect(harmonyHues('split-complementary', 30, 3)).toEqual([30, 240, 180]);
    expect(harmonyHues('triadic', 30, 3)).toEqual([30, 270, 150]);
    expect(harmonyHues('square', 30, 3)).toEqual([30, 210, 120]);
    expect(harmonyHues('analogous', 30, 3)).toEqual([30, 60, 0]);
    expect(harmonyHues('monochromatic', 30, 3)).toEqual([30, 30, 30]);
    expect(harmonyHues('custom', 30, 3)).toEqual([30, 30, 30]);
  });

  it('normalizes wrap-around into 0..360', () => {
    expect(harmonyHues('complementary', 350, 3)).toEqual([350, 170, 350]);
    expect(harmonyHues('analogous', 10, 3)).toEqual([10, 40, 340]);
    expect(harmonyHues('triadic', 300, 3)).toEqual([300, 180, 60]);
  });

  it('returns the first slotCount slots (1..4)', () => {
    expect(harmonyHues('square', 30, 1)).toEqual([30]);
    expect(harmonyHues('square', 30, 2)).toEqual([30, 210]);
    expect(harmonyHues('square', 30, 4)).toEqual([30, 210, 120, 300]);
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

  // Default order deals slot i to DEFAULT_HARMONY_ORDER[i] = [Brand, Accent, Background].
  const defaultOrder = ['Brand', 'Accent', 'Background'] as const;

  it('rotates only [Brand, Accent, Background] hue; each own c + L unchanged', () => {
    const out = applyHarmony('triadic', palettes);
    expect(Object.keys(out).sort()).toEqual(['Accent', 'Background', 'Brand']);
    expect('Special' in out).toBe(false);
    expect('Neutral' in out).toBe(false);

    const hues = harmonyHues('triadic', palettes.Brand.baseColor.h, defaultOrder.length);
    defaultOrder.forEach((label, i) => {
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
      const hues = harmonyHues(mode, palettes.Brand.baseColor.h, defaultOrder.length);
      defaultOrder.forEach((label, i) => {
        const before = palettes[label].baseColor;
        expect(out[label]).toEqual({ l: before.l, c: before.c, h: hues[i] });
      });
    }
  });

  // Invariant 1: with the default order, per-family output is exactly today's
  // pre-generalization values. Offsets are literal so this never tracks harmonyHues.
  it('pins default-order per-family hues to the pre-generalization values', () => {
    const a = palettes.Brand.baseColor.h;
    const n = (h: number) => ((h % 360) + 360) % 360;
    const perFamily: Record<Exclude<HarmonyMode, 'custom'>, { Brand: number; Accent: number; Background: number }> = {
      monochromatic:         { Brand: a, Accent: a,            Background: a },
      analogous:             { Brand: a, Accent: n(a + 30),    Background: n(a - 30) },
      complementary:         { Brand: a, Accent: n(a + 180),   Background: a },
      'split-complementary': { Brand: a, Accent: n(a + 210),   Background: n(a + 150) },
      triadic:               { Brand: a, Accent: n(a + 240),   Background: n(a + 120) },
      square:                { Brand: a, Accent: n(a + 180),   Background: n(a + 90) },
    };
    for (const mode of Object.keys(perFamily) as (keyof typeof perFamily)[]) {
      const out = applyHarmony(mode, palettes);
      for (const label of defaultOrder) {
        const before = palettes[label].baseColor;
        expect(out[label].l).toBe(before.l);
        expect(out[label].c).toBe(before.c);
        expect(out[label].h).toBeCloseTo(perFamily[mode][label], 9);
      }
    }
  });

  it('square with a 4-entry order sends slot 3 to anchor + 270', () => {
    const order = ['Brand', 'Background', 'Accent', 'Special'];
    const out = applyHarmony('square', palettes, order);
    expect(Object.keys(out).sort()).toEqual(['Accent', 'Background', 'Brand', 'Special']);
    const before = palettes.Special.baseColor;
    expect(out.Special.l).toBe(before.l);
    expect(out.Special.c).toBe(before.c);
    expect(out.Special.h).toBeCloseTo((palettes.Brand.baseColor.h + 270) % 360, 9);
  });

  it('honors a non-Brand anchor (slot 0)', () => {
    const out = applyHarmony('complementary', palettes, ['Accent', 'Brand']);
    const accentHue = palettes.Accent.baseColor.h;
    expect(out.Accent).toEqual({ l: palettes.Accent.baseColor.l, c: palettes.Accent.baseColor.c, h: accentHue });
    expect(out.Brand.l).toBe(palettes.Brand.baseColor.l);
    expect(out.Brand.c).toBe(palettes.Brand.baseColor.c);
    expect(out.Brand.h).toBeCloseTo((accentHue + 180) % 360, 9);
    expect('Background' in out).toBe(false);
  });

  it('never touches families outside the order', () => {
    const out = applyHarmony('triadic', palettes, ['Brand', 'Accent']);
    expect(Object.keys(out).sort()).toEqual(['Accent', 'Brand']);
    expect('Background' in out).toBe(false);
  });

  it('returns no changes when the anchor config is missing', () => {
    expect(applyHarmony('triadic', palettes, ['Alternate', 'Brand'])).toEqual({});
  });
});

describe('tintNeutralsFromAnchor', () => {
  it('re-hues Neutral + Alternate to Brand hue, keeping their own c + L', () => {
    const palettes: Record<string, PaletteConfig> = {
      Brand: mkP(oklchToHex(0.6, 0.12, 120)),
      Neutral: mkP(oklchToHex(0.6, 0.02, 50)),
      Alternate: mkP(oklchToHex(0.62, 0.03, 300)),
      Special: mkP(oklchToHex(0.5, 0.15, 280)),
    };
    const out = tintNeutralsFromAnchor(palettes);
    expect(Object.keys(out).sort()).toEqual(['Alternate', 'Neutral']);

    const brandHue = palettes.Brand.baseColor.h;
    for (const label of ['Neutral', 'Alternate']) {
      const before = palettes[label].baseColor;
      expect(out[label]).toEqual({ l: before.l, c: before.c, h: brandHue });
    }
    expect('Special' in out).toBe(false);
    expect('Brand' in out).toBe(false);
  });

  it('tints from a non-Brand anchor (slot 0 of the order)', () => {
    const palettes: Record<string, PaletteConfig> = {
      Accent: mkP(oklchToHex(0.55, 0.12, 100)),
      Brand: mkP(oklchToHex(0.6, 0.1, 30)),
      Neutral: mkP(oklchToHex(0.6, 0.02, 50)),
      Alternate: mkP(oklchToHex(0.62, 0.03, 300)),
    };
    const out = tintNeutralsFromAnchor(palettes, ['Accent', 'Brand']);
    const accentHue = palettes.Accent.baseColor.h;
    for (const label of ['Neutral', 'Alternate']) {
      const before = palettes[label].baseColor;
      expect(out[label]).toEqual({ l: before.l, c: before.c, h: accentHue });
    }
  });
});

describe('sanitizeHarmonyOrder', () => {
  it('non-array input falls back to the default order', () => {
    expect(sanitizeHarmonyOrder(undefined)).toEqual([...DEFAULT_HARMONY_ORDER]);
    expect(sanitizeHarmonyOrder('Brand')).toEqual([...DEFAULT_HARMONY_ORDER]);
  });

  it('empty array falls back to the default order', () => {
    expect(sanitizeHarmonyOrder([])).toEqual([...DEFAULT_HARMONY_ORDER]);
  });

  it('drops entries outside HARMONY_ELIGIBLE', () => {
    expect(sanitizeHarmonyOrder(['Danger', 'Brand', 'Neutral'])).toEqual(['Brand']);
  });

  it('drops duplicates, keeping the first occurrence', () => {
    expect(sanitizeHarmonyOrder(['Accent', 'Brand', 'Accent'])).toEqual(['Accent', 'Brand']);
  });

  it('a fully-invalid array falls back to the default order', () => {
    expect(sanitizeHarmonyOrder(['Danger', 'Success', 7, null])).toEqual([...DEFAULT_HARMONY_ORDER]);
  });

  it('passes a valid custom order through unchanged', () => {
    expect(sanitizeHarmonyOrder(['Brand', 'Background', 'Accent', 'Special']))
      .toEqual(['Brand', 'Background', 'Accent', 'Special']);
  });
});
