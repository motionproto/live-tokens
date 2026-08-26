import type { TokensCssMigration } from '../types';
import { collectTokenValues, ensureScale } from '../cssTokenOps';

/**
 * tokens-css migration (2026-08-26): give each gradient slot a companion
 * `--gradient-N-stops` carrying its stop list on its own, so a consumer can
 * keep the theme's colours and supply their own geometry:
 * `linear-gradient(to top, var(--gradient-5-stops))`.
 *
 * `additive`: it only introduces new names.
 *
 * Each companion is read out of the slot it belongs to rather than hardcoded.
 * A consumer who retuned `--gradient-2` in their own tokens.css would otherwise
 * get a stop list that contradicts the gradient it is named after, and the two
 * would render different colours from the same slot. A slot whose value is not
 * a gradient function we can read is skipped: no companion beats a wrong one.
 */
const STOPS_RE = /^(?:linear|radial)-gradient\(\s*[^,]+,\s*(.+)\)$/i;

export const tokensCssMigration_2026_08_26_gradientStops: TokensCssMigration = {
  id: '2026-08-26-gradient-stops',
  kind: 'additive',
  description: 'Add --gradient-N-stops companions to the gradient slots',
  apply(css) {
    const values = collectTokenValues(css);
    const entries = [];
    for (const [name, value] of values) {
      if (!/^--gradient-\d+$/.test(name)) continue;
      const stops = value.match(STOPS_RE);
      if (stops) entries.push({ name: `${name}-stops`, value: stops[1].trim() });
    }
    if (entries.length === 0) return css;
    return ensureScale(css, { anchorPrefixes: ['--gradient-'], entries });
  },
};
