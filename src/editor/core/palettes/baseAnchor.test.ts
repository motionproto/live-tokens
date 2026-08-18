import { describe, expect, it } from 'vitest';
import {
  PALETTE_STEPS,
  PALETTE_SPECS,
  DEFAULT_PALETTE_LIGHTNESS,
  DEFAULT_PALETTE_SATURATION,
  nearestPaletteStep,
  syncBaseAnchor,
  clearBaseAnchor,
  computePaletteOklch,
  derivePaletteValues,
  stepIndexToX,
} from './paletteDerivation';
import { adoptLegacyBaseAnchor } from '../themes/migrations/2026-07-24-base-anchor-placement';
import { adoptBackgroundSpotAsBase } from '../themes/migrations/2026-07-25-background-spot-to-base';
import { placeUnplacedBaseAnchors } from '../themes/migrations/2026-07-29-place-base-anchors';
import { defaultPaletteConfig } from '../../ui/palette/paletteMath';
import { makeAnchor, sampleCurve, type CurveAnchor } from '../../ui/curveEngine';
import type { PaletteConfig } from '../themes/themeTypes';

// Chroma kept comfortably inside sRGB at every fixture lightness so the
// projection-only gamutClamp is a no-op and "verbatim" assertions hold.
function cfg(l: number, extra: Partial<PaletteConfig> = {}): PaletteConfig {
  return {
    baseColor: { l, c: 0.05, h: 200 },
    lightnessCurve: DEFAULT_PALETTE_LIGHTNESS(),
    saturationCurve: DEFAULT_PALETTE_SATURATION(),
    scaleCurves: {},
    curveOffset: {},
    overrides: {},
    snappedScales: [],
    anchorToBase: true,
    ...extra,
  };
}

const anchorAt = (curve: CurveAnchor[], x: number) => curve.find((a) => Math.abs(a.x - x) < 0.5);

describe('nearestPaletteStep', () => {
  const curve = DEFAULT_PALETTE_LIGHTNESS();

  it('is the argmin of |step L − base L| over all steps', () => {
    for (const l of [0.05, 0.2, 0.42, 0.56, 0.71, 0.9, 0.99]) {
      const step = nearestPaletteStep(curve, l);
      const dists = PALETTE_STEPS.map((_, i) => Math.abs(sampleCurve(curve, stepIndexToX(i)) - l * 100));
      expect(dists[step]).toBe(Math.min(...dists));
    }
  });

  it('clamps extremes to the endpoint steps', () => {
    expect(nearestPaletteStep(curve, 0.99)).toBe(0);
    expect(nearestPaletteStep(curve, 0.01)).toBe(PALETTE_STEPS.length - 1);
  });
});

describe('syncBaseAnchor', () => {
  it('renders the base color verbatim at the placed step', () => {
    const c = cfg(0.56);
    syncBaseAnchor(c);
    const step = c.anchorPlacement!.step;
    const out = computePaletteOklch(step, c.baseColor, c.lightnessCurve, c.saturationCurve, {});
    expect(out.l).toBeCloseTo(0.56, 4);
    expect(out.c).toBeCloseTo(0.05, 4);
    expect(out.h).toBe(200);
  });

  it('is stable when re-synced with an unchanged base color', () => {
    const c = cfg(0.56);
    syncBaseAnchor(c);
    const placed = structuredClone({ p: c.anchorPlacement, l: c.lightnessCurve, s: c.saturationCurve });
    syncBaseAnchor(c);
    expect(c.anchorPlacement).toEqual(placed.p);
    expect(c.lightnessCurve).toEqual(placed.l);
    expect(c.saturationCurve).toEqual(placed.s);
  });

  it('moves the anchor to another step when the base lightness moves', () => {
    const c = cfg(0.56);
    syncBaseAnchor(c);
    const first = c.anchorPlacement!.step;
    c.baseColor = { ...c.baseColor, l: 0.2 };
    syncBaseAnchor(c);
    const second = c.anchorPlacement!.step;
    expect(second).not.toBe(first);
    expect(anchorAt(c.lightnessCurve, stepIndexToX(first))).toBeUndefined();
    expect(anchorAt(c.saturationCurve, stepIndexToX(first))).toBeUndefined();
    expect(anchorAt(c.lightnessCurve, stepIndexToX(second))!.y).toBeCloseTo(20);
  });

  it('places at an endpoint by overwriting its y and restores it on move', () => {
    const c = cfg(0.97);
    syncBaseAnchor(c);
    expect(c.anchorPlacement!.step).toBe(0);
    expect(c.anchorPlacement!.displacedL).toBe(95);
    expect(c.lightnessCurve).toHaveLength(2);
    expect(c.lightnessCurve[0].y).toBeCloseTo(97);
    c.baseColor = { ...c.baseColor, l: 0.5 };
    syncBaseAnchor(c);
    expect(c.lightnessCurve[0].y).toBe(95);
    expect(c.anchorPlacement!.step).not.toBe(0);
  });

  it('restores a user-authored anchor it displaced when the placement moves', () => {
    const c = cfg(0.7, {
      lightnessCurve: [makeAnchor(0, 95, 5), makeAnchor(40, 70, 15), makeAnchor(100, 8, 5)],
    });
    syncBaseAnchor(c);
    expect(c.anchorPlacement!.step).toBe(4);
    expect(c.anchorPlacement!.displacedL).toBe(70);
    c.baseColor = { ...c.baseColor, l: 0.15 };
    syncBaseAnchor(c);
    expect(c.anchorPlacement!.step).not.toBe(4);
    expect(anchorAt(c.lightnessCurve, 40)!.y).toBe(70);
  });

  it('does nothing when anchorToBase is off', () => {
    const c = cfg(0.56, { anchorToBase: false });
    syncBaseAnchor(c);
    expect(c.anchorPlacement).toBeUndefined();
    expect(c.lightnessCurve).toEqual(DEFAULT_PALETTE_LIGHTNESS());
  });
});

describe('clearBaseAnchor', () => {
  it('lifts a created placement and turns the flag off', () => {
    const c = cfg(0.56);
    syncBaseAnchor(c);
    clearBaseAnchor(c);
    expect(c.anchorToBase).toBe(false);
    expect(c.anchorPlacement).toBeUndefined();
    expect(c.lightnessCurve).toEqual(DEFAULT_PALETTE_LIGHTNESS());
    expect(c.saturationCurve).toEqual(DEFAULT_PALETTE_SATURATION());
  });

  it('restores a displaced endpoint instead of deleting it', () => {
    const c = cfg(0.97);
    syncBaseAnchor(c);
    clearBaseAnchor(c);
    expect(c.lightnessCurve).toEqual(DEFAULT_PALETTE_LIGHTNESS());
  });
});

describe('syncBaseAnchor with a hue curve', () => {
  const nonFlatHue = () => [makeAnchor(0, -20, 30), makeAnchor(100, 20, 30)];

  it('pins the hue delta to zero so the base hue renders verbatim at the placed step', () => {
    const c = cfg(0.56, { hueCurve: nonFlatHue() });
    syncBaseAnchor(c);
    const step = c.anchorPlacement!.step;
    const out = computePaletteOklch(step, c.baseColor, c.lightnessCurve, c.saturationCurve, {}, c.hueCurve);
    // Same bisection-sampled curve as lightness/saturation, so "verbatim" is
    // curve-sampling precision, not bit-exact (the L/C assertions elsewhere
    // in this file use the same toBeCloseTo precision).
    expect(out.h).toBeCloseTo(200, 4);
  });

  it('leaves hue untouched when no hue curve is present', () => {
    const c = cfg(0.56);
    syncBaseAnchor(c);
    expect(c.hueCurve).toBeUndefined();
    expect(c.anchorPlacement!.displacedH).toBeUndefined();
  });

  it('is idempotent with a hue curve present', () => {
    const c = cfg(0.56, { hueCurve: nonFlatHue() });
    syncBaseAnchor(c);
    const once = structuredClone({ p: c.anchorPlacement, l: c.lightnessCurve, s: c.saturationCurve, h: c.hueCurve });
    syncBaseAnchor(c);
    expect(c.anchorPlacement).toEqual(once.p);
    expect(c.lightnessCurve).toEqual(once.l);
    expect(c.saturationCurve).toEqual(once.s);
    expect(c.hueCurve).toEqual(once.h);
  });

  it('is idempotent without a hue curve', () => {
    const c = cfg(0.56);
    syncBaseAnchor(c);
    const once = structuredClone({ p: c.anchorPlacement, l: c.lightnessCurve, s: c.saturationCurve });
    syncBaseAnchor(c);
    expect(c.anchorPlacement).toEqual(once.p);
    expect(c.lightnessCurve).toEqual(once.l);
    expect(c.saturationCurve).toEqual(once.s);
    expect(c.hueCurve).toBeUndefined();
  });
});

describe('clearBaseAnchor with a hue curve', () => {
  it('restores the hue curve to its pre-pin shape', () => {
    const nonFlatHue = [makeAnchor(0, -20, 30), makeAnchor(100, 20, 30)];
    const c = cfg(0.56, { hueCurve: nonFlatHue });
    syncBaseAnchor(c);
    clearBaseAnchor(c);
    expect(c.hueCurve).toEqual(nonFlatHue);
  });
});

describe('defaultPaletteConfig', () => {
  it('seeds fresh palettes already placed', () => {
    const c = defaultPaletteConfig({ baseColor: { l: 0.7674, c: 0.164, h: 70.44 } });
    expect(c.anchorToBase).toBe(true);
    expect(c.anchorPlacement).toBeDefined();
    const out = computePaletteOklch(c.anchorPlacement!.step, c.baseColor, c.lightnessCurve, c.saturationCurve, c.curveOffset);
    expect(out.l).toBeCloseTo(0.7674, 4);
  });
});

describe('adoptLegacyBaseAnchor', () => {
  it('adopts an interior x=40 anchor as a placement at step 4', () => {
    const legacy = cfg(0.657, {
      lightnessCurve: [makeAnchor(0, 86, 5), makeAnchor(40, 65.7, 15), makeAnchor(100, 11, 5)],
      anchorPlacement: undefined,
    });
    const out = adoptLegacyBaseAnchor({ Brand: legacy });
    expect(out.Brand.anchorPlacement).toEqual({ step: 4 });
  });

  it('leaves configs without the legacy anchor unplaced', () => {
    const out = adoptLegacyBaseAnchor({ Accent: cfg(0.56) });
    expect(out.Accent.anchorPlacement).toBeUndefined();
  });

  it('skips anchorToBase=false and existing placements', () => {
    const off = cfg(0.657, {
      lightnessCurve: [makeAnchor(0, 86, 5), makeAnchor(40, 65.7, 15), makeAnchor(100, 11, 5)],
      anchorToBase: false,
    });
    const placed = cfg(0.657, {
      lightnessCurve: [makeAnchor(0, 86, 5), makeAnchor(40, 65.7, 15), makeAnchor(100, 11, 5)],
      anchorPlacement: { step: 5 },
    });
    const out = adoptLegacyBaseAnchor({ Off: off, Placed: placed });
    expect(out.Off.anchorPlacement).toBeUndefined();
    expect(out.Placed.anchorPlacement).toEqual({ step: 5 });
  });
});

describe('placeUnplacedBaseAnchors', () => {
  it('places an unplaced anchored config at the step nearest the base luminance', () => {
    const out = placeUnplacedBaseAnchors({ Accent: cfg(0.56) });
    const placed = out.Accent;
    expect(placed.anchorPlacement!.step).toBe(nearestPaletteStep(DEFAULT_PALETTE_LIGHTNESS(), 0.56));
    const shown = computePaletteOklch(placed.anchorPlacement!.step, placed.baseColor, placed.lightnessCurve, placed.saturationCurve, {});
    expect(shown.l).toBeCloseTo(0.56, 4);
  });

  it('skips anchorToBase=false and existing placements', () => {
    const off = cfg(0.56, { anchorToBase: false });
    const placed = cfg(0.56, { anchorPlacement: { step: 7 } });
    const out = placeUnplacedBaseAnchors({ Off: off, Placed: placed });
    expect(out.Off.anchorPlacement).toBeUndefined();
    expect(out.Off.lightnessCurve).toEqual(DEFAULT_PALETTE_LIGHTNESS());
    expect(out.Placed.anchorPlacement).toEqual({ step: 7 });
    expect(out.Placed.lightnessCurve).toEqual(DEFAULT_PALETTE_LIGHTNESS());
  });
});

describe('adoptBackgroundSpotAsBase', () => {
  const bgSpec = PALETTE_SPECS.find((s) => s.emptySelector)!;
  const spotVar = (step: string) => `--color-${bgSpec.cssNamespace}-${step}`;

  it('preserves the rendered page background exactly', () => {
    const legacy = cfg(0.25, { emptyStep: '850' } as Partial<PaletteConfig>);
    const shownBefore = derivePaletteValues(bgSpec, legacy)[spotVar('850')];
    const out = adoptBackgroundSpotAsBase({ [bgSpec.label]: legacy });
    const migrated = out[bgSpec.label];
    expect((migrated as { emptyStep?: string }).emptyStep).toBeUndefined();
    expect(derivePaletteValues(bgSpec, migrated)['--page-bg']).toEqual(shownBefore);
    expect(migrated.anchorPlacement!.step).toBe(PALETTE_STEPS.findIndex((s) => s.label === '850'));
  });

  it('leaves a gradient-mode base untouched, dropping only the stray field', () => {
    const legacy = cfg(0.25, { emptyMode: 'gradient', emptyStep: '850' } as Partial<PaletteConfig>);
    const out = adoptBackgroundSpotAsBase({ [bgSpec.label]: legacy });
    expect(out[bgSpec.label].baseColor).toEqual({ l: 0.25, c: 0.05, h: 200 });
    expect((out[bgSpec.label] as { emptyStep?: string }).emptyStep).toBeUndefined();
  });

  it('drops a stray field on a non-background family without touching its base', () => {
    const stray = cfg(0.5, { emptyStep: '500' } as Partial<PaletteConfig>);
    const out = adoptBackgroundSpotAsBase({ Brand: stray });
    expect(out.Brand.baseColor).toEqual({ l: 0.5, c: 0.05, h: 200 });
    expect((out.Brand as { emptyStep?: string }).emptyStep).toBeUndefined();
  });
});
