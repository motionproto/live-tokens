import pencil from '../../../live-tokens/data/sketch-styles/pencil.json';
import marker from '../../../live-tokens/data/sketch-styles/marker.json';
import whiteboard from '../../../live-tokens/data/sketch-styles/whiteboard.json';
import hatched from '../../../live-tokens/data/sketch-styles/hatched.json';
import dashed from '../../../live-tokens/data/sketch-styles/dashed.json';
import napkin from '../../../live-tokens/data/sketch-styles/napkin.json';
import dry from '../../../live-tokens/data/sketch-styles/dry.json';

export interface SketchStyle {
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
  /** Blob size of the coverage noise, in page px, across and down. Small gives
      speckle, large gives broad patches. */
  maskBlobX: number;
  maskBlobY: number;
  /** Which way the stretch runs, in degrees clockwise from level. Nothing at
      all while the two blob sizes match, since a field the same in every
      direction is the same field turned. The tile only meets itself at the
      angles that land the page's axes back on whole cells, so the dial is
      answered with the nearest of those. */
  maskAngle: number;
  /** Whether the two move together. Unlinked they part, and the field comes out
      stretched: blobs wider than they are tall read as a wash dragged sideways,
      the way ink pulled across a page does. Stored rather than inferred from
      the pair matching, so a look that stretches to exactly square keeps its
      dials apart. */
  maskBlobLinked: boolean;
  /** Output levels on the coverage field, 0 to 1: the palest the fill gets and
      the densest. The whole field is squeezed into the gap, never cut at it, so
      0.4 to 1 is a fill that is never thinner than 40% ink and 0 to 0.8 one
      that never quite fills in. Close together is a flat wash, far apart a
      strong blotch. */
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

/**
 * The shipped sketchstyles, read from the files the package distributes. The
 * files are the source: a project shadows one by saving a sketchstyle under the
 * same id, the editor restores a shipped look by deleting that file, and
 * `themeFileApi` serves these as the read-only fallback behind the project's own
 * directory. Editing a look here means editing its JSON, which is what the
 * Sketchstyle view already writes.
 *
 * Each file carries every dial, so there is nothing to merge a default into.
 * `sketchStyles.test.ts` pins that: the seven key sets have to match, and a dial
 * added to `SketchStyle` has to reach all seven before the suite goes green.
 *
 * Order is picker order.
 */
const SHIPPED_FILES = { pencil, marker, whiteboard, hatched, dashed, napkin, dry };

export const SKETCH_STYLES: Record<string, SketchStyle> = Object.fromEntries(
  Object.entries(SHIPPED_FILES).map(([id, file]) => [id, file.settings as unknown as SketchStyle]),
);

export const DEFAULT_SKETCH_STYLE = 'marker';

/** The id of the look a theme carries, in the same id namespace as the shipped
    sketchstyles so one picker row and one `setSketch` call cover both. Never a
    key of `SKETCH_STYLES`: a shipped style claiming it would shadow the theme's
    own look in every picker. `index.test.ts` pins that. */
export const THEME_SKETCH_ID = 'theme';

/** Reconciled against a full sketchstyle in both directions: a value stored before a
    control existed picks up the default, and a value stored for a control since
    retired is dropped. Without the drop, a stale key survives every spread and
    makes the settings compare unequal to any baseline forever. */
export function hydrateSketchStyle(raw: unknown): SketchStyle {
  const base = SKETCH_STYLES[DEFAULT_SKETCH_STYLE];
  const stored = (raw ?? {}) as Partial<SketchStyle>;
  const out = { ...base };
  for (const key of Object.keys(base) as (keyof SketchStyle)[]) {
    if (stored[key] !== undefined) (out[key] as unknown) = stored[key];
  }
  // A retired option: the fill's presence belongs to the theme, not the effect.
  if ((out.fillStyle as string) === 'none') out.fillStyle = base.fillStyle;
  convertTiledMask(stored as Record<string, unknown>, out);
  convertCutToLevels(stored as Record<string, unknown>, out);
  carryLevelsToOutput(stored as Record<string, unknown>, out);
  halveSwingDials(stored as Record<string, unknown>, out);
  splitBlobAxes(stored as Record<string, unknown>, out);
  convertCyclesToWavelength(stored as Record<string, unknown>, out);
  convertIconTileToScale(stored as Record<string, unknown>, out);
  restoreDerivedRetrace(stored as Record<string, unknown>, out);
  return out;
}

/** The second pass used to sit at a distance derived from the stroke width,
    with no dial of its own. A look stored before the dial comes back at that
    distance rather than at whatever the fallback sketchstyle happens to carry. */
function restoreDerivedRetrace(stored: Record<string, unknown>, out: SketchStyle): void {
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
function convertCyclesToWavelength(stored: Record<string, unknown>, out: SketchStyle): void {
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

/** The blob size was one number for both axes. A look stored before the split
    comes back square, with the two dials linked, which is the look it had. */
function splitBlobAxes(stored: Record<string, unknown>, out: SketchStyle): void {
  const blob = stored.maskBlob;
  if (typeof blob !== 'number') return;
  out.maskBlobX = blob;
  out.maskBlobY = blob;
  out.maskBlobLinked = true;
}

/** The icon mask tile used to be a px size, which is a unit the glyph it covers
    has no say in: 90px against a 16px icon put a whole glyph inside one patch
    of the field, so it came out either untouched or gone. It is a share of the
    glyph now, and the old default reads as one period across the glyph, which
    is what that size was aiming at. */
function convertIconTileToScale(stored: Record<string, unknown>, out: SketchStyle): void {
  const tile = stored.iconMaskTile;
  if (typeof tile !== 'number') return;
  out.iconMaskScale = Math.min(5, Math.max(0.5, Number((tile / 90).toFixed(2))));
}

function halveSwingDials(stored: Record<string, unknown>, out: SketchStyle): void {
  for (const [legacy, key] of Object.entries(SWING_DIALS)) {
    const value = stored[legacy];
    if (typeof value === 'number') out[key as 'fillTravel'] = value / 2;
  }
}

/** The mask used to be a 600-unit tile painted at `maskScale` px, with the
    coverage point buried in the hardness slope. Recover page-px blobs and
    softness, and the levels the old slope and floor put the edge at. */
function convertTiledMask(stored: Record<string, unknown>, out: SketchStyle): void {
  const scale = stored.maskScale;
  if (typeof scale !== 'number') return;
  const freq = stored.maskFrequency;
  if (typeof freq === 'number') {
    out.maskBlobX = Math.round(scale / (freq * LEGACY_TILE));
    out.maskBlobY = out.maskBlobX;
  }
  const soft = stored.maskSoftness;
  if (typeof soft === 'number') out.maskSoftness = Number(((soft * scale) / LEGACY_TILE).toFixed(1));
}

/**
 * Coverage and contrast were a cut point and a slope through `feTurbulence`'s
 * own output, which runs about 0.24 to 0.77 rather than 0 to 1. Recover the two
 * levels the pair put the edge between, and rescale them onto the field as it
 * is now: stretched onto its full range before the levels see it.
 */
function convertCutToLevels(stored: Record<string, unknown>, out: SketchStyle): void {
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
function carryLevelsToOutput(stored: Record<string, unknown>, out: SketchStyle): void {
  if (typeof stored.maskLevelMin === 'number') out.maskOutputMin = stored.maskLevelMin;
  if (typeof stored.maskLevelMax === 'number') out.maskOutputMax = stored.maskLevelMax;
}

/** Where `feTurbulence` actually put its output, measured across seeds, blob
    sizes and octave counts. The old dials worked in these numbers. */
const LEGACY_RANGE = { fractal: [0.24, 0.77], turbulence: [0.02, 0.6] } as const;

const LEGACY_TILE = 600;
