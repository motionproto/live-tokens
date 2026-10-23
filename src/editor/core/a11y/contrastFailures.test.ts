import { describe, expect, it } from 'vitest';
import { PAGE_BG, type ContrastPair, type Resolver, type Rgba } from '../palettes/contrastPairs';
import { contrastFailures } from './contrastFailures';

const COLORS: Record<string, Rgba> = {
  [PAGE_BG]: [255, 255, 255, 1],
  '--x-surface': [255, 255, 255, 1],
  '--x-dark-text': [0, 0, 0, 1],
  '--x-pale-text': [200, 200, 200, 1],
};

const resolver: Resolver = {
  color: (name) => [COLORS[name]],
  fontPx: () => 16,
  fontWeight: () => 400,
};

const pair = (foreground: string, extra: Partial<ContrastPair> = {}): ContrastPair => ({
  foreground,
  backdrop: ['--x-surface'],
  role: 'text',
  ...extra,
});

describe('contrastFailures', () => {
  it('keeps each pair below its floor, named by component and foreground', () => {
    const failures = contrastFailures([
      { component: 'x', pair: pair('--x-dark-text') },
      { component: 'x', pair: pair('--x-pale-text', { context: 'body' }) },
    ], resolver);
    expect(failures).toHaveLength(1);
    expect(failures[0]).toMatchObject({
      component: 'x',
      variable: '--x-pale-text',
      backdrop: ['--x-surface'],
      role: 'text',
      floor: 4.5,
      context: 'body',
    });
    expect(failures[0].ratio).toBeLessThan(4.5);
  });

  it('leaves out an inactive pair however low it measures', () => {
    expect(contrastFailures([{ component: 'x', pair: pair('--x-pale-text', { inactive: true }) }], resolver)).toEqual([]);
  });
});
