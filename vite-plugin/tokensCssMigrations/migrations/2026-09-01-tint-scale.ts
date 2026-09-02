import type { TokensCssMigration } from '../types';
import { ensureScale } from '../cssTokenOps';

/**
 * tokens-css migration (2026-09-01): add the `--tint-*` scale.
 *
 * A tint shades the surface it sits on, which is what a hover needs, and is the
 * opposite of a scrim. The theme engine has always emitted these three stops,
 * but `tokens.css` never declared them, so they resolved to nothing until a
 * theme was adopted. That is why `var(--hover)` painted no pressed state on a
 * fresh install. Baselining them closes the gap.
 *
 * `additive`: it only ever inserts names, so it is safe to auto-apply.
 * Idempotent by presence, since `ensureScale` skips names already declared.
 */
const ENTRIES = [
  { name: '--tint-low', value: 'rgba(255, 255, 255, 0.05)' },
  { name: '--tint', value: 'rgba(255, 255, 255, 0.1)' },
  { name: '--tint-high', value: 'rgba(255, 255, 255, 0.15)' },
];

export const tokensCssMigration_2026_09_01_tintScale: TokensCssMigration = {
  id: '2026-09-01-tint-scale',
  kind: 'additive',
  description: 'Add the --tint-* scale; a tint shades the surface it sits on',
  apply(css) {
    return ensureScale(css, {
      entries: ENTRIES,
      sectionComment: 'Tints — translucent washes that shade the surface they sit on',
      anchorPrefixes: ['--scrim', '--overlay'],
    });
  },
};
