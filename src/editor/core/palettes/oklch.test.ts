import { describe, expect, it } from 'vitest';
import { hexToOklch, oklchToHex } from './oklch';
import { PALETTE_SPECS } from './paletteDerivation';
import type { PaletteConfig } from '../themes/themeTypes';
import defaultTheme from '../../../live-tokens/data/themes/default.json';

// Wave 1 parses hex overrides to color-kind at the derive boundary and
// re-serializes them through oklchToHex. That pass-through is byte-safe only if
// oklchToHex(hexToOklch(hex)) === hex, so pin it over the fixture colors the
// derivation actually round-trips plus a broad random sweep.
describe('hex → OKLCH → hex is lossless (guards the Wave 1 override pass-through)', () => {
  const fixtureHexes = (): string[] => {
    const set = new Set<string>();
    for (const spec of PALETTE_SPECS) set.add(spec.initialColor);
    const configs = defaultTheme.editorConfigs as unknown as Record<string, PaletteConfig>;
    for (const config of Object.values(configs)) {
      if (typeof config?.baseColor === 'string') set.add(config.baseColor);
      for (const v of Object.values(config?.overrides ?? {})) set.add(v);
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
