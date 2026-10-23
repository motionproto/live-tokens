import { CONTRAST_RULES, LARGE_BOLD_PX, LARGE_TEXT_PX } from '../core/palettes/contrast';
import { closestToFailing, type PairMeasure } from '../core/palettes/contrastPairs';

export type ReadoutState = 'pass' | 'fail' | 'inactive';

export interface Readout {
  label: string;
  state: ReadoutState;
  ariaLabel: string;
  measure: PairMeasure;
}

/** Truncation keeps a failing value from displaying as its floor. */
export function formatRatio(ratio: number): string {
  return `${(Math.floor(ratio * 100 + 1e-9) / 100).toFixed(2)}:1`;
}

export const formatFloor = (floor: number) => `${floor}:1`;

export function measureState(measure: PairMeasure): ReadoutState {
  if (measure.pair.inactive) return 'inactive';
  return measure.passes ? 'pass' : 'fail';
}

export function readoutState(measures: PairMeasure[]): Readout {
  const measure = closestToFailing(measures);
  const state = measureState(measure);
  const label = formatRatio(measure.ratio);
  const verdict = state === 'inactive'
    ? 'exempt as a disabled control'
    : `${state === 'pass' ? 'meets' : 'below'} ${formatFloor(measure.floor)}`;
  return { label, state, ariaLabel: `Contrast ${label}, ${verdict}`, measure };
}

export function ruleSentence(measure: PairMeasure): string {
  const rule = CONTRAST_RULES[measure.pair.role];
  let sentence = `WCAG 2.2 success criterion ${rule.criterion}, ${rule.name} (${rule.level}): `
    + `${formatFloor(rule.floor)} against the colors behind it`;
  if (rule.largeFloor !== undefined) {
    sentence += `, or ${formatFloor(rule.largeFloor)} for large text (${LARGE_TEXT_PX}px, or ${LARGE_BOLD_PX}px bold)`;
  }
  sentence += '.';
  if (measure.pair.inactive) sentence += ' Disabled controls are exempt.';
  return sentence;
}
