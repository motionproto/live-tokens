import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import fs from 'fs';
import os from 'os';
import path from 'path';
import {
  A11Y_REPORT_PATH,
  A11Y_RUN_ARGS,
  a11yRunServer,
  spawnCli,
  type CliOutcome,
  type RunCli,
} from './a11yRunServer';
import type { A11yContrastFailure, A11yReport } from '../../src/editor/core/a11y/a11yReportTypes';

const CLI_PATH = path.join(process.cwd(), 'bin/cli.mjs');

const CONTRAST: A11yContrastFailure = {
  component: 'badge',
  variable: '--badge-brand-text',
  backdrop: ['--badge-brand-surface'],
  role: 'text',
  ratio: 3.87,
  floor: 4.5,
};

const axe = (rule: string, engineRule: string, component = 'badge') => ({
  rule,
  file: 'src/system/components/Badge.svelte',
  line: 1,
  message: `${component}: ${engineRule} at .badge: help. https://example.com`,
  component,
  details: { engineRule, impact: 'serious', target: '.badge', html: '<span></span>', help: 'help', helpUrl: 'https://example.com' },
  severity: 'warn',
  repair: 'authored',
});

let root: string;

beforeEach(() => {
  root = fs.mkdtempSync(path.join(os.tmpdir(), 'lt-a11y-run-'));
});

afterEach(() => {
  fs.rmSync(root, { recursive: true, force: true });
});

function stubCli() {
  const calls: { args: string[]; cwd: string }[] = [];
  let finish!: (outcome: CliOutcome) => void;
  const stop = vi.fn();
  const runCli: RunCli = (args, cwd) => {
    calls.push({ args, cwd });
    return { done: new Promise<CliOutcome>((resolve) => (finish = resolve)), stop };
  };
  return { runCli, calls, stop, finish: (outcome: CliOutcome) => finish(outcome) };
}

function serverWith(runCli: RunCli) {
  const frames: A11yReport[] = [];
  const server = a11yRunServer({ root, runCli, broadcast: (report) => frames.push(report) });
  const settled = () => vi.waitFor(() => expect(frames.at(-1)?.state).not.toBe('running'), { timeout: 10_000 });
  return { server, frames, settled };
}

const cliJson = (findings: unknown[], theme = 'royal-velvet') =>
  JSON.stringify({ check: 'check-component --tests --a11y', checked: 29, errors: 0, warnings: findings.length, theme, findings, coverage: {} });

describe('a11yRunServer', () => {
  it('runs the CLI with the editor command line from the project root', () => {
    const cli = stubCli();
    serverWith(cli.runCli).server.start({ contrast: [] });
    expect(cli.calls).toEqual([{ args: A11Y_RUN_ARGS, cwd: root }]);
    expect(A11Y_RUN_ARGS).toEqual(['check-component', '--tests', '--a11y', '--no-fix', '--json', '--open-theme']);
  });

  it('answers 409 while a run is going, and starts again once it settles', async () => {
    const cli = stubCli();
    const { server, settled } = serverWith(cli.runCli);
    expect(server.start({ contrast: [] }).status).toBe(202);
    expect(server.start({ contrast: [] })).toEqual({
      status: 409,
      body: { error: 'An accessibility run is already going.', code: 'A11Y_RUN_IN_PROGRESS' },
    });
    expect(cli.calls).toHaveLength(1);
    cli.finish({ code: 0, stdout: cliJson([]), stderr: '' });
    await settled();
    expect(server.start({ contrast: [] }).status).toBe(202);
  });

  it('reports running with its start time and contrast while the run goes', () => {
    const cli = stubCli();
    const { server, frames } = serverWith(cli.runCli);
    const answer = server.start({ contrast: [CONTRAST] });
    const running = { state: 'running', startedAt: expect.any(String), contrast: [CONTRAST] };
    expect(answer.body).toEqual(running);
    expect(server.report()).toEqual({ status: 200, body: { report: running } });
    expect(frames).toEqual([running]);
  });

  it('answers an empty report before any run', () => {
    expect(serverWith(stubCli().runCli).server.report()).toEqual({ status: 200, body: { report: null } });
  });

  it('refuses a body without a well-formed contrast list', () => {
    const cli = stubCli();
    const { server } = serverWith(cli.runCli);
    for (const body of [undefined, {}, { contrast: {} }, { contrast: [{ ...CONTRAST, role: 'icon' }] }, { contrast: [{ ...CONTRAST, ratio: '3.87' }] }]) {
      expect(server.start(body).status).toBe(400);
    }
    expect(cli.calls).toHaveLength(0);
  });

  it("drops axe's color-contrast findings from both rules and keeps the rest", async () => {
    const cli = stubCli();
    const { server, frames, settled } = serverWith(cli.runCli);
    server.start({ contrast: [CONTRAST] });
    const kept = [axe('a11y-component', 'aria-allowed-role'), axe('a11y-review', 'video-caption', 'video')];
    cli.finish({
      code: 0,
      stdout: cliJson([axe('a11y-component', 'color-contrast'), axe('a11y-review', 'color-contrast'), ...kept]),
      stderr: '',
    });
    await settled();
    expect(frames.at(-1)).toEqual({
      state: 'finished',
      startedAt: expect.any(String),
      finishedAt: expect.any(String),
      theme: 'royal-velvet',
      contrast: [CONTRAST],
      findings: kept,
    });
  });

  it('keeps the settled report in the file, so a new server reads it back', async () => {
    const cli = stubCli();
    const { server, frames, settled } = serverWith(cli.runCli);
    server.start({ contrast: [CONTRAST] });
    cli.finish({ code: 0, stdout: cliJson([axe('a11y-component', 'aria-allowed-role')]), stderr: '' });
    await settled();
    const file = path.join(root, A11Y_REPORT_PATH);
    expect(JSON.parse(fs.readFileSync(file, 'utf-8'))).toEqual(frames.at(-1));
    expect(serverWith(stubCli().runCli).server.report().body).toEqual({ report: frames.at(-1) });
  });

  it('fails a run whose output is no report, and keeps the tail of its stderr', async () => {
    const cli = stubCli();
    const { server, frames, settled } = serverWith(cli.runCli);
    server.start({ contrast: [] });
    cli.finish({ code: 1, stdout: '{"check": "check-comp', stderr: 'TypeError: boom\n' });
    await settled();
    expect(frames.at(-1)).toEqual({
      state: 'failed',
      startedAt: expect.any(String),
      finishedAt: expect.any(String),
      contrast: [],
      error: 'check-component exited with code 1 and printed no report.\nTypeError: boom',
    });
  });

  it('stops the running CLI', () => {
    const cli = stubCli();
    const { server } = serverWith(cli.runCli);
    server.stop();
    server.start({ contrast: [] });
    server.stop();
    expect(cli.stop).toHaveBeenCalledTimes(1);
  });

  it('finishes with the install commands when the project lacks the test tools', async () => {
    const { server, frames, settled } = serverWith(spawnCli(CLI_PATH));
    server.start({ contrast: [] });
    await settled();
    const report = frames.at(-1)!;
    expect(report.state).toBe('finished');
    if (report.state !== 'finished') return;
    expect(report.theme).toBeUndefined();
    expect(report.findings.map((f) => f.rule)).toEqual(['tests-not-installed', 'tests-not-installed', 'tests-not-installed']);
    expect(report.findings[0].message).toContain('npm install -D @playwright/test');
  });
});
