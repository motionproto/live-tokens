// Suggested neutral text hierarchy for the Color Story.
//
// The solver (`solveTextContrast`) optimizes floors: it pushes every step to
// the minimum L that clears its ratio, which can collapse secondary and
// tertiary onto nearly the same value. This module instead anchors on the
// user's current primary and derives secondary/tertiary as two even OKLCH-L
// drops toward the background — hierarchy first, with WCAG AA (4.5) as a floor
// rather than the driver. The floor is solved against the adverse extreme of
// the neutral surface band so a compliant suggestion holds AA on EVERY band
// surface (broadest reach); when the seed's reachable-L window can't span the
// band, it falls back to the default surface and the coverage report says so.
// Coverage is informational — callers alert on partial reach, never block.

import { gamutClamp, oklchToHexClamped } from './oklch';
import {
  palettesToValues,
  defaultScaleCurves,
  BW_GUARD_MIN_L,
  BW_GUARD_MAX_L,
  type DerivedValue,
  type SchemeDirection,
} from './paletteDerivation';

export { BW_GUARD_MIN_L, BW_GUARD_MAX_L };
import { NEUTRAL_BAND } from './solveTextContrast';
import { findLForContrast, contrastRatio, AA_BODY } from './contrast';
import { sampleCurve, makeAnchor, type CurveAnchor } from '../../ui/curveEngine';
import type { PaletteConfig } from '../themes/themeTypes';

/** One even hierarchy drop in OKLCH L. Two drops span primary → tertiary. */
export const SUGGESTED_STEP_DROP = 0.07;

/** L difference below which current and suggested count as the same value. */
const DIFF_EPS = 0.01;

export interface SurfaceCheck {
  var: string;
  ratio: number;
  meets: boolean;
}

export interface Coverage {
  cleared: number;
  total: number;
  full: boolean;
  /** Most adverse band surface met with every less-adverse one also met;
   *  null when even the least adverse surface fails. */
  reachVar: string | null;
  /** Adversity-ascending (least adverse band surface first). */
  checks: SurfaceCheck[];
}

export interface TextSuggestion {
  step: 'primary' | 'secondary' | 'tertiary';
  textVar: string;
  current: { hex: string; l: number; coverage: Coverage };
  suggested: { hex: string; l: number; c: number; coverage: Coverage };
  differs: boolean;
}

export interface NeutralTextRecommendation {
  scheme: SchemeDirection;
  suggestions: TextSuggestion[];
  anyDiffers: boolean;
  /** Neutral Text-scale curve patch reproducing the suggested Ls at x=0/25/50
   *  and pinning current muted/disabled at x=75/100. Null when nothing differs. */
  patch: { lightness: CurveAnchor[]; saturation: CurveAnchor[] } | null;
}

const STEPS: { step: TextSuggestion['step']; x: number; textVar: string }[] = [
  { step: 'primary', x: 0, textVar: '--text-primary' },
  { step: 'secondary', x: 25, textVar: '--text-secondary' },
  { step: 'tertiary', x: 50, textVar: '--text-tertiary' },
];

function colorL(v: DerivedValue | undefined): number | null {
  return v?.kind === 'color' ? v.l : null;
}

export function recommendNeutralText(
  palettes: Record<string, PaletteConfig>,
  scheme?: SchemeDirection,
  useBlackWhite = false,
): NeutralTextRecommendation {
  const neutral = palettes['Neutral']!;
  const values = palettesToValues(palettes);

  const pageBgL = colorL(values['--page-bg']) ?? colorL(values['--surface-neutral'])!;
  const resolvedScheme: SchemeDirection = scheme ?? (pageBgL >= 0.5 ? 'light' : 'dark');
  const direction: 'lighter' | 'darker' = resolvedScheme === 'light' ? 'darker' : 'lighter';
  // Toward more contrast: +L for light text on dark surfaces, −L for dark text.
  const sign = direction === 'lighter' ? 1 : -1;

  const band = NEUTRAL_BAND
    .map((v) => {
      const value = values[v];
      return value?.kind === 'color'
        ? { var: v, l: value.l, hex: oklchToHexClamped(value.l, value.c, value.h) }
        : null;
    })
    .filter((s): s is { var: string; l: number; hex: string } => s !== null)
    .sort((a, b) => (a.l - b.l) * sign);
  const bandAdverse = band[band.length - 1];
  const surfaceDefaultHex = band.find((s) => s.var === '--surface-neutral')!.hex;

  const seed = neutral.baseColor;
  const seedL = Math.max(seed.l, 1e-4);
  const baseC = Math.max(seed.c, 1e-9);
  const baseH = seed.h;
  const lMax = Math.min(1, 2 * seedL);

  const curveOffset = neutral.curveOffset ?? {};
  const lOff = curveOffset['Text-lightness'] ?? 0;
  const sOff = curveOffset['Text-saturation'] ?? 0;
  const satCurve = neutral.scaleCurves?.Text?.saturation ?? defaultScaleCurves.Text.saturation();

  const stepChroma = (x: number): number =>
    baseC * Math.max(0, Math.min(2, (sampleCurve(satCurve, x) + sOff) / 100));

  function coverage(hex: string): Coverage {
    const checks: SurfaceCheck[] = band.map((s) => {
      const ratio = contrastRatio(hex, s.hex);
      return { var: s.var, ratio, meets: ratio >= AA_BODY };
    });
    let reachVar: string | null = null;
    for (const c of checks) {
      if (!c.meets) break;
      reachVar = c.var;
    }
    const cleared = checks.filter((c) => c.meets).length;
    return { cleared, total: checks.length, full: cleared === checks.length, reachVar, checks };
  }

  // AA floors. Primary carries the broadest-reach preference: it floors
  // against the band's adverse extreme so body text holds AA on every band
  // surface the window can span (fallback: default surface, surfaced as
  // partial coverage). Secondary/tertiary floor against the default surface —
  // flooring THEM at the band extreme too would collapse the whole hierarchy
  // onto near-white whenever the lightest band surface is a mid-tone.
  const solveFloor = (against: string, c: number) =>
    findLForContrast({ against, ratio: AA_BODY, direction, c, h: baseH, lMin: 0, lMax });

  let primaryFloor = solveFloor(bandAdverse.hex, stepChroma(0));
  if (contrastRatio(primaryFloor.hex, bandAdverse.hex) < AA_BODY) {
    primaryFloor = solveFloor(surfaceDefaultHex, stepChroma(0));
  }
  const stepFloor = solveFloor(surfaceDefaultHex, stepChroma(50));

  const towardContrast = (a: number, b: number): number => (sign > 0 ? Math.max(a, b) : Math.min(a, b));
  const clampWindow = (l: number): number => Math.max(0, Math.min(lMax, l));

  const currentL: Record<string, number> = {};
  for (const s of STEPS) currentL[s.step] = colorL(values[s.textVar]) ?? seedL;

  // Pure black/white is an affirmative choice (most designers find it too
  // stark): opted in, primary anchors at the scheme extreme; otherwise the
  // anchor is pulled inside the guard band, yielding only to the AA floor.
  let primaryL: number;
  if (useBlackWhite) {
    primaryL = clampWindow(sign > 0 ? lMax : 0);
  } else {
    const guard = sign > 0
      ? Math.max(BW_GUARD_MAX_L, primaryFloor.l)
      : Math.min(BW_GUARD_MIN_L, primaryFloor.l);
    const anchored = clampWindow(towardContrast(currentL.primary, primaryFloor.l));
    primaryL = sign > 0 ? Math.min(anchored, guard) : Math.max(anchored, guard);
  }
  const tertiaryL = towardContrast(stepFloor.l, primaryL - sign * 2 * SUGGESTED_STEP_DROP);
  const suggestedL: Record<string, number> = {
    primary: primaryL,
    secondary: towardContrast(stepFloor.l, (primaryL + tertiaryL) / 2),
    tertiary: tertiaryL,
  };

  const suggestions: TextSuggestion[] = STEPS.map((s) => {
    const currentValue = values[s.textVar];
    const currentHex = currentValue?.kind === 'color'
      ? oklchToHexClamped(currentValue.l, currentValue.c, currentValue.h)
      : oklchToHexClamped(seedL, 0, 0);
    const g = gamutClamp(suggestedL[s.step], stepChroma(s.x), baseH);
    const hex = oklchToHexClamped(g.l, g.c, g.h);
    return {
      step: s.step,
      textVar: s.textVar,
      current: { hex: currentHex, l: currentL[s.step], coverage: coverage(currentHex) },
      suggested: { hex, l: g.l, c: g.c, coverage: coverage(hex) },
      differs: Math.abs(g.l - currentL[s.step]) > DIFF_EPS,
    };
  });

  const anyDiffers = suggestions.some((s) => s.differs);

  let patch: NeutralTextRecommendation['patch'] = null;
  if (anyDiffers) {
    const clampY = (v: number) => Math.max(0, Math.min(200, v));
    const lightAnchors: CurveAnchor[] = [];
    const satAnchors: CurveAnchor[] = [];
    for (const s of suggestions) {
      const x = STEPS.find((st) => st.step === s.step)!.x;
      lightAnchors.push(makeAnchor(x, clampY((100 * s.suggested.l) / seedL - lOff)));
      satAnchors.push(makeAnchor(x, clampY((100 * s.suggested.c) / baseC - sOff)));
    }
    // Pin muted/disabled at their current derived values so applying the
    // suggestion never moves the steps it doesn't own.
    for (const [x, textVar] of [[75, '--text-muted'], [100, '--text-disabled']] as const) {
      const v = values[textVar];
      const l = v?.kind === 'color' ? v.l : seedL;
      const c = v?.kind === 'color' ? v.c : 0;
      lightAnchors.push(makeAnchor(x, clampY((100 * l) / seedL - lOff)));
      satAnchors.push(makeAnchor(x, clampY((100 * c) / baseC - sOff)));
    }
    patch = { lightness: lightAnchors, saturation: satAnchors };
  }

  return { scheme: resolvedScheme, suggestions, anyDiffers, patch };
}
