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

import { get } from 'svelte/store';
import type { Oklch } from '../../core/palettes/oklch';
import { AXIS_ROLES } from '../../core/palettes/colorHarmony';
import { PALETTE_SPECS, syncBaseAnchor, type PaletteSpec } from '../../core/palettes/paletteDerivation';
import { solveTextCurves } from '../../core/palettes/solveTextContrast';
import { recommendNeutralText } from '../../core/palettes/recommendText';
import { defaultPaletteConfig } from '../palette/paletteMath';
import { mutate, transaction, editorState } from '../../core/store/editorStore';
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

/** Drag the bound axis's hue along after a direct color-hue edit — the handle is
 *  the color's handle while bound, so it must not silently detach (invariant 1). */
function syncBoundAxisHue(s: EditorState, label: string): void {
  const axis = s.harmonyAxes.find((a) => a.family === label);
  if (axis) axis.hue = normHue(s.palettes[label].baseColor.h);
}

/** Set the full seed color (H, C and L). Used by the readout panel. */
export function setBaseColor(label: string, color: Oklch): void {
  mutate(`colors: ${label} base`, (s) => {
    const cfg = ensureConfig(s, label);
    cfg.baseColor = color;
    syncBaseAnchor(cfg);
    syncBoundAxisHue(s, label);
  });
}

/** Set hue + chroma while preserving the seed's current lightness. Used by wheel drags/nudges. */
export function setBaseHueChroma(label: string, hue: number, chroma: number): void {
  mutate(`colors: ${label} base`, (s) => {
    const cfg = ensureConfig(s, label);
    cfg.baseColor = { l: cfg.baseColor.l, c: Math.max(0, chroma), h: normHue(hue) };
    syncBaseAnchor(cfg);
    syncBoundAxisHue(s, label);
  });
}

/** Rotate a seed's hue only — chroma and lightness preserved (harmony rotation,
 *  external rotate handles). Mirrors colorHarmony's `reHue`. */
export function setBaseHue(label: string, hue: number): void {
  mutate(`colors: ${label} hue`, (s) => {
    const cfg = ensureConfig(s, label);
    cfg.baseColor = { l: cfg.baseColor.l, c: cfg.baseColor.c, h: normHue(hue) };
    syncBaseAnchor(cfg);
    syncBoundAxisHue(s, label);
  });
}

/** Set a seed's lightness and chroma, hue preserved from the store. Used by the
 *  lightness bar. No pinned-hue parameter: numeric storage keeps hue stable even
 *  at c≈0, so it can be read straight from the store. */
export function setBaseLightnessChroma(label: string, lightness: number, chroma: number): void {
  mutate(`colors: ${label} lightness`, (s) => {
    const cfg = ensureConfig(s, label);
    cfg.baseColor = { l: lightness, c: Math.max(0, chroma), h: cfg.baseColor.h };
    syncBaseAnchor(cfg);
  });
}

/** Set a seed's chroma only — hue and lightness preserved (rail-constrained drag). */
export function setBaseChroma(label: string, chroma: number): void {
  mutate(`colors: ${label} chroma`, (s) => {
    const cfg = ensureConfig(s, label);
    cfg.baseColor = { l: cfg.baseColor.l, c: Math.max(0, chroma), h: cfg.baseColor.h };
    syncBaseAnchor(cfg);
  });
}

/** Set one axis's hue; a bound family's baseColor follows in the same mutate.
 *  familyChroma carries the wheel drag's chroma policy; omitted = chroma kept. */
export function setAxisHue(index: number, hue: number, familyChroma?: number): void {
  const h = normHue(hue);
  const axis = get(editorState).harmonyAxes[index];
  const c = familyChroma !== undefined ? Math.max(0, familyChroma) : undefined;
  const base = axis.family !== null ? get(editorState).palettes[axis.family]?.baseColor : undefined;
  const colorNoop = !base || (base.h === h && (c === undefined || base.c === c));
  if (axis.hue === h && colorNoop) return;
  mutate(`colors: ${AXIS_ROLES[index]} axis hue`, (s) => {
    applyAxisHue(s, index, h, c);
  });
}

/** Several axis hues in ONE transaction (mode apply, keyboard rotate-all). */
export function setAxisHues(
  entries: { index: number; hue: number; familyChroma?: number }[],
  historyLabel: string,
): void {
  const s0 = get(editorState);
  const changes = entries.map((e) => ({
    index: e.index,
    h: normHue(e.hue),
    c: e.familyChroma !== undefined ? Math.max(0, e.familyChroma) : undefined,
  }));
  const changed = changes.some(({ index, h, c }) => {
    const axis = s0.harmonyAxes[index];
    if (axis.hue !== h) return true;
    const base = axis.family !== null ? s0.palettes[axis.family]?.baseColor : undefined;
    if (!base) return false;
    return base.h !== h || (c !== undefined && base.c !== c);
  });
  if (!changed) return;
  transaction(historyLabel, (s) => {
    for (const { index, h, c } of changes) applyAxisHue(s, index, h, c);
  });
}

function applyAxisHue(s: EditorState, index: number, hue: number, chroma: number | undefined): void {
  const axis = s.harmonyAxes[index];
  axis.hue = hue;
  if (axis.family !== null) {
    const cfg = ensureConfig(s, axis.family);
    cfg.baseColor = { l: cfg.baseColor.l, c: chroma ?? cfg.baseColor.c, h: hue };
    syncBaseAnchor(cfg);
  }
}

/** Bind a family to an axis; the family adopts the axis hue (c + L kept).
 *  Trade-places semantics: whatever occupied the destination takes the source's
 *  position (another axis, adopting its hue, or Unassigned). One mutate. */
export function bindFamilyToAxis(family: string, index: number): void {
  const srcIndex = get(editorState).harmonyAxes.findIndex((a) => a.family === family);
  if (srcIndex === index) return;
  mutate(`colors: bind ${family}`, (s) => {
    const axes = s.harmonyAxes;
    const occupant = axes[index].family;
    axes[index].family = family;
    adoptAxisHue(s, family, axes[index].hue);
    // Source was another axis: the occupant trades into it (adopting its hue).
    // Source was Unassigned (-1): the occupant simply floats free, color kept.
    if (srcIndex !== -1) {
      axes[srcIndex].family = occupant;
      if (occupant !== null) adoptAxisHue(s, occupant, axes[srcIndex].hue);
    }
  });
}

/** Unbind; the family keeps its current color, the axis keeps its hue. */
export function unbindFamily(family: string): void {
  const idx = get(editorState).harmonyAxes.findIndex((a) => a.family === family);
  if (idx === -1) return;
  mutate(`colors: unbind ${family}`, (s) => {
    s.harmonyAxes[idx].family = null;
  });
}

function adoptAxisHue(s: EditorState, family: string, hue: number): void {
  const cfg = ensureConfig(s, family);
  cfg.baseColor = { l: cfg.baseColor.l, c: cfg.baseColor.c, h: normHue(hue) };
  syncBaseAnchor(cfg);
}

/** Set several seed colors in ONE undo entry (harmony apply, global rotate). */
export function setBaseColors(patch: Record<string, Oklch>, historyLabel = 'colors: harmony'): void {
  transaction(historyLabel, (s) => {
    for (const [label, color] of Object.entries(patch)) {
      const cfg = ensureConfig(s, label);
      cfg.baseColor = color;
      syncBaseAnchor(cfg);
    }
  });
}

export function applySolvedTextCurves(s: EditorState): void {
  const { patches } = solveTextCurves(s.palettes);
  for (const [label, patch] of Object.entries(patches)) {
    const cfg = s.palettes[label];
    if (cfg) cfg.scaleCurves = { ...cfg.scaleCurves, ...patch.scaleCurves };
  }
}

/** Read-only view of every family's config, seeding spec defaults for the ones a
 *  loaded theme leaves unconfigured — previews and recommendations must not go
 *  static on a family the theme never mentions. */
export function palettesWithDefaults(palettes: Record<string, PaletteConfig>): Record<string, PaletteConfig> {
  const map: Record<string, PaletteConfig> = {};
  for (const spec of PALETTE_SPECS) {
    map[spec.label] =
      palettes[spec.label] ?? defaultPaletteConfig({ baseColor: spec.initialColor, neutral: spec.neutral ?? false });
  }
  return map;
}

/** Apply the Color Story's suggested neutral text hierarchy (primary anchor,
 *  two even L drops, AA floors) as the Neutral family's Text curve. */
export function applySuggestedNeutralText(useBlackWhite = false): void {
  mutate('colors: suggested text hierarchy', (s) => {
    ensureConfig(s, 'Neutral');
    const rec = recommendNeutralText(s.palettes, undefined, useBlackWhite);
    if (!rec.patch) return;
    const cfg = s.palettes['Neutral'];
    cfg.scaleCurves = { ...cfg.scaleCurves, Text: rec.patch };
  });
}
