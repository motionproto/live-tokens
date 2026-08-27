import { describe, expect, it } from 'vitest';
import { buildMaskField, buildMaskUri, MASK_TILE } from './maskField';
import { SKETCH_PRESETS } from './sketchPresets';

const marker = SKETCH_PRESETS.marker;
const flat = { ...marker, maskOutputMin: 0, maskOutputMax: 1, maskPosterize: 1, maskSoftness: 0 };

/** Share of the field in each fifth, blackest first. */
function bands(field: Float32Array): number[] {
  const counts = [0, 0, 0, 0, 0];
  for (const v of field) counts[Math.min(4, Math.floor(v * 5))]++;
  return counts.map((c) => c / field.length);
}

describe('mask field', () => {
  // The failure this replaces: feTurbulence lands in a narrow band around its
  // own midpoint, the levels were written as though it filled 0 to 1, and every
  // setting came out as one flat mid-grey that read as a sheet of 50% opacity.
  it('spans the full range at every grain and octave count', () => {
    for (const maskGrain of ['fractal', 'turbulence'] as const) {
      for (const maskOctaves of [1, 2, 3, 4]) {
        const { field } = buildMaskField({ ...flat, maskGrain, maskOctaves }, 9, 'noise');
        expect(Math.min(...field)).toBeLessThan(0.02);
        expect(Math.max(...field)).toBeGreaterThan(0.98);
      }
    }
  });

  // Reaching black and white is not enough on its own: a veined tile stretched
  // by its extremes still had half its pixels under 0.29, so Steps cut it into
  // thirds that were not thirds and the fill came out flat at the Output floor.
  // Equalised, a handle at 30 means the darkest 30% of the tile, whatever the
  // noise underneath.
  it('spreads tone evenly, so every handle reads as a share of the field', () => {
    for (const maskGrain of ['fractal', 'turbulence'] as const) {
      for (const maskOctaves of [1, 2, 3, 4]) {
        const { field } = buildMaskField({ ...flat, maskGrain, maskOctaves }, 9, 'noise');
        for (const share of bands(field)) expect(share).toBeCloseTo(0.2, 2);
      }
    }
  });

  // The output pair is the density range, not a cut: a low handle above zero
  // is the palest the fill gets, and must never punch a hole through it.
  it('lands the field between the two output levels and nowhere outside them', () => {
    const { field } = buildMaskField({ ...flat, maskOutputMin: 0.4, maskOutputMax: 0.9 }, 9, 'levels');
    let lo = 1, hi = 0;
    for (const v of field) { lo = Math.min(lo, v); hi = Math.max(hi, v); }
    expect(lo).toBeCloseTo(0.4, 2);
    expect(hi).toBeCloseTo(0.9, 2);
    expect(field.some((v) => v < 0.01)).toBe(false);
  });

  // Clamping to the handles instead of stretching into them makes Min the value
  // most of the field sits AT, since the field arrives centred on its own
  // middle: a floor of 0.62 came out as a flat 62% wash with a thin bright tail
  // rather than as a surface with texture on it.
  it('stretches the field into the handles rather than cutting it off there', () => {
    const settings = { ...flat, maskOutputMin: 0.2, maskOutputMax: 0.8 };
    const { field: raw } = buildMaskField(settings, 9, 'noise');
    const { field } = buildMaskField(settings, 9, 'levels');
    for (let i = 0; i < raw.length; i++) expect(field[i]).toBeCloseTo(0.2 + raw[i] * 0.6, 6);
    // The median of a centred field lands mid-range, not on the floor.
    const sorted = Float32Array.from(field).sort();
    expect(sorted[sorted.length >> 1]).toBeGreaterThan(0.4);
  });

  // The Photoshop output handles, and the failure this replaces: a pair that
  // clipped instead of squeezing threw away every tone past the handle, so
  // raising the black point turned most of the field into a flat hole rather
  // than lifting the darkest patch to meet it.
  it('squeezes the whole field between the handles, wherever they sit', () => {
    const { field: full } = buildMaskField(flat, 9, 'levels');
    for (const [min, max] of [[0, 0.455], [0.392, 0.612], [0.392, 1]] as const) {
      const { field } = buildMaskField(
        { ...flat, maskOutputMin: min, maskOutputMax: max }, 9, 'levels');
      let lo = 1, hi = 0;
      for (let i = 0; i < field.length; i++) {
        expect(field[i]).toBeCloseTo(min + full[i] * (max - min), 5);
        lo = Math.min(lo, field[i]); hi = Math.max(hi, field[i]);
      }
      // Both ends land ON the handles, and no more of the field piles up against
      // them than was already at black and white: nothing was cut off.
      expect(lo).toBeCloseTo(min, 2);
      expect(hi).toBeCloseTo(max, 2);
      const pinned = field.filter((v) => v <= lo + 1e-6 || v >= hi - 1e-6).length;
      const extremes = full.filter((v) => v <= 1e-6 || v >= 1 - 1e-6).length;
      expect(pinned).toBeLessThanOrEqual(extremes + 2);
    }
  });

  // Posterising ran after the levels and quantised the floor back down to
  // black, so a fill with a floor well clear of bare still came out in holes.
  it('holds the floor through the posterising', () => {
    const { field } = buildMaskField(
      { ...flat, maskOutputMin: 0.3, maskOutputMax: 1, maskPosterize: 3 }, 9, 'levels');
    expect(Math.min(...field)).toBeCloseTo(0.3, 6);
  });

  it('flattens to a wash as the levels close up', () => {
    const { field } = buildMaskField({ ...flat, maskOutputMin: 0.6, maskOutputMax: 0.6 }, 9, 'levels');
    expect(field.every((v) => Math.abs(v - 0.6) < 1e-6)).toBe(true);
  });

  // The dial used to round the box radius to a whole number of samples, and a
  // sample is two page px: everything under 2.5px came out perfectly sharp and
  // 2.5 to 4.2px came out identical. Two presets shipped a blur they never got.
  it('softens by more at every step of the dial', () => {
    const soften = (maskSoftness: number) => {
      const settings = { ...marker, maskSoftness };
      const before = buildMaskField(settings, 9, 'levels').field;
      const after = buildMaskField(settings, 9).field;
      let sum = 0;
      for (let i = 0; i < before.length; i++) sum += Math.abs(before[i] - after[i]);
      return sum / before.length;
    };
    let last = 0;
    for (const px of [1.75, 2.5, 3.25, 4, 5, 6.7, 12, 20, 32, 48, 64]) {
      const amount = soften(px);
      expect(amount).toBeGreaterThan(last);
      last = amount;
    }
    expect(soften(0)).toBe(0);
  });

  // A tile that does not meet itself draws a line across the page everywhere it
  // repeats, which no dial can take back out.
  it('wraps at both edges', () => {
    const { field, raster } = buildMaskField({ ...flat, maskOctaves: 3 }, 9);
    const step = (a: number, b: number) => Math.abs(a - b);
    let seam = 0, inside = 0;
    for (let i = 0; i < raster; i++) {
      seam = Math.max(seam,
        step(field[i * raster + raster - 1], field[i * raster]),
        step(field[(raster - 1) * raster + i], field[i]));
      for (let j = 1; j < raster; j++) {
        inside = Math.max(inside,
          step(field[i * raster + j - 1], field[i * raster + j]),
          step(field[(j - 1) * raster + i], field[j * raster + i]));
      }
    }
    // The step across the seam is no bigger than the biggest step anywhere
    // inside the tile: the wrap is not a place, it is more of the same field.
    expect(seam).toBeLessThanOrEqual(inside);
  });

  // The tab shows the three stages beside the finished field. A step that ran
  // after the last of them made that strip a liar: the composite came out paler
  // than every tile above it and nothing on screen said why.
  it('ends on the last stage it shows', () => {
    expect([...buildMaskField(marker, 9).field])
      .toEqual([...buildMaskField(marker, 9, 'blur').field]);
  });

  it('flattens the field into as many tones as the steps ask for', () => {
    const { field } = buildMaskField({ ...flat, maskPosterize: 3 }, 9, 'levels');
    expect(new Set(field).size).toBe(3);
  });

  it('paints a greyscale PNG the tile can repeat', () => {
    const uri = buildMaskUri(marker);
    expect(uri.startsWith("url('data:image/png;base64,")).toBe(true);
    const png = Uint8Array.from(atob(uri.slice(27, -2)), (c) => c.charCodeAt(0));
    expect([...png.subarray(0, 8)]).toEqual([137, 80, 78, 71, 13, 10, 26, 10]);
    const head = new DataView(png.buffer, 16);
    expect(head.getUint32(0)).toBe(head.getUint32(4));
    expect(head.getUint32(0)).toBeLessThanOrEqual(MASK_TILE);
    expect(png[24]).toBe(8); // bit depth
    expect(png[25]).toBe(0); // greyscale, which is what mask-mode:luminance reads
  });
});

// No preset tears through. The fill is a texture over an unbroken surface, and
// a bare patch reads as a hole in the component rather than as ink. Dry marker
// runs the thinnest of them and still keeps ink everywhere.
describe('preset coverage', () => {
  for (const [name, preset] of Object.entries(SKETCH_PRESETS)) {
    if (!preset.maskOn) continue;
    it(`${name} keeps the fill`, () => {
      const { field } = buildMaskField(preset, 9);
      expect(Math.min(...field)).toBeGreaterThan(0.1);
    });
  }
});
