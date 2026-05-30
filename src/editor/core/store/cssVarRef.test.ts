// @vitest-environment node
import { describe, it, expect } from 'vitest';
import { parseColorOpacity, formatColorOpacity } from '../themes/parsers/colorOpacity';
import { cssStringToRef, refToCss, refToDiskValue, cssVarRefEqual } from './cssVarRef';
import type { CssVarRef } from './editorTypes';

describe('colorOpacity serialize/parse pair', () => {
  it('round-trips token + opacity through format → parse', () => {
    const css = formatColorOpacity('--surface-neutral-lower', 70);
    expect(css).toBe('color-mix(in srgb, var(--surface-neutral-lower) 70%, transparent)');
    expect(parseColorOpacity(css)).toEqual({ name: '--surface-neutral-lower', opacity: 70 });
  });

  it('returns null for non-opacity values', () => {
    expect(parseColorOpacity('var(--surface-neutral-lower)')).toBeNull();
    expect(parseColorOpacity('--surface-neutral-lower')).toBeNull();
    expect(parseColorOpacity('transparent')).toBeNull();
    expect(parseColorOpacity('#fff')).toBeNull();
  });
});

describe('cssStringToRef classifies every value form', () => {
  it('bare token name → opaque token (no opacity field)', () => {
    const ref = cssStringToRef('--surface-brand');
    expect(ref).toEqual({ kind: 'token', name: '--surface-brand' });
    expect('opacity' in ref).toBe(false);
  });
  it('wrapped var() → opaque token (no opacity field)', () => {
    const ref = cssStringToRef('var(--surface-brand)');
    expect(ref).toEqual({ kind: 'token', name: '--surface-brand' });
    expect('opacity' in ref).toBe(false);
  });
  it('color-mix opacity → token with opacity', () => {
    expect(cssStringToRef('color-mix(in srgb, var(--surface-brand) 40%, transparent)')).toEqual({
      kind: 'token',
      name: '--surface-brand',
      opacity: 40,
    });
  });
  it('anything else → literal', () => {
    expect(cssStringToRef('transparent')).toEqual({ kind: 'literal', value: 'transparent' });
  });
});

describe('refToCss / refToDiskValue render every kind', () => {
  const cases: Array<{ label: string; ref: CssVarRef; css: string; disk: unknown }> = [
    { label: 'opaque token', ref: { kind: 'token', name: '--surface-brand' }, css: 'var(--surface-brand)', disk: '--surface-brand' },
    {
      label: 'token with opacity',
      ref: { kind: 'token', name: '--surface-brand', opacity: 40 },
      css: 'color-mix(in srgb, var(--surface-brand) 40%, transparent)',
      disk: 'color-mix(in srgb, var(--surface-brand) 40%, transparent)',
    },
    { label: 'literal', ref: { kind: 'literal', value: 'transparent' }, css: 'transparent', disk: 'transparent' },
  ];
  for (const { label, ref, css, disk } of cases) {
    it(`${label} → css`, () => expect(refToCss(ref)).toBe(css));
    it(`${label} → disk`, () => expect(refToDiskValue(ref)).toEqual(disk));
  }

  it('a translucent colour survives disk → ref → css unchanged', () => {
    const disk = 'color-mix(in srgb, var(--surface-neutral-lower) 57%, transparent)';
    const ref = cssStringToRef(disk);
    expect(ref).toEqual({ kind: 'token', name: '--surface-neutral-lower', opacity: 57 });
    expect(refToCss(ref)).toBe(disk);
    expect(refToDiskValue(ref)).toBe(disk);
  });

  it('opacity 100 collapses to a bare token (never color-mix at 100%)', () => {
    const ref: CssVarRef = { kind: 'token', name: '--surface-brand', opacity: 100 };
    expect(refToCss(ref)).toBe('var(--surface-brand)');
    expect(refToDiskValue(ref)).toBe('--surface-brand');
  });
});

describe('cssVarRefEqual', () => {
  it('compares token refs by name and opacity', () => {
    const a: CssVarRef = { kind: 'token', name: '--x', opacity: 50 };
    expect(cssVarRefEqual(a, { kind: 'token', name: '--x', opacity: 50 })).toBe(true);
    expect(cssVarRefEqual(a, { kind: 'token', name: '--x', opacity: 51 })).toBe(false);
    expect(cssVarRefEqual(a, { kind: 'token', name: '--x' })).toBe(false);
  });
  it('treats absent opacity as opaque (100)', () => {
    expect(cssVarRefEqual({ kind: 'token', name: '--x' }, { kind: 'token', name: '--x', opacity: 100 })).toBe(true);
  });
});
