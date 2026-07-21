import { describe, expect, it } from 'vitest';
import { migratePaletteColorsToOklch, type PreOklchPaletteConfig } from './2026-07-21-palette-oklch-basis';
import { hexToOklch, type Oklch } from '../../palettes/oklch';
import { DEFAULT_PALETTE_LIGHTNESS, DEFAULT_PALETTE_SATURATION } from '../../palettes/paletteDerivation';

const round = (v: number, dp: number) => { const f = 10 ** dp; return Math.round(v * f) / f; };
const stored = (hex: string): Oklch => {
  const { l, c, h } = hexToOklch(hex);
  return { l: round(l, 4), c: round(c, 4), h: round(h, 2) };
};

function cfg(over: Partial<PreOklchPaletteConfig> = {}): PreOklchPaletteConfig {
  return {
    baseColor: '#c93636',
    lightnessCurve: DEFAULT_PALETTE_LIGHTNESS(),
    saturationCurve: DEFAULT_PALETTE_SATURATION(),
    scaleCurves: {},
    curveOffset: {},
    overrides: {},
    snappedScales: [],
    ...over,
  };
}

describe('migratePaletteColorsToOklch', () => {
  it('converts baseColor and a non-empty overrides map to the rounded OKLCH basis', () => {
    const before = cfg({ baseColor: '#c93636', overrides: { 'Palette-500': '#abcdef', 'Surfaces-default': '#123456' } });
    const after = migratePaletteColorsToOklch({ Brand: before }).Brand;

    expect(after.baseColor).toEqual(stored('#c93636'));
    expect(after.overrides['Palette-500']).toEqual(stored('#abcdef'));
    expect(after.overrides['Surfaces-default']).toEqual(stored('#123456'));
    // precision (decision 5): l/c 4 decimals, h 2
    expect(after.baseColor.l).toBe(round(after.baseColor.l, 4));
    expect(after.baseColor.h).toBe(round(after.baseColor.h, 2));
  });

  it('is idempotent: a second pass on already-numeric channels is a no-op (no re-parse)', () => {
    const once = migratePaletteColorsToOklch({ Brand: cfg({ overrides: { 'Palette-500': '#abcdef' } }) });
    const twice = migratePaletteColorsToOklch(once);

    expect(twice).toEqual(once);
    // numeric channels pass straight through, never re-parsed or re-rounded
    expect(twice.Brand.baseColor).toBe(once.Brand.baseColor);
    expect(twice.Brand.overrides['Palette-500']).toBe(once.Brand.overrides['Palette-500']);
  });
});
