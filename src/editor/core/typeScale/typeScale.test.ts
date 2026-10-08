import { describe, expect, it } from 'vitest';
import {
  DEFAULTS,
  EDITABLE_NAMES,
  STEPS,
  STRUCTURAL_NAMES,
  recommend,
  scalePx,
  typeScaleDeclarations,
  typeScaleMediaDeclarations,
  type Step,
  type Usage,
} from './typeScale';

type Row = [usage: Usage, desktop: number[], tablet: number[], phone: number[]];

// docs/type-scales-proposal.md, "Sizes in px", steps 2xs to 2xl.
const SIZES_IN_PX: Row[] = [
  [
    'display',
    [27.8, 33.3, 40.0, 48.0, 57.6, 69.1, 82.9],
    [24.2, 27.7, 31.8, 36.5, 41.8, 47.9, 55.0],
    [22.6, 25.4, 28.5, 32.0, 35.9, 40.2, 45.1],
  ],
  [
    'heading',
    [12.3, 15.4, 19.2, 24.0, 30.0, 37.5, 46.9],
    [12.3, 15.4, 18.3, 21.7, 25.6, 30.3, 35.8],
    [12.3, 15.4, 17.9, 20.7, 23.8, 27.4, 31.5],
  ],
  [
    'body',
    [11.2, 12.6, 14.2, 16.0, 18.0, 20.2, 22.8],
    [11.2, 12.6, 14.2, 16.0, 17.5, 19.1, 20.9],
    [11.2, 12.6, 14.2, 16.0, 17.2, 18.6, 20.0],
  ],
  [
    'editorial',
    [11.2, 12.6, 14.2, 16.0, 18.0, 20.2, 22.8],
    [11.2, 12.6, 14.2, 16.0, 17.5, 19.1, 20.9],
    [11.2, 12.6, 14.2, 16.0, 17.2, 18.6, 20.0],
  ],
  [
    'code',
    [9.8, 11.1, 12.4, 14.0, 15.8, 17.7, 19.9],
    [9.8, 11.1, 12.4, 14.0, 15.8, 17.3, 18.9],
    [9.8, 11.1, 12.4, 14.0, 15.8, 17.1, 18.4],
  ],
];

// The table rounds to 0.1px and rounds the exact halves 20.25 and 15.75 in
// opposite directions, so a size passes within half a tenth either way.
function expectPx(actual: number, expected: number): void {
  expect(Math.abs(actual - expected)).toBeLessThanOrEqual(0.05 + 1e-9);
}

describe('default sizes', () => {
  for (const [usage, desktop, tablet, phone] of SIZES_IN_PX) {
    const { base, ratio } = DEFAULTS.usages[usage];
    STEPS.forEach((step: Step, i) => {
      it(`${usage}-${step} matches the proposal on every viewport`, () => {
        const d = scalePx(base, ratio, step);
        expectPx(d, desktop[i]);
        expectPx(recommend(d, DEFAULTS.compression.tablet), tablet[i]);
        expectPx(recommend(d, DEFAULTS.compression.phone), phone[i]);
      });
    });
  }
});

describe('token names', () => {
  it('splits into 275 editable and 36 structural names with no overlap', () => {
    expect(EDITABLE_NAMES.size).toBe(275);
    expect(STRUCTURAL_NAMES.size).toBe(36);
    expect([...EDITABLE_NAMES].filter((name) => STRUCTURAL_NAMES.has(name))).toEqual([]);
  });

  it('declares every name once', () => {
    const names = typeScaleDeclarations().map((d) => d.name);
    expect(names).toHaveLength(new Set(names).size);
    expect(new Set(names)).toEqual(new Set([...EDITABLE_NAMES, ...STRUCTURAL_NAMES]));
  });

  it('re-points only structural names at each breakpoint', () => {
    for (const vp of ['tablet', 'phone'] as const) {
      expect(typeScaleMediaDeclarations(vp).map((d) => d.name)).toEqual([...STRUCTURAL_NAMES]);
    }
  });
});

describe('declarations', () => {
  const value = new Map(typeScaleDeclarations().map((d) => [d.name, d.value]));

  it('builds the desktop size from the scale and the md step from the base alone', () => {
    expect(value.get('--heading-xl-desktop-font-size')).toBe(
      'calc(var(--heading-scale-base) * pow(var(--heading-scale-ratio), 2) * 1rem)',
    );
    expect(value.get('--heading-2xs-desktop-font-size')).toBe(
      'calc(var(--heading-scale-base) * pow(var(--heading-scale-ratio), -3) * 1rem)',
    );
    expect(value.get('--body-md-desktop-font-size')).toBe('calc(var(--body-scale-base) * 1rem)');
  });

  it('caps each recommendation at the desktop size', () => {
    expect(value.get('--heading-xl-tablet-font-size')).toBe(
      'min(var(--heading-xl-desktop-font-size), calc(pow(var(--heading-scale-base) * pow(var(--heading-scale-ratio), 2), var(--type-tablet-scale-compression)) * 1rem))',
    );
  });

  it('points the structural size at the desktop size', () => {
    expect(value.get('--heading-xl-font-size')).toBe('var(--heading-xl-desktop-font-size)');
    expect(value.get('--eyebrow-font-size')).toBe('var(--eyebrow-desktop-font-size)');
  });

  it('links step faces and weights to the usage, apart from the pinned heading steps', () => {
    expect(value.get('--heading-md-font-family')).toBe('var(--heading-font-family)');
    expect(value.get('--heading-sm-font-family')).toBe('var(--font-sans)');
    expect(value.get('--heading-sm-font-weight')).toBe('var(--heading-font-weight)');
    expect(value.get('--code-font-family')).toBe('var(--font-mono)');
  });

  it('sizes and faces the eyebrow from body', () => {
    expect(value.get('--eyebrow-phone-font-size')).toBe('var(--body-sm-phone-font-size)');
    expect(value.get('--eyebrow-font-family')).toBe('var(--body-font-family)');
    expect(value.get('--eyebrow-text-transform')).toBe('none');
  });
});
