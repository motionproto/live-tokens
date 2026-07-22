/**
 * The Colors view's writes to a palette's seed color and the page-background
 * spot. Both the wheel handle drag and the readout panel funnel through here so
 * a Colors-view edit is byte-identical to a PaletteEditor base-color edit
 * (global invariant 5: one store path, no parallel color state). `mutate` runs
 * inside whatever scope the caller has opened (a wheel drag's clipping session,
 * a slider gesture, or none for a discrete edit); the seed-color setters never
 * open or commit scopes themselves.
 *
 * The store holds unclamped OKLCH intent: setters write channels directly, with
 * no gamut clamp and no hex round-trip. Clamping is projection-only (derivation
 * output, canvas painting, hex/CSS serialization), which is what lets a drag
 * past an L extreme recover its chroma and keep its hue through grey.
 *
 * The seed-if-missing branch mirrors `PaletteEditor.edit` — in a loaded theme
 * every palette already exists, but keeping the write self-sufficient means a
 * handle can never silently drop an edit.
 */

import type { Oklch } from '../../core/palettes/oklch';
import { sanitizeHarmonyOrder } from '../../core/palettes/colorHarmony';
import { PALETTE_SPECS, type PaletteSpec } from '../../core/palettes/paletteDerivation';
import { solveTextCurves } from '../../core/palettes/solveTextContrast';
import { defaultPaletteConfig } from '../palette/paletteMath';
import { mutate, transaction } from '../../core/store/editorStore';
import type { EditorState } from '../../core/store/editorTypes';
import type { PaletteConfig } from '../../core/themes/themeTypes';

const SPEC_BY_LABEL: Record<string, PaletteSpec> = Object.fromEntries(PALETTE_SPECS.map((s) => [s.label, s]));

const normHue = (d: number) => ((d % 360) + 360) % 360;

function ensureConfig(s: EditorState, label: string): PaletteConfig {
  let cfg = s.palettes[label];
  if (!cfg) {
    const spec = SPEC_BY_LABEL[label];
    cfg = s.palettes[label] = defaultPaletteConfig({ baseColor: spec.initialColor, neutral: spec.neutral });
  }
  return cfg;
}

/** Set the full seed color (H, C and L). Used by the readout panel. */
export function setBaseColor(label: string, color: Oklch): void {
  mutate(`colors: ${label} base`, (s) => {
    ensureConfig(s, label).baseColor = color;
  });
}

/** Set hue + chroma while preserving the seed's current lightness. Used by wheel drags/nudges. */
export function setBaseHueChroma(label: string, hue: number, chroma: number): void {
  mutate(`colors: ${label} base`, (s) => {
    const cfg = ensureConfig(s, label);
    cfg.baseColor = { l: cfg.baseColor.l, c: Math.max(0, chroma), h: normHue(hue) };
  });
}

/** Rotate a seed's hue only — chroma and lightness preserved (harmony rotation,
 *  external rotate handles). Mirrors colorHarmony's `reHue`. */
export function setBaseHue(label: string, hue: number): void {
  mutate(`colors: ${label} hue`, (s) => {
    const cfg = ensureConfig(s, label);
    cfg.baseColor = { l: cfg.baseColor.l, c: cfg.baseColor.c, h: normHue(hue) };
  });
}

/** Set a seed's lightness and chroma, hue preserved from the store. Used by the
 *  lightness bar. No pinned-hue parameter: numeric storage keeps hue stable even
 *  at c≈0, so it can be read straight from the store. */
export function setBaseLightnessChroma(label: string, lightness: number, chroma: number): void {
  mutate(`colors: ${label} lightness`, (s) => {
    const cfg = ensureConfig(s, label);
    cfg.baseColor = { l: lightness, c: Math.max(0, chroma), h: cfg.baseColor.h };
  });
}

/** Set a seed's chroma only — hue and lightness preserved (rail-constrained drag). */
export function setBaseChroma(label: string, chroma: number): void {
  mutate(`colors: ${label} chroma`, (s) => {
    const cfg = ensureConfig(s, label);
    cfg.baseColor = { l: cfg.baseColor.l, c: Math.max(0, chroma), h: cfg.baseColor.h };
  });
}

/** Single write path for the harmony axis order; the sanitizer guards against a
 *  dropped/duplicated entry ever reaching the store. */
export function setHarmonyOrder(order: string[]): void {
  mutate('colors: harmony axes', (s) => {
    s.harmonyOrder = sanitizeHarmonyOrder(order);
  });
}

/** Set several seed colors in ONE undo entry (harmony apply, global rotate). */
export function setBaseColors(patch: Record<string, Oklch>, historyLabel = 'colors: harmony'): void {
  transaction(historyLabel, (s) => {
    for (const [label, color] of Object.entries(patch)) {
      ensureConfig(s, label).baseColor = color;
    }
  });
}

export function applySolvedTextCurves(s: EditorState): void {
  const { patches, cssVarOverrides } = solveTextCurves(s.palettes);
  for (const [label, patch] of Object.entries(patches)) {
    const cfg = s.palettes[label];
    if (cfg) cfg.scaleCurves = { ...cfg.scaleCurves, ...patch.scaleCurves };
  }
  Object.assign(s.cssVars, cssVarOverrides);
}

/** Pick which palette step is the page background. Forces solid mode, then
 *  re-solves every family's text curve against the new background in the same
 *  transaction — one undo restores both the spot and the text. */
export function setBackgroundSpot(stepLabel: string): void {
  const spec = PALETTE_SPECS.find((p) => p.emptySelector)!;
  transaction(`colors: background spot ${stepLabel}`, (s) => {
    const cfg = ensureConfig(s, spec.label);
    cfg.emptyMode = 'solid';
    cfg.emptyStep = stepLabel;
    applySolvedTextCurves(s);
  });
}
