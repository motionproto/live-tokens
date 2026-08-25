/**
 * The single source of truth for the CSS form of a structured gradient value.
 * A component alias that owns a gradient serializes to one of two shapes:
 *
 *   linear-gradient(<angle>deg, <stop>, <stop>, …)
 *   linear-gradient(<to side-or-corner>, <stop>, <stop>, …)
 *   radial-gradient(<shape> at <cx>% 50%, <stop>, <stop>, …)
 *
 * `solid` and `none` are NOT represented here. `solid` renders as its first
 * stop's colour and `none` as `transparent`, both indistinguishable in CSS
 * from an ordinary colour alias, so `parseGradientValue` never claims them —
 * see the round-trip contract below. Everything that writes or reads this form
 * must go through `formatGradientValue` / `parseGradientValue` so the shape
 * lives in exactly one place.
 *
 * ## Round-trip contract
 *
 * `formatGradientValue(parseGradientValue(css)) === css` for every string
 * `formatGradientValue` can emit. The reverse holds only up to CSS
 * equivalence: the format drops decompositions that have no rendered meaning,
 * so parsing returns the canonical member of the equivalence class.
 *
 *   - A radial's `angle` is never emitted (it exists so toggling the type back
 *     to linear restores the user's angle), so it parses back as 0.
 *   - `centerX: 50` and an absent `centerX` both emit `at 50% 50%`; parsing
 *     returns the absent form.
 *   - An ellipse emits `radius * aspectX` and `radius * aspectY`, three
 *     unknowns in two numbers. `radius` is vestigial (no setter writes it and
 *     `GradientSourceSnapshot` has no field for it), so parsing folds it into
 *     the aspects against `RADIAL_BASE_PX`. The two emitted numbers are
 *     unchanged, which is all CSS sees.
 *
 * This module depends only on its sibling `colorOpacity` parser, so the
 * dev-server vite plugin (a separate build) can import it the same way it
 * imports `globalRootBlock`.
 */
import { parseColorOpacity, formatColorOpacity } from './colorOpacity';

/** The `to <side-or-corner>` keywords CSS accepts in place of an angle. A
 *  keyword angles the gradient line off the box's own diagonal, so it tracks
 *  the element's aspect ratio where a fixed angle cannot: `to bottom right`
 *  reads as ~95deg across a wide heading and ~111deg once that heading wraps.
 *  That is the whole reason to carry them — a degree cannot express it. */
export const LINEAR_DIRECTIONS = [
  'to top',
  'to top right',
  'to right',
  'to bottom right',
  'to bottom',
  'to bottom left',
  'to left',
  'to top left',
] as const;

export type LinearDirection = (typeof LINEAR_DIRECTIONS)[number];

/** The angle each keyword equals on a square box. Sides are exact at any
 *  aspect (`to right` is 90deg, always); corners hold only at 1:1, which is
 *  the point of the keyword. Stored alongside a direction so the dial shows
 *  something honest and clearing the keyword lands on the nearest angle
 *  rather than snapping to 0deg (bottom-to-top). */
export const DIRECTION_ANGLES: Record<LinearDirection, number> = {
  'to top': 0,
  'to top right': 45,
  'to right': 90,
  'to bottom right': 135,
  'to bottom': 180,
  'to bottom left': 225,
  'to left': 270,
  'to top left': 315,
};

function parseDirection(raw: string): LinearDirection | null {
  const norm = raw.trim().toLowerCase().replace(/\s+/g, ' ');
  return (LINEAR_DIRECTIONS as readonly string[]).includes(norm)
    ? (norm as LinearDirection)
    : null;
}

export interface GradientStop {
  /** 0–100 percentage along the gradient axis. */
  position: number;
  /** A design-token name (`--surface-neutral-low`) or a raw CSS colour. */
  color: string;
  /** 0–100 alpha. Absent means 100. */
  opacity?: number;
  /** `false` marks the stop an explicit off-palette override: the stop picker
   *  opens to any colour rather than the current family, and a family-swap
   *  rewrite skips the stop so its colour survives. Absent means `true`.
   *  It has no CSS form, so `parseGradientValue` never produces it and
   *  `formatGradientValue` ignores it. It lives on the shared stop because
   *  the persisted stop carries it. */
  monochrome?: boolean;
}

export interface GradientValue {
  type: 'linear' | 'radial' | 'solid' | 'none';
  angle: number;
  /** Emitted in place of `angle` on a `linear` gradient. `angle` is retained
   *  underneath so clearing the direction restores the user's degrees, the
   *  same way a radial keeps its angle. */
  direction?: LinearDirection;
  radius?: number;
  centerX?: number;
  aspectX?: number;
  aspectY?: number;
  stops: GradientStop[];
}

/** Base radius (px) an ellipse's aspect factors scale, when the gradient has
 *  no explicit `radius` but needs concrete dimensions to express its shape.
 *  A pleasant mid-size that reads as a soft glow inside typical component
 *  containers. */
export const RADIAL_BASE_PX = 100;

/** Resolve a stop's colour + opacity into a CSS colour value without the
 *  trailing `${position}%`. Shared by the stop formatter (which appends the
 *  position) and the solid path (which doesn't). */
function formatStopColor(s: GradientStop): string {
  const opacity = s.opacity ?? 100;
  if (s.color.startsWith('--')) {
    return opacity >= 100 ? `var(${s.color})` : formatColorOpacity(s.color, opacity);
  }
  // A raw colour is not a design token, so colorOpacity, which owns the token
  // form, cannot express it.
  return opacity >= 100 ? s.color : `color-mix(in srgb, ${s.color} ${opacity}%, transparent)`;
}

/** Stops portion only, for callers that supply their own gradient function
 *  wrapper (the palette selector overrides the angle per slot while keeping
 *  the token's stop list and its `var(--color-…)` refs). */
export function formatGradientStops(stops: readonly GradientStop[]): string {
  return stops.map((s) => `${formatStopColor(s)} ${s.position}%`).join(', ');
}

function formatRadialShape(v: GradientValue): string {
  const ax = v.aspectX ?? 1;
  const ay = v.aspectY ?? 1;
  if (ax === 1 && ay === 1) {
    return v.radius && v.radius > 0 ? `circle ${v.radius}px` : 'circle';
  }
  const base = v.radius && v.radius > 0 ? v.radius : RADIAL_BASE_PX;
  return `ellipse ${(base * ax).toFixed(2)}px ${(base * ay).toFixed(2)}px`;
}

/** Serialize a structured gradient value (theme token or component-owned)
 *  into a CSS background declaration.
 *  - `none`   → `transparent` (no background paint).
 *  - `solid`  → the first stop's colour (no gradient function).
 *  - `linear` → `linear-gradient(<angle>deg, <stops>)`, or
 *    `linear-gradient(<direction>, <stops>)` when `direction` is set.
 *  - `radial` → `radial-gradient(<shape> at <centerX>% 50%, <stops>)`, where
 *    shape is `circle [radius]` at aspect 1 and `ellipse rx ry` otherwise.
 *    Aspects are independent stretch factors, not an area-preserving ratio:
 *    both at 8 is a circle eight times the size of both at 1. */
export function formatGradientValue(v: GradientValue): string {
  if (v.type === 'none') return 'transparent';
  if (v.type === 'solid') {
    const first = v.stops[0];
    return first ? formatStopColor(first) : 'transparent';
  }
  const stops = formatGradientStops(v.stops);
  if (v.type === 'linear') {
    return `linear-gradient(${v.direction ?? `${v.angle}deg`}, ${stops})`;
  }
  return `radial-gradient(${formatRadialShape(v)} at ${v.centerX ?? 50}% 50%, ${stops})`;
}

const NUM = String.raw`-?\d+(?:\.\d+)?`;
const HEADING = String.raw`${NUM}deg|to\s+\w+(?:\s+\w+)?`;
const LINEAR_RE = new RegExp(String.raw`^linear-gradient\(\s*(${HEADING})\s*,\s*(.+)\)$`, 'i');
const DEG_RE = new RegExp(String.raw`^(${NUM})deg$`, 'i');
const RADIAL_RE = new RegExp(
  String.raw`^radial-gradient\(\s*(circle|circle\s+${NUM}px|ellipse\s+${NUM}px\s+${NUM}px)\s+at\s+(${NUM})%\s+50%\s*,\s*(.+)\)$`,
  'i',
);
const STOP_RE = new RegExp(String.raw`^(.*?)\s+(${NUM})%$`);
const CIRCLE_RADIUS_RE = new RegExp(String.raw`^circle\s+(${NUM})px$`, 'i');
const ELLIPSE_RE = new RegExp(String.raw`^ellipse\s+(${NUM})px\s+(${NUM})px$`, 'i');
const VAR_RE = /^var\((--[a-z0-9-]+)\)$/i;

/** Split on top-level separators only. Stop colours nest commas inside
 *  `color-mix(…)`, so a plain `split(',')` shreds them. */
function splitTopLevel(s: string): string[] {
  const parts: string[] = [];
  let depth = 0;
  let start = 0;
  for (let i = 0; i < s.length; i++) {
    const c = s[i];
    if (c === '(') depth++;
    else if (c === ')') depth--;
    else if (c === ',' && depth === 0) {
      parts.push(s.slice(start, i));
      start = i + 1;
    }
  }
  parts.push(s.slice(start));
  return parts;
}

function parseStop(raw: string): GradientStop | null {
  const m = raw.trim().match(STOP_RE);
  if (!m) return null;
  const position = parseFloat(m[2]);
  const color = m[1].trim();
  const opacity = parseColorOpacity(color);
  if (opacity) return { position, color: opacity.name, opacity: opacity.opacity };
  const token = color.match(VAR_RE);
  return { position, color: token ? token[1] : color };
}

function parseStops(raw: string): GradientStop[] | null {
  const stops: GradientStop[] = [];
  for (const part of splitTopLevel(raw)) {
    const stop = parseStop(part);
    if (!stop) return null;
    stops.push(stop);
  }
  return stops.length > 0 ? stops : null;
}

function parseRadialShape(raw: string): Pick<GradientValue, 'radius' | 'aspectX' | 'aspectY'> | null {
  const shape = raw.trim();
  if (/^circle$/i.test(shape)) return {};
  const circle = shape.match(CIRCLE_RADIUS_RE);
  if (circle) return { radius: parseFloat(circle[1]) };
  const ellipse = shape.match(ELLIPSE_RE);
  if (!ellipse) return null;
  // Aspects of exactly 1 are dropped, matching `setGradientAspect`, so the
  // parsed value stays the canonical minimal shape.
  const ax = parseFloat(ellipse[1]) / RADIAL_BASE_PX;
  const ay = parseFloat(ellipse[2]) / RADIAL_BASE_PX;
  return { ...(ax === 1 ? {} : { aspectX: ax }), ...(ay === 1 ? {} : { aspectY: ay }) };
}

/**
 * Recover a structured gradient from the CSS `formatGradientValue` emits.
 * Returns null for anything else, including the plain colour a `solid` or
 * `none` gradient renders as: claiming those would turn every ordinary colour
 * alias into a gradient object.
 */
export function parseGradientValue(value: string): GradientValue | null {
  const css = value.trim();
  const linear = css.match(LINEAR_RE);
  if (linear) {
    const deg = linear[1].match(DEG_RE);
    const direction = deg ? null : parseDirection(linear[1]);
    // A heading that is neither degrees nor a keyword we know is not our form.
    if (!deg && !direction) return null;
    const stops = parseStops(linear[2]);
    if (!stops) return null;
    return deg
      ? { type: 'linear', angle: parseFloat(deg[1]), stops }
      : { type: 'linear', angle: 0, direction: direction!, stops };
  }
  const radial = css.match(RADIAL_RE);
  if (!radial) return null;
  const shape = parseRadialShape(radial[1]);
  const stops = parseStops(radial[3]);
  if (!shape || !stops) return null;
  const centerX = parseFloat(radial[2]);
  return {
    type: 'radial',
    angle: 0,
    ...shape,
    ...(centerX === 50 ? {} : { centerX }),
    stops,
  };
}
