import { describe, expect, it } from 'vitest';
import {
  RADIAL_BASE_PX,
  formatGradientValue,
  parseGradientValue,
  type GradientValue,
} from './gradient';

/** Every form `formatGradientValue` can emit. The radial rows have no
 *  component using them yet, which is exactly why they are pinned here. */
const EMITTED: [name: string, value: GradientValue][] = [
  [
    'linear, two stops at reduced opacity (the Panel default)',
    {
      type: 'linear',
      angle: 0,
      stops: [
        { position: 0.5, color: '--surface-neutral-low', opacity: 40 },
        { position: 100, color: '--surface-neutral-lowest', opacity: 75 },
      ],
    },
  ],
  [
    'linear, opaque stops',
    { type: 'linear', angle: 135, stops: [{ position: 0, color: '--color-brand-500' }, { position: 100, color: '--color-accent-500' }] },
  ],
  [
    'linear, negative angle and three stops',
    {
      type: 'linear',
      angle: -45,
      stops: [
        { position: 0, color: '--color-danger-500' },
        { position: 50, color: '--color-warning-500', opacity: 20 },
        { position: 100, color: '--color-success-500' },
      ],
    },
  ],
  [
    'radial, bare circle',
    { type: 'radial', angle: 0, stops: [{ position: 0, color: '--color-brand-500' }, { position: 100, color: '--color-accent-500' }] },
  ],
  [
    'radial, explicit circle radius',
    { type: 'radial', angle: 0, radius: 240, stops: [{ position: 0, color: '--color-brand-500' }, { position: 100, color: '--color-accent-500' }] },
  ],
  [
    'radial, off-center',
    { type: 'radial', angle: 0, centerX: 12.5, stops: [{ position: 0, color: '--color-brand-500' }, { position: 100, color: '--color-accent-500' }] },
  ],
  [
    'radial, ellipse with independent aspects',
    { type: 'radial', angle: 0, aspectX: 2.4, aspectY: 1.3, stops: [{ position: 0, color: '--color-brand-500' }, { position: 100, color: '--color-accent-500' }] },
  ],
  [
    'radial, ellipse stretched on one axis only',
    { type: 'radial', angle: 0, aspectX: 8, stops: [{ position: 0, color: '--color-brand-500' }, { position: 100, color: '--color-accent-500' }] },
  ],
  [
    'radial, ellipse off-center at reduced opacity',
    {
      type: 'radial',
      angle: 0,
      centerX: 80,
      aspectX: 1.5,
      aspectY: 3.2,
      stops: [
        { position: 0, color: '--surface-neutral-low', opacity: 40 },
        { position: 100, color: '--surface-neutral-lowest', opacity: 75 },
      ],
    },
  ],
  [
    'raw colour stop',
    { type: 'linear', angle: 90, stops: [{ position: 0, color: 'rebeccapurple' }, { position: 100, color: '--color-brand-500' }] },
  ],
];

describe('parseGradientValue is a right inverse of formatGradientValue', () => {
  for (const [name, value] of EMITTED) {
    it(name, () => {
      const css = formatGradientValue(value);
      const parsed = parseGradientValue(css);
      expect(parsed).not.toBeNull();
      expect(formatGradientValue(parsed!)).toBe(css);
    });
  }
});

describe('parseGradientValue', () => {
  it('recovers the Panel gradient exactly as committed', () => {
    const css =
      'linear-gradient(0deg, color-mix(in srgb, var(--surface-neutral-low) 40%, transparent) 0.5%, ' +
      'color-mix(in srgb, var(--surface-neutral-lowest) 75%, transparent) 100%)';
    expect(parseGradientValue(css)).toEqual({
      type: 'linear',
      angle: 0,
      stops: [
        { position: 0.5, color: '--surface-neutral-low', opacity: 40 },
        { position: 100, color: '--surface-neutral-lowest', opacity: 75 },
      ],
    });
  });

  it('folds an ellipse back into aspect factors against the base radius', () => {
    const css = `radial-gradient(ellipse 240.00px 130.00px at 50% 50%, var(--color-brand-500) 0%, var(--color-accent-500) 100%)`;
    expect(parseGradientValue(css)).toMatchObject({
      type: 'radial',
      aspectX: 240 / RADIAL_BASE_PX,
      aspectY: 130 / RADIAL_BASE_PX,
    });
  });

  it('drops an aspect of exactly 1, matching setGradientAspect', () => {
    const parsed = parseGradientValue(
      'radial-gradient(ellipse 400.00px 100.00px at 50% 50%, var(--color-brand-500) 0%, var(--color-accent-500) 100%)',
    );
    expect(parsed).toEqual({
      type: 'radial',
      angle: 0,
      aspectX: 4,
      stops: [
        { position: 0, color: '--color-brand-500' },
        { position: 100, color: '--color-accent-500' },
      ],
    });
  });

  it('omits centerX at the default 50', () => {
    const parsed = parseGradientValue('radial-gradient(circle at 50% 50%, var(--a) 0%, var(--b) 100%)');
    expect(parsed).not.toHaveProperty('centerX');
  });

  it('carries an explicit radius so the emitted circle stays byte-identical', () => {
    const parsed = parseGradientValue('radial-gradient(circle 240px at 50% 50%, var(--a) 0%, var(--b) 100%)');
    expect(parsed).toMatchObject({ radius: 240 });
  });

  it('returns a zero angle for a radial, which CSS never carries', () => {
    expect(parseGradientValue('radial-gradient(circle at 50% 50%, var(--a) 0%, var(--b) 100%)')).toMatchObject({ angle: 0 });
  });

  it('splits stops on top-level commas only', () => {
    const parsed = parseGradientValue(
      'linear-gradient(90deg, color-mix(in srgb, var(--a) 10%, transparent) 0%, var(--b) 100%)',
    );
    expect(parsed!.stops).toHaveLength(2);
  });

  it.each([
    ['a plain token alias', 'var(--surface-canvas-low)'],
    ['a solid gradient, which bakes to its first stop colour', 'var(--color-brand-500)'],
    ['a none gradient, which bakes to a transparent alias', 'var(--color-transparent)'],
    ['the raw transparent keyword', 'transparent'],
    ['a colour carried at reduced opacity', 'color-mix(in srgb, var(--a) 40%, transparent)'],
    ['a structural intrinsic', 'below-description'],
    ['a length literal', '16rem'],
    ['a conic gradient the format never emits', 'conic-gradient(var(--a) 0%, var(--b) 100%)'],
    ['a linear gradient with no angle', 'linear-gradient(var(--a) 0%, var(--b) 100%)'],
    ['a radial gradient with no centre', 'radial-gradient(circle, var(--a) 0%, var(--b) 100%)'],
    ['a stop with no position', 'linear-gradient(90deg, var(--a), var(--b) 100%)'],
  ])('claims nothing for %s', (_name, css) => {
    expect(parseGradientValue(css)).toBeNull();
  });
});

describe('formatGradientValue', () => {
  it('renders a solid as its first stop colour, indistinguishable from an alias', () => {
    expect(formatGradientValue({ type: 'solid', angle: 90, stops: [{ position: 0, color: '--color-brand-500' }] })).toBe(
      'var(--color-brand-500)',
    );
  });

  it('renders none as transparent', () => {
    expect(formatGradientValue({ type: 'none', angle: 90, stops: [] })).toBe('transparent');
  });

  it('ignores monochrome, which the CSS form cannot carry', () => {
    const stops: GradientValue['stops'] = [
      { position: 0, color: '--color-brand-500' },
      { position: 100, color: '--color-accent-500' },
    ];
    const css = formatGradientValue({ type: 'linear', angle: 90, stops });
    const flagged = formatGradientValue({
      type: 'linear',
      angle: 90,
      stops: [{ ...stops[0], monochrome: false }, stops[1]],
    });
    expect(flagged).toBe(css);
    expect(parseGradientValue(flagged)!.stops[0]).not.toHaveProperty('monochrome');
  });

  it('scales both semi-axes independently, so equal aspects grow the circle', () => {
    const css = formatGradientValue({
      type: 'radial',
      angle: 0,
      aspectX: 8,
      aspectY: 8,
      stops: [{ position: 0, color: '--a' }, { position: 100, color: '--b' }],
    });
    expect(css).toContain('ellipse 800.00px 800.00px');
  });
});
