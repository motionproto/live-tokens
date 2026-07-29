import { describe, expect, it } from 'vitest';
import {
  renameBackgroundPaletteKey,
  renameBackgroundHarmonyFamily,
} from './2026-07-29-background-palette-to-canvas';

describe('renameBackgroundPaletteKey', () => {
  it('moves the Background entry to Canvas, leaving other families untouched', () => {
    const out = renameBackgroundPaletteKey({ Brand: 1, Background: 2, Accent: 3 });
    expect(out).toEqual({ Brand: 1, Accent: 3, Canvas: 2 });
  });

  it('is a no-op when there is no Background key', () => {
    const input = { Brand: 1, Canvas: 2 };
    expect(renameBackgroundPaletteKey(input)).toBe(input);
  });

  it('is idempotent', () => {
    const once = renameBackgroundPaletteKey({ Background: 2 });
    expect(renameBackgroundPaletteKey(once)).toEqual({ Canvas: 2 });
  });

  it('keeps the already-renamed entry when a file carries both keys', () => {
    expect(renameBackgroundPaletteKey({ Background: 'old', Canvas: 'new' })).toEqual({ Canvas: 'new' });
  });
});

describe('renameBackgroundHarmonyFamily', () => {
  it('renames a bound Background axis and preserves its hue', () => {
    const out = renameBackgroundHarmonyFamily([
      { family: 'Brand', hue: 10 },
      { family: 'Background', hue: 20 },
      { family: null, hue: 30 },
    ]);
    expect(out).toEqual([
      { family: 'Brand', hue: 10 },
      { family: 'Canvas', hue: 20 },
      { family: null, hue: 30 },
    ]);
  });

  it('passes a non-array through so an absent field still reaches the sanitizer', () => {
    expect(renameBackgroundHarmonyFamily(undefined)).toBeUndefined();
  });
});
