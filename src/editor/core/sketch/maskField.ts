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
 * dials that follow are a levels control: Steps quantises the field, Output
 * squeezes it into the density range the mask paints between. Neither ever
 * clips: the field arrives running black to white and every tone survives to
 * the other end in the order it started.
 *
 * Everything is integer maths on a Float32Array with no DOM, so what a test
 * asserts is what the browser paints.
 */
import type { SketchStyle } from './sketchStyles';

/** Samples across the tile, on both axes. Fixed, whatever the blobs measure:
    the field is blobs and gradients, so the browser stretching the tile back to
    page px costs nothing visible, and the data URI stays one size. */
const RASTER = 300;

/** Blobs per tile, and so how far the field runs before it repeats. Held in
    this band rather than taken from the blob size alone: under two the lattice
    is smaller than a pattern, and over forty a blob is down to seven samples
    across and the finest octave starts to alias. */
const CELLS = { min: 2, max: 40 };

/** The tile the band is aimed at, in page px. A blob wants enough of them
    around it that the repeat is not a thing you can see. */
const TARGET_TILE = 600;

/** How far the cell count is allowed to drift from the tile it is aimed at to
    buy a degree of rotation, as degrees per e-fold. A tilt the dial cannot
    reach is worth more than a tile at exactly 600px. */
const CELL_DRIFT = 12;

type Vec = readonly [number, number];

/**
 * Where the page's own axes land on the noise lattice, and the tile that puts
 * them there.
 *
 * The field wraps by reducing every lattice point modulo the pair, so both
 * vectors have to be whole cells. Axis-aligned that is no constraint at all —
 * a tile some whole number of blobs wide — but a tilted pattern only meets
 * itself if the turn lands the page's axes back on the lattice, which most
 * angles do not. The dial is answered with the nearest pair that does, and
 * `angle` reports what that came out as rather than what was asked for.
 *
 * Rotation is dropped when the two blob sizes match: the field under it is the
 * same in every direction, so turning it only draws a different tile of the
 * same thing, and the fit is exact left alone.
 */
export interface MaskLattice {
  /** The page's x axis in cells, then its y axis. */
  vx: Vec;
  vy: Vec;
  /** The tile in page px. */
  w: number;
  h: number;
  /** The turn the pair actually describes, in degrees. */
  angle: number;
}

export function maskLattice(s: SketchStyle): MaskLattice {
  const ask = s.maskBlobX === s.maskBlobY ? 0 : s.maskAngle;
  const rad = ask * (Math.PI / 180);
  const cos = Math.cos(rad), sin = Math.sin(rad);
  const dx: Vec = [cos / s.maskBlobX, -sin / s.maskBlobY];
  const dy: Vec = [sin / s.maskBlobX, cos / s.maskBlobY];
  const vx = fit(dx, ask, (v) => turnOf(-v[1] * s.maskBlobY, v[0] * s.maskBlobX));
  let vy = fit(dy, ask, (v) => turnOf(v[0] * s.maskBlobX, v[1] * s.maskBlobY));
  // Two vectors along one line describe no tile at all. The turn of the first
  // is the whole look, so the second is the one that gives way.
  if (vx[0] * vy[1] - vx[1] * vy[0] === 0) vy = [-vx[1], vx[0]];
  return {
    vx,
    vy,
    w: Math.hypot(...vx) / Math.hypot(...dx),
    h: Math.hypot(...vy) / Math.hypot(...dy),
    angle: turnOf(-vx[1] * s.maskBlobY, vx[0] * s.maskBlobX),
  };
}

/** A direction as a turn from level, 0 to 180: a stretch has a slant, not a
    heading, so pointing back the way it came is the same slant. */
function turnOf(rise: number, run: number): number {
  return (((Math.atan2(rise, run) * (180 / Math.PI)) % 180) + 180) % 180;
}

/**
 * The whole-cell vector that lands the tile nearest the turn the dial asks for,
 * weighing that against the number of cells it spends getting there.
 *
 * Scored on the turn the page ends up showing, never on the one the vector
 * makes against the lattice. The two part company as soon as the blob sizes
 * do: at seven to one, a vector a degree off square on the lattice comes out
 * eight degrees off on the page, and a fit that reads the lattice believes it
 * has landed.
 */
function fit(d: Vec, ask: number, turn: (v: Vec) => number): Vec {
  const length = Math.hypot(...d);
  const unit: Vec = [d[0] / length, d[1] / length];
  const target = Math.min(CELLS.max, Math.max(CELLS.min, TARGET_TILE * length));
  let best: Vec = [1, 0];
  let bestCost = Infinity;
  for (let cells = CELLS.min; cells <= CELLS.max; cells++) {
    const v: Vec = [Math.round(unit[0] * cells), Math.round(unit[1] * cells)];
    const spent = Math.hypot(...v);
    if (spent === 0) continue;
    const off = Math.abs(turn(v) - ask);
    const cost = Math.min(off, 180 - off) + CELL_DRIFT * Math.abs(Math.log(spent / target));
    if (cost < bestCost) { bestCost = cost; best = v; }
  }
  return best;
}

/**
 * What the tile spans in page px, as `mask-size` takes it.
 *
 * A whole number of blobs along each of the page's axes, at exactly the size
 * the dials state, so the number on the Scale dial is the number of pixels a
 * blob measures on the page. The tile used to be a fixed 600px with the blobs
 * fitted to it, which meant the dial could only reach the sizes that divide
 * 600: it said 250px and painted 300px, and there was nothing above that.
 */
export function maskTile(s: SketchStyle): { w: number; h: number } {
  const { w, h } = maskLattice(s);
  return { w, h };
}

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
 * Perlin noise on a lattice that wraps on the tile's own two vectors, so a tile
 * drawn from it meets itself at both edges however the pattern is turned.
 * Returns roughly -0.7 to 0.7.
 *
 * Hand-rolled because the wrap is the whole requirement and no established
 * noise package offers one: `simplex-noise` and its neighbours all sample an
 * endless plane. The usual way to tile them is to walk two circles through 4D
 * noise, and it degenerates at the ratio this effect works at — a tile only
 * four or five blobs across makes those circles smaller than one noise feature,
 * and the field comes back as a regular grid of dots instead of cloud. A
 * lattice wraps exactly at any size, and on any pair of whole-cell vectors,
 * which is what lets the pattern be turned.
 *
 * Gradients are drawn from the whole circle, one per lattice point, rather than
 * from the eight compass directions the textbook version uses. Eight leaves
 * every blob squared off against the axes.
 */
const GRAD_COUNT = 256;

/** One octave's tile vectors, and the determinant that reduces against them. */
interface Wrap { ax: number; ay: number; bx: number; by: number; det: number }

function wrapOn(vx: Vec, vy: Vec, octave: number): Wrap {
  const ax = vx[0] * octave, ay = vx[1] * octave;
  const bx = vy[0] * octave, by = vy[1] * octave;
  return { ax, ay, bx, by, det: ax * by - bx * ay };
}

function makePerlin(seed: number): (x: number, y: number, w: Wrap) => number {
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

  /** The gradient at a lattice point, taken at that point's stand-in inside the
      tile. Two points a tile apart reduce to the same stand-in and so carry the
      same gradient, which is the whole of the wrap: it holds on any pair of
      vectors, not only on the two an axis-aligned tile runs along. */
  const g = (i: number, j: number, w: Wrap, dx: number, dy: number) => {
    const alpha = Math.floor((i * w.by - w.bx * j) / w.det);
    const beta = Math.floor((w.ax * j - i * w.ay) / w.det);
    const cx = i - alpha * w.ax - beta * w.bx;
    const cy = j - alpha * w.ay - beta * w.by;
    const h = perm[(perm[cx & 255] + cy) & 255];
    return gx[h] * dx + gy[h] * dy;
  };

  return (x, y, w) => {
    const x0 = Math.floor(x), y0 = Math.floor(y);
    const xf = x - x0, yf = y - y0;
    const u = fade(xf), v = fade(yf);
    return lerp(v,
      lerp(u, g(x0, y0, w, xf, yf), g(x0 + 1, y0, w, xf - 1, yf)),
      lerp(u, g(x0, y0 + 1, w, xf, yf - 1), g(x0 + 1, y0 + 1, w, xf - 1, yf - 1)));
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
function rawField(
  s: SketchStyle, seed: number, raster: number, lattice: MaskLattice,
): Float32Array {
  const noise = makePerlin(seed);
  const veined = s.maskGrain === 'turbulence';
  const octaves = Math.max(1, Math.round(s.maskOctaves));
  const out = new Float32Array(raster * raster);
  const wraps = Array.from({ length: octaves }, (_, o) => wrapOn(lattice.vx, lattice.vy, 1 << o));

  let weightSum = 0;
  for (let o = 0; o < octaves; o++) weightSum += 1 / (1 << o);

  // A sample's place in the tile, carried onto the lattice by the tile's own
  // two vectors. Square on, they are (cells, 0) and (0, cells) and this is the
  // walk it always was; turned, they lean, and so does the field.
  for (let y = 0; y < raster; y++) {
    const ty = y / raster;
    for (let x = 0; x < raster; x++) {
      const tx = x / raster;
      const a = tx * lattice.vx[0] + ty * lattice.vy[0];
      const b = tx * lattice.vx[1] + ty * lattice.vy[1];
      let sum = 0;
      for (let o = 0; o < octaves; o++) {
        const f = 1 << o;
        const n = noise(a * f, b * f, wraps[o]);
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

/** Output levels, the same squeeze Photoshop's output handles apply. The whole
    field is stretched into the gap between them, so the pair states the range
    the mask paints: nothing is barer than Min or denser than Max, and every
    tone in between keeps its place in the order.

    Never a cut. Clipping to the handles instead would make Min the value most
    of the field sits AT rather than its floor, and the fill would come out a
    flat wash at the floor with a thin bright tail above it. */
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

/** Wrapped box blur, so the blur cannot draw a rim where the tile repeats.

    Three boxes at the width the filter spec derives land on a gaussian of a
    given deviation, which is what makes the dial's px the px it gets. But a box
    radius is a whole number of samples, so rounding to one put the dial on a
    ladder with a dead zone at the bottom: every small setting came out
    perfectly sharp and a spread of them came out identical. Mixing the two
    radii either side of the exact one puts the dial back on a continuous scale,
    and radius zero is the field itself, so the bottom of the travel eases in
    instead of switching on.

    Run one axis at a time, since a sample is a different number of page px
    across than it is down whenever the two blob sizes disagree. A gaussian is
    separable, so a pass along each axis is the same blur the square one gave. */
function blur(f: Float32Array, raster: number, stdX: number, stdY: number): Float32Array {
  return blurAxis(blurAxis(f, raster, stdX, 1), raster, stdY, raster);
}

function blurAxis(f: Float32Array, n: number, std: number, stride: number): Float32Array {
  const exact = (std * 3 * Math.sqrt(2 * Math.PI) / 4 - 1) / 2;
  if (exact <= 0) return f;
  const lower = Math.floor(exact);
  const mix = exact - lower;
  const low = lower < 1 ? f : boxes(f, n, lower, stride);
  if (mix < 1e-6) return low;
  const high = boxes(f, n, lower + 1, stride);
  const out = new Float32Array(f.length);
  for (let i = 0; i < f.length; i++) out[i] = low[i] + (high[i] - low[i]) * mix;
  return out;
}

function boxes(f: Float32Array, n: number, radius: number, stride: number): Float32Array {
  let cur = f;
  for (let pass = 0; pass < 3; pass++) cur = boxPass(cur, n, radius, stride);
  return cur;
}

/** One pass along a single axis. `stride` is 1 across a row and the raster width
    down a column, so one sliding window serves both. */
function boxPass(f: Float32Array, n: number, radius: number, stride: number): Float32Array {
  const out = new Float32Array(f.length);
  const lineStep = stride === 1 ? n : 1;
  const width = radius * 2 + 1;
  for (let line = 0; line < n; line++) {
    const base = line * lineStep;
    const at = (i: number) => f[base + ((((i % n) + n) % n)) * stride];
    let sum = 0;
    for (let i = -radius; i <= radius; i++) sum += at(i);
    for (let i = 0; i < n; i++) {
      out[base + i * stride] = sum / width;
      sum += at(i + radius + 1) - at(i - radius);
    }
  }
  return out;
}

/* ---------------------------------------------------------------- field --- */

/** The raw field, kept across calls. The tab asks for the same tile at four
    different stages on every dial move, and the noise is the expensive part of
    all four; the levels, the posterising and the blur are one pass each. */
let rawCache: { key: string; field: Float32Array } | null = null;

function cachedRaw(s: SketchStyle, seed: number): Float32Array {
  const lattice = maskLattice(s);
  // Keyed on the tile vectors rather than the blob sizes: most of the Scale
  // dial's travel paints the same lattice at another size, and the field is
  // the expensive half of the build.
  const key = [...lattice.vx, ...lattice.vy, s.maskOctaves, s.maskGrain, seed].join('|');
  if (rawCache?.key !== key) rawCache = { key, field: rawField(s, seed, RASTER, lattice) };
  return rawCache.field;
}

/**
 * The finished field, 0 (bare) to 1 (inked), row-major.
 *
 * `through` stops the pipeline early. Nothing in the app asks for a part of it
 * — the tab shows the finished field and nothing else — but the levels are
 * three passes over one array, and the seam is where the tests read what each
 * pass did.
 */
export function buildMaskField(
  s: SketchStyle, seed = 9, through?: MaskStage,
): { field: Float32Array; raster: number } {
  const raw = cachedRaw(s, seed);
  if (through === 'noise') return { field: raw, raster: RASTER };

  const levelled = applyOutput(
    posterise(Float32Array.from(raw), s.maskPosterize), s.maskOutputMin, s.maskOutputMax,
  );
  if (through === 'levels') return { field: levelled, raster: RASTER };

  const tile = maskTile(s);
  return {
    field: blur(levelled, RASTER, s.maskSoftness / (tile.w / RASTER), s.maskSoftness / (tile.h / RASTER)),
    raster: RASTER,
  };
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
  'maskBlobX', 'maskBlobY', 'maskAngle', 'maskOctaves', 'maskGrain',
  'maskOutputMin', 'maskOutputMax',
  'maskPosterize', 'maskSoftness',
] as const;

const CACHE_MAX = 6;
const cache = new Map<string, string>();

/** The field as a `url(...)` for `mask-image`. */
export function buildMaskUri(s: SketchStyle, seed = 9, through?: MaskStage): string {
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
