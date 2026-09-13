import { describe, it, expect } from 'vitest';
// @ts-expect-error — plain .mjs module, no types
import { geometryScaleOfProperty, resolveGeometryLiteral } from './lib/geometry.mjs';

type Candidate = { token: string; px: number; shift: number };
type Resolved = { scale: string | null; literals: { value: string; px: number; candidates: Candidate[] }[]; auto: boolean };

const SPACE = [
  ['--space-0', '0'],
  ['--space-2', '0.125rem'],
  ['--space-4', '0.25rem'],
  ['--space-8', '0.5rem'],
  ['--space-12', '0.75rem'],
  ['--space-16', '1rem'],
  ['--space-20', '1.25rem'],
  ['--space-24', '1.5rem'],
  ['--space-full', '100%'],
].map(([name, value]) => ({ name, value }));

const RADIUS = [
  ['--radius-md', '0.25rem'],
  ['--radius-lg', '0.375rem'],
  ['--radius-xl', '0.5rem'],
  ['--radius-full', '9999px'],
].map(([name, value]) => ({ name, value }));

const SHADOW = [{ name: '--shadow-sm', value: '1px 1px 2px hsla(237, 18%, 3%, 0.9)' }];

const resolve = (value: string, scale: string, tokens: { name: string; value: string }[]): Resolved =>
  resolveGeometryLiteral(value, scale, tokens);

describe('resolveGeometryLiteral', () => {
  it('leaves a tie to the user', () => {
    const r = resolve('14px', 'space', SPACE);
    expect(r.literals[0].candidates).toEqual([
      { token: '--space-12', px: 12, shift: -2 },
      { token: '--space-16', px: 16, shift: 2 },
    ]);
    expect(r.auto).toBe(false);
  });

  it('names the one nearest step and how far it moves', () => {
    const r = resolve('15px', 'space', SPACE);
    expect(r.literals[0].candidates).toEqual([{ token: '--space-16', px: 16, shift: 1 }]);
    expect(r.auto).toBe(true);
  });

  it('reads a rem literal at 16', () => {
    const r = resolve('1rem', 'space', SPACE);
    expect(r.literals[0]).toEqual({ value: '1rem', px: 16, candidates: [{ token: '--space-16', px: 16, shift: 0 }] });
  });

  it('resolves each term of a shorthand on its own', () => {
    const r = resolve('8px 16px', 'space', SPACE);
    expect(r.literals.map((l) => l.candidates[0].token)).toEqual(['--space-8', '--space-16']);
    expect(r.auto).toBe(true);
  });

  it('reaches a term inside calc()', () => {
    const r = resolve('calc(100% - 20px)', 'space', SPACE);
    expect(r.literals).toEqual([
      { value: '20px', px: 20, candidates: [{ token: '--space-20', px: 20, shift: 0 }] },
    ]);
    expect(r.auto).toBe(true);
  });

  it('resolves a radius on the radius scale', () => {
    expect(resolve('6px', 'radius', RADIUS).literals[0].candidates).toEqual([
      { token: '--radius-lg', px: 6, shift: 0 },
    ]);
  });

  it('offers no candidate from a scale whose steps are not single lengths', () => {
    const r = resolve('0 0 4px', 'shadow', SHADOW);
    expect(r.literals[0].candidates).toEqual([]);
    expect(r.auto).toBe(false);
  });

  it('ignores a zero and a literal inside a var() fallback', () => {
    expect(resolve('var(--space-8, 3px)', 'space', SPACE).literals).toEqual([]);
    expect(resolve('0px', 'space', SPACE).literals).toEqual([]);
  });
});

describe('geometryScaleOfProperty', () => {
  it.each([
    ['padding', 'space'],
    ['gap', 'space'],
    ['inset', 'space'],
    ['border-radius', 'radius'],
    ['border', 'border-width'],
    ['outline-width', 'border-width'],
    ['box-shadow', 'shadow'],
    ['width', null],
  ])('%s draws from %s', (prop, scale) => {
    expect(geometryScaleOfProperty(prop)).toBe(scale);
  });
});
