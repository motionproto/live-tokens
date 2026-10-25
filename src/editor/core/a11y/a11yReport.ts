import { derived, writable, type Readable } from 'svelte/store';
import { API_BASE } from '../storage/apiBase';
import { openThemeSlug } from '../store/editorConfigStore';
import type {
  A11yContrastFailure,
  A11yFailedReport,
  A11yFinding,
  A11yFinishedReport,
  A11yReport,
  A11yReportState,
  A11yRunningReport,
} from './a11yReportTypes';

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
  /** Contrast failures of the run that pass as the editor now measures them. They count as no issue. */
  fixed: A11yFixedContrast[];
}

export interface A11yFixedContrast {
  failure: A11yContrastFailure;
  /** The ratio the editor measures now. */
  ratio: number;
}

/** Engine rules whose failure a property's value fixes. */
export const PROPERTY_FIX_RULES: ReadonlySet<string> = new Set(['focus-indicator-contrast', 'control-boundary-contrast']);

const running = writable<A11yRunningReport | null>(null);
const failed = writable<A11yFailedReport | null>(null);
const reports = writable<Record<string, A11yFinishedReport>>({});
const fixedRatios = writable<ReadonlyMap<A11yContrastFailure, number>>(new Map());
let heard = false;

/** The dev server's latest word for the open theme: a run going (for any theme, since one runs at a time), a failed run, or the theme's last finished report. */
export const a11yReport: Readable<A11yReport | null> = derived(
  [running, failed, reports, openThemeSlug],
  ([$running, $failed, $reports, $open]) => $running ?? ($failed?.theme === $open ? $failed : null) ?? $reports[$open] ?? null,
);

/** The open theme's last finished run, which the markers follow while a new run goes (decision 7). */
export const a11yFinishedReport: Readable<A11yFinishedReport | null> = derived(
  [reports, openThemeSlug],
  ([$reports, $open]) => $reports[$open] ?? null,
);

/** Sets the run's contrast failures that pass now, with the ratio each measures. `contrastFixes` measures them. */
export function setFixedContrast(ratios: ReadonlyMap<A11yContrastFailure, number>): void {
  fixedRatios.set(ratios);
}

export const a11yIssues: Readable<Record<string, ComponentA11yIssues>> = derived([a11yFinishedReport, fixedRatios], ([$report, $fixed]) => {
  const out: Record<string, ComponentA11yIssues> = {};
  if (!$report) return out;
  const entry = (id: string) => (out[id] ??= { contrast: [], property: [], code: [], review: [], fixed: [] });
  for (const failure of $report.contrast) {
    const ratio = $fixed.get(failure);
    if (ratio === undefined) entry(failure.component).contrast.push(failure);
    else entry(failure.component).fixed.push({ failure, ratio });
  }
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

/** The run's findings under each component property they trace to (decision 7). The editor's contrast failures stay out. */
export const a11yPropertyFindings: Readable<Map<string, A11yFinding[]>> = derived(a11yFinishedReport, ($report) => {
  const out = new Map<string, A11yFinding[]>();
  for (const finding of $report?.findings ?? []) {
    if (!finding.component || !finding.rule.startsWith('a11y-')) continue;
    for (const variable of finding.details?.variables ?? []) {
      const list = out.get(variable);
      if (list) list.push(finding);
      else out.set(variable, [finding]);
    }
  }
  return out;
});

export function receiveA11yReport(report: A11yReport): void {
  heard = true;
  if (report.state === 'running') {
    running.set(report);
    failed.set(null);
    return;
  }
  running.set(null);
  if (report.state === 'failed') failed.set(report);
  else reports.update(($reports) => ({ ...$reports, [report.theme]: report }));
}

export async function init(): Promise<void> {
  const res = await fetch(`${API_BASE}/a11y/report`);
  if (!res.ok) return;
  const state = (await res.json()) as A11yReportState;
  // An event that landed while the read was in flight is the newer word.
  reports.update(($reports) => ({ ...state.reports, ...$reports }));
  if (!heard) running.set(state.running);
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
  running.set(null);
  failed.set(null);
  reports.set({});
  fixedRatios.set(new Map());
}
