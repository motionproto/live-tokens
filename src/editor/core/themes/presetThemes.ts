/**
 * The colors-and-type layers the package ships under the nine example looks.
 *
 * Each one is also a whole look in `manifests/`, and the Theme panel offers
 * looks. Listing the same nine again inside the Colors & Type part would put
 * one preset in two places, so that list hides them. `GET /themes` answers a
 * merged local + package list with no origin marker, and the server is out of
 * scope for this change, so the slug set is the signal available here;
 * `presetThemes.test.ts` gates it against `package.json`'s shipped files.
 */
export const PRESET_THEME_FILE_NAMES: readonly string[] = [
  'autumn',
  'halloween',
  'leprechaun',
  'midnight-study',
  'ocean',
  'royal-velvet',
  'spring-meadow',
  'sunset',
  'yuletide',
];

const PRESET_SLUGS = new Set(PRESET_THEME_FILE_NAMES);

/**
 * The layer files the Colors & Type list shows: everything the user made, plus
 * the active file whatever its name. Applying a look materialises its theme
 * under the look's slug, so `themes/ocean.json` can be both a preset name and
 * the file the editor is working on; hiding the active row would leave the list
 * with nothing marked Active.
 */
export function layerThemesForList<T extends { fileName: string }>(
  files: T[],
  activeFileName: string,
): T[] {
  return files.filter((f) => !PRESET_SLUGS.has(f.fileName) || f.fileName === activeFileName);
}
