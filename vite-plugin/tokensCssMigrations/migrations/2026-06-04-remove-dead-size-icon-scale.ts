import type { TokensCssMigration } from '../types';
import { removeTokensMatching } from '../cssTokenOps';

/**
 * tokens-css migration (2026-06-04): remove the dead `--size-icon-*` scale.
 *
 * `--size-icon-sm … --size-icon-4xl` was a square-icon-sizing scale that nothing
 * ever consumed — the live icon scale is `--icon-size-*`. The two names are easy
 * to transpose, so the unused one is a footgun. No component or generated sidecar
 * references it, so removal is a no-op for the consumer's runtime; this just
 * clears the dead namespace from a vendored `tokens.css`. Idempotent by presence.
 */
export const tokensCssMigration_2026_06_04_removeDeadSizeIconScale: TokensCssMigration = {
  id: '2026-06-04-remove-dead-size-icon-scale',
  kind: 'breaking',
  description: 'Remove the unused --size-icon-* scale (live scale is --icon-size-*)',
  apply(css) {
    return removeTokensMatching(css, (name) => name.startsWith('--size-icon-'));
  },
};
