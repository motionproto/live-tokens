// @vitest-environment happy-dom

import { get } from 'svelte/store';
import { beforeEach, describe, expect, it } from 'vitest';
import { DEFAULT_SKETCH_PRESET, hydrateSketchSettings, SKETCH_PRESETS, type SketchSettings } from './sketchPresets';
import {
  liveSketch,
  openThemeSketch,
  selectSketchPreset,
  setSketchPageRoot,
  sketchDirty,
  sketchEnabled,
  sketchPreset,
  sketchSettings,
  themeSketch,
  updateSketchSettings,
} from './sketchStore';

describe('sketch preset selection', () => {
  beforeEach(() => {
    selectSketchPreset('pencil');
  });

  it('keeps the base selected after a dial moves', () => {
    updateSketchSettings({ strokeWidth: 9 });

    expect(get(sketchPreset)).toBe('pencil');
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
    selectSketchPreset('napkin');

    expect(get(sketchPreset)).toBe('napkin');
    expect(get(sketchDirty)).toBe(false);
  });
});

describe('openThemeSketch', () => {
  beforeEach(() => {
    selectSketchPreset('pencil');
  });

  it('turns the effect off and empties the preset selection when the theme carries none', () => {
    openThemeSketch(undefined);

    expect(get(sketchEnabled)).toBe(false);
    expect(get(sketchPreset)).toBe('');
    expect(get(themeSketch)).toBeUndefined();
  });

  it('turns the effect on and selects the matching shipped preset by comparison', () => {
    openThemeSketch(SKETCH_PRESETS.napkin);

    expect(get(sketchEnabled)).toBe(true);
    expect(get(sketchPreset)).toBe('napkin');
    expect(get(sketchSettings)).toEqual(SKETCH_PRESETS.napkin);
    expect(get(sketchDirty)).toBe(false);
  });

  it('selects no preset when the theme dials match none of the shipped set, and still reads clean', () => {
    const custom: SketchSettings = { ...SKETCH_PRESETS.napkin, fillTravel: 9.5 };

    openThemeSketch(custom);

    expect(get(sketchPreset)).toBe('');
    expect(get(sketchDirty)).toBe(false);
  });
});

describe('liveSketch', () => {
  it('is undefined while the effect is off', () => {
    selectSketchPreset('pencil');
    sketchEnabled.set(false);

    expect(liveSketch()).toBeUndefined();
  });

  it('is the live dials while the effect is on', () => {
    selectSketchPreset('napkin');
    sketchEnabled.set(true);

    expect(liveSketch()).toEqual(SKETCH_PRESETS.napkin);
  });
});

describe('hydrateSketchSettings', () => {
  it('drops a key for a control that no longer exists', () => {
    const stored = { ...SKETCH_PRESETS.pencil, mode: 'global' };

    expect(hydrateSketchSettings(stored)).not.toHaveProperty('mode');
  });

  it('leaves a rehydrated preset comparing equal to the shipped one', () => {
    // A stale key survives every spread, so without the drop the settings read
    // as modified against their own baseline forever.
    const stored = { ...SKETCH_PRESETS.pencil, mode: 'global' };

    expect(hydrateSketchSettings(stored)).toEqual(SKETCH_PRESETS.pencil);
  });

  it('still fills a control added since the value was stored, from the default preset', () => {
    const { strokeInk, ...withoutNewControl } = SKETCH_PRESETS.pencil;

    expect(hydrateSketchSettings(withoutNewControl).strokeInk).toBe(
      SKETCH_PRESETS[DEFAULT_SKETCH_PRESET].strokeInk,
    );
  });

  it('drops the retired global preset from the shipped set', () => {
    expect(Object.keys(SKETCH_PRESETS)).not.toContain('global');
  });

  // The dial used to be the map's own `scale`, which is twice the travel.
  it('halves a look stored under the old swing-valued dials', () => {
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
  // so a look stored before the dial has to come back at that distance rather
  // than at whatever the fallback preset carries.
  it('rebuilds the pass offset a look was drawn with', () => {
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

  it('converts a tiled mask into page-px blobs', () => {
    const out = hydrateSketchSettings({
      maskScale: 1100, maskFrequency: 0.009, maskContrast: 2.2, maskFloor: 0.35, maskSoftness: 1.5,
    });
    expect(out.maskBlob).toBe(204);
    expect(out.maskSoftness).toBe(2.8);
    expect('maskScale' in out).toBe(false);
  });

  // The pair were a cut point and a slope through feTurbulence's own output,
  // which never reached either end of 0 to 1. Rescaled onto a field that does,
  // the same look comes back rather than the fallback preset's.
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
    selectSketchPreset('marker');
    updateSketchSettings({ maskOutputMin: 0.3 });

    const sent = arrive({ ...get(sketchSettings), maskOutputMin: 0.2 });

    expect(get(sketchSettings).maskOutputMin).toBe(0.2);
    expect(localStorage.getItem(SETTINGS_KEY)).toBe(sent);
  });

  it('still sends its own changes after adopting one', () => {
    selectSketchPreset('marker');
    arrive({ ...get(sketchSettings), maskOutputMin: 0.2 });

    updateSketchSettings({ maskOutputMin: 0.7 });

    expect(JSON.parse(localStorage.getItem(SETTINGS_KEY)!).maskOutputMin).toBe(0.7);
  });
});
