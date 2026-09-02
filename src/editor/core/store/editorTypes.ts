import type { PaletteConfig, FontSource, FontStack } from '../themes/themeTypes';
import type { GradientStop, GradientValue, LinearDirection } from '../themes/parsers/gradient';
import type { HarmonyAxis } from '../palettes/colorHarmony';

export interface ShadowGlobals {
  angle: number;
  opacityMin: number; opacityMax: number; opacityLocked: boolean;
  distanceMin: number; distanceMax: number;
  blurMin: number; blurMax: number; blurLocked: boolean;
  sizeMin: number; sizeMax: number; sizeLocked: boolean;
  hue: number; saturation: number; lightness: number;
}

export interface ShadowToken {
  variable: string;
  x: number; y: number; blur: number; spread: number;
  opacity: number; hue: number; saturation: number; lightness: number;
  angle: number; distance: number;
}

export interface ShadowOverrideFlags {
  angle: boolean; opacity: boolean; color: boolean;
  distance: boolean; blur: boolean; size: boolean;
}

/** A wash: an aliased color token + an opacity. Emits as
 *  `color-mix(in srgb, var(<alias>) <opacity%>, transparent)`. Scrims dim what
 *  is behind them; tints shade the surface they sit on. */
export interface WashToken {
  variable: string;
  label: string;
  alias: string;
  opacity: number;
}

export interface ColumnsState {
  count: number;
  maxWidth: number;
  gutter: number;
  margin: number;
}

/** Gradient render mode.
 *  - `linear` / `radial`: real gradients with N stops + angle (linear) or radius (radial).
 *  - `solid`: collapses to the first stop's color. Angle/radius/extra stops carried in
 *    the payload but ignored by the renderer; toggling back restores the prior shape.
 *  - `none`: transparent. Same carry-forward semantics — payload retained for
 *    round-trip when the user toggles back to a real gradient. */
export type GradientType = 'linear' | 'radial' | 'solid' | 'none';

/** One stop of a gradient. Defined by `themes/parsers/gradient`, which owns
 *  the shape so the CSS form and the persisted form cannot drift apart. */
export type GradientTokenStop = GradientStop;

export interface GradientToken {
  /** Output CSS variable, e.g. '--gradient-1'. */
  variable: string;
  type: GradientType;
  /** Degrees, applies to linear only. */
  angle: number;
  /** `to <side-or-corner>`, emitted instead of `angle` on a linear gradient.
   *  Tracks the box's aspect the way a fixed angle cannot. */
  direction?: LinearDirection;
  /** Pixel radius for radial gradients. When absent or zero, the renderer
   *  emits CSS's default ellipse/farthest-corner shape. */
  radius?: number;
  /** Horizontal center position for radial gradients, 0–100. Defaults to 50. */
  centerX?: number;
  /** Horizontal stretch factor for the radial ellipse (1–8). Defaults to 1.
   *  With aspectY, the rendered semi-axes are `radius * aspect*`, so both
   *  shape (ratio) and size are encoded together. Both = 1 keeps the legacy
   *  `circle` render path verbatim. */
  aspectX?: number;
  /** Vertical stretch factor for the radial ellipse (1–8). Defaults to 1. */
  aspectY?: number;
  stops: GradientTokenStop[];
}

/** Structured gradient payload carried inline on a component alias.
 *  `GradientToken` minus `variable` (the alias key itself is the binding).
 *  Used when a component owns a per-instance gradient that doesn't share the
 *  theme-level `--gradient-N` library. Defined by `themes/parsers/gradient`,
 *  the module that serializes and parses this shape. */
export type GradientAliasValue = GradientValue;

export type CssVarRef =
  /** An alias to a design token. `opacity` is an optional integer percent set
   *  only for a colour carried below 100% (serializes to
   *  `color-mix(in srgb, var(name) opacity%, transparent)`); absent means fully
   *  opaque, which also covers every non-colour alias (radius, spacing, font). */
  | { kind: 'token'; name: string; opacity?: number }
  | { kind: 'literal'; value: string }
  | { kind: 'gradient'; value: GradientAliasValue };

export interface ComponentSlice {
  aliases: Record<string, CssVarRef>;
  config: Record<string, unknown>;
  unlinked?: string[];
}

/**
 * Single source of truth for everything a saved token file depends on, plus
 * the domain state currently scattered across VariablesTab local `let` fields.
 * View state (tab selection, dialog flags, drag payloads, editing drafts)
 * stays out of this tree.
 */
export interface EditorState {
  palettes: Record<string, PaletteConfig>;
  fonts: { sources: FontSource[]; stacks: FontStack[] };
  shadows: {
    globals: ShadowGlobals;
    tokens: ShadowToken[];
    overrides: Record<string, ShadowOverrideFlags>;
  };
  washes: {
    scrims: WashToken[];
    tints: WashToken[];
  };
  columns: ColumnsState;
  components: Record<string, ComponentSlice>;
  gradients: { tokens: GradientToken[] };
  /** Four fixed numbered axes (index 0 is the anchor); each owns a hue;
   *  family is the live-bound color or null. */
  harmonyAxes: HarmonyAxis[];
  cssVars: Record<string, string>;
}
