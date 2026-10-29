// @vitest-environment happy-dom

import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { flushSync, mount, unmount } from 'svelte';
import { __resetForTests, receiveA11yReport, setFixedContrast } from '../../core/a11y/a11yReport';
import type { A11yFinding, A11yFinishedReport } from '../../core/a11y/a11yReportTypes';
import { get } from 'svelte/store';
import A11yPanel from './A11yPanel.svelte';
import { pendingA11yReveal } from './a11yView';

const finding = (rule: string, component: string, details: Partial<NonNullable<A11yFinding['details']>> = {}): A11yFinding => ({
  rule,
  file: 'src/system/components/Badge.svelte',
  line: 1,
  message: `${component}: case`,
  component,
  details: {
    engineRule: 'aria-allowed-role',
    target: '.badge',
    help: 'ARIA role should be appropriate for the element',
    helpUrl: 'https://dequeuniversity.com/rules/axe/4.10/aria-allowed-role',
    impact: null,
    html: '<span></span>',
    ...details,
  },
  severity: 'warn',
  repair: 'authored',
});

const FOCUS = {
  engineRule: 'SIA-R65',
  help: 'Focusing the element changes no style on it',
  view: 'error / field',
  variables: ['--input-error-border', '--input-focused-border'],
};

const REPORT: A11yFinishedReport = {
  state: 'finished',
  startedAt: '2026-10-23T14:00:00.000Z',
  finishedAt: '2026-10-23T14:03:20.000Z',
  theme: 'default',
  contrast: [{
    component: 'badge',
    variable: '--badge-brand-text',
    backdrop: ['--badge-brand-surface'],
    role: 'text',
    ratio: 3.87,
    floor: 4.5,
  }],
  findings: [
    finding('a11y-component', 'badge'),
    finding('a11y-review', 'badge'),
    finding('a11y-review', 'videoframe'),
    finding('a11y-focus-visible', 'input', { ...FOCUS, target: '#first' }),
    finding('a11y-focus-visible', 'input', { ...FOCUS, target: '#second' }),
  ],
};

let target: HTMLDivElement;
let panel: ReturnType<typeof mount> | null = null;

function mountPanel(component: string) {
  panel = mount(A11yPanel, { target, props: { component } });
  flushSync();
}

beforeEach(() => {
  __resetForTests();
  target = document.createElement('div');
  document.body.appendChild(target);
});

afterEach(() => {
  if (panel) unmount(panel);
  panel = null;
  target.remove();
});

describe('A11yPanel', () => {
  it('heads the issues with their count and the run time, then groups them by fix', () => {
    receiveA11yReport(REPORT);
    mountPanel('badge');

    expect(target.querySelector('.a11y-panel-title')?.textContent).toBe('2 accessibility issues');
    expect(target.querySelector('.a11y-panel-run')?.textContent).toMatch(/^Last run .+$/);
    const groups = [...target.querySelectorAll('.a11y-group-title')].map((h) => h.textContent);
    expect(groups).toEqual(['Fix with a property', "Fix in the component's code", 'Check by eye']);
    expect(target.querySelector('.a11y-issue-links button')?.getAttribute('aria-label')).toBe('Go to Brand text color');
  });

  it('lists the results to check by eye inline, set apart as review rows', () => {
    receiveA11yReport(REPORT);
    mountPanel('badge');

    const rows = [...target.querySelectorAll('.a11y-issue')];
    expect(rows.map((row) => row.classList.contains('review'))).toEqual([false, false, true]);
    expect(rows.map((row) => row.querySelector('.a11y-review-mark.fa-eye') !== null)).toEqual([false, false, true]);
    const toggle = rows[2].querySelector('.a11y-confirm button');
    expect([toggle?.textContent?.trim(), toggle?.getAttribute('aria-pressed')]).toEqual(['Looks right', 'false']);
  });

  it('heads a component with results to check by eye alone with the eye and their count', () => {
    receiveA11yReport(REPORT);
    mountPanel('videoframe');

    expect(target.querySelector('.a11y-panel-mark.fa-eye')).not.toBeNull();
    expect(target.querySelector('.a11y-panel-title')?.textContent).toBe('1 result to check by eye');
    expect([...target.querySelectorAll('.a11y-group-title')].map((h) => h.textContent)).toEqual(['Check by eye']);
  });

  it('stays out of the page for a component whose results all look right', () => {
    receiveA11yReport({ ...REPORT, confirmed: ['videoframe: case'] });
    mountPanel('videoframe');

    expect(target.querySelector('.a11y-panel')).toBeNull();
  });

  it('leaves a result marked as looking right out of a panel that has other issues', () => {
    receiveA11yReport({ ...REPORT, confirmed: ['badge: case'] });
    mountPanel('badge');

    expect([...target.querySelectorAll('.a11y-group-title')].map((h) => h.textContent)).toEqual(['Fix with a property', "Fix in the component's code"]);
    expect(target.querySelector('.a11y-issue.confirmed')).toBeNull();
  });

  it('merges findings that share an engine rule and properties into one row', () => {
    receiveA11yReport(REPORT);
    mountPanel('input');

    expect(target.querySelector('.a11y-panel-title')?.textContent).toBe('2 accessibility issues');
    const rows = target.querySelectorAll('.a11y-issue');
    expect(rows).toHaveLength(1);
    expect(rows[0].querySelector('.a11y-issue-detail')?.textContent?.trim()).toBe('2 elements, error / field');
  });

  it('links each traced property to its row', () => {
    receiveA11yReport(REPORT);
    mountPanel('input');

    const links = [...target.querySelectorAll('.a11y-issue-links button')];
    expect(links.map((link) => link.getAttribute('aria-label'))).toEqual(['Go to Error border color', 'Go to Focused border color']);
    expect(links.map((link) => link.textContent?.trim())).toEqual(['Error border color', 'Focused border color']);
  });

  it('names each guidance link for the page it opens', () => {
    receiveA11yReport(REPORT);
    mountPanel('badge');

    const labels = [...target.querySelectorAll('.a11y-issue-guidance')].map((link) => link.textContent?.trim());
    expect(labels).toEqual(['Success criterion 1.4.3', 'Rule', 'Rule']);
  });

  it('takes the jump the Accessibility view left for this component and clears it', () => {
    receiveA11yReport(REPORT);
    pendingA11yReveal.set({ component: 'badge', variable: null });
    mountPanel('badge');

    expect(get(pendingA11yReveal)).toBeNull();
  });

  it('leaves a jump meant for another component', () => {
    receiveA11yReport(REPORT);
    pendingA11yReveal.set({ component: 'input', variable: null });
    mountPanel('badge');

    expect(get(pendingA11yReveal)).toEqual({ component: 'input', variable: null });
    pendingA11yReveal.set(null);
  });

  it('stays out of the page for a component the report leaves clean', () => {
    receiveA11yReport(REPORT);
    mountPanel('button');
    expect(target.querySelector('.a11y-panel')).toBeNull();
  });

  it('turns a contrast failure that passes now green, with its run ratio and its ratio now', () => {
    receiveA11yReport(REPORT);
    setFixedContrast(new Map([[REPORT.contrast[0], 5.38]]));
    mountPanel('badge');

    expect(target.querySelector('.a11y-panel-title')?.textContent).toBe('1 accessibility issue');
    const fixed = target.querySelector('.a11y-issue.fixed .a11y-issue-text');
    expect(fixed?.textContent?.replace(/\s+/g, ' ').trim()).toBe('Brand text color 3.87:1 → 5.38:1, meets 4.5:1');
  });

  it('heads a panel whose issues are all fixed with the fixed count', () => {
    const contrastOnly = { ...REPORT, findings: [] };
    receiveA11yReport(contrastOnly);
    setFixedContrast(new Map([[contrastOnly.contrast[0], 5.38]]));
    mountPanel('badge');

    expect(target.querySelector('.a11y-panel-title')?.textContent).toBe('1 issue fixed');
  });

  it('follows the last finished run while a new one goes', () => {
    receiveA11yReport(REPORT);
    receiveA11yReport({ state: 'running', startedAt: '2026-10-23T15:00:00.000Z', theme: 'default', contrast: [] });
    mountPanel('badge');
    expect(target.querySelector('.a11y-panel')).not.toBeNull();
  });
});
