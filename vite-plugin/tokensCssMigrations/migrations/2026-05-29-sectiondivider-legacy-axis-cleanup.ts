import type { TokensCssMigration } from '../types';
import { removeTokensMatching } from '../cssTokenOps';

/**
 * tokens-css migration (2026-05-29): remove SectionDivider tokens left behind
 * by earlier axis changes.
 *
 * SectionDivider has been through several restructurings — a color-family axis
 * (`--sectiondivider-{canvas,neutral,alternate,primary,accent,special}-…`) and,
 * before that, a flat pre-variant shape (`--sectiondivider-title-…`,
 * `--sectiondivider-description-…`, `--sectiondivider-padding`). The current
 * component declares only the size-variant axis `--sectiondivider-{lg,md,sm}-…`
 * in its own `:global(:root)`. Any `--sectiondivider-*` left in a consumer's
 * developer-authored `tokens.css` that isn't on the `lg/md/sm` axis is dead
 * weight from a prior generation — nothing references it.
 *
 * Rule: drop every `--sectiondivider-*` whose first segment after the prefix is
 * not `lg`, `md`, or `sm`. This keeps any legitimate variant overrides a
 * consumer may have authored while clearing the retired namespaces. Idempotent:
 * once the legacy tokens are gone, re-running matches nothing.
 */
const KEEP_SEGMENTS = new Set(['lg', 'md', 'sm']);

export const tokensCssMigration_2026_05_29_sectiondividerLegacyAxisCleanup: TokensCssMigration = {
  id: '2026-05-29-sectiondivider-legacy-axis-cleanup',
  description: 'Remove legacy --sectiondivider-* tokens not on the lg/md/sm axis',
  apply(css) {
    return removeTokensMatching(css, (name) => {
      if (!name.startsWith('--sectiondivider-')) return false;
      const segment = name.slice('--sectiondivider-'.length).split('-')[0];
      return !KEEP_SEGMENTS.has(segment);
    });
  },
};
