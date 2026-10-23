import { measurePair, type ContrastPair, type Resolver } from '../palettes/contrastPairs';
import type { A11yContrastFailure } from './a11yReportTypes';

/** Each pair below its floor. `measurePair` passes an inactive pair, so a disabled state never fails. */
export function contrastFailures(
  pairs: { component: string; pair: ContrastPair }[],
  resolver: Resolver,
): A11yContrastFailure[] {
  return pairs.flatMap(({ component, pair }) => {
    const measure = measurePair(pair, resolver);
    if (measure.passes) return [];
    return [{
      component,
      variable: pair.foreground,
      backdrop: pair.backdrop,
      role: pair.role,
      ratio: measure.ratio,
      floor: measure.floor,
      ...(pair.context ? { context: pair.context } : {}),
    }];
  });
}
