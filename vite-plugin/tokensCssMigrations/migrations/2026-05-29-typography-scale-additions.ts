import type { TokensCssMigration } from '../types';
import { ensureScale } from '../cssTokenOps';

/**
 * tokens-css migration (2026-05-29): add the letter-spacing and easing scales
 * that components started referencing once the divider/type system expanded.
 *
 * Earlier `tokens.css` files carried no letter-spacing scale and no
 * `--ease-out-quart`; without them those `var()`s resolve to nothing and the
 * editor shows blank/`—` slots. This adds the full canonical scales (not just
 * the referenced steps) so the editor's pickers offer every option. Values are
 * the package defaults; a consumer can retune them afterwards.
 *
 * The line-height scale this migration originally seeded is now owned
 * end-to-end by 2026-07-20-line-height-rename and is deliberately not added
 * here: an additive migration must not re-add names a later breaking rename
 * removes, or re-running the fold loses idempotency.
 */
export const tokensCssMigration_2026_05_29_typographyScaleAdditions: TokensCssMigration = {
  id: '2026-05-29-typography-scale-additions',
  kind: 'additive',
  description: 'Add --letter-spacing-* and --ease-out-quart scales',
  apply(css) {
    let out = css;

    out = ensureScale(out, {
      sectionComment: 'Letter spacing',
      anchorPrefixes: ['--letter-spacing-', '--line-height-', '--font-size-', '--font-'],
      entries: [
        { name: '--letter-spacing-tighter', value: '-0.04em' },
        { name: '--letter-spacing-tight', value: '-0.02em' },
        { name: '--letter-spacing-normal', value: '0' },
        { name: '--letter-spacing-wide', value: '0.04em' },
        { name: '--letter-spacing-wider', value: '0.08em' },
      ],
    });

    out = ensureScale(out, {
      sectionComment: 'Easing',
      anchorPrefixes: ['--ease-', '--transition-', '--duration-'],
      entries: [{ name: '--ease-out-quart', value: 'cubic-bezier(0.25, 1, 0.5, 1)' }],
    });

    return out;
  },
};
