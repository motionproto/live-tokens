/**
 * Base-anchor placement for never-edited palettes.
 *
 * `anchorToBase` defaults on, but configs saved before placements existed
 * carry no `anchorPlacement` until the next base-color edit — so their ramps
 * never show the anchored slot. Place them up front: `syncBaseAnchor` pins the
 * base color at the step whose curve lightness is nearest the base L.
 *
 * Composes outermost in `loadFromFile` — it must run after
 * `adoptBackgroundSpotAsBase`, which derives the legacy spot color from the
 * not-yet-pinned curves — and over hydrated session state
 * (`normalizeBaseAnchors`). Idempotent (skips placed configs) and
 * self-sunsetting once every saved theme has been resaved with a placement.
 */

import { syncBaseAnchor } from '../../palettes/paletteDerivation';
import type { PaletteConfig } from '../themeTypes';

export function placeUnplacedBaseAnchors(
  editorConfigs: Record<string, PaletteConfig>,
): Record<string, PaletteConfig> {
  for (const cfg of Object.values(editorConfigs)) {
    if (cfg.anchorPlacement !== undefined || cfg.anchorToBase === false) continue;
    // Disk/storage data: a config missing its basis can't be placed.
    if (!cfg.baseColor || !cfg.lightnessCurve?.length || !cfg.saturationCurve?.length) continue;
    syncBaseAnchor(cfg);
  }
  return editorConfigs;
}
