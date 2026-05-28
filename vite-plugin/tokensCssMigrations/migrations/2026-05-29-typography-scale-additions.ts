import type { TokensCssMigration } from '../types';
import { ensureScale } from '../cssTokenOps';

/**
 * tokens-css migration (2026-05-29): add the typography + motion scales that
 * components started referencing once the divider/type system moved to the
 * t-shirt line-height scale.
 *
 * Earlier `tokens.css` files carried a named line-height scale
 * (`tight/snug/normal/relaxed/loose`) and no letter-spacing or easing scale.
 * 0.16.x components reference `--line-height-{xs,sm,md}`,
 * `--letter-spacing-{normal,wide}`, and `--ease-out-quart`; without them those
 * `var()`s resolve to nothing and the editor shows blank/`—` slots.
 *
 * This adds the full canonical scales (not just the referenced steps) so the
 * editor's pickers offer every option. Values are the package defaults; a
 * consumer can retune them afterwards. The legacy named line-height scale is
 * left in place — other component tokens may still reference it, so removing it
 * is a separate, opt-in concern.
 */
export const tokensCssMigration_2026_05_29_typographyScaleAdditions: TokensCssMigration = {
  id: '2026-05-29-typography-scale-additions',
  description: 'Add --line-height-{xs..xl}, --letter-spacing-* and --ease-out-quart scales',
  apply(css) {
    let out = css;

    out = ensureScale(out, {
      sectionComment: 'Line height (t-shirt scale)',
      anchorPrefixes: ['--line-height-', '--font-size-', '--font-weight-', '--font-'],
      entries: [
        { name: '--line-height-xs', value: '1' },
        { name: '--line-height-sm', value: '1.25' },
        { name: '--line-height-md', value: '1.5' },
        { name: '--line-height-lg', value: '1.75' },
        { name: '--line-height-xl', value: '2' },
      ],
    });

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
