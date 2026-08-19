// @vitest-environment happy-dom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { mount, unmount, flushSync } from 'svelte';
import BezierCurveEditor from './BezierCurveEditor.svelte';
import {
  hueCurveConfig, lightnessCurveConfig, saturationCurveConfig,
  serializeCurve, makeAnchor, isAutoSmoothCurve, sampleCurve,
} from './curveEngine';

// The clipboard is deliberately cross-editor (RJC in the hue-curve plan): a
// curve copied from Saturation's 0-200 axis must not bulge Hue's axis past its
// clamp when pasted, since hue derivation wraps rather than clamps out-of-range.
describe('BezierCurveEditor paste clamps to the target axis', () => {
  let target: HTMLDivElement;
  let component: ReturnType<typeof mount> | null = null;
  let anchorsChanges: Array<ReturnType<typeof makeAnchor>[]>;

  beforeEach(() => {
    target = document.createElement('div');
    document.body.appendChild(target);
    anchorsChanges = [];
  });

  afterEach(() => {
    if (component) { unmount(component); component = null; }
    vi.unstubAllGlobals();
    document.body.removeChild(target);
  });

  it('clamps pasted anchor and handle y values to the axis bounds', async () => {
    const saturationShaped = [
      makeAnchor(0, 20, 30),
      { ...makeAnchor(50, 190, 20), outDy: -60 },
      makeAnchor(100, 5, 30),
    ];
    vi.stubGlobal('navigator', {
      ...navigator,
      clipboard: { readText: async () => serializeCurve(saturationShaped, 0, false) },
    });

    component = mount(BezierCurveEditor, {
      target,
      props: {
        anchors: [makeAnchor(0, 0, 30), makeAnchor(100, 0, 30)],
        cfg: hueCurveConfig,
        stepCount: 11,
        onAnchorsChange: (a: typeof saturationShaped) => anchorsChanges.push(a),
      },
    });
    flushSync();

    target.querySelector<HTMLButtonElement>('[title="Paste curve"]')!.click();
    await Promise.resolve();
    await Promise.resolve();

    expect(anchorsChanges).toHaveLength(1);
    const pasted = anchorsChanges[0];
    for (const a of pasted) {
      expect(a.y).toBeGreaterThanOrEqual(hueCurveConfig.yMin);
      expect(a.y).toBeLessThanOrEqual(hueCurveConfig.yMax);
      expect(a.y + a.inDy).toBeGreaterThanOrEqual(hueCurveConfig.yMin);
      expect(a.y + a.inDy).toBeLessThanOrEqual(hueCurveConfig.yMax);
      expect(a.y + a.outDy).toBeGreaterThanOrEqual(hueCurveConfig.yMin);
      expect(a.y + a.outDy).toBeLessThanOrEqual(hueCurveConfig.yMax);
    }
  });

  it('leaves an in-range paste (matching axis) untouched', async () => {
    const inRange = [makeAnchor(0, 50, 30), makeAnchor(100, 150, 30)];
    vi.stubGlobal('navigator', {
      ...navigator,
      clipboard: { readText: async () => serializeCurve(inRange, 0, false) },
    });

    component = mount(BezierCurveEditor, {
      target,
      props: {
        anchors: [makeAnchor(0, 0, 30), makeAnchor(100, 0, 30)],
        cfg: saturationCurveConfig,
        stepCount: 11,
        onAnchorsChange: (a: typeof inRange) => anchorsChanges.push(a),
      },
    });
    flushSync();

    target.querySelector<HTMLButtonElement>('[title="Paste curve"]')!.click();
    await Promise.resolve();
    await Promise.resolve();

    expect(anchorsChanges).toHaveLength(1);
    expect(anchorsChanges[0]).toEqual(inRange);
  });
});

describe('BezierCurveEditor auto smooth switch', () => {
  let target: HTMLDivElement;
  let component: ReturnType<typeof mount> | null = null;

  beforeEach(() => {
    target = document.createElement('div');
    document.body.appendChild(target);
  });

  afterEach(() => {
    if (component) { unmount(component); component = null; }
    document.body.removeChild(target);
  });

  const pill = () =>
    [...target.querySelectorAll('button')].find((b) => b.textContent?.includes('Auto smooth'))!;

  it('re-derives the tangents when switched on, discarding hand-dragged handles', () => {
    const handHeld = [makeAnchor(0, 95, 5), makeAnchor(100, 8, 5)];
    const anchorsChanges: (typeof handHeld)[] = [];
    const autoChanges: boolean[] = [];

    component = mount(BezierCurveEditor, {
      target,
      props: {
        anchors: handHeld,
        cfg: lightnessCurveConfig,
        stepCount: 11,
        autoSmooth: false,
        onAnchorsChange: (a: typeof handHeld) => anchorsChanges.push(a),
        onAutoSmoothChange: (v: boolean) => autoChanges.push(v),
      },
    });
    flushSync();

    pill().click();
    flushSync();

    expect(autoChanges).toEqual([true]);
    expect(isAutoSmoothCurve(anchorsChanges[0])).toBe(true);
    expect(sampleCurve(handHeld, 25)).toBeCloseTo(74.3, 1);
    expect(sampleCurve(anchorsChanges[0], 25)).toBeCloseTo(73.25, 1);
  });

  it('leaves the shape alone when switched off', () => {
    const auto = [makeAnchor(0, 100, 30), makeAnchor(100, 100, 30)];
    const anchorsChanges: (typeof auto)[] = [];
    const autoChanges: boolean[] = [];

    component = mount(BezierCurveEditor, {
      target,
      props: {
        anchors: auto,
        cfg: saturationCurveConfig,
        stepCount: 11,
        autoSmooth: true,
        onAnchorsChange: (a: typeof auto) => anchorsChanges.push(a),
        onAutoSmoothChange: (v: boolean) => autoChanges.push(v),
      },
    });
    flushSync();

    pill().click();
    flushSync();

    expect(autoChanges).toEqual([false]);
    expect(anchorsChanges).toHaveLength(0);
  });
});
