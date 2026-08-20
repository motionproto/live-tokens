import { parseOklchCss, oklchToRgb255 } from './oklch';

export type ContrastColorToken = '--color-black' | '--color-white';

type Rgb = { r: number; g: number; b: number };

const HEX_RE = /#([0-9a-f]{3,4}|[0-9a-f]{6}|[0-9a-f]{8})\b/gi;
const OKLCH_RE = /oklch\(\s*[\d.]+%?\s+[\d.]+%?\s+[\d.]+(?:deg)?\s*\)/gi;
const RGB_RE = /rgba?\(\s*([\d.]+%?)\s*[, ]\s*([\d.]+%?)\s*[, ]\s*([\d.]+%?)(?:\s*[,/]\s*[\d.]+%?)?\s*\)/gi;

function channel(value: string): number {
  const parsed = Number.parseFloat(value);
  return value.endsWith('%') ? parsed * 2.55 : parsed;
}

function parseHex(hex: string): Rgb {
  const full = hex.length <= 4
    ? hex.slice(1).split('').map(part => part + part).join('')
    : hex.slice(1, 7);
  return {
    r: Number.parseInt(full.slice(0, 2), 16),
    g: Number.parseInt(full.slice(2, 4), 16),
    b: Number.parseInt(full.slice(4, 6), 16),
  };
}

function colorsIn(background: string): Rgb[] {
  const colors: Rgb[] = [];
  for (const match of background.matchAll(HEX_RE)) colors.push(parseHex(match[0]));
  for (const match of background.matchAll(OKLCH_RE)) {
    const parsed = parseOklchCss(match[0]);
    if (parsed) colors.push(oklchToRgb255(parsed.l, parsed.c, parsed.h));
  }
  for (const match of background.matchAll(RGB_RE)) {
    colors.push({ r: channel(match[1]), g: channel(match[2]), b: channel(match[3]) });
  }
  return colors;
}

function linearChannel(value: number): number {
  const srgb = Math.max(0, Math.min(255, value)) / 255;
  return srgb <= 0.04045 ? srgb / 12.92 : ((srgb + 0.055) / 1.055) ** 2.4;
}

function luminance({ r, g, b }: Rgb): number {
  return 0.2126 * linearChannel(r) + 0.7152 * linearChannel(g) + 0.0722 * linearChannel(b);
}

/**
 * Pick the invariant black/white token with the stronger minimum contrast
 * against every explicit colour in a solid or gradient page background —
 * the rule FloatingTokenTags uses for its kite strings.
 */
export function contrastTokenForBackground(background: string): ContrastColorToken {
  const colors = colorsIn(background);
  if (colors.length === 0) return '--color-white';

  const luminances = colors.map(luminance);
  const blackMinimum = Math.min(...luminances.map(value => (value + 0.05) / 0.05));
  const whiteMinimum = Math.min(...luminances.map(value => 1.05 / (value + 0.05)));
  return blackMinimum >= whiteMinimum ? '--color-black' : '--color-white';
}
