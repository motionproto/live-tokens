import { afterEach, describe, expect, it, vi } from 'vitest';
import { get } from 'svelte/store';
import { API_BASE } from '../storage/apiBase';
import {
  __resetForTests,
  a11yFinishedReport,
  a11yIssues,
  a11yReport,
  init,
  receiveA11yReport,
  startA11yRun,
} from './a11yReport';
import type { A11yContrastFailure, A11yFinding, A11yFinishedReport, A11yReport } from './a11yReportTypes';

const CONTRAST: A11yContrastFailure = {
  component: 'badge',
  variable: '--badge-brand-text',
  backdrop: ['--badge-brand-surface'],
  role: 'text',
  ratio: 3.87,
  floor: 4.5,
};

const finding = (rule: string, component?: string, engineRule?: string): A11yFinding => ({
  rule,
  file: 'src/system/components/Badge.svelte',
  line: 1,
  message: `${component ? `${component}: ` : ''}case`,
  ...(component ? { component } : {}),
  ...(engineRule ? { details: { engineRule, target: '.part', html: '<div></div>', help: 'case', helpUrl: 'https://example.test/' } } : {}),
  severity: rule.startsWith('tests-') ? 'error' : 'warn',
  repair: 'authored',
});

const RUNNING: A11yReport = { state: 'running', startedAt: '2026-10-23T14:00:00.000Z', contrast: [CONTRAST] };
const FINISHED: A11yFinishedReport = {
  state: 'finished',
  startedAt: '2026-10-23T14:00:00.000Z',
  finishedAt: '2026-10-23T14:03:20.000Z',
  theme: 'royal-velvet',
  contrast: [CONTRAST],
  findings: [
    finding('a11y-keyboard', 'radio-button'),
    finding('a11y-component', 'badge'),
    finding('a11y-review', 'badge'),
    finding('a11y-review', 'video'),
    finding('tests-incomplete', 'table'),
    finding('tests-setup'),
    finding('a11y-component', 'input', 'focus-indicator-contrast'),
    finding('a11y-review', 'input', 'focus-indicator-contrast'),
  ],
};

const FINDING_AT = (index: number) => FINISHED.findings[index];

function respond(status: number, body: unknown) {
  const fetch = vi.fn(async () => ({ ok: status < 300, status, json: async () => body }));
  vi.stubGlobal('fetch', fetch);
  return fetch;
}

afterEach(() => {
  __resetForTests();
  vi.unstubAllGlobals();
});

describe('a11yIssues', () => {
  it('keys the last finished run by component and sorts each finding by its fix', () => {
    receiveA11yReport(FINISHED);
    expect(get(a11yIssues)).toEqual({
      badge: { contrast: [CONTRAST], property: [], code: [FINDING_AT(1)], review: [FINDING_AT(2)] },
      input: { contrast: [], property: [FINDING_AT(6)], code: [], review: [FINDING_AT(7)] },
      'radio-button': { contrast: [], property: [], code: [FINDING_AT(0)], review: [] },
      video: { contrast: [], property: [], code: [], review: [FINDING_AT(3)] },
    });
  });

  it('keeps the last finished run while a new one goes and when one fails', () => {
    receiveA11yReport(FINISHED);
    receiveA11yReport(RUNNING);
    expect(get(a11yReport)).toEqual(RUNNING);
    expect(get(a11yFinishedReport)).toEqual(FINISHED);
    receiveA11yReport({ ...RUNNING, state: 'failed', finishedAt: '2026-10-23T14:01:00.000Z', error: 'boom' });
    expect(Object.keys(get(a11yIssues))).toEqual(['badge', 'radio-button', 'video', 'input']);
  });

  it('is empty before any run finishes', () => {
    receiveA11yReport(RUNNING);
    expect(get(a11yIssues)).toEqual({});
  });
});

describe('init', () => {
  it('reads the last report from the dev server', async () => {
    const fetch = respond(200, { report: FINISHED });
    await init();
    expect(fetch).toHaveBeenCalledWith(`${API_BASE}/a11y/report`);
    expect(get(a11yReport)).toEqual(FINISHED);
  });

  it('leaves the store empty when no run has settled', async () => {
    respond(200, { report: null });
    await init();
    expect(get(a11yReport)).toBeNull();
  });

  it('yields to an event that arrived while the read was in flight', async () => {
    respond(200, { report: FINISHED });
    const read = init();
    receiveA11yReport(RUNNING);
    await read;
    expect(get(a11yReport)).toEqual(RUNNING);
  });
});

describe('startA11yRun', () => {
  it('posts the contrast failures and takes the running report', async () => {
    const fetch = respond(202, RUNNING);
    await expect(startA11yRun([CONTRAST])).resolves.toEqual(RUNNING);
    expect(fetch).toHaveBeenCalledWith(`${API_BASE}/a11y/run`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ contrast: [CONTRAST] }),
    });
    expect(get(a11yReport)).toEqual(RUNNING);
  });

  it("throws the server's refusal with its status and code", async () => {
    respond(409, { error: 'An accessibility run is already going.', code: 'A11Y_RUN_IN_PROGRESS' });
    await expect(startA11yRun([])).rejects.toMatchObject({
      message: 'An accessibility run is already going.',
      status: 409,
      code: 'A11Y_RUN_IN_PROGRESS',
    });
    expect(get(a11yReport)).toBeNull();
  });
});
