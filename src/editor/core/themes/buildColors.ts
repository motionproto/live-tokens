/**
 * Base colors → generator: a full ColorsAndType from 10 OKLCH base colors + a
 * scheme, with AA floors enforced on derived text tokens. Choosing them lives in the
 * live-tokens-set-colors skill; the CLI reaches this via
 * `dist-plugin/setColors`, so keep this module Node-safe (no DOM).
 */

import { hexToOklch, cssColorToOklch, oklchToHexClamped, type Oklch } from '../palettes/oklch';
import {
  PALETTE_SPECS,
  PALETTE_STEPS,
  SCALES,
  type SchemeDirection,
  type Step,
  palettesToVars,
  scaleStepToX,
  scaleToCssVar,
  setCurveAnchor,
} from '../palettes/paletteDerivation';
import { formatGradientValue, makeDefaultGradients } from './slices/gradients';
import { SHADOW_VAR_NAMES, parseShadowCss, shadowTokenCss } from './parsers/shadow';
import { AA_BODY, AA_LARGE, contrastRatio, findLForContrast } from '../palettes/contrast';
import { type HarmonyAxis, type HarmonyMode } from '../palettes/colorHarmony';
import { defaultPaletteConfig } from '../../ui/palette/paletteMath';
import { sanitizeFileName } from '../storage/files/versionedFileResourceClient';
import { CURRENT_COLORS_AND_TYPE_SCHEMA_VERSION } from './migrations/index';
import type { FontSource, FontStack, GradientDiskToken, PaletteConfig, ColorsAndType } from './themeTypes';

export interface ColorsInput {
  name: string;
  scheme: SchemeDirection;
  /** The one color each palette's ramp derives from (all 10 required); hex string or numeric OKLCH. */
  baseColors: Record<string, Oklch | string>;
  /** Advisory record of the harmony reasoning; the base colors stay ground truth. */
  harmony?: { mode: HarmonyMode };
  /** Page-background sky. Off by default; the skill turns it on only when the
   *  request evokes atmosphere. The engine derives the stops itself, on the
   *  scheme's safe side of the Canvas anchor. */
  canvasGradient?: boolean;
}

/** Non-color content carried forward from the currently active colors and type
 *  so gradients, shadow geometry, component aliases, and fonts survive
 *  regeneration. Shadow opacity is derived, not carried — see `shadowVars`. */
export interface CarryForward {
  cssVariables?: Record<string, string>;
  fontSources?: FontSource[];
  fontStacks?: FontStack[];
  gradients?: GradientDiskToken[];
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

export interface BuildColorsReport {
  scheme: SchemeDirection;
  checks: ContrastCheck[];
  failures: string[];
  /** 'recipes' when the engine replaced absent/stock swatch gradients with the
   *  family-relative recipes; 'carried' when user-tuned ones rode through. */
  gradients: 'recipes' | 'carried';
  /** Present when the input opted into the page-background sky: either
   *  'on, <sky> → <anchor>' or a 'skipped — …' explanation when the Canvas
   *  anchors at the ramp edge and leaves no room. */
  canvasGradient?: string;
  /** The derived shadow opacity and the canvas lightness it came from. */
  shadows: string;
}

export interface BuildColorsResult {
  colorsAndType: ColorsAndType;
  slug: string;
  report: BuildColorsReport;
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

function parseBaseColor(label: string, raw: Oklch | string, problems: string[]): Oklch | null {
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

function validateInput(input: ColorsInput): { baseColors: Record<string, Oklch>; slug: string } {
  const problems: string[] = [];
  const name = typeof input.name === 'string' ? input.name.trim() : '';
  if (!name) problems.push('name: required');
  const slug = sanitizeFileName(name || 'unnamed');
  if (slug === 'default') problems.push('name: "default" is the protected package theme; pick another name');
  if (input.scheme !== 'light' && input.scheme !== 'dark') {
    problems.push(`scheme: must be "light" or "dark", got ${JSON.stringify(input.scheme)}`);
  }
  if (input.harmony && !HARMONY_MODES.includes(input.harmony.mode)) {
    problems.push(`harmony.mode: unknown mode ${JSON.stringify(input.harmony.mode)}`);
  }
  if (input.canvasGradient !== undefined && typeof input.canvasGradient !== 'boolean') {
    problems.push(`canvasGradient: must be a boolean, got ${JSON.stringify(input.canvasGradient)}`);
  }

  const baseColors: Record<string, Oklch> = {};
  const given = input.baseColors ?? {};
  for (const spec of PALETTE_SPECS) {
    if (!(spec.label in given)) {
      problems.push(`baseColors.${spec.label}: missing`);
      continue;
    }
    const parsed = parseBaseColor(spec.label, given[spec.label], problems);
    if (parsed) baseColors[spec.label] = parsed;
  }
  const known = new Set<string>(PALETTE_SPECS.map((s) => s.label));
  for (const label of Object.keys(given)) {
    if (!known.has(label)) problems.push(`baseColors.${label}: unknown palette (expected ${[...known].join(', ')})`);
  }

  if (problems.length > 0) {
    throw new Error(`Invalid base color file:\n  ${problems.join('\n  ')}`);
  }
  return { baseColors, slug };
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

/** Derived vars serialize as `oklch()` while the WCAG contrast API is
 *  sRGB-terminated (decision 7), so project back to hex at this boundary.
 *  Gradient `--page-bg` parses to null and is skipped, as it was when these
 *  call sites read hex directly. */
function varToHex(value: string | undefined): string | null {
  const parsed = value ? cssColorToOklch(value) : null;
  return parsed ? oklchToHexClamped(parsed.l, parsed.c, parsed.h) : null;
}

function worstSurface(
  textHex: string,
  vars: Record<string, string>,
): { against: string; ratio: number } {
  let against = '';
  let ratio = Infinity;
  for (const surfVar of surfaceVars()) {
    const surfHex = varToHex(vars[surfVar]);
    if (!surfHex) continue;
    const r = contrastRatio(textHex, surfHex);
    if (r < ratio) {
      ratio = r;
      against = surfVar;
    }
  }
  return { against, ratio };
}

/** Pin the palette's Text curves so `step` derives to the solved color: the
 *  lightness anchor is the solved L as a multiplier of the base color's L, the
 *  saturation anchor the solved chroma as a multiplier of its C (the solver may have
 *  decayed chroma to reach the ratio, so lightness alone can undershoot). */
function pinTextStep(cfg: PaletteConfig, step: Step, solved: { l: number; c: number }): void {
  const x = scaleStepToX(step, TEXT_SCALE);
  const base = cfg.baseColor;
  const yL = Math.max(0, Math.min(200, (solved.l / base.l) * 100));
  cfg.scaleCurves.Text.lightness = setCurveAnchor(cfg.scaleCurves.Text.lightness, x, yL).curve;
  if (base.c > 0) {
    const yC = Math.max(0, Math.min(200, (solved.c / base.c) * 100));
    cfg.scaleCurves.Text.saturation = setCurveAnchor(cfg.scaleCurves.Text.saturation, x, yC).curve;
  }
}

const MAX_CORRECTION_ROUNDS = 3;

function runContrastGate(
  configs: Record<string, PaletteConfig>,
  scheme: SchemeDirection,
): Pick<BuildColorsReport, 'scheme' | 'checks' | 'failures'> {
  const defs = checkDefs();
  const direction = scheme === 'light' ? 'darker' : 'lighter';
  const corrected = new Set<string>();

  for (let round = 0; round < MAX_CORRECTION_ROUNDS; round++) {
    const vars = palettesToVars(configs);
    let anyFixed = false;
    for (const def of defs) {
      const text = cssColorToOklch(vars[def.textVar] ?? '');
      if (!text) continue;
      const textHex = oklchToHexClamped(text.l, text.c, text.h);
      const worst = worstSurface(textHex, vars);
      if (worst.ratio >= def.floor) continue;
      const cfg = configs[def.paletteLabel];
      const base = cfg.baseColor;
      const solved = findLForContrast({
        against: varToHex(vars[worst.against]) ?? '#000000',
        ratio: def.target,
        direction,
        c: text.c,
        h: base.h,
        lMax: Math.min(1, 2 * base.l),
      });
      pinTextStep(cfg, def.step, solved);
      corrected.add(def.textVar);
      anyFixed = true;
    }
    if (!anyFixed) break;
  }

  const finalVars = palettesToVars(configs);
  const checks: ContrastCheck[] = defs.map((def) => {
    const worst = worstSurface(varToHex(finalVars[def.textVar]) ?? '#000000', finalVars);
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
        ? `raise the ${label} base color lightness (derived text tops out at 2× its L)`
        : `raise the ${label} base color lightness or reduce its chroma`;
      return `${c.textVar} reaches ${c.ratio.toFixed(2)}:1 vs ${c.against} (floor ${c.floor}:1) — ${hint}`;
    });

  return { scheme, checks, failures };
}

const ADJACENT_HUE_MAX = 120;

const hueDist = (a: number, b: number): number => {
  const d = Math.abs(norm(a) - norm(b));
  return Math.min(d, 360 - d);
};

const linear = (variable: string, angle: number, from: string, to: string): GradientDiskToken => ({
  variable,
  type: 'linear',
  angle,
  stops: [{ position: 0, color: from }, { position: 100, color: to }],
});

/** The four swatch recipes, family-relative so they suit any set of base colors: a
 *  within-family brand sweep, two cross-family pairs that fall back to
 *  within-family when the hues sit more than 120° apart (an srgb gradient
 *  between distant hues passes through gray), and a canvas sweep on the
 *  scheme's rich half of the ramp. Stops are var() refs, so later palette
 *  edits flow through. */
function recipeGradients(baseColors: Record<string, Oklch>, scheme: SchemeDirection): GradientDiskToken[] {
  return [
    linear('--gradient-1', 90, '--color-brand-400', '--color-brand-700'),
    hueDist(baseColors.Special.h, baseColors.Brand.h) <= ADJACENT_HUE_MAX
      ? linear('--gradient-2', 135, '--color-special-500', '--color-brand-500')
      : linear('--gradient-2', 135, '--color-special-400', '--color-special-700'),
    hueDist(baseColors.Brand.h, baseColors.Accent.h) <= ADJACENT_HUE_MAX
      ? linear('--gradient-3', 90, '--color-brand-500', '--color-accent-500')
      : linear('--gradient-3', 90, '--color-accent-400', '--color-accent-700'),
    scheme === 'dark'
      ? linear('--gradient-4', 180, '--color-canvas-600', '--color-canvas-900')
      : linear('--gradient-4', 180, '--color-canvas-200', '--color-canvas-500'),
  ];
}

/** Absent or still the stock defaults → the engine may replace them; anything
 *  else is user-tuned and rides through untouched. */
function isStockGradients(gradients: GradientDiskToken[] | undefined): boolean {
  return !gradients || gradients.length === 0
    || JSON.stringify(gradients) === JSON.stringify(makeDefaultGradients());
}

/** Turn on the page-background sky: two ramp steps from the Canvas anchor on
 *  the scheme's safe side (darker for dark, lighter for light), ending at the
 *  anchor. The anchor step IS the solid `--page-bg` the contrast gate checked,
 *  and every other stop sits further from text lightness, so the gradient can
 *  only raise contrast — call this after the gate has run.
 *
 *  A canvas anchored at the ramp's edge (near-white in light, near-black in
 *  dark) has no room on the safe side; the sky is skipped with a report line
 *  saying so, since a flat "gradient" would silently do nothing. */
function applyCanvasGradient(canvas: PaletteConfig, scheme: SchemeDirection): string {
  const labels = PALETTE_STEPS.map((s) => s.label);
  const anchor = canvas.anchorPlacement!.step;
  const sky = scheme === 'dark'
    ? Math.min(anchor + 2, labels.length - 1)
    : Math.max(anchor - 2, 0);
  if (sky === anchor) {
    return `skipped — the Canvas base color anchors at the ramp edge (${labels[anchor]}), leaving no room for a sky; commit the canvas further from ${scheme === 'dark' ? 'black' : 'white'}`;
  }
  canvas.emptyMode = 'gradient';
  canvas.gradientStyle = 'linear';
  canvas.gradientAngle = 180;
  canvas.gradientReverse = false;
  canvas.gradientStops = [
    { position: 0, paletteLabel: labels[sky] },
    { position: 100, paletteLabel: labels[anchor] },
  ];
  canvas.gradientSize = 'window';
  return `on, ${labels[sky]} → ${labels[anchor]}`;
}

/** The tokens.css scale, the starting point when a theme carries no shadows.
 *  Geometry per step; every step shares one color. */
const STOCK_SHADOW_GEOMETRY: Record<(typeof SHADOW_VAR_NAMES)[number], readonly [number, number, number]> = {
  '--shadow-sm': [1, 1, 2],
  '--shadow-md': [3, 3, 6],
  '--shadow-lg': [5, 5, 9],
  '--shadow-xl': [6, 7, 13],
  '--shadow-2xl': [8, 9, 16],
};
const STOCK_SHADOW_COLOR = { spread: 0, hue: 237, saturation: 18, lightness: 3, opacity: 0.9 };

/** A near-black shadow needs 0.9 to read at all against a dark ground, and at
 *  0.9 it punches a hole in a light one. Opacity therefore rides the canvas:
 *  full weight up to DEEP, easing to SOFT by the time the page is paper. */
const SHADOW_OPACITY_DEEP = 0.9;
const SHADOW_OPACITY_SOFT = 0.2;
const SHADOW_GROUND_DEEP = 0.5;
const SHADOW_GROUND_SOFT = 0.9;

export function shadowOpacityForCanvas(canvasL: number): number {
  const t = (canvasL - SHADOW_GROUND_DEEP) / (SHADOW_GROUND_SOFT - SHADOW_GROUND_DEEP);
  const ramp = Math.max(0, Math.min(1, t));
  const opacity = SHADOW_OPACITY_DEEP + ramp * (SHADOW_OPACITY_SOFT - SHADOW_OPACITY_DEEP);
  return Math.round(opacity * 100) / 100;
}

/** Recolor the scale for this canvas: carried geometry and color ride through
 *  (elevation shape belongs to the shape pass), opacity is replaced. Replaced
 *  rather than kept-when-untouched, because a run iterated from a light
 *  canvas to a dark one would otherwise hold a shadow too faint to see. The
 *  Canvas base color is the page background verbatim, so it is the ground the
 *  shadow falls on. */
function shadowVars(carried: Record<string, string>, canvas: Oklch): Record<string, string> {
  const opacity = shadowOpacityForCanvas(canvas.l);
  const out: Record<string, string> = {};
  for (const variable of SHADOW_VAR_NAMES) {
    const [x, y, blur] = STOCK_SHADOW_GEOMETRY[variable];
    const base = parseShadowCss(variable, carried[variable] ?? '') ?? { x, y, blur, ...STOCK_SHADOW_COLOR };
    out[variable] = shadowTokenCss({ ...base, opacity });
  }
  return out;
}

export function buildColors(
  input: ColorsInput,
  carry: CarryForward = {},
  now: string = new Date().toISOString(),
): BuildColorsResult {
  const { baseColors, slug } = validateInput(input);

  const configs: Record<string, PaletteConfig> = {};
  for (const spec of PALETTE_SPECS) {
    configs[spec.label] = defaultPaletteConfig({
      baseColor: baseColors[spec.label],
      neutral: spec.neutral,
      scheme: input.scheme,
    });
  }

  const report = runContrastGate(configs, input.scheme);
  const canvasGradient = input.canvasGradient
    ? applyCanvasGradient(configs.Canvas, input.scheme)
    : undefined;

  const gradients = isStockGradients(carry.gradients)
    ? recipeGradients(baseColors, input.scheme)
    : carry.gradients!;

  const harmonyAxes: HarmonyAxis[] = [
    { hue: norm(baseColors.Brand.h), family: 'Brand' },
    { hue: norm(baseColors.Accent.h), family: 'Accent' },
    { hue: norm(baseColors.Canvas.h), family: 'Canvas' },
    { hue: norm(baseColors.Brand.h + 270), family: null },
  ];

  // The catch-all bag carries only tokens no typed slice owns (the server's
  // normalizeColorsAndType invariant); strip anything this derivation emits.
  const owned = new Set(Object.keys(palettesToVars(configs)));
  const cssVariables = Object.fromEntries(
    Object.entries(carry.cssVariables ?? {}).filter(([k]) => !owned.has(k)),
  );
  // Rendered projections of the structured gradients, kept for production CSS.
  for (const t of gradients) cssVariables[t.variable] = formatGradientValue(t);
  Object.assign(cssVariables, shadowVars(carry.cssVariables ?? {}, baseColors.Canvas));

  const colorsAndType: ColorsAndType = {
    name: input.name.trim(),
    createdAt: now,
    updatedAt: now,
    editorConfigs: configs,
    cssVariables,
    fontSources: carry.fontSources ?? [],
    fontStacks: carry.fontStacks ?? [],
    gradients,
    harmonyAxes,
    schemaVersion: CURRENT_COLORS_AND_TYPE_SCHEMA_VERSION,
  };

  return {
    colorsAndType,
    slug,
    report: {
      ...report,
      gradients: gradients === carry.gradients ? 'carried' : 'recipes',
      shadows: `opacity ${shadowOpacityForCanvas(baseColors.Canvas.l)} for a canvas at L ${baseColors.Canvas.l.toFixed(2)}`,
      ...(canvasGradient ? { canvasGradient } : {}),
    },
  };
}
