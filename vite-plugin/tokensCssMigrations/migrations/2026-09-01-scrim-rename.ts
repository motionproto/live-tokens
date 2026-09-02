import type { TokensCssMigration } from '../types';
import { renameToken } from '../cssTokenOps';

/**
 * tokens-css migration (2026-09-01): `--overlay-*` becomes `--scrim-*`.
 *
 * An overlay is a scrim: a translucent layer that dims what is behind it. The
 * name had drifted to cover surface tints as well (an active tab, a badge on a
 * button), which are the opposite operation, and it collided with `backdrop`,
 * an exported concept about what paints behind an element and which way it
 * leans. Splitting the names lets each mean one thing.
 *
 * `breaking` because token names are public API: it never auto-applies and
 * rides an explicit `live-tokens migrate`. Idempotent by presence, since
 * `renameToken` no-ops once the old name is gone or the new one already exists.
 */
const RENAMES: ReadonlyArray<readonly [oldName: string, newName: string]> = [
  ['--overlay-low', '--scrim-low'],
  ['--overlay-high', '--scrim-high'],
  ['--overlay', '--scrim'],
];

export const tokensCssMigration_2026_09_01_scrimRename: TokensCssMigration = {
  id: '2026-09-01-scrim-rename',
  kind: 'breaking',
  description: 'Rename --overlay-{low,base,high} to --scrim-*; a scrim dims what is behind it',
  apply(css) {
    let out = css;
    for (const [oldName, newName] of RENAMES) out = renameToken(out, oldName, newName);
    return out;
  },
};
