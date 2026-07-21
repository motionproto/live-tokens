/**
 * Palette color basis: hex → numeric OKLCH.
 *
 * The stored + edited basis moves from 8-bit hex to numeric OKLCH `{ l, c, h }`
 * for every palette's `baseColor` and `overrides`. Lives outside the
 * `runMigrations` framework (whose contract is the flat cssVariables bag)
 * because it transforms the structured `editorConfigs` map — exactly like
 * `renamePrimaryPaletteKey` / `unifyGrayPalettes`, which it composes with in
 * `loadFromFile`. Applied unconditionally; idempotent (an already-numeric
 * channel passes straight through) and self-sunsetting once every saved theme
 * has been resaved in the numeric shape.
 *
 * The `_imported` anchor lives in `cssVariables` (a hex string) and is
 * untouched here; the reconcile parser converts it at its own boundary.
 */

import { hexToOklch, type Oklch } from '../../palettes/oklch';
import type { PaletteConfig } from '../themeTypes';

/** A config whose color channels may still be hex strings (pre-basis on disk)
 *  or already numeric (resaved). Lets the pre-OKLCH structural migrations stay
 *  honestly typed while this one is the boundary that produces `PaletteConfig`. */
export type PreOklchPaletteConfig = Omit<PaletteConfig, 'baseColor' | 'overrides'> & {
  baseColor: string | Oklch;
  overrides: Record<string, string | Oklch>;
};

const round = (v: number, dp: number): number => {
  const f = 10 ** dp;
  return Math.round(v * f) / f;
};

// Storage precision (decision 5): l, c to 4 decimals, h to 2 — beyond sub-LSB
// fidelity so the sRGB projection is unmoved, and stable across file diffs.
function toStoredOklch(value: string | Oklch): Oklch {
  if (typeof value !== 'string') return value;
  const { l, c, h } = hexToOklch(value);
  return { l: round(l, 4), c: round(c, 4), h: round(h, 2) };
}

export function migratePaletteColorsToOklch(
  editorConfigs: Record<string, PreOklchPaletteConfig>,
): Record<string, PaletteConfig> {
  const out: Record<string, PaletteConfig> = {};
  for (const [label, cfg] of Object.entries(editorConfigs)) {
    const overrides: Record<string, Oklch> = {};
    for (const [k, v] of Object.entries(cfg.overrides ?? {})) overrides[k] = toStoredOklch(v);
    out[label] = { ...cfg, baseColor: toStoredOklch(cfg.baseColor), overrides };
  }
  return out;
}
