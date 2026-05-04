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
