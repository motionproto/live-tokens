// Harmony rotates HUE ONLY (Global invariant 6). Each palette keeps its own
// OKLCH chroma and lightness; only the seed's hue moves onto a geometric
// relationship with the anchor (slot 0 of the caller-supplied order). No chroma
// clamp or cap lives here; a saturated background is a legitimate choice, not
// something to correct.

import type { Oklch } from './oklch';
import type { PaletteConfig } from '../themes/themeTypes';

export type HarmonyMode =
  | 'complementary'
  | 'split-complementary'
  | 'triadic'
  | 'square'
  | 'analogous'
  | 'monochromatic'
  | 'custom';

/** Default harmony axis order: slot 0 is the anchor (Brand), then Accent, Background. */
export const DEFAULT_HARMONY_ORDER: readonly string[] = ['Brand', 'Accent', 'Background'];

/** Families the user may order/include on the harmony axes (dev-declared pool). */
export const HARMONY_ELIGIBLE: readonly string[] = ['Brand', 'Accent', 'Background', 'Special'];

const norm = (h: number): number => ((h % 360) + 360) % 360;

/**
 * Slot hues for `mode` from the anchor hue, priority-ordered: slot 1 is the
 * primary harmonic partner. Returns the first `slotCount` slots (1–4). With the
 * default order, dealing slots 0–2 reproduces today's per-family output.
 */
export function harmonyHues(mode: HarmonyMode, anchorHue: number, slotCount: number): number[] {
  const a = norm(anchorHue);
  const slots = ((): number[] => {
    switch (mode) {
      case 'complementary':       return [a, norm(a + 180), a, norm(a + 180)];
      case 'split-complementary': return [a, norm(a + 210), norm(a + 150), a];
      case 'triadic':             return [a, norm(a + 240), norm(a + 120), a];
      case 'square':              return [a, norm(a + 180), norm(a + 90), norm(a + 270)];
      case 'analogous':           return [a, norm(a + 30), norm(a - 30), norm(a + 60)];
      case 'monochromatic':       return [a, a, a, a];
      case 'custom':              return [a, a, a, a];
    }
  })();
  return slots.slice(0, slotCount);
}

function reHue(config: PaletteConfig, hue: number): Oklch {
  const { l, c } = config.baseColor;
  return { l, c, h: norm(hue) };
}

/**
 * New baseColors for the families in `order` under `mode`. The slot-0 family is
 * the anchor and keeps its hue; the rest are re-hued to the harmony geometry with
 * their own chroma + lightness preserved. `'custom'` imposes no constraint and
 * returns no changes. Families not in `order` are never touched.
 */
export function applyHarmony(
  mode: HarmonyMode,
  palettes: Record<string, PaletteConfig>,
  order: readonly string[] = DEFAULT_HARMONY_ORDER,
): Record<string, Oklch> {
  if (mode === 'custom') return {};
  const anchor = palettes[order[0]];
  if (!anchor) return {};
  const hues = harmonyHues(mode, anchor.baseColor.h, order.length);
  const out: Record<string, Oklch> = {};
  order.forEach((label, i) => {
    const config = palettes[label];
    if (config) out[label] = reHue(config, hues[i]);
  });
  return out;
}

/** Re-hue Neutral and Alternate to the anchor hue, own chroma + lightness kept. */
export function tintNeutralsFromAnchor(
  palettes: Record<string, PaletteConfig>,
  order: readonly string[] = DEFAULT_HARMONY_ORDER,
): Record<string, Oklch> {
  const anchor = palettes[order[0]];
  if (!anchor) return {};
  const hue = anchor.baseColor.h;
  const out: Record<string, Oklch> = {};
  for (const label of ['Neutral', 'Alternate']) {
    const config = palettes[label];
    if (config) out[label] = reHue(config, hue);
  }
  return out;
}
