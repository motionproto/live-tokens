import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import type {
  A11yContrastFailure,
  A11yFinding,
  A11yReport,
  A11yRunningReport,
} from '../../src/editor/core/a11y/a11yReportTypes';

export const A11Y_RUN_ARGS = ['check-component', '--tests', '--a11y', '--no-fix', '--json', '--open-theme'];
export const A11Y_REPORT_PATH = path.join('test-results', 'live-tokens', 'a11y-report.json');

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

function parseCliReport(stdout: string): { theme?: string; findings: A11yFinding[] } | null {
  try {
    const parsed = JSON.parse(stdout);
    return parsed && Array.isArray(parsed.findings) ? parsed : null;
  } catch {
    return null;
  }
}

/**
 * One accessibility run at a time (decision 5 of docs/plans/a11y-editor.md).
 * A run lives in memory while it goes; the file holds the last settled report,
 * so a dev-server restart never reads back a run nobody is still waiting on.
 */
export function a11yRunServer({ root, reportFile, runCli, broadcast }: {
  root: string;
  reportFile: string;
  runCli: RunCli;
  broadcast: (report: A11yReport) => void;
}) {
  let running: { report: A11yRunningReport; stop(): void } | null = null;

  function current(): A11yReport | null {
    if (running) return running.report;
    if (!fs.existsSync(reportFile)) return null;
    return JSON.parse(fs.readFileSync(reportFile, 'utf-8')) as A11yReport;
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
      ...(cli.theme ? { theme: cli.theme } : {}),
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
    const report: A11yRunningReport = { state: 'running', startedAt: new Date().toISOString(), contrast };
    const run = runCli(A11Y_RUN_ARGS, root);
    running = { report, stop: run.stop };
    broadcast(report);
    void run.done.then((outcome) => {
      const settled = settle(report, outcome);
      fs.mkdirSync(path.dirname(reportFile), { recursive: true });
      fs.writeFileSync(reportFile, `${JSON.stringify(settled, null, 2)}\n`);
      running = null;
      broadcast(settled);
    });
    return { status: 202, body: report };
  }

  return {
    start,
    report: (): A11yAnswer => ({ status: 200, body: { report: current() } }),
    stop: () => running?.stop(),
  };
}
