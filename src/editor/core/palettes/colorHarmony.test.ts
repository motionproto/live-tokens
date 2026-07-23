import { describe, expect, it } from 'vitest';
import {
  harmonyHues,
  tintNeutralsFromAnchor,
  AXIS_COUNT,
  AXIS_ROLES,
  defaultHarmonyAxes,
  applyHarmonyToAxes,
  boundColorPatch,
  sanitizeHarmonyAxes,
  axesFromLegacyOrder,
  type HarmonyMode,
  type HarmonyAxis,
} from './colorHarmony';
import { hexToOklch, oklchToHex } from './oklch';
import { DEFAULT_PALETTE_LIGHTNESS, DEFAULT_PALETTE_SATURATION, defaultScaleCurves, PALETTE_SPECS } from './paletteDerivation';
import type { PaletteConfig } from '../themes/themeTypes';

function mkP(baseColorHex: string): PaletteConfig {
  return {
    baseColor: hexToOklch(baseColorHex),
    lightnessCurve: DEFAULT_PALETTE_LIGHTNESS(),
    saturationCurve: DEFAULT_PALETTE_SATURATION(),
    scaleCurves: {
      Surfaces: { lightness: defaultScaleCurves.Surfaces.lightness(), saturation: defaultScaleCurves.Surfaces.saturation() },
      Borders: { lightness: defaultScaleCurves.Borders.lightness(), saturation: defaultScaleCurves.Borders.saturation() },
      Text: { lightness: defaultScaleCurves.Text.lightness(), saturation: defaultScaleCurves.Text.saturation() },
    },
    curveOffset: {},
    overrides: {},
    snappedScales: [],
  };
}

describe('harmonyHues geometry', () => {
  // Slot order (priority-ordered): slot 1 is the primary harmonic partner.
  it('pins each mode relative to the anchor', () => {
    expect(harmonyHues('complementary', 30, 3)).toEqual([30, 210, 30]);
    expect(harmonyHues('split-complementary', 30, 3)).toEqual([30, 240, 180]);
    expect(harmonyHues('triadic', 30, 3)).toEqual([30, 270, 150]);
    expect(harmonyHues('square', 30, 3)).toEqual([30, 210, 120]);
    expect(harmonyHues('analogous', 30, 3)).toEqual([30, 60, 0]);
    expect(harmonyHues('monochromatic', 30, 3)).toEqual([30, 30, 30]);
    expect(harmonyHues('custom', 30, 3)).toEqual([30, 30, 30]);
  });

  it('normalizes wrap-around into 0..360', () => {
    expect(harmonyHues('complementary', 350, 3)).toEqual([350, 170, 350]);
    expect(harmonyHues('analogous', 10, 3)).toEqual([10, 40, 340]);
    expect(harmonyHues('triadic', 300, 3)).toEqual([300, 180, 60]);
  });

  it('returns the first slotCount slots (1..4)', () => {
    expect(harmonyHues('square', 30, 1)).toEqual([30]);
    expect(harmonyHues('square', 30, 2)).toEqual([30, 210]);
    expect(harmonyHues('square', 30, 4)).toEqual([30, 210, 120, 300]);
  });
});

describe('harmony via axes (boundColorPatch ∘ applyHarmonyToAxes)', () => {
  // In-gamut seeds so the hex round-trip stays tight enough to assert preservation.
  const palettes: Record<string, PaletteConfig> = {
    Brand: mkP(oklchToHex(0.6, 0.1, 30)),
    Background: mkP(oklchToHex(0.65, 0.08, 200)),
    Accent: mkP(oklchToHex(0.55, 0.12, 100)),
    Special: mkP(oklchToHex(0.5, 0.15, 280)),
    Neutral: mkP(oklchToHex(0.6, 0.02, 50)),
  };

  // The default composition: the trio bound at their palette hues (so axis 0
  // anchors on Brand), Quaternary unbound — the shape a fresh theme carries.
  const defaultAxes = (): HarmonyAxis[] => [
    { hue: palettes.Brand.baseColor.h, family: 'Brand' },
    { hue: palettes.Accent.baseColor.h, family: 'Accent' },
    { hue: palettes.Background.baseColor.h, family: 'Background' },
    { hue: n(palettes.Brand.baseColor.h + 270), family: null },
  ];
  const patchFor = (mode: HarmonyMode, axes: HarmonyAxis[] = defaultAxes()) =>
    boundColorPatch(applyHarmonyToAxes(mode, axes), palettes);

  const defaultOrder = ['Brand', 'Accent', 'Background'] as const;

  it('re-hues only the bound trio; each own c + L unchanged', () => {
    const out = patchFor('triadic');
    expect(Object.keys(out).sort()).toEqual(['Accent', 'Background', 'Brand']);
    expect('Special' in out).toBe(false);
    expect('Neutral' in out).toBe(false);

    const hues = harmonyHues('triadic', palettes.Brand.baseColor.h, AXIS_COUNT);
    defaultOrder.forEach((label, i) => {
      const before = palettes[label].baseColor;
      // Exact: only the hue moves; L and C are the seed's own, unclamped.
      expect(out[label]).toEqual({ l: before.l, c: before.c, h: hues[i] });
    });
  });

  it('is deterministic', () => {
    expect(patchFor('split-complementary')).toEqual(patchFor('split-complementary'));
  });

  it('every mode leaves L and C untouched for the trio (hue-only, no chroma clamp)', () => {
    const modes: HarmonyMode[] = ['complementary', 'split-complementary', 'triadic', 'square', 'analogous', 'monochromatic'];
    for (const mode of modes) {
      const out = patchFor(mode);
      const hues = harmonyHues(mode, palettes.Brand.baseColor.h, AXIS_COUNT);
      defaultOrder.forEach((label, i) => {
        const before = palettes[label].baseColor;
        expect(out[label]).toEqual({ l: before.l, c: before.c, h: hues[i] });
      });
    }
  });

  // Invariant 3: with the default shape, per-family output is exactly today's
  // pre-generalization values. Offsets are literal so this never tracks harmonyHues.
  it('pins default-shape per-family hues to the pre-generalization values', () => {
    const a = palettes.Brand.baseColor.h;
    const perFamily: Record<Exclude<HarmonyMode, 'custom'>, { Brand: number; Accent: number; Background: number }> = {
      monochromatic:         { Brand: a, Accent: a,            Background: a },
      analogous:             { Brand: a, Accent: n(a + 30),    Background: n(a - 30) },
      complementary:         { Brand: a, Accent: n(a + 180),   Background: a },
      'split-complementary': { Brand: a, Accent: n(a + 210),   Background: n(a + 150) },
      triadic:               { Brand: a, Accent: n(a + 240),   Background: n(a + 120) },
      square:                { Brand: a, Accent: n(a + 180),   Background: n(a + 90) },
    };
    for (const mode of Object.keys(perFamily) as (keyof typeof perFamily)[]) {
      const out = patchFor(mode);
      for (const label of defaultOrder) {
        const before = palettes[label].baseColor;
        expect(out[label].l).toBe(before.l);
        expect(out[label].c).toBe(before.c);
        expect(out[label].h).toBeCloseTo(perFamily[mode][label], 9);
      }
    }
  });

  it('square with Special bound to Quaternary sends it to anchor + 270', () => {
    const axes: HarmonyAxis[] = [
      { hue: palettes.Brand.baseColor.h, family: 'Brand' },
      { hue: palettes.Background.baseColor.h, family: 'Background' },
      { hue: palettes.Accent.baseColor.h, family: 'Accent' },
      { hue: palettes.Special.baseColor.h, family: 'Special' },
    ];
    const out = patchFor('square', axes);
    expect(Object.keys(out).sort()).toEqual(['Accent', 'Background', 'Brand', 'Special']);
    const before = palettes.Special.baseColor;
    expect(out.Special.l).toBe(before.l);
    expect(out.Special.c).toBe(before.c);
    expect(out.Special.h).toBeCloseTo((palettes.Brand.baseColor.h + 270) % 360, 9);
  });

  it('honors a non-Brand anchor (axis 0)', () => {
    const axes: HarmonyAxis[] = [
      { hue: palettes.Accent.baseColor.h, family: 'Accent' },
      { hue: palettes.Brand.baseColor.h, family: 'Brand' },
      { hue: 0, family: null },
      { hue: 0, family: null },
    ];
    const out = patchFor('complementary', axes);
    const accentHue = palettes.Accent.baseColor.h;
    expect(out.Accent).toEqual({ l: palettes.Accent.baseColor.l, c: palettes.Accent.baseColor.c, h: accentHue });
    expect(out.Brand.l).toBe(palettes.Brand.baseColor.l);
    expect(out.Brand.c).toBe(palettes.Brand.baseColor.c);
    expect(out.Brand.h).toBeCloseTo((accentHue + 180) % 360, 9);
    expect('Background' in out).toBe(false);
  });

  it('never touches unbound families', () => {
    const axes: HarmonyAxis[] = [
      { hue: palettes.Brand.baseColor.h, family: 'Brand' },
      { hue: palettes.Accent.baseColor.h, family: 'Accent' },
      { hue: 0, family: null },
      { hue: 0, family: null },
    ];
    const out = patchFor('triadic', axes);
    expect(Object.keys(out).sort()).toEqual(['Accent', 'Brand']);
    expect('Background' in out).toBe(false);
  });

  it('skips a bound axis whose config is missing', () => {
    const axes: HarmonyAxis[] = [
      { hue: 40, family: 'Alternate' }, // no palette in this map
      { hue: palettes.Brand.baseColor.h, family: 'Brand' },
      { hue: 0, family: null },
      { hue: 0, family: null },
    ];
    const out = patchFor('triadic', axes);
    expect('Alternate' in out).toBe(false);
    expect('Brand' in out).toBe(true);
  });
});

describe('tintNeutralsFromAnchor', () => {
  it('re-hues Neutral + Alternate to the anchor hue, keeping their own c + L', () => {
    const palettes: Record<string, PaletteConfig> = {
      Brand: mkP(oklchToHex(0.6, 0.12, 120)),
      Neutral: mkP(oklchToHex(0.6, 0.02, 50)),
      Alternate: mkP(oklchToHex(0.62, 0.03, 300)),
      Special: mkP(oklchToHex(0.5, 0.15, 280)),
    };
    const anchorHue = palettes.Brand.baseColor.h;
    const out = tintNeutralsFromAnchor(palettes, anchorHue);
    expect(Object.keys(out).sort()).toEqual(['Alternate', 'Neutral']);

    for (const label of ['Neutral', 'Alternate']) {
      const before = palettes[label].baseColor;
      expect(out[label]).toEqual({ l: before.l, c: before.c, h: anchorHue });
    }
    expect('Special' in out).toBe(false);
    expect('Brand' in out).toBe(false);
  });

  it('tints from an arbitrary anchor hue', () => {
    const palettes: Record<string, PaletteConfig> = {
      Neutral: mkP(oklchToHex(0.6, 0.02, 50)),
      Alternate: mkP(oklchToHex(0.62, 0.03, 300)),
    };
    const out = tintNeutralsFromAnchor(palettes, 100);
    for (const label of ['Neutral', 'Alternate']) {
      const before = palettes[label].baseColor;
      expect(out[label]).toEqual({ l: before.l, c: before.c, h: 100 });
    }
  });
});

const specHue = (label: string): number => PALETTE_SPECS.find((s) => s.label === label)!.initialColor.h;
const n = (h: number): number => ((h % 360) + 360) % 360;

describe('defaultHarmonyAxes', () => {
  it('AXIS_ROLES names the four roles by index', () => {
    expect(AXIS_COUNT).toBe(4);
    expect(AXIS_ROLES).toEqual(['Anchor', 'Secondary', 'Tertiary', 'Quaternary']);
  });

  it('binds the default trio and leaves Quaternary unbound', () => {
    const axes = defaultHarmonyAxes();
    expect(axes.length).toBe(AXIS_COUNT);
    expect(axes.map((a) => a.family)).toEqual(['Brand', 'Accent', 'Background', null]);
  });

  it('seeds bound hues from PALETTE_SPECS; Quaternary sits at anchor + 270', () => {
    const axes = defaultHarmonyAxes();
    expect(axes[0].hue).toBe(specHue('Brand'));
    expect(axes[1].hue).toBe(specHue('Accent'));
    expect(axes[2].hue).toBe(specHue('Background'));
    expect(axes[3].hue).toBeCloseTo(n(specHue('Brand') + 270), 9);
  });

  it('returns a fresh array each call (seeds mutable state)', () => {
    expect(defaultHarmonyAxes()).not.toBe(defaultHarmonyAxes());
  });
});

describe('applyHarmonyToAxes', () => {
  const baseAxes = (): HarmonyAxis[] => [
    { hue: 30, family: 'Brand' },
    { hue: 200, family: 'Accent' },
    { hue: 100, family: 'Background' },
    { hue: 300, family: null },
  ];

  it('deals each axis its slot hue from axis 0, bindings preserved', () => {
    const modes: HarmonyMode[] = ['complementary', 'split-complementary', 'triadic', 'square', 'analogous', 'monochromatic'];
    for (const mode of modes) {
      const out = applyHarmonyToAxes(mode, baseAxes());
      expect(out.map((a) => a.hue)).toEqual(harmonyHues(mode, 30, AXIS_COUNT));
      expect(out.map((a) => a.family)).toEqual(['Brand', 'Accent', 'Background', null]);
    }
  });

  it('custom returns an unchanged copy', () => {
    const axes = baseAxes();
    const out = applyHarmonyToAxes('custom', axes);
    expect(out).toEqual(axes);
    expect(out).not.toBe(axes);
    expect(out[0]).not.toBe(axes[0]);
  });

  it('deals slot-2 geometry to a Tertiary binding even when Secondary is unbound', () => {
    const axes: HarmonyAxis[] = [
      { hue: 30, family: 'Brand' },
      { hue: 200, family: null },
      { hue: 100, family: 'Background' },
      { hue: 300, family: null },
    ];
    const out = applyHarmonyToAxes('square', axes);
    expect(out[1].family).toBe(null);
    expect(out[2].family).toBe('Background');
    expect(out[2].hue).toBeCloseTo(n(30 + 90), 9);
  });
});

describe('boundColorPatch', () => {
  const palettes: Record<string, PaletteConfig> = {
    Brand: mkP(oklchToHex(0.6, 0.1, 30)),
    Accent: mkP(oklchToHex(0.55, 0.12, 100)),
    Background: mkP(oklchToHex(0.65, 0.08, 200)),
  };

  it('re-hues each bound family to its axis hue, own c + L kept', () => {
    const axes: HarmonyAxis[] = [
      { hue: 12, family: 'Brand' },
      { hue: 340, family: 'Accent' },
      { hue: 77, family: null },
      { hue: 300, family: null },
    ];
    const out = boundColorPatch(axes, palettes);
    expect(Object.keys(out).sort()).toEqual(['Accent', 'Brand']);
    expect(out.Brand).toEqual({ l: palettes.Brand.baseColor.l, c: palettes.Brand.baseColor.c, h: 12 });
    expect(out.Accent).toEqual({ l: palettes.Accent.baseColor.l, c: palettes.Accent.baseColor.c, h: 340 });
  });

  it('skips unbound axes and families without a palette', () => {
    const axes: HarmonyAxis[] = [
      { hue: 12, family: 'Special' },
      { hue: 340, family: null },
      { hue: 77, family: null },
      { hue: 300, family: null },
    ];
    expect(boundColorPatch(axes, palettes)).toEqual({});
  });

  it('a fully-unbound axes array produces no keys', () => {
    const axes: HarmonyAxis[] = [
      { hue: 10, family: null }, { hue: 20, family: null },
      { hue: 30, family: null }, { hue: 40, family: null },
    ];
    expect(boundColorPatch(axes, palettes)).toEqual({});
  });
});

describe('sanitizeHarmonyAxes', () => {
  const palettes: Record<string, PaletteConfig> = {
    Brand: mkP(oklchToHex(0.6, 0.1, 33)),
    Accent: mkP(oklchToHex(0.55, 0.12, 111)),
    Background: mkP(oklchToHex(0.65, 0.08, 222)),
    Special: mkP(oklchToHex(0.5, 0.15, 280)),
  };

  it('non-array input yields the default axes reconciled against the palettes', () => {
    const out = sanitizeHarmonyAxes(undefined, palettes);
    expect(out.map((a) => a.family)).toEqual(['Brand', 'Accent', 'Background', null]);
    expect(out[0].hue).toBeCloseTo(palettes.Brand.baseColor.h, 9);
    expect(out[1].hue).toBeCloseTo(palettes.Accent.baseColor.h, 9);
    expect(out[2].hue).toBeCloseTo(palettes.Background.baseColor.h, 9);
  });

  it('truncates extra entries and pads missing indexes from the defaults', () => {
    const padded = sanitizeHarmonyAxes([{ family: 'Special', hue: 10 }, { family: null, hue: 20 }], {});
    expect(padded.length).toBe(AXIS_COUNT);
    expect(padded[0]).toEqual({ family: 'Special', hue: 10 });
    expect(padded[1]).toEqual({ family: null, hue: 20 });
    expect(padded[2].family).toBe('Background');
    expect(padded[3].family).toBe(null);

    const truncated = sanitizeHarmonyAxes(
      [
        { family: 'Brand', hue: 1 }, { family: 'Accent', hue: 2 },
        { family: 'Background', hue: 3 }, { family: 'Special', hue: 4 },
        { family: 'Brand', hue: 5 }, { family: 'Accent', hue: 6 },
      ],
      {},
    );
    expect(truncated.length).toBe(AXIS_COUNT);
    expect(truncated.map((a) => a.family)).toEqual(['Brand', 'Accent', 'Background', 'Special']);
  });

  it('drops an ineligible family to null, keeping its axis hue', () => {
    const out = sanitizeHarmonyAxes(
      [{ family: 'Danger', hue: 50 }, { family: 'Accent', hue: 60 }, { family: 'Background', hue: 70 }, { family: null, hue: 80 }],
      {},
    );
    expect(out[0].family).toBe(null);
    expect(out[0].hue).toBe(50);
  });

  it('nulls a duplicate family already used at a lower index', () => {
    const out = sanitizeHarmonyAxes(
      [{ family: 'Brand', hue: 10 }, { family: 'Brand', hue: 20 }, { family: 'Accent', hue: 30 }, { family: null, hue: 40 }],
      {},
    );
    expect(out[0].family).toBe('Brand');
    expect(out[1].family).toBe(null);
    expect(out[1].hue).toBe(20);
  });

  it('replaces a non-finite hue with the default axis hue for that index', () => {
    const defaults = defaultHarmonyAxes();
    const out = sanitizeHarmonyAxes(
      [{ family: null, hue: Number.NaN }, { family: null, hue: Infinity }, { family: null, hue: 5 }, { family: null, hue: 6 }],
      {},
    );
    expect(out[0].hue).toBe(defaults[0].hue);
    expect(out[1].hue).toBe(defaults[1].hue);
    expect(out[2].hue).toBe(5);
  });

  it('normalizes hues into [0, 360)', () => {
    const out = sanitizeHarmonyAxes(
      [{ family: null, hue: 400 }, { family: null, hue: -30 }, { family: null, hue: 720 }, { family: null, hue: 359 }],
      {},
    );
    expect(out.map((a) => a.hue)).toEqual([40, 330, 0, 359]);
  });

  it('snaps a bound axis hue to its palette (color is ground truth on load)', () => {
    const out = sanitizeHarmonyAxes(
      [{ family: 'Brand', hue: 12 }, { family: null, hue: 20 }, { family: null, hue: 30 }, { family: null, hue: 40 }],
      palettes,
    );
    expect(out[0].family).toBe('Brand');
    expect(out[0].hue).not.toBe(12);
    expect(out[0].hue).toBeCloseTo(palettes.Brand.baseColor.h, 9);
  });
});

describe('axesFromLegacyOrder', () => {
  const palettes: Record<string, PaletteConfig> = {
    Brand: mkP(oklchToHex(0.6, 0.1, 33)),
    Accent: mkP(oklchToHex(0.55, 0.12, 111)),
    Background: mkP(oklchToHex(0.65, 0.08, 222)),
    Special: mkP(oklchToHex(0.5, 0.15, 280)),
  };

  it('undefined yields the default trio bound with palette-seeded hues, Quaternary unbound', () => {
    const out = axesFromLegacyOrder(undefined, palettes);
    expect(out.map((a) => a.family)).toEqual(['Brand', 'Accent', 'Background', null]);
    expect(out[0].hue).toBeCloseTo(palettes.Brand.baseColor.h, 9);
    expect(out[1].hue).toBeCloseTo(palettes.Accent.baseColor.h, 9);
    expect(out[2].hue).toBeCloseTo(palettes.Background.baseColor.h, 9);
    expect(out[3].hue).toBeCloseTo(n(palettes.Brand.baseColor.h + 270), 9);
  });

  it('binds order[i] to axis i at each family palette hue, remaining axis unbound', () => {
    const out = axesFromLegacyOrder(['Accent', 'Brand', 'Special'], palettes);
    expect(out.map((a) => a.family)).toEqual(['Accent', 'Brand', 'Special', null]);
    expect(out[0].hue).toBeCloseTo(palettes.Accent.baseColor.h, 9);
    expect(out[1].hue).toBeCloseTo(palettes.Brand.baseColor.h, 9);
    expect(out[2].hue).toBeCloseTo(palettes.Special.baseColor.h, 9);
  });

  // The legacy-sanitize rule intents, exercised through the public migration
  // surface (the private sanitizer no longer has its own describe).
  const defaultTrio = ['Brand', 'Accent', 'Background', null];

  it('non-array, empty, and fully-invalid input all fall back to the default trio', () => {
    expect(axesFromLegacyOrder('Brand', palettes).map((a) => a.family)).toEqual(defaultTrio);
    expect(axesFromLegacyOrder([], palettes).map((a) => a.family)).toEqual(defaultTrio);
    expect(axesFromLegacyOrder(['Danger', 'Success', 7, null], palettes).map((a) => a.family)).toEqual(defaultTrio);
  });

  it('drops entries outside HARMONY_ELIGIBLE', () => {
    const out = axesFromLegacyOrder(['Danger', 'Brand', 'Neutral'], palettes);
    expect(out.map((a) => a.family)).toEqual(['Brand', null, null, null]);
    expect(out[0].hue).toBeCloseTo(palettes.Brand.baseColor.h, 9);
  });

  it('drops duplicates, keeping the first occurrence', () => {
    const out = axesFromLegacyOrder(['Accent', 'Brand', 'Accent'], palettes);
    expect(out.map((a) => a.family)).toEqual(['Accent', 'Brand', null, null]);
  });

  it('drops both ineligible and duplicate entries: [Danger, Brand, Brand] binds only Brand', () => {
    const out = axesFromLegacyOrder(['Danger', 'Brand', 'Brand'], palettes);
    expect(out.map((a) => a.family)).toEqual(['Brand', null, null, null]);
    expect(out[0].hue).toBeCloseTo(palettes.Brand.baseColor.h, 9);
  });

  it('binds a valid full four-family order across all axes', () => {
    const out = axesFromLegacyOrder(['Brand', 'Background', 'Accent', 'Special'], palettes);
    expect(out.map((a) => a.family)).toEqual(['Brand', 'Background', 'Accent', 'Special']);
  });

  it('falls back to the spec initial hue when a bound family has no palette', () => {
    const out = axesFromLegacyOrder(['Special'], {});
    expect(out[0].family).toBe('Special');
    expect(out[0].hue).toBeCloseTo(specHue('Special'), 9);
  });
});
