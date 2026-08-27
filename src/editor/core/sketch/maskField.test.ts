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
        const share = bands(field);
        expect(Math.min(...field)).toBeLessThan(0.02);
        expect(Math.max(...field)).toBeGreaterThan(0.98);
        expect(Math.min(...share)).toBeGreaterThan(0.02);
      }
    }
  });

  // Input levels cut the field, and since it is stretched to run from black,
  // any low handle above zero punched a hole through the fill.
  it('lands the field between the two output levels and nowhere outside them', () => {
    const { field } = buildMaskField({ ...flat, maskOutputMin: 0.4, maskOutputMax: 0.9 }, 9, 'output');
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
    const { field } = buildMaskField(settings, 9, 'output');
    for (let i = 0; i < raw.length; i++) expect(field[i]).toBeCloseTo(0.2 + raw[i] * 0.6, 6);
    // The median of a centred field lands mid-range, not on the floor.
    const sorted = Float32Array.from(field).sort();
    expect(sorted[sorted.length >> 1]).toBeGreaterThan(0.4);
  });

  // Posterising ran after the levels and quantised the floor back down to
  // black, so a fill with a floor well clear of bare still came out in holes.
  it('holds the floor through the posterising', () => {
    const { field } = buildMaskField(
      { ...flat, maskOutputMin: 0.3, maskOutputMax: 1, maskPosterize: 3 }, 9, 'output');
    expect(Math.min(...field)).toBeCloseTo(0.3, 6);
  });

  it('flattens to a wash as the levels close up', () => {
    const { field } = buildMaskField({ ...flat, maskOutputMin: 0.6, maskOutputMax: 0.6 }, 9, 'output');
    expect(field.every((v) => Math.abs(v - 0.6) < 1e-6)).toBe(true);
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
    const { field } = buildMaskField({ ...flat, maskPosterize: 3 }, 9, 'output');
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
