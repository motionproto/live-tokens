import { derived, get, writable, type Readable } from 'svelte/store';
import { SHIPPED_SKETCH_SETTINGS, hydrateSketchSettings, type SketchStyleSettings } from './sketchStyles';

/** Where a style came from, which is what decides the affordances on offer.
    `shipped` is served by the package: it has a file, but not one in this
    project, so there is nothing here to save over or delete until the editor
    writes a copy. `file` lives in this project's data tree, so the editor can
    save over it and delete it. `registered` was handed to `bootLiveTokens`, so
    it is real on a built site but owns no file the editor could touch. */
export type SketchStyleSource = 'shipped' | 'file' | 'registered';

export interface SketchStyle {
  /** What `setSketch` takes. A saved sketchstyle's file slug is its id, so a
      style picked in dev keeps working once the site is built. */
  id: string;
  label: string;
  blurb: string;
  settings: SketchStyleSettings;
  source: SketchStyleSource;
}

export interface RegisterSketchStyleInput {
  id: string;
  label: string;
  blurb?: string;
  settings: unknown;
  /** Only `replaceRegisteredSketchStyles` sets this. A listing carries the package's
      own sketchstyles as well as the project's, and the two differ in what the
      editor may do to them, so the row's origin has to survive the trip. */
  source?: SketchStyleSource;
}

const SHIPPED: ReadonlyMap<string, SketchStyle> = new Map(
  Object.entries(SHIPPED_SKETCH_SETTINGS).map(([id, settings]) => [
    id,
    { id, label: settings.label, blurb: settings.blurb, settings, source: 'shipped' as const },
  ]),
);

/** Seeded with the shipped styles, then written by `registerSketchStyle`. A Map
    because re-setting an existing key keeps its position, so a project's own
    `pencil` lands where the shipped Pencil sat rather than at the end of the
    grid. */
const styles = writable(new Map(SHIPPED));

/**
 * Every sketchstyle on offer: the shipped styles, plus whatever this project
 * registered over and beside them. A store rather than a constant, because
 * registration happens after this module is imported.
 *
 * A picker adds its own "None" row, since off is a state of the effect rather
 * than one of the styles. A theme's own style is not here either; `unsavedSketchStyle`
 * carries that one row.
 */
export const sketchStyles: Readable<SketchStyle[]> = derived(styles, (m) => [...m.values()]);

export function sketchStyleById(id: string): SketchStyle | undefined {
  return get(styles).get(id);
}

function put(m: Map<string, SketchStyle>, style: RegisterSketchStyleInput, source: SketchStyleSource) {
  // Hydrated on the way in: a consumer hands over raw JSON it imported, so this
  // is the only place a style stored under a retired dial name gets carried
  // forward, the same job `seedSketchFromTheme` does for a theme.
  const settings = hydrateSketchSettings(style.settings);
  return m.set(style.id, {
    id: style.id,
    label: style.label,
    blurb: style.blurb ?? settings.blurb ?? '',
    settings,
    source,
  });
}

export function registerSketchStyle(style: RegisterSketchStyleInput): void {
  styles.update((m) => put(new Map(m), style, 'registered'));
}

/** Ids the last file listing claimed. The sweep below removes these and nothing
    else, so a style handed to `bootLiveTokens` survives the editor opening. */
let fromFiles: string[] = [];

/** The editor re-lists its files after every save and delete, so a file removed
    on disk has to leave the pool too. A file that had shadowed a shipped style
    hands the id back on its way out. */
export function replaceRegisteredSketchStyles(next: RegisterSketchStyleInput[]): void {
  styles.update((m) => {
    const out = new Map(m);
    for (const id of fromFiles) {
      const shipped = SHIPPED.get(id);
      if (shipped) out.set(id, shipped);
      else out.delete(id);
    }
    for (const style of next) put(out, style, style.source ?? 'file');
    return out;
  });
  fromFiles = next.map((l) => l.id);
}
