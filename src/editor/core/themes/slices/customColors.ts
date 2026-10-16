import type { CssVarRef, CustomColorToken, EditorState } from '../../store/editorTypes';
import type { CustomColorDiskToken } from '../themeTypes';
import type { GradientStop } from '../parsers/gradient';
import { get } from 'svelte/store';
import { mutate, store } from '../../store/editorCore';
import { oklchToCss, type Oklch } from '../../palettes/oklch';
import { PALETTE_SPECS, PALETTE_STEPS, palettesToValues } from '../../palettes/paletteDerivation';
import { WASH_FAMILIES, type WashFamily } from './washes';

const CUSTOM_COLOR_SLOT_RE = /^--color-custom-\d+$/;

export function isCustomColorSlot(variable: string): boolean {
  return CUSTOM_COLOR_SLOT_RE.test(variable);
}

function isCustomColorToken(t: unknown): t is CustomColorToken {
  if (!t || typeof t !== 'object') return false;
  const { variable, color } = t as Partial<CustomColorToken>;
  return typeof variable === 'string' && isCustomColorSlot(variable)
    && !!color && typeof color === 'object'
    && [color.l, color.c, color.h].every((n) => typeof n === 'number' && Number.isFinite(n));
}

export function isCustomColorList(tokens: unknown): tokens is CustomColorToken[] {
  return Array.isArray(tokens) && tokens.every(isCustomColorToken);
}

/** The lowest free slot, so a removed number is reused before the list grows. */
export function nextCustomColorSlot(tokens: readonly CustomColorToken[]): string {
  const used = new Set(tokens.map((t) => t.variable));
  for (let n = 1; ; n++) {
    const name = `--color-custom-${n}`;
    if (!used.has(name)) return name;
  }
}

export function customColorsToVars(c: EditorState['customColors']): Record<string, string> {
  const out: Record<string, string> = {};
  for (const t of c.tokens) out[t.variable] = oklchToCss(t.color.l, t.color.c, t.color.h);
  return out;
}

/** The rendered `--color-custom-N` strings in `cssVariables` are a projection
 *  for production CSS; the structured field is the basis, so the loader sheds
 *  them from the bag. A file without the field keeps its bag as it is. */
export function loadCustomColorsFromFile(
  next: EditorState,
  customColors: CustomColorDiskToken[] | undefined,
  rawVars: Record<string, string>,
): void {
  for (const t of customColors ?? []) delete rawVars[t.variable];
  if (isCustomColorList(customColors)) {
    next.customColors.tokens = structuredClone(customColors);
  }
}

function findCustomColor(s: EditorState, variable: string): CustomColorToken | undefined {
  return s.customColors.tokens.find((t) => t.variable === variable);
}

export function addCustomColor(color: Oklch): string {
  let variable = '';
  mutate('add custom colour', (s) => {
    variable = nextCustomColorSlot(s.customColors.tokens);
    s.customColors.tokens.push({ variable, color: { ...color } });
  });
  return variable;
}

export function setCustomColor(variable: string, color: Oklch): void {
  mutate(`set custom colour ${variable}`, (s) => {
    const t = findCustomColor(s, variable);
    if (t) t.color = { ...color };
  });
}

/** One slot that names a custom colour. An alias counts once however many of
 *  its inline gradient stops name the colour; so does a library gradient. */
export type CustomColorUsage =
  | { kind: 'alias'; component: string; property: string }
  | { kind: 'gradient'; gradient: string }
  | { kind: 'wash'; family: WashFamily };

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/** `var(--color-custom-1)` inside a literal, never `var(--color-custom-10)`. */
function varRefPattern(variable: string): RegExp {
  return new RegExp(`var\\(${escapeRegExp(variable)}\\)`, 'g');
}

function stopsName(stops: readonly GradientStop[], variable: string): boolean {
  return stops.some((st) => st.color === variable);
}

/** A literal names a custom colour when the picker materialized a library
 *  gradient with a per-slot angle: the stop list is inlined as `var()` refs. */
function refNames(ref: CssVarRef, variable: string): boolean {
  switch (ref.kind) {
    case 'token':
      return ref.name === variable;
    case 'literal':
      return varRefPattern(variable).test(ref.value);
    case 'gradient':
      return stopsName(ref.value.stops, variable);
  }
}

export function customColorUsages(state: EditorState, variable: string): CustomColorUsage[] {
  const out: CustomColorUsage[] = [];
  for (const [component, slice] of Object.entries(state.components)) {
    for (const [property, ref] of Object.entries(slice.aliases)) {
      if (refNames(ref, variable)) out.push({ kind: 'alias', component, property });
    }
  }
  for (const g of state.gradients.tokens) {
    if (stopsName(g.stops, variable)) out.push({ kind: 'gradient', gradient: g.variable });
  }
  for (const family of WASH_FAMILIES) {
    if (state.washes[family].color === variable) out.push({ kind: 'wash', family });
  }
  return out;
}

const WHITE: Oklch = { l: 1, c: 0, h: 0 };
const BLACK: Oklch = { l: 0, c: 0, h: 0 };

function oklabDistance(a: Oklch, b: Oklch): number {
  const ar = (a.h * Math.PI) / 180;
  const br = (b.h * Math.PI) / 180;
  const dl = a.l - b.l;
  const da = a.c * Math.cos(ar) - b.c * Math.cos(br);
  const db = a.c * Math.sin(ar) - b.c * Math.sin(br);
  return Math.hypot(dl, da, db);
}

/** The token a replace step preselects: nearest by OKLab distance among the
 *  palette steps, White, Black and the custom colours other than `exclude`. */
export function nearestColorToken(color: Oklch, state: EditorState, exclude?: string): string {
  const candidates: [string, Oklch][] = [];
  const values = palettesToValues(state.palettes);
  for (const spec of PALETTE_SPECS) {
    for (const step of PALETTE_STEPS) {
      const name = `--color-${spec.cssNamespace}-${step.label}`;
      const v = values[name];
      if (v?.kind === 'color') candidates.push([name, v]);
    }
  }
  candidates.push(['--color-white', WHITE], ['--color-black', BLACK]);
  for (const t of state.customColors.tokens) {
    if (t.variable !== exclude) candidates.push([t.variable, t.color]);
  }

  let best = candidates[0][0];
  let bestDistance = Infinity;
  for (const [name, value] of candidates) {
    const d = oklabDistance(color, value);
    if (d < bestDistance) {
      best = name;
      bestDistance = d;
    }
  }
  return best;
}

/** Removes a custom colour that no slot names. Returns false, changing
 *  nothing, while any slot still names it; `replaceAndRemoveCustomColor`
 *  serves that case. */
export function removeCustomColor(variable: string): boolean {
  const current = get(store);
  if (!findCustomColor(current, variable) || customColorUsages(current, variable).length > 0) return false;
  mutate(`remove custom colour ${variable}`, (s) => {
    s.customColors.tokens = s.customColors.tokens.filter((t) => t.variable !== variable);
  });
  return true;
}

function replaceInStops(stops: GradientStop[], variable: string, replacement: string): void {
  for (const st of stops) if (st.color === variable) st.color = replacement;
}

/** Repoints every slot that names `variable` at `replacement`, keeping each
 *  slot's opacity, then removes the custom colour. One undo step. */
export function replaceAndRemoveCustomColor(variable: string, replacement: string): void {
  if (replacement === variable || !findCustomColor(get(store), variable)) return;
  const pattern = varRefPattern(variable);
  mutate(`replace and remove custom colour ${variable}`, (s) => {
    for (const slice of Object.values(s.components)) {
      for (const ref of Object.values(slice.aliases)) {
        if (ref.kind === 'token' && ref.name === variable) ref.name = replacement;
        else if (ref.kind === 'literal') ref.value = ref.value.replace(pattern, `var(${replacement})`);
        else if (ref.kind === 'gradient') replaceInStops(ref.value.stops, variable, replacement);
      }
    }
    for (const g of s.gradients.tokens) replaceInStops(g.stops, variable, replacement);
    for (const family of WASH_FAMILIES) {
      if (s.washes[family].color === variable) s.washes[family].color = replacement;
    }
    s.customColors.tokens = s.customColors.tokens.filter((t) => t.variable !== variable);
  });
}
