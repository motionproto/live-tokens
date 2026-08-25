/**
 * Gradients slice — an open `--gradient-N` library seeded with four slots,
 * each rendering to a single CSS var. Stops carry token-name references
 * (`--color-brand-500`); the renderer wraps them in `var(...)` so palette
 * edits flow through.
 */
import type { EditorState, GradientToken, GradientTokenStop, GradientType } from '../../store/editorTypes';
import type { GradientDiskToken } from '../themeTypes';
import { mutate } from '../../store/editorCore';
import { formatGradientValue, formatGradientStops as formatStopList } from '../parsers/gradient';
import type { LinearDirection } from '../parsers/gradient';

export { formatGradientValue };

/** A well-formed library slot: `--gradient-` followed by a number. Anything
 *  else is pre-numbering data the loader and the persistence guard reject. */
export const GRADIENT_SLOT_RE = /^--gradient-\d+$/;

export function isGradientSlot(variable: string): boolean {
  return GRADIENT_SLOT_RE.test(variable);
}

/** The next free slot name, so callers never collide with an existing one. */
export function nextGradientSlot(tokens: readonly GradientToken[]): string {
  const used = new Set(tokens.map((t) => t.variable));
  for (let n = 1; ; n++) {
    const name = `--gradient-${n}`;
    if (!used.has(name)) return name;
  }
}

export function makeDefaultGradients(): GradientToken[] {
  return [
    {
      variable: '--gradient-1',
      type: 'linear',
      angle: 90,
      stops: [
        { position: 0, color: '--color-brand-500' },
        { position: 100, color: '--color-accent-500' },
      ],
    },
    {
      variable: '--gradient-2',
      type: 'linear',
      angle: 135,
      stops: [
        { position: 0, color: '--color-brand-500' },
        { position: 100, color: '--color-special-500' },
      ],
    },
    {
      variable: '--gradient-3',
      type: 'linear',
      angle: 90,
      stops: [
        { position: 0, color: '--color-success-500' },
        { position: 100, color: '--color-info-500' },
      ],
    },
    {
      variable: '--gradient-4',
      type: 'linear',
      angle: 45,
      stops: [
        { position: 0, color: '--color-danger-500' },
        { position: 100, color: '--color-warning-500' },
      ],
    },
  ];
}

/**
 * Loader: restore the gradient library from a file's structured `gradients`
 * field and scrub the rendered `--gradient-N` strings from the vars bag — they
 * are a projection kept for production CSS, never a basis. Files without the
 * field (saved before gradients round-tripped) keep the seeded defaults, which
 * match what those files rendered.
 *
 * The library is open-ended: any number of `--gradient-N` slots loads, so a
 * project can carry as many as its design needs. What still fails the guard is
 * a stale *shape* — a token named `--gradient-progress`, from before the slots
 * were numbered — which keeps defaults, mirroring `migrateGradients`.
 */
export function loadGradientsFromFile(
  next: EditorState,
  gradients: GradientDiskToken[] | undefined,
  rawVars: Record<string, string>,
): void {
  for (const name of makeDefaultGradients().map((g) => g.variable)) delete rawVars[name];
  for (const t of gradients ?? []) delete rawVars[t.variable];
  if (gradients?.length && gradients.every((g) => isGradientSlot(g.variable))) {
    next.gradients.tokens = structuredClone(gradients) as GradientToken[];
  }
}

/** Stops portion only — used by the palette selector to materialize a
 *  linear-gradient with a per-slot angle override while keeping the token's
 *  stop list (and its `var(--color-…)` refs, which propagate palette edits). */
export function formatGradientStops(t: GradientToken): string {
  return formatStopList(t.stops);
}

function formatGradient(t: GradientToken): string {
  return formatGradientValue({
    type: t.type,
    angle: t.angle,
    direction: t.direction,
    centerX: t.centerX,
    aspectX: t.aspectX,
    aspectY: t.aspectY,
    stops: t.stops,
  });
}

export function gradientsToVars(g: EditorState['gradients']): Record<string, string> {
  const out: Record<string, string> = {};
  for (const t of g.tokens) out[t.variable] = formatGradient(t);
  return out;
}

function findGradient(s: EditorState, variable: string): GradientToken | undefined {
  return s.gradients.tokens.find((t) => t.variable === variable);
}

/** Replace a gradient's type, angle, centerX, aspect, and stops in one shot.
 *  Used by the editor to restore a pre-edit snapshot on Cancel. */
export function setGradient(
  variable: string,
  next: { type: GradientType; angle: number; direction?: LinearDirection; centerX?: number; aspectX?: number; aspectY?: number; stops: GradientTokenStop[] },
): void {
  mutate(`replace gradient ${variable}`, (s) => {
    const t = findGradient(s, variable);
    if (!t) return;
    t.type = next.type;
    t.angle = next.angle;
    t.direction = next.direction;
    t.centerX = next.centerX;
    t.aspectX = next.aspectX;
    t.aspectY = next.aspectY;
    t.stops = next.stops.map((st) => ({ ...st }));
  });
}

export function setGradientType(variable: string, type: GradientType): void {
  mutate(`set gradient type ${variable}`, (s) => {
    const t = findGradient(s, variable);
    if (t) t.type = type;
  });
}

/** Setting degrees clears any direction keyword: the two are alternative
 *  headings for the same gradient, and the one you just set is the one you
 *  meant. The angle underneath a direction is preserved until then. */
export function setGradientAngle(variable: string, angle: number): void {
  mutate(`set gradient angle ${variable}`, (s) => {
    const t = findGradient(s, variable);
    if (!t) return;
    t.angle = angle;
    t.direction = undefined;
  });
}

/** `undefined` drops back to the stored `angle`. */
export function setGradientDirection(variable: string, direction: LinearDirection | undefined): void {
  mutate(`set gradient direction ${variable}`, (s) => {
    const t = findGradient(s, variable);
    if (t) t.direction = direction;
  });
}

export function setGradientCenterX(variable: string, centerX: number): void {
  mutate(`set gradient center ${variable}`, (s) => {
    const t = findGradient(s, variable);
    if (t) t.centerX = centerX;
  });
}

export function setGradientAspect(variable: string, aspect: { x: number; y: number }): void {
  mutate(`set gradient aspect ${variable}`, (s) => {
    const t = findGradient(s, variable);
    if (!t) return;
    // Drop axes that equal 1 (the legacy circle baseline) so the persisted
    // shape stays minimal and old data round-trips unchanged.
    if (aspect.x === 1) delete t.aspectX;
    else t.aspectX = aspect.x;
    if (aspect.y === 1) delete t.aspectY;
    else t.aspectY = aspect.y;
  });
}

export function setGradientStop(variable: string, index: number, stop: Partial<GradientTokenStop>): void {
  mutate(`set gradient stop ${variable}[${index}]`, (s) => {
    const t = findGradient(s, variable);
    if (!t || !t.stops[index]) return;
    if (stop.position !== undefined) t.stops[index].position = stop.position;
    if (stop.color !== undefined) t.stops[index].color = stop.color;
    if (stop.opacity !== undefined) t.stops[index].opacity = stop.opacity;
  });
}

export function addGradientStop(variable: string, stop: GradientTokenStop): void {
  mutate(`add gradient stop ${variable}`, (s) => {
    const t = findGradient(s, variable);
    if (!t) return;
    t.stops.push(stop);
    t.stops.sort((a, b) => a.position - b.position);
  });
}

export function removeGradientStop(variable: string, index: number): void {
  mutate(`remove gradient stop ${variable}[${index}]`, (s) => {
    const t = findGradient(s, variable);
    if (!t || t.stops.length <= 2) return;
    t.stops.splice(index, 1);
  });
}

export function addGradientToken(token: GradientToken): void {
  mutate(`add gradient ${token.variable}`, (s) => {
    if (findGradient(s, token.variable)) return;
    s.gradients.tokens.push({
      ...token,
      stops: token.stops.map((st) => ({ ...st })),
    });
  });
}

export function removeGradientToken(variable: string): void {
  mutate(`remove gradient ${variable}`, (s) => {
    s.gradients.tokens = s.gradients.tokens.filter((t) => t.variable !== variable);
  });
}
