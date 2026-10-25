// @vitest-environment happy-dom

import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { flushSync, mount, unmount } from 'svelte';
import { __resetForTests, receiveA11yReport } from '../../core/a11y/a11yReport';
import type { A11yFinding, A11yFinishedReport } from '../../core/a11y/a11yReportTypes';
import A11yPropertyMark from './A11yPropertyMark.svelte';

const finding = (rule: string, details: Partial<NonNullable<A11yFinding['details']>> = {}): A11yFinding => ({
  rule,
  file: 'src/system/components/Input.svelte',
  line: 1,
  message: 'input: case',
  component: 'input',
  details: {
    engineRule: 'SIA-R65',
    target: '.field',
    help: 'Focusing the element changes no style on it',
    helpUrl: 'https://alfa.siteimprove.com/rules/sia-r65',
    impact: null,
    html: '<input>',
    view: 'error / field',
    variables: ['--input-error-border', '--input-focused-border'],
    ...details,
  },
  severity: 'warn',
  repair: 'authored',
});

const report = (findings: A11yFinding[], contrast: A11yFinishedReport['contrast'] = []): A11yFinishedReport => ({
  state: 'finished',
  startedAt: '2026-10-23T14:00:00.000Z',
  finishedAt: '2026-10-23T14:03:20.000Z',
  theme: 'default',
  contrast,
  findings,
});

const REVIEW = {
  engineRule: 'color-contrast',
  help: 'Elements must meet minimum color contrast ratio thresholds',
  view: 'default',
  variables: ['--input-text'],
};

let target: HTMLDivElement;
let mark: ReturnType<typeof mount> | null = null;

function mountMark(variables: string[]) {
  mark = mount(A11yPropertyMark, { target, props: { variables } });
  flushSync();
}

const button = () => target.querySelector<HTMLButtonElement>('.a11y-property-mark button');

beforeEach(() => {
  __resetForTests();
  target = document.createElement('div');
  document.body.appendChild(target);
});

afterEach(() => {
  if (mark) unmount(mark);
  mark = null;
  target.remove();
});

describe('A11yPropertyMark', () => {
  it('marks a property a finding traces to, names the count and adds no text', () => {
    receiveA11yReport(report([finding('a11y-focus-visible')]));
    mountMark(['--input-focused-border']);

    expect(button()?.getAttribute('aria-label')).toBe('1 accessibility issue');
    expect(target.querySelector('.a11y-property-mark-glyph')?.classList.contains('review')).toBe(false);
    expect(target.textContent?.trim()).toBe('');
  });

  it('stays away from a property no finding traces to', () => {
    receiveA11yReport(report([finding('a11y-focus-visible')]));
    mountMark(['--input-surface']);

    expect(target.querySelector('.a11y-property-mark')).toBeNull();
  });

  it("stays away from a property the editor's own contrast check fails", () => {
    receiveA11yReport(report([], [{
      component: 'input',
      variable: '--input-text',
      backdrop: ['--input-surface'],
      role: 'text',
      ratio: 3.2,
      floor: 4.5,
    }]));
    mountMark(['--input-text']);

    expect(target.querySelector('.a11y-property-mark')).toBeNull();
  });

  it('draws a result to check by eye in the review style', () => {
    receiveA11yReport(report([finding('a11y-review', REVIEW)]));
    mountMark(['--input-text']);

    expect(button()?.getAttribute('aria-label')).toBe('1 result to check by eye');
    expect(target.querySelector('.a11y-property-mark-glyph')?.classList.contains('review')).toBe(true);
  });

  it('counts a row whose variables share findings once per finding', () => {
    receiveA11yReport(report([finding('a11y-focus-visible'), finding('a11y-review', { ...REVIEW, variables: ['--input-focused-border'] })]));
    mountMark(['--input-error-border', '--input-focused-border']);

    expect(button()?.getAttribute('aria-label')).toBe('2 accessibility issues');
    expect(target.querySelector('.a11y-property-mark-glyph')?.classList.contains('review')).toBe(false);
  });

  it('opens a popover that lists the findings and their views, the check-by-eye ones last', () => {
    receiveA11yReport(report([
      finding('a11y-review', { ...REVIEW, variables: ['--input-focused-border'] }),
      finding('a11y-focus-visible'),
    ]));
    mountMark(['--input-focused-border']);

    button()!.click();
    flushSync();

    const dialog = target.querySelector('[role="dialog"]')!;
    expect(dialog.getAttribute('aria-label')).toBe('2 accessibility issues');
    const rows = [...dialog.querySelectorAll('.a11y-issue')];
    expect(rows.map((row) => row.querySelector('.a11y-issue-text')?.textContent?.trim())).toEqual([
      'Focusing the element changes no style on it',
      'Elements must meet minimum color contrast ratio thresholds',
    ]);
    expect(rows[0].querySelector('.a11y-issue-detail')?.textContent).toContain('error / field');
    expect(rows[1].classList.contains('review')).toBe(true);
  });
});
