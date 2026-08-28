/**
 * The pre-0.48 directory layout, and the two renames that carry it forward.
 *
 * Through 0.47.1 `data/themes/` held the colors-and-type files and
 * `data/manifests/` held the whole-theme files. 0.48 gave both names new
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
  /** The retired `manifestsDir` config key, when the consumer set it. It named
   *  the whole-theme directory through 0.47.1 and names nothing now, so it is
   *  read here alone: to find the directory, and to refuse to guess when it
   *  points somewhere the rename cannot reason about. */
  configuredManifestsDir?: string;
}

export interface LegacyLayout {
  /** `<dataDir>/manifests`: the pre-0.48 whole-theme directory. */
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

function isDirectory(dir: string): boolean {
  try {
    return fs.statSync(dir).isDirectory();
  } catch {
    return false;
  }
}

function parseJsonFile(file: string): unknown {
  try {
    return JSON.parse(fs.readFileSync(file, 'utf-8'));
  } catch {
    return null;
  }
}

/** A theme carries its colors and type under `colorsAndType` (v3) or names it as `theme`
 *  (v1 and v2). One of these in the themes directory says the rename has run. */
function holdsATheme(themesDir: string): boolean {
  return jsonFiles(themesDir).some((file) => {
    if (path.basename(file).startsWith('_')) return false;
    const raw = parseJsonFile(file);
    if (!raw || typeof raw !== 'object') return false;
    return 'colorsAndType' in raw || 'theme' in raw;
  });
}

/**
 * `null` for every tree on the current layout, including a pristine one.
 *
 * Four kinds of evidence, in the order that keeps each from hiding the others:
 *
 * 1. A `manifests/` directory. The rename moves it away, so a healed tree never
 *    has one, empty or not. This runs first: a consumer who moved one file by
 *    hand would otherwise look healed to the check below.
 * 2. Colors-and-type files already in place, which says the rename has run and
 *    ends the search. A healed tree can hold an *empty* `colors-and-type/`
 *    (`default` resolves from the package and nothing writes a local copy), so
 *    emptiness counts as absence.
 * 3. A colors-and-type file in the themes directory.
 * 4. The old layer's pointer files in the themes directory with no theme beside
 *    them and no colors-and-type directory at all. That tree names its colors and type
 *    with a slug the package now ships as a *theme* of the same name, so boot
 *    would bake someone else's theme over the consumer's.
 */
export function detectLegacyLayout(input: LegacyLayoutInput): LegacyLayout | null {
  const manifestsDir = input.configuredManifestsDir ?? path.join(input.dataDir, 'manifests');
  const themesHoldAThemeFile = holdsATheme(input.themesDir);

  if (isDirectory(manifestsDir) && !themesHoldAThemeFile) {
    return { manifestsDir, evidence: `${manifestsDir} is the pre-0.48 whole-theme directory` };
  }

  if (jsonFiles(input.colorsAndTypeDir).length > 0) return null;

  for (const file of jsonFiles(input.themesDir)) {
    if (path.basename(file).startsWith('_')) continue;
    if (isColorsAndTypeShaped(parseJsonFile(file))) {
      return { manifestsDir, evidence: `${file} is a colors-and-type file, not a theme` };
    }
  }

  const pointer = ['_active.json', '_production.json']
    .map((name) => path.join(input.themesDir, name))
    .find((p) => fs.existsSync(p));
  if (pointer && !themesHoldAThemeFile && !fs.existsSync(input.colorsAndTypeDir)) {
    return {
      manifestsDir,
      evidence: `${pointer} points at colors and type, and there is no ${path.basename(input.colorsAndTypeDir)} directory`,
    };
  }

  return null;
}

/**
 * Old directory → new directory, in the order they must run: the themes
 * directory has to vacate its name before the manifests directory can take it.
 *
 * Throws when the resolved directories are not the package defaults. The
 * mapping is positional, and only the default layout says where the old
 * whole-theme directory sits: a consumer who moved either one has to move both
 * by hand.
 */
export function planLegacyRenames(
  layout: LegacyLayout,
  input: LegacyLayoutInput,
): LegacyRename[] {
  const defaultColorsAndType = path.join(input.dataDir, 'colors-and-type');
  const defaultThemes = path.join(input.dataDir, 'themes');
  if (
    input.configuredManifestsDir &&
    path.resolve(input.configuredManifestsDir) !== path.join(input.dataDir, 'manifests')
  ) {
    throw new Error(
      `This project uses the pre-0.48 data layout (${layout.evidence}), and live-tokens.config.json ` +
        `sets the retired "manifestsDir" key to ${input.configuredManifestsDir}. That directory holds ` +
        `the whole themes, which now belong in ${input.themesDir}. Move it there by hand, drop the ` +
        `"manifestsDir" key, then run the migration again.`,
    );
  }
  if (
    path.resolve(input.colorsAndTypeDir) !== path.resolve(defaultColorsAndType) ||
    path.resolve(input.themesDir) !== path.resolve(defaultThemes)
  ) {
    throw new Error(
      `This project uses the pre-0.48 data layout (${layout.evidence}), and its data ` +
        `directories are configured to custom paths (colorsAndTypeDir=${input.colorsAndTypeDir}, ` +
        `themesDir=${input.themesDir}). The migration cannot tell which directory holds what. ` +
        `Move the old colors-and-type directory to ${input.colorsAndTypeDir} and the old ` +
        `whole-theme directory to ${input.themesDir} by hand, then run the migration again.`,
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
