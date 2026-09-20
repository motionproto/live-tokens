import type { TokensCssMigration } from '../types';
import { ensureScale } from '../cssTokenOps';

/**
 * tokens-css migration (2026-09-20): add `--scrim-color` and `--scrim-opacity-*`.
 *
 * Dialog and ImageLightbox read a scrim's colour and its strength as two
 * tokens from 0.84.0. A `tokens.css` written before that declares only the
 * three composed `--scrim-*` stops, so both screens would resolve to nothing
 * until these names exist.
 *
 * `additive`: it only inserts names. The existing stops keep the values the
 * project gave them; the CHANGELOG shows the composed form for a project that
 * wants its stops to follow `--scrim-color`.
 */
const ENTRIES = [
  { name: '--scrim-color', value: 'rgb(20, 3, 0)' },
  { name: '--scrim-opacity-low', value: '0.38' },
  { name: '--scrim-opacity', value: '0.51' },
  { name: '--scrim-opacity-high', value: '0.64' },
];

export const tokensCssMigration_2026_09_20_scrimColorAndOpacity: TokensCssMigration = {
  id: '2026-09-20-scrim-color-and-opacity',
  kind: 'additive',
  description: "Add --scrim-color and --scrim-opacity-*; a scrim's colour and strength are separate tokens",
  apply(css) {
    return ensureScale(css, {
      entries: ENTRIES,
      sectionComment: 'Scrim colour and strength, which each screen mixes where it paints',
      anchorPrefixes: ['--scrim'],
    });
  },
};
