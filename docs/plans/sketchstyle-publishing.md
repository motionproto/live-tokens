# Publish your own sketchstyles

Target: `motionproto/live-tokens`, against 0.66.0.

## The goal

A consumer customizes the sketchstyles and ships them on their site. Today they
cannot. A saved sketchstyle is a dev-server artifact and nothing carries it into
a build:

- `SKETCH_LOOKS` is built from the frozen `SKETCH_STYLES` constant
  (`sketch/index.ts:22`), so a consumer file never appears in it.
- `setSketch` throws for any id outside that constant and `THEME_SKETCH_ID`
  (`sketch/index.ts:96`).
- `sketchStyleService.ts` talks to `/api/sketch-styles`, which only the vite
  plugin serves (`themeFileApi.ts:1200`).

`src/app/SketchSelect.svelte` is the proof. It reaches past the public surface
into `SKETCH_STYLES` and `sketchStore`, lists saved styles off the dev API, and
swallows the failure at line 44. Built, it silently drops every saved row.

Save-in-place is a separate, smaller want: updating a saved sketchstyle
currently runs through the naming form. It falls out of this work rather than
leading it.

## The shape

One pool. A look is a look, whatever put it there. The shipped seven seed a
registry; a consumer registers more; the editor registers the files it lists.
Ids are one namespace, so a file named `pencil` replaces the shipped Pencil in
that project, which is what customizing the presets means.

We own every consumer and we are pre-1.0, so the compatible-but-awkward version
of this is not worth building. `USER_STYLE_PREFIX` goes, `SKETCH_LOOKS` becomes
a store, and nothing ships a migration.

## 1. `src/editor/core/sketch/sketchRegistry.ts` (new)

Sits between `sketchStyles.ts` (pure data) and `sketchStore.ts`, so no cycle.

```ts
import { writable, derived, get, type Readable } from 'svelte/store';
import { SKETCH_STYLES, hydrateSketchStyle, type SketchStyle } from './sketchStyles';

export interface SketchLook {
  id: string;
  label: string;
  blurb: string;
  settings: SketchStyle;
  /** `shipped` until something registers over it. The editor shows its delete
      affordance on the rest, and Save-in-place is offered for them only. */
  source: 'shipped' | 'registered';
}

export interface RegisterInput {
  id: string;
  label: string;
  blurb?: string;
  settings: unknown;
}

const SHIPPED = new Map<string, SketchLook>(
  Object.entries(SKETCH_STYLES).map(([id, s]) => [
    id,
    { id, label: s.label, blurb: s.blurb, settings: s, source: 'shipped' as const },
  ]),
);

/** Seeded with the seven, then written by `registerSketchLook`. A Map because
    re-setting an existing key keeps its position, so a consumer's `pencil`
    lands where the shipped Pencil sat rather than at the end of the grid. */
const looks = writable(new Map(SHIPPED));

export const sketchLooks: Readable<SketchLook[]> = derived(looks, (m) => [...m.values()]);

export function lookById(id: string): SketchLook | undefined {
  return get(looks).get(id);
}

/** Settings are hydrated on the way in. A consumer hands over raw JSON it
    imported, so this is the only place a look stored under a retired dial name
    gets carried forward, the same job `seedSketchFromTheme` does for a theme. */
export function registerSketchLook(look: RegisterInput): void {
  const settings = hydrateSketchStyle(look.settings);
  looks.update((m) =>
    new Map(m).set(look.id, {
      id: look.id,
      label: look.label,
      blurb: look.blurb ?? settings.blurb ?? '',
      settings,
      source: 'registered',
    }),
  );
}

/** The editor re-lists its files on every save and delete, so a file removed on
    disk has to leave the pool too. Shipped looks are never swept, and one
    overridden by a file returns to its shipped settings when that file goes. */
export function replaceRegisteredLooks(next: RegisterInput[]): void {
  looks.set(new Map(SHIPPED));
  for (const look of next) registerSketchLook(look);
}
```

## 2. `src/editor/core/sketch/sketchStore.ts`

- `selectSketchStyle(id)` resolves through `lookById` instead of
  `SKETCH_STYLES`. It keeps its silent no-op for an id nothing knows.
- `selectSavedSketchStyle` and `USER_STYLE_PREFIX` go. A file's slug is its id,
  so selecting a file is `selectSketchStyle(fileName)` like any other look.
- `refreshSavedSketchStyles` loads each file it lists and hands the set to
  `replaceRegisteredLooks`, so listing and registering are one gesture. The
  editor's grid and a built site's picker then read the same store.
- `openThemeSketchStyle`'s `matched` search runs over `get(sketchLooks)` rather
  than `SKETCH_STYLES`, so a theme carrying a registered look reports that
  look's name instead of falling back to `THEME_SKETCH_ID`.
- `readStyleName` stops validating. Registration happens after this module is
  imported, so an id it has never heard of is the normal case, not a fault.
  Keep only the `null` branch, which is a browser that has stored nothing:

```ts
function readStyleName(): string {
  try {
    const name = localStorage.getItem(STYLE_NAME_KEY);
    // A stored `user:` id predates the single namespace. Browser state on
    // machines we own, so it is stripped on read rather than migrated; delete
    // this line a release after it ships.
    if (name !== null) return name.startsWith('user:') ? name.slice(5) : name;
  } catch {
    // fall through
  }
  return DEFAULT_SKETCH_STYLE;
}
```

An id naming nothing leaves the grid with no row checked while the dials keep
their values. That is self-correcting on the next pick, and no worse than
today's fallback, which already pairs a name with settings it does not match.

Themes need no migration at all: `captureLook` stores `sketchStyle` by value
(`themeService.ts:162`), never by id.

## 3. `src/editor/core/sketch/index.ts` and `bootstrap.ts`

Re-export `registerSketchLook`, `sketchLooks` and the `SketchLook` type. Drop
`SKETCH_LOOKS`; `sketchLooks` replaces it, and a picker already subscribes to
`themeSketchLook` so a store is the shape it expects.

`setSketch` resolves against the registry and keeps its throw for an unknown id.

`bootLiveTokens` takes the looks the way it already takes components, which is
the project's rule for registration:

```ts
export interface BootLiveTokensOptions {
  components?: RegisterComponentEntry[];
  /** Registered in dev AND in a build. This is the route a customized preset
      takes to a published site, so it must not sit behind the DEV guard that
      `components` sits behind. */
  sketchLooks?: RegisterInput[];
}
```

Register them before the `import.meta.env.DEV` block, so the pool is populated
by the time `initializeTheme` recovers a name against it.

## 4. `src/editor/ui/sketch/SketchTab.svelte`

One grid over `$sketchLooks`, replacing the shipped band and the saved band. The
delete affordance renders for `source === 'registered'`, so the ✕ is what marks
a row as yours and no new label is needed. `.saved-item` markup and CSS carry
over; the second `.presets` block and the prefix wiring go.

Save-in-place is now expressible without a string test:

```ts
let selected = $derived($sketchLooks.find((l) => l.id === $sketchStyleName));
let canSaveInPlace = $derived(selected?.source === 'registered' && $sketchDirty);
```

with a Save pill beside Save as sketchstyle…, calling a new store function:

```ts
/** The file name comes from the selection, never from re-slugifying the label:
    a file hand-edited to a new display name would otherwise be saved beside
    itself under a fresh slug instead of over itself. */
export async function saveSelectedSketchStyle(): Promise<void> {
  const look = lookById(get(sketchStyleName));
  if (look?.source !== 'registered') throw new Error('No saved sketchstyle is selected');
  const settings = { ...get(sketchSettings) };
  await saveSketchStyle(look.id, look.label, settings);
  await refreshSavedSketchStyles();
  sketchBaseline.set(settings);
}
```

It passes `look.label` rather than `settings.label`, so a file hand-edited so
its display name and its inner label disagree keeps the name the grid shows.

Save As takes `fa-plus` and starts its form empty. With Save present the two
gestures stop overlapping: Save replaces, Save As creates.

## 5. `src/app/SketchSelect.svelte`

Rewrite against the public surface only: `$sketchLooks`, `$themeSketchLook`,
`setSketch`. Every internal import goes, the `refreshSavedSketchStyles` call
goes, and the empty catch that hid the failure goes with it. This is the
acceptance test for the whole plan, since it is the picker a built site runs.

## 6. Template, docs, changelog

`template/src/main.ts` picks the looks up with one glob, so a new project
publishes what it saves without thinking about it:

```ts
const looks = import.meta.glob('./live-tokens/data/sketch-styles/*.json', { eager: true });

bootLiveTokens(App, '#app', {
  sketchLooks: Object.entries(looks).map(([path, mod]) => ({
    id: path.split('/').pop()!.replace('.json', ''),
    label: (mod as any).default.name,
    settings: (mod as any).default.settings,
  })),
});
```

`src/editor/docs/content/sketch-mode.md`: replace the `SKETCH_LOOKS` paragraph
under "Shipping the layer" with the glob, and say in "The sketchstyles" that a
saved sketchstyle named after a shipped one replaces it. Run `npm run
sync:docs` after.

`CHANGELOG.md`: minor bump, breaking within pre-1.0. `SKETCH_LOOKS` is now the
`sketchLooks` store, `USER_STYLE_PREFIX` and `selectSavedSketchStyle` are gone,
`bootLiveTokens` takes `sketchLooks`, and a saved sketchstyle now reaches a
built site. Note the `user:` strip and that it is temporary.

## Verification

Unit (`sketchStore.test.ts`, `index.test.ts`, both already mock the service):

- A registered look is selectable by `setSketch`, and one registered over a
  shipped id replaces it in place rather than appending.
- `saveSelectedSketchStyle` throws for a shipped selection and re-baselines for
  a registered one.
- `readStyleName` strips a stored `user:` prefix.

Manual, in a dev consumer:

1. Save As a sketchstyle. It appears in the one grid with a ✕. Save is disabled.
2. Move a dial. Save enables. Press it. The readout returns to the saved blurb
   and the file keeps its original `createdAt`.
3. Pick a shipped preset. Save disables and its title says why.
4. Save one named `Pencil`. One Pencil row remains, in the shipped position,
   carrying your dials.
5. `npm run build && npm run preview`. The SketchSelect dropdown lists the saved
   sketchstyle and picking it draws the page. This is the thing that does not
   work today.

Restore the data tree afterward per CLAUDE.md, and delete the sketchstyle files
the run created.
