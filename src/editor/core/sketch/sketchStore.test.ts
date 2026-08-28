// @vitest-environment happy-dom

import { get } from 'svelte/store';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  DEFAULT_SKETCH_STYLE,
  hydrateSketchSettings,
  SHIPPED_SKETCH_SETTINGS,
  THEME_SKETCH_ID,
  type SketchStyleSettings,
} from './sketchStyles';
import { liveMovedSinceBake } from '../productionPulse';
import { registerSketchStyle, sketchStyles } from './sketchRegistry';
import {
  liveSketchSettings,
  openThemeSketchSettings,
  saveCurrentSketchStyle,
  refreshSavedSketchStyles,
  saveSelectedSketchStyle,
  selectSketchStyle,
  setSketchEnabled,
  setSketchPageRoot,
  sketchDirty,
  sketchEnabled,
  sketchOffTheme,
  selectedSketchStyleId,
  sketchSettings,
  themeSketchSettings,
  updateSketchSettings,
} from './sketchStore';

/** `refreshSavedSketchStyles` lists, then loads each file it listed, so a stub
    has to answer both shapes. Returns once the pool holds them. */
/** Returns the file names PUT reached, so a test can pin which file a save
    landed on rather than only that it succeeded. */
async function stubFiles(
  files: { fileName: string; name: string; settings: SketchStyleSettings; isPackage?: boolean }[],
): Promise<string[]> {
  const puts: string[] = [];
  vi.stubGlobal('fetch', async (url: string, init?: RequestInit) => {
    if (init?.method === 'PUT') {
      puts.push(String(url).split('/').pop()!);
      return new Response(null, { status: 200 });
    }
    if (init?.method === 'DELETE') return new Response(null, { status: 200 });
    const match = files.find((f) => String(url).endsWith(`/${f.fileName}`));
    if (match) return new Response(JSON.stringify({ name: match.name, settings: match.settings }), { status: 200 });
    return new Response(JSON.stringify({
      files: files.map((f) => ({
        fileName: f.fileName, name: f.name, updatedAt: '', isPackage: f.isPackage ?? false,
      })),
    }), { status: 200 });
  });
  await refreshSavedSketchStyles();
  return puts;
}

describe('sketchstyle selection', () => {
  beforeEach(() => {
    selectSketchStyle('pencil');
  });

  it('keeps the base selected after a dial moves', () => {
    updateSketchSettings({ strokeWidth: 9 });

    expect(get(selectedSketchStyleId)).toBe('pencil');
    expect(get(sketchSettings).strokeWidth).toBe(9);
  });

  it('reports the drift so the tab can say what the settings came from', () => {
    expect(get(sketchDirty)).toBe(false);
    updateSketchSettings({ strokeWidth: 9 });
    expect(get(sketchDirty)).toBe(true);
  });

  it('stops claiming a change once a dial goes back to where it started', () => {
    const original = get(sketchSettings).strokeWidth;
    updateSketchSettings({ strokeWidth: 9 });
    updateSketchSettings({ strokeWidth: original });

    expect(get(sketchDirty)).toBe(false);
  });

  it('reads clean again after switching to another base', () => {
    updateSketchSettings({ strokeWidth: 9 });
    selectSketchStyle('napkin');

    expect(get(selectedSketchStyleId)).toBe('napkin');
    expect(get(sketchDirty)).toBe(false);
  });
});

describe('openThemeSketchSettings', () => {
  beforeEach(() => {
    selectSketchStyle('pencil');
  });

  it('turns the effect off and empties the sketchstyle selection when the theme carries none', () => {
    openThemeSketchSettings(undefined);

    expect(get(sketchEnabled)).toBe(false);
    expect(get(selectedSketchStyleId)).toBe('');
    expect(get(themeSketchSettings)).toBeUndefined();
  });

  it('turns the effect on and selects the matching shipped sketchstyle by comparison', () => {
    openThemeSketchSettings(SHIPPED_SKETCH_SETTINGS.napkin);

    expect(get(sketchEnabled)).toBe(true);
    expect(get(selectedSketchStyleId)).toBe('napkin');
    expect(get(sketchSettings)).toEqual(SHIPPED_SKETCH_SETTINGS.napkin);
    expect(get(sketchDirty)).toBe(false);
  });

  it('names the theme itself when its dials match none of the shipped set, and still reads clean', () => {
    const custom: SketchStyleSettings = { ...SHIPPED_SKETCH_SETTINGS.napkin, fillTravel: 9.5 };

    openThemeSketchSettings(custom);

    expect(get(selectedSketchStyleId)).toBe(THEME_SKETCH_ID);
    expect(get(sketchDirty)).toBe(false);
  });
});

describe('sketchOffTheme', () => {
  it('is false when both the live state and the theme are absent', () => {
    openThemeSketchSettings(undefined);

    expect(get(sketchOffTheme)).toBe(false);
  });

  it('is false when the live dials match what the theme carries', () => {
    openThemeSketchSettings(SHIPPED_SKETCH_SETTINGS.napkin);

    expect(get(sketchOffTheme)).toBe(false);
  });

  it('is true when the effect is on and the theme carries none', () => {
    openThemeSketchSettings(undefined);
    selectSketchStyle('napkin');
    sketchEnabled.set(true);

    expect(get(sketchOffTheme)).toBe(true);
  });

  it('is true when the effect is off and the theme carries a layer', () => {
    openThemeSketchSettings(SHIPPED_SKETCH_SETTINGS.napkin);
    sketchEnabled.set(false);

    expect(get(sketchOffTheme)).toBe(true);
  });

  it('reads false again once the theme is opened onto the live value', () => {
    openThemeSketchSettings(undefined);
    selectSketchStyle('napkin');
    sketchEnabled.set(true);
    updateSketchSettings({ fillTravel: 9.5 });
    expect(get(sketchOffTheme)).toBe(true);

    openThemeSketchSettings(get(sketchSettings));

    expect(get(sketchOffTheme)).toBe(false);
  });
});

describe('liveSketchSettings', () => {
  it('is undefined while the effect is off', () => {
    selectSketchStyle('pencil');
    sketchEnabled.set(false);

    expect(liveSketchSettings()).toBeUndefined();
  });

  it('is the live dials while the effect is on', () => {
    selectSketchStyle('napkin');
    sketchEnabled.set(true);

    expect(liveSketchSettings()).toEqual(SHIPPED_SKETCH_SETTINGS.napkin);
  });
});

describe('liveMovedSinceBake follows the gesture boundary', () => {
  beforeEach(() => {
    openThemeSketchSettings(undefined);
    liveMovedSinceBake.set(false);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('is set by turning the effect on', () => {
    setSketchEnabled(true);

    expect(get(liveMovedSinceBake)).toBe(true);
  });

  it('is set by a sketchstyle pick while the effect is on', () => {
    setSketchEnabled(true);
    liveMovedSinceBake.set(false);

    selectSketchStyle('napkin');

    expect(get(liveMovedSinceBake)).toBe(true);
  });

  it('is not set by a sketchstyle pick while the effect is off', () => {
    // The dial set and the sketchstyle grid stay interactive with the effect
    // off (browsing is ordinary use), but `liveSketchSettings()` returns undefined
    // while disabled, so nothing done to them then can reach a theme or a bake.
    selectSketchStyle('napkin');

    expect(get(liveMovedSinceBake)).toBe(false);
  });

  it('is not set by a dial move while the effect is off', () => {
    updateSketchSettings({ strokeWidth: 9 });

    expect(get(liveMovedSinceBake)).toBe(false);
  });

  it('is not set by a saved-sketchstyle pick while the effect is off', async () => {
    await stubFiles([{ fileName: 'mine', name: 'Mine', settings: SHIPPED_SKETCH_SETTINGS.napkin }]);

    selectSketchStyle('mine');

    expect(get(selectedSketchStyleId)).toBe('mine');
    expect(get(liveMovedSinceBake)).toBe(false);
  });

  it('is not set by re-enabling an effect that is already on', () => {
    setSketchEnabled(true);
    liveMovedSinceBake.set(false);

    setSketchEnabled(true);

    expect(get(liveMovedSinceBake)).toBe(false);
  });

  it('is not set by opening a theme', () => {
    openThemeSketchSettings(SHIPPED_SKETCH_SETTINGS.napkin);

    expect(get(liveMovedSinceBake)).toBe(false);
  });

  it('is not raised by the storage-echo path adopting a peer document\'s change', () => {
    // A peer document toggling the effect writes ENABLED_KEY and this
    // document adopts it via the `storage` event, never through
    // `setSketchEnabled`. Adopting a peer's choice must not read as this
    // document having moved its own sketchstyle.
    const ENABLED_KEY = 'lt.sketchEnabled';
    localStorage.setItem(ENABLED_KEY, 'true');
    window.dispatchEvent(new StorageEvent('storage', {
      key: ENABLED_KEY, newValue: 'true', storageArea: localStorage,
    }));

    expect(get(sketchEnabled)).toBe(true);
    expect(get(liveMovedSinceBake)).toBe(false);
  });
});

describe('saveCurrentSketchStyle', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  // `saveCurrentSketchStyle` only rewrites `label`, which `sameSketchStyle`
  // defines as outside the sketchstyle. Flagging here would make the Theme panel's
  // Sketchstyle row read in sync while Adopt read the theme as unpublished: two
  // readings of one state, disagreeing.
  it('does not raise the bake flag, or the off-theme flag, for an untouched theme-supplied sketch', async () => {
    vi.stubGlobal('fetch', async (url: string, init?: RequestInit) => {
      if (init?.method === 'PUT') return new Response(null, { status: 200 });
      return new Response(JSON.stringify({ files: [] }), { status: 200 });
    });
    openThemeSketchSettings(SHIPPED_SKETCH_SETTINGS.napkin);
    liveMovedSinceBake.set(false);
    expect(get(sketchOffTheme)).toBe(false);

    await saveCurrentSketchStyle('My Napkin');

    expect(get(liveMovedSinceBake)).toBe(false);
    expect(get(sketchOffTheme)).toBe(false);
  });

  // Save on a shipped selection writes this project's own copy of it. The file
  // has to land on the id it shadows, or the grid grows a second Pencil beside
  // the shipped one instead of the project taking that one over.
  it('lands a shipped sketchstyle saved under its own label on the id it shadows', async () => {
    await stubFiles([]);
    selectSketchStyle('pencil');
    updateSketchSettings({ strokeWidth: 9 });

    expect(await saveCurrentSketchStyle(SHIPPED_SKETCH_SETTINGS.pencil.label)).toBe('pencil');
    expect(get(selectedSketchStyleId)).toBe('pencil');
    expect(get(sketchDirty)).toBe(false);
  });
});

describe('saveSelectedSketchStyle', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  // Save writes this project's copy of a shipped sketchstyle onto the id it shadows,
  // so the project takes that grid row over rather than growing a second one.
  it('writes a shipped selection to the id it shadows', async () => {
    const puts = await stubFiles([]);
    selectSketchStyle('pencil');
    updateSketchSettings({ strokeWidth: 9 });

    await saveSelectedSketchStyle();

    expect(puts).toEqual(['pencil']);
    expect(get(sketchDirty)).toBe(false);
  });

  // `dry` is labelled "Dry marker". Saving under a slug re-derived from the
  // label wrote `dry-marker` and left the selected file untouched, which is how
  // edits to it went missing between sessions.
  it('writes a sketchstyle whose label does not slugify to its id to the id', async () => {
    const puts = await stubFiles([]);
    selectSketchStyle('dry');
    updateSketchSettings({ strokeWidth: 9 });

    await saveSelectedSketchStyle();

    expect(puts).toEqual(['dry']);
  });

  it('refuses a sketchstyle registered in code, which owns no file to write', async () => {
    registerSketchStyle({ id: 'from-code', label: 'From code', settings: SHIPPED_SKETCH_SETTINGS.napkin });
    selectSketchStyle('from-code');

    await expect(saveSelectedSketchStyle()).rejects.toThrow(/Save As/);
  });

  it('writes over the selected file and re-baselines, so the dials read clean', async () => {
    await stubFiles([{ fileName: 'mine', name: 'Mine', settings: SHIPPED_SKETCH_SETTINGS.napkin }]);
    selectSketchStyle('mine');
    updateSketchSettings({ strokeWidth: 9 });
    expect(get(sketchDirty)).toBe(true);

    await saveSelectedSketchStyle();

    expect(get(sketchDirty)).toBe(false);
    expect(get(sketchSettings).strokeWidth).toBe(9);
  });
});

describe('the sketchstyle pool', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('lets a file replace the shipped sketchstyle it is named after, in its position', async () => {
    // The pool is module state, so an earlier test's files may still be in it.
    await stubFiles([]);
    const before = get(sketchStyles).map((l) => l.id);

    await stubFiles([{ fileName: 'pencil', name: 'My Pencil', settings: SHIPPED_SKETCH_SETTINGS.napkin }]);

    expect(get(sketchStyles).map((l) => l.id)).toEqual(before);
    const pencil = get(sketchStyles).find((l) => l.id === 'pencil')!;
    expect(pencil).toMatchObject({ label: 'My Pencil', source: 'file' });
    expect(pencil.settings.strokeWidth).toBe(SHIPPED_SKETCH_SETTINGS.napkin.strokeWidth);
  });

  it('keeps a listed package sketchstyle shipped, so the grid offers no delete for it', async () => {
    await stubFiles([
      { fileName: 'pencil', name: 'Pencil', settings: SHIPPED_SKETCH_SETTINGS.pencil, isPackage: true },
      { fileName: 'mine', name: 'Mine', settings: SHIPPED_SKETCH_SETTINGS.napkin },
    ]);

    expect(get(sketchStyles).find((l) => l.id === 'pencil')).toMatchObject({ source: 'shipped' });
    expect(get(sketchStyles).find((l) => l.id === 'mine')).toMatchObject({ source: 'file' });
  });

  it('hands a shadowed id back to its shipped sketchstyle when the file goes', async () => {
    await stubFiles([{ fileName: 'pencil', name: 'My Pencil', settings: SHIPPED_SKETCH_SETTINGS.napkin }]);

    await stubFiles([]);

    expect(get(sketchStyles).find((l) => l.id === 'pencil')).toMatchObject({
      label: 'Pencil',
      source: 'shipped',
    });
  });
});

describe('hydrateSketchSettings', () => {
  it('drops a key for a control that no longer exists', () => {
    const stored = { ...SHIPPED_SKETCH_SETTINGS.pencil, mode: 'global' };

    expect(hydrateSketchSettings(stored)).not.toHaveProperty('mode');
  });

  it('leaves a rehydrated sketchstyle comparing equal to the shipped one', () => {
    // A stale key survives every spread, so without the drop the settings read
    // as modified against their own baseline forever.
    const stored = { ...SHIPPED_SKETCH_SETTINGS.pencil, mode: 'global' };

    expect(hydrateSketchSettings(stored)).toEqual(SHIPPED_SKETCH_SETTINGS.pencil);
  });

  it('still fills a control added since the value was stored, from the default sketchstyle', () => {
    const { strokeInk, ...withoutNewControl } = SHIPPED_SKETCH_SETTINGS.pencil;

    expect(hydrateSketchSettings(withoutNewControl).strokeInk).toBe(
      SHIPPED_SKETCH_SETTINGS[DEFAULT_SKETCH_STYLE].strokeInk,
    );
  });

  it('drops the retired global sketchstyle from the shipped set', () => {
    expect(Object.keys(SHIPPED_SKETCH_SETTINGS)).not.toContain('global');
  });

  // The dial used to be the map's own `scale`, which is twice the travel.
  it('halves a sketchstyle stored under the old swing-valued dials', () => {
    const out = hydrateSketchSettings({
      fillScale: 4, strokeScale: 3, iconScale: 2.5, cornerShift: 16,
    });
    expect(out.fillTravel).toBe(2);
    expect(out.strokeTravel).toBe(1.5);
    expect(out.iconTravel).toBe(1.25);
    expect(out.cornerTravel).toBe(8);
  });

  // Cycles per px is the number the filter wants, not one anybody can picture.
  it('reads a stored frequency back as a wavelength in px', () => {
    expect(hydrateSketchSettings({ frequency: 0.018 }).wobble).toBe(56);
  });

  // The distance between the passes used to be derived from the stroke width,
  // so a sketchstyle stored before the dial has to come back at that distance rather
  // than at whatever the fallback sketchstyle carries.
  it('rebuilds the pass offset a sketchstyle was drawn with', () => {
    expect(hydrateSketchSettings({ strokeWidth: 4 }).retraceOffset).toBe(2.2);
    expect(hydrateSketchSettings({ strokeWidth: 1.25 }).retraceOffset).toBe(1.2);
    expect(hydrateSketchSettings({ strokeWidth: 4, retraceOffset: 6 }).retraceOffset).toBe(6);
  });

  // A px tile against a glyph whose size the layer cannot know. The old default
  // reads as one period across the glyph, which is what that size was aiming at.
  it('reads a stored icon tile back as a share of the glyph', () => {
    expect(hydrateSketchSettings({ iconMaskTile: 90 }).iconMaskScale).toBe(1);
    expect(hydrateSketchSettings({ iconMaskTile: 140 }).iconMaskScale).toBe(1.56);
    expect(hydrateSketchSettings({ iconMaskTile: 60 }).iconMaskScale).toBe(0.67);
  });

  // The blob size is a size per axis now, and a sketchstyle drawn before the split was
  // drawn with one field, not a stretched one.
  it('reads a stored blob size back onto both axes, linked', () => {
    const out = hydrateSketchSettings({ maskBlob: 70 });
    expect(out.maskBlobX).toBe(70);
    expect(out.maskBlobY).toBe(70);
    expect(out.maskBlobLinked).toBe(true);
    expect('maskBlob' in out).toBe(false);
  });

  it('converts a tiled mask into page-px blobs', () => {
    const out = hydrateSketchSettings({
      maskScale: 1100, maskFrequency: 0.009, maskContrast: 2.2, maskFloor: 0.35, maskSoftness: 1.5,
    });
    expect(out.maskBlobX).toBe(204);
    expect(out.maskBlobY).toBe(204);
    expect(out.maskSoftness).toBe(2.8);
    expect('maskScale' in out).toBe(false);
  });

  // The pair were a cut point and a slope through feTurbulence's own output,
  // which never reached either end of 0 to 1. Rescaled onto a field that does,
  // the same sketchstyle comes back rather than the fallback sketchstyle's.
  it('converts a coverage cut into the two levels it sat between', () => {
    const out = hydrateSketchSettings({ maskCoverage: 0.5, maskContrast: 2 });
    expect(out.maskOutputMin).toBeCloseTo(0.02, 2);
    expect(out.maskOutputMax).toBeCloseTo(0.96, 2);

    const hard = hydrateSketchSettings({ maskCoverage: 0.84, maskContrast: 4 });
    expect(hard.maskOutputMax - hard.maskOutputMin).toBeLessThan(out.maskOutputMax - out.maskOutputMin);
  });

  it('carries input levels across as output levels', () => {
    const out = hydrateSketchSettings({ maskLevelMin: 0.2, maskLevelMax: 0.5 });
    expect(out.maskOutputMin).toBe(0.2);
    expect(out.maskOutputMax).toBe(0.5);
    expect('maskLevelMin' in out).toBe(false);
  });
});

describe('page root', () => {
  beforeEach(() => {
    setSketchPageRoot(null);
    sketchEnabled.set(false);
  });

  it('paints the registered page root while the effect is on', () => {
    setSketchPageRoot(document.documentElement);
    sketchEnabled.set(true);

    expect(document.documentElement.hasAttribute('data-sketch')).toBe(true);
  });

  it('leaves the document alone until a page root is registered', () => {
    sketchEnabled.set(true);

    expect(document.documentElement.hasAttribute('data-sketch')).toBe(false);
  });

  it('drops the scope when the router hands back an editor route', () => {
    setSketchPageRoot(document.documentElement);
    sketchEnabled.set(true);
    setSketchPageRoot(null);

    expect(document.documentElement.hasAttribute('data-sketch')).toBe(false);
  });
});

/* `sketchTouched` still computes once, at module import, from whatever
   localStorage already holds (including the legacy-key migration below) — so
   pinning that needs a fresh module instance per case, not the file's shared
   static import. `hasPersistedSketchState` itself re-reads `TOUCHED_KEY` on
   every call (see the last case here), but the value it reads still starts
   from that one-time import-time write. */
describe('hasPersistedSketchState', () => {
  const ENABLED_KEY = 'lt.sketchEnabled';
  const SETTINGS_KEY = 'lt.sketchSettings';
  const SELECTED_ID_KEY = 'lt.sketchStyleName';
  const BASELINE_KEY = 'lt.sketchBaseline';
  const TOUCHED_KEY = 'lt.sketchTouched';

  beforeEach(() => {
    localStorage.clear();
    vi.resetModules();
  });

  it('reads untouched on a virgin browser', async () => {
    const { hasPersistedSketchState } = await import('./sketchStore');

    expect(hasPersistedSketchState()).toBe(false);
  });

  it('still reads untouched on a second load, after its own write-back has planted the four keys', async () => {
    await import('./sketchStore');
    vi.resetModules();

    const { hasPersistedSketchState } = await import('./sketchStore');

    expect(hasPersistedSketchState()).toBe(false);
  });

  it('reads touched, and migrates the sentinel, for a pre-upgrade browser holding the legacy keys with no sentinel', async () => {
    localStorage.setItem(ENABLED_KEY, 'true');
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(SHIPPED_SKETCH_SETTINGS.napkin));
    localStorage.setItem(SELECTED_ID_KEY, 'napkin');
    localStorage.setItem(BASELINE_KEY, JSON.stringify(SHIPPED_SKETCH_SETTINGS.napkin));

    const { hasPersistedSketchState } = await import('./sketchStore');

    expect(hasPersistedSketchState()).toBe(true);
    expect(localStorage.getItem(TOUCHED_KEY)).toBe('true');
  });

  // The race `themeInit.ts`'s boot reconcile hits: a peer document's
  // `markSketchTouched` writes TOUCHED_KEY in the gap between this module's
  // import and the caller's later check, with no `storage` handler for that
  // key to update an in-memory cache. The read has to go to disk every time.
  it('sees a peer document\'s write that lands after this module\'s own import', async () => {
    const { hasPersistedSketchState } = await import('./sketchStore');
    expect(hasPersistedSketchState()).toBe(false);

    localStorage.setItem(TOUCHED_KEY, 'true');

    expect(hasPersistedSketchState()).toBe(true);
  });
});

/* The overlay editor is a second instance of this module in an iframe, and the
   two trade through localStorage. */
describe('cross-document sync', () => {
  const SETTINGS_KEY = 'lt.sketchSettings';

  /** Deliver a value as the other document would, serialised in ITS key order.
      The same settings written by this document would come out in the canonical
      order `hydrateSketchSettings` produces, so the stored text says who wrote
      last — which no spy can, since happy-dom's localStorage is a Proxy and
      neither the instance method nor the prototype one stays patched. */
  function arrive(settings: object): string {
    const sent = JSON.stringify(Object.fromEntries(Object.entries(settings).reverse()));
    localStorage.setItem(SETTINGS_KEY, sent);
    window.dispatchEvent(new StorageEvent('storage', {
      key: SETTINGS_KEY, newValue: sent, storageArea: localStorage,
    }));
    return sent;
  }

  // The bug this replaces: a document wrote back everything it adopted, and the
  // echo is not identical but LATE. Dragging a handle sent a value a frame, the
  // far side adopted the first and returned it, and this side — three frames on
  // — read a value it did not hold and adopted its own past. The handle jumped
  // back under the cursor and the drag could not move.
  it('never writes back a value it adopted from the other document', () => {
    selectSketchStyle('marker');
    updateSketchSettings({ maskOutputMin: 0.3 });

    const sent = arrive({ ...get(sketchSettings), maskOutputMin: 0.2 });

    expect(get(sketchSettings).maskOutputMin).toBe(0.2);
    expect(localStorage.getItem(SETTINGS_KEY)).toBe(sent);
  });

  it('still sends its own changes after adopting one', () => {
    selectSketchStyle('marker');
    arrive({ ...get(sketchSettings), maskOutputMin: 0.2 });

    updateSketchSettings({ maskOutputMin: 0.7 });

    expect(JSON.parse(localStorage.getItem(SETTINGS_KEY)!).maskOutputMin).toBe(0.7);
  });
});
