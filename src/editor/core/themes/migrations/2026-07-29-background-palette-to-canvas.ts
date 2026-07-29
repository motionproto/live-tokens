/**
 * Palette family "Background" → "Canvas".
 *
 * The family's CSS namespace was always `canvas` (`--color-canvas-*`,
 * `--surface-canvas-*`), and every other surface that names it — the token
 * selector, SectionDivider's variant families, the shadows backdrop picker —
 * said Canvas too. Only the palette label said Background, so the label joins
 * the namespace rather than the other way round. No token names change.
 *
 * The label doubles as a storage key in two places, so this renames both: the
 * `editorConfigs` map key and any `harmonyAxes` family binding. It has to run
 * before `sanitizeHarmonyAxes`, which drops families outside `HARMONY_ELIGIBLE`
 * to `null` and would silently unbind the axis.
 *
 * Lives outside the `runMigrations` framework (whose contract is the flat
 * cssVariables bag) because it transforms structured state, exactly like
 * `renamePrimaryPaletteKey`, which it composes with in `loadFromFile`. Applied
 * unconditionally; idempotent (a `Canvas` key already present wins, so a second
 * run is a no-op) and self-sunsetting once every saved theme has been resaved.
 */

import type { HarmonyAxis } from '../../palettes/colorHarmony';

const OLD = 'Background';
const NEW = 'Canvas';

export function renameBackgroundPaletteKey<T>(editorConfigs: Record<string, T>): Record<string, T> {
  if (!(OLD in editorConfigs)) return editorConfigs;
  const { [OLD]: legacy, ...rest } = editorConfigs;
  // A hand-merged file could carry both; the already-renamed key is the newer intent.
  return NEW in rest ? rest : { ...rest, [NEW]: legacy };
}

export function renameBackgroundHarmonyFamily(axes: unknown): unknown {
  if (!Array.isArray(axes)) return axes;
  return axes.map((axis) =>
    axis && typeof axis === 'object' && (axis as HarmonyAxis).family === OLD
      ? { ...(axis as HarmonyAxis), family: NEW }
      : axis,
  );
}
