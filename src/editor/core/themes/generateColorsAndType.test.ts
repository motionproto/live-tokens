import { describe, expect, it } from 'vitest';
import { buildColorsAndTypeFromSeeds, type ColorsAndTypeBrief } from './generateColorsAndType';
import { palettesToVars } from '../palettes/paletteDerivation';
import { CURRENT_COLORS_AND_TYPE_SCHEMA_VERSION } from './migrations/index';
import type { Oklch } from '../palettes/oklch';

const NOW = '2026-08-12T00:00:00.000Z';

function seeds(overrides: Record<string, Oklch | string> = {}): Record<string, Oklch | string> {
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

const lightBrief: ColorsAndTypeBrief = { name: 'Spring Meadow', scheme: 'light', seeds: seeds({ Brand: '#2f9e44' }) };

const darkBrief: ColorsAndTypeBrief = {
  name: 'Midnight Violet',
  scheme: 'dark',
  seeds: seeds({
    Brand: { l: 0.78, c: 0.12, h: 300 },
    Accent: { l: 0.8, c: 0.1, h: 340 },
    Canvas: { l: 0.2, c: 0.02, h: 280 },
    Neutral: { l: 0.57, c: 0.013, h: 285 },
    Warning: { l: 0.8, c: 0.12, h: 85 },
  }),
};

describe('buildColorsAndTypeFromSeeds', () => {
  it('assembles complete colors and type from a light brief', () => {
    const { colorsAndType, slug, report } = buildColorsAndTypeFromSeeds(lightBrief, {}, NOW);
    expect(slug).toBe('spring-meadow');
    expect(colorsAndType.name).toBe('Spring Meadow');
    expect(colorsAndType.createdAt).toBe(NOW);
    expect(Object.keys(colorsAndType.editorConfigs)).toHaveLength(10);
    expect(colorsAndType.schemaVersion).toBe(CURRENT_COLORS_AND_TYPE_SCHEMA_VERSION);
    expect(colorsAndType.harmonyAxes).toHaveLength(4);
    expect(colorsAndType.harmonyAxes![0]).toMatchObject({ family: 'Brand' });
    expect(colorsAndType.harmonyAxes![0].hue).toBeCloseTo(colorsAndType.editorConfigs.Brand.baseColor.h, 5);

    const vars = palettesToVars(colorsAndType.editorConfigs);
    for (const required of ['--color-brand-500', '--surface-neutral', '--text-primary', '--page-bg']) {
      expect(vars[required]).toMatch(/^#[0-9a-f]{6}$/);
    }
    expect(report.failures).toEqual([]);
    for (const check of report.checks) expect(check.ratio).toBeGreaterThanOrEqual(check.floor);
  });

  it('meets every floor on a dark brief, auto-correcting where the seeds fall short', () => {
    const { report } = buildColorsAndTypeFromSeeds(darkBrief, {}, NOW);
    expect(report.failures).toEqual([]);
    for (const check of report.checks) expect(check.ratio).toBeGreaterThanOrEqual(check.floor);
  });

  it('reports unreachable floors instead of silently passing', () => {
    const brief: ColorsAndTypeBrief = {
      name: 'Doomed',
      scheme: 'dark',
      seeds: seeds({ Neutral: { l: 0.15, c: 0.013, h: 285 }, Canvas: { l: 0.2, c: 0.02, h: 280 } }),
    };
    const { report } = buildColorsAndTypeFromSeeds(brief, {}, NOW);
    const primary = report.checks.find((c) => c.textVar === '--text-primary')!;
    expect(primary.pass).toBe(false);
    expect(report.failures.some((f) => f.includes('--text-primary'))).toBe(true);
  });

  it('refuses the protected default name and malformed briefs', () => {
    expect(() => buildColorsAndTypeFromSeeds({ ...lightBrief, name: 'Default' }, {}, NOW)).toThrow(/protected/);
    const { Brand: _dropped, ...missingBrand } = seeds();
    expect(() => buildColorsAndTypeFromSeeds({ name: 'x', scheme: 'light', seeds: missingBrand }, {}, NOW)).toThrow(
      /seeds\.Brand: missing/,
    );
  });

  it('carries forward non-palette cssVariables and fonts, stripping derivation-owned keys', () => {
    const carry = {
      cssVariables: { '--surface-brand': '#123456', '--gradient-1': 'linear-gradient(90deg, #000, #fff)' },
      fontStacks: [{ variable: '--font-sans' as const, slots: [] }],
    };
    const { colorsAndType } = buildColorsAndTypeFromSeeds(lightBrief, carry, NOW);
    expect(colorsAndType.cssVariables['--surface-brand']).toBeUndefined();
    // The carried string is a projection of stock gradients; the rebuilt basis supersedes it.
    expect(colorsAndType.cssVariables['--gradient-1']).toBe(
      'linear-gradient(90deg, var(--color-brand-400) 0%, var(--color-brand-700) 100%)',
    );
    expect(colorsAndType.fontStacks).toEqual(carry.fontStacks);
  });

  it('rebuilds absent/stock swatch gradients from the theme families, falling back within-family for distant hues', () => {
    const { colorsAndType, report } = buildColorsAndTypeFromSeeds(lightBrief, {}, NOW);
    expect(report.gradients).toBe('recipes');
    const stops = colorsAndType.gradients!.map((g) => g.stops.map((s) => s.color));
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
    const { colorsAndType, report } = buildColorsAndTypeFromSeeds(lightBrief, { gradients: tuned }, NOW);
    expect(report.gradients).toBe('carried');
    expect(colorsAndType.gradients).toBe(tuned);
    expect(colorsAndType.cssVariables['--gradient-1']).toContain('33deg');
  });

  it('canvasGradient: true turns on the page sky on the scheme-safe side of the Canvas anchor', () => {
    const dark = buildColorsAndTypeFromSeeds({ ...darkBrief, canvasGradient: true }, {}, NOW);
    const canvas = dark.colorsAndType.editorConfigs.Canvas;
    expect(canvas.emptyMode).toBe('gradient');
    expect(canvas.gradientSize).toBe('window');
    const anchorLabel = canvas.gradientStops![1].paletteLabel;
    const skyLabel = canvas.gradientStops![0].paletteLabel;
    expect(Number(skyLabel)).toBeGreaterThan(Number(anchorLabel));
    expect(dark.report.canvasGradient).toBe(`on, ${skyLabel} → ${anchorLabel}`);

    // A committed light canvas has room on the light side.
    const committed = { ...lightBrief, canvasGradient: true, seeds: seeds({ Brand: '#2f9e44', Canvas: { l: 0.88, c: 0.06, h: 120 } }) };
    const light = buildColorsAndTypeFromSeeds(committed, {}, NOW);
    const stops = light.colorsAndType.editorConfigs.Canvas.gradientStops!;
    expect(Number(stops[0].paletteLabel)).toBeLessThan(Number(stops[1].paletteLabel));

    // A near-white canvas anchors at the ramp edge: sky skipped, and the report says so.
    const edge = buildColorsAndTypeFromSeeds({ ...lightBrief, canvasGradient: true }, {}, NOW);
    expect(edge.colorsAndType.editorConfigs.Canvas.emptyMode).toBeUndefined();
    expect(edge.report.canvasGradient).toMatch(/^skipped/);

    const off = buildColorsAndTypeFromSeeds(lightBrief, {}, NOW);
    expect(off.colorsAndType.editorConfigs.Canvas.emptyMode).toBeUndefined();
    expect(off.report.canvasGradient).toBeUndefined();
  });
});
