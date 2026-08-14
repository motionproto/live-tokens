import { describe, expect, it } from 'vitest';
import * as core from './paletteDerivation';
import * as ui from '../../ui/palette/paletteMath';
import {
  reconcilePalettesFromCssVars,
  palettesToVars,
  DEFAULT_PALETTE_LIGHTNESS,
  DEFAULT_PALETTE_SATURATION,
  defaultScaleCurves,
  scaleCurveDefaults,
  computeDerivedOklch,
  stepKey,
  SCALES,
  type ScaleCurveDefaults,
} from './paletteDerivation';
import { hexToOklch, type Oklch } from './oklch';
import { migratePaletteColorsToOklch, type PreOklchPaletteConfig } from '../themes/migrations/2026-07-21-palette-oklch-basis';
import { adoptLegacyBaseAnchor } from '../themes/migrations/2026-07-24-base-anchor-placement';
import { adoptBackgroundSpotAsBase } from '../themes/migrations/2026-07-25-background-spot-to-base';
import { placeUnplacedBaseAnchors } from '../themes/migrations/2026-07-29-place-base-anchors';
import { makeAnchor, sampleCurve, type CurveAnchor } from '../../ui/curveEngine';
import type { PaletteConfig } from '../themes/themeTypes';
import defaultColorsAndType from '../../../live-tokens/data/themes/default.json';

// Keeps each test case explicit about which fields a palette starts with so
// the reconciler's behaviour is unambiguous. Takes hex for readability and
// stores the OKLCH basis.
function palette(baseColorHex: string, extra: Partial<PaletteConfig> = {}): PaletteConfig {
  return {
    baseColor: hexToOklch(baseColorHex),
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
    expect(next.Brand.baseColor).toEqual(hexToOklch('#bd6a08'));
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
    expect(next.Accent.baseColor).toEqual(hexToOklch('#008582'));
    expect(snapped.size).toBe(0);
  });

  it('snaps baseColor for neutral palettes too (one unified path)', () => {
    const palettes = { Neutral: palette('#808080', { _imported: true }) };
    const { palettes: next, snapped } = reconcilePalettesFromCssVars(palettes, {
      '--color-neutral-500': '#7d7570',
    });
    expect(next.Neutral.baseColor).toEqual(hexToOklch('#7d7570'));
    expect(next.Neutral._imported).toBe(false);
    expect(snapped.has('Neutral')).toBe(true);
  });

  it('clears _imported even when no anchor is present (flag has nothing to do)', () => {
    const palettes = { Brand: palette('#fb2898', { _imported: true }) };
    const { palettes: next } = reconcilePalettesFromCssVars(palettes, {});
    expect(next.Brand.baseColor).toEqual(hexToOklch('#fb2898'));
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
    expect(second.palettes.Brand.baseColor).toEqual(first.palettes.Brand.baseColor);
    expect(second.palettes.Brand._imported).toBe(false);
    expect(second.snapped.size).toBe(0);
  });
});

describe('paletteMath re-exports resolve to the core implementations', () => {
  it('every moved symbol is the same binding as core', () => {
    expect(ui.SCALES).toBe(core.SCALES);
    expect(ui.scales).toBe(core.SCALES);
    expect(ui.PALETTE_STEPS).toBe(core.PALETTE_STEPS);
    expect(ui.computePaletteOklch).toBe(core.computePaletteOklch);
    expect(ui.computeDerivedOklch).toBe(core.computeDerivedOklch);
    expect(ui.stepIndexToX).toBe(core.stepIndexToX);
    expect(ui.scaleStepToX).toBe(core.scaleStepToX);
    expect(ui.paletteStepKey).toBe(core.paletteStepKey);
    expect(ui.stepKey).toBe(core.stepKey);
    expect(ui.DEFAULT_PALETTE_LIGHTNESS).toBe(core.DEFAULT_PALETTE_LIGHTNESS);
    expect(ui.DEFAULT_PALETTE_SATURATION).toBe(core.DEFAULT_PALETTE_SATURATION);
    expect(ui.defaultScaleCurves).toBe(core.defaultScaleCurves);
    expect(ui.scaleCurveDefaults).toBe(core.scaleCurveDefaults);
  });
});

describe('derivation is byte-stable (Global invariant 1)', () => {
  // default.json is still hex on disk with a legacy background spot;
  // loadFromFile migrates it (OKLCH basis, anchor adoption, spot → base, then
  // placement of the never-edited palettes), so mirror that chain here before
  // deriving. The placement pass is what pins each base color into its own
  // ramp, so leaving it out would derive a theme no one ever loads.
  const editorConfigs = placeUnplacedBaseAnchors(adoptBackgroundSpotAsBase(adoptLegacyBaseAnchor(migratePaletteColorsToOklch(
    defaultColorsAndType.editorConfigs as unknown as Record<string, PreOklchPaletteConfig>,
  ))));

  it('palettesToVars(default.json editorConfigs) is unchanged', () => {
    expect(palettesToVars(editorConfigs)).toMatchSnapshot();
  });

  it('pins exact hexes for the default Brand config', () => {
    const out = palettesToVars({ Brand: editorConfigs.Brand });
    // The clean default lightness range (95 -> 8) places Brand's base color
    // nearest step 400, not the hand-picked 500 the old custom range used.
    expect(out['--color-brand-400']).toBe('#fb2898');
    expect(out['--color-brand-100']).toBe('#ffe7ef');
    expect(out['--color-brand-950']).toBe('#070002');
    expect(out['--surface-brand']).toBe('#89004e');
    expect(out['--border-brand']).toBe('#ae0065');
    expect(out['--text-brand']).toBe('#ff75b1');
  });
});

describe('--text-inverted derivation', () => {
  it('mirrors the derived primary L, same hue and chroma', () => {
    const values = core.palettesToValues({ Neutral: palette('#70787e') });
    const primary = values['--text-primary'];
    const inverted = values['--text-inverted'];
    if (primary?.kind !== 'color' || inverted?.kind !== 'color') throw new Error('expected color values');
    expect(inverted.l).toBeCloseTo(1 - primary.l, 6);
    expect(inverted.h).toBeCloseTo(primary.h, 6);
  });

  it('guard band stops the mirror short of pure black', () => {
    const values = core.palettesToValues({ Neutral: palette('#ffffff') });
    const primary = values['--text-primary'];
    const inverted = values['--text-inverted'];
    if (primary?.kind !== 'color' || inverted?.kind !== 'color') throw new Error('expected color values');
    expect(1 - primary.l).toBeLessThan(core.BW_GUARD_MIN_L);
    expect(inverted.l).toBeCloseTo(core.BW_GUARD_MIN_L, 6);
  });

  it('only Neutral emits it', () => {
    const values = core.palettesToValues({ Brand: palette('#fb2898') });
    expect(values['--text-inverted']).toBeUndefined();
    expect(Object.keys(values).some((k) => k.includes('inverted'))).toBe(false);
  });
});

describe('scaleCurveDefaults (Global invariant 1: dark anchors frozen)', () => {
  const resolve = (defs: ScaleCurveDefaults) => ({
    Surfaces: { lightness: defs.Surfaces.lightness(), saturation: defs.Surfaces.saturation() },
    Borders:  { lightness: defs.Borders.lightness(),  saturation: defs.Borders.saturation()  },
    Text:     { lightness: defs.Text.lightness(),     saturation: defs.Text.saturation()      },
  });

  const LEGACY_DARK = {
    Surfaces: { lightness: [makeAnchor(0, 15, 5),   makeAnchor(100, 47, 5)],  saturation: [makeAnchor(0, 100, 30), makeAnchor(100, 100, 30)] },
    Borders:  { lightness: [makeAnchor(0, 25, 5),   makeAnchor(100, 80, 5)],  saturation: [makeAnchor(0, 100, 30), makeAnchor(100, 100, 30)] },
    Text:     { lightness: [makeAnchor(0, 120, 30), makeAnchor(100, 55, 30)], saturation: [makeAnchor(0, 100, 30), makeAnchor(100, 15, 30)] },
  };

  it('scaleCurveDefaults("dark") deep-equals the pinned legacy anchors', () => {
    expect(resolve(scaleCurveDefaults('dark'))).toEqual(LEGACY_DARK);
  });

  it('defaultScaleCurves is an alias for the dark defaults', () => {
    expect(resolve(defaultScaleCurves)).toEqual(LEGACY_DARK);
  });

  it('the default scheme is dark', () => {
    expect(resolve(scaleCurveDefaults())).toEqual(resolve(scaleCurveDefaults('dark')));
  });
});

describe('scaleCurveDefaults("light") — proposed light-scheme anchors (tunable)', () => {
  const light = () => scaleCurveDefaults('light');

  it('Surfaces lightness descends 98 → 82', () => {
    const s = light().Surfaces.lightness();
    expect(s[0].y).toBe(98);
    expect(s[s.length - 1].y).toBe(82);
    expect(s[0].y).toBeGreaterThan(s[s.length - 1].y);
  });

  it('Borders lightness descends 92 → 45', () => {
    const b = light().Borders.lightness();
    expect(b[0].y).toBe(92);
    expect(b[b.length - 1].y).toBe(45);
  });

  it('Text lightness ascends 30 → 120 (primary darkest, multiplier semantics)', () => {
    const t = light().Text.lightness();
    expect(t[0].y).toBe(30);
    expect(t[t.length - 1].y).toBe(120);
  });

  it('saturation curves are scheme-independent (match dark)', () => {
    const l = light();
    const d = scaleCurveDefaults('dark');
    expect(l.Surfaces.saturation()).toEqual(d.Surfaces.saturation());
    expect(l.Borders.saturation()).toEqual(d.Borders.saturation());
    expect(l.Text.saturation()).toEqual(d.Text.saturation());
  });
});

describe('snapScaleToPalette is direction-agnostic', () => {
  const surfaces = SCALES.find(s => s.title === 'Surfaces')!;
  const flatSat: CurveAnchor[] = [makeAnchor(0, 100, 30), makeAnchor(100, 100, 30)];
  // Natural order is light → dark (steps 100 … 950), mirroring the runtime paletteComputed.
  const paletteL = [0.95, 0.87, 0.79, 0.70, 0.61, 0.52, 0.43, 0.34, 0.27, 0.18, 0.10];
  const paletteComputed = paletteL.map((l): { oklch: Oklch } => ({ oklch: { l, c: 0, h: 0 } }));
  const GRAY = hexToOklch('#808080');

  // The pre-Wave-2 algorithm: score only the dark-first (ascending L) ordering.
  function legacyDarkFirstSnap(
    scaleCurves: Record<string, { lightness: CurveAnchor[]; saturation: CurveAnchor[] }>,
  ): Record<string, Oklch> {
    const n = surfaces.steps.length;
    const stepL = surfaces.steps.map((step) => computeDerivedOklch(step, GRAY, surfaces.title, scaleCurves, {}).l);
    const palDarkFirst = [...paletteComputed].reverse();
    const palL = palDarkFirst.map((ps) => ps.oklch.l);
    let bestStart = 0;
    let bestCost = Infinity;
    for (let start = 0; start <= palDarkFirst.length - n; start++) {
      let cost = 0;
      for (let i = 0; i < n; i++) { const d = stepL[i] - palL[start + i]; cost += d * d; }
      if (cost < bestCost) { bestCost = cost; bestStart = start; }
    }
    const assigned: Record<string, Oklch> = {};
    for (let i = 0; i < n; i++) assigned[stepKey(surfaces.title, surfaces.steps[i].name)] = palDarkFirst[bestStart + i].oklch;
    return assigned;
  }

  it('ascending (dark-style) curve returns the same window as the legacy dark-first pass', () => {
    const ascending = { Surfaces: { lightness: [makeAnchor(0, 10, 5), makeAnchor(100, 90, 5)], saturation: flatSat } };
    const assigned = ui.snapScaleToPalette(surfaces, GRAY, ascending, {}, paletteComputed);
    expect(assigned).toEqual(legacyDarkFirstSnap(ascending));

    const ls = surfaces.steps.map((s) => assigned[stepKey('Surfaces', s.name)].l);
    for (let i = 0; i + 1 < ls.length; i++) expect(ls[i]).toBeLessThanOrEqual(ls[i + 1]);
  });

  it('descending (light-style) curve picks a descending window from the reversed ordering', () => {
    const descending = { Surfaces: { lightness: [makeAnchor(0, 90, 5), makeAnchor(100, 10, 5)], saturation: flatSat } };
    const assigned = ui.snapScaleToPalette(surfaces, GRAY, descending, {}, paletteComputed);

    const ls = surfaces.steps.map((s) => assigned[stepKey('Surfaces', s.name)].l);
    // Dark-first alone can only produce ascending windows; a descending result proves the reversed ordering won.
    for (let i = 0; i + 1 < ls.length; i++) expect(ls[i]).toBeGreaterThanOrEqual(ls[i + 1]);
    expect(assigned).not.toEqual(legacyDarkFirstSnap(descending));

    const palSet = new Set(paletteComputed.map((p) => p.oklch));
    for (const color of Object.values(assigned)) expect(palSet.has(color)).toBe(true);
  });
});

describe('setCurveAnchor lands on the local slope', () => {
  const ramp = (): CurveAnchor[] => [makeAnchor(0, 95, 5), makeAnchor(100, 8, 5)];

  it('gives an inserted anchor a descending tangent, not flat handles', () => {
    const { curve } = core.setCurveAnchor(ramp(), 40, 60);
    const a = curve[1];
    expect(a.outDy).toBeLessThan(0);
    expect(a.inDy).toBeGreaterThan(0);
    // Symmetric about the anchor: one tangent, not a corner wearing two handles.
    expect(a.outDy / a.outDx).toBeCloseTo(a.inDy / a.inDx, 10);
  });

  it('keeps the sampled ramp monotone through the inserted anchor', () => {
    const { curve } = core.setCurveAnchor(ramp(), 40, 60);
    const ys = Array.from({ length: 51 }, (_, i) => sampleCurve(curve, i * 2));
    for (let i = 0; i + 1 < ys.length; i++) expect(ys[i]).toBeGreaterThanOrEqual(ys[i + 1]);
  });

  it('flattens only at a genuine turning point', () => {
    const { curve } = core.setCurveAnchor([makeAnchor(0, 20, 5), makeAnchor(100, 20, 5)], 50, 80);
    expect(curve[1].inDy).toBeCloseTo(0, 10);
    expect(curve[1].outDy).toBeCloseTo(0, 10);
  });

  it('holds handles inside the gaps it was dropped between', () => {
    const { curve } = core.setCurveAnchor(ramp(), 10, 88);
    expect(Math.abs(curve[1].inDx)).toBeLessThanOrEqual(10);
    expect(curve[1].outDx).toBeLessThanOrEqual(90);
  });
});
