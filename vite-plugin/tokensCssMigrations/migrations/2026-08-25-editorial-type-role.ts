import type { TokensCssMigration } from '../types';
import { ensureScale } from '../cssTokenOps';

/**
 * tokens-css migration (2026-08-25): add the editorial type role — a fifth font
 * stack (`--font-editorial`) and a ninth text-style bundle (`--editorial-*`).
 *
 * `additive`: it only introduces new names, so it auto-applies to a consumer's
 * vendored tokens.css.
 *
 * Both defaults are indirections rather than literals, which is what makes this
 * safe to auto-apply: `--font-editorial` resolves to `var(--font-sans)` and the
 * bundle mirrors `--body-md-*`, so a consumer who never mentions editorial
 * renders byte-identically to before. Repointing the stack in one place then
 * moves every editorial surface at once.
 */
const STACK = [{ name: '--font-editorial', value: 'var(--font-sans)' }];

const BUNDLE = [
  { name: '--editorial-font-family', value: 'var(--font-editorial)' },
  { name: '--editorial-font-size', value: 'var(--font-size-md)' },
  { name: '--editorial-font-weight', value: 'var(--font-weight-normal)' },
  { name: '--editorial-line-height', value: 'var(--line-height-normal)' },
  { name: '--editorial-letter-spacing', value: 'var(--letter-spacing-normal)' },
];

export const tokensCssMigration_2026_08_25_editorialTypeRole: TokensCssMigration = {
  id: '2026-08-25-editorial-type-role',
  kind: 'additive',
  description: 'Add the editorial type role (--font-editorial and the --editorial-* bundle)',
  apply(css) {
    // The stack anchors among the font families and the bundle among the text
    // styles, so they are two inserts rather than one contiguous block.
    const withStack = ensureScale(css, {
      anchorPrefixes: ['--font-mono', '--font-serif', '--font-sans', '--font-display'],
      entries: STACK,
    });
    return ensureScale(withStack, {
      sectionComment: 'Editorial — the long-reading role, body face until repointed',
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
