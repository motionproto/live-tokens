import { describe, expect, it } from 'vitest';
import { buildColors, shadowOpacityForCanvas, type ColorsInput } from './buildColors';
import { palettesToVars } from '../palettes/paletteDerivation';
import type { Oklch } from '../palettes/oklch';

function baseColors(overrides: Record<string, Oklch | string> = {}): Record<string, Oklch | string> {
  return {
    Brand: { l: 0.62, c: 0.17, h: 145 },
    Accent: { l: 0.8, c: 0.15, h: 95 },
    Special: { l: 0.6, c: 0.19, h: 300 },
    Canvas: { l: 0.97, c: 0.01, h: 120 },
    Neutral: { l: 0.55, c: 0.012, h: 140 },
    Alternate: { l: 0.58, c: 0.009, h: 60 },
    Info: { l: 0.6, c: 0.15, h: 255 },
    Success: { l: 0.6, c: 0.16, h: 150 },
    Warning: { l: 0.75, c: 0.15, h: 85 },
    Danger: { l: 0.58, c: 0.2, h: 25 },
    ...overrides,
  };
}

const lightInput: ColorsInput = { scheme: 'light', baseColors: baseColors({ Brand: '#2f9e44' }) };

const darkInput: ColorsInput = {
  scheme: 'dark',
  baseColors: baseColors({
    Brand: { l: 0.78, c: 0.12, h: 300 },
    Accent: { l: 0.8, c: 0.1, h: 340 },
    Canvas: { l: 0.2, c: 0.02, h: 280 },
    Neutral: { l: 0.57, c: 0.013, h: 285 },
    Warning: { l: 0.8, c: 0.12, h: 85 },
  }),
};

describe('buildColors', () => {
  it('assembles the color state from a light scheme', () => {
    const { colors, report } = buildColors(lightInput);
    expect(Object.keys(colors)).toEqual(['editorConfigs', 'harmonyAxes', 'gradients', 'cssVariables']);
    expect(Object.keys(colors.editorConfigs)).toHaveLength(10);
    expect(colors.harmonyAxes).toHaveLength(4);
    expect(colors.harmonyAxes[0]).toMatchObject({ family: 'Brand' });
    expect(colors.harmonyAxes[0].hue).toBeCloseTo(colors.editorConfigs.Brand.baseColor.h, 5);

    const vars = palettesToVars(colors.editorConfigs);
    for (const required of ['--color-brand-500', '--surface-neutral', '--text-primary', '--page-bg']) {
      expect(vars[required]).toMatch(/^oklch\([\d.]+ [\d.]+ [\d.]+\)$/);
    }
    expect(report.failures).toEqual([]);
    for (const check of report.checks) expect(check.ratio).toBeGreaterThanOrEqual(check.floor);
  });

  it('meets every floor on a dark scheme, auto-correcting where the base colors fall short', () => {
    const { report } = buildColors(darkInput);
    expect(report.failures).toEqual([]);
    for (const check of report.checks) expect(check.ratio).toBeGreaterThanOrEqual(check.floor);
  });

  it('reports unreachable floors instead of silently passing', () => {
    const input: ColorsInput = {
      scheme: 'dark',
      baseColors: baseColors({ Neutral: { l: 0.15, c: 0.013, h: 285 }, Canvas: { l: 0.2, c: 0.02, h: 280 } }),
    };
    const { report } = buildColors(input);
    const primary = report.checks.find((c) => c.textVar === '--text-primary')!;
    expect(primary.pass).toBe(false);
    expect(report.failures.some((f) => f.includes('--text-primary'))).toBe(true);
  });

  it('refuses malformed input', () => {
    const { Brand: _dropped, ...missingBrand } = baseColors();
    expect(() => buildColors({ scheme: 'light', baseColors: missingBrand })).toThrow(
      /baseColors\.Brand: missing/,
    );
  });

  it('carries forward non-palette cssVariables, stripping derivation-owned keys', () => {
    const carry = {
      cssVariables: {
        '--surface-brand': '#123456',
        '--radius-lg': '1rem',
        '--gradient-1': 'linear-gradient(90deg, #000, #fff)',
      },
    };
    const { colors } = buildColors(lightInput, carry);
    expect(colors.cssVariables['--surface-brand']).toBeUndefined();
    expect(colors.cssVariables['--radius-lg']).toBe('1rem');
    // The carried string is a projection of stock gradients; the rebuilt basis supersedes it.
    expect(colors.cssVariables['--gradient-1']).toBe(
      'linear-gradient(90deg, var(--color-brand-400) 0%, var(--color-brand-700) 100%)',
    );
  });

  it('rebuilds absent/stock swatch gradients from the theme families, falling back within-family for distant hues', () => {
    const { colors, report } = buildColors(lightInput);
    expect(report.gradients).toBe('recipes');
    const stops = colors.gradients.map((g) => g.stops.map((s) => s.color));
    expect(stops[0]).toEqual(['--color-brand-400', '--color-brand-700']);
    // Special (300) vs Brand (~146) exceeds 120° → within-family fallback.
    expect(stops[1]).toEqual(['--color-special-400', '--color-special-700']);
    // Brand (~146) vs Accent (95) is adjacent → cross-family pair.
    expect(stops[2]).toEqual(['--color-brand-500', '--color-accent-500']);
    // Light scheme sweeps the light half of the canvas ramp.
    expect(stops[3]).toEqual(['--color-canvas-200', '--color-canvas-500']);
  });

  it('keeps user-tuned gradients untouched', () => {
    const tuned = [
      { variable: '--gradient-1', type: 'linear' as const, angle: 33,
        stops: [{ position: 0, color: '--color-brand-200' }, { position: 100, color: '--color-brand-900' }] },
    ];
    const { colors, report } = buildColors(lightInput, { gradients: tuned });
    expect(report.gradients).toBe('carried');
    expect(colors.gradients).toBe(tuned);
    expect(colors.cssVariables['--gradient-1']).toContain('33deg');
  });

  it('canvasGradient: true turns on the page sky on the scheme-safe side of the Canvas anchor', () => {
    const dark = buildColors({ ...darkInput, canvasGradient: true });
    const canvas = dark.colors.editorConfigs.Canvas;
    expect(canvas.emptyMode).toBe('gradient');
    expect(canvas.gradientSize).toBe('window');
    const anchorLabel = canvas.gradientStops![1].paletteLabel;
    const skyLabel = canvas.gradientStops![0].paletteLabel;
    expect(Number(skyLabel)).toBeGreaterThan(Number(anchorLabel));
    expect(dark.report.canvasGradient).toBe(`on, ${skyLabel} → ${anchorLabel}`);

    // A committed light canvas has room on the light side.
    const committed = { ...lightInput, canvasGradient: true, baseColors: baseColors({ Brand: '#2f9e44', Canvas: { l: 0.88, c: 0.06, h: 120 } }) };
    const light = buildColors(committed);
    const stops = light.colors.editorConfigs.Canvas.gradientStops!;
    expect(Number(stops[0].paletteLabel)).toBeLessThan(Number(stops[1].paletteLabel));

    // A near-white canvas anchors at the ramp edge: sky skipped, and the report says so.
    const edge = buildColors({ ...lightInput, canvasGradient: true });
    expect(edge.colors.editorConfigs.Canvas.emptyMode).toBeUndefined();
    expect(edge.report.canvasGradient).toMatch(/^skipped/);

    const off = buildColors(lightInput);
    expect(off.colors.editorConfigs.Canvas.emptyMode).toBeUndefined();
    expect(off.report.canvasGradient).toBeUndefined();
  });

  it('softens shadow opacity as the canvas lightens, keeping full weight on dark grounds', () => {
    expect(shadowOpacityForCanvas(0.2)).toBe(0.9);
    expect(shadowOpacityForCanvas(0.5)).toBe(0.9);
    expect(shadowOpacityForCanvas(0.7)).toBe(0.55);
    expect(shadowOpacityForCanvas(0.97)).toBe(0.2);

    const light = buildColors(lightInput);
    expect(light.colors.cssVariables['--shadow-md']).toBe('3px 3px 6px hsla(237, 18%, 3%, 0.2)');
    expect(light.report.shadows).toBe('opacity 0.2 for a canvas at L 0.97');

    const dark = buildColors(darkInput);
    expect(dark.colors.cssVariables['--shadow-md']).toBe('3px 3px 6px hsla(237, 18%, 3%, 0.9)');
  });

  it('recolors carried shadow geometry rather than replacing it', () => {
    const carry = { cssVariables: { '--shadow-md': '9px 9px 20px 2px hsla(20, 40%, 10%, 0.9)' } };
    const { colors } = buildColors(lightInput, carry);
    expect(colors.cssVariables['--shadow-md']).toBe('9px 9px 20px 2px hsla(20, 40%, 10%, 0.2)');
  });
});
