// @vitest-environment happy-dom

import { get } from 'svelte/store';
import { beforeEach, describe, expect, it } from 'vitest';
import {
  sketchStyles,
  hasPersistedSketchState,
  seedSketchFromTheme,
  registerSketchStyle,
  setSketch,
  sketchPick,
  unsavedSketchStyle,
} from './index';
import { SHIPPED_SKETCH_SETTINGS, THEME_SKETCH_ID } from './sketchStyles';
import {
  openThemeSketchSettings,
  setSketchEnabled,
  setSketchPageRoot,
  sketchEnabled,
  sketchSettings,
  selectedSketchStyleId,
  themeSketchSettings,
  updateSketchSettings,
} from './sketchStore';
import { buildStylesheet, sketchLayerInstalled } from './sketchLayer';

/** A theme's own style: marker with one dial moved off it, which is the shape
    the field takes on a real site. */
const TUNED = { ...SHIPPED_SKETCH_SETTINGS.marker, maskOutputMin: 0.71 };

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
  themeSketchSettings.set(undefined);
});

describe('sketchStyles', () => {
  it('offers every shipped sketchstyle when nothing has registered', () => {
    expect(get(sketchStyles).map((l) => l.id).sort()).toEqual(Object.keys(SHIPPED_SKETCH_SETTINGS).sort());
  });

  it('carries an id setSketch accepts', () => {
    for (const style of get(sketchStyles)) expect(() => setSketch(style.id)).not.toThrow();
  });

  it('leaves the theme id unclaimed, so a theme style can never be shadowed', () => {
    expect(get(sketchStyles).map((l) => l.id)).not.toContain(THEME_SKETCH_ID);
  });

  it('takes a registered style, which setSketch then paints', () => {
    registerSketchStyle({ id: 'chalk', label: 'Chalk', settings: SHIPPED_SKETCH_SETTINGS.napkin });

    expect(() => setSketch('chalk')).not.toThrow();
    expect(get(selectedSketchStyleId)).toBe('chalk');
  });
});

describe('setSketch', () => {
  it('paints the page and names the style it painted', () => {
    setSketch('pencil');

    expect(get(sketchEnabled)).toBe(true);
    expect(get(selectedSketchStyleId)).toBe('pencil');
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

  it('reads the style the page is drawing with', () => {
    setSketch('pencil');

    expect(get(sketchPick)).toEqual({
      state: 'style',
      style: { id: 'pencil', label: SHIPPED_SKETCH_SETTINGS.pencil.label, blurb: SHIPPED_SKETCH_SETTINGS.pencil.blurb },
    });
  });

  it('keeps naming the style a dial has drifted from', () => {
    setSketch('pencil');
    updateSketchSettings({ strokeWidth: 9 });

    expect(get(sketchPick)).toMatchObject({ state: 'style' });
  });

  it('names the style the theme carries rather than calling it adjusted', () => {
    openThemeSketchSettings(TUNED);

    expect(get(sketchPick)).toEqual({ state: 'style', style: get(unsavedSketchStyle) });
  });

  it('reads adjusted for a style neither the shipped set nor the theme names', () => {
    openThemeSketchSettings({ ...SHIPPED_SKETCH_SETTINGS.pencil, strokeWidth: 9 });
    themeSketchSettings.set(undefined);

    expect(get(sketchPick)).toEqual({ state: 'adjusted' });
  });
});

describe('unsavedSketchStyle', () => {
  it('is a row a picker can render and setSketch accepts', () => {
    undecided();
    seedSketchFromTheme(TUNED);
    const style = get(unsavedSketchStyle);

    expect(style).toMatchObject({ id: THEME_SKETCH_ID, label: expect.any(String) });
    setSketch('pencil');
    expect(() => setSketch(style!.id)).not.toThrow();
    expect(get(sketchSettings)).toEqual(TUNED);
  });

  it('stays null for a theme whose style is one of the shipped ones', () => {
    undecided();
    seedSketchFromTheme({ ...SHIPPED_SKETCH_SETTINGS.whiteboard });

    expect(get(unsavedSketchStyle)).toBeNull();
    expect(get(sketchPick)).toMatchObject({ state: 'style', style: { id: 'whiteboard' } });
  });

  it('is null for a theme carrying no sketchstyle', () => {
    seedSketchFromTheme(undefined);

    expect(get(unsavedSketchStyle)).toBeNull();
  });

  it('names the id it cannot honour rather than drawing nothing', () => {
    expect(() => setSketch(THEME_SKETCH_ID)).toThrow(/theme/i);
  });
});

describe('seedSketchFromTheme', () => {
  it('draws the theme style on a browser that has decided nothing', () => {
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
    expect(painted).not.toBe(buildStylesheet(SHIPPED_SKETCH_SETTINGS.marker));
  });

  it('leaves a recorded pick alone, and still learns what the theme holds', () => {
    setSketch('pencil');
    decided();

    seedSketchFromTheme(TUNED);

    expect(get(sketchSettings)).toEqual(SHIPPED_SKETCH_SETTINGS.pencil);
    expect(get(unsavedSketchStyle)).toMatchObject({ id: THEME_SKETCH_ID });
  });

  it('leaves a recorded None alone, so a theme cannot re-sketch a crisp page', () => {
    setSketch(null);
    decided();

    seedSketchFromTheme(TUNED);

    expect(get(sketchEnabled)).toBe(false);
  });

  it('carries a style stored under a retired dial name, the way the dev server does', () => {
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
      expect(get(unsavedSketchStyle)).toBeNull();
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
