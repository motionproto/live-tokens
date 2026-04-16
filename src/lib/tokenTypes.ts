import type { CurveAnchor } from '../showcase/curveEngine';

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

export interface TokenFile {
  name: string;
  createdAt: string;
  updatedAt: string;
  editorConfigs: Record<string, PaletteConfig>;
  cssVariables: Record<string, string>;
}

export interface TokenFileMeta {
  name: string;
  fileName: string;
  updatedAt: string;
  isActive: boolean;
}
