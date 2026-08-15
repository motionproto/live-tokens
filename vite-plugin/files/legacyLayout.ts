/**
 * The pre-0.48 directory layout, and the two renames that carry it forward.
 *
 * Through 0.47.1 `data/themes/` held the colors-and-type files and
 * `data/manifests/` held the whole-look files. 0.48 gave both names new
 * meanings: `data/colors-and-type/` for the inner layer, `data/themes/` for the
 * documents. A tree that still carries the old layout therefore reads as a
 * themes directory full of files that are not themes, and every writer aimed at
 * it would destroy a saved palette. Boot detects that tree and touches nothing;
 * `live-tokens migrate` renames the directories and then heals what is inside.
 */
import fs from 'fs';
import path from 'path';
import { isColorsAndTypeShaped } from '../themes/normalizeTheme';

export interface LegacyLayoutInput {
  dataDir: string;
  colorsAndTypeDir: string;
  themesDir: string;
}

export interface LegacyLayout {
  /** `<dataDir>/manifests`: the pre-0.48 whole-look directory. */
  manifestsDir: string;
  /** What identified the tree, for the boot warning and the migrate plan. */
  evidence: string;
}

export interface LegacyRename {
  from: string;
  to: string;
}

function jsonFiles(dir: string): string[] {
  if (!fs.existsSync(dir)) return [];
  try {
    return fs
      .readdirSync(dir)
      .filter((f) => f.endsWith('.json'))
      .map((f) => path.join(dir, f));
  } catch {
    return [];
  }
}

/**
 * `null` for every tree on the current layout, including a pristine one.
 *
 * A healed tree can hold an empty `colors-and-type/` directory, because
 * `default` resolves from the installed package and nothing writes a local
 * copy, so emptiness counts as absence here. What settles it is the evidence:
 * a `manifests/` directory, or a themes directory holding colors-and-type
 * files.
 */
export function detectLegacyLayout(input: LegacyLayoutInput): LegacyLayout | null {
  if (jsonFiles(input.colorsAndTypeDir).length > 0) return null;

  const manifestsDir = path.join(input.dataDir, 'manifests');
  if (jsonFiles(manifestsDir).length > 0) {
    return { manifestsDir, evidence: `${manifestsDir} holds the pre-0.48 whole-look files` };
  }

  for (const file of jsonFiles(input.themesDir)) {
    if (path.basename(file).startsWith('_')) continue;
    let raw: unknown;
    try {
      raw = JSON.parse(fs.readFileSync(file, 'utf-8'));
    } catch {
      continue;
    }
    if (isColorsAndTypeShaped(raw)) {
      return { manifestsDir, evidence: `${file} is a colors-and-type file, not a theme` };
    }
  }

  return null;
}

/**
 * Old directory → new directory, in the order they must run: the themes
 * directory has to vacate its name before the manifests directory can take it.
 *
 * Throws when the resolved directories are not the package defaults. The
 * mapping is positional, and only the default layout says where the old
 * whole-look directory sits: a consumer who moved either one has to move both
 * by hand.
 */
export function planLegacyRenames(
  layout: LegacyLayout,
  input: LegacyLayoutInput,
): LegacyRename[] {
  const defaultColorsAndType = path.join(input.dataDir, 'colors-and-type');
  const defaultThemes = path.join(input.dataDir, 'themes');
  if (
    path.resolve(input.colorsAndTypeDir) !== path.resolve(defaultColorsAndType) ||
    path.resolve(input.themesDir) !== path.resolve(defaultThemes)
  ) {
    throw new Error(
      `This project uses the pre-0.48 data layout (${layout.evidence}), and its data ` +
        `directories are configured to custom paths (colorsAndTypeDir=${input.colorsAndTypeDir}, ` +
        `themesDir=${input.themesDir}). The migration cannot tell which directory holds what. ` +
        `Move the old colors-and-type directory to ${input.colorsAndTypeDir} and the old ` +
        `whole-look directory to ${input.themesDir} by hand, then run the migration again.`,
    );
  }

  const renames: LegacyRename[] = [];
  if (fs.existsSync(input.themesDir)) {
    renames.push({ from: input.themesDir, to: input.colorsAndTypeDir });
  }
  if (fs.existsSync(layout.manifestsDir)) {
    renames.push({ from: layout.manifestsDir, to: input.themesDir });
  }
  return renames;
}

/** Refuses rather than merges: a destination holding files means the tree is
 *  part way through something, and only the person who started it knows what. */
export function applyLegacyRenames(renames: LegacyRename[]): void {
  for (const { from, to } of renames) {
    if (fs.existsSync(to)) {
      const contents = fs.readdirSync(to);
      if (contents.length > 0) {
        throw new Error(
          `Cannot move ${from} to ${to}: ${to} already exists and holds ${contents.length} ` +
            `file(s). Move or delete it, then run the migration again.`,
        );
      }
      fs.rmdirSync(to);
    }
    fs.mkdirSync(path.dirname(to), { recursive: true });
    fs.renameSync(from, to);
  }
}
