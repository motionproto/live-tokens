import type { TokensCssMigration } from '../types';
import { ensureScale, renameToken } from '../cssTokenOps';

/**
 * tokens-css migration (2026-07-20): rename the line-height scale from size
 * vocabulary (`xs..xl`) to leading vocabulary (`none/tighter/tight/normal/
 * loose/looser`), joining letter-spacing's naming-by-effect convention, and add
 * the missing 1.1 step.
 *
 * This migration owns the whole line-height scale. `renameToken` rewrites the
 * declaration and every `var()` reference for a consumer still on `xs..xl`;
 * `ensureScale` then backfills the full leading scale, so a consumer that never
 * had `xs..xl` (or a fresh install) still ends up with every step. Idempotent by
 * presence: a second run finds the old names gone and the new ones present, and
 * changes nothing.
 *
 * `breaking` because token names are public API — it never auto-applies and
 * rides an explicit `live-tokens migrate` during an upgrade. A consumer still
 * carrying the pre-`xs..xl` *named* scale (whose `tight`/`normal`/`loose`
 * overlap the new vocabulary) keeps those existing values: `renameToken`
 * no-ops on a name collision rather than reassigning.
 */
const RENAMES: ReadonlyArray<readonly [oldName: string, newName: string]> = [
  ['--line-height-xs', '--line-height-none'],
  ['--line-height-sm', '--line-height-tight'],
  ['--line-height-md', '--line-height-normal'],
  ['--line-height-lg', '--line-height-loose'],
  ['--line-height-xl', '--line-height-looser'],
];

const SCALE = [
  { name: '--line-height-none', value: '1' },
  { name: '--line-height-tighter', value: '1.1' },
  { name: '--line-height-tight', value: '1.25' },
  { name: '--line-height-normal', value: '1.5' },
  { name: '--line-height-loose', value: '1.75' },
  { name: '--line-height-looser', value: '2' },
];

export const tokensCssMigration_2026_07_20_lineHeightRename: TokensCssMigration = {
  id: '2026-07-20-line-height-rename',
  kind: 'breaking',
  description:
    'Rename --line-height-{xs..xl} to leading vocabulary (none/tighter/tight/normal/loose/looser)',
  apply(css) {
    let out = css;
    for (const [oldName, newName] of RENAMES) out = renameToken(out, oldName, newName);
    out = ensureScale(out, {
      anchorPrefixes: ['--line-height-', '--font-size-', '--font-weight-', '--font-'],
      entries: SCALE,
    });
    return out;
  },
};
