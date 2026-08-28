import { derived, get, writable } from 'svelte/store';
import {
  SKETCH_STYLES,
  DEFAULT_SKETCH_STYLE,
  THEME_SKETCH_ID,
  hydrateSketchStyle,
  type SketchStyle,
} from './sketchStyles';
import { lookById, replaceRegisteredLooks, sketchLooks } from './sketchRegistry';
import {
  applySketchLayer,
  hostRoot,
  removeSketchLayer,
  setSketchScope,
  sketchLayerInstalled,
} from './sketchLayer';
import { liveMovedSinceBake } from '../productionPulse';
import {
  deleteSketchStyle,
  listSketchStyles,
  loadSketchStyle,
  saveSketchStyle,
  slugifySketchStyle,
  type SketchStyleMeta,
} from './sketchStyleService';

const ENABLED_KEY = 'lt.sketchEnabled';
const SETTINGS_KEY = 'lt.sketchSettings';
const STYLE_NAME_KEY = 'lt.sketchStyleName';
const BASELINE_KEY = 'lt.sketchBaseline';
/** Set only by a genuine user decision (`markSketchTouched`), never by the
    `subscribe` write-back below. That write-back plants the four keys above
    on every boot regardless of whether a dial was ever moved, so deriving
    "touched" from their presence would answer "yes" from the second load
    onward — this key is the thing that actually distinguishes the two. */
const TOUCHED_KEY = 'lt.sketchTouched';

/** True once this browser has recorded a genuine sketch decision, so boot
    (`themeInit.ts`) can tell "never touched" from "explicitly off" and only
    seed the live buffer from the theme in the first case. Mutated in place
    by `markSketchTouched`; the first read migrates a browser that already
    held real dial state before this key existed (RJC 7) so it starts
    touched, not one this module is about to seed for the first time. */
let sketchTouched = (() => {
  try {
    const recorded = localStorage.getItem(TOUCHED_KEY);
    if (recorded !== null) return recorded === 'true';
    const priorUse = localStorage.getItem(ENABLED_KEY) !== null || localStorage.getItem(SETTINGS_KEY) !== null;
    localStorage.setItem(TOUCHED_KEY, String(priorUse));
    return priorUse;
  } catch {
    return false;
  }
})();

/** Reads `TOUCHED_KEY` fresh rather than the cached `sketchTouched`, because a
    peer document's write lands in localStorage between this module's import
    and a caller's await (`themeInit.ts`'s boot reconcile is exactly that
    gap): the cache would still answer as it did at import time. */
export function hasPersistedSketchState(): boolean {
  try {
    return localStorage.getItem(TOUCHED_KEY) === 'true';
  } catch {
    return false;
  }
}

/** Called from every control a user can act on: a dial, a sketchstyle pick, the
    on/off switch. Never from `openThemeSketchStyle` or the storage-sync `adopt`
    path, both of which write the same four keys as a side effect of state
    this browser did not decide on its own. */
function markSketchTouched(): void {
  if (sketchTouched) return;
  sketchTouched = true;
  persist(TOUCHED_KEY, 'true');
}

function readEnabled(): boolean {
  try {
    return localStorage.getItem(ENABLED_KEY) === 'true';
  } catch {
    return false;
  }
}

function readSettings(): SketchStyle {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (raw) return hydrateSketchStyle(JSON.parse(raw));
  } catch {
    // fall through to the default sketchstyle
  }
  return { ...SKETCH_STYLES[DEFAULT_SKETCH_STYLE] };
}

function readBaseline(): SketchStyle | null {
  try {
    const raw = localStorage.getItem(BASELINE_KEY);
    if (raw) return hydrateSketchStyle(JSON.parse(raw));
  } catch {
    // fall through
  }
  return null;
}

/** Retired. Saved sketchstyles and shipped ones share one id namespace now, so
    a file named `pencil` replaces the shipped Pencil rather than sitting beside
    it. Stripped on read below; delete a release after that ships. */
const RETIRED_USER_PREFIX = 'user:';

/** Deliberately unvalidated. Looks are registered after this module is
    imported, so an id it has never heard of is the normal case rather than a
    fault: `selectSketchStyle` no-ops on one, and `sketchPick` already reports
    a look nothing names as `adjusted`. Only a browser that has stored nothing
    falls back. */
function readStyleName(): string {
  try {
    const name = localStorage.getItem(STYLE_NAME_KEY);
    if (name !== null) {
      return name.startsWith(RETIRED_USER_PREFIX) ? name.slice(RETIRED_USER_PREFIX.length) : name;
    }
  } catch {
    // fall through
  }
  return DEFAULT_SKETCH_STYLE;
}

/** Off by default: the effect paints nothing until the open theme's own
    sketchstyle, or a decision this browser already recorded, says otherwise. */
export const sketchEnabled = writable<boolean>(readEnabled());
export const sketchSettings = writable<SketchStyle>(readSettings());
/** The sketchstyle the dials started from. It survives dial moves, so the grid
    keeps showing what the current look is closest to. Any id in the pool, or
    `THEME_SKETCH_ID` for the look the open theme carries; empty only when
    nothing was picked, or the picked file was deleted. */
export const sketchStyleName = writable<string>(readStyleName());

/** The settings as the selected sketchstyle defined them. Kept beside the live
    settings so "modified" is derived by comparison rather than tracked as a
    flag: dial a value back to where it started and the tab stops claiming a
    change, with no bookkeeping to get wrong. */
export const sketchBaseline = writable<SketchStyle | null>(readBaseline());

/** Dial-set fields only. `label` and `blurb` name the sketchstyle rather than
    describe the look, and no dial writes them. */
export function sameLook(a: SketchStyle, b: SketchStyle): boolean {
  return (Object.keys(a) as (keyof SketchStyle)[])
    .filter((k) => k !== 'label' && k !== 'blurb')
    .every((k) => a[k] === b[k]);
}

export const sketchDirty = derived(
  [sketchSettings, sketchBaseline],
  ([settings, baseline]) => baseline !== null && !sameLook(settings, baseline),
);

export const sketchBlurb = derived(sketchSettings, (s) => s.blurb);

/** The live look as a theme would carry it: the dials when the effect is
    on, nothing when it is off (RJC 1). A copy, not the store's own object,
    so a caller holding onto the result can never observe a later dial move
    through it. */
export function liveSketchStyle(): SketchStyle | undefined {
  return get(sketchEnabled) ? { ...get(sketchSettings) } : undefined;
}

/** The Sketchstyle view's on/off switch goes through here rather than a bare
    `sketchEnabled.set`, so flipping it by hand marks this browser as having
    made a sketch decision the same as any other control does. */
export function setSketchEnabled(enabled: boolean): void {
  markSketchTouched();
  if (enabled !== get(sketchEnabled)) liveMovedSinceBake.set(true);
  sketchEnabled.set(enabled);
}

/** What the open theme holds, so "unsaved" is a comparison rather than a
    flag (RJC 5). Set by every path that opens or saves a theme. */
export const themeSketchStyle = writable<SketchStyle | undefined>(undefined);

/** Open a theme's sketchstyle: the dials, the on/off state, and the name
    recovered by comparison (RJC 3). Overwrites the live buffer, which
    is what opening a theme means everywhere else (RJC 6). The name is recovered
    over the whole pool, so a theme carrying a look a saved file also holds is
    named by that file rather than falling back to `THEME_SKETCH_ID`. */
export function openThemeSketchStyle(sketchStyle: SketchStyle | undefined): void {
  themeSketchStyle.set(sketchStyle);
  if (!sketchStyle) {
    sketchEnabled.set(false);
    sketchBaseline.set(null);
    sketchStyleName.set('');
    return;
  }
  const matched = get(sketchLooks).find((look) => sameLook(look.settings, sketchStyle))?.id;
  sketchSettings.set({ ...sketchStyle });
  sketchBaseline.set({ ...sketchStyle });
  sketchStyleName.set(matched ?? THEME_SKETCH_ID);
  sketchEnabled.set(true);
}

/**
 * Take the sketchstyle a theme carries as this browser's own, unless this
 * browser has already decided for itself.
 *
 * The rule boot has always followed in dev, and the only one a built site has:
 * a visitor who picked a look, or picked None, keeps it, and `themeSketchStyle`
 * still learns what the theme holds so the panel can call the difference
 * unsaved. Both branches set it, so a picker can offer the theme's look as a
 * row either way.
 *
 * Takes the raw field rather than a `SketchStyle`, and hydrates it here: a
 * built site reads its theme JSON straight off disk with no dev server to run
 * `normalizeTheme` over it first, so this is the only place a look stored under
 * a retired dial name gets carried forward. Anything that is not an object is
 * the absent case, which is off (invariant 3).
 */
export function seedSketchFromTheme(sketchStyle: unknown): void {
  const style =
    typeof sketchStyle === 'object' && sketchStyle !== null && !Array.isArray(sketchStyle)
      ? hydrateSketchStyle(sketchStyle)
      : undefined;
  if (hasPersistedSketchState()) {
    themeSketchStyle.set(style);
    return;
  }
  openThemeSketchStyle(style);
}

/** Go back to the look the theme carries, after picking something else. The
    theme's is the one look a picker can offer that this module did not ship, so
    it needs a door of its own beside `selectSketchStyle`; `setSketch` gives the
    two the same face. Silent when the theme carries none, the way
    `selectSketchStyle` is for a name it does not know. */
export function selectThemeSketchStyle(): void {
  const style = get(themeSketchStyle);
  if (!style) return;
  markSketchTouched();
  if (get(sketchEnabled)) liveMovedSinceBake.set(true);
  sketchStyleName.set(THEME_SKETCH_ID);
  sketchBaseline.set({ ...style });
  sketchSettings.set({ ...style });
}

/** The live sketch differs from what the open theme carries. Presence is
    half the comparison: on with dials the theme does not hold, or off while
    the theme holds a layer, are both off the theme. */
export const sketchOffLook = derived(
  [sketchEnabled, sketchSettings, themeSketchStyle],
  ([enabled, settings, saved]) => {
    const live = enabled ? settings : undefined;
    if (!live && !saved) return false;
    if (!live || !saved) return true;
    return !sameLook(live, saved);
  },
);

/** Takes any id in the pool: shipped, or registered from a file or a consumer.
    Silent for an id nothing knows, the way it has always been for an unknown
    shipped name. */
export function selectSketchStyle(id: string): void {
  const look = lookById(id);
  if (!look) return;
  markSketchTouched();
  if (get(sketchEnabled)) liveMovedSinceBake.set(true);
  sketchStyleName.set(id);
  sketchBaseline.set({ ...look.settings });
  sketchSettings.set({ ...look.settings });
}

/** Saved sketchstyles, listed from the data tree. Empty until
    `refreshSavedSketchStyles` runs, so importing this module never reaches for
    the network. */
export const savedSketchStyles = writable<SketchStyleMeta[]>([]);

/** Lists the files and registers them in one gesture, so the editor's grid and
    a built site's picker read the same pool. Loading every file to list them is
    affordable: a sketchstyle is a few dozen numbers, and the alternative is a
    grid that cannot paint a row until it is picked. */
export async function refreshSavedSketchStyles(): Promise<void> {
  const files = await listSketchStyles();
  const loaded = await Promise.all(files.map((f) => loadSketchStyle(f.fileName)));
  savedSketchStyles.set(files);
  replaceRegisteredLooks(
    files.map((file, i) => ({
      id: file.fileName,
      label: file.name || file.fileName,
      settings: loaded[i].settings,
    })),
  );
}

/** Writes whatever the dials currently say to a named file and selects it, so
    saving leaves the tab pointing at the thing that was just saved rather than
    back on "Adjusted from a sketchstyle". Returns the file name it allocated. */
export async function saveCurrentSketchStyle(name: string): Promise<string> {
  const trimmed = name.trim();
  if (!trimmed) throw new Error('A sketchstyle needs a name');
  const fileName = slugifySketchStyle(trimmed);
  if (!fileName) throw new Error('That name has no letters or digits to make a file name from');
  markSketchTouched();
  const settings = { ...get(sketchSettings), label: trimmed };
  await saveSketchStyle(fileName, trimmed, settings);
  await refreshSavedSketchStyles();
  sketchSettings.set(settings);
  sketchBaseline.set({ ...settings });
  sketchStyleName.set(fileName);
  return fileName;
}

/** Overwrite the selected saved sketchstyle. The file name comes from the
    selection rather than from re-slugifying the label, because the two can
    disagree: a file hand-edited to a new display name would otherwise be saved
    beside itself under a fresh slug instead of over itself. The label comes
    from the look for the same reason, so the name the grid shows survives.

    No `markSketchTouched`: the button only lights once a dial has moved, and
    every dial goes through `updateSketchSettings`, which marks it. */
export async function saveSelectedSketchStyle(): Promise<void> {
  const look = lookById(get(sketchStyleName));
  if (look?.source !== 'file') throw new Error('No saved sketchstyle is selected');
  const settings = { ...get(sketchSettings) };
  await saveSketchStyle(look.id, look.label, settings);
  await refreshSavedSketchStyles();
  // Re-baselining is what disables the button again and returns the readout
  // from "Modified from X" to the saved blurb.
  sketchBaseline.set(settings);
}

export async function deleteSavedSketchStyle(fileName: string): Promise<void> {
  await deleteSketchStyle(fileName);
  await refreshSavedSketchStyles();
  // The dials keep their values; only the name stops naming a file that exists.
  if (get(sketchStyleName) === fileName) {
    sketchStyleName.set('');
    sketchBaseline.set(null);
  }
}

/** Every dial goes through here. The selection deliberately survives: the grid
    keeps naming the sketchstyle this look came from, and `sketchDirty` reports
    the drift. Save writes a new sketchstyle rather than overwriting the base. */
export function updateSketchSettings(patch: Partial<SketchStyle>): void {
  markSketchTouched();
  if (get(sketchEnabled)) liveMovedSinceBake.set(true);
  sketchSettings.update((s) => ({ ...s, ...patch }));
}

function persist(key: string, value: string): void {
  try {
    localStorage.setItem(key, value);
  } catch {
    // Private-mode storage denial is not worth surfacing for one browser's dials.
  }
}

/** The root the effect paints in this document, or null while this document is
    showing an editor surface. Registered by LiveTokensRouter: a consumer can
    relocate the editor routes, so the router is the only thing that knows
    whether what is on screen is a page or the editor's own chrome. Null until
    it says so, which is what keeps the editor from flashing the effect over
    itself between import and first render. */
let pageRoot: HTMLElement | null = null;

function render(enabled: boolean, settings: SketchStyle): void {
  if (typeof document === 'undefined') return;
  if (!enabled) {
    if (sketchLayerInstalled()) removeSketchLayer();
    return;
  }
  applySketchLayer(settings);
  // The editor's own chrome must never pick the effect up. Two roots qualify:
  // the host page behind the overlay iframe, and this document while it is
  // showing a page. The preview container scopes itself.
  setSketchScope(hostRoot(), settings);
  setSketchScope(pageRoot, settings);
}

/** Paint one look on the two roots `render` owns, and on nothing else.

    `render(false, ...)` reaches further: it clears every `[data-sketch]` in
    the document. The scopes it takes with it belong to `$effect`s that paint
    from the live stores, which a preview deliberately never ticks, so those
    never come back. Previewing a theme carrying no sketchstyle left the
    Sketchstyle view's own stage crisp for good, Cancel included. */
function paintPreviewRoots(style: SketchStyle | undefined): void {
  if (typeof document === 'undefined') return;
  if (style) applySketchLayer(style);
  setSketchScope(hostRoot(), style ?? null);
  setSketchScope(pageRoot, style ?? null);
}

/** Paint a sketchstyle for the Theme Picker preview, bypassing the live
    buffer entirely: going through `sketchSettings`/`sketchEnabled` would
    `share()` the previewed dials into localStorage and overwrite whatever
    the user had live, which is right for Apply (RJC 6) but would destroy
    unsaved work the moment the picker opened a row. The paint reaches the
    host page across the iframe boundary the same way Apply's does; only the
    store write and the persistence are skipped. Pass `undefined` for a theme
    that carries no sketchstyle. */
export function previewSketchStyle(style: SketchStyle | undefined): void {
  paintPreviewRoots(style);
}

/** Undo a sketchstyle preview by repainting the live buffer, which the
    preview never touched. Re-deriving from the current stores rather than a
    scraped snapshot means it can't drift from what they actually hold by the
    time the picker closes. */
export function revertSketchStylePreview(): void {
  if (get(sketchEnabled)) {
    paintPreviewRoots(get(sketchSettings));
    return;
  }
  // The one case with nodes to take down: a sketched preview over a crisp live
  // state injected the sheet. `render`'s sweep is safe here because every
  // component scope answers to `sketchEnabled`, which is false.
  render(false, get(sketchSettings));
}

export function setSketchPageRoot(el: HTMLElement | null): void {
  if (el === pageRoot) return;
  setSketchScope(pageRoot, null);
  pageRoot = el;
  render(get(sketchEnabled), get(sketchSettings));
}

/**
 * What this document last exchanged with the other one, per key: written by
 * `share`, recorded by `adopt`.
 *
 * A document must never write back a value it adopted. Comparing against its
 * own store is not enough, because the echo is not identical, it is LATE: a
 * drag sends a value every frame, the far side adopts the first and writes it
 * back, and by then this side is three frames along. It reads the echo, sees a
 * value it does not hold, and adopts its own past — the handle jumps back under
 * the cursor and the drag cannot move.
 */
const shared = new Map<string, string>();

function share(key: string, value: string): void {
  if (shared.get(key) === value) return;
  shared.set(key, value);
  persist(key, value);
}

function adopt(key: string, value: string): void {
  shared.set(key, value);
}

if (typeof document !== 'undefined') {
  sketchEnabled.subscribe((enabled) => {
    share(ENABLED_KEY, String(enabled));
    render(enabled, get(sketchSettings));
  });

  sketchSettings.subscribe((settings) => {
    share(SETTINGS_KEY, JSON.stringify(settings));
    render(get(sketchEnabled), settings);
  });

  sketchStyleName.subscribe((name) => share(STYLE_NAME_KEY, name));
  sketchBaseline.subscribe((b) => share(BASELINE_KEY, b ? JSON.stringify(b) : ''));

  /* The overlay editor runs in an iframe, so the Sketchstyle view and a
     control on the page are separate instances of this module. localStorage
     is the ground they share: each adopts a value only when it differs from
     what it holds, and records what it adopted so it never sends that value
     back. */
  window.addEventListener('storage', (event) => {
    if (event.storageArea !== localStorage) return;
    if (event.key === ENABLED_KEY) {
      const next = event.newValue === 'true';
      adopt(ENABLED_KEY, String(next));
      if (next !== get(sketchEnabled)) sketchEnabled.set(next);
    } else if (event.key === SETTINGS_KEY) {
      if (event.newValue && event.newValue !== JSON.stringify(get(sketchSettings))) {
        const next = readSettings();
        adopt(SETTINGS_KEY, JSON.stringify(next));
        sketchSettings.set(next);
      }
    } else if (event.key === STYLE_NAME_KEY) {
      const next = readStyleName();
      adopt(STYLE_NAME_KEY, next);
      if (next !== get(sketchStyleName)) sketchStyleName.set(next);
    } else if (event.key === BASELINE_KEY) {
      const current = get(sketchBaseline);
      if ((event.newValue || '') !== (current ? JSON.stringify(current) : '')) {
        const next = readBaseline();
        adopt(BASELINE_KEY, next ? JSON.stringify(next) : '');
        sketchBaseline.set(next);
      }
    }
  });
}
