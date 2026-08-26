import { describe, expect, it } from 'vitest';
import { buildMaskField, buildMaskUri, MASK_TILE } from './maskField';
import { SKETCH_PRESETS } from './sketchPresets';

const marker = SKETCH_PRESETS.marker;
const flat = { ...marker, maskLevelMin: 0, maskLevelMax: 1, maskPosterize: 1, maskSoftness: 0 };

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

  it('erases more as the lower level rises and inks more as the upper falls', () => {
    const bare = (s: Partial<typeof flat>) => {
      const { field } = buildMaskField({ ...flat, ...s }, 9, 'levels');
      return field.reduce((n, v) => n + (v < 0.01 ? 1 : 0), 0) / field.length;
    };
    expect(bare({ maskLevelMin: 0.5 })).toBeGreaterThan(bare({ maskLevelMin: 0.2 }));

    const solid = (s: Partial<typeof flat>) => {
      const { field } = buildMaskField({ ...flat, ...s }, 9, 'levels');
      return field.reduce((n, v) => n + (v > 0.99 ? 1 : 0), 0) / field.length;
    };
    expect(solid({ maskLevelMax: 0.4 })).toBeGreaterThan(solid({ maskLevelMax: 0.8 }));
  });

  it('cuts the field to two tones as the levels close up', () => {
    const mid = (min: number, max: number) => {
      const { field } = buildMaskField({ ...flat, maskLevelMin: min, maskLevelMax: max }, 9, 'levels');
      return field.reduce((n, v) => n + (v > 0.1 && v < 0.9 ? 1 : 0), 0) / field.length;
    };
    expect(mid(0.48, 0.52)).toBeLessThan(0.1);
    expect(mid(0.2, 0.8)).toBeGreaterThan(0.6);
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
