// @vitest-environment happy-dom

import { get } from 'svelte/store';
import { beforeEach, describe, expect, it } from 'vitest';
import { SKETCH_LOOKS, setSketch, sketchPick } from './index';
import { SKETCH_STYLES } from './sketchStyles';
import {
  openThemeSketchStyle,
  setSketchEnabled,
  setSketchPageRoot,
  sketchEnabled,
  sketchStyleName,
  updateSketchSettings,
} from './sketchStore';
import { sketchLayerInstalled } from './sketchLayer';

beforeEach(() => {
  setSketchPageRoot(document.documentElement);
  setSketchEnabled(false);
});

describe('SKETCH_LOOKS', () => {
  it('offers every shipped sketchstyle and nothing else', () => {
    expect(SKETCH_LOOKS.map((l) => l.id).sort()).toEqual(Object.keys(SKETCH_STYLES).sort());
  });

  it('carries an id setSketch accepts', () => {
    for (const look of SKETCH_LOOKS) expect(() => setSketch(look.id)).not.toThrow();
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

  it('reads adjusted for a look no shipped sketchstyle names', () => {
    openThemeSketchStyle({ ...SKETCH_STYLES.pencil, strokeWidth: 9 });

    expect(get(sketchPick)).toEqual({ state: 'adjusted' });
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
