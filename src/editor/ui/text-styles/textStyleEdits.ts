import { get } from 'svelte/store';
import { editorState, mutate, transaction } from '../../core/store/editorStore';
import type { EditorState } from '../../core/store/editorTypes';
import {
  COMPRESSION_RANGE,
  CUSTOM_RATIO_RANGE,
  DEFAULTS,
  EDITABLE_NAMES,
  EYEBROW_PREFIX,
  INTERVALS,
  ROOT_PX,
  axisName,
  compressionName,
  formatNumber,
  formatRem,
  recommend,
  recommendedEditedExpression,
  scalePx,
  sizeName,
  stepPrefix,
  usageName,
  type CompressedViewport,
  type Interval,
  type Step,
  type StylePrefix,
  type Usage,
  type Viewport,
} from '../../core/typeScale/typeScale';

export type Declared = (name: string) => string | null;

export interface TokenView {
  stored: Readonly<Record<string, string>>;
  declared: Declared;
}

/** Planned writes: a value to store, or null to delete the key. */
export type Patch = Record<string, string | null>;

export interface StyleTarget {
  prefix: StylePrefix;
  /** The usage whose face and weight the style links to. */
  usage: Usage;
  /** Null for the eyebrow, whose sizes follow `EYEBROW_FOLLOWS`. */
  step: Step | null;
}

export type LinkAxis = 'font-family' | 'font-weight';

export interface SizeView {
  px: number;
  recommendedPx: number;
  edited: boolean;
}

export const COMPRESSED: readonly CompressedViewport[] = ['tablet', 'phone'];
export const SIZE_RANGE_PX = { min: 6, max: 200 } as const;
export const BASE_RANGE_PX = { min: 8, max: 160 } as const;
/** A typed size this close to its recommendation follows the recommendation. */
export const SIZE_TOLERANCE_PX = 0.05;
export const SMALL_SIZE_PX = 12;

export const stepTarget = (usage: Usage, step: Step): StyleTarget => ({
  prefix: stepPrefix(usage, step),
  usage,
  step,
});

export const EYEBROW: StyleTarget = { prefix: EYEBROW_PREFIX, usage: DEFAULTS.eyebrow.usage, step: null };
const EYEBROW_FOLLOWS = stepTarget(DEFAULTS.eyebrow.usage, DEFAULTS.eyebrow.sizeStep);

const clamp = (v: number, lo: number, hi: number): number => Math.min(hi, Math.max(lo, v));

export function valueOf(view: TokenView, name: string): string {
  return view.stored[name] ?? view.declared(name) ?? '';
}

export const isStored = (view: TokenView, name: string): boolean => Object.hasOwn(view.stored, name);

const numberOf = (view: TokenView, name: string): number => Number(valueOf(view, name));

/** A length the editor wrote, in px. An expression follows a recommendation and parses to null. */
export function literalPx(value: string): number | null {
  const m = /^(-?\d*\.?\d+)(rem|px)$/.exec(value.trim());
  if (!m) return null;
  return m[2] === 'rem' ? Number(m[1]) * ROOT_PX : Number(m[1]);
}

export interface UsageSettings {
  base: number;
  ratio: number;
  face: string;
  weight: string;
}

export function settingsOf(view: TokenView, usage: Usage): UsageSettings {
  return {
    base: numberOf(view, usageName(usage, 'scale-base')),
    ratio: numberOf(view, usageName(usage, 'scale-ratio')),
    face: valueOf(view, usageName(usage, 'font-family')),
    weight: valueOf(view, usageName(usage, 'font-weight')),
  };
}

export const compressionOf = (view: TokenView, viewport: CompressedViewport): number =>
  numberOf(view, compressionName(viewport));

const CUSTOM_INTERVAL = INTERVALS.find((i) => i.ratio === null)!;

export function intervalOf(ratio: number): Interval {
  return INTERVALS.find((i) => i.ratio !== null && Math.abs(i.ratio - ratio) < 1e-6) ?? CUSTOM_INTERVAL;
}

export function ratioLabel(ratio: number): string {
  const interval = intervalOf(ratio);
  return interval.ratio === null ? `${interval.label} ${formatNumber(ratio)}` : interval.label;
}

function sizeOf(value: string, recommendedPx: number): SizeView {
  const px = literalPx(value);
  return { px: px ?? recommendedPx, recommendedPx, edited: px !== null };
}

/**
 * Each viewport's size: the stored edit when it holds a literal, the
 * recommendation otherwise. The eyebrow follows body sm until its desktop
 * size holds an edit.
 */
export function sizesOf(view: TokenView, target: StyleTarget): Record<Viewport, SizeView> {
  const follows = target.step === null ? sizesOf(view, EYEBROW_FOLLOWS) : null;
  let desktopRecommended: number;
  if (follows) desktopRecommended = follows.desktop.px;
  else {
    const { base, ratio } = settingsOf(view, target.usage);
    desktopRecommended = scalePx(base, ratio, target.step!);
  }
  const desktop = sizeOf(valueOf(view, sizeName(target.prefix, 'desktop')), desktopRecommended);
  const out = { desktop } as Record<Viewport, SizeView>;
  for (const vp of COMPRESSED) {
    const recommended = follows && !desktop.edited
      ? follows[vp].px
      : recommend(desktop.px, compressionOf(view, vp));
    out[vp] = sizeOf(valueOf(view, sizeName(target.prefix, vp)), recommended);
  }
  return out;
}

export function linkExpression(target: StyleTarget, axis: LinkAxis): string {
  return `var(${usageName(target.usage, axis)})`;
}

export function isLinked(view: TokenView, target: StyleTarget, axis: LinkAxis): boolean {
  return valueOf(view, axisName(target.prefix, axis)) === linkExpression(target, axis);
}

/** `var(--font-display)` reads as "Display", and a stack reads as its first family. */
export function faceLabel(value: string): string {
  const token = /^var\(--font-([a-z]+)\)$/.exec(value);
  if (token) return capitalize(token[1]);
  return value.split(',')[0].trim().replace(/^['"]|['"]$/g, '');
}

export function weightLabel(value: string): string {
  const token = /^var\(--font-weight-([a-z]+)\)$/.exec(value);
  return token ? capitalize(token[1]) : value;
}

const capitalize = (s: string): string => s.charAt(0).toUpperCase() + s.slice(1);

export const formatPx = (px: number): string => px.toFixed(1);

export function compressionEffect(compression: number): string {
  return `${[72, 48, 24].map((px) => `${px} → ${formatPx(recommend(px, compression))}`).join(' · ')} px`;
}

/** Every editable name a usage's tab shows. The Body tab also holds the eyebrow. */
export function usageKeys(usage: Usage): string[] {
  return [...EDITABLE_NAMES].filter(
    (name) => name.startsWith(`--${usage}-`)
      || (usage === EYEBROW.usage && name.startsWith(`${EYEBROW_PREFIX}-`)),
  );
}

export const hasStored = (view: TokenView, names: Iterable<string>): boolean =>
  [...names].some((name) => isStored(view, name));

/** Store `value`, or delete the key when `tokens.css` already declares it. */
function put(view: TokenView, patch: Patch, name: string, value: string): Patch {
  patch[name] = value === view.declared(name) ? null : value;
  return patch;
}

/**
 * The declared tablet and phone sizes compute from the scale, so a desktop
 * edit rewrites both recommendations around its own rem count. A tablet or
 * phone size that holds an edit keeps it.
 */
function planDesktop(view: TokenView, target: StyleTarget, rem: number | null): Patch {
  const patch: Patch = { [sizeName(target.prefix, 'desktop')]: rem === null ? null : formatRem(rem) };
  for (const vp of COMPRESSED) {
    const name = sizeName(target.prefix, vp);
    if (literalPx(valueOf(view, name)) !== null) continue;
    patch[name] = rem === null ? null : recommendedEditedExpression(target.prefix, rem, vp);
  }
  return patch;
}

function planFollow(view: TokenView, target: StyleTarget, vp: CompressedViewport): Patch {
  const desktop = sizesOf(view, target).desktop;
  const name = sizeName(target.prefix, vp);
  if (!desktop.edited) return { [name]: null };
  return { [name]: recommendedEditedExpression(target.prefix, desktop.px / ROOT_PX, vp) };
}

export function planSize(view: TokenView, target: StyleTarget, vp: Viewport, px: number): Patch {
  if (!Number.isFinite(px)) return {};
  const follows = Math.abs(px - sizesOf(view, target)[vp].recommendedPx) < SIZE_TOLERANCE_PX;
  const rem = Number(formatNumber(clamp(px, SIZE_RANGE_PX.min, SIZE_RANGE_PX.max) / ROOT_PX));
  if (vp === 'desktop') return planDesktop(view, target, follows ? null : rem);
  if (follows) return planFollow(view, target, vp);
  return { [sizeName(target.prefix, vp)]: formatRem(rem) };
}

export function planSizeReset(view: TokenView, target: StyleTarget, vp: Viewport): Patch {
  return vp === 'desktop' ? planDesktop(view, target, null) : planFollow(view, target, vp);
}

export function planCompression(view: TokenView, vp: CompressedViewport, value: number): Patch {
  if (!Number.isFinite(value)) return {};
  const c = clamp(value, COMPRESSION_RANGE.min, COMPRESSION_RANGE.max);
  return put(view, {}, compressionName(vp), formatNumber(c));
}

export function planBase(view: TokenView, usage: Usage, px: number): Patch {
  if (!Number.isFinite(px)) return {};
  const rem = clamp(px, BASE_RANGE_PX.min, BASE_RANGE_PX.max) / ROOT_PX;
  return put(view, {}, usageName(usage, 'scale-base'), formatNumber(rem));
}

export function planRatio(view: TokenView, usage: Usage, ratio: number): Patch {
  if (!Number.isFinite(ratio)) return {};
  const r = clamp(ratio, CUSTOM_RATIO_RANGE.min, CUSTOM_RATIO_RANGE.max);
  return put(view, {}, usageName(usage, 'scale-ratio'), formatNumber(r));
}

/** A selector's write: a bare `--token`, a literal such as a font stack, or null to reset. */
export function planToken(view: TokenView, name: string, value: string | null): Patch {
  if (value === null) return { [name]: null };
  return put(view, {}, name, value.startsWith('--') ? `var(${value})` : value);
}

/** Unlinking copies the usage's current value; relinking restores the link expression. */
export function planLinkToggle(view: TokenView, target: StyleTarget, axis: LinkAxis): Patch {
  const name = axisName(target.prefix, axis);
  const value = isLinked(view, target, axis)
    ? valueOf(view, usageName(target.usage, axis))
    : linkExpression(target, axis);
  return put(view, {}, name, value);
}

export function planReset(view: TokenView, names: Iterable<string>): Patch {
  const patch: Patch = {};
  for (const name of names) if (isStored(view, name)) patch[name] = null;
  return patch;
}

export function applyPatch(label: string, patch: Patch): void {
  const stored = get(editorState).cssVars;
  const changes = Object.entries(patch).filter(([name, value]) =>
    value === null ? Object.hasOwn(stored, name) : stored[name] !== value,
  );
  if (changes.length === 0) return;
  const write = (s: EditorState) => {
    for (const [name, value] of changes) {
      if (value === null) delete s.cssVars[name];
      else s.cssVars[name] = value;
    }
  };
  if (changes.length === 1) mutate(label, write);
  else transaction(label, write);
}

export type TextStyleEdits = ReturnType<typeof textStyleEdits>;

/** Each action writes one history entry. */
export function textStyleEdits(declared: Declared) {
  const view = (): TokenView => ({ stored: get(editorState).cssVars, declared });
  return {
    view,
    setSize: (target: StyleTarget, vp: Viewport, px: number) =>
      applyPatch('edit text style size', planSize(view(), target, vp, px)),
    resetSize: (target: StyleTarget, vp: Viewport) =>
      applyPatch('reset text style size', planSizeReset(view(), target, vp)),
    setCompression: (vp: CompressedViewport, value: number) =>
      applyPatch(`edit ${vp} scaling`, planCompression(view(), vp, value)),
    setBase: (usage: Usage, px: number) =>
      applyPatch(`edit ${usage} base`, planBase(view(), usage, px)),
    setRatio: (usage: Usage, ratio: number) =>
      applyPatch(`edit ${usage} ratio`, planRatio(view(), usage, ratio)),
    writeToken: (name: string, value: string | null) =>
      applyPatch(`edit ${name}`, planToken(view(), name, value)),
    toggleLink: (target: StyleTarget, axis: LinkAxis) =>
      applyPatch(`toggle ${axisName(target.prefix, axis)} link`, planLinkToggle(view(), target, axis)),
    resetKey: (name: string) => applyPatch(`reset ${name}`, planReset(view(), [name])),
    resetUsage: (usage: Usage) => applyPatch(`reset ${usage} text styles`, planReset(view(), usageKeys(usage))),
    resetAll: () => applyPatch('reset text styles', planReset(view(), EDITABLE_NAMES)),
  };
}
