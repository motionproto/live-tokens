/**
 * The ink coverage field: a Perlin noise tile, levelled, posterised and
 * blurred, handed out as a greyscale PNG that CSS masks with `mask-mode:
 * luminance` — white keeps the fill, black erases it.
 *
 * The field is built here rather than by `feTurbulence` because the filter
 * primitive's output is not a value anyone can reason about: it lands in a
 * narrow band around its own midpoint (about 0.24 to 0.77 for fractal noise,
 * whatever the octaves), so a dial that walks a cut across 0 to 1 spends most
 * of its travel outside the field entirely and the little that lands inside
 * comes out as one flat mid-grey.
 *
 * Generated here, the tile is auto-levelled before any dial sees it, and the
 * dials that follow are a levels control: Input cuts a black and a white point
 * into the field, Steps quantises it, Output states the density range the mask
 * paints between.
 *
 * Everything is integer maths on a Float32Array with no DOM, so what a test
 * asserts is what the browser paints.
 */
import type { SketchSettings } from './sketchPresets';

/** What the tile spans in page px. Blobs are fitted a whole number to the
    tile, which is what lets the lattice wrap; the dial's px reading is the
    nearest whole fit, never more than a few px off what it says. */
export const MASK_TILE = 600;

/** Page px per sample. The field is blobs and gradients, so painting it at half
    resolution and letting the browser scale it up costs nothing visible and
    quarters both the work and the data URI. */
const SAMPLE_PX = 2;
const RASTER = MASK_TILE / SAMPLE_PX;

/** The stage previews, in the order the field is built. */
export type MaskStage = 'noise' | 'levels' | 'blur';

/* ---------------------------------------------------------------- noise --- */

function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Perlin noise on a lattice that wraps every `period` cells, so a tile drawn
 * from it meets itself at both edges. Returns roughly -0.7 to 0.7.
 *
 * Hand-rolled because the wrap is the whole requirement and no established
 * noise package offers one: `simplex-noise` and its neighbours all sample an
 * endless plane. The usual way to tile them is to walk two circles through 4D
 * noise, and it degenerates at the ratio this effect works at — a tile only
 * four or five blobs across makes those circles smaller than one noise feature,
 * and the field comes back as a regular grid of dots instead of cloud. A
 * lattice takes its period as an integer and wraps exactly at any size.
 *
 * Gradients are drawn from the whole circle, one per lattice point, rather than
 * from the eight compass directions the textbook version uses. Eight leaves
 * every blob squared off against the axes.
 */
const GRAD_COUNT = 256;

function makePerlin(seed: number): (x: number, y: number, period: number) => number {
  const rand = mulberry32(seed);
  const perm = new Uint8Array(512);
  const src = new Uint8Array(256);
  for (let i = 0; i < 256; i++) src[i] = i;
  for (let i = 255; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    const t = src[i]; src[i] = src[j]; src[j] = t;
  }
  for (let i = 0; i < 512; i++) perm[i] = src[i & 255];

  const gx = new Float32Array(GRAD_COUNT), gy = new Float32Array(GRAD_COUNT);
  for (let i = 0; i < GRAD_COUNT; i++) {
    const a = rand() * Math.PI * 2;
    gx[i] = Math.cos(a); gy[i] = Math.sin(a);
  }

  const fade = (t: number) => t * t * t * (t * (t * 6 - 15) + 10);
  const lerp = (t: number, a: number, b: number) => a + t * (b - a);

  return (x, y, period) => {
    const x0 = Math.floor(x), y0 = Math.floor(y);
    const xf = x - x0, yf = y - y0;
    const p = Math.max(1, Math.round(period));
    const xi = ((x0 % p) + p) % p, yi = ((y0 % p) + p) % p;
    const xi1 = (xi + 1) % p, yi1 = (yi + 1) % p;

    const g = (cx: number, cy: number, dx: number, dy: number) => {
      const h = perm[(perm[cx & 255] + cy) & 255];
      return gx[h] * dx + gy[h] * dy;
    };
    const u = fade(xf), v = fade(yf);
    return lerp(v,
      lerp(u, g(xi, yi, xf, yf), g(xi1, yi, xf - 1, yf)),
      lerp(u, g(xi, yi1, xf, yf - 1), g(xi1, yi1, xf - 1, yf - 1)));
  };
}

/**
 * The raw field: octaves of Perlin, each half the size and half the weight of
 * the one before, stretched onto its own measured range.
 *
 * `veined` folds each octave at zero before summing. The fold puts a crease
 * wherever the octave crossed zero, which is the marbled look; plain sum is
 * cloud.
 */
function rawField(s: SketchSettings, seed: number, raster: number, cells: number): Float32Array {
  const noise = makePerlin(seed);
  const veined = s.maskGrain === 'turbulence';
  const octaves = Math.max(1, Math.round(s.maskOctaves));
  const out = new Float32Array(raster * raster);
  const step = cells / raster;

  let weightSum = 0;
  for (let o = 0; o < octaves; o++) weightSum += 1 / (1 << o);

  for (let y = 0; y < raster; y++) {
    for (let x = 0; x < raster; x++) {
      let sum = 0;
      for (let o = 0; o < octaves; o++) {
        const f = 1 << o;
        const n = noise(x * step * f, y * step * f, cells * f);
        sum += (veined ? Math.abs(n) : n) / f;
      }
      out[y * raster + x] = sum / weightSum;
    }
  }
  return equalise(out);
}

const BINS = 4096;

/**
 * Auto levels: map the field through its own cumulative distribution, so tone
 * is spread evenly from black to white whatever the noise underneath.
 *
 * A black-and-white-point stretch is not enough on its own. Noise piles up
 * around its middle and the veined fold piles it up at the bottom — half a
 * one-layer veined tile sits under 0.29 — so a tile stretched by its extremes
 * still reads as one dark wash, and every dial downstream cuts the range at
 * points most of the field is nowhere near. Equalised, the median lands at 0.5
 * and each fifth of the range holds a fifth of the tile, so a handle at 30
 * addresses the darkest 30% of the field at every grain and octave count.
 *
 * Piecewise-linear through a histogram rather than by rank, so the mapping
 * stays smooth and cannot band a gradient it is meant to spread.
 */
function equalise(f: Float32Array): Float32Array {
  let lo = Infinity, hi = -Infinity;
  for (const v of f) { if (v < lo) lo = v; if (v > hi) hi = v; }
  const span = hi - lo;
  if (span <= 1e-6) return f.fill(0.5);

  const count = new Float64Array(BINS);
  for (const v of f) count[Math.min(BINS - 1, Math.floor(((v - lo) / span) * BINS))]++;
  const below = new Float64Array(BINS + 1);
  for (let b = 0; b < BINS; b++) below[b + 1] = below[b] + count[b];

  for (let i = 0; i < f.length; i++) {
    const t = ((f[i] - lo) / span) * BINS;
    const b = Math.min(BINS - 1, Math.floor(t));
    f[i] = (below[b] + (t - b) * count[b]) / f.length;
  }
  return f;
}

/* ------------------------------------------------------------- levelling --- */

/** Input levels. The black and white points cut into the field and stretch
    what is left back over the whole range, the way Photoshop's input handles
    do. The field is equalised, so the pair reads as shares of the tile: 30 to
    70 wears the darkest thirty per cent through to bare, fills the palest
    thirty per cent in solid, and spreads the middle across everything between.

    Handles together are the limit of that stretch, a threshold: half the tile
    bare and half whole, with no ramp. */
function applyInput(f: Float32Array, min: number, max: number): Float32Array {
  const span = max - min;
  if (span <= 1e-6) {
    for (let i = 0; i < f.length; i++) f[i] = f[i] >= min ? 1 : 0;
    return f;
  }
  for (let i = 0; i < f.length; i++) {
    f[i] = Math.min(1, Math.max(0, (f[i] - min) / span));
  }
  return f;
}

/** Output levels. The field is stretched into the gap between the handles, so
    the pair states the range the mask paints: nothing is barer than Min or
    denser than Max, and the field keeps its own shape in between.

    Cutting here instead of stretching is what Input is for. Cut twice and the
    second cut has nothing left to take: the low handle would become the value
    most of the field sits AT rather than its floor, and the fill would come
    out a flat wash at the floor with a thin bright tail above it. */
function applyOutput(f: Float32Array, min: number, max: number): Float32Array {
  const span = max - min;
  for (let i = 0; i < f.length; i++) f[i] = min + f[i] * span;
  return f;
}

function posterise(f: Float32Array, steps: number): Float32Array {
  if (steps < 2) return f;
  for (let i = 0; i < f.length; i++) {
    const band = Math.min(steps - 1, Math.floor(f[i] * steps));
    f[i] = band / (steps - 1);
  }
  return f;
}

/** Three box passes, wrapped at the tile edges so the blur cannot draw a rim
    where the tile repeats.

    The width is the one the filter spec derives for three boxes to land on a
    gaussian of a given deviation, so the dial's px are the px it gets. */
function blur(f: Float32Array, raster: number, std: number): Float32Array {
  const radius = Math.round((std * 3 * Math.sqrt(2 * Math.PI) / 4 - 1) / 2);
  if (radius < 1) return f;
  let cur = f;
  for (let pass = 0; pass < 3; pass++) cur = boxPass(cur, raster, radius);
  return cur;
}

function boxPass(f: Float32Array, n: number, radius: number): Float32Array {
  const mid = new Float32Array(f.length);
  const width = radius * 2 + 1;
  for (let y = 0; y < n; y++) {
    const row = y * n;
    let sum = 0;
    for (let i = -radius; i <= radius; i++) sum += f[row + ((i % n) + n) % n];
    for (let x = 0; x < n; x++) {
      mid[row + x] = sum / width;
      sum += f[row + ((x + radius + 1) % n)] - f[row + ((x - radius + n) % n)];
    }
  }
  const out = new Float32Array(f.length);
  for (let x = 0; x < n; x++) {
    let sum = 0;
    for (let i = -radius; i <= radius; i++) sum += mid[(((i % n) + n) % n) * n + x];
    for (let y = 0; y < n; y++) {
      out[y * n + x] = sum / width;
      sum += mid[((y + radius + 1) % n) * n + x] - mid[((y - radius + n) % n) * n + x];
    }
  }
  return out;
}

/* ---------------------------------------------------------------- field --- */

/** The raw field, kept across calls. The tab asks for the same tile at four
    different stages on every dial move, and the noise is the expensive part of
    all four; the levels, the posterising and the blur are one pass each. */
let rawCache: { key: string; field: Float32Array } | null = null;

function cachedRaw(s: SketchSettings, seed: number): Float32Array {
  const key = [s.maskBlob, s.maskOctaves, s.maskGrain, seed].join('|');
  if (rawCache?.key !== key) {
    const cells = Math.max(1, Math.round(MASK_TILE / s.maskBlob));
    rawCache = { key, field: rawField(s, seed, RASTER, cells) };
  }
  return rawCache.field;
}

/**
 * The finished field, 0 (bare) to 1 (inked), row-major.
 *
 * Three stages and no fourth: the last one IS the result, so the strip of
 * previews in the tab accounts for the whole of what the dials do.
 */
export function buildMaskField(
  s: SketchSettings, seed = 9, through?: MaskStage,
): { field: Float32Array; raster: number } {
  const raw = cachedRaw(s, seed);
  if (through === 'noise') return { field: raw, raster: RASTER };

  const levelled = applyOutput(
    posterise(
      applyInput(Float32Array.from(raw), s.maskInputMin, s.maskInputMax), s.maskPosterize,
    ),
    s.maskOutputMin, s.maskOutputMax,
  );
  if (through === 'levels') return { field: levelled, raster: RASTER };

  return { field: blur(levelled, RASTER, s.maskSoftness / SAMPLE_PX), raster: RASTER };
}

/* ------------------------------------------------------------------ png --- */

const CRC_TABLE = (() => {
  const t = new Int32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c;
  }
  return t;
})();

function crc32(bytes: Uint8Array): number {
  let c = -1;
  for (let i = 0; i < bytes.length; i++) c = CRC_TABLE[(c ^ bytes[i]) & 0xff] ^ (c >>> 8);
  return (c ^ -1) >>> 0;
}

function adler32(bytes: Uint8Array): number {
  let a = 1, b = 0;
  for (let i = 0; i < bytes.length; i++) {
    a = (a + bytes[i]) % 65521;
    b = (b + a) % 65521;
  }
  return ((b << 16) | a) >>> 0;
}

/** Deflate's stored form: no compression, which needs no compressor. A field
    this smooth would give a real deflate most of its size back, but nothing in
    the platform offers one synchronously, and the alternative — the browser's
    own PNG encoder — is a canvas, which no test can reach. */
function storedDeflate(raw: Uint8Array): Uint8Array {
  const MAX = 65535;
  const blocks = Math.max(1, Math.ceil(raw.length / MAX));
  const out = new Uint8Array(2 + raw.length + blocks * 5 + 4);
  let p = 0;
  out[p++] = 0x78; out[p++] = 0x01;
  for (let i = 0; i < blocks; i++) {
    const start = i * MAX;
    const len = Math.min(MAX, raw.length - start);
    out[p++] = i === blocks - 1 ? 1 : 0;
    out[p++] = len & 0xff; out[p++] = (len >> 8) & 0xff;
    out[p++] = ~len & 0xff; out[p++] = (~len >> 8) & 0xff;
    out.set(raw.subarray(start, start + len), p);
    p += len;
  }
  const sum = adler32(raw);
  out[p++] = (sum >>> 24) & 0xff; out[p++] = (sum >>> 16) & 0xff;
  out[p++] = (sum >>> 8) & 0xff; out[p++] = sum & 0xff;
  return out;
}

const BASE64 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';

function base64(bytes: Uint8Array): string {
  let out = '';
  for (let i = 0; i < bytes.length; i += 3) {
    const a = bytes[i], b = bytes[i + 1], c = bytes[i + 2];
    out += BASE64[a >> 2];
    out += BASE64[((a & 3) << 4) | ((b ?? 0) >> 4)];
    out += i + 1 < bytes.length ? BASE64[((b & 15) << 2) | ((c ?? 0) >> 6)] : '=';
    out += i + 2 < bytes.length ? BASE64[c & 63] : '=';
  }
  return out;
}

function chunk(type: string, data: Uint8Array): Uint8Array {
  const body = new Uint8Array(4 + data.length);
  for (let i = 0; i < 4; i++) body[i] = type.charCodeAt(i);
  body.set(data, 4);
  const out = new Uint8Array(body.length + 8);
  const view = new DataView(out.buffer);
  view.setUint32(0, data.length);
  out.set(body, 4);
  view.setUint32(out.length - 4, crc32(body));
  return out;
}

/** An 8-bit greyscale PNG of the field. */
export function fieldToPng(field: Float32Array, raster: number): string {
  const raw = new Uint8Array((raster + 1) * raster);
  for (let y = 0; y < raster; y++) {
    raw[y * (raster + 1)] = 0;
    for (let x = 0; x < raster; x++) {
      const v = field[y * raster + x];
      raw[y * (raster + 1) + 1 + x] = Math.round(Math.min(1, Math.max(0, v)) * 255);
    }
  }
  const ihdr = new Uint8Array(13);
  const view = new DataView(ihdr.buffer);
  view.setUint32(0, raster);
  view.setUint32(4, raster);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 0; // greyscale
  const parts = [
    new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10]),
    chunk('IHDR', ihdr),
    chunk('IDAT', storedDeflate(raw)),
    chunk('IEND', new Uint8Array(0)),
  ];
  const png = new Uint8Array(parts.reduce((n, p) => n + p.length, 0));
  let at = 0;
  for (const p of parts) { png.set(p, at); at += p.length; }
  return `data:image/png;base64,${base64(png)}`;
}

/** Keyed on the dials the field is built from, so the fill, the icons and the
    preview share one build and a dial that has nothing to do with coverage
    never triggers another. The tab holds four of them at once, the field at
    three stages beside the finished one, with headroom over that. */
const KEYS = [
  'maskBlob', 'maskOctaves', 'maskGrain', 'maskInputMin', 'maskInputMax',
  'maskOutputMin', 'maskOutputMax', 'maskPosterize', 'maskSoftness',
] as const;

const CACHE_MAX = 6;
const cache = new Map<string, string>();

/** The field as a `url(...)` for `mask-image`. */
export function buildMaskUri(s: SketchSettings, seed = 9, through?: MaskStage): string {
  const key = [...KEYS.map((k) => s[k]), seed, through ?? 'all'].join('|');
  const hit = cache.get(key);
  if (hit) return hit;

  const { field, raster } = buildMaskField(s, seed, through);
  // Single quotes: base64 has none of its own, and the value has to survive
  // being set from an inline style attribute as well as from a stylesheet.
  const uri = `url('${fieldToPng(field, raster)}')`;
  if (cache.size >= CACHE_MAX) cache.delete(cache.keys().next().value!);
  cache.set(key, uri);
  return uri;
}
