import type { CurveAnchor } from '../curveEngine';

const ANCHOR_KEYS = ['x', 'y', 'inDx', 'inDy', 'outDx', 'outDy'] as const;

function anchorsEqual(a: CurveAnchor[], b: CurveAnchor[]): boolean {
  return a.length === b.length && a.every((anchor, i) => ANCHOR_KEYS.every((k) => anchor[k] === b[i][k]));
}

/**
 * Collapsed-row readout for a curve section. Range rather than first-to-last:
 * a peak's endpoints can match the defaults' while the middle diverges, and
 * first-to-last would misstate the peak's range as flat.
 */
export function curveSummary(anchors: CurveAnchor[], defaults: CurveAnchor[], offset: number, unit = ''): string {
  if (offset === 0 && anchorsEqual(anchors, defaults)) return 'default';
  const ys = anchors.map((a) => a.y);
  const range = `${Math.round(Math.min(...ys))} to ${Math.round(Math.max(...ys))}${unit}`;
  const offsetPart = offset !== 0 ? ` offset ${offset > 0 ? '+' : ''}${offset}${unit}` : '';
  return `${range}${offsetPart}`;
}
