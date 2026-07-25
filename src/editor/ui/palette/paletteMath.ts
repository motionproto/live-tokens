import type { Oklch } from '../../core/palettes/oklch';
import { type CurveAnchor, makeAnchor } from '../curveEngine';
import type { PaletteConfig } from '../../core/themes/themeTypes';
import {
  type Step,
  type Scale,
  type SchemeDirection,
  SCALES,
  PALETTE_STEPS,
  DEFAULT_PALETTE_LIGHTNESS,
  DEFAULT_PALETTE_SATURATION,
  defaultScaleCurves,
  scaleCurveDefaults,
  computePaletteOklch,
  computeDerivedOklch,
  stepIndexToX,
  scaleStepToX,
  paletteStepKey,
  stepKey,
  nearestPaletteStep,
  syncBaseAnchor,
  clearBaseAnchor,
} from '../../core/palettes/paletteDerivation';

// Single source of truth is `core/palettes/paletteDerivation`; these are the
// derivation symbols re-exported so existing UI import sites keep resolving.
export {
  type Step,
  type Scale,
  type SchemeDirection,
  SCALES,
  SCALES as scales,
  PALETTE_STEPS,
  DEFAULT_PALETTE_LIGHTNESS,
  DEFAULT_PALETTE_SATURATION,
  defaultScaleCurves,
  scaleCurveDefaults,
  computePaletteOklch,
  computeDerivedOklch,
  stepIndexToX,
  scaleStepToX,
  paletteStepKey,
  stepKey,
  nearestPaletteStep,
  syncBaseAnchor,
  clearBaseAnchor,
};

export const GRAY_FALLBACK: Oklch = { l: 0.5999, c: 0, h: 89.88 };

export interface PaletteStepDef {
  label: string;
  lightness: number;
}

export type CurveOffset = Record<string, number>;
export type ScaleCurves = Record<string, { lightness: CurveAnchor[]; saturation: CurveAnchor[] }>;

// Neutrals seed a calmer, wider lightness ramp than accents; the saturation
// curve is the same flat 100 (chroma comes from a low-chroma base, not a cap).
export const DEFAULT_NEUTRAL_LIGHTNESS = (): CurveAnchor[] => [makeAnchor(0, 92, 5), makeAnchor(100, 3, 5)];

/**
 * Seed config for a palette. The derivation path is unified; the only
 * per-role difference is the seed: neutrals get the wider neutral lightness
 * ramp, accents the standard one. Everything is editable afterward.
 */
export function defaultPaletteConfig(opts: { baseColor: Oklch; neutral?: boolean; scheme?: SchemeDirection }): PaletteConfig {
  const cfg: PaletteConfig = {
    baseColor: opts.baseColor,
    lightnessCurve: opts.neutral ? DEFAULT_NEUTRAL_LIGHTNESS() : DEFAULT_PALETTE_LIGHTNESS(),
    saturationCurve: DEFAULT_PALETTE_SATURATION(),
    scaleCurves: defaultScaleCurvesObject(opts.scheme ?? 'dark'),
    curveOffset: { lightness: 0, saturation: 0 },
    overrides: {},
    snappedScales: [],
    anchorToBase: true,
  };
  syncBaseAnchor(cfg);
  return cfg;
}

export function defaultScaleCurvesObject(scheme: SchemeDirection = 'dark'): ScaleCurves {
  const defs = scaleCurveDefaults(scheme);
  return {
    Surfaces: { lightness: defs.Surfaces.lightness(), saturation: defs.Surfaces.saturation() },
    Borders:  { lightness: defs.Borders.lightness(),  saturation: defs.Borders.saturation()  },
    Text:     { lightness: defs.Text.lightness(),     saturation: defs.Text.saturation()      },
  };
}

export const paletteStepLightness: PaletteStepDef[] = [
  { label: '100', lightness: 95 },
  { label: '200', lightness: 88 },
  { label: '300', lightness: 78 },
  { label: '400', lightness: 68 },
  { label: '500', lightness: 57 },
  { label: '600', lightness: 49 },
  { label: '700', lightness: 41 },
  { label: '800', lightness: 32 },
  { label: '850', lightness: 25 },
  { label: '900', lightness: 17 },
  { label: '950', lightness: 8 },
];

export const scaleCurveKey = (scaleTitle: string, channel: 'lightness' | 'saturation') => `${scaleTitle}-${channel}`;

interface PaletteComputed {
  oklch: Oklch;
}

// Pick the contiguous window of palette steps whose lightness curve best
// matches this scale's derived lightness curve. Scores both orderings —
// dark-first (ascending L, historical) and its reverse (light-first,
// descending L) — so a light-scheme scale (surfaces descend) snaps as
// naturally as a dark one. Ties prefer dark-first (byte-stable for existing
// dark themes).
export function snapScaleToPalette(
  scale: Scale,
  baseColor: Oklch,
  scaleCurves: ScaleCurves,
  curveOffset: CurveOffset,
  paletteComputed: ReadonlyArray<PaletteComputed>
): Record<string, Oklch> {
  const n = scale.steps.length;

  const stepL = scale.steps.map(step =>
    computeDerivedOklch(step, baseColor, scale.title, scaleCurves, curveOffset).l,
  );

  const bestWindow = (pal: ReadonlyArray<PaletteComputed>): { cost: number; start: number } => {
    const palL = pal.map(ps => ps.oklch.l);
    let start = 0;
    let cost = Infinity;
    for (let s = 0; s <= pal.length - n; s++) {
      let c = 0;
      for (let i = 0; i < n; i++) {
        const d = stepL[i] - palL[s + i];
        c += d * d;
      }
      if (c < cost) { cost = c; start = s; }
    }
    return { cost, start };
  };

  const palDarkFirst = [...paletteComputed].reverse();
  const palLightFirst = [...palDarkFirst].reverse();
  const dark = bestWindow(palDarkFirst);
  const light = bestWindow(palLightFirst);

  const useLight = light.cost < dark.cost;
  const pal = useLight ? palLightFirst : palDarkFirst;
  const start = useLight ? light.start : dark.start;

  const assigned: Record<string, Oklch> = {};
  for (let i = 0; i < n; i++) {
    assigned[stepKey(scale.title, scale.steps[i].name)] = pal[start + i].oklch;
  }
  return assigned;
}
