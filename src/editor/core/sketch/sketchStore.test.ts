// @vitest-environment happy-dom

import { get } from 'svelte/store';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  DEFAULT_SKETCH_STYLE,
  hydrateSketchStyle,
  SKETCH_STYLES,
  THEME_SKETCH_ID,
  type SketchStyle,
} from './sketchStyles';
import { liveMovedSinceBake } from '../productionPulse';
import { sketchLooks } from './sketchRegistry';
import {
  liveSketchStyle,
  openThemeSketchStyle,
  saveCurrentSketchStyle,
  refreshSavedSketchStyles,
  saveSelectedSketchStyle,
  selectSketchStyle,
  setSketchEnabled,
  setSketchPageRoot,
  sketchDirty,
  sketchEnabled,
  sketchOffLook,
  sketchStyleName,
  sketchSettings,
  themeSketchStyle,
  updateSketchSettings,
} from './sketchStore';

/** `refreshSavedSketchStyles` lists, then loads each file it listed, so a stub
    has to answer both shapes. Returns once the pool holds them. */
async function stubFiles(files: { fileName: string; name: string; settings: SketchStyle }[]) {
  vi.stubGlobal('fetch', async (url: string, init?: RequestInit) => {
    if (init?.method === 'PUT' || init?.method === 'DELETE') return new Response(null, { status: 200 });
    const match = files.find((f) => String(url).endsWith(`/${f.fileName}`));
    if (match) return new Response(JSON.stringify({ name: match.name, settings: match.settings }), { status: 200 });
    return new Response(JSON.stringify({
      files: files.map((f) => ({ fileName: f.fileName, name: f.name, updatedAt: '' })),
    }), { status: 200 });
  });
  await refreshSavedSketchStyles();
}

describe('sketchstyle selection', () => {
  beforeEach(() => {
    selectSketchStyle('pencil');
  });

  it('keeps the base selected after a dial moves', () => {
    updateSketchSettings({ strokeWidth: 9 });

    expect(get(sketchStyleName)).toBe('pencil');
    expect(get(sketchSettings).strokeWidth).toBe(9);
  });

  it('reports the drift so the tab can say what the look came from', () => {
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

    expect(get(sketchStyleName)).toBe('napkin');
    expect(get(sketchDirty)).toBe(false);
  });
});

describe('openThemeSketchStyle', () => {
  beforeEach(() => {
    selectSketchStyle('pencil');
  });

  it('turns the effect off and empties the sketchstyle selection when the theme carries none', () => {
    openThemeSketchStyle(undefined);

    expect(get(sketchEnabled)).toBe(false);
    expect(get(sketchStyleName)).toBe('');
    expect(get(themeSketchStyle)).toBeUndefined();
  });

  it('turns the effect on and selects the matching shipped sketchstyle by comparison', () => {
    openThemeSketchStyle(SKETCH_STYLES.napkin);

    expect(get(sketchEnabled)).toBe(true);
    expect(get(sketchStyleName)).toBe('napkin');
    expect(get(sketchSettings)).toEqual(SKETCH_STYLES.napkin);
    expect(get(sketchDirty)).toBe(false);
  });

  it('names the theme itself when its dials match none of the shipped set, and still reads clean', () => {
    const custom: SketchStyle = { ...SKETCH_STYLES.napkin, fillTravel: 9.5 };

    openThemeSketchStyle(custom);

    expect(get(sketchStyleName)).toBe(THEME_SKETCH_ID);
    expect(get(sketchDirty)).toBe(false);
  });
});

describe('sketchOffLook', () => {
  it('is false when both the live state and the theme are absent', () => {
    openThemeSketchStyle(undefined);

    expect(get(sketchOffLook)).toBe(false);
  });

  it('is false when the live dials match what the theme carries', () => {
    openThemeSketchStyle(SKETCH_STYLES.napkin);

    expect(get(sketchOffLook)).toBe(false);
  });

  it('is true when the effect is on and the theme carries none', () => {
    openThemeSketchStyle(undefined);
    selectSketchStyle('napkin');
    sketchEnabled.set(true);

    expect(get(sketchOffLook)).toBe(true);
  });

  it('is true when the effect is off and the theme carries a layer', () => {
    openThemeSketchStyle(SKETCH_STYLES.napkin);
    sketchEnabled.set(false);

    expect(get(sketchOffLook)).toBe(true);
  });

  it('reads false again once the theme is opened onto the live value', () => {
    openThemeSketchStyle(undefined);
    selectSketchStyle('napkin');
    sketchEnabled.set(true);
    updateSketchSettings({ fillTravel: 9.5 });
    expect(get(sketchOffLook)).toBe(true);

    openThemeSketchStyle(get(sketchSettings));

    expect(get(sketchOffLook)).toBe(false);
  });
});

describe('liveSketchStyle', () => {
  it('is undefined while the effect is off', () => {
    selectSketchStyle('pencil');
    sketchEnabled.set(false);

    expect(liveSketchStyle()).toBeUndefined();
  });

  it('is the live dials while the effect is on', () => {
    selectSketchStyle('napkin');
    sketchEnabled.set(true);

    expect(liveSketchStyle()).toEqual(SKETCH_STYLES.napkin);
  });
});

describe('liveMovedSinceBake follows the gesture boundary', () => {
  beforeEach(() => {
    openThemeSketchStyle(undefined);
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
    // off (browsing is ordinary use), but `liveSketchStyle()` returns undefined
    // while disabled, so nothing done to them then can reach a theme or a bake.
    selectSketchStyle('napkin');

    expect(get(liveMovedSinceBake)).toBe(false);
  });

  it('is not set by a dial move while the effect is off', () => {
    updateSketchSettings({ strokeWidth: 9 });

    expect(get(liveMovedSinceBake)).toBe(false);
  });

  it('is not set by a saved-sketchstyle pick while the effect is off', async () => {
    await stubFiles([{ fileName: 'mine', name: 'Mine', settings: SKETCH_STYLES.napkin }]);

    selectSketchStyle('mine');

    expect(get(sketchStyleName)).toBe('mine');
    expect(get(liveMovedSinceBake)).toBe(false);
  });

  it('is not set by re-enabling an effect that is already on', () => {
    setSketchEnabled(true);
    liveMovedSinceBake.set(false);

    setSketchEnabled(true);

    expect(get(liveMovedSinceBake)).toBe(false);
  });

  it('is not set by opening a theme', () => {
    openThemeSketchStyle(SKETCH_STYLES.napkin);

    expect(get(liveMovedSinceBake)).toBe(false);
  });

  it('is not raised by the storage-echo path adopting a peer document\'s change', () => {
    // A peer document toggling the effect writes ENABLED_KEY and this
    // document adopts it via the `storage` event, never through
    // `setSketchEnabled`. Adopting a peer's choice must not read as this
    // document having moved its own look.
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

  // `saveCurrentSketchStyle` only rewrites `label`, which `sameLook`
  // defines as outside the look. Flagging here would make the Theme panel's
  // Sketchstyle row read in sync while Adopt read the look as unpublished: two
  // readings of one state, disagreeing.
  it('does not raise the bake flag, or the off-look flag, for an untouched theme-supplied sketch', async () => {
    vi.stubGlobal('fetch', async (url: string, init?: RequestInit) => {
      if (init?.method === 'PUT') return new Response(null, { status: 200 });
      return new Response(JSON.stringify({ files: [] }), { status: 200 });
    });
    openThemeSketchStyle(SKETCH_STYLES.napkin);
    liveMovedSinceBake.set(false);
    expect(get(sketchOffLook)).toBe(false);

    await saveCurrentSketchStyle('My Napkin');

    expect(get(liveMovedSinceBake)).toBe(false);
    expect(get(sketchOffLook)).toBe(false);
  });
});

describe('saveSelectedSketchStyle', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('refuses a shipped selection, which owns no file to write', async () => {
    selectSketchStyle('pencil');

    await expect(saveSelectedSketchStyle()).rejects.toThrow(/No saved sketchstyle/);
  });

  it('writes over the selected file and re-baselines, so the dials read clean', async () => {
    await stubFiles([{ fileName: 'mine', name: 'Mine', settings: SKETCH_STYLES.napkin }]);
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

  it('lets a file replace the shipped look it is named after, in its position', async () => {
    // The pool is module state, so an earlier test's files may still be in it.
    await stubFiles([]);
    const before = get(sketchLooks).map((l) => l.id);

    await stubFiles([{ fileName: 'pencil', name: 'My Pencil', settings: SKETCH_STYLES.napkin }]);

    expect(get(sketchLooks).map((l) => l.id)).toEqual(before);
    const pencil = get(sketchLooks).find((l) => l.id === 'pencil')!;
    expect(pencil).toMatchObject({ label: 'My Pencil', source: 'file' });
    expect(pencil.settings.strokeWidth).toBe(SKETCH_STYLES.napkin.strokeWidth);
  });

  it('hands a shadowed id back to its shipped look when the file goes', async () => {
    await stubFiles([{ fileName: 'pencil', name: 'My Pencil', settings: SKETCH_STYLES.napkin }]);

    await stubFiles([]);

    expect(get(sketchLooks).find((l) => l.id === 'pencil')).toMatchObject({
      label: 'Pencil',
      source: 'shipped',
    });
  });
});

describe('hydrateSketchStyle', () => {
  it('drops a key for a control that no longer exists', () => {
    const stored = { ...SKETCH_STYLES.pencil, mode: 'global' };

    expect(hydrateSketchStyle(stored)).not.toHaveProperty('mode');
  });

  it('leaves a rehydrated sketchstyle comparing equal to the shipped one', () => {
    // A stale key survives every spread, so without the drop the settings read
    // as modified against their own baseline forever.
    const stored = { ...SKETCH_STYLES.pencil, mode: 'global' };

    expect(hydrateSketchStyle(stored)).toEqual(SKETCH_STYLES.pencil);
  });

  it('still fills a control added since the value was stored, from the default sketchstyle', () => {
    const { strokeInk, ...withoutNewControl } = SKETCH_STYLES.pencil;

    expect(hydrateSketchStyle(withoutNewControl).strokeInk).toBe(
      SKETCH_STYLES[DEFAULT_SKETCH_STYLE].strokeInk,
    );
  });

  it('drops the retired global sketchstyle from the shipped set', () => {
    expect(Object.keys(SKETCH_STYLES)).not.toContain('global');
  });

  // The dial used to be the map's own `scale`, which is twice the travel.
  it('halves a look stored under the old swing-valued dials', () => {
    const out = hydrateSketchStyle({
      fillScale: 4, strokeScale: 3, iconScale: 2.5, cornerShift: 16,
    });
    expect(out.fillTravel).toBe(2);
    expect(out.strokeTravel).toBe(1.5);
    expect(out.iconTravel).toBe(1.25);
    expect(out.cornerTravel).toBe(8);
  });

  // Cycles per px is the number the filter wants, not one anybody can picture.
  it('reads a stored frequency back as a wavelength in px', () => {
    expect(hydrateSketchStyle({ frequency: 0.018 }).wobble).toBe(56);
  });

  // The distance between the passes used to be derived from the stroke width,
  // so a look stored before the dial has to come back at that distance rather
  // than at whatever the fallback sketchstyle carries.
  it('rebuilds the pass offset a look was drawn with', () => {
    expect(hydrateSketchStyle({ strokeWidth: 4 }).retraceOffset).toBe(2.2);
    expect(hydrateSketchStyle({ strokeWidth: 1.25 }).retraceOffset).toBe(1.2);
    expect(hydrateSketchStyle({ strokeWidth: 4, retraceOffset: 6 }).retraceOffset).toBe(6);
  });

  // A px tile against a glyph whose size the layer cannot know. The old default
  // reads as one period across the glyph, which is what that size was aiming at.
  it('reads a stored icon tile back as a share of the glyph', () => {
    expect(hydrateSketchStyle({ iconMaskTile: 90 }).iconMaskScale).toBe(1);
    expect(hydrateSketchStyle({ iconMaskTile: 140 }).iconMaskScale).toBe(1.56);
    expect(hydrateSketchStyle({ iconMaskTile: 60 }).iconMaskScale).toBe(0.67);
  });

  it('converts a tiled mask into page-px blobs', () => {
    const out = hydrateSketchStyle({
      maskScale: 1100, maskFrequency: 0.009, maskContrast: 2.2, maskFloor: 0.35, maskSoftness: 1.5,
    });
    expect(out.maskBlob).toBe(204);
    expect(out.maskSoftness).toBe(2.8);
    expect('maskScale' in out).toBe(false);
  });

  // The pair were a cut point and a slope through feTurbulence's own output,
  // which never reached either end of 0 to 1. Rescaled onto a field that does,
  // the same look comes back rather than the fallback sketchstyle's.
  it('converts a coverage cut into the two levels it sat between', () => {
    const out = hydrateSketchStyle({ maskCoverage: 0.5, maskContrast: 2 });
    expect(out.maskOutputMin).toBeCloseTo(0.02, 2);
    expect(out.maskOutputMax).toBeCloseTo(0.96, 2);

    const hard = hydrateSketchStyle({ maskCoverage: 0.84, maskContrast: 4 });
    expect(hard.maskOutputMax - hard.maskOutputMin).toBeLessThan(out.maskOutputMax - out.maskOutputMin);
  });

  it('carries input levels across as output levels', () => {
    const out = hydrateSketchStyle({ maskLevelMin: 0.2, maskLevelMax: 0.5 });
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
  const STYLE_NAME_KEY = 'lt.sketchStyleName';
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
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(SKETCH_STYLES.napkin));
    localStorage.setItem(STYLE_NAME_KEY, 'napkin');
    localStorage.setItem(BASELINE_KEY, JSON.stringify(SKETCH_STYLES.napkin));

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
      order `hydrateSketchStyle` produces, so the stored text says who wrote
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
