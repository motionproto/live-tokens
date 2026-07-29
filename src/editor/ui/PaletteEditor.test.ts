// @vitest-environment happy-dom
import { beforeEach, describe, expect, it } from 'vitest';
import { get } from 'svelte/store';
import PaletteEditor from './PaletteEditor.svelte';
import {
  editorState,
  mutate,
  beginScope,
  commitScope,
  cancelScope,
  beginSliderGesture,
  setPaletteConfig,
  undo,
  __resetForTests,
} from '../core/store/editorStore';
import type { PaletteConfig } from '../core/themes/themeTypes';
import { hexToOklch as c } from '../core/palettes/oklch';
import { mount, unmount } from "svelte";

function makePaletteConfig(baseColor: string): PaletteConfig {
  return {
    baseColor: c(baseColor),
    lightnessCurve: [],
    saturationCurve: [],
    scaleCurves: {},
    curveOffset: {},
    overrides: {},
    snappedScales: [],
  };
}

const sessionOpts = { label: 'palette session', collapseToOne: true, clipUndoFloor: true } as const;

beforeEach(() => {
  __resetForTests();
  document.body.innerHTML = '';
});

describe('PaletteEditor — store-first integration', () => {
  // Mounts the real component to exercise the $: derivations off the store
  // and prove the sync/auto-persist round-trip has been removed. If the
  // previous two-writer loop were reintroduced, per-tick mutations during a
  // session would be pulled back to the pre-session snapshot — this test
  // would fail.
  it('mounts against the editor store without throwing', () => {
    setPaletteConfig('Canvas', makePaletteConfig('#8d7f74'));

    const target = document.createElement('div');
    document.body.appendChild(target);

    const component = mount(PaletteEditor, {
          target,
          props: { label: 'Canvas', initialColor: c('#8d7f74') },
        });

    expect(get(editorState).palettes.Canvas.baseColor).toEqual(c('#8d7f74'));
    unmount(component);
  });

  it('per-tick store mutations are visible immediately during a session', () => {
    setPaletteConfig('Canvas', makePaletteConfig('#8d7f74'));

    const target = document.createElement('div');
    document.body.appendChild(target);
    const component = mount(PaletteEditor, {
          target,
          props: { label: 'Canvas', initialColor: c('#8d7f74') },
        });

    const session = beginScope({ ...sessionOpts });
    beginSliderGesture('drag base');

    for (const hex of ['#8c7f73', '#8b7f72', '#8a7f71']) {
      mutate('drag tick', (s) => { s.palettes.Canvas.baseColor = c(hex); });
      expect(get(editorState).palettes.Canvas.baseColor).toEqual(c(hex));
    }

    window.dispatchEvent(new Event('pointerup'));
    commitScope(session);

    expect(get(editorState).palettes.Canvas.baseColor).toEqual(c('#8a7f71'));

    undo();
    expect(get(editorState).palettes.Canvas.baseColor).toEqual(c('#8d7f74'));

    unmount(component);
  });

  it('cancel after drag snaps the store back to pre-session', () => {
    setPaletteConfig('Canvas', makePaletteConfig('#8d7f74'));

    const target = document.createElement('div');
    document.body.appendChild(target);
    const component = mount(PaletteEditor, {
          target,
          props: { label: 'Canvas', initialColor: c('#8d7f74') },
        });

    const session = beginScope({ ...sessionOpts });
    mutate('drag', (s) => { s.palettes.Canvas.baseColor = c('#112233'); });
    cancelScope(session);

    expect(get(editorState).palettes.Canvas.baseColor).toEqual(c('#8d7f74'));
    unmount(component);
  });
});
