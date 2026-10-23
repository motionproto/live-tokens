import { derived, writable, type Readable } from 'svelte/store';
import { API_BASE } from '../storage/apiBase';
import type { A11yContrastFailure, A11yFinding, A11yFinishedReport, A11yReport } from './a11yReportTypes';

/** One component's share of the last finished run, sorted by its fix (decision 6). */
export interface ComponentA11yIssues {
  /** Fix with a property: the editor's own contrast failures. */
  contrast: A11yContrastFailure[];
  /** Fix with a property: the run's findings whose engine rule measures a property's value. */
  property: A11yFinding[];
  /** Fix in the component's code: every other `a11y-*` finding but `a11y-review`. */
  code: A11yFinding[];
  /** Check by eye. */
  review: A11yFinding[];
}

/** Engine rules whose failure a property's value fixes. */
export const PROPERTY_FIX_RULES: ReadonlySet<string> = new Set(['focus-indicator-contrast', 'control-boundary-contrast']);

const latest = writable<A11yReport | null>(null);
const lastFinished = writable<A11yFinishedReport | null>(null);
let heard = false;

/** The dev server's latest word: a run going, finished or failed. */
export const a11yReport: Readable<A11yReport | null> = { subscribe: latest.subscribe };

/** The last run that finished, which the markers follow while a new run goes (decision 7). */
export const a11yFinishedReport: Readable<A11yFinishedReport | null> = { subscribe: lastFinished.subscribe };

export const a11yIssues: Readable<Record<string, ComponentA11yIssues>> = derived(lastFinished, ($report) => {
  const out: Record<string, ComponentA11yIssues> = {};
  if (!$report) return out;
  const entry = (id: string) => (out[id] ??= { contrast: [], property: [], code: [], review: [] });
  for (const failure of $report.contrast) entry(failure.component).contrast.push(failure);
  for (const finding of $report.findings) {
    if (!finding.component || !finding.rule.startsWith('a11y-')) continue;
    const issues = entry(finding.component);
    const group = finding.rule === 'a11y-review'
      ? issues.review
      : PROPERTY_FIX_RULES.has(finding.details?.engineRule ?? '') ? issues.property : issues.code;
    group.push(finding);
  }
  return out;
});

export function receiveA11yReport(report: A11yReport): void {
  heard = true;
  latest.set(report);
  if (report.state === 'finished') lastFinished.set(report);
}

export async function init(): Promise<void> {
  const res = await fetch(`${API_BASE}/a11y/report`);
  if (!res.ok) return;
  const { report } = (await res.json()) as { report: A11yReport | null };
  // An event that landed while the read was in flight is the newer word.
  if (report && !heard) receiveA11yReport(report);
}

/**
 * Starts a run with the contrast failures the editor measured. Answers 409
 * `A11Y_RUN_IN_PROGRESS` while a run goes, and 409 `LEGACY_LAYOUT` on a tree
 * `live-tokens migrate` has not healed; both arrive as the thrown error's `code`.
 */
export async function startA11yRun(contrast: A11yContrastFailure[]): Promise<A11yReport> {
  const res = await fetch(`${API_BASE}/a11y/run`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ contrast }),
  });
  if (!res.ok) {
    const body = (await res.json().catch(() => ({}))) as { error?: string; code?: string };
    const err = new Error(body.error || 'The accessibility run did not start') as Error & { status?: number; code?: string };
    err.status = res.status;
    if (body.code) err.code = body.code;
    throw err;
  }
  const report = (await res.json()) as A11yReport;
  receiveA11yReport(report);
  return report;
}

export function __resetForTests(): void {
  heard = false;
  latest.set(null);
  lastFinished.set(null);
}
