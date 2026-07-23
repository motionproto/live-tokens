import { describe, expect, it } from 'vitest';
import { HARMONY_MODE_BUTTONS } from './harmonyModeIcons';
import type { HarmonyMode } from '../../core/palettes/colorHarmony';

const ALL_MODES: HarmonyMode[] = [
  'monochromatic',
  'analogous',
  'complementary',
  'split-complementary',
  'triadic',
  'tetradic',
  'square',
  'compound',
  'custom',
];

describe('HARMONY_MODE_BUTTONS', () => {
  it('has exactly 9 entries', () => {
    expect(HARMONY_MODE_BUTTONS).toHaveLength(9);
  });

  it('covers every HarmonyMode union member exactly once', () => {
    const modes = HARMONY_MODE_BUTTONS.map((b) => b.mode);
    expect(new Set(modes).size).toBe(modes.length);
    expect(modes.slice().sort()).toEqual(ALL_MODES.slice().sort());
  });

  it('follows the decision-4 row order', () => {
    expect(HARMONY_MODE_BUTTONS.map((b) => b.mode)).toEqual(ALL_MODES);
  });

  it.each(HARMONY_MODE_BUTTONS)('$mode icon stays inside the cleanup spec', ({ svg }) => {
    expect(svg).toContain('viewBox="0 0 256 256"');
    expect(svg).toContain('currentColor');
    expect(svg).not.toContain('#000000');
    expect(svg).not.toContain('#E5E5E5');
    expect(svg).not.toContain('<rect');
  });
});
