/**
 * What paints behind a thing, and which way it leans.
 *
 * A theme is not light or dark by declaration — nothing in a saved theme
 * records it — so polarity is either stated on the markup (`data-backdrop`) or
 * measured from the colours that actually paint. Both answers arrive through
 * `polarityOf`, and every consumer that used to hand-roll one of the two reads
 * it from here.
 */
import { parseOklchCss, oklchToRgb255 } from '../internal/oklch';

export type Polarity = 'light' | 'dark';
export type ContrastColorToken = '--color-black' | '--color-white';

export const BACKDROP_ATTRIBUTE = 'data-backdrop';

/** Relative luminance at or above which a backdrop counts as light. Sits
    between the palest shipped dark theme (~0.03) and the darkest light one
    (~0.6), so no shipped look lands near the line. */
export const LIGHT_BACKDROP = 0.2;

/** A fill this see-through says nothing about what shows through it, so the
    walk keeps looking up the tree. */
const OPAQUE = 0.98;

type Rgba = { r: number; g: number; b: number; a: number };

const HEX_RE = /#([0-9a-f]{3,4}|[0-9a-f]{6}|[0-9a-f]{8})\b/gi;
const OKLCH_RE = /oklch\(\s*[\d.]+%?\s+[\d.]+%?\s+[\d.]+(?:deg)?\s*(?:\/\s*([\d.]+%?)\s*)?\)/gi;
const RGB_RE = /rgba?\(\s*([\d.]+%?)\s*[, ]\s*([\d.]+%?)\s*[, ]\s*([\d.]+%?)(?:\s*[,/]\s*([\d.]+%?))?\s*\)/gi;
/** Anything the parsers above miss — `color-mix()`, a named colour, `lab()`.
    Carries no nested parens in any value a computed style hands back. */
const EXOTIC_RE = /\b(?:color-mix|hwb|lab|lch|oklab|color)\([^()]*\)/gi;

function channel(value: string): number {
  const parsed = Number.parseFloat(value);
  return value.endsWith('%') ? parsed * 2.55 : parsed;
}

function alpha(value: string | undefined): number {
  if (value === undefined) return 1;
  const parsed = Number.parseFloat(value);
  return value.endsWith('%') ? parsed / 100 : parsed;
}

function parseHex(hex: string): Rgba {
  const digits = hex.slice(1);
  const full = digits.length <= 4 ? digits.split('').map((part) => part + part).join('') : digits;
  return {
    r: Number.parseInt(full.slice(0, 2), 16),
    g: Number.parseInt(full.slice(2, 4), 16),
    b: Number.parseInt(full.slice(4, 6), 16),
    a: full.length >= 8 ? Number.parseInt(full.slice(6, 8), 16) / 255 : 1,
  };
}

/** Every colour a background value names, gradient stops included. */
export function colorsIn(background: string): Rgba[] {
  const colors: Rgba[] = [];
  for (const match of background.matchAll(HEX_RE)) colors.push(parseHex(match[0]));
  for (const match of background.matchAll(OKLCH_RE)) {
    const parsed = parseOklchCss(match[0]);
    if (parsed) colors.push({ ...oklchToRgb255(parsed.l, parsed.c, parsed.h), a: alpha(match[1]) });
  }
  for (const match of background.matchAll(RGB_RE)) {
    colors.push({
      r: channel(match[1]),
      g: channel(match[2]),
      b: channel(match[3]),
      a: alpha(match[4]),
    });
  }
  for (const match of background.matchAll(EXOTIC_RE)) {
    const resolved = viaCanvas(match[0]);
    if (resolved) colors.push(resolved);
  }
  return colors;
}

function linearChannel(value: number): number {
  const srgb = Math.max(0, Math.min(255, value)) / 255;
  return srgb <= 0.04045 ? srgb / 12.92 : ((srgb + 0.055) / 1.055) ** 2.4;
}

function luminance({ r, g, b }: Rgba): number {
  return 0.2126 * linearChannel(r) + 0.7152 * linearChannel(g) + 0.0722 * linearChannel(b);
}

const SEED = '#010203';
let probe: CanvasRenderingContext2D | null | undefined;

/** The browser as a colour parser: a 2D canvas resolves anything it renders,
 *  including the `color-mix()` a computed style can still hand back, and
 *  reports failure rather than resolving an unknown value to black. */
function viaCanvas(value: string): Rgba | null {
  if (typeof document === 'undefined') return null;
  if (probe === undefined) {
    probe = document.createElement('canvas').getContext?.('2d', { willReadFrequently: true }) ?? null;
  }
  if (!probe) return null;
  probe.fillStyle = SEED;
  probe.fillStyle = value;
  if (probe.fillStyle === SEED) return null;
  probe.clearRect(0, 0, 1, 1);
  probe.fillRect(0, 0, 1, 1);
  const [r, g, b, a] = probe.getImageData(0, 0, 1, 1).data;
  return { r, g, b, a: a / 255 };
}

/** Any CSS colour the browser can render, as `#rrggbb` — for consumers that
 *  cannot read CSS themselves: a canvas, a WebGL uniform, an SVG attribute.
 *  Null for a value that is not a colour, or is see-through enough that a flat
 *  hex would lie about it. */
export function cssColorToHex(value: string): string | null {
  const color = viaCanvas(value.trim());
  if (!color || color.a < OPAQUE) return null;
  const packed = (Math.round(color.r) << 16) | (Math.round(color.g) << 8) | Math.round(color.b);
  return `#${packed.toString(16).padStart(6, '0')}`;
}

/** Mean luminance of a background value, or null when it names no colour or
 *  nothing opaque enough to hide what sits behind it. */
export function backgroundLuminance(background: string): number | null {
  const opaque = colorsIn(background).filter((color) => color.a >= OPAQUE);
  if (!opaque.length) return null;
  return opaque.reduce((total, color) => total + luminance(color), 0) / opaque.length;
}

/** Which way a background value leans, or null when it names no opaque colour. */
export function polarityOfBackground(background: string): Polarity | null {
  const measured = backgroundLuminance(background);
  if (measured === null) return null;
  return measured >= LIGHT_BACKDROP ? 'light' : 'dark';
}

/**
 * Pick the invariant black/white token with the stronger minimum contrast
 * against every colour in a solid or gradient background. Alpha is ignored:
 * the caller passes an authored value, not a computed one.
 */
export function contrastTokenForBackground(background: string): ContrastColorToken {
  const colors = colorsIn(background);
  if (colors.length === 0) return '--color-white';
  const luminances = colors.map(luminance);
  const blackMinimum = Math.min(...luminances.map((value) => (value + 0.05) / 0.05));
  const whiteMinimum = Math.min(...luminances.map((value) => 1.05 / (value + 0.05)));
  return blackMinimum >= whiteMinimum ? '--color-black' : '--color-white';
}

/** Elements a watcher stamped. Its own stamp is an answer, not a declaration,
 *  so the next measurement must not read it back as one. */
const stamped = new WeakSet<Element>();

export function markStamped(el: Element): void {
  stamped.add(el);
}

export function clearStamped(el: Element): void {
  stamped.delete(el);
}

/** The polarity the markup states: the nearest `data-backdrop` on or above the
 *  element that a watcher did not write. */
export function declaredPolarity(el: Element | null): Polarity | null {
  for (let node: Element | null = el; node; node = node.parentElement) {
    if (stamped.has(node)) continue;
    const stated = node.getAttribute?.(BACKDROP_ATTRIBUTE);
    if (stated === 'light' || stated === 'dark') return stated;
  }
  return null;
}

/** Mean luminance of whatever actually paints behind `el` — the nearest
 *  ancestor with an opaque fill, averaged across its gradient stops, falling
 *  back to the theme's page canvas. */
export function backdropLuminance(el: Element | null): number {
  if (typeof document === 'undefined') return 0;
  for (let node: Element | null = el ?? document.body; node; node = node.parentElement) {
    const style = getComputedStyle(node);
    const measured = backgroundLuminance(`${style.backgroundImage} ${style.backgroundColor}`);
    if (measured !== null) return measured;
  }
  const page = getComputedStyle(document.documentElement).getPropertyValue('--page-bg');
  return backgroundLuminance(page) ?? 0;
}

/** Which way the backdrop behind `el` leans. A `data-backdrop` on or above it
 *  is the answer; otherwise the paint is measured. */
export function polarityOf(el: Element | null): Polarity {
  return declaredPolarity(el) ?? (backdropLuminance(el) >= LIGHT_BACKDROP ? 'light' : 'dark');
}

export const isLightBackdrop = (el: Element | null): boolean => polarityOf(el) === 'light';

/** The black/white token that reads against `el`'s backdrop. */
export const contrastTokenFor = (el: Element | null): ContrastColorToken =>
  polarityOf(el) === 'light' ? '--color-black' : '--color-white';
