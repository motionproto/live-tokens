import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { get } from 'svelte/store';
import { API_BASE } from '../storage/apiBase';
import { openThemeSlug } from '../store/editorConfigStore';
import {
  __resetForTests,
  a11yFinishedReport,
  a11yIssues,
  a11yPropertyFindings,
  a11yReport,
  confirmReview,
  init,
  receiveA11yReport,
  setFixedContrast,
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

const RUNNING: A11yReport = { state: 'running', startedAt: '2026-10-23T14:00:00.000Z', theme: 'royal-velvet', contrast: [CONTRAST] };
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

beforeEach(() => {
  openThemeSlug.set('royal-velvet');
});

afterEach(() => {
  __resetForTests();
  openThemeSlug.set('default');
  vi.unstubAllGlobals();
});

describe('a11yIssues', () => {
  it('keys the last finished run by component and sorts each finding by its fix', () => {
    receiveA11yReport(FINISHED);
    expect(get(a11yIssues)).toEqual({
      badge: { contrast: [CONTRAST], property: [], code: [FINDING_AT(1)], review: [FINDING_AT(2)], confirmed: [], fixed: [] },
      input: { contrast: [], property: [FINDING_AT(6)], code: [], review: [FINDING_AT(7)], confirmed: [], fixed: [] },
      'radio-button': { contrast: [], property: [], code: [FINDING_AT(0)], review: [], confirmed: [], fixed: [] },
      video: { contrast: [], property: [], code: [], review: [FINDING_AT(3)], confirmed: [], fixed: [] },
    });
  });

  it('moves a result to check by eye that someone marked to the confirmed list', () => {
    receiveA11yReport({ ...FINISHED, confirmed: [FINDING_AT(3).message] });
    expect(get(a11yIssues).video).toMatchObject({ review: [], confirmed: [FINDING_AT(3)] });
    expect(get(a11yIssues).badge).toMatchObject({ review: [FINDING_AT(2)], confirmed: [] });
  });

  it('moves a contrast failure that passes now to the fixed list, with the ratio it measures', () => {
    receiveA11yReport(FINISHED);
    setFixedContrast(new Map([[CONTRAST, 5.38]]));
    expect(get(a11yIssues).badge).toMatchObject({ contrast: [], fixed: [{ failure: CONTRAST, ratio: 5.38 }] });
  });

  it('keeps the last finished run while a new one goes and when one fails', () => {
    receiveA11yReport(FINISHED);
    receiveA11yReport(RUNNING);
    expect(get(a11yReport)).toEqual(RUNNING);
    expect(get(a11yFinishedReport)).toEqual(FINISHED);
    receiveA11yReport({ ...RUNNING, state: 'failed', finishedAt: '2026-10-23T14:01:00.000Z', error: 'boom' });
    expect(Object.keys(get(a11yIssues))).toEqual(['badge', 'radio-button', 'video', 'input']);
  });

  it("follows the open theme's own report", () => {
    receiveA11yReport(FINISHED);
    openThemeSlug.set('ocean');
    expect(get(a11yFinishedReport)).toBeNull();
    expect(get(a11yIssues)).toEqual({});
    openThemeSlug.set('royal-velvet');
    expect(get(a11yFinishedReport)).toEqual(FINISHED);
  });

  it("keeps each theme's last finished run apart", () => {
    const ocean = { ...FINISHED, theme: 'ocean', findings: [] };
    receiveA11yReport(FINISHED);
    receiveA11yReport(ocean);
    expect(get(a11yFinishedReport)).toEqual(FINISHED);
    openThemeSlug.set('ocean');
    expect(get(a11yFinishedReport)).toEqual(ocean);
  });

  it("shows a failed run only under the theme it tested", () => {
    receiveA11yReport(FINISHED);
    const failure = { ...RUNNING, state: 'failed' as const, finishedAt: '2026-10-23T14:01:00.000Z', error: 'boom' };
    receiveA11yReport(failure);
    expect(get(a11yReport)).toEqual(failure);
    openThemeSlug.set('ocean');
    expect(get(a11yReport)).toBeNull();
  });

  it('is empty before any run finishes', () => {
    receiveA11yReport(RUNNING);
    expect(get(a11yIssues)).toEqual({});
  });
});

describe('init', () => {
  it("reads each theme's last report from the dev server", async () => {
    const fetch = respond(200, { running: null, reports: { 'royal-velvet': FINISHED } });
    await init();
    expect(fetch).toHaveBeenCalledWith(`${API_BASE}/a11y/report`);
    expect(get(a11yReport)).toEqual(FINISHED);
  });

  it('takes a run that is going', async () => {
    respond(200, { running: RUNNING, reports: {} });
    await init();
    expect(get(a11yReport)).toEqual(RUNNING);
  });

  it('leaves the store empty when no run has settled', async () => {
    respond(200, { running: null, reports: {} });
    await init();
    expect(get(a11yReport)).toBeNull();
  });

  it('yields to an event that arrived while the read was in flight', async () => {
    respond(200, { running: null, reports: { 'royal-velvet': FINISHED } });
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

describe('confirmReview', () => {
  it("puts the marked messages under the open theme's report and takes the answer", async () => {
    receiveA11yReport(FINISHED);
    const marked = { ...FINISHED, confirmed: [FINDING_AT(3).message] };
    const fetch = respond(200, marked);
    await confirmReview([FINDING_AT(3)], true);
    expect(fetch).toHaveBeenCalledWith(`${API_BASE}/a11y/confirmed`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ theme: 'royal-velvet', messages: [FINDING_AT(3).message], confirmed: true }),
    });
    expect(get(a11yFinishedReport)).toEqual(marked);
  });

  it("throws the server's refusal and keeps the report", async () => {
    receiveA11yReport(FINISHED);
    respond(404, { error: 'No report for theme "royal-velvet"' });
    await expect(confirmReview([FINDING_AT(3)], true)).rejects.toThrow('No report for theme "royal-velvet"');
    expect(get(a11yFinishedReport)).toEqual(FINISHED);
  });
});

describe('a11yPropertyFindings', () => {
  it('leaves out a result marked as looking right', () => {
    const traced = (message: string): A11yFinding => ({
      ...finding('a11y-review', 'input', 'focus-indicator-contrast'),
      message,
      details: { engineRule: 'focus-indicator-contrast', target: '.part', html: '', help: 'case', helpUrl: 'https://example.test/', variables: ['--input-focused-border'] },
    });
    receiveA11yReport({ ...FINISHED, findings: [traced('one'), traced('two')], confirmed: ['one'] });
    expect(get(a11yPropertyFindings).get('--input-focused-border')?.map((f) => f.message)).toEqual(['two']);
  });
});
