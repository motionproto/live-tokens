import { describe, expect, it } from 'vitest';
import { solveTextCurves } from './solveTextContrast';
import { contrastRatio } from './contrast';
import { hexToOklch, oklchToHex } from './oklch';
import {
  palettesToVars,
  scaleCurveDefaults,
  DEFAULT_PALETTE_LIGHTNESS,
  DEFAULT_PALETTE_SATURATION,
  type SchemeDirection,
} from './paletteDerivation';
import type { PaletteConfig } from '../themes/themeTypes';

function mkP(baseColor: string, scheme: SchemeDirection, extra: Partial<PaletteConfig> = {}): PaletteConfig {
  const d = scaleCurveDefaults(scheme);
  return {
    baseColor,
    lightnessCurve: DEFAULT_PALETTE_LIGHTNESS(),
    saturationCurve: DEFAULT_PALETTE_SATURATION(),
    scaleCurves: {
      Surfaces: { lightness: d.Surfaces.lightness(), saturation: d.Surfaces.saturation() },
      Borders: { lightness: d.Borders.lightness(), saturation: d.Borders.saturation() },
      Text: { lightness: d.Text.lightness(), saturation: d.Text.saturation() },
    },
    curveOffset: {},
    overrides: {},
    snappedScales: [],
    ...extra,
  };
}

function buildPalettes(scheme: SchemeDirection, brandL: number, brandHue: number): Record<string, PaletteConfig> {
  return {
    Neutral: mkP('#70787e', scheme),
    Alternate: mkP('#817b78', scheme),
    Background: mkP(
      scheme === 'light' ? oklchToHex(0.9, 0.02, 260) : oklchToHex(0.25, 0.04, 260),
      scheme,
      { emptyStep: scheme === 'light' ? '100' : '850' },
    ),
    Brand: mkP(oklchToHex(brandL, 0.15, brandHue), scheme),
    Accent: mkP(oklchToHex(0.55, 0.14, 40), scheme),
    Special: mkP(oklchToHex(0.5, 0.16, 300), scheme),
  };
}

function applyPatches(
  palettes: Record<string, PaletteConfig>,
  patches: Record<string, Pick<PaletteConfig, 'scaleCurves'>>,
): Record<string, PaletteConfig> {
  const out: Record<string, PaletteConfig> = {};
  for (const [label, cfg] of Object.entries(palettes)) {
    const p = patches[label];
    out[label] = p ? { ...cfg, scaleCurves: { ...cfg.scaleCurves, ...p.scaleCurves } } : cfg;
  }
  return out;
}

const NEUTRAL_BAND = [
  '--surface-neutral-lowest', '--surface-neutral-lower', '--surface-neutral-low',
  '--surface-neutral', '--surface-neutral-high', '--surface-neutral-higher', '--surface-neutral-highest',
];

function adverse(hexes: string[], direction: 'lighter' | 'darker'): string {
  return hexes.reduce((best, h) =>
    (direction === 'lighter' ? hexToOklch(h).l > hexToOklch(best).l : hexToOklch(h).l < hexToOklch(best).l) ? h : best,
  );
}

describe('solveTextCurves — patches only touch the Text scale', () => {
  it('emits a 5-anchor Text lightness curve and leaves Surfaces/Borders alone', () => {
    const { patches } = solveTextCurves(buildPalettes('dark', 0.55, 0), 'dark');
    const brandText = patches.Brand.scaleCurves.Text;
    expect(Object.keys(patches.Brand.scaleCurves)).toEqual(['Text']);
    expect(brandText.lightness).toHaveLength(5);
    expect(brandText.lightness.map((a) => a.x)).toEqual([0, 25, 50, 75, 100]);
    expect(brandText.saturation).toHaveLength(5);
  });
});

describe('solveTextCurves — cssVarOverrides per scheme', () => {
  it('dark emits none', () => {
    const { cssVarOverrides } = solveTextCurves(buildPalettes('dark', 0.55, 0), 'dark');
    expect(cssVarOverrides).toEqual({});
  });

  it('light adds --text-inverted → var(--color-neutral-100)', () => {
    const { cssVarOverrides } = solveTextCurves(buildPalettes('light', 0.55, 0), 'light');
    expect(cssVarOverrides).toEqual({ '--text-inverted': 'var(--color-neutral-100)' });
  });

  it('infers scheme from resolved --page-bg lightness when omitted', () => {
    expect(solveTextCurves(buildPalettes('light', 0.55, 0)).cssVarOverrides).toEqual({
      '--text-inverted': 'var(--color-neutral-100)',
    });
    expect(solveTextCurves(buildPalettes('dark', 0.55, 0)).cssVarOverrides).toEqual({});
  });
});

describe('solveTextCurves — guaranteed pairings meet their ratio post-round-trip', () => {
  const schemes: SchemeDirection[] = ['light', 'dark'];
  const hues = [0, 60, 120, 180, 240, 300];
  const brandLs = [0.35, 0.55, 0.75];

  for (const scheme of schemes) {
    for (const brandHue of hues) {
      for (const brandL of brandLs) {
        it(`scheme=${scheme} hue=${brandHue} L=${brandL}`, () => {
          const palettes = buildPalettes(scheme, brandL, brandHue);
          const { patches } = solveTextCurves(palettes, scheme);
          const vars = palettesToVars(applyPatches(palettes, patches));

          const direction = scheme === 'light' ? 'darker' : 'lighter';
          const surfaceDefault = vars['--surface-neutral'];
          const pageBg = vars['--page-bg'];
          const band = NEUTRAL_BAND.map((v) => vars[v]);
          const bandAdverse = adverse(band, direction);
          const worst = adverse([surfaceDefault, pageBg], direction);

          // Neutral family.
          expect(contrastRatio(vars['--text-primary'], bandAdverse)).toBeGreaterThanOrEqual(4.5);
          expect(contrastRatio(vars['--text-secondary'], bandAdverse)).toBeGreaterThanOrEqual(4.5);
          expect(contrastRatio(vars['--text-tertiary'], surfaceDefault)).toBeGreaterThanOrEqual(4.5);
          expect(contrastRatio(vars['--text-muted'], surfaceDefault)).toBeGreaterThanOrEqual(3.0);

          // Chromatic families.
          expect(contrastRatio(vars['--text-brand'], worst)).toBeGreaterThanOrEqual(4.5);
          expect(contrastRatio(vars['--text-brand-secondary'], surfaceDefault)).toBeGreaterThanOrEqual(4.5);
          expect(contrastRatio(vars['--text-accent'], worst)).toBeGreaterThanOrEqual(4.5);
          expect(contrastRatio(vars['--text-accent-secondary'], surfaceDefault)).toBeGreaterThanOrEqual(4.5);
        });
      }
    }
  }
});

describe('solveTextCurves — report agrees with derivation', () => {
  it('every guaranteed pairing reports meets=true for the feasible families', () => {
    const { report } = solveTextCurves(buildPalettes('dark', 0.45, 210), 'dark');
    const feasible = new Set(['Neutral', 'Brand', 'Accent']);
    for (const p of report) {
      if (p.guaranteed && feasible.has(p.family)) expect(p.meets).toBe(true);
    }
  });
});
