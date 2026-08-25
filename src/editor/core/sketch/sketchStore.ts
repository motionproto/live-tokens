import { derived, get, writable } from 'svelte/store';
import {
  SKETCH_PRESETS,
  DEFAULT_SKETCH_PRESET,
  hydrateSketchSettings,
  type SketchSettings,
} from './sketchPresets';
import { applySketchLayer, hostRoot, removeSketchLayer, setSketchScope } from './sketchLayer';
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
/** Empty once a dial has moved the settings away from any shipped preset. */
export const sketchPreset = writable<string>(readPresetName());

export const sketchBlurb = derived(sketchSettings, (s) => s.blurb);

export function selectSketchPreset(name: string): void {
  const preset = SKETCH_PRESETS[name];
  if (!preset) return;
  sketchPreset.set(name);
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
  sketchPreset.set(USER_PRESET_PREFIX + fileName);
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
  const settings = { ...get(sketchSettings), label: trimmed };
  await saveSketchPreset(fileName, trimmed, settings);
  await refreshUserPresets();
  sketchSettings.set(settings);
  sketchPreset.set(USER_PRESET_PREFIX + fileName);
  return fileName;
}

export async function deleteUserSketchPreset(fileName: string): Promise<void> {
  await deleteSketchPreset(fileName);
  await refreshUserPresets();
  // The dials keep their values; only the label stops naming a file that exists.
  if (get(sketchPreset) === USER_PRESET_PREFIX + fileName) sketchPreset.set('');
}

/** Every dial goes through here so one write both stores the value and drops
    the preset label, which no longer describes what is on screen. */
export function updateSketchSettings(patch: Partial<SketchSettings>): void {
  sketchSettings.update((s) => ({ ...s, ...patch }));
  if (get(sketchPreset) !== '') sketchPreset.set('');
}

function persist(key: string, value: string): void {
  try {
    localStorage.setItem(key, value);
  } catch {
    // Private-mode storage denial is not worth surfacing for a draft look.
  }
}

if (typeof document !== 'undefined') {
  let installed = false;

  const render = (enabled: boolean, settings: SketchSettings) => {
    if (!enabled) {
      if (installed) removeSketchLayer();
      installed = false;
      return;
    }
    applySketchLayer(settings);
    installed = true;
    // The editor's own chrome must never pick the effect up, so only the host
    // page's root becomes a scope here. The preview container scopes itself.
    setSketchScope(hostRoot(), settings);
  };

  sketchEnabled.subscribe((enabled) => {
    persist(ENABLED_KEY, String(enabled));
    render(enabled, get(sketchSettings));
  });

  sketchSettings.subscribe((settings) => {
    persist(SETTINGS_KEY, JSON.stringify(settings));
    render(get(sketchEnabled), settings);
  });

  sketchPreset.subscribe((name) => persist(PRESET_KEY, name));
}
