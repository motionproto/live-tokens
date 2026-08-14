import type { ManifestMeta, ColorsAndTypeMeta } from './themeTypes';

/**
 * The one Load list. A theme is the whole look, backed by a manifest; a colors
 * and type file is a layer of one, and older installs have those lying around.
 * Both belong in the same window, told apart by a badge rather than by living
 * in separate managers.
 *
 * The nine shipped presets are looks, so their layer files stay out: they are
 * package-owned (`isPackage`) until the user's own copy shadows them, and that
 * copy is exactly the customised file the list must keep reachable.
 */

export type LoadRowKind = 'look' | 'layer';

export interface LoadRow {
  /** `<kind>:<slug>`. Apply materialises a look's theme under the look's own
   *  name, so the two kinds share a slug space and the list needs its own. */
  fileName: string;
  slug: string;
  kind: LoadRowKind;
  name: string;
  updatedAt: string;
  isProtected: boolean;
}

export const loadRowId = (kind: LoadRowKind, slug: string): string => `${kind}:${slug}`;

export function buildLoadRows(looks: ManifestMeta[], layers: ColorsAndTypeMeta[]): LoadRow[] {
  const lookRows: LoadRow[] = looks.map((f) => ({
    fileName: loadRowId('look', f.fileName),
    slug: f.fileName,
    kind: 'look',
    name: f.name,
    updatedAt: f.updatedAt,
    isProtected: f.isProtected,
  }));
  const layerRows: LoadRow[] = layers
    .filter((f) => !f.isPackage)
    .map((f) => ({
      fileName: loadRowId('layer', f.fileName),
      slug: f.fileName,
      kind: 'layer',
      name: f.name,
      updatedAt: f.updatedAt,
      isProtected: false,
    }));
  return [...lookRows, ...layerRows];
}

/**
 * Whether picking this row loads colors and type alone. A layer file holds
 * nothing else, so it ignores the toggle; a look honors it.
 */
export function isColorsOnly(row: LoadRow | null, colorsOnly: boolean): boolean {
  if (row?.kind === 'layer') return true;
  return colorsOnly;
}

/** The toggle reads as on and locked while a layer row is picked. */
export function colorsOnlyIsForced(row: LoadRow | null): boolean {
  return row?.kind === 'layer';
}
