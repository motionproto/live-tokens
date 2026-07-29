import { describe, expect, it } from 'vitest';
import { recommendNeutralText, SUGGESTED_STEP_DROP, BW_GUARD_MIN_L, BW_GUARD_MAX_L } from './recommendText';
import { NEUTRAL_BAND } from './solveTextContrast';
import { contrastRatio } from './contrast';
import { hexToOklch, oklchToHex } from './oklch';
import {
  palettesToValues,
  palettesToVars,
  scaleCurveDefaults,
  DEFAULT_PALETTE_LIGHTNESS,
  DEFAULT_PALETTE_SATURATION,
  type SchemeDirection,
} from './paletteDerivation';
import type { PaletteConfig } from '../themes/themeTypes';

function mkP(baseColorHex: string, scheme: SchemeDirection, extra: Partial<PaletteConfig> = {}): PaletteConfig {
  const d = scaleCurveDefaults(scheme);
  return {
    baseColor: hexToOklch(baseColorHex),
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

function buildPalettes(scheme: SchemeDirection, neutralHex = '#70787e'): Record<string, PaletteConfig> {
  return {
    Neutral: mkP(neutralHex, scheme),
    Canvas: mkP(scheme === 'light' ? oklchToHex(0.9, 0.02, 260) : oklchToHex(0.25, 0.04, 260), scheme),
  };
}

function adverseBandHex(palettes: Record<string, PaletteConfig>, scheme: SchemeDirection): string {
  const vars = palettesToVars(palettes);
  const direction = scheme === 'light' ? 'darker' : 'lighter';
  return NEUTRAL_BAND.map((v) => vars[v]).reduce((best, h) =>
    (direction === 'lighter' ? hexToOklch(h).l > hexToOklch(best).l : hexToOklch(h).l < hexToOklch(best).l) ? h : best,
  );
}

describe('recommendNeutralText — hierarchy and floors', () => {
  const schemes: SchemeDirection[] = ['dark', 'light'];

  for (const scheme of schemes) {
    it(`${scheme}: ordered steps, primary AA on the full band, tertiary AA on the default surface`, () => {
      const palettes = buildPalettes(scheme);
      const rec = recommendNeutralText(palettes, scheme);
      const [p, s, t] = rec.suggestions.map((x) => x.suggested);

      if (scheme === 'dark') {
        expect(p.l).toBeGreaterThanOrEqual(s.l);
        expect(s.l).toBeGreaterThanOrEqual(t.l);
      } else {
        expect(p.l).toBeLessThanOrEqual(s.l);
        expect(s.l).toBeLessThanOrEqual(t.l);
      }
      expect(Math.abs(p.l - t.l)).toBeLessThanOrEqual(2 * SUGGESTED_STEP_DROP + 1e-6);

      expect(p.coverage.full).toBe(true);
      const surfaceDefault = palettesToVars(palettes)['--surface-neutral'];
      expect(contrastRatio(s.hex, surfaceDefault)).toBeGreaterThanOrEqual(4.5);
      expect(contrastRatio(t.hex, surfaceDefault)).toBeGreaterThanOrEqual(4.5);
    });
  }

  it('keeps a compliant current primary as the anchor', () => {
    const palettes = buildPalettes('dark');
    // Lift the curve's primary end past the band-adverse AA floor but inside
    // the black/white guard; the suggestion must then not move it.
    const d = scaleCurveDefaults('dark');
    const anchors = d.Text.lightness();
    palettes.Neutral.scaleCurves = {
      ...palettes.Neutral.scaleCurves,
      Text: { lightness: [{ ...anchors[0], y: 155 }, anchors[1]], saturation: d.Text.saturation() },
    };
    const rec = recommendNeutralText(palettes, 'dark');
    const primary = rec.suggestions[0];
    expect(primary.current.coverage.full).toBe(true);
    expect(primary.suggested.l).toBeCloseTo(primary.current.l, 6);
    expect(primary.differs).toBe(false);
  });

  it('lifts a non-compliant primary to floor + two drops', () => {
    const palettes = buildPalettes('dark');
    // Flatten the text curve so every step sits at the seed L (low contrast).
    const d = scaleCurveDefaults('dark');
    palettes.Neutral.scaleCurves = {
      ...palettes.Neutral.scaleCurves,
      Text: {
        lightness: [
          { ...d.Text.lightness()[0], y: 100 },
          { ...d.Text.lightness()[1], y: 100 },
        ],
        saturation: d.Text.saturation(),
      },
    };
    const rec = recommendNeutralText(palettes, 'dark');
    const [p, , t] = rec.suggestions;
    expect(p.differs).toBe(true);
    expect(p.suggested.l).toBeGreaterThan(p.current.l);
    expect(p.suggested.coverage.full).toBe(true);
    expect(contrastRatio(t.suggested.hex, palettesToVars(palettes)['--surface-neutral'])).toBeGreaterThanOrEqual(4.5);
  });
});

describe('recommendNeutralText — pure black/white is opt-in', () => {
  const withPrimaryY = (scheme: SchemeDirection, y: number) => {
    const palettes = buildPalettes(scheme);
    const d = scaleCurveDefaults(scheme);
    const anchors = d.Text.lightness();
    palettes.Neutral.scaleCurves = {
      ...palettes.Neutral.scaleCurves,
      Text: { lightness: [{ ...anchors[0], y }, anchors[1]], saturation: d.Text.saturation() },
    };
    return palettes;
  };

  it('dark: a pure-white current primary is pulled inside the guard', () => {
    const rec = recommendNeutralText(withPrimaryY('dark', 200), 'dark');
    const p = rec.suggestions[0];
    expect(p.current.l).toBeCloseTo(1, 2);
    expect(p.suggested.hex).not.toBe('#ffffff');
    expect(p.suggested.l).toBeLessThanOrEqual(BW_GUARD_MAX_L + 1e-6);
    expect(p.suggested.coverage.full).toBe(true);
  });

  it('light: a pure-black current primary is pulled inside the guard', () => {
    const rec = recommendNeutralText(withPrimaryY('light', 0), 'light');
    const p = rec.suggestions[0];
    expect(p.suggested.hex).not.toBe('#000000');
    expect(p.suggested.l).toBeGreaterThanOrEqual(BW_GUARD_MIN_L - 1e-6);
  });

  it('opting in anchors primary at the scheme extreme', () => {
    const dark = recommendNeutralText(buildPalettes('dark'), 'dark', true);
    expect(dark.suggestions[0].suggested.hex).toBe('#ffffff');
    const light = recommendNeutralText(buildPalettes('light'), 'light', true);
    expect(light.suggestions[0].suggested.hex).toBe('#000000');
  });

  it('the hierarchy still steps down from the opted-in extreme', () => {
    const rec = recommendNeutralText(buildPalettes('dark'), 'dark', true);
    const [p, s, t] = rec.suggestions.map((x) => x.suggested);
    expect(p.l).toBeGreaterThan(s.l);
    expect(s.l).toBeGreaterThan(t.l);
    expect(contrastRatio(t.hex, palettesToVars(buildPalettes('dark'))['--surface-neutral'])).toBeGreaterThanOrEqual(4.5);
  });
});

describe('recommendNeutralText — coverage report', () => {
  it('cleared/total agree with per-surface checks and reach is a prefix', () => {
    const rec = recommendNeutralText(buildPalettes('dark'), 'dark');
    for (const s of rec.suggestions) {
      for (const cov of [s.current.coverage, s.suggested.coverage]) {
        expect(cov.total).toBe(NEUTRAL_BAND.length);
        expect(cov.cleared).toBe(cov.checks.filter((c) => c.meets).length);
        expect(cov.full).toBe(cov.cleared === cov.total);
        if (cov.reachVar !== null) {
          const idx = cov.checks.findIndex((c) => c.var === cov.reachVar);
          expect(cov.checks.slice(0, idx + 1).every((c) => c.meets)).toBe(true);
        }
      }
    }
  });

  it('reports partial reach without throwing when the window cannot span the band', () => {
    // Dark neutral seed: reachable text L caps at 2×seedL, below what the
    // lightest band surfaces need for AA.
    const palettes = buildPalettes('dark', oklchToHex(0.28, 0.01, 240));
    const rec = recommendNeutralText(palettes, 'dark');
    const t = rec.suggestions[2];
    expect(t.suggested.coverage.full).toBe(false);
    expect(t.suggested.coverage.cleared).toBeLessThan(t.suggested.coverage.total);
  });
});

describe('recommendNeutralText — patch round-trip', () => {
  it('applying the patch reproduces the suggested Ls and pins muted/disabled', () => {
    const palettes = buildPalettes('dark');
    const d = scaleCurveDefaults('dark');
    palettes.Neutral.scaleCurves = {
      ...palettes.Neutral.scaleCurves,
      Text: {
        lightness: [
          { ...d.Text.lightness()[0], y: 100 },
          { ...d.Text.lightness()[1], y: 100 },
        ],
        saturation: d.Text.saturation(),
      },
    };
    const before = palettesToValues(palettes);
    const rec = recommendNeutralText(palettes, 'dark');
    expect(rec.patch).not.toBeNull();

    const patched: Record<string, PaletteConfig> = {
      ...palettes,
      Neutral: {
        ...palettes.Neutral,
        scaleCurves: { ...palettes.Neutral.scaleCurves, Text: rec.patch! },
      },
    };
    const after = palettesToValues(patched);

    const steps = [
      ['--text-primary', rec.suggestions[0].suggested.l],
      ['--text-secondary', rec.suggestions[1].suggested.l],
      ['--text-tertiary', rec.suggestions[2].suggested.l],
    ] as const;
    for (const [varName, l] of steps) {
      const v = after[varName];
      expect(v?.kind).toBe('color');
      if (v?.kind === 'color') expect(v.l).toBeCloseTo(l, 2);
    }
    for (const varName of ['--text-muted', '--text-disabled']) {
      const b = before[varName];
      const a = after[varName];
      if (b?.kind === 'color' && a?.kind === 'color') expect(a.l).toBeCloseTo(b.l, 2);
    }
  });

  it('emits no patch when nothing differs', () => {
    const palettes = buildPalettes('dark');
    const rec = recommendNeutralText(palettes, 'dark');
    if (!rec.anyDiffers) expect(rec.patch).toBeNull();
    // Re-running on an applied suggestion is stable: apply, re-recommend, no diff.
    if (rec.patch) {
      const patched: Record<string, PaletteConfig> = {
        ...palettes,
        Neutral: { ...palettes.Neutral, scaleCurves: { ...palettes.Neutral.scaleCurves, Text: rec.patch } },
      };
      const again = recommendNeutralText(patched, 'dark');
      expect(again.anyDiffers).toBe(false);
    }
  });
});
