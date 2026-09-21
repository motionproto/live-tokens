import type { TokensCssMigration } from '../types';
import { ensureScale } from '../cssTokenOps';

/**
 * tokens-css migration (2026-09-21): add `--tint-color` and `--tint-opacity-*`.
 *
 * From 0.85.0 a theme stores a tint's colour and its three strengths, as it
 * already did for scrims, and tokens.css composes the `--tint-*` fills from
 * them. A `tokens.css` written before that lacks the four names, so a theme's
 * tint edits would reach nothing a page paints.
 *
 * `additive`: it only inserts names. The existing stops keep the values the
 * project gave them; the CHANGELOG shows the composed form for a project that
 * wants its stops to follow `--tint-color`.
 */
const ENTRIES = [
  { name: '--tint-color', value: 'rgb(255, 255, 255)' },
  { name: '--tint-opacity-low', value: '0.05' },
  { name: '--tint-opacity', value: '0.1' },
  { name: '--tint-opacity-high', value: '0.15' },
];

export const tokensCssMigration_2026_09_21_tintColorAndOpacity: TokensCssMigration = {
  id: '2026-09-21-tint-color-and-opacity',
  kind: 'additive',
  description: "Add --tint-color and --tint-opacity-*; a tint's colour and strength are separate tokens",
  apply(css) {
    return ensureScale(css, {
      entries: ENTRIES,
      sectionComment: 'Tint colour and strength, which the --tint-* stops compose',
      anchorPrefixes: ['--tint'],
    });
  },
};
