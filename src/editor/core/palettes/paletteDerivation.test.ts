import { describe, expect, it } from 'vitest';
import * as core from './paletteDerivation';
import { oklchToCss, oklchToCssClamped } from './oklch';
import * as ui from '../../ui/palette/paletteMath';
import {
  reconcilePalettesFromCssVars,
  palettesToVars,
  DEFAULT_PALETTE_LIGHTNESS,
  DEFAULT_PALETTE_SATURATION,
  DEFAULT_PALETTE_HUE,
  defaultScaleCurves,
  scaleCurveDefaults,
  computePaletteOklch,
  computeDerivedOklch,
  stepKey,
  PALETTE_STEPS,
  SCALES,
  type ScaleCurveDefaults,
} from './paletteDerivation';
import { hexToOklch, cssColorToOklch, oklchToHexClamped, gamutClamp, type Oklch } from './oklch';
import { migratePaletteColorsToOklch, type PreOklchPaletteConfig } from '../themes/migrations/2026-07-21-palette-oklch-basis';
import { adoptLegacyBaseAnchor } from '../themes/migrations/2026-07-24-base-anchor-placement';
import { adoptBackgroundSpotAsBase } from '../themes/migrations/2026-07-25-background-spot-to-base';
import { placeUnplacedBaseAnchors } from '../themes/migrations/2026-07-29-place-base-anchors';
import { isAutoSmoothCurve, makeAnchor, resmoothAutoCurve, sampleCurve, type CurveAnchor } from '../../ui/curveEngine';
import type { PaletteConfig } from '../themes/themeTypes';
import defaultColorsAndType from '../../../live-tokens/data/colors-and-type/default.json';

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

  it('pins the default Brand config to the same colors the hex serializer produced', () => {
    const out = palettesToVars({ Brand: editorConfigs.Brand });
    // Output is `oklch()`; these are the hexes this derivation emitted before
    // the flip, so comparing through the sRGB projection is what proves the
    // serialization change is not a visual change.
    const asHex = (css: string) => {
      const parsed = cssColorToOklch(css);
      if (!parsed) throw new Error(`not a color: ${css}`);
      return oklchToHexClamped(parsed.l, parsed.c, parsed.h);
    };
    // The clean default lightness range (95 -> 8) places Brand's base color
    // nearest step 400, not the hand-picked 500 the old custom range used.
    expect(asHex(out['--color-brand-400'])).toBe('#fb2898');
    expect(asHex(out['--color-brand-100'])).toBe('#ffe7ef');
    expect(asHex(out['--color-brand-950'])).toBe('#070002');
    expect(asHex(out['--surface-brand'])).toBe('#89004e');
    expect(asHex(out['--border-brand'])).toBe('#ae0065');
    expect(asHex(out['--text-brand'])).toBe('#ff75b1');
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

  // Handles are derived from the points now, so the freeze is on the ramp endpoints:
  // change a y here and the guard still fires.
  const ramp = (y0: number, y1: number) => resmoothAutoCurve([makeAnchor(0, y0), makeAnchor(100, y1)]);
  const LEGACY_DARK = {
    Surfaces: { lightness: ramp(15, 47),  saturation: ramp(100, 100) },
    Borders:  { lightness: ramp(25, 80),  saturation: ramp(100, 100) },
    Text:     { lightness: ramp(120, 55), saturation: ramp(100, 15)  },
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

  it('every shipped default is auto-shaped, so an untouched curve opens with Auto smooth on', () => {
    for (const scheme of ['dark', 'light'] as const) {
      for (const scale of Object.values(resolve(scaleCurveDefaults(scheme)))) {
        expect(isAutoSmoothCurve(scale.lightness)).toBe(true);
        expect(isAutoSmoothCurve(scale.saturation)).toBe(true);
      }
    }
    for (const curve of [DEFAULT_PALETTE_LIGHTNESS(), DEFAULT_PALETTE_SATURATION(), DEFAULT_PALETTE_HUE()]) {
      expect(isAutoSmoothCurve(curve)).toBe(true);
    }
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

describe('hue curve derivation (Global invariant 1: absent hue is identity)', () => {
  const base: Oklch = { l: 0.55, c: 0.12, h: 142 };
  const L = DEFAULT_PALETTE_LIGHTNESS();
  const S = DEFAULT_PALETTE_SATURATION();

  it('computePaletteOklch: an absent hueCurve matches an explicit flat one at every step', () => {
    for (let i = 0; i < PALETTE_STEPS.length; i++) {
      expect(computePaletteOklch(i, base, L, S, {})).toEqual(computePaletteOklch(i, base, L, S, {}, DEFAULT_PALETTE_HUE()));
    }
  });

  it('computeDerivedOklch: an absent scale hue curve matches an explicit flat one', () => {
    const scale = SCALES.find((s) => s.title === 'Text')!;
    const withoutHue = { Text: { lightness: defaultScaleCurves.Text.lightness(), saturation: defaultScaleCurves.Text.saturation() } };
    const withFlatHue = { Text: { ...withoutHue.Text, hue: DEFAULT_PALETTE_HUE() } };
    for (const step of scale.steps) {
      expect(computeDerivedOklch(step, base, 'Text', withoutHue, {})).toEqual(computeDerivedOklch(step, base, 'Text', withFlatHue, {}));
    }
  });

  // A fractional hue is the real test of the zero-delta guard: 142 round-trips
  // `((h % 360) + 360) % 360` exactly, so it can't tell a skipped wrap from a
  // taken one, but 142.1 picks up a one-ULP drift the moment it goes through
  // `%`. `toBe` against the input, not a comparison against the flat-curve
  // path, is what catches the guard's removal.
  it('computePaletteOklch: an absent hueCurve returns base.h bit-for-bit (fractional hue)', () => {
    const fractionalBase: Oklch = { l: 0.55, c: 0.12, h: 142.1 };
    for (let i = 0; i < PALETTE_STEPS.length; i++) {
      expect(computePaletteOklch(i, fractionalBase, L, S, {}).h).toBe(fractionalBase.h);
    }
  });

  it('computeDerivedOklch: an absent scale hue curve returns base.h bit-for-bit (fractional hue)', () => {
    const fractionalBase: Oklch = { l: 0.55, c: 0.12, h: 142.1 };
    const scale = SCALES.find((s) => s.title === 'Text')!;
    const withoutHue = { Text: { lightness: defaultScaleCurves.Text.lightness(), saturation: defaultScaleCurves.Text.saturation() } };
    for (const step of scale.steps) {
      expect(computeDerivedOklch(step, fractionalBase, 'Text', withoutHue, {}).h).toBe(fractionalBase.h);
    }
  });
});

describe('hue curve derivation: rotation and wrap', () => {
  const L = DEFAULT_PALETTE_LIGHTNESS();
  const S = DEFAULT_PALETTE_SATURATION();

  it('a curve ramping -30 to +30 puts step 0 at base.h - 30 and the last step at base.h + 30', () => {
    const base: Oklch = { l: 0.55, c: 0.12, h: 142 };
    const hueCurve: CurveAnchor[] = [makeAnchor(0, -30, 30), makeAnchor(100, 30, 30)];
    const first = computePaletteOklch(0, base, L, S, {}, hueCurve);
    const last = computePaletteOklch(PALETTE_STEPS.length - 1, base, L, S, {}, hueCurve);
    expect(first.h).toBeCloseTo(base.h - 30, 6);
    expect(last.h).toBeCloseTo(base.h + 30, 6);
  });

  it('wraps 350 + 30 to 20, not 380', () => {
    const base: Oklch = { l: 0.5, c: 0.1, h: 350 };
    const hueCurve: CurveAnchor[] = [makeAnchor(0, 30, 30), makeAnchor(100, 30, 30)];
    expect(computePaletteOklch(0, base, L, S, {}, hueCurve).h).toBeCloseTo(20, 6);
  });

  it('wraps 10 - 30 to 340, not -20', () => {
    const base: Oklch = { l: 0.5, c: 0.1, h: 10 };
    const hueCurve: CurveAnchor[] = [makeAnchor(0, -30, 30), makeAnchor(100, -30, 30)];
    expect(computePaletteOklch(0, base, L, S, {}, hueCurve).h).toBeCloseTo(340, 6);
  });
});

describe('hue curve derivation: offset', () => {
  const base: Oklch = { l: 0.55, c: 0.12, h: 142 };
  const L = DEFAULT_PALETTE_LIGHTNESS();
  const S = DEFAULT_PALETTE_SATURATION();

  it('curveOffset.hue shifts every step by the same amount', () => {
    for (let i = 0; i < PALETTE_STEPS.length; i++) {
      expect(computePaletteOklch(i, base, L, S, { hue: 15 }).h).toBeCloseTo(base.h + 15, 6);
    }
  });

  it("curveOffset['Text-hue'] shifts only the Text scale", () => {
    const text = SCALES.find((s) => s.title === 'Text')!;
    const surfaces = SCALES.find((s) => s.title === 'Surfaces')!;
    const scaleCurves = {
      Text: { lightness: defaultScaleCurves.Text.lightness(), saturation: defaultScaleCurves.Text.saturation() },
      Surfaces: { lightness: defaultScaleCurves.Surfaces.lightness(), saturation: defaultScaleCurves.Surfaces.saturation() },
    };
    const curveOffset = { 'Text-hue': 15 };
    for (const step of text.steps) {
      expect(computeDerivedOklch(step, base, 'Text', scaleCurves, curveOffset).h).toBeCloseTo(base.h + 15, 6);
    }
    for (const step of surfaces.steps) {
      expect(computeDerivedOklch(step, base, 'Surfaces', scaleCurves, curveOffset).h).toBeCloseTo(base.h, 6);
    }
  });
});

describe('hue curve derivation: chroma consequence', () => {
  it('rotating hue into a tighter gamut region reduces c, even with a flat saturation curve', () => {
    // This is gamutClamp doing its job at the rotated hue, not a derivation bug.
    // It is pinned here so the behavior is documented rather than rediscovered
    // as a regression.
    const base: Oklch = { l: 0.5, c: 0.15, h: 264 };
    const flatL: CurveAnchor[] = [makeAnchor(0, 50, 5), makeAnchor(100, 50, 5)];
    const flatSat: CurveAnchor[] = [makeAnchor(0, 100, 30), makeAnchor(100, 100, 30)];
    const hueCurve: CurveAnchor[] = [makeAnchor(0, -30, 30), makeAnchor(100, -30, 30)];

    const unrotated = computePaletteOklch(0, base, flatL, flatSat, {});
    const rotated = computePaletteOklch(0, base, flatL, flatSat, {}, hueCurve);

    expect(unrotated.c).toBeCloseTo(base.c, 10); // already in gamut at the base hue
    expect(rotated.c).toBeLessThan(unrotated.c);
    expect(rotated).toEqual(gamutClamp(0.5, 0.15, 234));
  });
});


describe('wide-gamut intent survives serialization', () => {
  it('leaves an in-gamut value identical to its clamped projection', () => {
    // The regression guard for unclamping `serializeDerivedValue`: every colour
    // an existing theme holds came from hex, so it is in gamut and must not move.
    for (const hex of ['#fb923c', '#00c9c2', '#6d737d', '#17171a', '#ffffff', '#000000']) {
      const o = hexToOklch(hex);
      expect(oklchToCss(o.l, o.c, o.h), hex).toBe(oklchToCssClamped(o.l, o.c, o.h));
    }
  });

  it('keeps chroma the sRGB projection would have discarded', () => {
    // Tailwind v4 orange-400, whose chroma exceeds sRGB at that lightness.
    // Hue trims to the serializer's 2dp; chroma is what must survive intact.
    expect(oklchToCss(0.75, 0.183, 55.934)).toBe('oklch(0.75 0.183 55.93)');
    const clamped = oklchToCssClamped(0.75, 0.183, 55.934);
    expect(clamped).not.toBe('oklch(0.75 0.183 55.93)');
    expect(Number(clamped.split(' ')[1])).toBeLessThan(0.183);
  });
});
