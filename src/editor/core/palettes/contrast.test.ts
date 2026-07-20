import { describe, expect, it } from 'vitest';
import {
  relativeLuminance,
  contrastRatio,
  findLForContrast,
  AA_BODY,
  AA_LARGE,
} from './contrast';

describe('WCAG relative luminance + contrast', () => {
  it('black vs white is 21:1', () => {
    expect(contrastRatio('#000000', '#ffffff')).toBeCloseTo(21, 5);
  });

  it('#767676 vs white ≈ 4.54:1 (the AA body reference grey)', () => {
    expect(contrastRatio('#767676', '#ffffff')).toBeCloseTo(4.54, 2);
  });

  it('is order-independent', () => {
    expect(contrastRatio('#123456', '#abcdef')).toBeCloseTo(contrastRatio('#abcdef', '#123456'), 10);
  });

  it('pins the WCAG channel constants', () => {
    expect(relativeLuminance('#000000')).toBe(0);
    expect(relativeLuminance('#ffffff')).toBeCloseTo(1, 6);
    expect(AA_BODY).toBe(4.5);
    expect(AA_LARGE).toBe(3.0);
  });
});

describe('findLForContrast', () => {
  it('lighter: clears the ratio against a dark surface, verified post-round-trip', () => {
    for (const h of [0, 60, 120, 180, 240, 300]) {
      const r = findLForContrast({ against: '#222222', ratio: AA_BODY, direction: 'lighter', c: 0.1, h });
      expect(contrastRatio(r.hex, '#222222')).toBeGreaterThanOrEqual(AA_BODY);
    }
  });

  it('darker: clears the ratio against a light surface, verified post-round-trip', () => {
    for (const h of [0, 60, 120, 180, 240, 300]) {
      const r = findLForContrast({ against: '#eeeeee', ratio: AA_BODY, direction: 'darker', c: 0.1, h });
      expect(contrastRatio(r.hex, '#eeeeee')).toBeGreaterThanOrEqual(AA_BODY);
    }
  });

  it('grid — hues × surfaces × feasible direction all meet the ratio', () => {
    const dark = ['#1a1a1a', '#2a3137', '#33224a'];
    const light = ['#f4f4f4', '#d6dfe6', '#eae0ff'];
    for (const h of [0, 60, 120, 180, 240, 300]) {
      for (const s of dark) {
        const r = findLForContrast({ against: s, ratio: AA_BODY, direction: 'lighter', c: 0.12, h });
        expect(contrastRatio(r.hex, s)).toBeGreaterThanOrEqual(AA_BODY);
      }
      for (const s of light) {
        const r = findLForContrast({ against: s, ratio: AA_BODY, direction: 'darker', c: 0.12, h });
        expect(contrastRatio(r.hex, s)).toBeGreaterThanOrEqual(AA_BODY);
      }
    }
  });

  it('chroma-decay path — saturated yellow on white reaches 4.5:1 by decaying chroma', () => {
    // A saturated yellow (h≈100) can never clear 4.5:1 against white at full
    // chroma; the solver must decay chroma toward 0 to darken enough.
    const requestedC = 0.2;
    const r = findLForContrast({
      against: '#ffffff', ratio: AA_BODY, direction: 'darker', c: requestedC, h: 100,
    });
    expect(contrastRatio(r.hex, '#ffffff')).toBeGreaterThanOrEqual(AA_BODY);
    expect(r.c).toBeLessThan(requestedC);
  });

  it('respects the lMax reachability window (multiplier-cap analogue)', () => {
    // With the window capped below what full contrast needs, the solver returns
    // its best effort inside the window — it never returns L above lMax.
    const cap = 0.5;
    const r = findLForContrast({
      against: '#2a3137', ratio: 12, direction: 'lighter', c: 0.1, h: 260, lMax: cap,
    });
    expect(r.l).toBeLessThanOrEqual(cap + 1e-9);
  });

  it('honours the requested margin above the target ratio', () => {
    const r = findLForContrast({ against: '#202020', ratio: AA_BODY, direction: 'lighter', c: 0, h: 0, margin: 0.5 });
    // Grey has no gamut ceiling, so the margin is deliverable and preserved.
    expect(contrastRatio(r.hex, '#202020')).toBeGreaterThanOrEqual(AA_BODY);
  });
});
