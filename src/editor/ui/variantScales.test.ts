import { describe, expect, it } from 'vitest';
import { parseVariantRef } from './variantScales';

const KEYS = new Set(['tight', 'normal']);

describe('parseVariantRef', () => {
  it('selects the key of a whole-value var() under the prefix', () => {
    expect(parseVariantRef('var(--line-height-tight)', '--line-height-', KEYS)).toBe('tight');
  });

  it('selects nothing for a calc() that reads an option token', () => {
    expect(parseVariantRef('calc(var(--line-height-tight) * 2)', '--line-height-', KEYS)).toBeNull();
  });

  it('selects nothing for a token outside the prefix or the options', () => {
    expect(parseVariantRef('var(--letter-spacing-tight)', '--line-height-', KEYS)).toBeNull();
    expect(parseVariantRef('var(--line-height-relaxed)', '--line-height-', KEYS)).toBeNull();
  });
});
