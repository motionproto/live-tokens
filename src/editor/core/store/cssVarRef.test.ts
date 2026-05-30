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
  it('bare token name → token', () => {
    expect(cssStringToRef('--surface-brand')).toEqual({ kind: 'token', name: '--surface-brand' });
  });
  it('wrapped var() → token', () => {
    expect(cssStringToRef('var(--surface-brand)')).toEqual({ kind: 'token', name: '--surface-brand' });
  });
  it('color-mix opacity → color', () => {
    expect(cssStringToRef('color-mix(in srgb, var(--surface-brand) 40%, transparent)')).toEqual({
      kind: 'color',
      name: '--surface-brand',
      opacity: 40,
    });
  });
  it('anything else → literal', () => {
    expect(cssStringToRef('transparent')).toEqual({ kind: 'literal', value: 'transparent' });
  });
});

describe('refToCss / refToDiskValue render every kind', () => {
  const cases: Array<{ ref: CssVarRef; css: string; disk: unknown }> = [
    { ref: { kind: 'token', name: '--surface-brand' }, css: 'var(--surface-brand)', disk: '--surface-brand' },
    {
      ref: { kind: 'color', name: '--surface-brand', opacity: 40 },
      css: 'color-mix(in srgb, var(--surface-brand) 40%, transparent)',
      disk: 'color-mix(in srgb, var(--surface-brand) 40%, transparent)',
    },
    { ref: { kind: 'literal', value: 'transparent' }, css: 'transparent', disk: 'transparent' },
  ];
  for (const { ref, css, disk } of cases) {
    it(`${ref.kind} → css`, () => expect(refToCss(ref)).toBe(css));
    it(`${ref.kind} → disk`, () => expect(refToDiskValue(ref)).toEqual(disk));
  }

  it('a color ref survives disk → ref → css unchanged', () => {
    const disk = 'color-mix(in srgb, var(--surface-neutral-lower) 57%, transparent)';
    const ref = cssStringToRef(disk);
    expect(ref).toEqual({ kind: 'color', name: '--surface-neutral-lower', opacity: 57 });
    expect(refToCss(ref)).toBe(disk);
    expect(refToDiskValue(ref)).toBe(disk);
  });
});

describe('cssVarRefEqual', () => {
  it('compares color refs by name and opacity', () => {
    const a: CssVarRef = { kind: 'color', name: '--x', opacity: 50 };
    expect(cssVarRefEqual(a, { kind: 'color', name: '--x', opacity: 50 })).toBe(true);
    expect(cssVarRefEqual(a, { kind: 'color', name: '--x', opacity: 51 })).toBe(false);
    expect(cssVarRefEqual(a, { kind: 'token', name: '--x' })).toBe(false);
  });
});
