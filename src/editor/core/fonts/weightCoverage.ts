import type { FontStackVariable } from '../themes/themeTypes';
import { inferFontFamilyVariable } from './fontWeightAvailability';

export interface WeightRequirement {
  variable: string;
  stack: FontStackVariable;
  weight: number;
}

export interface FaceCoverage {
  stack: FontStackVariable;
  family: string;
  required: number[];
  available: number[];
  missing: number[];
  italics: boolean;
}

const STACK_REF = /var\(\s*(--font-(?:display|sans|serif|mono))\s*\)/;
const VAR_REF = /var\(\s*(--[a-z0-9-]+)/i;

function declarations(css: string): Map<string, string> {
  const decls = new Map<string, string>();
  for (const [, name, value] of css.matchAll(/(--[a-z0-9-]+)\s*:\s*([^;{}]+);/gi)) {
    decls.set(name, value.trim());
  }
  return decls;
}

/**
 * Every weight the token contract asks of each font stack, read off the
 * `-font-family` / `-font-weight` pairing that typography tokens follow.
 * `overrides` takes a theme's own `cssVariables`, so component tokens count
 * the same as the shipped text styles.
 */
export function requiredWeights(
  tokensCss: string,
  overrides: Record<string, string> = {},
): WeightRequirement[] {
  const decls = declarations(tokensCss);
  for (const [name, value] of Object.entries(overrides)) decls.set(name, String(value).trim());

  const scale = new Map<string, number>();
  for (const [name, value] of decls) {
    if (name.startsWith('--font-weight-') && /^\d+$/.test(value)) scale.set(name, Number(value));
  }

  const seen = new Set<string>();
  const out: WeightRequirement[] = [];
  for (const [name, value] of decls) {
    const familyVariable = inferFontFamilyVariable(name);
    if (!familyVariable) continue;
    const stack = decls.get(familyVariable)?.match(STACK_REF)?.[1] as FontStackVariable | undefined;
    if (!stack) continue;

    const weight = /^\d+$/.test(value) ? Number(value) : scale.get(value.match(VAR_REF)?.[1] ?? '');
    if (weight === undefined) continue;

    const key = `${stack}:${weight}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push({ variable: name, stack, weight });
  }
  return out;
}

export interface CoveredFace {
  name: string;
  weights: number[];
  italics: boolean;
}

export function weightCoverage(
  requirements: WeightRequirement[],
  faces: Partial<Record<FontStackVariable, CoveredFace>>,
): FaceCoverage[] {
  const out: FaceCoverage[] = [];
  for (const [stack, face] of Object.entries(faces) as [FontStackVariable, CoveredFace][]) {
    const required = [...new Set(requirements.filter((r) => r.stack === stack).map((r) => r.weight))].sort(
      (a, b) => a - b,
    );
    out.push({
      stack,
      family: face.name,
      required,
      available: face.weights,
      missing: required.filter((w) => !face.weights.includes(w)),
      italics: face.italics,
    });
  }
  return out;
}
