import { describe, expect, it } from 'vitest';
import type { ComponentA11yIssues } from '../../core/a11y/a11yReport';
import type { A11yContrastFailure, A11yFinding } from '../../core/a11y/a11yReportTypes';
import { codeSpans, componentsWithIssues, formatElapsed, formatRunTime, propertyLabel, reviewResults } from './a11yView';

const failure: A11yContrastFailure = {
  component: 'badge',
  variable: '--badge-brand-text',
  backdrop: ['--badge-brand-surface'],
  role: 'text',
  ratio: 3.87,
  floor: 4.5,
};

const finding = (rule: string, component: string): A11yFinding => ({
  rule,
  file: 'src/system/components/Badge.svelte',
  line: 1,
  message: `${component}: case`,
  component,
  severity: 'warn',
  repair: 'authored',
});

const issues: Record<string, ComponentA11yIssues> = {
  radiobutton: { contrast: [], code: [finding('a11y-keyboard', 'radiobutton')], review: [] },
  badge: { contrast: [failure], code: [finding('a11y-component', 'badge')], review: [finding('a11y-review', 'badge')] },
  videoframe: { contrast: [], code: [], review: [finding('a11y-review', 'videoframe')] },
};

describe('componentsWithIssues', () => {
  it('lists each component with a marked issue in rail order, counting contrast and code alone', () => {
    const rows = componentsWithIssues(issues);
    expect(rows.map((r) => [r.component, r.label, r.count])).toEqual([
      ['badge', 'Badge', 2],
      ['radiobutton', 'Radio Button', 1],
    ]);
  });
});

describe('reviewResults', () => {
  it('collects every result to check by eye under its component label', () => {
    expect(reviewResults(issues).map((r) => r.label)).toEqual(['Badge', 'Video Frame']);
  });
});

describe('propertyLabel', () => {
  it('names the row that sets the variable', () => {
    expect(propertyLabel('badge', '--badge-brand-text')).toBe('Text color');
  });

  it('answers null for a variable no row sets', () => {
    expect(propertyLabel('badge', '--badge-nothing')).toBeNull();
  });
});

describe('codeSpans', () => {
  it('marks the text between backticks as code', () => {
    expect(codeSpans('axe-core is not installed. Run `npm install -D axe-core`.')).toEqual([
      { text: 'axe-core is not installed. Run ', code: false },
      { text: 'npm install -D axe-core', code: true },
      { text: '.', code: false },
    ]);
  });
});

describe('formatRunTime', () => {
  it('shows the clock alone for a run today', () => {
    const at = new Date(2026, 9, 23, 14, 2);
    expect(formatRunTime(at.toISOString(), new Date(2026, 9, 23, 18, 0))).toBe('14:02');
  });

  it('adds the date for a run on another day', () => {
    const at = new Date(2026, 9, 22, 9, 5);
    expect(formatRunTime(at.toISOString(), new Date(2026, 9, 23, 18, 0))).toMatch(/22.*09:05$/);
  });
});

describe('formatElapsed', () => {
  it('reads minutes and padded seconds', () => {
    expect(formatElapsed(83_400)).toBe('1:23');
  });
});
