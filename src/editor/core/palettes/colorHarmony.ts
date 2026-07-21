// Harmony rotates HUE ONLY (Global invariant 6). Each palette keeps its own
// OKLCH chroma and lightness; only the seed's hue moves onto a geometric
// relationship with the Brand anchor. No chroma clamp or cap lives here — a
// saturated background is a legitimate choice, not something to correct.

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

/** The harmony trio, in order: [Brand (anchor), Background, Accent]. */
const TRIO = ['Brand', 'Background', 'Accent'] as const;

const norm = (h: number): number => ((h % 360) + 360) % 360;

/** Hues for [Brand, Background, Accent] given the Brand anchor hue. */
export function harmonyHues(mode: HarmonyMode, anchorHue: number): number[] {
  const a = norm(anchorHue);
  switch (mode) {
    case 'complementary':       return [a, a, norm(a + 180)];
    case 'split-complementary': return [a, norm(a + 150), norm(a + 210)];
    case 'triadic':             return [a, norm(a + 120), norm(a + 240)];
    case 'square':              return [a, norm(a + 90), norm(a + 180)];
    case 'analogous':           return [a, norm(a - 30), norm(a + 30)];
    case 'monochromatic':       return [a, a, a];
    case 'custom':              return [a, a, a];
  }
}

function reHue(config: PaletteConfig, hue: number): Oklch {
  const { l, c } = config.baseColor;
  return { l, c, h: norm(hue) };
}

/**
 * New baseColors for Brand/Background/Accent under `mode`. Brand's current hue
 * is the anchor; Background and Accent are re-hued to the harmony geometry with
 * their own chroma + lightness preserved. `'custom'` imposes no constraint and
 * returns no changes. Special, Neutral, Alternate, and the functional palettes
 * are never touched.
 */
export function applyHarmony(
  mode: HarmonyMode,
  palettes: Record<string, PaletteConfig>,
): Record<string, Oklch> {
  if (mode === 'custom') return {};
  const brand = palettes.Brand;
  if (!brand) return {};
  const hues = harmonyHues(mode, brand.baseColor.h);
  const out: Record<string, Oklch> = {};
  TRIO.forEach((label, i) => {
    const config = palettes[label];
    if (config) out[label] = reHue(config, hues[i]);
  });
  return out;
}

/** Re-hue Neutral and Alternate to the Brand hue, own chroma + lightness kept. */
export function tintNeutralsFromBrand(
  palettes: Record<string, PaletteConfig>,
): Record<string, Oklch> {
  const brand = palettes.Brand;
  if (!brand) return {};
  const hue = brand.baseColor.h;
  const out: Record<string, Oklch> = {};
  for (const label of ['Neutral', 'Alternate']) {
    const config = palettes[label];
    if (config) out[label] = reHue(config, hue);
  }
  return out;
}
