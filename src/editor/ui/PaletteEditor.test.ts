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
import { mount, unmount, flushSync } from "svelte";
import { defaultPaletteConfig, DEFAULT_PALETTE_LIGHTNESS, DEFAULT_PALETTE_HUE, stepIndexToX } from './palette/paletteMath';
import { sampleCurve } from './curveEngine';

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

describe('PaletteEditor — hue curve section', () => {
  let target: HTMLDivElement;
  let component: ReturnType<typeof mount> | null = null;

  beforeEach(() => {
    target = document.createElement('div');
    document.body.appendChild(target);
  });

  function mountEditor(label: string) {
    component = mount(PaletteEditor, { target, props: { label, initialColor: c('#8d7f74') } });
    flushSync();
  }

  const button = (label: string) =>
    Array.from(target.querySelectorAll('button')).find((b) => b.textContent?.includes(label))!;
  const curveSection = (label: string) =>
    Array.from(target.querySelectorAll('.curve-section')).find((el) => el.querySelector('.curve-section-label')?.textContent === label)!;
  const anchoredHex = () =>
    target.querySelector('.swatch.gray-swatch.anchored')!.closest('.step-column')!.querySelector('.step-hex')!.textContent!.trim();

  function cleanup() {
    if (component) { unmount(component); component = null; }
  }

  it('renders three curve sections, Hue closed and Saturation/Lightness open', () => {
    setPaletteConfig('Canvas', makePaletteConfig('#8d7f74'));
    mountEditor('Canvas');

    button('Edit').click();
    flushSync();

    const expandedFor = (label: string) =>
      curveSection(label).querySelector('.curve-section-toggle')!.getAttribute('aria-expanded');
    expect(target.querySelectorAll('.curve-section-toggle')).toHaveLength(3);
    expect(expandedFor('Hue ±30°')).toBe('false');
    expect(expandedFor('Saturation')).toBe('true');
    expect(expandedFor('Lightness')).toBe('true');

    cleanup();
  });

  it('materializes the hue field on first edit, leaving the anchored swatch unchanged', () => {
    // Anchored at the step whose x is 50, where the "Ramp up" template crosses
    // zero, so a verbatim swatch after the edit isn't a degenerate flat-curve case.
    const midL = sampleCurve(DEFAULT_PALETTE_LIGHTNESS(), stepIndexToX(5)) / 100;
    const config = defaultPaletteConfig({ baseColor: { l: midL, c: 0.1, h: 210 } });
    expect(config.anchorPlacement?.step).toBe(5);
    setPaletteConfig('Canvas', config);
    mountEditor('Canvas');

    button('Edit').click();
    flushSync();
    curveSection('Hue ±30°').querySelector<HTMLButtonElement>('.curve-section-toggle')!.click();
    flushSync();

    expect(get(editorState).palettes.Canvas.hueCurve).toBeUndefined();
    const before = anchoredHex();

    curveSection('Hue ±30°').querySelector<HTMLButtonElement>('.curve-template-btn[title="Ramp up"]')!.click();
    flushSync();

    expect(get(editorState).palettes.Canvas.hueCurve).toBeDefined();
    expect(anchoredHex()).toBe(before);

    cleanup();
  });

  it('reset writes the flat default and clears the hue offset, leaving the field present (RJC 7)', () => {
    setPaletteConfig('Canvas', makePaletteConfig('#8d7f74'));
    mountEditor('Canvas');

    button('Edit').click();
    flushSync();
    curveSection('Hue ±30°').querySelector<HTMLButtonElement>('.curve-section-toggle')!.click();
    flushSync();
    curveSection('Hue ±30°').querySelector<HTMLButtonElement>('.curve-template-btn[title="Ramp up"]')!.click();
    flushSync();
    mutate('set offset', (s) => { s.palettes.Canvas.curveOffset = { ...s.palettes.Canvas.curveOffset, hue: 10 }; });
    flushSync();

    curveSection('Hue ±30°').querySelector<HTMLButtonElement>('[title="Reset to default"]')!.click();
    flushSync();

    expect(get(editorState).palettes.Canvas.hueCurve).toEqual(DEFAULT_PALETTE_HUE());
    expect(get(editorState).palettes.Canvas.curveOffset?.hue).toBe(0);

    cleanup();
  });

  it('a theme fixture saved without hueCurve round-trips through save and load still absent', () => {
    const saved = makePaletteConfig('#8d7f74');
    expect('hueCurve' in saved).toBe(false);

    // JSON is the on-disk theme format; round-tripping through it is the
    // faithful stand-in for a save/load cycle without a network layer.
    const loaded = JSON.parse(JSON.stringify(saved)) as PaletteConfig;
    setPaletteConfig('Canvas', loaded);
    mountEditor('Canvas');

    expect(get(editorState).palettes.Canvas.hueCurve).toBeUndefined();

    cleanup();
  });
});
