import { describe, expect, it } from 'vitest';
import { freshName } from './themeService';

describe('freshName', () => {
  it('takes the base name when nothing holds it', () => {
    expect(freshName('my-theme', new Set())).toBe('my-theme');
  });

  it('steps past the themes already on disk', () => {
    expect(freshName('my-theme', new Set(['my-theme', 'my-theme_01']))).toBe('my-theme_02');
  });
});
