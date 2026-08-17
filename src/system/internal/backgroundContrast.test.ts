import { describe, expect, it } from 'vitest';
import { contrastTokenForBackground } from './backgroundContrast';

describe('contrastTokenForBackground', () => {
  it('uses white on dark page backgrounds', () => {
    expect(contrastTokenForBackground('#15142b')).toBe('--color-white');
  });

  it('uses black on light page backgrounds', () => {
    expect(contrastTokenForBackground('rgb(244, 246, 248)')).toBe('--color-black');
  });

  it('checks every stop in a gradient', () => {
    expect(contrastTokenForBackground(
      'linear-gradient(180deg, #f8f8f8 0%, #c8c8c8 100%)',
    )).toBe('--color-black');
    expect(contrastTokenForBackground(
      'linear-gradient(180deg, #080808 0%, #383838 100%)',
    )).toBe('--color-white');
  });

  it('supports short hex and percentage rgb syntax', () => {
    expect(contrastTokenForBackground('#fff')).toBe('--color-black');
    expect(contrastTokenForBackground('rgb(0% 0% 0%)')).toBe('--color-white');
  });
});
