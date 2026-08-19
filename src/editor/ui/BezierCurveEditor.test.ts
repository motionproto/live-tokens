// @vitest-environment happy-dom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { mount, unmount, flushSync } from 'svelte';
import BezierCurveEditor from './BezierCurveEditor.svelte';
import { hueCurveConfig, saturationCurveConfig, serializeCurve, makeAnchor } from './curveEngine';

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
      clipboard: { readText: async () => serializeCurve(saturationShaped, 0) },
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
      clipboard: { readText: async () => serializeCurve(inRange, 0) },
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
