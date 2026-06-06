import { describe, expect, it } from 'vitest';
import { unifyGrayPalettes } from './2026-06-05-palette-unification';
import { derivePaletteVars, PALETTE_SPECS, DEFAULT_PALETTE_LIGHTNESS, DEFAULT_PALETTE_SATURATION } from '../../palettes/paletteDerivation';
import { hexToOklch, oklchToHex, gamutClamp } from '../../palettes/oklch';
import { type CurveAnchor, makeAnchor, sampleCurve } from '../../../ui/curveEngine';
import type { PaletteConfig } from '../themeTypes';

type LegacyGray = {
  tintHue: number;
  tintChroma: number;
  grayLightnessCurve: CurveAnchor[];
  graySaturationCurve: CurveAnchor[];
};

const neutralLightness = () => [makeAnchor(0, 92, 5), makeAnchor(100, 3, 5)];
const grayFlatSaturation = () => [makeAnchor(0, 20, 30), makeAnchor(100, 20, 30)];

function legacyGrayFields(over: Partial<LegacyGray> = {}): LegacyGray {
  return {
    tintHue: 236,
    tintChroma: 0.067,
    grayLightnessCurve: neutralLightness(),
    graySaturationCurve: grayFlatSaturation(),
    ...over,
  };
}

function legacyConfig(base: Partial<PaletteConfig> = {}, gray: Partial<LegacyGray> = {}): PaletteConfig {
  return {
    baseColor: '#808080',
    lightnessCurve: DEFAULT_PALETTE_LIGHTNESS(),
    saturationCurve: DEFAULT_PALETTE_SATURATION(),
    scaleCurves: {},
    curveOffset: { lightness: 0, saturation: 0 },
    overrides: {},
    snappedScales: [],
    anchorToBase: true,
    ...base,
    ...legacyGrayFields(gray),
  } as PaletteConfig;
}

/** Reproduces the deleted `computeGrayColor` at step 500 — the reference the
 *  close-mapping must match for default / flat-saturation neutrals. */
function oldGray500(cfg: PaletteConfig): string {
  const g = cfg as PaletteConfig & LegacyGray;
  const x = 40; // step 500 of 11 → (4/10)*100
  const lOff = cfg.curveOffset['gray-lightness'] ?? 0;
  const sOff = cfg.curveOffset['gray-saturation'] ?? 0;
  const L = Math.max(0, Math.min(100, sampleCurve(g.grayLightnessCurve, x) + lOff)) / 100;
  const sat = Math.max(0, Math.min(2, (sampleCurve(g.graySaturationCurve, x) + sOff) / 100));
  const c = gamutClamp(L, g.tintChroma * sat, g.tintHue);
  return oklchToHex(c.l, c.c, c.h);
}

const GRAY_KEYS = ['tintHue', 'tintChroma', 'grayLightnessCurve', 'graySaturationCurve'] as const;

describe('unifyGrayPalettes', () => {
  it('strips vestigial gray fields from a non-neutral palette, preserving the rest', () => {
    const before = legacyConfig({ baseColor: '#fb2898', overrides: { 'Palette-500': '#abcdef' } });
    const after = unifyGrayPalettes({ Brand: before }).Brand;

    for (const k of GRAY_KEYS) expect(k in after).toBe(false);
    expect(after.baseColor).toBe('#fb2898');
    expect(after.lightnessCurve).toEqual(before.lightnessCurve);
    expect(after.saturationCurve).toEqual(before.saturationCurve);
    expect(after.overrides).toEqual({ 'Palette-500': '#abcdef' });
  });

  it('close-maps a neutral: base becomes gray-500, ramp kept, saturation flattened, locked', () => {
    const before = legacyConfig({}, {});
    const after = unifyGrayPalettes({ Neutral: before }).Neutral;

    for (const k of GRAY_KEYS) expect(k in after).toBe(false);
    expect(after.baseColor).toBe(oldGray500(before));
    expect(after.lightnessCurve).toEqual(neutralLightness());
    expect(after.saturationCurve).toEqual(DEFAULT_PALETTE_SATURATION());
    expect(after.anchorToBase).toBe(true);
  });

  it('carries the gray-lightness offset into the lightness offset, drops gray-saturation', () => {
    const before = legacyConfig({ curveOffset: { 'gray-lightness': 7, 'gray-saturation': 3, 'Text-lightness': 2 } });
    const after = unifyGrayPalettes({ Neutral: before }).Neutral;

    expect(after.curveOffset.lightness).toBe(7);
    expect(after.curveOffset.saturation).toBe(0);
    expect(after.curveOffset['Text-lightness']).toBe(2);
    expect('gray-lightness' in after.curveOffset).toBe(false);
    expect('gray-saturation' in after.curveOffset).toBe(false);
  });

  it('is idempotent: a second pass leaves an already-unified config unchanged', () => {
    const once = unifyGrayPalettes({ Neutral: legacyConfig(), Brand: legacyConfig({ baseColor: '#c93636' }) });
    const twice = unifyGrayPalettes(once);
    expect(twice).toEqual(once);
  });

  it('step 500 of the migrated neutral matches the old gray-500 (flat-saturation neutral)', () => {
    const before = legacyConfig();
    const migrated = unifyGrayPalettes({ Neutral: before }).Neutral;
    const spec = PALETTE_SPECS.find((s) => s.label === 'Neutral')!;
    const derived500 = derivePaletteVars(spec, migrated)['--color-neutral-500'];

    const a = hexToOklch(derived500);
    const b = hexToOklch(oldGray500(before));
    expect(Math.abs(a.l - b.l)).toBeLessThan(0.01);
    expect(Math.abs(a.c - b.c)).toBeLessThan(0.005);
  });
});
