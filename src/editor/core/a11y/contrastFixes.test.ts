// @vitest-environment happy-dom

import { describe, expect, it } from 'vitest';
import { registerContrastPairs } from '../components/contrastPairRegistry';
import type { Resolver, Rgba } from '../palettes/contrastPairs';
import type { A11yContrastFailure } from './a11yReportTypes';
import { measureFixes } from './contrastFixes';

const failure = (variable: string): A11yContrastFailure => ({
  component: 'fixture',
  variable,
  backdrop: ['--fixture-surface'],
  role: 'text',
  ratio: 2.1,
  floor: 4.5,
});

const resolver = (colors: Record<string, Rgba>): Resolver => ({
  color: (name) => [colors[name] ?? [255, 255, 255, 1]],
  fontPx: () => 16,
  fontWeight: () => 400,
});

describe('measureFixes', () => {
  it('returns the ratio now of each failure whose pair passes, and leaves out the rest', () => {
    registerContrastPairs('fixture', [
      { foreground: '--fixture-fixed', backdrop: ['--fixture-surface'], role: 'text' },
      { foreground: '--fixture-failing', backdrop: ['--fixture-surface'], role: 'text' },
    ]);
    const fixed = failure('--fixture-fixed');
    const failing = failure('--fixture-failing');
    const ratios = measureFixes([fixed, failing], resolver({
      '--fixture-fixed': [0, 0, 0, 1],
      '--fixture-failing': [230, 230, 230, 1],
    }));
    expect([...ratios.keys()]).toEqual([fixed]);
    expect(ratios.get(fixed)).toBeCloseTo(21, 0);
  });

  it('skips a failure whose pair the component no longer declares', () => {
    registerContrastPairs('fixture', []);
    expect(measureFixes([failure('--fixture-fixed')], resolver({})).size).toBe(0);
  });
});
