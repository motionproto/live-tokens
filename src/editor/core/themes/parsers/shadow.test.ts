import { describe, expect, it } from 'vitest';
import { parseShadowCss, shadowTokenCss } from './shadow';

const base = { x: 3, y: 3, blur: 6, hue: 237, saturation: 18, lightness: 3, opacity: 0.9 };

describe('shadow token CSS form', () => {
  it('omits the spread slot when the spread is zero', () => {
    expect(shadowTokenCss({ ...base, spread: 0 })).toBe('3px 3px 6px hsla(237, 18%, 3%, 0.9)');
  });

  it('writes the spread slot when the spread is set', () => {
    expect(shadowTokenCss({ ...base, spread: -2 })).toBe('3px 3px 6px -2px hsla(237, 18%, 3%, 0.9)');
  });

  // The three-length form is the one `filter: drop-shadow()` accepts, which is
  // what lets a component cast the same token from an image's alpha.
  it('a zero-spread token is legal as a drop-shadow argument', () => {
    const lengths = shadowTokenCss({ ...base, spread: 0 }).split(' hsla')[0].split(/\s+/);
    expect(lengths).toHaveLength(3);
  });

  it('reads both forms back, defaulting a missing spread to zero', () => {
    expect(parseShadowCss('--shadow-md', '3px 3px 6px hsla(237, 18%, 3%, 0.9)')?.spread).toBe(0);
    expect(parseShadowCss('--shadow-md', '3px 3px 6px -2px hsla(237, 18%, 3%, 0.9)')?.spread).toBe(-2);
  });

  it('round-trips a four-length legacy value into the collapsed form', () => {
    const tok = parseShadowCss('--shadow-md', '3px 3px 6px 0px hsla(237, 18%, 3%, 0.9)');
    expect(tok).not.toBeNull();
    expect(shadowTokenCss(tok!)).toBe('3px 3px 6px hsla(237, 18%, 3%, 0.9)');
  });
});
