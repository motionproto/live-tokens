/**
 * Gradients slice — fixed four-slot scale (--gradient-1 … --gradient-4),
 * each rendering to a single CSS var. Stops carry token-name references
 * (`--color-primary-500`); the renderer wraps them in `var(...)` so palette
 * edits flow through.
 */
import type { EditorState, GradientToken, GradientTokenStop, GradientType } from '../editorTypes';
import { mutate } from '../editorCore';

export function makeDefaultGradients(): GradientToken[] {
  return [
    {
      variable: '--gradient-1',
      type: 'linear',
      angle: 90,
      stops: [
        { position: 0, color: '--color-primary-500' },
        { position: 100, color: '--color-accent-500' },
      ],
    },
    {
      variable: '--gradient-2',
      type: 'linear',
      angle: 135,
      stops: [
        { position: 0, color: '--color-primary-500' },
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

function formatGradientStop(s: GradientTokenStop): string {
  const base = s.color.startsWith('--') ? `var(${s.color})` : s.color;
  const opacity = s.opacity ?? 100;
  const color = opacity >= 100
    ? base
    : `color-mix(in srgb, ${base} ${opacity}%, transparent)`;
  return `${color} ${s.position}%`;
}

function formatGradient(t: GradientToken): string {
  const stops = t.stops.map(formatGradientStop).join(', ');
  if (t.type === 'linear') return `linear-gradient(${t.angle}deg, ${stops})`;
  return `radial-gradient(${stops})`;
}

export function gradientsToVars(g: EditorState['gradients']): Record<string, string> {
  const out: Record<string, string> = {};
  for (const t of g.tokens) out[t.variable] = formatGradient(t);
  return out;
}

function findGradient(s: EditorState, variable: string): GradientToken | undefined {
  return s.gradients.tokens.find((t) => t.variable === variable);
}

export function setGradientType(variable: string, type: GradientType): void {
  mutate(`set gradient type ${variable}`, (s) => {
    const t = findGradient(s, variable);
    if (t) t.type = type;
  });
}

export function setGradientAngle(variable: string, angle: number): void {
  mutate(`set gradient angle ${variable}`, (s) => {
    const t = findGradient(s, variable);
    if (t) t.angle = angle;
  });
}

export function setGradientStop(variable: string, index: number, stop: Partial<GradientTokenStop>): void {
  mutate(`set gradient stop ${variable}[${index}]`, (s) => {
    const t = findGradient(s, variable);
    if (!t || !t.stops[index]) return;
    if (stop.position !== undefined) t.stops[index].position = stop.position;
    if (stop.color !== undefined) t.stops[index].color = stop.color;
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
