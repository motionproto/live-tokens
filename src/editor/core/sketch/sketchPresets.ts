export interface SketchSettings {
  label: string;
  blurb: string;
  mode: 'layered' | 'global';
  fillScale: number;
  strokeScale: number;
  frequency: number;
  octaves: number;
  strokeWidth: number;
  fillDx: number;
  fillDy: number;
  doubleStroke: boolean;
  /** Per-instance stroke weight variation, as a fraction. 0.3 = +/-30%. */
  pressure: number;
  /** Depth of the along-stroke thinning mask. 0 = even line, 1 = breaks up. */
  pressureMod: number;
  /** Goo radius. Blur then re-sharpen alpha, so nearby stroke runs merge and bulge. */
  pooling: number;
  fillStyle: 'solid' | 'hachure' | 'none';
  strokeStyle: 'solid' | 'dashed';
  maskOn: boolean;
  /** Mask tile size in px. Large values give broad patches, small values give speckle. */
  maskScale: number;
  maskFrequency: number;
  /** Alpha slope. Higher = harder edges between covered and bare. */
  maskContrast: number;
  /** Alpha floor. 1 = fully opaque everywhere, 0 = mask can erase completely. */
  maskFloor: number;
  /** Detail layers. 1-2 gives broad blobs, 4+ goes cloudy and stops reading as blotches. */
  maskOctaves: number;
  /** Quantise the mask into N discrete levels. 1 = smooth gradient, 2 = hard two-tone blotches. */
  maskPosterize: number;
  /** Feather on the blotch edges, in tile units. */
  maskSoftness: number;
  /** Per-instance offset range in px, added to the uniform fillDx/fillDy. */
  jitterX: number;
  jitterY: number;
  /** Per-instance rotation range in degrees. */
  jitterRot: number;
  /** Per-instance scale range, as a fraction. 0.03 = +/-3%. */
  jitterScale: number;
  /** Baseline oversize so rotation does not expose bare corners. */
  fillGrow: number;
  /** Glyph displacement for icons and inline SVG, in px. 0 leaves them crisp.
      A glyph is all curves already, so it needs MORE travel than a card's long
      straight edge before the wobble reads at all. */
  iconScale: number;
  /** Multiplier on `frequency` for the icon bank. Below 1 bends the whole
      glyph, above 2 ripples its outline. */
  iconFrequency: number;
  /** Ink coverage over icons. Independent of `maskOn`, which governs fills. */
  iconMaskOn: boolean;
  /** Icon mask tile, in px. Near glyph size puts several blotches across one
      icon; at the fill's tile size a whole icon samples a single patch and
      either survives intact or vanishes. */
  iconMaskTile: number;
}

const base: SketchSettings = {
  label: '', blurb: '', mode: 'layered',
  fillScale: 3, strokeScale: 3, frequency: 0.022, octaves: 3,
  strokeWidth: 1.5, fillDx: 0, fillDy: 0, doubleStroke: false,
  fillStyle: 'solid', strokeStyle: 'solid',
  pressure: 0.25, pressureMod: 0.35, pooling: 1.2,
  maskOn: true, maskScale: 900, maskFrequency: 0.012, maskContrast: 1.6, maskFloor: 0.45,
  maskOctaves: 2, maskPosterize: 1, maskSoftness: 1,
  jitterX: 2.5, jitterY: 2.5, jitterRot: 0.6, jitterScale: 0.02, fillGrow: 0.015,
  iconScale: 2.5, iconFrequency: 1.6, iconMaskOn: true, iconMaskTile: 90,
};

export const SKETCH_PRESETS: Record<string, SketchSettings> = {
  pencil: {
    ...base, label: 'Pencil', blurb: 'Thin double-pass outline, fill left alone. Closest to a neat hand sketch.',
    fillScale: 1.5, strokeScale: 2.5, frequency: 0.03, strokeWidth: 1.25, doubleStroke: true,
    maskScale: 700, maskFrequency: 0.02, maskContrast: 1.2, maskFloor: 0.7, maskOctaves: 3, maskPosterize: 1, maskSoftness: 0.5,
    jitterX: 1.5, jitterY: 1.5, jitterRot: 0.35, jitterScale: 0.012, fillGrow: 0.01,
    pressure: 0, pressureMod: 0, pooling: 0, iconScale: 1.5,
  },

  marker: {
    ...base, label: 'Marker', blurb: 'Fill misregistered from the outline. The strongest early-draft cue.',
    fillScale: 4, strokeScale: 3, frequency: 0.018, strokeWidth: 2, fillDx: 3, fillDy: -2,
    maskScale: 1100, maskFrequency: 0.009, maskContrast: 2.2, maskFloor: 0.35, maskOctaves: 2, maskPosterize: 4, maskSoftness: 1.5,
    jitterX: 3, jitterY: 3, jitterRot: 0.8, jitterScale: 0.025, fillGrow: 0.02,
    pressure: 0.2, pressureMod: 0.25, pooling: 2, iconScale: 2.5,
  },

  whiteboard: {
    ...base, label: 'Whiteboard', blurb: 'Fat stroke, loose fill. Reads as a marker on glass.',
    fillScale: 5, strokeScale: 5, frequency: 0.014, octaves: 2, strokeWidth: 3.5, fillDx: 2, fillDy: 2,
    maskScale: 1400, maskFrequency: 0.007, maskContrast: 2.8, maskFloor: 0.2, maskOctaves: 1, maskPosterize: 3, maskSoftness: 2,
    jitterX: 4.5, jitterY: 4.5, jitterRot: 1.2, jitterScale: 0.04, fillGrow: 0.03,
    pressure: 0.15, pressureMod: 0.15, pooling: 3.5, iconScale: 3.5,
  },

  hachure: {
    ...base, label: 'Hachure', blurb: 'Fill replaced by angled pencil shading. Very rough.js.',
    fillScale: 3, strokeScale: 3, frequency: 0.025, strokeWidth: 1.5, fillStyle: 'hachure', doubleStroke: true,
    pressure: 0.3, pressureMod: 0.45, pooling: 0.8, iconScale: 2.5,
  },

  wireframe: {
    ...base, label: 'Wireframe', blurb: 'No fill, dashed displaced outline. Pure structural draft.', maskOn: false,
    jitterX: 0, jitterY: 0, jitterRot: 0, jitterScale: 0, fillGrow: 0,
    fillStyle: 'none', strokeStyle: 'dashed', strokeScale: 3.5, strokeWidth: 1.5, frequency: 0.028,
    pressure: 0.1, pressureMod: 0.1, pooling: 0, iconScale: 2,
  },

  napkin: {
    ...base, label: 'Napkin', blurb: 'Everything loose at once. Maximum "do not ship this".',
    fillScale: 6, strokeScale: 4.5, frequency: 0.02, strokeWidth: 2.25, fillDx: 4, fillDy: -3,
    doubleStroke: true,
    maskScale: 1600, maskFrequency: 0.006, maskContrast: 3.2, maskFloor: 0.15, maskOctaves: 2, maskPosterize: 2, maskSoftness: 2.5,
    jitterX: 6, jitterY: 6, jitterRot: 1.8, jitterScale: 0.055, fillGrow: 0.045,
    pressure: 0.45, pressureMod: 0.6, pooling: 2.5, iconScale: 4.5,
  },

  global: {
    ...base, label: 'Global wash', blurb: 'One root filter. Text wobbles too. One line to ship, costs text quality.',
    mode: 'global', fillScale: 2, strokeScale: 2, frequency: 0.012, strokeWidth: 0, maskOn: false,
    iconScale: 0,
    jitterX: 0, jitterY: 0, jitterRot: 0, jitterScale: 0, fillGrow: 0,
    pressure: 0, pressureMod: 0, pooling: 0,
  },

  dry: {
    ...base, label: 'Dry marker', blurb: 'Broad low-frequency mask eats the fill unevenly. Ink that ran out.',
    fillScale: 4.5, strokeScale: 3.5, frequency: 0.02, strokeWidth: 2, fillDx: 2, fillDy: -2,
    maskScale: 1800, maskFrequency: 0.005, maskContrast: 3.5, maskFloor: 0.1, doubleStroke: true,
    maskOctaves: 1, maskPosterize: 2, maskSoftness: 3,
    jitterX: 5, jitterY: 5, jitterRot: 1.4, jitterScale: 0.045, fillGrow: 0.035,
    pressure: 0.4, pressureMod: 0.7, pooling: 1.5, iconScale: 3.5,
  },
};

export const DEFAULT_SKETCH_PRESET = 'marker';

/** Merged over a full preset, so a value stored before a control existed still
    loads and picks up the default for whatever it is missing. */
export function hydrateSketchSettings(raw: unknown): SketchSettings {
  return { ...SKETCH_PRESETS[DEFAULT_SKETCH_PRESET], ...(raw as Partial<SketchSettings>) };
}
