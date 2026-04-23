import type { PaletteConfig, FontSource, FontStack } from './themeTypes';

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

export interface OverlayToken {
  variable: string; label: string;
  r: number; g: number; b: number; opacity: number;
}

export interface OverlayChannelGlobals {
  hue: number; saturation: number; lightness: number;
  opacityMin: number; opacityMax: number;
}

export interface OverlayGlobals {
  overlay: OverlayChannelGlobals;
  hover: OverlayChannelGlobals;
}

export interface ColumnsState {
  count: number;
  maxWidth: number;
  gutter: number;
  margin: number;
}

export interface ComponentSlice {
  activeFile: string;
  aliases: Record<string, string>;
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
  overlays: {
    tokens: OverlayToken[];
    hoverTokens: OverlayToken[];
    globals: OverlayGlobals;
  };
  columns: ColumnsState;
  components: Record<string, ComponentSlice>;
  cssVars: Record<string, string>;
}
