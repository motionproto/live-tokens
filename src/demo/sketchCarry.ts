// The theme and the sketchstyle are two separate picks in the demo, but the
// package holds the sketch layer inside the theme: applying one runs
// `openThemeSketchSettings`, which overwrites the live dials with whatever the new
// theme carries, or turns the effect off for a theme carrying none. A visitor
// who picked Pencil and then tried three themes lost Pencil three times.
//
// So the theme select records the look it is leaving, and each document
// restores it once the apply lands. Each, not just this one: the editor overlay
// is a second instance of the sketch store in an iframe, it hydrates the
// applied theme on its own (over BroadcastChannel, so after `applyTheme`
// resolves here), and it paints the host page as well as its own preview.
// Restoring only in this document would be overwritten by that copy a tick
// later — the record in localStorage is what both of them read.
import { get } from 'svelte/store';
import { hasPersistedSketchState } from '../editor/core/sketch';
import {
  sketchBaseline,
  sketchEnabled,
  sketchSettings,
  selectedSketchStyleId,
} from '../editor/core/sketch/sketchStore';
import { THEME_SKETCH_ID, type SketchStyleSettings } from '../editor/core/sketch/sketchStyles';
import { THEME_APPLIED_EVENT } from '../editor/core/themes/themeDocumentSync';

const CARRY_KEY = 'lt-demo.sketchCarry';

// Long enough for the broadcast to reach the editor frame, short enough that a
// theme opened later from the editor's own Theme panel — where the sketchstyle
// IS the theme's, and loading one means taking it — never reads a record left
// over from the demo.
const CARRY_WINDOW_MS = 4000;

interface Carry {
  token: string;
  at: number;
  enabled: boolean;
  name: string;
  settings: SketchStyleSettings;
  baseline: SketchStyleSettings | null;
}

/** Hold the live sketchstyle across the theme apply that follows. */
export function carrySketch(): void {
  // A browser that has decided nothing has no pick to keep, and letting the
  // theme seed it is the only way a theme's own sketchstyle ever shows.
  if (!hasPersistedSketchState()) return;
  // "Theme" is a pick that means follow the theme, so it follows this one too.
  if (get(selectedSketchStyleId) === THEME_SKETCH_ID) return;
  const record: Carry = {
    token: Math.random().toString(36).slice(2),
    at: Date.now(),
    enabled: get(sketchEnabled),
    name: get(selectedSketchStyleId),
    settings: get(sketchSettings),
    baseline: get(sketchBaseline),
  };
  try {
    localStorage.setItem(CARRY_KEY, JSON.stringify(record));
  } catch {
    // Storage blocked (private mode); the theme's sketchstyle wins, as before.
  }
}

function readCarry(): Carry | null {
  try {
    const raw = localStorage.getItem(CARRY_KEY);
    if (!raw) return null;
    const record = JSON.parse(raw) as Carry;
    return Date.now() - record.at < CARRY_WINDOW_MS ? record : null;
  } catch {
    return null;
  }
}

export function installSketchCarry(): void {
  let handled = '';
  document.addEventListener(THEME_APPLIED_EVENT, () => {
    const record = readCarry();
    if (!record || record.token === handled) return;
    handled = record.token;
    // `themeSketchSettings` stays as the apply left it: what the open theme
    // holds is what makes the restored style read as off the theme, and what
    // fills the picker's Unsaved row.
    selectedSketchStyleId.set(record.name);
    sketchBaseline.set(record.baseline);
    sketchSettings.set(record.settings);
    // Last: every write above repaints, and this is the one that decides
    // whether anything is painted at all.
    sketchEnabled.set(record.enabled);
  });
}
