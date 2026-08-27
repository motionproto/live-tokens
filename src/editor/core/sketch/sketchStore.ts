import { derived, get, writable } from 'svelte/store';
import {
  SKETCH_PRESETS,
  DEFAULT_SKETCH_PRESET,
  hydrateSketchSettings,
  type SketchSettings,
} from './sketchPresets';
import { applySketchLayer, hostRoot, removeSketchLayer, setSketchScope } from './sketchLayer';
import { liveMovedSinceBake } from '../productionPulse';
import {
  deleteSketchPreset,
  listSketchPresets,
  loadSketchPreset,
  saveSketchPreset,
  slugifySketchPreset,
  type SketchPresetMeta,
} from './sketchPresetService';

const ENABLED_KEY = 'lt.sketchEnabled';
const SETTINGS_KEY = 'lt.sketchSettings';
const PRESET_KEY = 'lt.sketchPreset';
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

export function hasPersistedSketchState(): boolean {
  return sketchTouched;
}

/** Called from every control a user can act on: a dial, a preset pick, the
    on/off switch. Never from `openThemeSketch` or the storage-sync `adopt`
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

function readSettings(): SketchSettings {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (raw) return hydrateSketchSettings(JSON.parse(raw));
  } catch {
    // fall through to the default preset
  }
  return { ...SKETCH_PRESETS[DEFAULT_SKETCH_PRESET] };
}

function readBaseline(): SketchSettings | null {
  try {
    const raw = localStorage.getItem(BASELINE_KEY);
    if (raw) return hydrateSketchSettings(JSON.parse(raw));
  } catch {
    // fall through
  }
  return null;
}

/** Marks a saved preset in `sketchPreset`, so a user file named `pencil` and
    the shipped `pencil` stay distinguishable in one string. */
export const USER_PRESET_PREFIX = 'user:';

function readPresetName(): string {
  try {
    const name = localStorage.getItem(PRESET_KEY);
    if (name === '' || (name && (name in SKETCH_PRESETS || name.startsWith(USER_PRESET_PREFIX)))) {
      return name;
    }
  } catch {
    // fall through
  }
  return DEFAULT_SKETCH_PRESET;
}

/** Off by default: the effect is a draft look, never something a project
    inherits without asking for it. */
export const sketchEnabled = writable<boolean>(readEnabled());
export const sketchSettings = writable<SketchSettings>(readSettings());
/** The preset the dials started from. It survives dial moves, so the grid keeps
    showing what the current look is closest to; empty only when nothing was
    picked, or the picked file was deleted. */
export const sketchPreset = writable<string>(readPresetName());

/** The settings as the selected preset defined them. Kept beside the live
    settings so "modified" is derived by comparison rather than tracked as a
    flag: dial a value back to where it started and the tab stops claiming a
    change, with no bookkeeping to get wrong. */
export const sketchBaseline = writable<SketchSettings | null>(readBaseline());

/** Dial-set fields only. `label` and `blurb` name the preset rather than
    describe the look, and no dial writes them. */
function sameLook(a: SketchSettings, b: SketchSettings): boolean {
  return (Object.keys(a) as (keyof SketchSettings)[])
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
export function liveSketch(): SketchSettings | undefined {
  return get(sketchEnabled) ? { ...get(sketchSettings) } : undefined;
}

/** The Sketch tab's on/off switch goes through here rather than a bare
    `sketchEnabled.set`, so flipping it by hand marks this browser as having
    made a sketch decision the same as any other control does. */
export function setSketchEnabled(enabled: boolean): void {
  markSketchTouched();
  sketchEnabled.set(enabled);
}

/** What the open theme holds, so "unsaved" is a comparison rather than a
    flag (RJC 5). Set by every path that opens or saves a theme. */
export const themeSketch = writable<SketchSettings | undefined>(undefined);

/** Open a theme's sketch layer: the dials, the on/off state, and the preset
    label recovered by comparison (RJC 3). Overwrites the live buffer, which
    is what opening a theme means everywhere else (RJC 6). Never writes a
    `user:` name here: a saved preset is a file this look may not have come
    from, and the only thing that can name one is picking it. */
export function openThemeSketch(sketch: SketchSettings | undefined): void {
  themeSketch.set(sketch);
  if (!sketch) {
    sketchEnabled.set(false);
    sketchBaseline.set(null);
    sketchPreset.set('');
    return;
  }
  const matched = (Object.keys(SKETCH_PRESETS) as string[]).find((name) => sameLook(SKETCH_PRESETS[name], sketch));
  sketchSettings.set({ ...sketch });
  sketchBaseline.set({ ...sketch });
  sketchPreset.set(matched ?? '');
  sketchEnabled.set(true);
}

/** The live sketch differs from what the open theme carries. Presence is
    half the comparison: on with dials the theme does not hold, or off while
    the theme holds a layer, are both off the theme. */
export const sketchOffLook = derived(
  [sketchEnabled, sketchSettings, themeSketch],
  ([enabled, settings, saved]) => {
    const live = enabled ? settings : undefined;
    if (!live && !saved) return false;
    if (!live || !saved) return true;
    return !sameLook(live, saved);
  },
);

export function selectSketchPreset(name: string): void {
  const preset = SKETCH_PRESETS[name];
  if (!preset) return;
  markSketchTouched();
  sketchPreset.set(name);
  sketchBaseline.set({ ...preset });
  sketchSettings.set({ ...preset });
}

/** Saved presets, listed from the data tree. Empty until `refreshUserPresets`
    runs, so importing this module never reaches for the network. */
export const userSketchPresets = writable<SketchPresetMeta[]>([]);

export async function refreshUserPresets(): Promise<void> {
  userSketchPresets.set(await listSketchPresets());
}

export async function selectUserSketchPreset(fileName: string): Promise<void> {
  const file = await loadSketchPreset(fileName);
  markSketchTouched();
  sketchPreset.set(USER_PRESET_PREFIX + fileName);
  sketchBaseline.set({ ...file.settings });
  sketchSettings.set(file.settings);
}

/** Writes whatever the dials currently say to a named file and selects it, so
    saving leaves the tab pointing at the thing that was just saved rather than
    back on "Adjusted from a preset". Returns the file name it allocated. */
export async function saveCurrentAsSketchPreset(name: string): Promise<string> {
  const trimmed = name.trim();
  if (!trimmed) throw new Error('A preset needs a name');
  const fileName = slugifySketchPreset(trimmed);
  if (!fileName) throw new Error('That name has no letters or digits to make a file name from');
  markSketchTouched();
  const settings = { ...get(sketchSettings), label: trimmed };
  await saveSketchPreset(fileName, trimmed, settings);
  await refreshUserPresets();
  sketchSettings.set(settings);
  sketchBaseline.set({ ...settings });
  sketchPreset.set(USER_PRESET_PREFIX + fileName);
  return fileName;
}

export async function deleteUserSketchPreset(fileName: string): Promise<void> {
  await deleteSketchPreset(fileName);
  await refreshUserPresets();
  // The dials keep their values; only the label stops naming a file that exists.
  if (get(sketchPreset) === USER_PRESET_PREFIX + fileName) {
    sketchPreset.set('');
    sketchBaseline.set(null);
  }
}

/** Every dial goes through here. The selection deliberately survives: the grid
    keeps naming the preset this look came from, and `sketchDirty` reports the
    drift. Save writes a new preset rather than overwriting the base. */
export function updateSketchSettings(patch: Partial<SketchSettings>): void {
  markSketchTouched();
  liveMovedSinceBake.set(true);
  sketchSettings.update((s) => ({ ...s, ...patch }));
}

function persist(key: string, value: string): void {
  try {
    localStorage.setItem(key, value);
  } catch {
    // Private-mode storage denial is not worth surfacing for a draft look.
  }
}

/** The root the effect paints in this document, or null while this document is
    showing an editor surface. Registered by LiveTokensRouter: a consumer can
    relocate the editor routes, so the router is the only thing that knows
    whether what is on screen is a page or the editor's own chrome. Null until
    it says so, which is what keeps the editor from flashing the effect over
    itself between import and first render. */
let pageRoot: HTMLElement | null = null;

let installed = false;

function render(enabled: boolean, settings: SketchSettings): void {
  if (typeof document === 'undefined') return;
  if (!enabled) {
    if (installed) removeSketchLayer();
    installed = false;
    return;
  }
  applySketchLayer(settings);
  installed = true;
  // The editor's own chrome must never pick the effect up. Two roots qualify:
  // the host page behind the overlay iframe, and this document while it is
  // showing a page. The preview container scopes itself.
  setSketchScope(hostRoot(), settings);
  setSketchScope(pageRoot, settings);
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
  // Skips its own first call: a subscribe fires immediately with the value
  // the store already held, which is a page load, not a change, and must not
  // read as one past the last bake.
  let sketchEnabledHydrated = false;
  sketchEnabled.subscribe((enabled) => {
    share(ENABLED_KEY, String(enabled));
    render(enabled, get(sketchSettings));
    if (sketchEnabledHydrated) liveMovedSinceBake.set(true);
    sketchEnabledHydrated = true;
  });

  sketchSettings.subscribe((settings) => {
    share(SETTINGS_KEY, JSON.stringify(settings));
    render(get(sketchEnabled), settings);
  });

  sketchPreset.subscribe((name) => share(PRESET_KEY, name));
  sketchBaseline.subscribe((b) => share(BASELINE_KEY, b ? JSON.stringify(b) : ''));

  /* The overlay editor runs in an iframe, so the Sketch tab and a control on
     the page are separate instances of this module. localStorage is the ground
     they share: each adopts a value only when it differs from what it holds,
     and records what it adopted so it never sends that value back. */
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
    } else if (event.key === PRESET_KEY) {
      const next = readPresetName();
      adopt(PRESET_KEY, next);
      if (next !== get(sketchPreset)) sketchPreset.set(next);
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
