import { get } from 'svelte/store';
import { getContrastPairs } from '../components/contrastPairRegistry';
import { measurePair, type ContrastPair, type Resolver } from '../palettes/contrastPairs';
import { createDomResolver } from '../palettes/resolveColor';
import { editorState } from '../store/editorStore';
import { THEME_APPLIED_EVENT } from '../themes/themeDocumentSync';
import { a11yFinishedReport, setFixedContrast } from './a11yReport';
import type { A11yContrastFailure } from './a11yReportTypes';

function samePair(pair: ContrastPair, failure: A11yContrastFailure): boolean {
  return pair.role === failure.role
    && pair.context === failure.context
    && pair.backdrop.join('\n') === failure.backdrop.join('\n');
}

/** Each failure whose pair passes now, with the ratio it measures. */
export function measureFixes(failures: A11yContrastFailure[], resolver: Resolver): Map<A11yContrastFailure, number> {
  const out = new Map<A11yContrastFailure, number>();
  for (const failure of failures) {
    const pair = getContrastPairs(failure.component, failure.variable).find((p) => samePair(p, failure));
    if (!pair) continue;
    const measure = measurePair(pair, resolver);
    if (measure.passes) out.set(failure, measure.ratio);
  }
  return out;
}

/** Re-measures the last run's contrast failures whenever the editor's state or the open theme changes. */
export function init(): void {
  let frame = 0;
  // Measuring reads the DOM, so it waits a frame for the renderer's CSS variables.
  const schedule = () => {
    cancelAnimationFrame(frame);
    frame = requestAnimationFrame(() => {
      setFixedContrast(measureFixes(get(a11yFinishedReport)?.contrast ?? [], createDomResolver()));
    });
  };
  a11yFinishedReport.subscribe(schedule);
  editorState.subscribe(schedule);
  document.addEventListener(THEME_APPLIED_EVENT, schedule);
}
