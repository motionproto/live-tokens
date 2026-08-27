import type { TokensCssMigration } from '../types';
import { ensureScale } from '../cssTokenOps';

/**
 * tokens-css migration (2026-08-25): add the editorial type role — a fifth font
 * stack (`--font-editorial`) for the long-reading surfaces that should not carry
 * the body face under an expressive display face.
 *
 * `additive`: it only introduces new names, so it auto-applies to a consumer's
 * vendored tokens.css.
 *
 * The default is an indirection rather than a literal, which is what makes this
 * safe to auto-apply: `--font-editorial` resolves to `var(--font-sans)`, so a
 * consumer who never mentions editorial renders byte-identically to before.
 * Repointing the stack in one place then moves every editorial surface at once.
 *
 * The `--editorial-*` text-style bundle this migration originally seeded is now
 * owned end-to-end by 2026-08-27-editorial-size-steps and is deliberately not
 * added here: an additive migration must not re-add names a later breaking
 * rename removes, or re-running the fold loses idempotency.
 */
const STACK = [{ name: '--font-editorial', value: 'var(--font-sans)' }];

export const tokensCssMigration_2026_08_25_editorialTypeRole: TokensCssMigration = {
  id: '2026-08-25-editorial-type-role',
  kind: 'additive',
  description: 'Add the editorial type role (--font-editorial)',
  apply(css) {
    return ensureScale(css, {
      anchorPrefixes: ['--font-mono', '--font-serif', '--font-sans', '--font-display'],
      entries: STACK,
    });
  },
};
