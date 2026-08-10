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
import { axisLabel } from '../../core/palettes/colorHarmony';
import { PALETTE_SPECS, syncBaseAnchor, type PaletteSpec } from '../../core/palettes/paletteDerivation';
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
  mutate(`colors: ${axisLabel(index)} hue`, (s) => {
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

/** Which side of an assignment keeps its hue: `swatch` moves the axis onto the
 *  color, `axis` repaints the color onto the axis. */
export type AdoptOnAssign = 'swatch' | 'axis';

/** Bind a family to an axis; `adopt` decides which hue survives. Trade-places
 *  semantics: whatever occupied the destination takes the source's position
 *  (another axis, reconciled the same way, or unassigned). One mutate.
 *  Returns whether any axis hue moved, which is what makes an applied harmony
 *  mode untrue — the caller drops to Custom on that. */
export function bindFamilyToAxis(family: string, index: number, adopt: AdoptOnAssign): boolean {
  const srcIndex = get(editorState).harmonyAxes.findIndex((a) => a.family === family);
  if (srcIndex === index) return false;
  const reconcile = adopt === 'swatch' ? takeSeedHue : giveAxisHue;
  let hueMoved = false;
  mutate(`colors: assign ${family}`, (s) => {
    const axes = s.harmonyAxes;
    const occupant = axes[index].family;
    axes[index].family = family;
    hueMoved = reconcile(s, index, family);
    // Source was another axis: the occupant trades into it and reconciles with
    // it in turn. Source was unassigned (-1): the occupant floats free, and
    // keeps whatever hue this assignment left it.
    if (srcIndex !== -1) {
      axes[srcIndex].family = occupant;
      if (occupant !== null) hueMoved = reconcile(s, srcIndex, occupant) || hueMoved;
    }
  });
  return hueMoved;
}

/** Unbind; the family keeps its current color, the axis keeps its hue. */
export function unbindFamily(family: string): void {
  const idx = get(editorState).harmonyAxes.findIndex((a) => a.family === family);
  if (idx === -1) return;
  mutate(`colors: unassign ${family}`, (s) => {
    s.harmonyAxes[idx].family = null;
  });
}

/** The axis adopts the swatch: the seed the user chose is never repainted, so
 *  the axis is what moves. */
function takeSeedHue(s: EditorState, index: number, family: string): boolean {
  const hue = normHue(ensureConfig(s, family).baseColor.h);
  if (s.harmonyAxes[index].hue === hue) return false;
  s.harmonyAxes[index].hue = hue;
  return true;
}

/** The swatch adopts the axis: the color lands on the hue its new slot holds,
 *  which leaves the geometry untouched — hence never a hue move to report, so
 *  an applied harmony mode survives assignment. */
function giveAxisHue(s: EditorState, index: number, family: string): boolean {
  // The axis hue is taken raw: the color must land exactly on it, and normHue
  // is not identity in range — its round trip shifts the last bit.
  const hue = s.harmonyAxes[index].hue;
  const cfg = ensureConfig(s, family);
  if (cfg.baseColor.h !== hue) {
    cfg.baseColor = { l: cfg.baseColor.l, c: cfg.baseColor.c, h: hue };
    syncBaseAnchor(cfg);
  }
  return false;
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
