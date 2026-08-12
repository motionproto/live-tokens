import { matchesKind } from './aliasKinds';
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
const SPACE_RUNGS = [
  '--space-0', '--space-2', '--space-4', '--space-6', '--space-8', '--space-10',
  '--space-12', '--space-16', '--space-20', '--space-24', '--space-32', '--space-48',
];

const SPACE_FAMILY = [...SPACE_RUNGS, '--space-40', '--space-64', '--space-96', '--space-128'];

const BORDER_WIDTH_RUNGS = [
  '--border-width-0', '--border-width-1', '--border-width-2', '--border-width-3',
  '--border-width-4', '--border-width-5', '--border-width-6', '--border-width-8',
  '--border-width-10', '--border-width-12', '--border-width-16', '--border-width-20',
  '--border-width-24',
];

const LADDERS: Record<AdjustKind, { rungs: string[]; family: string[] }> = {
  radius: { rungs: RADIUS_RUNGS, family: [...RADIUS_RUNGS, RADIUS_FULL] },
  padding: { rungs: SPACE_RUNGS, family: SPACE_FAMILY },
  gap: { rungs: SPACE_RUNGS, family: SPACE_FAMILY },
  'border-width': { rungs: BORDER_WIDTH_RUNGS, family: BORDER_WIDTH_RUNGS },
};

const TOKEN_NAME = /^--[a-z0-9-]+$/;

type Outcome = { from: string; to: string } | { skip: SkipReason };

function rungsFor(op: AdjustOp): string[] {
  return op.kind === 'radius' && op.full ? [...RADIUS_RUNGS, RADIUS_FULL] : LADDERS[op.kind].rungs;
}

function spaceStep(token: string): number {
  return Number(token.slice('--space-'.length));
}

/** `<=` sends an exact tie (`--space-40`, midway between 32 and 48) upward. */
function nearestSpaceRung(token: string, rungs: string[]): number {
  const step = spaceStep(token);
  let best = 0;
  for (let i = 1; i < rungs.length; i++) {
    if (Math.abs(spaceStep(rungs[i]) - step) <= Math.abs(spaceStep(rungs[best]) - step)) best = i;
  }
  return best;
}

function resolve(op: AdjustOp, value: AliasDiskValue): Outcome {
  if (typeof value !== 'string' || !TOKEN_NAME.test(value)) return { skip: 'raw-value' };
  if (!LADDERS[op.kind].family.includes(value)) return { skip: 'off-ladder' };
  if (op.set !== undefined) return { from: value, to: op.set };

  const rungs = rungsFor(op);
  let index = rungs.indexOf(value);
  if (index < 0) {
    if (value === RADIUS_FULL) return { skip: 'pill-preserved' };
    index = nearestSpaceRung(value, rungs);
  }

  const wanted = index + op.shift!;
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
  if (hasSet && !ladder.family.includes(op.set!)) {
    throw new Error(`"${op.set}" is not a ${op.kind} token`);
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
        const outcome = resolve(op, value);
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
