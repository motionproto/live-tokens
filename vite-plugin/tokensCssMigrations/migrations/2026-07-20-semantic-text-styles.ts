import type { TokensCssMigration } from '../types';
import { ensureScale } from '../cssTokenOps';

/**
 * tokens-css migration (2026-07-20): add the eight v1 semantic text-style
 * bundles (`--heading-{xl,lg,md,sm}-*`, `--body-{md,sm}-*`, `--code-*`,
 * `--eyebrow-*`) — a role layer of aliases over the type primitives.
 *
 * `additive`: it only introduces new names, so it auto-applies to a consumer's
 * vendored tokens.css. Values mirror the package defaults; a consumer retunes
 * them afterwards (they are ordinary aliases into the existing scales).
 *
 * Headings pin `tightest` (1.1) / `tighter` (1.25) leading at every viewport, so
 * there are no responsive re-points to append — the bundle `ensureScale` is the
 * whole migration.
 */
const BUNDLE = [
  { name: '--heading-xl-font-family', value: 'var(--font-display)' },
  { name: '--heading-xl-font-size', value: 'var(--font-size-4xl)' },
  { name: '--heading-xl-font-weight', value: 'var(--font-weight-semibold)' },
  { name: '--heading-xl-line-height', value: 'var(--line-height-tightest)' },
  { name: '--heading-xl-letter-spacing', value: 'var(--letter-spacing-normal)' },

  { name: '--heading-lg-font-family', value: 'var(--font-display)' },
  { name: '--heading-lg-font-size', value: 'var(--font-size-2xl)' },
  { name: '--heading-lg-font-weight', value: 'var(--font-weight-semibold)' },
  { name: '--heading-lg-line-height', value: 'var(--line-height-tightest)' },
  { name: '--heading-lg-letter-spacing', value: 'var(--letter-spacing-normal)' },

  { name: '--heading-md-font-family', value: 'var(--font-display)' },
  { name: '--heading-md-font-size', value: 'var(--font-size-xl)' },
  { name: '--heading-md-font-weight', value: 'var(--font-weight-semibold)' },
  { name: '--heading-md-line-height', value: 'var(--line-height-tighter)' },
  { name: '--heading-md-letter-spacing', value: 'var(--letter-spacing-normal)' },

  { name: '--heading-sm-font-family', value: 'var(--font-sans)' },
  { name: '--heading-sm-font-size', value: 'var(--font-size-lg)' },
  { name: '--heading-sm-font-weight', value: 'var(--font-weight-semibold)' },
  { name: '--heading-sm-line-height', value: 'var(--line-height-tighter)' },
  { name: '--heading-sm-letter-spacing', value: 'var(--letter-spacing-normal)' },

  { name: '--body-md-font-family', value: 'var(--font-sans)' },
  { name: '--body-md-font-size', value: 'var(--font-size-md)' },
  { name: '--body-md-font-weight', value: 'var(--font-weight-normal)' },
  { name: '--body-md-line-height', value: 'var(--line-height-normal)' },
  { name: '--body-md-letter-spacing', value: 'var(--letter-spacing-normal)' },

  { name: '--body-sm-font-family', value: 'var(--font-sans)' },
  { name: '--body-sm-font-size', value: 'var(--font-size-sm)' },
  { name: '--body-sm-font-weight', value: 'var(--font-weight-normal)' },
  { name: '--body-sm-line-height', value: 'var(--line-height-tight)' },
  { name: '--body-sm-letter-spacing', value: 'var(--letter-spacing-normal)' },

  { name: '--code-font-family', value: 'var(--font-mono)' },
  { name: '--code-font-size', value: 'var(--font-size-sm)' },
  { name: '--code-font-weight', value: 'var(--font-weight-normal)' },
  { name: '--code-line-height', value: 'var(--line-height-normal)' },
  { name: '--code-letter-spacing', value: 'var(--letter-spacing-normal)' },

  { name: '--eyebrow-font-family', value: 'var(--font-sans)' },
  { name: '--eyebrow-font-size', value: 'var(--font-size-sm)' },
  { name: '--eyebrow-font-weight', value: 'var(--font-weight-normal)' },
  { name: '--eyebrow-line-height', value: 'var(--line-height-normal)' },
  { name: '--eyebrow-letter-spacing', value: 'var(--letter-spacing-normal)' },
  { name: '--eyebrow-text-transform', value: 'none' },
];

export const tokensCssMigration_2026_07_20_semanticTextStyles: TokensCssMigration = {
  id: '2026-07-20-semantic-text-styles',
  kind: 'additive',
  description: 'Add the semantic text-style bundles (--heading-*/--body-*/--code-*/--eyebrow-*)',
  apply(css) {
    return ensureScale(css, {
      sectionComment: 'Text styles — semantic typography roles',
      anchorPrefixes: [
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
