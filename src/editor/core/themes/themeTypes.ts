import type { CurveAnchor } from '../../ui/curveEngine';
import type { Oklch } from '../palettes/oklch';
import type { HarmonyAxis } from '../palettes/colorHarmony';

export type GradientStyle = 'linear' | 'radial' | 'conic';

export interface GradientStop {
  position: number;
  paletteLabel: string;
}

export interface PaletteConfig {
  /** Numeric OKLCH intent — the single stored basis. Unclamped: the store holds
   *  what the user meant; gamut clamping is projection-only (derivation output,
   *  swatch/canvas painting, hex/CSS serialization). */
  baseColor: Oklch;
  lightnessCurve: CurveAnchor[];
  saturationCurve: CurveAnchor[];
  scaleCurves: Record<string, { lightness: CurveAnchor[]; saturation: CurveAnchor[] }>;
  curveOffset: Record<string, number>;
  overrides: Record<string, Oklch>;
  snappedScales: string[];
  emptyMode?: 'solid' | 'gradient';
  gradientStyle?: GradientStyle;
  gradientAngle?: number;
  gradientReverse?: boolean;
  gradientStops?: GradientStop[];
  gradientSize?: 'page' | 'window';
  anchorToBase?: boolean;
  /**
   * Where the base color sits in the ramp while `anchorToBase` is on: the
   * PALETTE_STEPS index whose curve anchors are pinned to the base color
   * (lightness = base L, saturation = multiplier 100). `displacedL` /
   * `displacedS` remember the y of a pre-existing anchor (endpoint or
   * user-authored) the placement overwrote at that x, so moving the
   * placement or toggling off restores it instead of deleting it.
   * `priorLightnessEndpoints` / `priorSaturationEndpoints` remember the two
   * endpoints exactly as they stood before the curve's first-ever placement
   * (a smoothed reshape, not algebraically invertible the way a later
   * scaled-handle re-placement is), so a clear can still restore the true
   * original regardless of how many times the anchor has since moved.
   */
  anchorPlacement?: {
    step: number;
    displacedL?: number;
    displacedS?: number;
    priorLightnessEndpoints?: [CurveAnchor, CurveAnchor];
    priorSaturationEndpoints?: [CurveAnchor, CurveAnchor];
  };
  /**
   * Set to true by importers when they overlay `cssVariables[--color-{ns}-*]`
   * without owning the typed-state curves. The storage-layer reconciler uses
   * it as an opt-in switch: snap `baseColor` to the imported
   * `--color-{ns}-500` anchor and clear the flag. Editor-authored themes
   * never set this, so the reconciler is a strict no-op for them.
   *
   * Persists on disk for first-load reconciliation. After reconcile strips
   * the palette-derived keys from `cssVariables`, subsequent reconciles find
   * no anchor and become idempotent no-ops regardless of the flag's value.
   */
  _imported?: boolean;
}

export type FontSourceKind = 'google' | 'typekit' | 'css-url' | 'font-face';

export interface FontFamily {
  id: string;
  name: string;
  cssName: string;
  weights?: number[];
  italics?: boolean;
}

export interface FontSource {
  id: string;
  kind: FontSourceKind;
  url?: string;
  cssText?: string;
  families: FontFamily[];
  label?: string;
}

export type SystemCascadePreset = 'system-ui-sans' | 'system-ui-serif' | 'system-ui-mono';
export type GenericFamily = 'sans-serif' | 'serif' | 'monospace' | 'cursive' | 'fantasy';
export type FontStackVariable = '--font-display' | '--font-sans' | '--font-serif' | '--font-mono';

export type FontStackSlot =
  | { kind: 'project'; familyId: string }
  | { kind: 'system'; preset: SystemCascadePreset }
  | { kind: 'generic'; value: GenericFamily };

export interface FontStack {
  variable: FontStackVariable;
  slots: FontStackSlot[];
}

/** On-disk shape of one `--gradient-N` library token. Structural mirror of the
 *  store's `GradientToken` (like `AliasDiskValue`'s inline gradient shape) so
 *  the file schema stays independent of store types. The rendered strings in
 *  `cssVariables` are a projection of these for production CSS; this field is
 *  the editable basis. */
export interface GradientDiskToken {
  variable: string;
  type: 'linear' | 'radial' | 'solid' | 'none';
  angle: number;
  radius?: number;
  centerX?: number;
  aspectX?: number;
  aspectY?: number;
  stops: { position: number; color: string; opacity?: number }[];
}

export interface ColorsAndType {
  name: string;
  createdAt: string;
  updatedAt: string;
  editorConfigs: Record<string, PaletteConfig>;
  cssVariables: Record<string, string>;
  fontSources?: FontSource[];
  fontStacks?: FontStack[];
  /** Absent on files saved before gradients round-tripped; the loader keeps
   *  the stock defaults then, which match what those files rendered. */
  gradients?: GradientDiskToken[];
  /** Four fixed harmony axes, each owning a hue with an optional bound family. */
  harmonyAxes?: HarmonyAxis[];
  /**
   * Server-attached file-name marker for round-tripping the file identity
   * back to the client. Set by `themeFileApi`'s GET handlers; read by
   * `themeInit` to seed `activeFileName`. Optional and not persisted to disk.
   */
  _fileName?: string;
  /**
   * Migration stamp. Absent on legacy files, treated as 0; the loader runs
   * any registered theme migrations whose `fromVersion >= file.schemaVersion`.
   * Save paths stamp the current value so resaved files skip past
   * migrations.
   */
  schemaVersion?: number;
}

export interface ColorsAndTypeMeta {
  name: string;
  fileName: string;
  updatedAt: string;
  isActive: boolean;
  /** The file is served from the installed package and no local copy shadows
   *  it: one of the shipped presets or the default, not a file the user made. */
  isPackage: boolean;
}

/** On-disk shape of a single alias entry. Plain strings carry the bulk of
 *  aliases (token refs like `--surface-canvas-low` or literal CSS like `4px`);
 *  the gradient object shape is the structured payload for component-owned
 *  gradients that can't compress to a single string. */
export type AliasDiskValue =
  | string
  | { kind: 'gradient'; value: { type: 'linear' | 'radial' | 'solid' | 'none'; angle: number; radius?: number; centerX?: number; aspectX?: number; aspectY?: number; stops: { position: number; color: string; opacity?: number }[] } };

export interface ComponentConfig {
  name: string;
  component: string;
  createdAt: string;
  updatedAt: string;
  aliases: Record<string, AliasDiskValue>;
  config?: Record<string, unknown>;
  /**
   * Server-attached file-name marker. Same role as `ColorsAndType._fileName`. Set by
   * the component-configs GET handlers; not persisted to disk.
   */
  _fileName?: string;
  /**
   * Migration stamp. Absent on legacy files, treated as 0. See `ColorsAndType.schemaVersion`.
   */
  schemaVersion?: number;
}

export interface ComponentConfigMeta {
  name: string;
  fileName: string;
  updatedAt: string;
  isActive: boolean;
  isProduction: boolean;
}

/**
 * A saved look, encapsulated: the colors and type plus a config for every
 * component that sits off its default, all carried by value. Working files
 * (colors and type, component configs) are therefore freely deletable — a theme
 * owns its copy. Applying one materialises that data back into working files
 * under the theme's own slug and flips the `_active.json` / `_production.json`
 * pointers at it. The currently-active theme is the live snapshot:
 * colors-and-type and component Adopts re-embed that slice on the server.
 */
export interface Theme {
  name: string;
  createdAt: string;
  updatedAt: string;
  /** Migration stamp. 1 was the pointer form (colors-and-type + config
   *  basenames); 2 encapsulated it under a `theme` key; 3 spells that key
   *  `colorsAndType`. The server rewrites older files at boot. */
  schemaVersion: 3;
  /** Full colors-and-type content. */
  colorsAndType: ColorsAndType;
  /** Component id → its config. Delta encoding: a component absent here is on
   *  its default. Defaults are never inlined — the local `default.json` derived
   *  from the component source is canonical, and a frozen copy would drift. */
  componentConfigs: Record<string, ComponentConfig>;
  /** Server-attached file-name marker. Same role as `ColorsAndType._fileName`. */
  _fileName?: string;
}

/**
 * Transport envelope for sharing a theme. The theme already carries
 * everything needed to apply it, so the envelope adds only provenance.
 *
 * Bundles are *not* stored under `themes/` — they're transient downloads /
 * uploads; import writes the enclosed theme as a single file.
 */
export interface ThemeBundle {
  /** Discriminator for safe identification of bundle JSON files. Paired with
   *  the version below: import accepts this kind only at v3, and the
   *  `manifest-bundle` every release through 0.47.1 wrote only at v1. */
  kind: 'theme-bundle';
  /** Tracks the enclosed theme's schema. Import still accepts 1, where the
   *  envelope carried a pointer theme plus separately inlined colors and type
   *  and `${component}/${configName}`-keyed configs. */
  schemaVersion: 3;
  /** Sender's `@motion-proto/live-tokens` package version. Receiver can
   *  compare to its own to warn about compatibility drift. */
  liveTokensVersion: string;
  /** ISO timestamp of when the bundle was exported. */
  exportedAt: string;
  /** Keeps the `manifest` spelling: a v1 bundle's `theme` is the separately
   *  inlined colors and type, which import still reads, so the envelope cannot
   *  take that name without meaning two things at once. */
  manifest: Theme;
}

export interface ThemeMeta {
  name: string;
  fileName: string;
  updatedAt: string;
  isActive: boolean;
  /** `true` only for `default` — the protected baseline. Cannot be written
   *  to or deleted, and colors-and-type / component Adopts cannot patch into
   *  it. */
  isProtected: boolean;
}
