import { describe, expect, it } from 'vitest';
import { parsePruneArgs, evaluatePruneMarker } from './parser';

describe('parsePruneArgs', () => {
  it('parses == scalar', () => {
    expect(parsePruneArgs('sectiondivider hairline == above-label')).toEqual({
      component: 'sectiondivider',
      key: 'hairline',
      op: 'eq',
      value: 'above-label',
    });
  });

  it('parses != scalar', () => {
    expect(parsePruneArgs('sectiondivider eyebrow-display != none')).toEqual({
      component: 'sectiondivider',
      key: 'eyebrow-display',
      op: 'neq',
      value: 'none',
    });
  });

  it('parses in list', () => {
    expect(parsePruneArgs('sectiondivider hairline in [above-label, through-label, below-label]'))
      .toEqual({
        component: 'sectiondivider',
        key: 'hairline',
        op: 'in',
        value: ['above-label', 'through-label', 'below-label'],
      });
  });

  it('strips quotes from values', () => {
    expect(parsePruneArgs('foo bar == "quoted"')).toMatchObject({ value: 'quoted' });
    expect(parsePruneArgs("foo bar == 'single'")).toMatchObject({ value: 'single' });
  });

  it('throws on unknown operator', () => {
    expect(() => parsePruneArgs('foo bar ~~ baz')).toThrow(/unknown operator/);
  });

  it('throws on missing value for scalar op', () => {
    expect(() => parsePruneArgs('foo bar ==')).toThrow();
  });

  it('throws on empty list', () => {
    expect(() => parsePruneArgs('foo bar in []')).toThrow(/empty list/);
  });

  it('throws on malformed in list', () => {
    expect(() => parsePruneArgs('foo bar in nothing')).toThrow(/\[a, b, c\] list/);
  });

  it('parses trailing default=<v>', () => {
    expect(parsePruneArgs('sectiondivider hairline == above-label default=none')).toEqual({
      component: 'sectiondivider',
      key: 'hairline',
      op: 'eq',
      value: 'above-label',
      default: 'none',
    });
  });

  it('parses default=<v> with != operator', () => {
    expect(parsePruneArgs('sectiondivider eyebrow-display != none default=block')).toMatchObject({
      op: 'neq',
      value: 'none',
      default: 'block',
    });
  });

  it('parses default=<v> with in operator', () => {
    expect(parsePruneArgs('foo bar in [a, b] default=c')).toMatchObject({
      op: 'in',
      value: ['a', 'b'],
      default: 'c',
    });
  });
});

describe('evaluatePruneMarker', () => {
  it('eq matches', () => {
    expect(evaluatePruneMarker(
      { component: 'x', key: 'k', op: 'eq', value: 'a' },
      'a',
    )).toBe(true);
    expect(evaluatePruneMarker(
      { component: 'x', key: 'k', op: 'eq', value: 'a' },
      'b',
    )).toBe(false);
  });

  it('neq matches inverse', () => {
    expect(evaluatePruneMarker(
      { component: 'x', key: 'k', op: 'neq', value: 'none' },
      'block',
    )).toBe(true);
    expect(evaluatePruneMarker(
      { component: 'x', key: 'k', op: 'neq', value: 'none' },
      'none',
    )).toBe(false);
  });

  it('in matches list membership', () => {
    expect(evaluatePruneMarker(
      { component: 'x', key: 'k', op: 'in', value: ['a', 'b'] },
      'a',
    )).toBe(true);
    expect(evaluatePruneMarker(
      { component: 'x', key: 'k', op: 'in', value: ['a', 'b'] },
      'c',
    )).toBe(false);
  });
});
