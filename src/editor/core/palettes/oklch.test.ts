import { describe, expect, it } from 'vitest';
import { hexToOklch, oklchToHex } from './oklch';
import defaultColorsAndType from '../../../live-tokens/data/themes/default.json';

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
