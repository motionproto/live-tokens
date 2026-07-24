// Harmony rotates HUE ONLY (Global invariant 6). Each palette keeps its own
// OKLCH chroma and lightness; only a family's hue moves onto a geometric
// relationship with the anchor. The anchor is axis 0's stored hue: harmony lives
// on four fixed axes (Anchor/Secondary/Tertiary/Quaternary), each owning a hue
// whether or not a color family is bound to it. No chroma clamp or cap lives
// here; a saturated background is a legitimate choice, not something to correct.

import type { Oklch } from './oklch';
import type { PaletteConfig } from '../themes/themeTypes';
import { PALETTE_SPECS } from './paletteDerivation';

export type HarmonyMode =
  | 'complementary'
  | 'split-complementary'
  | 'triadic'
  | 'tetradic'
  | 'compound'
  | 'square'
  | 'analogous'
  | 'monochromatic'
  | 'custom';

/** Families the user may order/include on the harmony axes (dev-declared pool). */
export const HARMONY_ELIGIBLE: readonly string[] = ['Brand', 'Accent', 'Background', 'Special'];

export const AXIS_COUNT = 4;
export const AXIS_ROLES = ['Anchor', 'Secondary', 'Tertiary', 'Quaternary'] as const;

export interface HarmonyAxis {
  /** Hue in [0, 360). Always present, bound or not. */
  hue: number;
  /** Bound family label (member of HARMONY_ELIGIBLE), or null when the axis is empty. */
  family: string | null;
}

// Slot 0 is the anchor (Brand), then Accent, Background — the pre-axes default.
const LEGACY_DEFAULT_ORDER: readonly string[] = ['Brand', 'Accent', 'Background'];

/**
 * Coerce an untrusted legacy `harmonyOrder` (theme JSON) into a valid order:
 * keep only eligible entries, first occurrence of each. A non-array, empty, or
 * fully-invalid input falls back to the default order. Private to
 * `axesFromLegacyOrder`, the sole migration entry point.
 */
function sanitizeLegacyOrder(input: unknown): string[] {
  if (!Array.isArray(input)) return [...LEGACY_DEFAULT_ORDER];
  const seen = new Set<string>();
  const out: string[] = [];
  for (const entry of input) {
    if (typeof entry !== 'string') continue;
    if (!HARMONY_ELIGIBLE.includes(entry)) continue;
    if (seen.has(entry)) continue;
    seen.add(entry);
    out.push(entry);
  }
  return out.length > 0 ? out : [...LEGACY_DEFAULT_ORDER];
}

const norm = (h: number): number => ((h % 360) + 360) % 360;

/**
 * Slot hues for `mode` from the anchor hue, priority-ordered: slot 1 is the
 * primary harmonic partner. Returns the first `slotCount` slots (1–4). With the
 * default order, dealing slots 0–2 reproduces today's per-family output.
 */
export function harmonyHues(mode: HarmonyMode, anchorHue: number, slotCount: number): number[] {
  const a = norm(anchorHue);
  const slots = ((): number[] => {
    switch (mode) {
      case 'complementary':       return [a, norm(a + 180), a, norm(a + 180)];
      case 'split-complementary': return [a, norm(a + 210), norm(a + 150), a];
      case 'triadic':             return [a, norm(a + 240), norm(a + 120), a];
      case 'tetradic':            return [a, norm(a + 180), norm(a + 60), norm(a + 240)];
      case 'compound':            return [a, norm(a + 180), norm(a + 30), norm(a + 210)];
      case 'square':              return [a, norm(a + 180), norm(a + 90), norm(a + 270)];
      case 'analogous':           return [a, norm(a + 30), norm(a - 30), a];
      case 'monochromatic':       return [a, a, a, a];
      case 'custom':              return [a, a, a, a];
    }
  })();
  return slots.slice(0, slotCount);
}

function reHue(config: PaletteConfig, hue: number): Oklch {
  const { l, c } = config.baseColor;
  return { l, c, h: norm(hue) };
}

/** Re-hue Neutral and Alternate to `anchorHue`, own chroma + lightness kept. */
export function tintNeutralsFromAnchor(
  palettes: Record<string, PaletteConfig>,
  anchorHue: number,
): Record<string, Oklch> {
  const out: Record<string, Oklch> = {};
  for (const label of ['Neutral', 'Alternate']) {
    const config = palettes[label];
    if (config) out[label] = reHue(config, anchorHue);
  }
  return out;
}

// Callers only pass HARMONY_ELIGIBLE families, all of which have a spec; a miss
// is a programming error, so surface it rather than seed a silent hue 0.
const specInitialHue = (label: string): number =>
  PALETTE_SPECS.find((s) => s.label === label)!.initialColor.h;

/**
 * Seed the four axes for a fresh editor: the default trio bound (hues read from
 * `PALETTE_SPECS`, never hardcoded) and Quaternary unbound at anchor + 270 (the
 * square slot-3 offset). Fresh array each call — it seeds mutable state.
 */
export function defaultHarmonyAxes(): HarmonyAxis[] {
  const anchorHue = specInitialHue('Brand');
  return [
    { hue: anchorHue, family: 'Brand' },
    { hue: specInitialHue('Accent'), family: 'Accent' },
    { hue: specInitialHue('Background'), family: 'Background' },
    { hue: norm(anchorHue + 270), family: null },
  ];
}

/**
 * Whether `mode`'s geometry defines a distinct fourth position: slot 3 must not
 * repeat an earlier slot. True for square, tetradic, and compound; the other
 * modes pad slot 3, and custom imposes no geometry, so its slots coincide.
 */
export function modeHasQuaternary(mode: HarmonyMode): boolean {
  const slots = harmonyHues(mode, 0, AXIS_COUNT);
  return slots.slice(0, 3).every((h) => h !== slots[3]);
}

/**
 * Re-deal every axis's hue from `mode`'s geometry, anchored on axis 0's hue.
 * Bindings are preserved; `'custom'` imposes no constraint and returns a copy.
 * A mode without a distinct fourth position leaves the Quaternary axis alone —
 * its slot would be a repeat, and the UI disables the axis for such modes.
 */
export function applyHarmonyToAxes(mode: HarmonyMode, axes: HarmonyAxis[]): HarmonyAxis[] {
  if (mode === 'custom') return axes.map((a) => ({ ...a }));
  const hues = harmonyHues(mode, axes[0].hue, AXIS_COUNT);
  const quaternary = modeHasQuaternary(mode);
  return axes.map((a, i) => (i === 3 && !quaternary ? { ...a } : { hue: hues[i], family: a.family }));
}

/**
 * New baseColors for the families bound to axes, each re-hued to its axis hue
 * with its own chroma + lightness preserved. Unbound axes and missing configs
 * contribute nothing.
 */
export function boundColorPatch(
  axes: HarmonyAxis[],
  palettes: Record<string, PaletteConfig>,
): Record<string, Oklch> {
  const out: Record<string, Oklch> = {};
  for (const axis of axes) {
    if (axis.family === null) continue;
    const config = palettes[axis.family];
    if (config) out[axis.family] = reHue(config, axis.hue);
  }
  return out;
}

/**
 * Coerce untrusted `harmonyAxes` (theme JSON) into exactly `AXIS_COUNT` axes:
 * truncate extras, pad missing indexes from the defaults, drop ineligible or
 * duplicate families to `null`, and replace non-finite hues with the default
 * axis hue. The loaded color is ground truth, so every bound axis whose palette
 * exists finally snaps its hue to that palette's `baseColor.h`.
 */
export function sanitizeHarmonyAxes(
  input: unknown,
  palettes: Record<string, PaletteConfig>,
): HarmonyAxis[] {
  const defaults = defaultHarmonyAxes();
  const source = Array.isArray(input) ? input : defaults;
  const used = new Set<string>();
  const axes: HarmonyAxis[] = [];
  for (let i = 0; i < AXIS_COUNT; i++) {
    const entry = (source[i] ?? defaults[i]) as Partial<HarmonyAxis>;
    const rawFamily = entry.family;
    let family: string | null = null;
    if (typeof rawFamily === 'string' && HARMONY_ELIGIBLE.includes(rawFamily) && !used.has(rawFamily)) {
      family = rawFamily;
      used.add(rawFamily);
    }
    const rawHue = entry.hue;
    const hue = typeof rawHue === 'number' && Number.isFinite(rawHue) ? norm(rawHue) : defaults[i].hue;
    axes.push({ hue, family });
  }
  for (const axis of axes) {
    if (axis.family !== null && palettes[axis.family]) {
      axis.hue = norm(palettes[axis.family].baseColor.h);
    }
  }
  return axes;
}

/**
 * Migrate a legacy `harmonyOrder` into axes: `order[i]` binds to axis `i` (via
 * the same eligibility/dedup rules as the old model), seeded at its palette's
 * `baseColor.h` (or the family's spec hue when no palette loaded). Unfilled axes
 * stay unbound at the default hues, Quaternary offset from the migrated anchor.
 */
export function axesFromLegacyOrder(
  order: unknown,
  palettes: Record<string, PaletteConfig>,
): HarmonyAxis[] {
  const legacy = sanitizeLegacyOrder(order);
  const defaults = defaultHarmonyAxes();
  const hueOf = (family: string): number =>
    norm(palettes[family] ? palettes[family].baseColor.h : specInitialHue(family));
  const axes: HarmonyAxis[] = [];
  for (let i = 0; i < AXIS_COUNT; i++) {
    const family = legacy[i] ?? null;
    if (family) {
      axes.push({ hue: hueOf(family), family });
    } else if (i === AXIS_COUNT - 1) {
      axes.push({ hue: norm(axes[0].hue + 270), family: null });
    } else {
      axes.push({ hue: defaults[i].hue, family: null });
    }
  }
  return axes;
}
