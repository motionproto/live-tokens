export interface SketchSettings {
  label: string;
  blurb: string;
  /** How far the fill's edge travels at its furthest, in px. Every dial that
      feeds a displacement map is stated this way: the map's own `scale` is the
      full swing, twice what anything moves, and the field spends most of its
      length well short of the peak. */
  fillTravel: number;
  strokeTravel: number;
  /** The border's own wavelength, as a multiple of the shared one. Above 1 the
      outline draws long lazy curves across a fill finer than it; below 1 it
      chatters over one that stays broad. The pen and the paper are different
      things. */
  borderWavelength: number;
  /** Shape of the displacement wave, from smooth at 1 to square at 4. The raw
      field crowds its values around its own centre, which is no movement at
      all, so an edge only travels the stated amplitude where the wave happens
      to peak. Squaring it clips both rails, and nearly every point then sits at
      full amplitude. This is what makes the effect stronger rather than
      bigger: amplitude sets the distance, waveform sets how much of the edge
      actually goes it. */
  waveform: number;
  /** Detail layers stacked on the wave. One is a single smooth undulation;
      three lays two finer waves over it at half and quarter magnitude. The
      format halves the magnitude every layer and offers no way to change that,
      so a fourth would move an edge by a tenth of a pixel and the stack is
      spent at three. */
  roughness: number;
  /** Wavelength of the pen wobble, in page px: how far along an edge the field
      takes to turn over. Short gives tight chatter, long gives lazy curves.
      Stated the way the mask states its blobs, because a number of pixels is a
      thing you can picture and a number of cycles per pixel is not. */
  wobble: number;
  strokeWidth: number;
  doubleStroke: boolean;
  /** How far the second pass can land from the first, in px on each axis. Every
      component draws its own distance and direction inside that range, so no
      two part company by the same amount: one distance for every component
      reads as a printing offset rather than as a hand. */
  retraceOffset: number;
  /** How the second pass is drawn. `copy` duplicates the line already
      displaced, so both runs carry the same wobble a few px apart. `reseeded`
      sends the line through the pen again on its own noise seed, so the two
      disagree along their length the way a hand coming back round does. */
  retracePass: 'copy' | 'reseeded';
  /** Per-instance stroke weight variation, as a fraction. 0.3 = +/-30%. */
  pressure: number;
  /** Depth of the along-stroke thinning mask. 0 = even line, 1 = breaks up. */
  pressureMod: number;
  /** Goo radius. Blur then re-sharpen alpha, so nearby stroke runs merge and bulge. */
  pooling: number;
  /** Ink density of the stroke, 0 to 1. Below 1 the line is translucent, so the
      retrace pass reads through the first one: where they overlap the colour
      doubles and where only one landed it stays pale. That gradient across the
      weight of the line is what a marker looks like and what a pen does not. */
  strokeInk: number;
  fillStyle: 'solid' | 'hatched';
  /** Density of the hatch lines against the fill, 0 to 1. */
  hatchInk: number;
  strokeStyle: 'solid' | 'dashed';
  maskOn: boolean;
  /** Wavelength of the coverage noise, in page px. Small gives speckle, large gives broad patches. */
  maskBlob: number;
  /** Input levels on the coverage field, 0 to 1: the black and the white point.
      The field is equalised before they apply, so the pair reads as shares of
      the tile. 0 to 1 leaves the field as it is; 0.3 to 0.7 wears the darkest
      thirty per cent through and fills the palest thirty per cent in solid,
      which is the contrast control. */
  maskInputMin: number;
  maskInputMax: number;
  /** Output levels on the coverage field, 0 to 1: the palest the fill gets and
      the densest. 0 is bare and 1 is whole, so 0.4 to 1 is a fill that is never
      thinner than 40% ink, and 0 to 0.8 one that never quite fills in. Close
      together is a flat wash, far apart a strong blotch. */
  maskOutputMin: number;
  maskOutputMax: number;
  /** Detail layers. 1-2 gives broad blobs, 4+ goes cloudy and stops reading as blotches. */
  maskOctaves: number;
  /** Character of the noise. Fractal is cloudy; turbulence is veined, like marbled ink. */
  maskGrain: 'fractal' | 'turbulence';
  /** Quantise the mask into N discrete levels. 1 = smooth gradient, 2 = hard two-tone blotches. */
  maskPosterize: number;
  /** Feather on the blotch edges, in page px. */
  maskSoftness: number;
  /** Per-instance offset range in px. */
  jitterX: number;
  jitterY: number;
  /** Per-instance rotation range in degrees. */
  jitterRot: number;
  /** Per-instance oversize, as a fraction. One-sided: every fill grows by
      some share of it, so a rotated fill never exposes a bare corner. */
  jitterScale: number;
  /** Rounding added on top of the part's own radius, in px. Each corner takes
      its own share, between half the dial and all of it: at 12 a box comes out
      with corners near 12, 7, 10 and 6. The floor at half is what keeps it a
      shape rather than a scallop, which is what a square corner sitting beside
      one carrying the whole dial looks like on anything as short as a button.
      A pill is unmoved. */
  cornerSpread: number;
  /** How far the corners of the drawn box travel at their furthest, in px. One wave of noise long
      enough to span several components, so each corner is pushed a different
      way and the box comes out a leaning quadrilateral with no two sides
      parallel. This is the dial that stops a component reading as a div; the
      corner radii only decide how the turns are cut. Every component moves the
      same number of pixels whatever its size. */
  cornerTravel: number;
  /** Glyph travel for icons and inline SVG, in px. 0 leaves them crisp.
      A glyph is all curves already, so it needs MORE travel than a card's long
      straight edge before the wobble reads at all. */
  iconTravel: number;
  /** The same for icons. Above 1 bends the whole glyph, below 0.5 ripples its
      outline. Glyphs sit well under the shared wavelength by default: a wave
      long enough to lean a card leaves a 20px icon riding one flat stretch. */
  iconWavelength: number;
  /** Ink coverage over icons. Independent of `maskOn`, which governs fills. */
  iconMaskOn: boolean;
  /** Icon mask tile, as a share of the glyph it covers. A px size cannot be
      right for both a 16px icon and a page-wide illustration: the tile that
      blotches the drawing swallows the icon whole, and one cut for the icon
      is dust on the drawing. Stated against the glyph, the tile scales with
      whatever it is laid on. At 1 every glyph gets one period of the field
      across it; below that the field repeats inside the glyph and the blotches
      get finer; above it a glyph reads part of a blotch and the mask acts as
      an uneven wash over the whole thing. */
  iconMaskScale: number;
}

const base: SketchSettings = {
  label: '', blurb: '',
  fillTravel: 1.5, strokeTravel: 1.5, wobble: 45, roughness: 3,
  borderWavelength: 1, waveform: 1,
  strokeWidth: 1.5, doubleStroke: false, retraceOffset: 1.2, retracePass: 'copy',
  fillStyle: 'solid', hatchInk: 0.4, strokeStyle: 'solid',
  pressure: 0.25, pressureMod: 0.35, pooling: 1.2, strokeInk: 1,
  maskOn: true, maskBlob: 100, maskInputMin: 0, maskInputMax: 1,
  maskOutputMin: 0.45, maskOutputMax: 1,
  maskOctaves: 2, maskGrain: 'fractal', maskPosterize: 1, maskSoftness: 1.5,
  jitterX: 2.5, jitterY: 2.5, jitterRot: 0.6, jitterScale: 0.035,
  cornerSpread: 10, cornerTravel: 8,
  iconTravel: 1.25, iconWavelength: 0.625, iconMaskOn: true, iconMaskScale: 1,
};

export const SKETCH_PRESETS: Record<string, SketchSettings> = {
  pencil: {
    ...base, label: 'Pencil',
    blurb: 'Two graphite passes on their own seeds, so the outline disagrees with itself the way a hand coming back round does. Tight grain, little else.',
    fillTravel: 0.75, strokeTravel: 1.25, wobble: 30, roughness: 3, waveform: 1,
    strokeWidth: 1.25, doubleStroke: true, retracePass: 'reseeded', retraceOffset: 1.5, strokeInk: 0.85,
    maskBlob: 40, maskOutputMin: 0.62, maskOutputMax: 1, maskOctaves: 3, maskPosterize: 1, maskSoftness: 0.6,
    jitterX: 1.5, jitterY: 1.5, jitterRot: 0.35, jitterScale: 0.022,
    cornerSpread: 6, cornerTravel: 4.5,
    pressure: 0.15, pressureMod: 0.3, pooling: 0, iconTravel: 0.75,
  },

  marker: {
    ...base, label: 'Marker',
    blurb: 'Broad translucent nib gone round twice on the same line, so the overlap darkens and the ink pools where it slows.',
    fillTravel: 2, strokeTravel: 1.5, wobble: 56, waveform: 1.4, borderWavelength: 1.3,
    strokeWidth: 4, doubleStroke: true, retracePass: 'copy', strokeInk: 0.52, retraceOffset: 2.2,
    maskBlob: 115, maskOutputMin: 0.21, maskOutputMax: 1, maskOctaves: 3, maskPosterize: 4, maskSoftness: 2.5,
    jitterX: 3, jitterY: 3, jitterRot: 0.8, jitterScale: 0.045,
    cornerSpread: 10, cornerTravel: 8,
    pressure: 0.2, pressureMod: 0.25, pooling: 2, iconTravel: 1.25, iconMaskScale: 4,
  },

  whiteboard: {
    ...base, label: 'Whiteboard',
    blurb: 'The fattest nib on glass. One long smooth undulation, and a veined mask that streaks the fill like a half-wiped board.',
    fillTravel: 2.5, strokeTravel: 2.5, wobble: 90, roughness: 1, waveform: 1, borderWavelength: 1.5,
    strokeWidth: 5.5, doubleStroke: true, retracePass: 'copy', strokeInk: 0.66, retraceOffset: 3,
    maskGrain: 'turbulence', maskBlob: 180, maskOutputMin: 0.42, maskOutputMax: 0.9,
    maskOctaves: 1, maskPosterize: 3, maskSoftness: 5,
    jitterX: 4.5, jitterY: 4.5, jitterRot: 1.2, jitterScale: 0.07,
    cornerSpread: 14, cornerTravel: 11,
    pressure: 0.15, pressureMod: 0.15, pooling: 3.5, iconTravel: 1.75, iconMaskScale: 1.5,
  },

  hatched: {
    ...base, label: 'Hatched',
    blurb: 'An etching. The fill is angled shading, the outline a single hard-edged scratch that chatters along its length. No mask: the hatch is the texture.',
    fillTravel: 1.25, strokeTravel: 1.5, wobble: 24, roughness: 3, waveform: 3,
    strokeWidth: 1.5, fillStyle: 'hatched', hatchInk: 0.5, doubleStroke: false,
    maskOn: false, iconMaskOn: false,
    jitterX: 1.5, jitterY: 1.5, jitterRot: 0.4, jitterScale: 0.03,
    cornerSpread: 6, cornerTravel: 6,
    pressure: 0.3, pressureMod: 0.45, pooling: 0.8, iconTravel: 1.25, iconWavelength: 0.5,
  },

  dashed: {
    ...base, label: 'Dashed',
    blurb: 'A drafting outline. One slow drift along the ruler, broken into strokes, with jitter, mask and pressure all off. The clean pole.',
    strokeStyle: 'dashed', strokeTravel: 1, fillTravel: 0.5, wobble: 120, roughness: 1, waveform: 1,
    strokeWidth: 1.5, doubleStroke: false,
    maskOn: false, iconMaskOn: false,
    jitterX: 0, jitterY: 0, jitterRot: 0, jitterScale: 0,
    cornerSpread: 4, cornerTravel: 3,
    pressure: 0, pressureMod: 0, pooling: 0, iconTravel: 0,
  },

  napkin: {
    ...base, label: 'Napkin',
    blurb: 'Ballpoint in a hurry. Everything loose at once: a square wave sends every edge to full travel, and the second pass lands wherever it lands.',
    fillTravel: 3, strokeTravel: 2.25, wobble: 50, roughness: 3, waveform: 2.5,
    strokeWidth: 2.25, doubleStroke: true, retracePass: 'reseeded', retraceOffset: 4, strokeInk: 1,
    maskBlob: 150, maskOutputMin: 0.43, maskOutputMax: 0.95, maskOctaves: 2, maskPosterize: 2, maskSoftness: 6.7,
    jitterX: 6, jitterY: 6, jitterRot: 1.8, jitterScale: 0.1,
    cornerSpread: 20, cornerTravel: 17,
    pressure: 0.45, pressureMod: 0.6, pooling: 2.5, iconTravel: 2.25, iconMaskScale: 3.6,
  },

  dry: {
    ...base, label: 'Dry marker',
    blurb: 'Ink that ran out. One scratchy pass that breaks up along its length, over a fill the mask has worn nearly through in patches.',
    fillTravel: 2.25, strokeTravel: 1.75, wobble: 50, waveform: 2, borderWavelength: 0.5,
    strokeWidth: 3.5, doubleStroke: false, strokeInk: 0.4,
    maskBlob: 150, maskOutputMin: 0.15, maskOutputMax: 0.91,
    maskOctaves: 2, maskPosterize: 4, maskSoftness: 1.75,
    jitterX: 5, jitterY: 5, jitterRot: 1.4, jitterScale: 0.08,
    cornerSpread: 16, cornerTravel: 13,
    pressure: 0.4, pressureMod: 0.8, pooling: 1.5, iconTravel: 1.75, iconMaskScale: 3.8,
  },
};

export const DEFAULT_SKETCH_PRESET = 'marker';

/** Reconciled against a full preset in both directions: a value stored before a
    control existed picks up the default, and a value stored for a control since
    retired is dropped. Without the drop, a stale key survives every spread and
    makes the settings compare unequal to any baseline forever. */
export function hydrateSketchSettings(raw: unknown): SketchSettings {
  const base = SKETCH_PRESETS[DEFAULT_SKETCH_PRESET];
  const stored = (raw ?? {}) as Partial<SketchSettings>;
  const out = { ...base };
  for (const key of Object.keys(base) as (keyof SketchSettings)[]) {
    if (stored[key] !== undefined) (out[key] as unknown) = stored[key];
  }
  // A retired option: the fill's presence belongs to the theme, not the effect.
  if ((out.fillStyle as string) === 'none') out.fillStyle = base.fillStyle;
  convertTiledMask(stored as Record<string, unknown>, out);
  convertCutToLevels(stored as Record<string, unknown>, out);
  carryLevelsToOutput(stored as Record<string, unknown>, out);
  halveSwingDials(stored as Record<string, unknown>, out);
  convertCyclesToWavelength(stored as Record<string, unknown>, out);
  convertIconTileToScale(stored as Record<string, unknown>, out);
  restoreDerivedRetrace(stored as Record<string, unknown>, out);
  return out;
}

/** The second pass used to sit at a distance derived from the stroke width,
    with no dial of its own. A look stored before the dial comes back at that
    distance rather than at whatever the fallback preset happens to carry. */
function restoreDerivedRetrace(stored: Record<string, unknown>, out: SketchSettings): void {
  if (stored.retraceOffset === undefined) {
    out.retraceOffset = Number(Math.max(1.2, out.strokeWidth * 0.55).toFixed(2));
  }
}

/** The four displacement dials used to be stated as the map's own `scale`,
    which is the full swing: the number on the dial was twice the furthest
    anything actually moved. They are peak travel in px now, so a look stored
    under the old names comes back halved and renders identically. */
const SWING_DIALS = {
  fillScale: 'fillTravel',
  strokeScale: 'strokeTravel',
  iconScale: 'iconTravel',
  cornerShift: 'cornerTravel',
} as const;

/** The pen wobble used to be stated as `frequency`, in cycles per px, which is
    the number the filter wants and not one anybody can picture. It is a
    wavelength in px now, the way the mask states its blobs. */
function convertCyclesToWavelength(stored: Record<string, unknown>, out: SketchSettings): void {
  const cycles = stored.frequency;
  if (typeof cycles === 'number' && cycles > 0) out.wobble = Math.round(1 / cycles);
  // The layer count was `octaves`, and its dial ran to 5. The top two moved
  // nothing, so a look stored there comes back at the roughest that reads.
  // Both were multipliers on the frequency, so they ran the other way.
  for (const [legacy, key] of [
    ['borderFrequency', 'borderWavelength'], ['iconFrequency', 'iconWavelength'],
  ] as const) {
    const multiple = stored[legacy];
    if (typeof multiple === 'number' && multiple > 0) {
      out[key] = Number((1 / multiple).toFixed(3));
    }
  }
  const layers = stored.octaves;
  if (typeof layers === 'number') out.roughness = Math.min(3, Math.max(1, layers));
}

/** The icon mask tile used to be a px size, which is a unit the glyph it covers
    has no say in: 90px against a 16px icon put a whole glyph inside one patch
    of the field, so it came out either untouched or gone. It is a share of the
    glyph now, and the old default reads as one period across the glyph, which
    is what that size was aiming at. */
function convertIconTileToScale(stored: Record<string, unknown>, out: SketchSettings): void {
  const tile = stored.iconMaskTile;
  if (typeof tile !== 'number') return;
  out.iconMaskScale = Math.min(5, Math.max(0.5, Number((tile / 90).toFixed(2))));
}

function halveSwingDials(stored: Record<string, unknown>, out: SketchSettings): void {
  for (const [legacy, key] of Object.entries(SWING_DIALS)) {
    const value = stored[legacy];
    if (typeof value === 'number') out[key as 'fillTravel'] = value / 2;
  }
}

/** The mask used to be a 600-unit tile painted at `maskScale` px, with the
    coverage point buried in the hardness slope. Recover page-px blobs and
    softness, and the levels the old slope and floor put the edge at. */
function convertTiledMask(stored: Record<string, unknown>, out: SketchSettings): void {
  const scale = stored.maskScale;
  if (typeof scale !== 'number') return;
  const freq = stored.maskFrequency;
  if (typeof freq === 'number') out.maskBlob = Math.round(scale / (freq * LEGACY_TILE));
  const soft = stored.maskSoftness;
  if (typeof soft === 'number') out.maskSoftness = Number(((soft * scale) / LEGACY_TILE).toFixed(1));
}

/**
 * Coverage and contrast were a cut point and a slope through `feTurbulence`'s
 * own output, which runs about 0.24 to 0.77 rather than 0 to 1. Recover the two
 * levels the pair put the edge between, and rescale them onto the field as it
 * is now: stretched onto its full range before the levels see it.
 */
function convertCutToLevels(stored: Record<string, unknown>, out: SketchSettings): void {
  const contrast = stored.maskContrast;
  const coverage = stored.maskCoverage;
  if (typeof contrast !== 'number' || typeof coverage !== 'number') return;
  const veined = out.maskGrain === 'turbulence';
  const [lo, hi] = veined ? LEGACY_RANGE.turbulence : LEGACY_RANGE.fractal;
  const pivot = veined ? 0.55 - 0.5 * coverage : 0.8 - 0.6 * coverage;
  const level = (raw: number) => Math.min(1, Math.max(0, (raw - lo) / (hi - lo)));
  out.maskOutputMin = Number(level(pivot - 0.5 / contrast).toFixed(2));
  out.maskOutputMax = Number(Math.max(out.maskOutputMin + 0.02, level(pivot + 0.5 / contrast)).toFixed(2));
}

/** The pair were input levels, a cut through the field, and are output levels
    now, the palest and densest the fill gets. The same two numbers carry over:
    a look cut between 20% and 50% comes back as a wash between 20% and 50% ink,
    which keeps its spread and loses only the hole. */
function carryLevelsToOutput(stored: Record<string, unknown>, out: SketchSettings): void {
  if (typeof stored.maskLevelMin === 'number') out.maskOutputMin = stored.maskLevelMin;
  if (typeof stored.maskLevelMax === 'number') out.maskOutputMax = stored.maskLevelMax;
}

/** Where `feTurbulence` actually put its output, measured across seeds, blob
    sizes and octave counts. The old dials worked in these numbers. */
const LEGACY_RANGE = { fractal: [0.24, 0.77], turbulence: [0.02, 0.6] } as const;

const LEGACY_TILE = 600;
