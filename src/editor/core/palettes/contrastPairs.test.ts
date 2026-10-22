import { describe, expect, it } from 'vitest';
import { contrastRatio } from './contrast';
import {
  closestToFailing,
  measurePair,
  PAGE_BG,
  type ContrastPair,
  type PairMeasure,
  type Resolver,
  type Rgba,
} from './contrastPairs';

function rgba(hex: string, alpha = 1): Rgba {
  return [
    parseInt(hex.slice(1, 3), 16),
    parseInt(hex.slice(3, 5), 16),
    parseInt(hex.slice(5, 7), 16),
    alpha,
  ];
}

function stubResolver(
  colors: Record<string, Rgba | Rgba[]>,
  fonts: Record<string, number> = {},
): Resolver {
  return {
    color: (name) => {
      const value = colors[name];
      if (!value) throw new Error(`no color for ${name}`);
      return Array.isArray(value[0]) ? (value as Rgba[]) : [value as Rgba];
    },
    fontPx: (name) => fonts[name],
    fontWeight: (name) => fonts[name],
  };
}

const textPair = (overrides: Partial<ContrastPair> = {}): ContrastPair => ({
  foreground: '--x-text',
  backdrop: ['--x-surface'],
  role: 'text',
  fontSize: '--font-size-md',
  ...overrides,
});

const fonts = {
  '--font-size-md': 16,
  '--font-size-lg': 18.66,
  '--font-size-2xl': 24,
  '--font-weight-bold': 700,
};

describe('measurePair', () => {
  it('measures an opaque foreground on an opaque surface', () => {
    const resolver = stubResolver({
      [PAGE_BG]: rgba('#777777'),
      '--x-surface': rgba('#ffffff'),
      '--x-text': rgba('#000000'),
    }, fonts);
    const measure = measurePair(textPair(), resolver);
    expect(measure.ratio).toBeCloseTo(21, 5);
    expect(measure.floor).toBe(4.5);
    expect(measure.large).toBe(false);
    expect(measure.passes).toBe(true);
  });

  it('composites a translucent foreground over its surface', () => {
    const resolver = stubResolver({
      [PAGE_BG]: rgba('#ffffff'),
      '--x-surface': rgba('#ffffff'),
      '--x-text': rgba('#000000', 0.5),
    }, fonts);
    const measure = measurePair(textPair(), resolver);
    expect(measure.ratio).toBeCloseTo(contrastRatio('#808080', '#ffffff'), 5);
    expect(measure.passes).toBe(false);
  });

  it('composites a translucent backdrop over the page', () => {
    const resolver = stubResolver({
      [PAGE_BG]: rgba('#ffffff'),
      '--x-surface': rgba('#000000', 0.5),
      '--x-text': rgba('#ffffff'),
    }, fonts);
    expect(measurePair(textPair(), resolver).ratio)
      .toBeCloseTo(contrastRatio('#ffffff', '#808080'), 5);
  });

  it('measures an empty backdrop against the page', () => {
    const resolver = stubResolver({
      [PAGE_BG]: rgba('#ffffff'),
      '--x-text': rgba('#000000'),
    }, fonts);
    expect(measurePair(textPair({ backdrop: [] }), resolver).ratio).toBeCloseTo(21, 5);
  });

  it('reports the worst stop of a gradient layer', () => {
    const resolver = stubResolver({
      [PAGE_BG]: rgba('#ffffff'),
      '--x-surface': [rgba('#ffffff'), rgba('#555555'), rgba('#dddddd')],
      '--x-text': rgba('#000000'),
    }, fonts);
    expect(measurePair(textPair(), resolver).ratio)
      .toBeCloseTo(contrastRatio('#000000', '#555555'), 5);
  });

  it('passes an inactive pair below its floor', () => {
    const resolver = stubResolver({
      [PAGE_BG]: rgba('#ffffff'),
      '--x-surface': rgba('#ffffff'),
      '--x-text': rgba('#aaaaaa'),
    }, fonts);
    const measure = measurePair(textPair({ inactive: true }), resolver);
    expect(measure.ratio).toBeLessThan(measure.floor);
    expect(measure.passes).toBe(true);
  });

  it('holds a non-text pair to 3:1', () => {
    const resolver = stubResolver({
      [PAGE_BG]: rgba('#ffffff'),
      '--x-surface': rgba('#ffffff'),
      '--x-icon': rgba('#888888'),
    }, fonts);
    const measure = measurePair(
      { foreground: '--x-icon', backdrop: ['--x-surface'], role: 'non-text' },
      resolver,
    );
    expect(measure.ratio).toBeGreaterThan(3);
    expect(measure.ratio).toBeLessThan(4.5);
    expect(measure.floor).toBe(3);
    expect(measure.passes).toBe(true);
  });

  it('drops the text floor to 3:1 for large text', () => {
    const resolver = stubResolver({
      [PAGE_BG]: rgba('#ffffff'),
      '--x-surface': rgba('#ffffff'),
      '--x-text': rgba('#888888'),
    }, fonts);
    const large = measurePair(textPair({ fontSize: '--font-size-2xl' }), resolver);
    const bold = measurePair(
      textPair({ fontSize: '--font-size-lg', fontWeight: '--font-weight-bold' }),
      resolver,
    );
    const body = measurePair(textPair({ fontSize: '--font-size-lg' }), resolver);
    expect([large.large, large.floor, large.passes]).toEqual([true, 3, true]);
    expect([bold.large, bold.floor, bold.passes]).toEqual([true, 3, true]);
    expect([body.large, body.floor, body.passes]).toEqual([false, 4.5, false]);
  });
});

describe('closestToFailing', () => {
  const measure = (ratio: number, floor: number, inactive = false): PairMeasure => ({
    pair: textPair({ inactive }),
    ratio,
    floor,
    large: false,
    passes: inactive || ratio >= floor,
  });

  it('picks the lowest ratio over its floor', () => {
    const nearText = measure(4.6, 4.5);
    expect(closestToFailing([measure(3.3, 3), nearText, measure(7, 4.5)])).toBe(nearText);
  });

  it('ranks an active pair above an inactive one', () => {
    const active = measure(5, 4.5);
    expect(closestToFailing([measure(1.5, 4.5, true), active])).toBe(active);
  });

  it('picks among inactive pairs when no other exists', () => {
    const lowest = measure(1.5, 4.5, true);
    expect(closestToFailing([measure(2, 4.5, true), lowest])).toBe(lowest);
  });
});
