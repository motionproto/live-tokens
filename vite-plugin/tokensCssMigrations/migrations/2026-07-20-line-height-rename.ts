import type { TokensCssMigration } from '../types';
import { ensureScale, removeToken, renameToken } from '../cssTokenOps';

/**
 * tokens-css migration (2026-07-20): reshape the line-height scale from size
 * vocabulary (`xs..xl`) to leading vocabulary (`none/tightest/tighter/tight/
 * normal/relaxed`), joining letter-spacing's naming-by-effect convention.
 *
 * The rename maps each old ratio to its name in the final scale: 1→none,
 * 1.25→tighter, 1.5→normal, 1.75→relaxed. The old `xl` (2) has no slot in the
 * final scale, so it is dropped rather than renamed. `ensureScale` then backfills
 * the full leading scale (adding `tightest` 1.1 and `tight` 1.35), so a consumer
 * that never had `xs..xl` (or a fresh install) still ends up with every step.
 * Idempotent by presence: a second run finds the old names gone and the new ones
 * present, and changes nothing.
 *
 * `breaking` because token names are public API — it never auto-applies and
 * rides an explicit `live-tokens migrate` during an upgrade. A consumer still
 * carrying the pre-`xs..xl` *named* scale (whose `tight`/`normal` overlap the
 * new vocabulary) keeps those existing values: `renameToken` no-ops on a name
 * collision rather than reassigning, and `ensureScale` skips names already present.
 */
const RENAMES: ReadonlyArray<readonly [oldName: string, newName: string]> = [
  ['--line-height-xs', '--line-height-none'],
  ['--line-height-sm', '--line-height-tighter'],
  ['--line-height-md', '--line-height-normal'],
  ['--line-height-lg', '--line-height-relaxed'],
];

const SCALE = [
  { name: '--line-height-none', value: '1' },
  { name: '--line-height-tightest', value: '1.1' },
  { name: '--line-height-tighter', value: '1.25' },
  { name: '--line-height-tight', value: '1.35' },
  { name: '--line-height-normal', value: '1.5' },
  { name: '--line-height-relaxed', value: '1.75' },
];

export const tokensCssMigration_2026_07_20_lineHeightRename: TokensCssMigration = {
  id: '2026-07-20-line-height-rename',
  kind: 'breaking',
  description:
    'Reshape --line-height-{xs..xl} to leading vocabulary (none/tightest/tighter/tight/normal/relaxed); retire the 2.0 slot',
  apply(css) {
    let out = css;
    for (const [oldName, newName] of RENAMES) out = renameToken(out, oldName, newName);
    out = removeToken(out, '--line-height-xl');
    out = ensureScale(out, {
      anchorPrefixes: ['--line-height-', '--font-size-', '--font-weight-', '--font-'],
      entries: SCALE,
    });
    return out;
  },
};
