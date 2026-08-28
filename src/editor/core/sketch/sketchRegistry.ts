import { derived, get, writable, type Readable } from 'svelte/store';
import { SKETCH_STYLES, hydrateSketchStyle, type SketchStyle } from './sketchStyles';

/** Where a look came from, which is what decides the affordances on offer.
    `shipped` is served by the package: it has a file, but not one in this
    project, so there is nothing here to save over or delete until the editor
    writes a copy. `file` lives in this project's data tree, so the editor can
    save over it and delete it. `registered` was handed to `bootLiveTokens`, so
    it is real on a built site but owns no file the editor could touch. */
export type SketchLookSource = 'shipped' | 'file' | 'registered';

export interface SketchLook {
  /** What `setSketch` takes. A saved sketchstyle's file slug is its id, so a
      look picked in dev keeps working once the site is built. */
  id: string;
  label: string;
  blurb: string;
  settings: SketchStyle;
  source: SketchLookSource;
}

export interface RegisterSketchLookInput {
  id: string;
  label: string;
  blurb?: string;
  settings: unknown;
  /** Only `replaceRegisteredLooks` sets this. A listing carries the package's
      own sketchstyles as well as the project's, and the two differ in what the
      editor may do to them, so the row's origin has to survive the trip. */
  source?: SketchLookSource;
}

const SHIPPED: ReadonlyMap<string, SketchLook> = new Map(
  Object.entries(SKETCH_STYLES).map(([id, style]) => [
    id,
    { id, label: style.label, blurb: style.blurb, settings: style, source: 'shipped' as const },
  ]),
);

/** Seeded with the shipped looks, then written by `registerSketchLook`. A Map
    because re-setting an existing key keeps its position, so a project's own
    `pencil` lands where the shipped Pencil sat rather than at the end of the
    grid. */
const looks = writable(new Map(SHIPPED));

/**
 * Every sketchstyle on offer: the shipped looks, plus whatever this project
 * registered over and beside them. A store rather than a constant, because
 * registration happens after this module is imported.
 *
 * A picker adds its own "None" row, since off is a state of the effect rather
 * than one of the looks. A theme's own look is not here either; `themeSketchLook`
 * carries that one row.
 */
export const sketchLooks: Readable<SketchLook[]> = derived(looks, (m) => [...m.values()]);

export function lookById(id: string): SketchLook | undefined {
  return get(looks).get(id);
}

function put(m: Map<string, SketchLook>, look: RegisterSketchLookInput, source: SketchLookSource) {
  // Hydrated on the way in: a consumer hands over raw JSON it imported, so this
  // is the only place a look stored under a retired dial name gets carried
  // forward, the same job `seedSketchFromTheme` does for a theme.
  const settings = hydrateSketchStyle(look.settings);
  return m.set(look.id, {
    id: look.id,
    label: look.label,
    blurb: look.blurb ?? settings.blurb ?? '',
    settings,
    source,
  });
}

export function registerSketchLook(look: RegisterSketchLookInput): void {
  looks.update((m) => put(new Map(m), look, 'registered'));
}

/** Ids the last file listing claimed. The sweep below removes these and nothing
    else, so a look handed to `bootLiveTokens` survives the editor opening. */
let fromFiles: string[] = [];

/** The editor re-lists its files after every save and delete, so a file removed
    on disk has to leave the pool too. A file that had shadowed a shipped look
    hands the id back on its way out. */
export function replaceRegisteredLooks(next: RegisterSketchLookInput[]): void {
  looks.update((m) => {
    const out = new Map(m);
    for (const id of fromFiles) {
      const shipped = SHIPPED.get(id);
      if (shipped) out.set(id, shipped);
      else out.delete(id);
    }
    for (const look of next) put(out, look, look.source ?? 'file');
    return out;
  });
  fromFiles = next.map((l) => l.id);
}
