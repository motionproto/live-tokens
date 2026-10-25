import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import type {
  A11yContrastFailure,
  A11yFinding,
  A11yFinishedReport,
  A11yReport,
  A11yRunningReport,
} from '../../src/editor/core/a11y/a11yReportTypes';

export const A11Y_RUN_ARGS = ['check-component', '--tests', '--a11y', '--no-fix', '--json', '--open-theme'];
/** Holds one report per theme. It sits in the data directory beside the other editor state, out of reach of test tools that clear their output folders. */
export const A11Y_REPORTS_DIR_NAME = '_a11y-reports';

const STDERR_TAIL = 2000;
const CONTRAST_ROLES = new Set(['text', 'non-text']);

export interface CliOutcome {
  code: number | null;
  stdout: string;
  stderr: string;
}

export interface CliRun {
  done: Promise<CliOutcome>;
  stop(): void;
}

export type RunCli = (args: string[], cwd: string) => CliRun;

export function spawnCli(cliPath: string): RunCli {
  return (args, cwd) => {
    const child = spawn(process.execPath, [cliPath, ...args], { cwd, stdio: ['ignore', 'pipe', 'pipe'] });
    const done = new Promise<CliOutcome>((resolve) => {
      let stdout = '';
      let stderr = '';
      child.stdout.on('data', (chunk: Buffer) => (stdout += chunk));
      child.stderr.on('data', (chunk: Buffer) => (stderr += chunk));
      child.on('error', (error) => resolve({ code: null, stdout, stderr: `${stderr}${error.message}` }));
      child.on('close', (code) => resolve({ code, stdout, stderr }));
    });
    // The runner stops Playwright and removes its temp copy on SIGINT alone.
    return { done, stop: () => child.kill('SIGINT') };
  };
}

export interface A11yAnswer {
  status: number;
  body: unknown;
}

function isContrastFailure(value: unknown): value is A11yContrastFailure {
  const v = value as Record<string, unknown>;
  return (
    !!v &&
    typeof v === 'object' &&
    typeof v.component === 'string' &&
    typeof v.variable === 'string' &&
    v.variable.startsWith('--') &&
    Array.isArray(v.backdrop) &&
    v.backdrop.every((layer) => typeof layer === 'string') &&
    typeof v.role === 'string' &&
    CONTRAST_ROLES.has(v.role) &&
    typeof v.ratio === 'number' &&
    typeof v.floor === 'number' &&
    (v.context === undefined || typeof v.context === 'string')
  );
}

function readContrast(body: unknown): A11yContrastFailure[] | null {
  const contrast = (body as { contrast?: unknown } | null)?.contrast;
  return Array.isArray(contrast) && contrast.every(isContrastFailure) ? contrast : null;
}

function parseCliReport(stdout: string): { findings: A11yFinding[] } | null {
  try {
    const parsed = JSON.parse(stdout);
    return parsed && Array.isArray(parsed.findings) ? parsed : null;
  } catch {
    return null;
  }
}

/**
 * One accessibility run at a time (decision 5 of docs/plans/a11y-editor.md).
 * A run lives in memory while it goes. Each theme's last finished report lives
 * in `reportsDir` under the theme's name, so a dev-server restart never reads
 * back a run nobody is still waiting on. A failed run reaches the open editors
 * and leaves the theme's report as it was.
 */
export function a11yRunServer({ root, reportsDir, openTheme, runCli, broadcast }: {
  root: string;
  reportsDir: string;
  /** The theme the run tests: the CLI's `--open-theme` reads the same pointer. */
  openTheme: () => string;
  runCli: RunCli;
  broadcast: (report: A11yReport) => void;
}) {
  let running: { report: A11yRunningReport; stop(): void } | null = null;

  const reportFile = (theme: string) => path.join(reportsDir, `${theme}.json`);

  function reports(): Record<string, A11yFinishedReport> {
    if (!fs.existsSync(reportsDir)) return {};
    return Object.fromEntries(
      fs.readdirSync(reportsDir)
        .filter((name) => name.endsWith('.json'))
        .map((name) => [name.slice(0, -'.json'.length), JSON.parse(fs.readFileSync(path.join(reportsDir, name), 'utf-8'))]),
    );
  }

  function settle(started: A11yRunningReport, outcome: CliOutcome): A11yReport {
    const finishedAt = new Date().toISOString();
    const cli = parseCliReport(outcome.stdout);
    if (!cli) {
      const stderr = outcome.stderr.trim().slice(-STDERR_TAIL);
      return {
        ...started,
        state: 'failed',
        finishedAt,
        error: `check-component exited with code ${outcome.code} and printed no report.${stderr ? `\n${stderr}` : ''}`,
      };
    }
    return {
      ...started,
      state: 'finished',
      finishedAt,
      findings: cli.findings.filter((f) => f.details?.engineRule !== 'color-contrast'),
    };
  }

  function start(body: unknown): A11yAnswer {
    if (running) {
      return { status: 409, body: { error: 'An accessibility run is already going.', code: 'A11Y_RUN_IN_PROGRESS' } };
    }
    const contrast = readContrast(body);
    if (!contrast) {
      return {
        status: 400,
        body: { error: 'Body must be { contrast: [...] } with one entry per failing pair', code: 'INVALID_BODY' },
      };
    }
    const report: A11yRunningReport = { state: 'running', startedAt: new Date().toISOString(), theme: openTheme(), contrast };
    const run = runCli(A11Y_RUN_ARGS, root);
    running = { report, stop: run.stop };
    broadcast(report);
    void run.done.then((outcome) => {
      const settled = settle(report, outcome);
      if (settled.state === 'finished') {
        fs.mkdirSync(reportsDir, { recursive: true });
        fs.writeFileSync(reportFile(settled.theme), `${JSON.stringify(settled, null, 2)}\n`);
      }
      running = null;
      broadcast(settled);
    });
    return { status: 202, body: report };
  }

  return {
    start,
    report: (): A11yAnswer => ({ status: 200, body: { running: running?.report ?? null, reports: reports() } }),
    /** Removes a deleted theme's report. */
    forget: (theme: string) => fs.rmSync(reportFile(theme), { force: true }),
    stop: () => running?.stop(),
  };
}
