import { describe, expect, it } from 'vitest';
import type { ContrastPair, PairMeasure } from '../core/palettes/contrastPairs';
import { formatRatio, readoutState, ruleSentence } from './contrastReadout';

const textPair: ContrastPair = {
  foreground: '--x-text',
  backdrop: ['--x-surface'],
  role: 'text',
  fontSize: '--font-size-md',
};

const iconPair: ContrastPair = { foreground: '--x-icon', backdrop: ['--x-surface'], role: 'non-text' };

function measure(pair: ContrastPair, ratio: number, floor = 4.5): PairMeasure {
  return { pair, ratio, floor, large: false, passes: pair.inactive === true || ratio >= floor };
}

describe('formatRatio', () => {
  it('truncates to two decimals', () => {
    expect(formatRatio(4.499)).toBe('4.49:1');
  });

  it('pads a whole ratio', () => {
    expect(formatRatio(7)).toBe('7.00:1');
  });
});

describe('readoutState', () => {
  it('reports a passing pair', () => {
    expect(readoutState([measure(textPair, 7)])).toMatchObject({
      label: '7.00:1',
      state: 'pass',
      ariaLabel: 'Contrast 7.00:1, meets 4.5:1',
    });
  });

  it('reports a failing pair against its floor', () => {
    expect(readoutState([measure(textPair, 2.9)])).toMatchObject({
      label: '2.90:1',
      state: 'fail',
      ariaLabel: 'Contrast 2.90:1, below 4.5:1',
    });
  });

  it('keeps an inactive pair below its floor out of the fail state', () => {
    const disabled = { ...textPair, inactive: true };
    expect(readoutState([measure(disabled, 1.5)])).toMatchObject({
      label: '1.50:1',
      state: 'inactive',
      ariaLabel: 'Contrast 1.50:1, exempt as a disabled control',
    });
  });

  it('shows the pair closest to failing among several on one foreground', () => {
    const inline = { ...iconPair, context: 'inline' };
    const zoomed = { ...iconPair, context: 'zoomed' };
    const readout = readoutState([measure(inline, 5, 3), measure(zoomed, 3.2, 3), measure(textPair, 5)]);
    expect(readout.measure.pair).toBe(zoomed);
    expect(readout).toMatchObject({ label: '3.20:1', state: 'pass', ariaLabel: 'Contrast 3.20:1, meets 3:1' });
  });
});

describe('ruleSentence', () => {
  it('names the text rule with its large-text floor', () => {
    expect(ruleSentence(measure(textPair, 7))).toBe(
      'WCAG 2.2 success criterion 1.4.3, Contrast (Minimum) (AA): 4.5:1 against the colors behind it, '
        + 'or 3:1 for large text (24px, or 18.66px bold).',
    );
  });

  it('names the non-text rule', () => {
    expect(ruleSentence(measure(iconPair, 5, 3))).toBe(
      'WCAG 2.2 success criterion 1.4.11, Non-text Contrast (AA): 3:1 against the colors behind it.',
    );
  });

  it('adds the disabled exemption to an inactive pair', () => {
    expect(ruleSentence(measure({ ...iconPair, inactive: true }, 1.2, 3))).toBe(
      'WCAG 2.2 success criterion 1.4.11, Non-text Contrast (AA): 3:1 against the colors behind it. '
        + 'Disabled controls are exempt.',
    );
  });
});
