// OKLCH color space conversions — hand-rolled, no dependencies
// Pipeline: sRGB hex → linear RGB → OKLab (via M1×M2 + cube root) → OKLCH (polar)

export interface Oklch {
  l: number; // 0..1
  c: number; // 0..~0.4
  h: number; // 0..360
}

// --- sRGB gamma ---

function srgbToLinear(c: number): number {
  return c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
}

function linearToSrgb(c: number): number {
  return c <= 0.0031308 ? 12.92 * c : 1.055 * Math.pow(c, 1 / 2.4) - 0.055;
}

// --- Hex ↔ linear RGB ---

function hexToLinearRgb(hex: string): [number, number, number] {
  const r = parseInt(hex.slice(1, 3), 16) / 255;
  const g = parseInt(hex.slice(3, 5), 16) / 255;
  const b = parseInt(hex.slice(5, 7), 16) / 255;
  return [srgbToLinear(r), srgbToLinear(g), srgbToLinear(b)];
}

function linearRgbToHex(r: number, g: number, b: number): string {
  const toHex = (c: number) => {
    const v = Math.round(Math.max(0, Math.min(1, linearToSrgb(c))) * 255);
    return v.toString(16).padStart(2, '0');
  };
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

// --- Linear RGB ↔ OKLab ---
// Uses the two-matrix approach from Björn Ottosson's blog

function linearRgbToOklab(r: number, g: number, b: number): [number, number, number] {
  const l_ = 0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b;
  const m_ = 0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b;
  const s_ = 0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b;

  const l = Math.cbrt(l_);
  const m = Math.cbrt(m_);
  const s = Math.cbrt(s_);

  return [
    0.2104542553 * l + 0.7936177850 * m - 0.0040720468 * s,
    1.9779984951 * l - 2.4285922050 * m + 0.4505937099 * s,
    0.0259040371 * l + 0.7827717662 * m - 0.8086757660 * s,
  ];
}

function oklabToLinearRgb(L: number, a: number, b: number): [number, number, number] {
  const l_ = L + 0.3963377774 * a + 0.2158037573 * b;
  const m_ = L - 0.1055613458 * a - 0.0638541728 * b;
  const s_ = L - 0.0894841775 * a - 1.2914855480 * b;

  const l = l_ * l_ * l_;
  const m = m_ * m_ * m_;
  const s = s_ * s_ * s_;

  return [
    +4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s,
    -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s,
    -0.0041960863 * l - 0.7034186147 * m + 1.7076147010 * s,
  ];
}

// --- OKLab ↔ OKLCH ---

function oklabToOklch(L: number, a: number, b: number): Oklch {
  const c = Math.sqrt(a * a + b * b);
  let h = (Math.atan2(b, a) * 180) / Math.PI;
  if (h < 0) h += 360;
  return { l: L, c, h };
}

function oklchToOklab(l: number, c: number, h: number): [number, number, number] {
  const hRad = (h * Math.PI) / 180;
  return [l, c * Math.cos(hRad), c * Math.sin(hRad)];
}

// --- Public API ---

export function hexToOklch(hex: string): Oklch {
  const [r, g, b] = hexToLinearRgb(hex);
  const [L, a, bVal] = linearRgbToOklab(r, g, b);
  return oklabToOklch(L, a, bVal);
}

export function oklchToHex(l: number, c: number, h: number): string {
  const [L, a, b] = oklchToOklab(l, c, h);
  const [r, g, bVal] = oklabToLinearRgb(L, a, b);
  return linearRgbToHex(r, g, bVal);
}

function isInGamut(r: number, g: number, b: number): boolean {
  const eps = 0.0001;
  return r >= -eps && r <= 1 + eps && g >= -eps && g <= 1 + eps && b >= -eps && b <= 1 + eps;
}

/** The clamped sRGB projection: reduce chroma into gamut, then serialize to hex.
 *  This is the correct projection for unclamped stored intent — naive
 *  `oklchToHex` per-channel clips (shifting hue), this preserves hue and L. */
export function oklchToHexClamped(l: number, c: number, h: number): string {
  const g = gamutClamp(l, c, h);
  return oklchToHex(g.l, g.c, g.h);
}

export function gamutClamp(l: number, c: number, h: number): Oklch {
  // Clamp lightness
  if (l <= 0) return { l: 0, c: 0, h };
  if (l >= 1) return { l: 1, c: 0, h };

  // Binary search: reduce chroma until in sRGB gamut
  const [L, a, b] = oklchToOklab(l, c, h);
  const [r, g, bVal] = oklabToLinearRgb(L, a, b);

  if (isInGamut(r, g, bVal)) return { l, c, h };

  let lo = 0;
  let hi = c;
  for (let i = 0; i < 20; i++) {
    const mid = (lo + hi) / 2;
    const [La, aa, ba] = oklchToOklab(l, mid, h);
    const [rr, gg, bb] = oklabToLinearRgb(La, aa, ba);
    if (isInGamut(rr, gg, bb)) {
      lo = mid;
    } else {
      hi = mid;
    }
  }
  return { l, c: lo, h };
}

// --- CSS serialization + parsing ---

function trim(value: number, decimals: number): string {
  return Number(value.toFixed(decimals)).toString();
}

export function oklchToCss(l: number, c: number, h: number): string {
  const cs = trim(c, 4);
  // Hue is meaningless without chroma, and the OKLab round trip leaves noise
  // there (#ffffff lands on h≈89.88). Pin it so achromatic values read as
  // achromatic instead of arbitrary.
  return `oklch(${trim(l, 4)} ${cs} ${cs === '0' ? '0' : trim(h, 2)})`;
}

/** The clamped sRGB projection as an `oklch()` string — the CSS counterpart of
 *  `oklchToHexClamped`. Clamping keeps flip-day output visually identical to
 *  the hex it replaces; emitting unclamped (wide-gamut) values is a separate
 *  decision. */
export function oklchToCssClamped(l: number, c: number, h: number): string {
  const g = gamutClamp(l, c, h);
  return oklchToCss(g.l, g.c, g.h);
}

const OKLCH_RE = /^oklch\(\s*([\d.]+)(%?)\s+([\d.]+)(%?)\s+([\d.]+)(?:deg)?\s*\)$/i;
const HEX6_RE = /^#[0-9a-f]{6}$/i;

export function parseOklchCss(value: string): Oklch | null {
  const m = OKLCH_RE.exec(value.trim());
  if (!m) return null;
  const l = Number.parseFloat(m[1]) / (m[2] === '%' ? 100 : 1);
  // Percentage chroma is relative to 0.4 per the CSS Color 4 definition.
  const c = Number.parseFloat(m[3]) * (m[4] === '%' ? 0.004 : 1);
  return { l, c, h: Number.parseFloat(m[5]) };
}

/** Input boundary for color strings arriving from CSS: accepts the `oklch()`
 *  this system now emits and the 6-digit hex it emitted before the flip, so
 *  themes promoted either side of it still reconcile. */
export function cssColorToOklch(value: string): Oklch | null {
  const raw = value.trim();
  if (HEX6_RE.test(raw)) return hexToOklch(raw);
  return parseOklchCss(raw);
}

export function oklchToRgb255(l: number, c: number, h: number): { r: number; g: number; b: number } {
  const clamped = gamutClamp(l, c, h);
  const [L, a, bVal] = oklchToOklab(clamped.l, clamped.c, clamped.h);
  const [r, g, b] = oklabToLinearRgb(L, a, bVal);
  const to255 = (channel: number) => Math.round(Math.max(0, Math.min(1, linearToSrgb(channel))) * 255);
  return { r: to255(r), g: to255(g), b: to255(b) };
}
