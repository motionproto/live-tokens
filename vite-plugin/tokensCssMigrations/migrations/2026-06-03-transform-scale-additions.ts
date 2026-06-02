import type { TokensCssMigration } from '../types';
import { ensureScale } from '../cssTokenOps';

/**
 * tokens-css migration (2026-06-03): add the `--scale-*` transform-multiplier
 * scale that the Image component's zoom-on-hover started referencing.
 *
 * A consumer's vendored `tokens.css` predating this scale resolves
 * `--image-zoom-scale: var(--scale-sm)` to nothing, so the picker shows a blank
 * slot and the effect can't apply. This inserts the full canonical scale (not
 * just the referenced step) so the editor's picker offers every option.
 */
export const tokensCssMigration_2026_06_03_transformScaleAdditions: TokensCssMigration = {
  id: '2026-06-03-transform-scale-additions',
  description: 'Add the --scale-{sm..2xl} transform-multiplier scale',
  apply(css) {
    return ensureScale(css, {
      sectionComment: 'Transform-scale multipliers (e.g. hover zoom). 5% per step.',
      anchorPrefixes: ['--blur-', '--shadow-', '--radius-'],
      entries: [
        { name: '--scale-sm', value: '1.05' },
        { name: '--scale-md', value: '1.1' },
        { name: '--scale-lg', value: '1.15' },
        { name: '--scale-xl', value: '1.2' },
        { name: '--scale-2xl', value: '1.25' },
      ],
    });
  },
};
