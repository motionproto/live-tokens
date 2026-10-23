import type { ContrastRole } from '../palettes/contrast';

/** The SSE event the dev server sends on a run's start and on its end. */
export const A11Y_EVENT = 'a11y';

/** One failing pair the editor's contrast checker measured when the run started (decision 4). */
export interface A11yContrastFailure {
  component: string;
  /** The foreground property, the row a fix changes. */
  variable: string;
  /** Component layers behind the foreground, top first, as the pair declares them. */
  backdrop: string[];
  role: ContrastRole;
  ratio: number;
  floor: number;
  context?: string;
}

/** A finding as `check-component --tests --a11y --json` prints it. */
export interface A11yFinding {
  rule: string;
  file: string;
  line: number;
  message: string;
  /** Absent on a run-level finding such as `tests-not-installed`. */
  component?: string;
  details?: {
    engineRule: string;
    impact?: string | null;
    target: string;
    view?: string;
    html: string;
    help: string;
    helpUrl: string;
  };
  context?: Record<string, unknown>;
  severity: 'error' | 'warn';
  guidance?: string;
  repair: string;
}

interface A11yReportBase {
  startedAt: string;
  contrast: A11yContrastFailure[];
}

export interface A11yRunningReport extends A11yReportBase {
  state: 'running';
}

/** Holds every CLI finding except axe's `color-contrast`, which `contrast` covers. */
export interface A11yFinishedReport extends A11yReportBase {
  state: 'finished';
  finishedAt: string;
  /** Absent when the run stopped before it copied the data tree, as a missing tool stops it. */
  theme?: string;
  findings: A11yFinding[];
}

/** The CLI crashed or printed no report. */
export interface A11yFailedReport extends A11yReportBase {
  state: 'failed';
  finishedAt: string;
  error: string;
}

export type A11yReport = A11yRunningReport | A11yFinishedReport | A11yFailedReport;
