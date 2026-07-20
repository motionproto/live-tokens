/**
 * The Colors view's writes to a palette's seed color. Both the wheel handle
 * drag and the readout panel funnel through here so a Colors-view edit is
 * byte-identical to a PaletteEditor base-color edit (global invariant 5: one
 * store path, no parallel color state). `mutate` runs inside whatever scope the
 * caller has opened (a wheel drag's clipping session, a slider gesture, or none
 * for a discrete edit); this module never opens or commits scopes itself.
 *
 * The seed-if-missing branch mirrors `PaletteEditor.edit` — in a loaded theme
 * every palette already exists, but keeping the write self-sufficient means a
 * handle can never silently drop an edit.
 */

import { hexToOklch, oklchToHex, gamutClamp } from '../../core/palettes/oklch';
import { PALETTE_SPECS, type PaletteSpec } from '../../core/palettes/paletteDerivation';
import { defaultPaletteConfig } from '../palette/paletteMath';
import { mutate } from '../../core/store/editorStore';
import type { EditorState } from '../../core/store/editorTypes';
import type { PaletteConfig } from '../../core/themes/themeTypes';

const SPEC_BY_LABEL: Record<string, PaletteSpec> = Object.fromEntries(PALETTE_SPECS.map((s) => [s.label, s]));

function ensureConfig(s: EditorState, label: string): PaletteConfig {
  let cfg = s.palettes[label];
  if (!cfg) {
    const spec = SPEC_BY_LABEL[label];
    cfg = s.palettes[label] = defaultPaletteConfig({ baseColor: spec.initialColor, neutral: spec.neutral });
  }
  return cfg;
}

/** Gamut-clamp (h, c, l%) and return the sRGB hex. Mirrors PaletteEditor's `oklchHex`. */
export function oklchToHexClamped(hue: number, chroma: number, lightnessPct: number): string {
  const g = gamutClamp(lightnessPct / 100, chroma, hue);
  return oklchToHex(g.l, g.c, g.h);
}

/** Set the full seed color (H, C and L). Used by the readout panel. */
export function setBaseColor(label: string, hex: string): void {
  mutate(`colors: ${label} base`, (s) => {
    ensureConfig(s, label).baseColor = hex;
  });
}

/** Set hue + chroma while preserving the seed's current lightness. Used by wheel drags/nudges. */
export function setBaseHueChroma(label: string, hue: number, chroma: number): void {
  mutate(`colors: ${label} base`, (s) => {
    const cfg = ensureConfig(s, label);
    const { l } = hexToOklch(cfg.baseColor);
    const g = gamutClamp(l, chroma, hue);
    cfg.baseColor = oklchToHex(g.l, g.c, g.h);
  });
}
