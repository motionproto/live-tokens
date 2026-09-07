import { mergeParallelEdges } from './edges';
import type { Edge } from './types';

/** A card's laid-out rectangle, relative to the canvas. */
export interface Box {
  left: number;
  right: number;
  top: number;
  bottom: number;
  midX: number;
  midY: number;
}

export interface Wire {
  d: string;
  back: boolean;
  lit: boolean;
  /** Trunks and buses carry no arrowhead; only the segment that arrives does. */
  arrow: boolean;
}

export interface Label {
  x: number;
  y: number;
  /** One entry per answer sharing the wire. */
  lines: string[];
  lit: boolean;
  /** Lane labels run along the lane; branch labels sit across the drop. */
  rotate: boolean;
}

export interface Drawing {
  wires: Wire[];
  labels: Label[];
}

/** Clearance between a card border and the wire, so the arrowhead reads as
 *  an arrival rather than as part of the card outline. */
const STANDOFF = 6;
const CORNER = 12;
/** How far outside the cards a lane sits, and how far one lane nests
 *  inside the next when two share a stretch of gutter. */
const LANE_INSET = 40;
const LANE_STEP = 16;

/** Cards laid out in one row share a top to within a pixel; cards pushed onto
 *  a second wrapped line do not, and a single bus cannot serve both. */
function aligned(values: number[]): boolean {
  return Math.max(...values) - Math.min(...values) < 4;
}

function push<T>(map: Map<string, T[]>, key: string, value: T) {
  const list = map.get(key);
  if (list) list.push(value);
  else map.set(key, [value]);
}

function label(out: Drawing, text: string | undefined, x: number, y: number, lit: boolean, rotate = false) {
  if (text) out.labels.push({ x, y, lines: text.split('\n'), lit, rotate });
}

/** One trunk down from the parent, one bus across, one drop into each child —
 *  so a split reads as a single decision rather than as N crossing curves.
 *  Each answer sits on its own drop. */
function fanOut(out: Drawing, a: Box, kids: Box[], edges: Edge[], lit: (i: number) => boolean) {
  const top = kids[0].top;
  const busY = (a.bottom + top) / 2;
  const xs = kids.map((k) => k.midX);
  const r = Math.max(
    0,
    Math.min(CORNER, (Math.max(...xs) - Math.min(...xs)) / 2, (busY - a.bottom) / 2, (top - busY) / 2),
  );
  const turns = xs.map((x) => (x < a.midX ? x + r : x > a.midX ? x - r : x));
  const busLeft = Math.min(...turns, a.midX);
  const busRight = Math.max(...turns, a.midX);
  const anyLit = kids.some((_, i) => lit(i));

  out.wires.push({
    back: false,
    arrow: false,
    lit: anyLit,
    d: `M ${a.midX} ${a.bottom + STANDOFF} L ${a.midX} ${busY} M ${busLeft} ${busY} L ${busRight} ${busY}`,
  });
  kids.forEach((k, i) => {
    const x = k.midX;
    const turn = turns[i];
    out.wires.push({
      back: false,
      arrow: true,
      lit: lit(i),
      d:
        turn === x
          ? `M ${x} ${busY} L ${x} ${top - STANDOFF}`
          : `M ${turn} ${busY} Q ${x} ${busY}, ${x} ${busY + r} L ${x} ${top - STANDOFF}`,
    });
    label(out, edges[i].label, x, (busY + r + top - STANDOFF) / 2, lit(i));
  });
}

/** The mirror of `fanOut`: risers up to a shared bus, one trunk into the child,
 *  so several outcomes converging land as one arrow instead of a pile. */
function fanIn(out: Drawing, parents: Box[], b: Box, edges: Edge[], lit: (i: number) => boolean) {
  const bottom = parents[0].bottom;
  const busY = (bottom + b.top) / 2;
  const xs = parents.map((p) => p.midX);
  const r = Math.max(
    0,
    Math.min(CORNER, (Math.max(...xs) - Math.min(...xs)) / 2, (busY - bottom) / 2, (b.top - busY) / 2),
  );
  const turns = xs.map((x) => (x < b.midX ? x + r : x > b.midX ? x - r : x));
  const anyLit = parents.some((_, i) => lit(i));

  parents.forEach((p, i) => {
    const x = p.midX;
    const turn = turns[i];
    out.wires.push({
      back: false,
      arrow: false,
      lit: lit(i),
      d:
        turn === x
          ? `M ${x} ${bottom + STANDOFF} L ${x} ${busY}`
          : `M ${x} ${bottom + STANDOFF} L ${x} ${busY - r} Q ${x} ${busY}, ${turn} ${busY}`,
    });
    label(out, edges[i].label, x, (bottom + STANDOFF + busY - r) / 2, lit(i));
  });
  out.wires.push({
    back: false,
    arrow: true,
    lit: anyLit,
    d:
      `M ${Math.min(...turns, b.midX)} ${busY} L ${Math.max(...turns, b.midX)} ${busY}` +
      ` M ${b.midX} ${busY} L ${b.midX} ${b.top - STANDOFF}`,
  });
}

/** A plain parent-to-child curve, and the fallback wherever a bus would have
 *  to cross a card: children wrapped onto a second line, or parents staggered
 *  across rows. */
function curve(out: Drawing, a: Box, b: Box, edge: Edge, lit: boolean) {
  const y1 = a.bottom + STANDOFF;
  const y2 = b.top - STANDOFF;
  const bend = Math.max(16, (y2 - y1) * 0.55);
  out.wires.push({
    back: false,
    arrow: true,
    lit,
    d: `M ${a.midX} ${y1} C ${a.midX} ${y1 + bend}, ${b.midX} ${y2 - bend}, ${b.midX} ${y2}`,
  });
  label(out, edge.label, (a.midX + b.midX) / 2, (y1 + y2) / 2, lit);
}

/** Every card the span passes between, not just the two it joins. */
function crossed(a: Box, b: Box, all: Box[]): Box[] {
  const top = Math.min(a.midY, b.midY);
  const bottom = Math.max(a.midY, b.midY);
  return all.filter((x) => x !== a && x !== b && x.bottom > top && x.top < bottom);
}

/** On the spine: no other card shares its row. A wrapped branch row also
 *  "crosses" cards on its way down, and those stay curves. */
function alone(box: Box, all: Box[]): boolean {
  return all.every((x) => x === box || !aligned([x.top, box.top]));
}

/** Re-run loops ride a lane in the left gutter the centred spine opens up,
 *  rather than bulging around the card they leave. */
function backEdge(out: Drawing, a: Box, b: Box, lane: number, edge: Edge, lit: boolean) {
  const dir = Math.sign(b.midY - a.midY) || -1;
  const r = Math.max(0, Math.min(CORNER, (a.left - STANDOFF - lane) / 2, Math.abs(a.midY - b.midY) / 2));
  out.wires.push({
    back: true,
    arrow: true,
    lit,
    d:
      `M ${a.left - STANDOFF} ${a.midY} L ${lane + r} ${a.midY}` +
      ` Q ${lane} ${a.midY}, ${lane} ${a.midY + dir * r}` +
      ` L ${lane} ${b.midY - dir * r} Q ${lane} ${b.midY}, ${lane + r} ${b.midY}` +
      ` L ${b.left - STANDOFF} ${b.midY}`,
  });
  label(out, edge.label ?? 're-run', lane, (a.midY + b.midY) / 2, lit, true);
}

/** A branch that skips a row rides the right gutter, the mirror of a loop,
 *  so a "no" never has to be drawn through the card the "yes" leads to. */
function skipEdge(out: Drawing, a: Box, b: Box, lane: number, edge: Edge, lit: boolean) {
  const r = Math.max(0, Math.min(CORNER, (lane - a.right - STANDOFF) / 2, Math.abs(a.midY - b.midY) / 2));
  out.wires.push({
    back: false,
    arrow: true,
    lit,
    d:
      `M ${a.right + STANDOFF} ${a.midY} L ${lane - r} ${a.midY}` +
      ` Q ${lane} ${a.midY}, ${lane} ${a.midY + r}` +
      ` L ${lane} ${b.midY - r} Q ${lane} ${b.midY}, ${lane - r} ${b.midY}` +
      ` L ${b.right + STANDOFF} ${b.midY}`,
  });
  label(out, edge.label, lane, (a.midY + b.midY) / 2, lit, true);
}

/**
 * Routes every edge between the measured cards. `lit` answers whether a wire
 * joining the given node ids belongs to the current selection.
 */
export function routeWires(boxes: Map<string, Box>, rawEdges: Edge[], lit: (...ids: string[]) => boolean): Drawing {
  const all = [...boxes.values()];
  const edges = mergeParallelEdges(rawEdges);
  const children = new Map<string, Edge[]>();
  const parents = new Map<string, Edge[]>();
  for (const edge of edges) {
    if (edge.back) continue;
    push(children, edge.from, edge);
    push(parents, edge.to, edge);
  }

  const out: Drawing = { wires: [], labels: [] };
  const claimed = new Set<Edge>();

  for (const [from, kidEdges] of children) {
    const a = boxes.get(from);
    const kids = kidEdges.map((e) => boxes.get(e.to));
    if (!a || kidEdges.length < 2 || kids.some((k) => !k)) continue;
    const kept = kids as Box[];
    if (!aligned(kept.map((k) => k.top))) continue;
    kidEdges.forEach((e) => claimed.add(e));
    fanOut(out, a, kept, kidEdges, (i) => lit(from, kidEdges[i].to));
  }

  for (const [to, parentEdges] of parents) {
    const open = parentEdges.filter((e) => !claimed.has(e));
    const b = boxes.get(to);
    const ups = open.map((e) => boxes.get(e.from));
    if (!b || open.length < 2 || ups.some((u) => !u)) continue;
    const kept = ups as Box[];
    if (!aligned(kept.map((u) => u.bottom))) continue;
    open.forEach((e) => claimed.add(e));
    fanIn(out, kept, b, open, (i) => lit(open[i].from, to));
  }

  // Longest skip first, so a long one always rides outside the skips it spans.
  const skips: { edge: Edge; a: Box; b: Box; over: Box[] }[] = [];
  for (const edge of edges) {
    if (edge.back || claimed.has(edge)) continue;
    const a = boxes.get(edge.from);
    const b = boxes.get(edge.to);
    if (!a || !b) continue;
    const over = alone(a, all) && alone(b, all) ? crossed(a, b, all) : [];
    if (over.length > 0) skips.push({ edge, a, b, over });
    else curve(out, a, b, edge, lit(edge.from, edge.to));
  }
  skips.sort((x, y) => Math.abs(y.a.midY - y.b.midY) - Math.abs(x.a.midY - x.b.midY));
  let outer = -Infinity;
  for (const { edge, a, b, over } of skips) {
    const lane = Math.max(...over.map((x) => x.right), a.right, b.right) + LANE_INSET;
    const placed = Math.max(lane, outer + LANE_STEP);
    outer = placed;
    skipEdge(out, a, b, placed, edge, lit(edge.from, edge.to));
  }

  // Shortest loop first, so a long one always nests outside the loops it spans.
  const loops = edges
    .filter((e) => e.back)
    .map((edge) => ({ edge, a: boxes.get(edge.from), b: boxes.get(edge.to) }))
    .filter((e): e is { edge: Edge; a: Box; b: Box } => !!e.a && !!e.b)
    .sort((x, y) => Math.abs(x.a.midY - x.b.midY) - Math.abs(y.a.midY - y.b.midY));

  let inner = Infinity;
  for (const { edge, a, b } of loops) {
    const clear = Math.min(...crossed(a, b, all).map((x) => x.left), a.left, b.left) - LANE_INSET;
    const lane = Math.max(4, Math.min(clear, inner - LANE_STEP));
    inner = lane;
    backEdge(out, a, b, lane, edge, lit(edge.from, edge.to));
  }

  return out;
}
