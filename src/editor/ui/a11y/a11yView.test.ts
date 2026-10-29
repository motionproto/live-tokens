import { describe, expect, it } from 'vitest';
import type { ComponentA11yIssues } from '../../core/a11y/a11yReport';
import type { A11yContrastFailure, A11yFinding } from '../../core/a11y/a11yReportTypes';
import {
  codeSpans,
  componentSections,
  componentsInReport,
  componentsWithIssues,
  findingRows,
  formatElapsed,
  formatRunTime,
  guidanceLabel,
  issueCount,
  issueTotals,
  propertyLabel,
  reviewResults,
} from './a11yView';

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

const traced = (target: string, view: string, variables?: string[], engineRule = 'SIA-R65'): A11yFinding => ({
  ...finding('a11y-focus-visible', 'input'),
  details: {
    engineRule,
    target,
    view,
    html: '<input>',
    help: 'Focusing the element changes no style on it',
    helpUrl: 'https://alfa.siteimprove.com/rules/sia-r65',
    ...(variables ? { variables } : {}),
  },
});

const issues: Record<string, ComponentA11yIssues> = {
  radiobutton: { contrast: [], property: [], code: [finding('a11y-keyboard', 'radiobutton')], review: [], confirmed: [], fixed: [] },
  badge: {
    contrast: [failure],
    property: [],
    code: [finding('a11y-component', 'badge')],
    review: [finding('a11y-review', 'badge')],
    confirmed: [],
    fixed: [],
  },
  videoframe: { contrast: [], property: [], code: [], review: [finding('a11y-review', 'videoframe')], confirmed: [], fixed: [] },
  videolightbox: { contrast: [], property: [], code: [], review: [], confirmed: [finding('a11y-review', 'videolightbox')], fixed: [] },
  input: { contrast: [], property: [], code: [], review: [], fixed: [{ failure: { ...failure, component: 'input' }, ratio: 5.1 }], confirmed: [] },
};

describe('issueCount', () => {
  it('counts the findings a fix clears and leaves out the results to check by eye', () => {
    expect(issueCount({ ...issues.badge, property: [traced('.a', 'error')] })).toBe(3);
  });
});

describe('issueTotals', () => {
  it('counts the contrast failures with the property findings', () => {
    expect(issueTotals({ ...issues.badge, property: [traced('.a', 'error')] })).toEqual({ property: 2, code: 1, review: 1 });
  });
});

describe('guidanceLabel', () => {
  it('calls an engine rule page a rule', () => {
    expect(guidanceLabel('https://alfa.siteimprove.com/rules/sia-r65')).toBe('Rule');
    expect(guidanceLabel('https://dequeuniversity.com/rules/axe/4.10/aria-allowed-role')).toBe('Rule');
  });

  it('numbers a success criterion the suite links by its Understanding page', () => {
    expect(guidanceLabel('https://www.w3.org/WAI/WCAG22/Understanding/non-text-contrast.html')).toBe('Success criterion 1.4.11');
    expect(guidanceLabel('https://www.w3.org/WAI/WCAG22/Understanding/text-spacing.html')).toBe('Success criterion 1.4.12');
  });

  it('names a technique, a pattern and a reference page for what they are', () => {
    expect(guidanceLabel('https://www.w3.org/WAI/WCAG22/Techniques/css/C39')).toBe('Technique');
    expect(guidanceLabel('https://www.w3.org/WAI/ARIA/apg/patterns/')).toBe('Pattern');
    expect(guidanceLabel('https://playwright.dev/docs/aria-snapshots')).toBe('Reference');
  });
});

describe('componentsWithIssues', () => {
  it('lists each component with an issue or an unmarked result to check by eye, in rail order', () => {
    const rows = componentsWithIssues(issues);
    expect(rows.map((r) => [r.component, r.label, r.count, r.review])).toEqual([
      ['badge', 'Badge', 2, 1],
      ['radiobutton', 'Radio Button', 1, 0],
      ['videoframe', 'Video Frame', 0, 1],
    ]);
  });
});

describe('componentsInReport', () => {
  it('adds a component whose issues are all fixed, and leaves out one whose results all look right', () => {
    const rows = componentsInReport(issues);
    expect(rows.map((r) => [r.component, r.count])).toEqual([
      ['badge', 2],
      ['input', 0],
      ['radiobutton', 1],
      ['videoframe', 0],
    ]);
  });
});

describe('componentSections', () => {
  it('lists the components with an issue or a fix, and leaves results to check by eye to the By eye list', () => {
    expect(componentSections(issues).map((r) => r.component)).toEqual(['badge', 'input', 'radiobutton']);
  });
});

describe('findingRows', () => {
  it('merges findings that share an engine rule and their properties, counting elements and views', () => {
    const variables = ['--input-error-border', '--input-focused-border'];
    const rows = findingRows([
      traced('.a', 'error / field', variables),
      traced('.b', 'error / field; error / filled', variables),
      traced('.c', 'default', ['--input-focused-border']),
      traced('.d', 'default', ['--input-focused-border'], 'target-size'),
    ]);
    expect(rows[0].findings.map((f) => f.details?.target)).toEqual(['.a', '.b']);
    expect(rows.map((r) => [r.targets, r.views, r.variables])).toEqual([
      [['.a', '.b'], 'error / field; error / filled', variables],
      [['.c'], 'default', ['--input-focused-border']],
      [['.d'], 'default', ['--input-focused-border']],
    ]);
  });

  it('keeps a lone finding\'s views as the run wrote them', () => {
    expect(findingRows([traced('.a', 'one; two; three; four; and 2 more')])[0].views).toBe('one; two; three; four; and 2 more');
  });

  it('lists four views of merged findings and says "and more" past them', () => {
    const [row] = findingRows([traced('.a', 'one; two; three; and 2 more'), traced('.b', 'four; five')]);
    expect(row.views).toBe('one; two; three; four; and more');
  });
});

describe('reviewResults', () => {
  it('collects every result to check by eye under its component label, the marked ones last', () => {
    expect(reviewResults(issues).map((r) => [r.component, r.label, r.confirmed])).toEqual([
      ['badge', 'Badge', false],
      ['videoframe', 'Video Frame', false],
      ['videolightbox', 'Video Lightbox', true],
    ]);
  });
});

describe('propertyLabel', () => {
  it('names the row that sets the variable, led by its variant and state words', () => {
    expect(propertyLabel('badge', '--badge-brand-text')).toBe('Brand text color');
    expect(propertyLabel('input', '--input-focused-border')).toBe('Focused border color');
  });

  it('names an intrinsic by its key', () => {
    expect(propertyLabel('button', '--button-shimmer')).toBe('Shimmer');
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
