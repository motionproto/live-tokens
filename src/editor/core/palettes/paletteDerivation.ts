/**
 * Pure palette → CSS-variable derivation.
 *
 * Mirrors the logic that previously lived only inside `PaletteEditor.svelte`'s
 * reactive emission, but as standalone functions so the editor store can emit
 * palette-derived vars at boot without requiring any editor component to be
 * mounted. Without this module the disabled-state preview (and any other
 * `var(--surface-neutral)` consumer) reads a stale value on reload until the
 * user opens the LiveEditorOverlay and mounts the PaletteEditors.
 *
 * The PaletteEditor still owns *editing* preview (draft hex picked but not
 * yet committed to overrides). Once committed via the store, this module
 * derives the same CSS vars from the persisted config.
 */

import { hexToOklch, oklchToHexClamped, gamutClamp, type Oklch } from './oklch';
import { type CurveAnchor, sampleCurve, makeAnchor } from '../../ui/curveEngine';
import type { PaletteConfig } from '../themes/themeTypes';

export interface PaletteSpec {
  label: string;
  cssNamespace: string;
  emptySelector?: boolean;
  /** Seed OKLCH intent used only when a config carries no `baseColor` (never
   *  for a loaded theme). Numeric so it composes with the OKLCH basis. */
  initialColor: Oklch;
  /** Seed-default role only: neutrals start with a calm low-chroma base and
   *  the neutral lightness ramp. The derivation path is identical for all. */
  neutral?: boolean;
  /** Editor-only heading override (Alternate reads "Alternate (neutral)"). */
  displayLabel?: string | null;
}

/**
 * Single source of truth for which palettes exist and how their CSS namespaces
 * map. Was previously hardcoded inside `VariablesTab.svelte`; centralising it
 * here lets the store seed boot-time vars without depending on the UI tree, and
 * drives the editor's palette-editor order + (Waves 4/5) the Colors swatch row.
 */
export const PALETTE_SPECS: readonly PaletteSpec[] = [
  { label: 'Brand',      cssNamespace: 'brand',     initialColor: { l: 0.5573, c: 0.1841, h: 25.49 } },
  { label: 'Accent',     cssNamespace: 'accent',    initialColor: { l: 0.7674, c: 0.164, h: 70.44 } },
  { label: 'Background', cssNamespace: 'canvas',    emptySelector: true, initialColor: { l: 0.2284, c: 0.0384, h: 282.93 } },
  { label: 'Neutral',    cssNamespace: 'neutral',   neutral: true, initialColor: { l: 0.5679, c: 0.0134, h: 240.07 } },
  { label: 'Alternate',  cssNamespace: 'alternate', neutral: true, displayLabel: 'Alternate (neutral)', initialColor: { l: 0.5873, c: 0.0087, h: 48.57 } },
  { label: 'Special',    cssNamespace: 'special',   initialColor: { l: 0.6056, c: 0.2189, h: 292.72 } },
  { label: 'Info',       cssNamespace: 'info',      initialColor: { l: 0.5871, c: 0.1855, h: 259.56 } },
  { label: 'Success',    cssNamespace: 'success',   initialColor: { l: 0.7198, c: 0.1918, h: 149.52 } },
  { label: 'Warning',    cssNamespace: 'warning',   initialColor: { l: 0.6704, c: 0.1716, h: 48.75 } },
  { label: 'Danger',     cssNamespace: 'danger',    initialColor: { l: 0.6103, c: 0.2165, h: 18.1 } },
] as const;

export const PALETTE_STEPS = [
  { label: '100' }, { label: '200' }, { label: '300' }, { label: '400' },
  { label: '500' }, { label: '600' }, { label: '700' }, { label: '800' },
  { label: '850' }, { label: '900' }, { label: '950' },
];

export interface Step {
  name: string;
  position: number;
  lightness?: number;
  saturation?: number;
}
export interface Scale {
  title: string;
  isText: boolean;
  steps: Step[];
}

export const SCALES: readonly Scale[] = [
  {
    title: 'Surfaces', isText: false,
    steps: [
      { name: 'lowest',  position: -1 },
      { name: 'lower',   position: -2 / 3 },
      { name: 'low',     position: -1 / 3 },
      { name: 'default', position: 0 },
      { name: 'high',    position: 1 / 3 },
      { name: 'higher',  position: 2 / 3 },
      { name: 'highest', position: 1 },
    ],
  },
  {
    title: 'Borders', isText: false,
    steps: [
      { name: 'faint',   position: -1 },
      { name: 'subtle',  position: -0.5 },
      { name: 'default', position: 0 },
      { name: 'medium',  position: 0.5 },
      { name: 'strong',  position: 1 },
    ],
  },
  {
    title: 'Text', isText: true,
    steps: [
      { name: 'primary',   position: 0 },
      { name: 'secondary', position: 0 },
      { name: 'tertiary',  position: 0 },
      { name: 'muted',     position: 0 },
      { name: 'disabled',  position: 0 },
    ],
  },
];

export const DEFAULT_PALETTE_LIGHTNESS = (): CurveAnchor[] => [makeAnchor(0, 95, 5), makeAnchor(100, 8, 5)];
export const DEFAULT_PALETTE_SATURATION = (): CurveAnchor[] => [makeAnchor(0, 100, 30), makeAnchor(100, 100, 30)];

export type SchemeDirection = 'light' | 'dark';

export type ScaleCurveDefaults = Record<
  string,
  { lightness: () => CurveAnchor[]; saturation: () => CurveAnchor[] }
>;

/**
 * Scheme-parameterized seed anchors for the Surfaces/Borders/Text scales.
 * `'dark'` is the historical default (dark surfaces, light text); `'light'`
 * inverts the lightness bands (light surfaces, dark text). Saturation curves
 * are scheme-independent. Derivation math is untouched — only these seed
 * defaults differ, so saved themes (which carry explicit `scaleCurves`) render
 * identically regardless of scheme.
 *
 * Light-scheme anchors are proposed values, tunable during QA. The dark anchors
 * are frozen: existing themes depend on them via the `defaultScaleCurves` alias.
 */
export function scaleCurveDefaults(scheme: SchemeDirection = 'dark'): ScaleCurveDefaults {
  if (scheme === 'light') {
    return {
      Surfaces: {
        lightness:  () => [makeAnchor(0, 98, 5),   makeAnchor(100, 82, 5)],
        saturation: () => [makeAnchor(0, 100, 30), makeAnchor(100, 100, 30)],
      },
      Borders: {
        lightness:  () => [makeAnchor(0, 92, 5),   makeAnchor(100, 45, 5)],
        saturation: () => [makeAnchor(0, 100, 30), makeAnchor(100, 100, 30)],
      },
      Text: {
        lightness:  () => [makeAnchor(0, 30, 30),  makeAnchor(100, 120, 30)],
        saturation: () => [makeAnchor(0, 100, 30), makeAnchor(100, 15, 30)],
      },
    };
  }
  return {
    Surfaces: {
      lightness:  () => [makeAnchor(0, 15, 5),   makeAnchor(100, 47, 5)],
      saturation: () => [makeAnchor(0, 100, 30), makeAnchor(100, 100, 30)],
    },
    Borders: {
      lightness:  () => [makeAnchor(0, 25, 5),   makeAnchor(100, 80, 5)],
      saturation: () => [makeAnchor(0, 100, 30), makeAnchor(100, 100, 30)],
    },
    Text: {
      lightness:  () => [makeAnchor(0, 120, 30), makeAnchor(100, 55, 30)],
      saturation: () => [makeAnchor(0, 100, 30), makeAnchor(100, 15, 30)],
    },
  };
}

export const defaultScaleCurves: ScaleCurveDefaults = scaleCurveDefaults('dark');

export function paletteStepKey(label: string): string { return `Palette-${label}`; }
export function stepKey(scaleTitle: string, stepName: string): string { return `${scaleTitle}-${stepName}`; }

export function stepIndexToX(index: number): number {
  return (index / (PALETTE_STEPS.length - 1)) * 100;
}

export function scaleStepToX(step: Step, scale: Scale): number {
  const idx = scale.steps.indexOf(step);
  return scale.steps.length > 1 ? (idx / (scale.steps.length - 1)) * 100 : 50;
}

/**
 * Typed intermediate representation for a derived CSS-variable value. The
 * derived-vars map is heterogeneous — colors, but also gradient strings
 * (`--page-bg`) and keywords (`--page-bg-attachment`) — so derivation and
 * serialization are split: derivation yields this IR (`palettesToValues`),
 * `serializeDerivedValue` renders it to a CSS string. `color` carries numeric
 * OKLCH intent (gamut-clamped at derivation, the projection-only clamp point);
 * `raw` carries a verbatim CSS string.
 */
export type DerivedValue =
  | { kind: 'color'; l: number; c: number; h: number }
  | { kind: 'raw'; css: string };

/** The single color → CSS-string projection, and the single clamp point for
 *  derived color: unclamped stored intent is chroma-reduced into sRGB gamut,
 *  then serialized (hex this wave; `oklch()` after Part B). Idempotent on the
 *  already-in-gamut per-step derivation output. `raw` passes through untouched. */
export function serializeDerivedValue(value: DerivedValue): string {
  return value.kind === 'raw' ? value.css : oklchToHexClamped(value.l, value.c, value.h);
}

export function computePaletteOklch(
  index: number,
  base: Oklch,
  lightnessCurve: CurveAnchor[],
  saturationCurve: CurveAnchor[],
  curveOffset: Record<string, number>,
): Oklch {
  const { c: baseC, h } = base;
  const xPos = stepIndexToX(index);
  const targetL = Math.max(0, Math.min(100, sampleCurve(lightnessCurve, xPos) + (curveOffset.lightness ?? 0))) / 100;
  const satMul = Math.max(0, Math.min(2, (sampleCurve(saturationCurve, xPos) + (curveOffset.saturation ?? 0)) / 100));
  const targetC = baseC * satMul;
  return gamutClamp(targetL, targetC, h);
}

export function computeDerivedOklch(
  step: Step,
  base: Oklch,
  scaleTitle: string,
  scaleCurves: Record<string, { lightness: CurveAnchor[]; saturation: CurveAnchor[] }>,
  curveOffset: Record<string, number>,
): Oklch {
  const scale = SCALES.find((s) => s.title === scaleTitle)!;
  const xPos = scaleStepToX(step, scale);
  const defs = defaultScaleCurves[scaleTitle];
  const lCurve = scaleCurves[scaleTitle]?.lightness ?? defs.lightness();
  const sCurve = scaleCurves[scaleTitle]?.saturation ?? defs.saturation();
  const lOff = curveOffset[`${scaleTitle}-lightness`] ?? 0;
  const sOff = curveOffset[`${scaleTitle}-saturation`] ?? 0;
  const { l: baseL, c: baseC, h: baseH } = base;
  let targetL: number;
  if (scale.isText) {
    const lMul = Math.max(0, Math.min(2, (sampleCurve(lCurve, xPos) + lOff) / 100));
    targetL = Math.max(0, Math.min(1, baseL * lMul));
  } else {
    targetL = Math.max(0, Math.min(100, sampleCurve(lCurve, xPos) + lOff)) / 100;
  }
  const satMul = Math.max(0, Math.min(2, (sampleCurve(sCurve, xPos) + sOff) / 100));
  const targetC = baseC * satMul;
  return gamutClamp(targetL, targetC, baseH);
}

export function scaleToCssVar(scaleTitle: string, stepName: string, cssNamespace: string | null): string | null {
  if (cssNamespace === null) return null;
  if (scaleTitle === 'Surfaces') {
    const suffix = stepName === 'default' ? '' : `-${stepName}`;
    return cssNamespace === 'neutral' ? `--surface-neutral${suffix}` : `--surface-${cssNamespace}${suffix}`;
  }
  if (scaleTitle === 'Borders') {
    const suffix = stepName === 'default' ? '' : `-${stepName}`;
    return cssNamespace === 'neutral' ? `--border-neutral${suffix}` : `--border-${cssNamespace}${suffix}`;
  }
  if (scaleTitle === 'Text') {
    if (cssNamespace === 'neutral') return `--text-${stepName}`;
    return stepName === 'primary' ? `--text-${cssNamespace}` : `--text-${cssNamespace}-${stepName}`;
  }
  return null;
}

export function derivePaletteValues(spec: PaletteSpec, config: PaletteConfig | undefined): Record<string, DerivedValue> {
  const out: Record<string, DerivedValue> = {};
  if (!config) return out;

  const baseColor = config.baseColor ?? spec.initialColor;
  const overrides = config.overrides ?? {};
  const curveOffset = config.curveOffset ?? {};
  const scaleCurves = config.scaleCurves ?? {};
  const lightnessCurve = config.lightnessCurve ?? DEFAULT_PALETTE_LIGHTNESS();
  const saturationCurve = config.saturationCurve ?? DEFAULT_PALETTE_SATURATION();

  PALETTE_STEPS.forEach((ps, index) => {
    const k = paletteStepKey(ps.label);
    // Overrides are numeric OKLCH intent; pass straight through as color-kind.
    const value: DerivedValue = (k in overrides)
      ? { kind: 'color', ...overrides[k] }
      : { kind: 'color', ...computePaletteOklch(index, baseColor, lightnessCurve, saturationCurve, curveOffset) };
    out[`--color-${spec.cssNamespace}-${ps.label}`] = value;
  });

  for (const scale of SCALES) {
    for (const step of scale.steps) {
      const k = stepKey(scale.title, step.name);
      const value: DerivedValue = (k in overrides)
        ? { kind: 'color', ...overrides[k] }
        : { kind: 'color', ...computeDerivedOklch(step, baseColor, scale.title, scaleCurves, curveOffset) };
      const varName = scaleToCssVar(scale.title, step.name, spec.cssNamespace);
      if (varName) out[varName] = value;
    }
  }

  if (spec.emptySelector) {
    const emptyMode = config.emptyMode ?? 'solid';
    const emptyStep = config.emptyStep ?? '850';
    const gradientStyle = config.gradientStyle ?? 'linear';
    const gradientAngle = config.gradientAngle ?? 180;
    const gradientReverse = config.gradientReverse ?? false;
    const gradientSize = config.gradientSize ?? 'page';
    const gradientStops = config.gradientStops ?? [
      { position: 0, paletteLabel: '800' },
      { position: 100, paletteLabel: '950' },
    ];

    if (emptyMode === 'solid') {
      const stepValue = out[`--color-${spec.cssNamespace}-${emptyStep}`];
      if (stepValue) out['--page-bg'] = stepValue;
      out['--page-bg-attachment'] = { kind: 'raw', css: 'scroll' };
    } else {
      // `--page-bg` is a raw kind composed from the already-serialized step
      // colors — the gradient string is a projection, not a basis value.
      const sortedStops = [...gradientStops].sort((a, b) =>
        gradientReverse ? b.position - a.position : a.position - b.position,
      );
      const stopsCss = sortedStops
        .map((s) => {
          const stopValue = out[`--color-${spec.cssNamespace}-${s.paletteLabel}`];
          const hex = stopValue ? serializeDerivedValue(stopValue) : '#000000';
          return `${hex} ${s.position}%`;
        })
        .join(', ');
      let gradient: string;
      switch (gradientStyle) {
        case 'radial': gradient = `radial-gradient(circle, ${stopsCss})`; break;
        case 'conic':  gradient = `conic-gradient(from ${gradientAngle}deg, ${stopsCss})`; break;
        default:       gradient = `linear-gradient(${gradientAngle}deg, ${stopsCss})`;
      }
      out['--page-bg'] = { kind: 'raw', css: gradient };
      out['--page-bg-attachment'] = { kind: 'raw', css: gradientSize === 'window' ? 'fixed' : 'scroll' };
    }
  }

  return out;
}

export function derivePaletteVars(spec: PaletteSpec, config: PaletteConfig | undefined): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(derivePaletteValues(spec, config))) {
    out[k] = serializeDerivedValue(v);
  }
  return out;
}

export function palettesToValues(palettes: Record<string, PaletteConfig>): Record<string, DerivedValue> {
  const out: Record<string, DerivedValue> = {};
  for (const spec of PALETTE_SPECS) {
    Object.assign(out, derivePaletteValues(spec, palettes[spec.label]));
  }
  return out;
}

export function palettesToVars(palettes: Record<string, PaletteConfig>): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(palettesToValues(palettes))) {
    out[k] = serializeDerivedValue(v);
  }
  return out;
}

const HEX_RE = /^#[0-9a-f]{6}$/i;

/**
 * Reconcile palette typed state against the catch-all `cssVariables` bag and
 * report the set of variable names the typed slice now owns. Two operations:
 *
 *   - **Snap** (gated by `_imported`): for any palette whose `_imported` flag
 *     is true, the imported `--color-{ns}-500` value is treated as the
 *     authoritative anchor and `baseColor` is snapped to it. The flag is then
 *     cleared. Editor-authored palettes (no `_imported`) are left untouched —
 *     see `temp/manifest-robustness-plan.md` §9 for why "snap on any
 *     divergence" was wrong: it would have flipped `themes/default.json`'s
 *     accent from teal to olive on first read.
 *
 *   - **Consume** (always): every variable the palette's derivation produces
 *     is reported in `consumed` so the caller can strip it from
 *     `cssVariables`. The renderer (`editorRenderer.ts:42`) overlays
 *     `palettesToVars(palettes)` on top of `cssVariables` regardless, so
 *     stripped keys were dead data anyway. Stripping makes the file
 *     invariant explicit: catch-all carries only tokens no typed slice owns.
 *
 * Returns the updated palette map plus the two sets. Pure: no DOM, no I/O,
 * no module state. Idempotent on second call with the same input (no anchor
 * to snap to after first call's strip).
 */
export function reconcilePalettesFromCssVars(
  palettes: Record<string, PaletteConfig>,
  cssVars: Record<string, string>,
): {
  palettes: Record<string, PaletteConfig>;
  consumed: ReadonlySet<string>;
  snapped: ReadonlySet<string>;
} {
  const next: Record<string, PaletteConfig> = structuredClone(palettes);
  const consumed = new Set<string>();
  const snapped = new Set<string>();

  for (const spec of PALETTE_SPECS) {
    const current = next[spec.label];
    if (current === undefined) continue;

    if (current._imported === true) {
      const anchorHex = cssVars[`--color-${spec.cssNamespace}-500`];
      if (anchorHex && HEX_RE.test(anchorHex.trim())) {
        // Input boundary: the imported cssVariables anchor is a hex string;
        // parse it to the OKLCH basis exactly once, here.
        next[spec.label] = { ...current, baseColor: hexToOklch(anchorHex.trim()), _imported: false };
        snapped.add(spec.label);
      } else {
        // No anchor in cssVariables to snap to — flag has nothing to do; clear
        // it so subsequent calls don't keep checking. Safe because the renderer
        // is going to overlay palettesToVars anyway.
        next[spec.label] = { ...current, _imported: false };
      }
    }

    for (const k of Object.keys(derivePaletteVars(spec, next[spec.label]))) {
      consumed.add(k);
    }
  }

  return { palettes: next, consumed, snapped };
}
