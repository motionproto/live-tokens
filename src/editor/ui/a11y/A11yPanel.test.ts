// @vitest-environment happy-dom

import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { flushSync, mount, unmount } from 'svelte';
import { __resetForTests, receiveA11yReport } from '../../core/a11y/a11yReport';
import type { A11yFinding, A11yFinishedReport } from '../../core/a11y/a11yReportTypes';
import A11yPanel from './A11yPanel.svelte';

const finding = (rule: string, component: string): A11yFinding => ({
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
  },
  severity: 'warn',
  repair: 'authored',
});

const REPORT: A11yFinishedReport = {
  state: 'finished',
  startedAt: '2026-10-23T14:00:00.000Z',
  finishedAt: '2026-10-23T14:03:20.000Z',
  theme: 'royal-velvet',
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
    expect(groups).toEqual(['Fix with a property', "Fix in the component's code"]);
    expect(target.querySelector('.a11y-reveal')?.getAttribute('aria-label')).toBe('Go to Text color');
  });

  it('counts the results to check by eye on a quiet line outside the editor shell', () => {
    receiveA11yReport(REPORT);
    mountPanel('badge');

    const line = target.querySelector('.a11y-panel-review');
    expect(line?.tagName).toBe('P');
    expect(line?.textContent).toBe('1 result to check by eye');
  });

  it('stays out of the page for a component the report leaves clean', () => {
    receiveA11yReport(REPORT);
    mountPanel('button');
    expect(target.querySelector('.a11y-panel')).toBeNull();
  });

  it('stays out of the page for a component with results to check by eye alone', () => {
    receiveA11yReport(REPORT);
    mountPanel('videoframe');
    expect(target.querySelector('.a11y-panel')).toBeNull();
  });

  it('follows the last finished run while a new one goes', () => {
    receiveA11yReport(REPORT);
    receiveA11yReport({ state: 'running', startedAt: '2026-10-23T15:00:00.000Z', contrast: [] });
    mountPanel('badge');
    expect(target.querySelector('.a11y-panel')).not.toBeNull();
  });
});
