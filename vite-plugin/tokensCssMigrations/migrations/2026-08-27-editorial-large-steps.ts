import type { TokensCssMigration } from '../types';
import { ensureScale } from '../cssTokenOps';

/**
 * tokens-css migration (2026-08-27): extend the editorial role upward.
 *
 * The role shipped as a pair (`md`, `sm`), which left a lede, a standfirst or a
 * pull quote with nowhere to go but a heading style — the display face, at
 * heading leading. `--editorial-lg-*` and `--editorial-xl-*` are the two steps
 * above the reading size, set in the same editorial face.
 *
 * Leading follows the role's own rule: `md` is the reading step and takes the
 * most open leading, and every step away from it tightens by one. Sizes stay
 * inside the xs–xl band the responsive scale leaves constant, so an article
 * does not resize itself between breakpoints.
 *
 * `additive` — it inserts two new bundles and touches nothing already declared,
 * so the dev plugin can auto-apply it.
 */
const BUNDLE = [
  { name: '--editorial-xl-font-family', value: 'var(--font-editorial)' },
  { name: '--editorial-xl-font-size', value: 'var(--font-size-xl)' },
  { name: '--editorial-xl-font-weight', value: 'var(--font-weight-normal)' },
  { name: '--editorial-xl-line-height', value: 'var(--line-height-tighter)' },
  { name: '--editorial-xl-letter-spacing', value: 'var(--letter-spacing-normal)' },
  { name: '--editorial-lg-font-family', value: 'var(--font-editorial)' },
  { name: '--editorial-lg-font-size', value: 'var(--font-size-lg)' },
  { name: '--editorial-lg-font-weight', value: 'var(--font-weight-normal)' },
  { name: '--editorial-lg-line-height', value: 'var(--line-height-tight)' },
  { name: '--editorial-lg-letter-spacing', value: 'var(--letter-spacing-normal)' },
];

export const tokensCssMigration_2026_08_27_editorialLargeSteps: TokensCssMigration = {
  id: '2026-08-27-editorial-large-steps',
  kind: 'additive',
  description: 'Add the --editorial-lg-* and --editorial-xl-* steps above the reading size',
  apply(css) {
    return ensureScale(css, {
      sectionComment: 'Editorial — the steps above the reading size',
      anchorPrefixes: [
        '--editorial-',
        '--eyebrow-',
        '--code-',
        '--body-',
        '--heading-',
        '--letter-spacing-',
        '--line-height-',
        '--font-weight-',
        '--font-size-',
        '--font-',
      ],
      entries: BUNDLE,
    });
  },
};
