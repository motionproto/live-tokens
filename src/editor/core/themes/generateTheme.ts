/**
 * Brief → theme generator: full Theme from 10 OKLCH seeds + a scheme, with AA
 * floors enforced on derived text tokens. Seed *selection* lives in the
 * live-tokens-generate-theme skill; the CLI reaches this via
 * `dist-plugin/generateTheme`, so keep this module Node-safe (no DOM).
 */

import { hexToOklch, type Oklch } from '../palettes/oklch';
import {
  PALETTE_SPECS,
  SCALES,
  type SchemeDirection,
  type Step,
  palettesToVars,
  scaleStepToX,
  scaleToCssVar,
  setCurveAnchor,
} from '../palettes/paletteDerivation';
import { AA_BODY, AA_LARGE, contrastRatio, findLForContrast } from '../palettes/contrast';
import { type HarmonyAxis, type HarmonyMode } from '../palettes/colorHarmony';
import { defaultPaletteConfig } from '../../ui/palette/paletteMath';
import { sanitizeFileName } from '../storage/files/versionedFileResourceClient';
import { CURRENT_THEME_SCHEMA_VERSION } from './migrations/index';
import type { FontSource, FontStack, PaletteConfig, Theme } from './themeTypes';

export interface ThemeBrief {
  name: string;
  scheme: SchemeDirection;
  /** One seed per palette label (all 10 required); hex string or numeric OKLCH. */
  seeds: Record<string, Oklch | string>;
  /** Advisory record of the harmony reasoning; seeds stay ground truth. */
  harmony?: { mode: HarmonyMode };
}

/** Non-color theme content carried forward from the currently active theme so
 *  gradients, shadows, component aliases, and fonts survive regeneration. */
export interface CarryForward {
  cssVariables?: Record<string, string>;
  fontSources?: FontSource[];
  fontStacks?: FontStack[];
}

export interface ContrastCheck {
  textVar: string;
  floor: number;
  /** Worst (lowest-ratio) surface this text was checked against. */
  against: string;
  ratio: number;
  pass: boolean;
  corrected: boolean;
}

export interface GenerateThemeReport {
  scheme: SchemeDirection;
  checks: ContrastCheck[];
  failures: string[];
}

export interface GenerateThemeResult {
  theme: Theme;
  slug: string;
  report: GenerateThemeReport;
}

const HEX_RE = /^#[0-9a-f]{6}$/i;
const HARMONY_MODES: readonly string[] = [
  'complementary', 'split-complementary', 'triadic', 'tetradic',
  'compound', 'square', 'analogous', 'monochromatic', 'custom',
];

const TEXT_SCALE = SCALES.find((s) => s.title === 'Text')!;
const SURFACE_SCALE = SCALES.find((s) => s.title === 'Surfaces')!;

/** [step, floor, solve target]. The floor is the pass criterion; the target is
 *  what the solver aims for when a correction fires, so corrected text lands
 *  comfortably readable instead of at the knife edge (dark-theme body text at
 *  exactly 4.5:1 reads muddy — Material puts primary text far above AA). When
 *  the target is unreachable the solver returns its best effort, judged
 *  against the floor. */
const NEUTRAL_TEXT_FLOORS: ReadonlyArray<readonly [string, number, number]> = [
  ['primary', AA_BODY, 7],
  ['secondary', AA_BODY, 5.5],
  ['tertiary', AA_LARGE, 3.5],
];

const FUNCTIONAL_TEXT_TARGET = 3.5;

/** Functional text families checked at AA_LARGE against the neutral band.
 *  Neutral gets the three-step check above; Canvas's `--text-canvas` is not a
 *  text-on-surface role (Canvas is the page-background family). */
const FUNCTIONAL_TEXT_LABELS = PALETTE_SPECS
  .filter((s) => s.label !== 'Neutral' && s.label !== 'Canvas')
  .map((s) => s.label);

const norm = (h: number): number => (h >= 0 && h < 360 ? h : ((h % 360) + 360) % 360);

function parseSeed(label: string, raw: Oklch | string, problems: string[]): Oklch | null {
  if (typeof raw === 'string') {
    if (!HEX_RE.test(raw.trim())) {
      problems.push(`${label}: "${raw}" is not a #rrggbb hex color`);
      return null;
    }
    return hexToOklch(raw.trim());
  }
  const { l, c, h } = raw ?? ({} as Oklch);
  if (typeof l !== 'number' || l <= 0 || l >= 1) problems.push(`${label}: l must be in (0, 1), got ${l}`);
  if (typeof c !== 'number' || c < 0 || c > 0.4) problems.push(`${label}: c must be in [0, 0.4], got ${c}`);
  if (typeof h !== 'number' || !Number.isFinite(h)) problems.push(`${label}: h must be a finite number, got ${h}`);
  if (problems.length > 0) return null;
  return { l, c, h: norm(h) };
}

function validateBrief(brief: ThemeBrief): { seeds: Record<string, Oklch>; slug: string } {
  const problems: string[] = [];
  const name = typeof brief.name === 'string' ? brief.name.trim() : '';
  if (!name) problems.push('name: required');
  const slug = sanitizeFileName(name || 'unnamed');
  if (slug === 'default') problems.push('name: "default" is the protected package theme; pick another name');
  if (brief.scheme !== 'light' && brief.scheme !== 'dark') {
    problems.push(`scheme: must be "light" or "dark", got ${JSON.stringify(brief.scheme)}`);
  }
  if (brief.harmony && !HARMONY_MODES.includes(brief.harmony.mode)) {
    problems.push(`harmony.mode: unknown mode ${JSON.stringify(brief.harmony.mode)}`);
  }

  const seeds: Record<string, Oklch> = {};
  const given = brief.seeds ?? {};
  for (const spec of PALETTE_SPECS) {
    if (!(spec.label in given)) {
      problems.push(`seeds.${spec.label}: missing`);
      continue;
    }
    const parsed = parseSeed(spec.label, given[spec.label], problems);
    if (parsed) seeds[spec.label] = parsed;
  }
  const known = new Set<string>(PALETTE_SPECS.map((s) => s.label));
  for (const label of Object.keys(given)) {
    if (!known.has(label)) problems.push(`seeds.${label}: unknown palette (expected ${[...known].join(', ')})`);
  }

  if (problems.length > 0) {
    throw new Error(`Invalid theme brief:\n  ${problems.join('\n  ')}`);
  }
  return { seeds, slug };
}

interface CheckDef {
  paletteLabel: string;
  step: Step;
  textVar: string;
  floor: number;
  target: number;
}

function checkDefs(): CheckDef[] {
  const defs: CheckDef[] = [];
  for (const [stepName, floor, target] of NEUTRAL_TEXT_FLOORS) {
    defs.push({
      paletteLabel: 'Neutral',
      step: TEXT_SCALE.steps.find((s) => s.name === stepName)!,
      textVar: scaleToCssVar('Text', stepName, 'neutral')!,
      floor,
      target,
    });
  }
  const primary = TEXT_SCALE.steps.find((s) => s.name === 'primary')!;
  for (const label of FUNCTIONAL_TEXT_LABELS) {
    const ns = PALETTE_SPECS.find((s) => s.label === label)!.cssNamespace;
    defs.push({
      paletteLabel: label,
      step: primary,
      textVar: scaleToCssVar('Text', 'primary', ns)!,
      floor: AA_LARGE,
      target: FUNCTIONAL_TEXT_TARGET,
    });
  }
  return defs;
}

function surfaceVars(): string[] {
  return [
    ...SURFACE_SCALE.steps.map((s) => scaleToCssVar('Surfaces', s.name, 'neutral')!),
    '--page-bg',
  ];
}

function worstSurface(
  textHex: string,
  vars: Record<string, string>,
): { against: string; ratio: number } {
  let against = '';
  let ratio = Infinity;
  for (const surfVar of surfaceVars()) {
    const surfHex = vars[surfVar];
    if (!surfHex || !HEX_RE.test(surfHex)) continue;
    const r = contrastRatio(textHex, surfHex);
    if (r < ratio) {
      ratio = r;
      against = surfVar;
    }
  }
  return { against, ratio };
}

/** Pin the palette's Text curves so `step` derives to the solved color: the
 *  lightness anchor is the solved L as a multiplier of seed L, the saturation
 *  anchor the solved chroma as a multiplier of seed C (the solver may have
 *  decayed chroma to reach the ratio, so lightness alone can undershoot). */
function pinTextStep(cfg: PaletteConfig, step: Step, solved: { l: number; c: number }): void {
  const x = scaleStepToX(step, TEXT_SCALE);
  const seed = cfg.baseColor;
  const yL = Math.max(0, Math.min(200, (solved.l / seed.l) * 100));
  cfg.scaleCurves.Text.lightness = setCurveAnchor(cfg.scaleCurves.Text.lightness, x, yL).curve;
  if (seed.c > 0) {
    const yC = Math.max(0, Math.min(200, (solved.c / seed.c) * 100));
    cfg.scaleCurves.Text.saturation = setCurveAnchor(cfg.scaleCurves.Text.saturation, x, yC).curve;
  }
}

const MAX_CORRECTION_ROUNDS = 3;

function runContrastGate(
  configs: Record<string, PaletteConfig>,
  scheme: SchemeDirection,
): GenerateThemeReport {
  const defs = checkDefs();
  const direction = scheme === 'light' ? 'darker' : 'lighter';
  const corrected = new Set<string>();

  for (let round = 0; round < MAX_CORRECTION_ROUNDS; round++) {
    const vars = palettesToVars(configs);
    let anyFixed = false;
    for (const def of defs) {
      const textHex = vars[def.textVar];
      if (!textHex) continue;
      const worst = worstSurface(textHex, vars);
      if (worst.ratio >= def.floor) continue;
      const cfg = configs[def.paletteLabel];
      const seed = cfg.baseColor;
      const solved = findLForContrast({
        against: vars[worst.against],
        ratio: def.target,
        direction,
        c: hexToOklch(textHex).c,
        h: seed.h,
        lMax: Math.min(1, 2 * seed.l),
      });
      pinTextStep(cfg, def.step, solved);
      corrected.add(def.textVar);
      anyFixed = true;
    }
    if (!anyFixed) break;
  }

  const finalVars = palettesToVars(configs);
  const checks: ContrastCheck[] = defs.map((def) => {
    const worst = worstSurface(finalVars[def.textVar] ?? '#000000', finalVars);
    return {
      textVar: def.textVar,
      floor: def.floor,
      against: worst.against,
      ratio: worst.ratio,
      pass: worst.ratio >= def.floor,
      corrected: corrected.has(def.textVar),
    };
  });

  const failures = checks
    .filter((c) => !c.pass)
    .map((c) => {
      const label = defs.find((d) => d.textVar === c.textVar)!.paletteLabel;
      const hint = scheme === 'dark'
        ? `raise the ${label} seed lightness (derived text tops out at 2× seed L)`
        : `raise the ${label} seed lightness or reduce its chroma`;
      return `${c.textVar} reaches ${c.ratio.toFixed(2)}:1 vs ${c.against} (floor ${c.floor}:1) — ${hint}`;
    });

  return { scheme, checks, failures };
}

export function buildThemeFromSeeds(
  brief: ThemeBrief,
  carry: CarryForward = {},
  now: string = new Date().toISOString(),
): GenerateThemeResult {
  const { seeds, slug } = validateBrief(brief);

  const configs: Record<string, PaletteConfig> = {};
  for (const spec of PALETTE_SPECS) {
    configs[spec.label] = defaultPaletteConfig({
      baseColor: seeds[spec.label],
      neutral: spec.neutral,
      scheme: brief.scheme,
    });
  }

  const report = runContrastGate(configs, brief.scheme);

  const harmonyAxes: HarmonyAxis[] = [
    { hue: norm(seeds.Brand.h), family: 'Brand' },
    { hue: norm(seeds.Accent.h), family: 'Accent' },
    { hue: norm(seeds.Canvas.h), family: 'Canvas' },
    { hue: norm(seeds.Brand.h + 270), family: null },
  ];

  // The catch-all bag carries only tokens no typed slice owns (the server's
  // normalizeTheme invariant); strip anything this theme's derivation emits.
  const owned = new Set(Object.keys(palettesToVars(configs)));
  const cssVariables = Object.fromEntries(
    Object.entries(carry.cssVariables ?? {}).filter(([k]) => !owned.has(k)),
  );

  const theme: Theme = {
    name: brief.name.trim(),
    createdAt: now,
    updatedAt: now,
    editorConfigs: configs,
    cssVariables,
    fontSources: carry.fontSources ?? [],
    fontStacks: carry.fontStacks ?? [],
    harmonyAxes,
    schemaVersion: CURRENT_THEME_SCHEMA_VERSION,
  };

  return { theme, slug, report };
}
