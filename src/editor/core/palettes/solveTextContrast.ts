// "Derive accessible text": solve each family's Text lightness curve so the
// derived text colors clear WCAG AA against the surfaces they sit on.
//
// The Text scale derives L as seedL × (curveSample/100), clamped to [0,2], so a
// family can only reach L ∈ [0, min(1, 2·seedL)]. The solver works inside that
// window (passed as `lMax`) and emits a 5-anchor lightness curve whose sample
// at each step x reproduces the solved L; a companion saturation curve pins the
// solved (possibly chroma-decayed) chroma so the round-trip is exact. Surface
// and page hexes come from the real `palettesToVars` derivation.

import { hexToOklch } from './oklch';
import {
  palettesToVars,
  PALETTE_SPECS,
  scaleToCssVar,
  defaultScaleCurves,
  type SchemeDirection,
} from './paletteDerivation';
import { findLForContrast, contrastRatio } from './contrast';
import { sampleCurve, makeAnchor, type CurveAnchor } from '../../ui/curveEngine';
import type { PaletteConfig } from '../themes/themeTypes';

export interface ContrastPairing {
  family: string;
  step: string;
  textVar: string;
  againstVar: string;
  targetRatio: number;
  achievedRatio: number;
  meets: boolean;
  /** True when this pairing carries an AA guarantee (vs. a deliberately graded,
   *  non-AA step like `muted`/`disabled` on chromatic families). */
  guaranteed: boolean;
}

export interface TextSolveResult {
  patches: Record<string, Pick<PaletteConfig, 'scaleCurves'>>;
  cssVarOverrides: Record<string, string>;
  report: ContrastPairing[];
}

const HEX_RE = /^#[0-9a-f]{6}$/i;

const TEXT_STEPS: { name: string; x: number }[] = [
  { name: 'primary', x: 0 },
  { name: 'secondary', x: 25 },
  { name: 'tertiary', x: 50 },
  { name: 'muted', x: 75 },
  { name: 'disabled', x: 100 },
];

const NEUTRAL_BAND = [
  '--surface-neutral-lowest', '--surface-neutral-lower', '--surface-neutral-low',
  '--surface-neutral', '--surface-neutral-high', '--surface-neutral-higher',
  '--surface-neutral-highest',
];

interface StepPlan {
  ratio: number;
  guaranteed: boolean;
  /** 'band' = adverse extreme of the neutral surface band; 'default' = surface
   *  default; 'worst' = adverse of {surface default, page bg}. */
  target: 'band' | 'default' | 'worst';
}

// Neutral family sits on neutral surfaces; primary/secondary must clear the
// adverse band extreme, tertiary/muted the default surface. Disabled is graded.
const NEUTRAL_PLAN: Record<string, StepPlan> = {
  primary:   { ratio: 7.0, guaranteed: true,  target: 'band' },
  secondary: { ratio: 4.5, guaranteed: true,  target: 'band' },
  tertiary:  { ratio: 4.5, guaranteed: true,  target: 'default' },
  muted:     { ratio: 3.0, guaranteed: true,  target: 'default' },
  disabled:  { ratio: 2.0, guaranteed: false, target: 'default' },
};

// Chromatic families: primary must clear the worse of surface-default / page-bg
// (chroma decay allowed), secondary the default surface; the rest grade toward
// the surface (non-AA).
const CHROMATIC_PLAN: Record<string, StepPlan> = {
  primary:   { ratio: 4.5, guaranteed: true,  target: 'worst' },
  secondary: { ratio: 4.5, guaranteed: true,  target: 'default' },
  tertiary:  { ratio: 3.0, guaranteed: false, target: 'default' },
  muted:     { ratio: 2.2, guaranteed: false, target: 'default' },
  disabled:  { ratio: 1.6, guaranteed: false, target: 'default' },
};

interface Surface {
  var: string;
  hex: string;
}

// The hardest surface to clear: for lighter text the highest-luminance surface,
// for darker text the lowest.
function pickAdverse(surfaces: Surface[], direction: 'lighter' | 'darker'): Surface {
  let best = surfaces[0];
  let bestL = hexToOklch(best.hex).l;
  for (const s of surfaces.slice(1)) {
    const l = hexToOklch(s.hex).l;
    if (direction === 'lighter' ? l > bestL : l < bestL) {
      best = s;
      bestL = l;
    }
  }
  return best;
}

export function solveTextCurves(
  palettes: Record<string, PaletteConfig>,
  scheme?: SchemeDirection,
): TextSolveResult {
  const vars = palettesToVars(palettes);
  const surfaceDefault: Surface = { var: '--surface-neutral', hex: vars['--surface-neutral'] };
  const rawPageBg = vars['--page-bg'];
  const pageBg: Surface = HEX_RE.test(rawPageBg ?? '')
    ? { var: '--page-bg', hex: rawPageBg }
    : surfaceDefault;
  const band: Surface[] = NEUTRAL_BAND
    .map((v) => ({ var: v, hex: vars[v] }))
    .filter((s) => HEX_RE.test(s.hex ?? ''));

  const resolvedScheme: SchemeDirection =
    scheme ?? (hexToOklch(pageBg.hex).l >= 0.5 ? 'light' : 'dark');
  const direction: 'lighter' | 'darker' = resolvedScheme === 'light' ? 'darker' : 'lighter';

  const bandAdverse = pickAdverse(band, direction);
  const worstAdverse = pickAdverse([surfaceDefault, pageBg], direction);

  const patches: Record<string, Pick<PaletteConfig, 'scaleCurves'>> = {};
  const report: ContrastPairing[] = [];

  for (const spec of PALETTE_SPECS) {
    const config = palettes[spec.label];
    if (!config) continue;

    const seed = hexToOklch(config.baseColor);
    const seedL = Math.max(seed.l, 1e-4);
    const baseC = Math.max(seed.c, 1e-9);
    const baseH = seed.h;
    const lMax = Math.min(1, 2 * seedL);

    const curveOffset = config.curveOffset ?? {};
    const lOff = curveOffset['Text-lightness'] ?? 0;
    const sOff = curveOffset['Text-saturation'] ?? 0;
    const satCurve = config.scaleCurves?.Text?.saturation ?? defaultScaleCurves.Text.saturation();

    const isNeutral = spec.label === 'Neutral';
    const plan = isNeutral ? NEUTRAL_PLAN : CHROMATIC_PLAN;

    const lightAnchors: CurveAnchor[] = [];
    const satAnchors: CurveAnchor[] = [];

    for (const step of TEXT_STEPS) {
      const stepPlan = plan[step.name];
      const against =
        stepPlan.target === 'band' ? bandAdverse :
        stepPlan.target === 'worst' ? worstAdverse : surfaceDefault;

      const origSatMul = Math.max(0, Math.min(2, (sampleCurve(satCurve, step.x) + sOff) / 100));
      const stepChroma = baseC * origSatMul;

      const solved = findLForContrast({
        against: against.hex,
        ratio: stepPlan.ratio,
        direction,
        c: stepChroma,
        h: baseH,
        lMin: 0,
        lMax,
      });

      const lightY = clamp(0, 200, (100 * solved.l) / seedL - lOff);
      const satY = clamp(0, 200, (100 * solved.c) / baseC - sOff);
      lightAnchors.push(makeAnchor(step.x, lightY));
      satAnchors.push(makeAnchor(step.x, satY));
    }

    patches[spec.label] = {
      scaleCurves: { Text: { lightness: lightAnchors, saturation: satAnchors } },
    };
  }

  // Report against the actually-derived text hexes (post-round-trip verification
  // at the solver level, mirroring Global invariant 8).
  const derivedVars = palettesToVars(applyPatches(palettes, patches));
  for (const spec of PALETTE_SPECS) {
    if (!patches[spec.label]) continue;
    const isNeutral = spec.label === 'Neutral';
    const plan = isNeutral ? NEUTRAL_PLAN : CHROMATIC_PLAN;
    for (const step of TEXT_STEPS) {
      const stepPlan = plan[step.name];
      const textVar = scaleToCssVar('Text', step.name, spec.cssNamespace);
      if (!textVar) continue;
      const against =
        stepPlan.target === 'band' ? bandAdverse :
        stepPlan.target === 'worst' ? worstAdverse : surfaceDefault;
      const textHex = derivedVars[textVar];
      const againstHex = derivedVars[against.var] ?? against.hex;
      const achieved = HEX_RE.test(textHex ?? '') ? contrastRatio(textHex, againstHex) : 1;
      report.push({
        family: spec.label,
        step: step.name,
        textVar,
        againstVar: against.var,
        targetRatio: stepPlan.ratio,
        achievedRatio: achieved,
        meets: achieved >= minGuarantee(step.name, stepPlan),
        guaranteed: stepPlan.guaranteed,
      });
    }
  }

  const cssVarOverrides: Record<string, string> =
    resolvedScheme === 'light' ? { '--text-inverted': 'var(--color-neutral-100)' } : {};

  return { patches, cssVarOverrides, report };
}

// The AA floor a guaranteed step must clear (primary/secondary/tertiary = body
// 4.5; neutral muted = large 3.0). Graded steps floor at 1 (informational).
function minGuarantee(stepName: string, plan: StepPlan): number {
  if (!plan.guaranteed) return 1;
  return stepName === 'muted' ? 3.0 : 4.5;
}

function clamp(lo: number, hi: number, v: number): number {
  return Math.max(lo, Math.min(hi, v));
}

function applyPatches(
  palettes: Record<string, PaletteConfig>,
  patches: Record<string, Pick<PaletteConfig, 'scaleCurves'>>,
): Record<string, PaletteConfig> {
  const out: Record<string, PaletteConfig> = {};
  for (const [label, config] of Object.entries(palettes)) {
    const patch = patches[label];
    out[label] = patch
      ? { ...config, scaleCurves: { ...config.scaleCurves, ...patch.scaleCurves } }
      : config;
  }
  return out;
}
