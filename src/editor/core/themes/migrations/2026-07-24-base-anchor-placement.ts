/**
 * Base-anchor placement: adopt the legacy locked-500 anchor.
 *
 * The old "Lock base color to position 500" toggle injected a curve anchor at
 * x=40 (step 500) but recorded nothing about it — the editor re-found it by
 * x-position. Placement is now persisted as `anchorPlacement` (any step, not
 * just 500), so configs that carry the legacy anchor adopt it as a placement
 * at step index 4. Configs whose lock was on but inert (flag true, no anchor
 * — the shipped default for most palettes) are left alone; their placement
 * happens on the next base-color edit.
 *
 * Lives outside the `runMigrations` framework (whose contract is the flat
 * cssVariables bag) because it transforms the structured `editorConfigs` map,
 * exactly like `migratePaletteColorsToOklch`, which it composes with in
 * `loadFromFile`. Applied unconditionally; idempotent (skips once
 * `anchorPlacement` exists) and self-sunsetting once every saved theme has
 * been resaved with a placement.
 */

import { stepIndexToX } from '../../palettes/paletteDerivation';
import type { PaletteConfig } from '../themeTypes';

const LEGACY_LOCK_STEP = 4;

export function adoptLegacyBaseAnchor(
  editorConfigs: Record<string, PaletteConfig>,
): Record<string, PaletteConfig> {
  const x500 = stepIndexToX(LEGACY_LOCK_STEP);
  for (const cfg of Object.values(editorConfigs)) {
    if (cfg.anchorToBase === false || cfg.anchorPlacement !== undefined) continue;
    const idx = (cfg.lightnessCurve ?? []).findIndex((a) => Math.abs(a.x - x500) < 0.5);
    if (idx > 0 && idx < cfg.lightnessCurve.length - 1) {
      cfg.anchorPlacement = { step: LEGACY_LOCK_STEP };
    }
  }
  return editorConfigs;
}
