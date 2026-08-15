import type { ThemeMeta, ColorsAndTypeMeta } from './themeTypes';

/**
 * The one Load list. A theme is the whole look; a colors and type file is a
 * preset holding that half of one. Both belong in the same window, told apart
 * by a badge rather than by living in separate managers.
 *
 * The shipped presets are themes, so their colors-and-type files stay out: they
 * are package-owned (`isPackage`) until the user's own copy shadows them, and
 * that copy is exactly the file the list must keep reachable.
 */

export type LoadRowKind = 'look' | 'layer';

export interface LoadRow {
  /** `<kind>:<slug>`. The two kinds are separate resources with separate name
   *  spaces, so a row needs an id that says which one it came from. */
  fileName: string;
  slug: string;
  kind: LoadRowKind;
  name: string;
  updatedAt: string;
  isProtected: boolean;
}

export const loadRowId = (kind: LoadRowKind, slug: string): string => `${kind}:${slug}`;

export function buildLoadRows(looks: ThemeMeta[], layers: ColorsAndTypeMeta[]): LoadRow[] {
  const lookRows: LoadRow[] = looks
    .map((f): LoadRow => ({
      fileName: loadRowId('look', f.fileName),
      slug: f.fileName,
      kind: 'look',
      name: f.name,
      updatedAt: f.updatedAt,
      isProtected: f.isProtected,
    }))
    .sort((a, b) => Number(b.isProtected) - Number(a.isProtected));
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
