import { describe, expect, it } from 'vitest';
import { hexToOklch, oklchToHex, oklchToCssClamped, cssColorToOklch } from './oklch';
import defaultColorsAndType from '../../live-tokens/data/colors-and-type/default.json';

// The storage migration (and the reconcile anchor parser) parse hex to the
// OKLCH basis at the boundary. Those boundaries are lossy-safe only if
// oklchToHex(hexToOklch(hex)) === hex, so pin it over the on-disk (still hex)
// fixture colors the derivation round-trips plus a broad random sweep.
describe('hex → OKLCH → hex is lossless (guards the migration + reconcile boundaries)', () => {
  const fixtureHexes = (): string[] => {
    const set = new Set<string>();
    const configs = defaultColorsAndType.editorConfigs as unknown as Record<string, { baseColor?: unknown; overrides?: Record<string, unknown> }>;
    for (const config of Object.values(configs)) {
      if (typeof config?.baseColor === 'string') set.add(config.baseColor);
      for (const v of Object.values(config?.overrides ?? {})) if (typeof v === 'string') set.add(v);
    }
    return [...set];
  };

  it('round-trips every fixture base color and override', () => {
    for (const hex of fixtureHexes()) {
      const { l, c, h } = hexToOklch(hex);
      expect(oklchToHex(l, c, h)).toBe(hex);
    }
  });

  it('round-trips random 24-bit hexes', () => {
    const rnd = () =>
      '#' + Array.from({ length: 3 }, () => Math.floor(Math.random() * 256).toString(16).padStart(2, '0')).join('');
    for (let i = 0; i < 20000; i++) {
      const hex = rnd();
      const { l, c, h } = hexToOklch(hex);
      expect(oklchToHex(l, c, h)).toBe(hex);
    }
  });
});

describe('CSS serialization', () => {
  it('round-trips a color through oklch() within a least significant bit', () => {
    for (const hex of ['#fb2898', '#008582', '#70787e', '#ffffff', '#000000']) {
      const o = hexToOklch(hex);
      const css = oklchToCssClamped(o.l, o.c, o.h);
      const back = cssColorToOklch(css)!;
      expect(oklchToHex(back.l, back.c, back.h)).toBe(hex);
    }
  });

  it('clamps out-of-gamut chroma instead of clipping channels', () => {
    const css = oklchToCssClamped(0.65, 0.4, 355);
    const parsed = cssColorToOklch(css)!;
    expect(parsed.c).toBeLessThan(0.4);
    expect(parsed.h).toBeCloseTo(355, 1);
  });

  it('accepts both serializations at the input boundary', () => {
    expect(cssColorToOklch('#fb2898')).not.toBeNull();
    expect(cssColorToOklch('oklch(0.6572 0.2509 355.35)')).not.toBeNull();
    expect(cssColorToOklch('linear-gradient(180deg, #fff 0%, #000 100%)')).toBeNull();
    expect(cssColorToOklch('scroll')).toBeNull();
  });

  it('reads percentage lightness and chroma', () => {
    const pct = cssColorToOklch('oklch(65% 50% 355)')!;
    expect(pct.l).toBeCloseTo(0.65, 6);
    expect(pct.c).toBeCloseTo(0.2, 6);
  });
});

describe('achromatic serialization', () => {
  it('pins hue to 0 when chroma rounds away', () => {
    expect(oklchToCssClamped(hexToOklch('#ffffff').l, hexToOklch('#ffffff').c, hexToOklch('#ffffff').h))
      .toBe('oklch(1 0 0)');
    expect(oklchToCssClamped(hexToOklch('#000000').l, hexToOklch('#000000').c, hexToOklch('#000000').h))
      .toBe('oklch(0 0 0)');
  });
});
