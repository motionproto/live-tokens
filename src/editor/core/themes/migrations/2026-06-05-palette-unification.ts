/**
 * Palette unification: drop the gray palette "mode".
 *
 * Lives outside the `runMigrations` framework (whose contract is the flat
 * `Record<string, string>` cssVariables bag) because it transforms the
 * structured `editorConfigs` map, exactly like `renamePrimaryPaletteKey`.
 * Applied unconditionally in `loadFromFile`; idempotent and self-sunsetting —
 * once every saved theme has been resaved without the gray fields, this file
 * is dead code and can be deleted.
 *
 * Two cases:
 *   - Neutral / Alternate (the former gray palettes): close-map to the unified
 *     shape. The picked base becomes the effective gray-500 (subtle tint +
 *     lightness preserved), the lightness curve keeps the neutral ramp, and the
 *     saturation curve flattens to 100 — chroma now flows from the base, not a
 *     flat-20 multiplier. Hand-shaped gray saturation curves are not reproduced
 *     (owner accepted approximate + manual retune).
 *   - Every other palette: the gray fields were always vestigial; drop them.
 */

import { type CurveAnchor, sampleCurve } from '../../../ui/curveEngine';
import { hexToOklch, oklchToHex, gamutClamp } from '../../palettes/oklch';
import { DEFAULT_PALETTE_SATURATION } from '../../palettes/paletteDerivation';
import type { PaletteConfig } from '../themeTypes';

const NEUTRAL_LABELS = new Set(['Neutral', 'Alternate']);

const GRAY_STEP_COUNT = 11;
const GRAY_500_X = (4 / (GRAY_STEP_COUNT - 1)) * 100;

/** Legacy shape: the gray fields union'd onto every saved palette config. */
type LegacyGrayFields = {
  tintHue?: number;
  tintChroma?: number;
  grayLightnessCurve?: CurveAnchor[];
  graySaturationCurve?: CurveAnchor[];
};
type LegacyPaletteConfig = PaletteConfig & LegacyGrayFields;

/** Reproduces the deleted `computeGrayColor` at step 500. */
function effectiveGray500(cfg: LegacyPaletteConfig): string {
  const hue = cfg.tintHue ?? 240;
  const chroma = cfg.tintChroma ?? 0.04;
  const lCurve = cfg.grayLightnessCurve ?? [];
  const sCurve = cfg.graySaturationCurve ?? [];
  const lOff = cfg.curveOffset?.['gray-lightness'] ?? 0;
  const sOff = cfg.curveOffset?.['gray-saturation'] ?? 0;
  const targetL = Math.max(0, Math.min(100, sampleCurve(lCurve, GRAY_500_X) + lOff)) / 100;
  const satMul = Math.max(0, Math.min(2, (sampleCurve(sCurve, GRAY_500_X) + sOff) / 100));
  const clamped = gamutClamp(targetL, chroma * satMul, hue);
  return oklchToHex(clamped.l, clamped.c, clamped.h);
}

function stripGrayFields(cfg: LegacyPaletteConfig): PaletteConfig {
  const { tintHue, tintChroma, grayLightnessCurve, graySaturationCurve, ...rest } = cfg;
  return rest;
}

/** Precondition: `cfg.grayLightnessCurve` is defined (caller-guarded). */
function unifyNeutral(cfg: LegacyPaletteConfig): PaletteConfig {
  const {
    'gray-lightness': grayLightnessOffset,
    'gray-saturation': _graySaturationOffset,
    lightness: _lightness,
    saturation: _saturation,
    ...scaleOffsets
  } = cfg.curveOffset ?? {};

  return {
    ...stripGrayFields(cfg),
    baseColor: effectiveGray500(cfg),
    lightnessCurve: cfg.grayLightnessCurve!,
    saturationCurve: DEFAULT_PALETTE_SATURATION(),
    curveOffset: { ...scaleOffsets, lightness: grayLightnessOffset ?? 0, saturation: 0 },
    anchorToBase: true,
  };
}

export function unifyGrayPalettes(
  editorConfigs: Record<string, PaletteConfig>,
): Record<string, PaletteConfig> {
  const out: Record<string, PaletteConfig> = {};
  for (const [label, cfg] of Object.entries(editorConfigs)) {
    const legacy = cfg as LegacyPaletteConfig;
    out[label] = NEUTRAL_LABELS.has(label) && legacy.grayLightnessCurve !== undefined
      ? unifyNeutral(legacy)
      : stripGrayFields(legacy);
  }
  return out;
}
