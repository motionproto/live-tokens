import { describe, expect, it } from 'vitest';
import { freshName, layerFlushTarget } from './layerFlush';

describe('freshName', () => {
  it('takes the base name when nothing holds it', () => {
    expect(freshName('my-colors', new Set())).toBe('my-colors');
  });

  it('steps past the files already on disk', () => {
    expect(freshName('my-colors', new Set(['my-colors', 'my-colors_01']))).toBe('my-colors_02');
  });
});

describe('layerFlushTarget', () => {
  it('writes back to the active file under its own name', () => {
    expect(layerFlushTarget('my-colors', 'My Colors', ['my-colors'])).toEqual({
      fileName: 'my-colors',
      displayName: 'My Colors',
    });
  });

  it('forks the protected default to a file of the user’s own', () => {
    expect(layerFlushTarget('default', 'Default', ['default'])).toEqual({
      fileName: 'my-colors',
      displayName: 'My Colors',
    });
  });

  it('names the fork past an earlier one', () => {
    expect(layerFlushTarget('default', 'Default', ['default', 'my-colors']).fileName).toBe(
      'my-colors_01',
    );
  });
});
