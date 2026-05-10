import type { CurveAnchor } from '../ui/curveEngine';

export type GradientStyle = 'linear' | 'radial' | 'conic';

export interface GradientStop {
  position: number;
  paletteLabel: string;
}

export interface PaletteConfig {
  baseColor: string;
  tintHue: number;
  tintChroma?: number;
  lightnessCurve: CurveAnchor[];
  saturationCurve: CurveAnchor[];
  grayLightnessCurve: CurveAnchor[];
  graySaturationCurve: CurveAnchor[];
  scaleCurves: Record<string, { lightness: CurveAnchor[]; saturation: CurveAnchor[] }>;
  curveOffset: Record<string, number>;
  overrides: Record<string, string>;
  snappedScales: string[];
  emptyMode?: 'solid' | 'gradient';
  emptyStep?: string;
  gradientStyle?: GradientStyle;
  gradientAngle?: number;
  gradientReverse?: boolean;
  gradientStops?: GradientStop[];
  gradientSize?: 'page' | 'window';
  anchorToBase?: boolean;
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

export interface Theme {
  name: string;
  createdAt: string;
  updatedAt: string;
  editorConfigs: Record<string, PaletteConfig>;
  cssVariables: Record<string, string>;
  fontSources?: FontSource[];
  fontStacks?: FontStack[];
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

export interface ThemeMeta {
  name: string;
  fileName: string;
  updatedAt: string;
  isActive: boolean;
}

export interface ComponentConfig {
  name: string;
  component: string;
  createdAt: string;
  updatedAt: string;
  aliases: Record<string, string>;
  config?: Record<string, unknown>;
  /**
   * Server-attached file-name marker. Same role as `Theme._fileName`. Set by
   * the component-configs GET handlers; not persisted to disk.
   */
  _fileName?: string;
  /**
   * Migration stamp. Absent on legacy files, treated as 0. See `Theme.schemaVersion`.
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
 * Manifest that captures an entire site state — the active theme plus the
 * active config for every component. Loading a preset flips the relevant
 * `_active.json` pointers; the underlying theme + component-config files stay
 * the source of truth, so editing them flows through any preset that
 * references them.
 */
export interface Preset {
  name: string;
  createdAt: string;
  updatedAt: string;
  /** File basename (no `.json`) of the theme this preset pins. */
  theme: string;
  /** Map of componentId → config file basename. Components omitted here fall
   *  back to "default" at apply time. */
  componentConfigs: Record<string, string>;
  /** Server-attached file-name marker. Same role as `Theme._fileName`. */
  _fileName?: string;
}

export interface PresetMeta {
  name: string;
  fileName: string;
  updatedAt: string;
  isActive: boolean;
}
