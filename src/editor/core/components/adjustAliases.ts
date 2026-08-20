import { matchesKind, stripSide } from './aliasKinds';
import type { AliasDiskValue, ComponentConfig } from '../themes/themeTypes';

export type AdjustKind = 'radius' | 'padding' | 'gap' | 'border-width';

export interface AdjustOp {
  /** Component id; omitted applies the op to every config. */
  target?: string;
  kind: AdjustKind;
  set?: string;
  shift?: number;
  /** Radius shifts only: admits `--radius-full` as the ladder's top rung. */
  full?: boolean;
}

export type SkipReason = 'raw-value' | 'off-ladder' | 'clamped' | 'pill-preserved';

export interface AliasChange {
  variable: string;
  from: string;
  to: string;
}

export interface AliasSkip {
  variable: string;
  value: AliasDiskValue;
  reason: SkipReason;
}

export interface ComponentReport {
  component: string;
  changes: AliasChange[];
  skips: AliasSkip[];
}

export interface AdjustReport {
  components: ComponentReport[];
}

export interface AdjustResult {
  configs: Record<string, ComponentConfig>;
  report: AdjustReport;
}

const RADIUS_FULL = '--radius-full';

const RADIUS_RUNGS = [
  '--radius-none', '--radius-sm', '--radius-md', '--radius-lg', '--radius-xl',
  '--radius-2xl', '--radius-3xl', '--radius-4xl',
];

/** The editor picker's 12-step subset (`UIPaddingSelector`), not the full
    `--space-*` scale: every value this engine writes must stay re-editable
    by hand in the picker. */
const SPACE_SETTABLE = [
  '--space-0', '--space-2', '--space-4', '--space-6', '--space-8', '--space-10',
  '--space-12', '--space-16', '--space-20', '--space-24', '--space-32', '--space-48',
];

const SPACE_RUNGS = SPACE_SETTABLE;

/** Content insets stop at `--space-4`. Below it the text sits against its own
    edge, which is a deliberate choice rather than somewhere a relative
    "tighter" should deposit you. Outer space is exempt: a 2px gap between an
    icon and its label, or a 2px margin under a bar, is ordinary design. Both
    rungs stay pickable by hand and settable by name. */
const INSET_RUNGS = SPACE_SETTABLE.slice(SPACE_SETTABLE.indexOf('--space-4'));

/** Padding that wraps a line of type stops a rung higher. Those components
    double it horizontally (`themed-padding($h: 2)`), so `--space-4` is 4px
    over an 18px line and 8px inside a pill's own corner: squeezed rather than
    compact. No shipped default puts text below `--space-6`. */
const TEXT_INSET_RUNGS = SPACE_SETTABLE.slice(SPACE_SETTABLE.indexOf('--space-6'));

const SPACE_FAMILY = [...SPACE_SETTABLE, '--space-40', '--space-64', '--space-96', '--space-128'];

const BORDER_WIDTH_RUNGS = [
  '--border-width-0', '--border-width-1', '--border-width-2', '--border-width-3',
  '--border-width-4', '--border-width-5', '--border-width-6', '--border-width-8',
  '--border-width-10', '--border-width-12', '--border-width-16', '--border-width-20',
  '--border-width-24',
];

const LADDERS: Record<AdjustKind, { rungs: string[]; settable: string[]; family: string[] }> = {
  radius: {
    rungs: RADIUS_RUNGS,
    settable: [...RADIUS_RUNGS, RADIUS_FULL],
    family: [...RADIUS_RUNGS, RADIUS_FULL],
  },
  padding: { rungs: SPACE_RUNGS, settable: SPACE_SETTABLE, family: SPACE_FAMILY },
  gap: { rungs: SPACE_RUNGS, settable: SPACE_SETTABLE, family: SPACE_FAMILY },
  'border-width': {
    rungs: BORDER_WIDTH_RUNGS,
    settable: BORDER_WIDTH_RUNGS,
    family: BORDER_WIDTH_RUNGS,
  },
};

const TOKEN_NAME = /^--[a-z0-9-]+$/;

type Outcome = { from: string; to: string } | { skip: SkipReason };

/** `-margin` shares the padding kind, so the inset floor keys off the variable
    rather than the kind. Which floor depends on what the padding surrounds,
    and the config says so itself: a variant that also declares a
    `-text-font-size` is holding type. */
function rungsFor(op: AdjustOp, variable: string, aliases: ComponentConfig['aliases']): string[] {
  if (op.kind === 'radius') return op.full ? [...RADIUS_RUNGS, RADIUS_FULL] : RADIUS_RUNGS;
  if (op.kind !== 'padding') return LADDERS[op.kind].rungs;
  const base = stripSide(variable);
  if (!base.endsWith('-padding')) return LADDERS.padding.rungs;
  const variant = base.slice(0, -'-padding'.length);
  return `${variant}-text-font-size` in aliases ? TEXT_INSET_RUNGS : INSET_RUNGS;
}

function spaceStep(token: string): number {
  return Number(token.slice('--space-'.length));
}

/** An off-rung value has no step to count from, so landing on the first rung
    the shift points at is itself that shift's opening step. Snapping to the
    nearest rung instead would spend two visible steps on a one-step request.
    Returns -1 when the ladder holds nothing in that direction. */
function snapRung(token: string, rungs: string[], direction: number): number {
  const step = spaceStep(token);
  if (direction > 0) return rungs.findIndex((rung) => spaceStep(rung) > step);
  for (let index = rungs.length - 1; index >= 0; index--) {
    if (spaceStep(rungs[index]) < step) return index;
  }
  return -1;
}

function resolve(
  op: AdjustOp,
  variable: string,
  value: AliasDiskValue,
  aliases: ComponentConfig['aliases'],
): Outcome {
  if (typeof value !== 'string' || !TOKEN_NAME.test(value)) return { skip: 'raw-value' };
  if (!LADDERS[op.kind].family.includes(value)) return { skip: 'off-ladder' };
  if (op.set !== undefined) return { from: value, to: op.set };

  const rungs = rungsFor(op, variable, aliases);
  let index = rungs.indexOf(value);
  let shift = op.shift!;
  if (index < 0) {
    if (value === RADIUS_FULL) return { skip: 'pill-preserved' };
    index = snapRung(value, rungs, shift);
    if (index < 0) return { skip: 'clamped' };
    shift -= Math.sign(shift);
  }

  const wanted = index + shift;
  const landed = Math.min(Math.max(wanted, 0), rungs.length - 1);
  if (landed !== wanted && rungs[landed] === value) return { skip: 'clamped' };
  return { from: value, to: rungs[landed] };
}

function validateOp(op: AdjustOp, configs: Record<string, ComponentConfig>): void {
  const ladder = LADDERS[op.kind];
  if (!ladder) throw new Error(`Unknown kind "${op.kind}" (expected ${Object.keys(LADDERS).join(', ')})`);
  if (op.target !== undefined && !(op.target in configs)) {
    throw new Error(`Unknown target component "${op.target}"`);
  }

  const hasSet = op.set !== undefined;
  const hasShift = op.shift !== undefined;
  if (hasSet === hasShift) throw new Error(`A ${op.kind} op needs exactly one of "set" or "shift"`);
  const settable = ladder.settable;
  if (hasSet && !settable.includes(op.set!)) {
    throw new Error(`"${op.set}" is not on the ${op.kind} ladder`);
  }
  if (hasShift && !Number.isInteger(op.shift)) {
    throw new Error(`"shift" must be a whole number of steps, got ${op.shift}`);
  }
  if (op.full !== undefined && !(op.kind === 'radius' && hasShift)) {
    throw new Error('"full" applies to radius shifts only');
  }
}

export function adjustAliases(
  configs: Record<string, ComponentConfig>,
  ops: readonly AdjustOp[],
  now: string,
): AdjustResult {
  for (const op of ops) validateOp(op, configs);

  const next = { ...configs };
  const reports = new Map<string, ComponentReport>();
  const reportFor = (component: string): ComponentReport => {
    let report = reports.get(component);
    if (!report) {
      report = { component, changes: [], skips: [] };
      reports.set(component, report);
    }
    return report;
  };

  for (const op of ops) {
    for (const component of op.target ? [op.target] : Object.keys(next)) {
      const config = next[component];
      const aliases = { ...config.aliases };
      let changed = false;

      for (const [variable, value] of Object.entries(config.aliases)) {
        if (!matchesKind(variable, op.kind)) continue;
        const outcome = resolve(op, variable, value, config.aliases);
        if ('skip' in outcome) {
          reportFor(component).skips.push({ variable, value, reason: outcome.skip });
          continue;
        }
        if (outcome.to === outcome.from) continue;
        aliases[variable] = outcome.to;
        reportFor(component).changes.push({ variable, from: outcome.from, to: outcome.to });
        changed = true;
      }

      if (changed) next[component] = { ...config, aliases, updatedAt: now };
    }
  }

  return { configs: next, report: { components: [...reports.values()] } };
}
