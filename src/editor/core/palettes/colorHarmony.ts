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
export const HARMONY_ELIGIBLE: readonly string[] = ['Brand', 'Accent', 'Canvas', 'Special', 'Neutral', 'Alternate'];

export const AXIS_COUNT = 4;
export const AXIS_ROLES = ['Anchor', 'Secondary', 'Tertiary', 'Quaternary'] as const;

export interface HarmonyAxis {
  /** Hue in [0, 360). Always present, bound or not. */
  hue: number;
  /** Bound family label (member of HARMONY_ELIGIBLE), or null when the axis is empty. */
  family: string | null;
}

// In-range hues pass through bit-exact: the mod-360 round trip perturbs the
// last mantissa bits, which would make a preserved hue compare unequal.
const norm = (h: number): number => (h >= 0 && h < 360 ? h : ((h % 360) + 360) % 360);

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
    { hue: specInitialHue('Canvas'), family: 'Canvas' },
    { hue: norm(anchorHue + 270), family: null },
  ];
}

/**
 * Per-axis availability in `mode`: an axis participates only when its slot is a
 * distinct position (complementary → 2 axes, triadic → 3, square → 4). Two
 * carve-outs keep every axis active: monochromatic, whose repeats are the point
 * (all axes collapse onto the anchor), and custom, which imposes no geometry.
 */
export function modeActiveAxes(mode: HarmonyMode): boolean[] {
  if (mode === 'custom' || mode === 'monochromatic') return Array(AXIS_COUNT).fill(true);
  const slots = harmonyHues(mode, 0, AXIS_COUNT);
  return slots.map((h, i) => slots.slice(0, i).every((prev) => prev !== h));
}

/**
 * Re-deal every axis's hue from `mode`'s geometry, anchored on axis 0's hue.
 * Bindings are preserved; `'custom'` imposes no constraint and returns a copy.
 * An axis inactive in `mode` (its slot would be a repeat) is left alone — the
 * UI disables it while unbound.
 */
export function applyHarmonyToAxes(mode: HarmonyMode, axes: HarmonyAxis[]): HarmonyAxis[] {
  if (mode === 'custom') return axes.map((a) => ({ ...a }));
  const hues = harmonyHues(mode, axes[0].hue, AXIS_COUNT);
  const active = modeActiveAxes(mode);
  return axes.map((a, i) => (active[i] ? { hue: hues[i], family: a.family } : { ...a }));
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
  // With no stored axes (a theme predating them), the default Quaternary hue is
  // an offset from the anchor, so it follows the anchor's palette-seeded hue
  // rather than the spec hue the defaults were built from.
  const last = axes[AXIS_COUNT - 1];
  if (!Array.isArray(input) && last.family === null) last.hue = norm(axes[0].hue + 270);
  return axes;
}
