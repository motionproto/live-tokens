import { splitTopLevel } from '../themes/parsers/gradient';
import type { Resolver, Rgba } from './contrastPairs';

const GRADIENT = /^(?:repeating-)?(?:linear|radial|conic)-gradient\((.*)\)$/is;
const DIRECTION = /^(?:to|at|from|in|circle|ellipse|closest-side|closest-corner|farthest-side|farthest-corner)$/i;
const POSITION = /^(?:[+-]?(?:\d+\.?\d*|\.\d+)(?:[a-z]+|%)?|(?:calc|min|max|clamp)\(.*\))$/is;

const isSpace = (c: string) => /\s/.test(c);

/** The stop colors of a gradient function, or null for any other value. */
export function gradientStops(value: string): string[] | null {
  const match = value.trim().match(GRADIENT);
  if (!match) return null;
  const stops: string[] = [];
  splitTopLevel(match[1]).forEach((arg, i) => {
    const tokens = splitTopLevel(arg, isSpace).filter(Boolean);
    if (i === 0 && (DIRECTION.test(tokens[0]) || POSITION.test(tokens[0]))) return;
    const color = tokens.filter((token) => !POSITION.test(token)).join(' ');
    if (color) stops.push(color);
  });
  return stops;
}

export function createDomResolver(doc: Document = document): Resolver {
  const view = doc.defaultView!;
  // The canvas answers with the pixel the screen shows, gamut-clamped, for any
  // color syntax the probe computes.
  const canvas = doc.createElement('canvas');
  canvas.width = 1;
  canvas.height = 1;
  const ctx = canvas.getContext('2d', { willReadFrequently: true })!;
  ctx.globalCompositeOperation = 'copy';

  const paint = (css: string): Rgba => {
    ctx.fillStyle = 'rgba(0, 0, 0, 0)';
    ctx.fillStyle = css;
    ctx.fillRect(0, 0, 1, 1);
    const [r, g, b, a] = ctx.getImageData(0, 0, 1, 1).data;
    return [r, g, b, a / 255];
  };

  const withProbe = <T>(read: (probe: HTMLElement, style: CSSStyleDeclaration) => T): T => {
    // A value `color` rejects makes the probe inherit, so the host's
    // transparent reads as a layer that paints nothing.
    const host = doc.createElement('div');
    host.style.display = 'none';
    host.style.color = 'transparent';
    const probe = doc.createElement('div');
    host.appendChild(probe);
    doc.body.appendChild(host);
    try {
      return read(probe, view.getComputedStyle(probe));
    } finally {
      host.remove();
    }
  };

  return {
    color: (name) => withProbe((probe, style) => {
      const stops = gradientStops(style.getPropertyValue(name)) ?? [`var(${name})`];
      return stops.map((stop) => {
        // An invalid assignment keeps the previous stop's color.
        probe.style.color = '';
        probe.style.color = stop;
        return paint(style.color);
      });
    }),
    fontPx: (name) => withProbe((probe, style) => {
      probe.style.fontSize = `var(${name})`;
      return parseFloat(style.fontSize);
    }),
    fontWeight: (name) => withProbe((probe, style) => {
      probe.style.fontWeight = `var(${name})`;
      return parseFloat(style.fontWeight);
    }),
  };
}
