import { describe, expect, it } from 'vitest';
import { curveSummary } from './curveSummary';
import { makeAnchor } from '../curveEngine';

describe('curveSummary', () => {
  const defaults = [makeAnchor(0, 0, 30), makeAnchor(100, 0, 30)];

  it('reads "default" when anchors match the defaults and offset is zero', () => {
    expect(curveSummary([makeAnchor(0, 0, 30), makeAnchor(100, 0, 30)], defaults, 0)).toBe('default');
  });

  it('reads the y range, not first-to-last, for a peak whose endpoints match the defaults', () => {
    const peak = [makeAnchor(0, 0, 15), makeAnchor(50, 30, 15), makeAnchor(100, 0, 15)];
    expect(curveSummary(peak, defaults, 0)).toBe('0 to 30');
  });

  it('appends a signed offset suffix, with unit, when the offset is non-zero', () => {
    expect(curveSummary(defaults, defaults, 12, '°')).toBe('0 to 0° offset +12°');
    expect(curveSummary(defaults, defaults, -5, '°')).toBe('0 to 0° offset -5°');
  });

  it('rounds anchor y values in the range so a pinned base anchor cannot print a raw float', () => {
    const pinned = [makeAnchor(0, 95, 5), makeAnchor(37.5, 95.68627450980392, 15), makeAnchor(100, 8, 5)];
    expect(curveSummary(pinned, defaults, 0)).toBe('8 to 96');
  });

  it('treats anchors differing only in key order as equal (no JSON.stringify key-order trap)', () => {
    const reordered = defaults.map((a) => ({ y: a.y, x: a.x, outDy: a.outDy, outDx: a.outDx, inDy: a.inDy, inDx: a.inDx }));
    expect(curveSummary(reordered, defaults, 0)).toBe('default');
  });
});
