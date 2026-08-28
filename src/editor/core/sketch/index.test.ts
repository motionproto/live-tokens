// @vitest-environment happy-dom

import { get } from 'svelte/store';
import { beforeEach, describe, expect, it } from 'vitest';
import {
  SKETCH_LOOKS,
  hasPersistedSketchState,
  seedSketchFromTheme,
  setSketch,
  sketchPick,
  themeSketchLook,
} from './index';
import { SKETCH_STYLES, THEME_SKETCH_ID } from './sketchStyles';
import {
  openThemeSketchStyle,
  setSketchEnabled,
  setSketchPageRoot,
  sketchEnabled,
  sketchSettings,
  sketchStyleName,
  themeSketchStyle,
  updateSketchSettings,
} from './sketchStore';
import { buildStylesheet, sketchLayerInstalled } from './sketchLayer';

/** A theme's own look: marker with one dial moved off it, which is the shape
    the field takes on a real site. */
const TUNED = { ...SKETCH_STYLES.marker, maskOutputMin: 0.71 };

/** The two browsers `seedSketchFromTheme` tells apart, set through the key
    rather than through a gesture. `markSketchTouched` writes it once per module
    load, so a gesture in a later test in this file never reaches storage;
    `hasPersistedSketchState` reads the key fresh, which is what makes setting
    it here the real thing rather than a stand-in. */
const undecided = () => localStorage.setItem('lt.sketchTouched', 'false');
const decided = () => localStorage.setItem('lt.sketchTouched', 'true');

beforeEach(() => {
  setSketchPageRoot(document.documentElement);
  setSketchEnabled(false);
  themeSketchStyle.set(undefined);
});

describe('SKETCH_LOOKS', () => {
  it('offers every shipped sketchstyle and nothing else', () => {
    expect(SKETCH_LOOKS.map((l) => l.id).sort()).toEqual(Object.keys(SKETCH_STYLES).sort());
  });

  it('carries an id setSketch accepts', () => {
    for (const look of SKETCH_LOOKS) expect(() => setSketch(look.id)).not.toThrow();
  });

  it('leaves the theme id unclaimed, so a theme look can never be shadowed', () => {
    expect(SKETCH_LOOKS.map((l) => l.id)).not.toContain(THEME_SKETCH_ID);
  });
});

describe('setSketch', () => {
  it('paints the page and names the look it painted', () => {
    setSketch('pencil');

    expect(get(sketchEnabled)).toBe(true);
    expect(get(sketchStyleName)).toBe('pencil');
    expect(document.documentElement.hasAttribute('data-sketch')).toBe(true);
    expect(sketchLayerInstalled()).toBe(true);
  });

  it('takes the page back to crisp', () => {
    setSketch('pencil');
    setSketch(null);

    expect(get(sketchEnabled)).toBe(false);
    expect(document.documentElement.hasAttribute('data-sketch')).toBe(false);
    expect(sketchLayerInstalled()).toBe(false);
  });

  it('names the id it did not recognise rather than doing nothing', () => {
    expect(() => setSketch('crayon')).toThrow(/crayon/);
  });
});

describe('sketchPick', () => {
  it('reads off while the effect is off', () => {
    expect(get(sketchPick)).toEqual({ state: 'off' });
  });

  it('reads the look the page is drawing with', () => {
    setSketch('pencil');

    expect(get(sketchPick)).toEqual({
      state: 'look',
      look: { id: 'pencil', label: SKETCH_STYLES.pencil.label, blurb: SKETCH_STYLES.pencil.blurb },
    });
  });

  it('keeps naming the look a dial has drifted from', () => {
    setSketch('pencil');
    updateSketchSettings({ strokeWidth: 9 });

    expect(get(sketchPick)).toMatchObject({ state: 'look' });
  });

  it('names the look the theme carries rather than calling it adjusted', () => {
    openThemeSketchStyle(TUNED);

    expect(get(sketchPick)).toEqual({ state: 'look', look: get(themeSketchLook) });
  });

  it('reads adjusted for a look neither the shipped set nor the theme names', () => {
    openThemeSketchStyle({ ...SKETCH_STYLES.pencil, strokeWidth: 9 });
    themeSketchStyle.set(undefined);

    expect(get(sketchPick)).toEqual({ state: 'adjusted' });
  });
});

describe('themeSketchLook', () => {
  it('is a row a picker can render and setSketch accepts', () => {
    undecided();
    seedSketchFromTheme(TUNED);
    const look = get(themeSketchLook);

    expect(look).toMatchObject({ id: THEME_SKETCH_ID, label: expect.any(String) });
    setSketch('pencil');
    expect(() => setSketch(look!.id)).not.toThrow();
    expect(get(sketchSettings)).toEqual(TUNED);
  });

  it('stays null for a theme whose look is one of the shipped ones', () => {
    undecided();
    seedSketchFromTheme({ ...SKETCH_STYLES.whiteboard });

    expect(get(themeSketchLook)).toBeNull();
    expect(get(sketchPick)).toMatchObject({ state: 'look', look: { id: 'whiteboard' } });
  });

  it('is null for a theme carrying no sketchstyle', () => {
    seedSketchFromTheme(undefined);

    expect(get(themeSketchLook)).toBeNull();
  });

  it('names the id it cannot honour rather than drawing nothing', () => {
    expect(() => setSketch(THEME_SKETCH_ID)).toThrow(/theme/i);
  });
});

describe('seedSketchFromTheme', () => {
  it('draws the theme look on a browser that has decided nothing', () => {
    undecided();
    seedSketchFromTheme(TUNED);

    expect(get(sketchEnabled)).toBe(true);
    expect(get(sketchSettings)).toEqual(TUNED);
  });

  // The whole point, stated where it can fail: what the page is painted with is
  // the theme's tuned dial and not the shipped preset it was tuned from.
  it('paints the theme\'s dials, not the preset they were tuned from', () => {
    undecided();
    seedSketchFromTheme(TUNED);

    const painted = document.head.querySelector('style[data-sketch-style]')?.textContent;
    expect(painted).toBe(buildStylesheet(TUNED));
    expect(painted).not.toBe(buildStylesheet(SKETCH_STYLES.marker));
  });

  it('leaves a recorded pick alone, and still learns what the theme holds', () => {
    setSketch('pencil');
    decided();

    seedSketchFromTheme(TUNED);

    expect(get(sketchSettings)).toEqual(SKETCH_STYLES.pencil);
    expect(get(themeSketchLook)).toMatchObject({ id: THEME_SKETCH_ID });
  });

  it('leaves a recorded None alone, so a theme cannot re-sketch a crisp page', () => {
    setSketch(null);
    decided();

    seedSketchFromTheme(TUNED);

    expect(get(sketchEnabled)).toBe(false);
  });

  it('carries a look stored under a retired dial name, the way the dev server does', () => {
    // No `normalizeTheme` runs over a built site's theme JSON, so this is the
    // only thing that halves the old full-swing `fillScale`.
    undecided();
    const { fillTravel: _dropped, ...rest } = TUNED;
    seedSketchFromTheme({ ...rest, fillScale: 5 });

    expect(get(sketchSettings).fillTravel).toBe(2.5);
  });

  it('takes anything that is not an object as no sketchstyle at all', () => {
    for (const absent of [undefined, null, 'marker', 7, []]) {
      setSketchEnabled(false);
      undecided();
      seedSketchFromTheme(absent);
      expect(get(sketchEnabled)).toBe(false);
      expect(get(themeSketchLook)).toBeNull();
    }
  });
});

describe('the layer the store did not install', () => {
  it('comes down when the effect is switched off', () => {
    setSketch('pencil');
    // What a consumer reaching past the exports map used to leave behind: nodes
    // in the document with nothing in this module recording that it put them
    // there. Standing in for it by clearing the flag is not possible any more,
    // which is the point — the DOM is the record.
    expect(sketchLayerInstalled()).toBe(true);

    setSketchEnabled(false);
    expect(sketchLayerInstalled()).toBe(false);
  });
});

/* The gate `seedSketchFromTheme` reads, and the one a consumer's own carry
   reads. What writes the key is pinned against fresh module instances in
   `sketchStore.test.ts`; what this boundary owns is that the export answers the
   key rather than a value cached at import, which is what lets a peer
   document's write land between import and a caller's await. */
describe('hasPersistedSketchState', () => {
  it('answers the key, not the value it cached at import', () => {
    decided();
    expect(hasPersistedSketchState()).toBe(true);

    undecided();
    expect(hasPersistedSketchState()).toBe(false);
  });
});
