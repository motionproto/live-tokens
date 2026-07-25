/**
 * Background spot → base color: the solid page background used to be a
 * separately selected palette step (`emptyStep`); it now IS the base color.
 * To keep a saved theme's page rendering identical, the base color adopts the
 * color the old spot actually showed (the derived value at that step, curves
 * and overrides included) and `syncBaseAnchor` pins it there — the placement
 * lands back on the old spot's step because the adopted L equals the curve at
 * that x by construction. Gradient-mode configs keep their base untouched.
 * The stray field is deleted either way so a resave drops it.
 *
 * Composes in `loadFromFile` after the OKLCH-basis migration (it reads a
 * numeric baseColor). Idempotent (skips once `emptyStep` is gone) and
 * self-sunsetting once every saved theme has been resaved.
 */

import {
  PALETTE_SPECS,
  derivePaletteValues,
  syncBaseAnchor,
} from '../../palettes/paletteDerivation';
import type { PaletteConfig } from '../themeTypes';

export function adoptBackgroundSpotAsBase(
  editorConfigs: Record<string, PaletteConfig>,
): Record<string, PaletteConfig> {
  const spec = PALETTE_SPECS.find((s) => s.emptySelector)!;
  for (const [label, cfg] of Object.entries(editorConfigs)) {
    const legacy = cfg as PaletteConfig & { emptyStep?: string };
    if (legacy.emptyStep === undefined) continue;
    if (label === spec.label && (cfg.emptyMode ?? 'solid') === 'solid') {
      const spot = derivePaletteValues(spec, cfg)[`--color-${spec.cssNamespace}-${legacy.emptyStep}`];
      if (spot?.kind === 'color') {
        cfg.baseColor = { l: spot.l, c: spot.c, h: spot.h };
        syncBaseAnchor(cfg);
      }
    }
    delete legacy.emptyStep;
  }
  return editorConfigs;
}
