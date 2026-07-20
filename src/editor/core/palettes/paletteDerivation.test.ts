import { describe, expect, it } from 'vitest';
import * as core from './paletteDerivation';
import * as ui from '../../ui/palette/paletteMath';
import {
  reconcilePalettesFromCssVars,
  palettesToVars,
  DEFAULT_PALETTE_LIGHTNESS,
  DEFAULT_PALETTE_SATURATION,
  defaultScaleCurves,
} from './paletteDerivation';
import type { PaletteConfig } from '../themes/themeTypes';
import defaultTheme from '../../../live-tokens/data/themes/default.json';

// Keeps each test case explicit about which fields a palette starts with so
// the reconciler's behaviour is unambiguous.
function palette(baseColor: string, extra: Partial<PaletteConfig> = {}): PaletteConfig {
  return {
    baseColor,
    lightnessCurve: DEFAULT_PALETTE_LIGHTNESS(),
    saturationCurve: DEFAULT_PALETTE_SATURATION(),
    scaleCurves: {
      Surfaces: { lightness: defaultScaleCurves.Surfaces.lightness(), saturation: defaultScaleCurves.Surfaces.saturation() },
      Borders:  { lightness: defaultScaleCurves.Borders.lightness(),  saturation: defaultScaleCurves.Borders.saturation()  },
      Text:     { lightness: defaultScaleCurves.Text.lightness(),     saturation: defaultScaleCurves.Text.saturation()     },
    },
    curveOffset: {},
    overrides: {},
    snappedScales: [],
    anchorToBase: true,
    ...extra,
  };
}

describe('reconcilePalettesFromCssVars', () => {
  it('snaps baseColor when _imported is true and an anchor is present', () => {
    const palettes = { Brand: palette('#fb2898', { _imported: true }) };
    const { palettes: next, snapped } = reconcilePalettesFromCssVars(palettes, {
      '--color-brand-500': '#bd6a08',
    });
    expect(next.Brand.baseColor).toBe('#bd6a08');
    expect(next.Brand._imported).toBe(false);
    expect(snapped.has('Brand')).toBe(true);
  });

  it('leaves baseColor untouched when _imported is false even if anchor diverges', () => {
    // This is the default.json case: typed state was authored in the editor;
    // cssVariables is stale legacy data. Snap-on-divergence would have flipped
    // teal accent → olive. See temp/manifest-robustness-plan.md §9.
    const palettes = { Accent: palette('#008582') };
    const { palettes: next, snapped } = reconcilePalettesFromCssVars(palettes, {
      '--color-accent-500': '#9d7f00',
    });
    expect(next.Accent.baseColor).toBe('#008582');
    expect(snapped.size).toBe(0);
  });

  it('snaps baseColor for neutral palettes too (one unified path)', () => {
    const palettes = { Neutral: palette('#808080', { _imported: true }) };
    const { palettes: next, snapped } = reconcilePalettesFromCssVars(palettes, {
      '--color-neutral-500': '#7d7570',
    });
    expect(next.Neutral.baseColor).toBe('#7d7570');
    expect(next.Neutral._imported).toBe(false);
    expect(snapped.has('Neutral')).toBe(true);
  });

  it('clears _imported even when no anchor is present (flag has nothing to do)', () => {
    const palettes = { Brand: palette('#fb2898', { _imported: true }) };
    const { palettes: next } = reconcilePalettesFromCssVars(palettes, {});
    expect(next.Brand.baseColor).toBe('#fb2898');
    expect(next.Brand._imported).toBe(false);
  });

  it('reports every palette-derived key in `consumed` regardless of flag', () => {
    // Even unflagged palettes: the renderer overlays palettesToVars, so any
    // palette-derived value in cssVariables is dead data — strip it.
    const palettes = { Accent: palette('#008582') };
    const { consumed } = reconcilePalettesFromCssVars(palettes, {});
    expect(consumed.has('--color-accent-500')).toBe(true);
    expect(consumed.has('--surface-accent')).toBe(true);
    expect(consumed.has('--text-accent')).toBe(true);
  });

  it('is idempotent: second call with the same input is a no-op', () => {
    const palettes = { Brand: palette('#fb2898', { _imported: true }) };
    const cssVars = { '--color-brand-500': '#bd6a08' };
    const first = reconcilePalettesFromCssVars(palettes, cssVars);
    // After the first call cleared _imported, the second call has nothing
    // to snap to. Equal output ↔ idempotent.
    const second = reconcilePalettesFromCssVars(first.palettes, cssVars);
    expect(second.palettes.Brand.baseColor).toBe(first.palettes.Brand.baseColor);
    expect(second.palettes.Brand._imported).toBe(false);
    expect(second.snapped.size).toBe(0);
  });
});

describe('paletteMath re-exports resolve to the core implementations', () => {
  it('every moved symbol is the same binding as core', () => {
    expect(ui.SCALES).toBe(core.SCALES);
    expect(ui.scales).toBe(core.SCALES);
    expect(ui.PALETTE_STEPS).toBe(core.PALETTE_STEPS);
    expect(ui.computePaletteColor).toBe(core.computePaletteColor);
    expect(ui.computeDerivedColor).toBe(core.computeDerivedColor);
    expect(ui.stepIndexToX).toBe(core.stepIndexToX);
    expect(ui.scaleStepToX).toBe(core.scaleStepToX);
    expect(ui.paletteStepKey).toBe(core.paletteStepKey);
    expect(ui.stepKey).toBe(core.stepKey);
    expect(ui.DEFAULT_PALETTE_LIGHTNESS).toBe(core.DEFAULT_PALETTE_LIGHTNESS);
    expect(ui.DEFAULT_PALETTE_SATURATION).toBe(core.DEFAULT_PALETTE_SATURATION);
  });
});

describe('derivation is byte-stable (Global invariant 1)', () => {
  const editorConfigs = defaultTheme.editorConfigs as unknown as Record<string, PaletteConfig>;

  it('palettesToVars(default.json editorConfigs) is unchanged', () => {
    expect(palettesToVars(editorConfigs)).toMatchSnapshot();
  });

  it('pins exact hexes for the default Brand config', () => {
    const out = palettesToVars({ Brand: editorConfigs.Brand });
    expect(out['--color-brand-500']).toBe('#fb2898');
    expect(out['--color-brand-100']).toBe('#ffbad3');
    expect(out['--color-brand-950']).toBe('#100005');
    expect(out['--surface-brand']).toBe('#89004e');
    expect(out['--border-brand']).toBe('#ae0065');
    expect(out['--text-brand']).toBe('#ff75b1');
  });
});
