import { describe, it, expect, afterEach } from 'vitest';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
// @ts-expect-error — plain .mjs module, no types
import { COMPONENT_RULES } from './check-component.mjs';
// @ts-expect-error — plain .mjs module, no types
import { PAGE_RULES } from './check-page.mjs';
// @ts-expect-error — plain .mjs module, no types
import { hasHardFailure, mapPageResults, mapPlaywrightResults } from './contractRunner.mjs';
// @ts-expect-error — plain .mjs module, no types
import { applyCoverageSeverity, applySeverity, countBySeverity } from './lib/findings.mjs';
import type { A11yResult } from '../src/testing/support/a11y';

const roots: string[] = [];
function fixtureRoot(): string {
  const dir = mkdtempSync(join(tmpdir(), 'lt-a11y-'));
  roots.push(dir);
  return dir;
}
afterEach(() => {
  while (roots.length) rmSync(roots.pop()!, { recursive: true, force: true });
});

const contrast: A11yResult = {
  rule: 'a11y-component',
  engineRule: 'color-contrast',
  impact: 'serious',
  target: '.widget-label',
  html: '<span class="widget-label">Label</span>',
  help: 'Elements must meet minimum color contrast ratio thresholds',
  helpUrl: 'https://dequeuniversity.com/rules/axe/4.14/color-contrast',
};
const focus: A11yResult = {
  rule: 'a11y-focus-visible',
  engineRule: 'SIA-R65',
  impact: null,
  target: 'button.widget',
  html: '<button class="widget">Go</button>',
  help: 'Focusing the element changes no style on it, its descendants, or its ancestors',
  helpUrl: 'https://alfa.siteimprove.com/rules/sia-r65',
};

const annotation = (results: A11yResult[]) => ({ type: 'a11y', description: JSON.stringify(results) });

function a11ySuiteReport(test: Record<string, unknown>) {
  return {
    suites: [{
      title: 'component-a11y.contract.ts',
      specs: [{
        title: 'widget meets WCAG 2 AA in every state',
        file: 'component-a11y.contract.ts',
        line: 20,
        tests: [{ status: 'expected', annotations: [], results: [{ status: 'passed', errors: [] }], ...test }],
      }],
    }],
  };
}

function mapComponent(report: unknown) {
  const root = fixtureRoot();
  return mapPlaywrightResults(report, { root, sourceDataDir: join(root, 'data'), knownIds: new Set(['widget']) });
}

function exitCode(findings: unknown[], rules: unknown, opts: Record<string, unknown> = {}) {
  return countBySeverity(applySeverity(findings, rules, opts)).errors === 0 && !hasHardFailure(findings) ? 0 : 1;
}

describe('a11y annotations on a passing component test', () => {
  it('map to one finding per result, anchored on the runtime', () => {
    const { findings, coverage } = mapComponent(a11ySuiteReport({ annotations: [annotation([contrast, focus])] }));
    expect(findings).toEqual([
      expect.objectContaining({
        rule: 'a11y-component',
        file: 'src/system/components/Widget.svelte',
        line: 1,
        message: `widget: color-contrast at .widget-label: ${contrast.help}. ${contrast.helpUrl}`,
        details: expect.objectContaining({ engineRule: 'color-contrast', impact: 'serious', helpUrl: contrast.helpUrl }),
      }),
      expect.objectContaining({ rule: 'a11y-focus-visible', file: 'src/system/components/Widget.svelte', line: 1 }),
    ]);
    expect(coverage.widget['a11y-component']).toEqual({ status: 'passed' });
  });

  it('name the views a result failed in', () => {
    const view = 'Brand / base; Brand / base under ocean';
    const { findings } = mapComponent(a11ySuiteReport({ annotations: [annotation([{ ...contrast, view }])] }));
    expect(findings[0].message).toBe(`widget: color-contrast at .widget-label in ${view}: ${contrast.help}. ${contrast.helpUrl}`);
    expect(findings[0].details.view).toBe(view);
  });

  it('carry the variables a result traced to, and omit the field when it traced none', () => {
    const variables = ['--widget-surface', '--widget-text'];
    const { findings } = mapComponent(a11ySuiteReport({ annotations: [annotation([{ ...contrast, variables }, focus])] }));
    expect(findings[0].details.variables).toEqual(variables);
    expect(findings[1].details).not.toHaveProperty('variables');
  });

  it('report text spacing and reduced motion under their own rules at warn, with their variables', () => {
    const spacing: A11yResult = {
      ...contrast,
      rule: 'a11y-text-spacing',
      engineRule: 'text-spacing',
      impact: null,
      help: 'Under the text spacing override, <span> holds 30px of content in 20px of height, and its overflow-y is hidden',
      variables: ['--widget-height'],
    };
    const motion: A11yResult = {
      ...contrast,
      rule: 'a11y-reduced-motion',
      engineRule: 'prefers-reduced-motion',
      impact: null,
      target: 'button.widget::before',
      help: 'A transition of left lasts 500 ms under prefers-reduced-motion: reduce',
      variables: ['--widget-duration'],
    };
    const { findings } = mapComponent(a11ySuiteReport({ annotations: [annotation([spacing, motion])] }));
    expect(findings.map((f: { rule: string; details: { variables?: string[] } }) => [f.rule, f.details.variables])).toEqual([
      ['a11y-text-spacing', ['--widget-height']],
      ['a11y-reduced-motion', ['--widget-duration']],
    ]);
    expect(applySeverity(findings, COMPONENT_RULES).map((f: { severity: string }) => f.severity)).toEqual(['warn', 'warn']);
    expect(exitCode(findings, COMPONENT_RULES)).toBe(0);
    expect(exitCode(findings, COMPONENT_RULES, { strict: true })).toBe(1);
  });

  it('name the component in a field of their own', () => {
    const { findings } = mapComponent(a11ySuiteReport({ annotations: [annotation([contrast, focus])] }));
    expect(findings.map((f: { component?: string }) => f.component)).toEqual(['widget', 'widget']);
  });

  it('read every a11y annotation the test carries', () => {
    const { findings } = mapComponent(a11ySuiteReport({ annotations: [annotation([contrast]), annotation([focus])] }));
    expect(findings.map((f: { rule: string }) => f.rule)).toEqual(['a11y-component', 'a11y-focus-visible']);
  });
});

const keyboard: A11yResult = {
  rule: 'a11y-keyboard',
  engineRule: 'arrow right moves focus to the next tab',
  impact: null,
  target: 'secondTab',
  html: '<button class="tab">Details</button>',
  help: 'secondTab is not focused, expected focused',
  helpUrl: 'https://www.w3.org/WAI/ARIA/apg/patterns/',
};

const EDITOR_SUITE_TITLES = [
  'is listed in its registry group',
  'declares every part and every shipped alias',
  'resolves every alias it paints with',
  'previews the state being edited',
  'answers the pointer and the keyboard',
];

function editorSuiteReport(interaction: Record<string, unknown>) {
  return {
    suites: [{
      title: 'component-editor.contract.ts',
      suites: [{
        title: 'widget',
        specs: EDITOR_SUITE_TITLES.map((title, index) => ({
          title: `widget ${title}`,
          file: 'component-editor.contract.ts',
          line: 30 + index,
          tests: [{
            status: 'expected',
            annotations: [],
            results: [{ status: 'passed', errors: [] }],
            ...(index === EDITOR_SUITE_TITLES.length - 1 ? interaction : {}),
          }],
        })),
      }],
    }],
  };
}

describe('a keyboard case that fails', () => {
  const report = editorSuiteReport({ annotations: [annotation([keyboard])] });

  it('reports a11y-keyboard on the runtime and leaves the interaction obligation passed', () => {
    const { findings, coverage } = mapComponent(report);
    expect(findings).toEqual([
      expect.objectContaining({
        rule: 'a11y-keyboard',
        file: 'src/system/components/Widget.svelte',
        message: `widget: ${keyboard.engineRule} at secondTab: ${keyboard.help}. ${keyboard.helpUrl}`,
      }),
    ]);
    expect(coverage.widget['contract-interaction']).toEqual({ status: 'passed' });
  });

  it('warns by default and blocks under --strict', () => {
    const { findings } = mapComponent(report);
    expect(applySeverity(findings, COMPONENT_RULES)[0].severity).toBe('warn');
    expect(exitCode(findings, COMPONENT_RULES)).toBe(0);
    expect(applySeverity(findings, COMPONENT_RULES, { strict: true })[0].severity).toBe('error');
    expect(exitCode(findings, COMPONENT_RULES, { strict: true })).toBe(1);
  });
});

describe('a component accessibility test that throws', () => {
  it('reports tests-setup and marks its rule failed', () => {
    const { findings, coverage } = mapComponent(a11ySuiteReport({
      status: 'unexpected',
      results: [{ status: 'failed', errors: [{ message: 'Error: page.evaluate: Target closed' }] }],
    }));
    expect(findings.map((f: { rule: string }) => f.rule)).toEqual(['tests-setup']);
    expect(coverage.widget['a11y-component']).toEqual({ status: 'failed' });
  });

  it('keeps the rule a ContractViolation names', () => {
    const { findings } = mapComponent(a11ySuiteReport({
      status: 'unexpected',
      results: [{ status: 'failed', errors: [{ message: 'ContractViolation: [contract-states] widget: no state tab labelled "hover"' }] }],
    }));
    expect(findings.map((f: { rule: string }) => f.rule)).toEqual(['contract-states']);
    expect(findings[0].component).toBe('widget');
  });
});

describe('a11y annotations on a passing page test', () => {
  it('map to one finding per result at the page file and the line each result names', () => {
    const report = {
      suites: [{
        title: 'page-compliance.contract.ts',
        specs: [{
          title: 'page-a11y | src/app/Home.svelte | 1280x900',
          file: 'page-compliance.contract.ts',
          line: 40,
          tests: [{
            status: 'expected',
            annotations: [annotation([{ ...contrast, rule: 'a11y-page', engineRule: 'link-name', line: 14 }])],
            results: [{ status: 'passed', errors: [] }],
          }],
        }],
      }],
    };
    const { findings } = mapPageResults(report);
    expect(findings).toEqual([
      expect.objectContaining({
        rule: 'a11y-page',
        file: 'src/app/Home.svelte',
        line: 14,
        message: `link-name at .widget-label in 1280x900: ${contrast.help}. ${contrast.helpUrl}`,
      }),
    ]);
  });
});

function pageSuiteReport(title: string, test: Record<string, unknown>) {
  return {
    suites: [{
      title: 'page-compliance.contract.ts',
      specs: [{
        title,
        file: 'page-compliance.contract.ts',
        line: 40,
        tests: [{ status: 'expected', annotations: [], results: [{ status: 'passed', errors: [] }], ...test }],
      }],
    }],
  };
}

describe('the page accessibility tests', () => {
  const at = 'src/app/Home.svelte@1280x900';

  it('reach coverage under the rule each records', () => {
    for (const [name, rule] of [
      ['page-a11y', 'a11y-page'],
      ['page-text-spacing', 'a11y-text-spacing'],
      ['page-reduced-motion', 'a11y-reduced-motion'],
    ]) {
      const { coverage } = mapPageResults(pageSuiteReport(`${name} | src/app/Home.svelte | 1280x900`, {}));
      expect(coverage[at], name).toEqual({ [rule]: { status: 'passed' } });
    }
  });

  it('read a missing engine as inapplicable coverage that --off turns disabled', () => {
    const { findings, coverage } = mapPageResults(pageSuiteReport('page-a11y | src/app/Home.svelte | 1280x900', {
      status: 'skipped',
      annotations: [{ type: 'skip', description: 'axe-core is not installed' }],
    }));
    expect(findings).toEqual([]);
    expect(coverage[at]['a11y-page']).toEqual({ status: 'inapplicable', reason: 'axe-core is not installed' });
    expect(applyCoverageSeverity(coverage, PAGE_RULES, { off: ['a11y-page'] })[at]['a11y-page']).toEqual({ status: 'disabled' });
  });

  it('report a scan that throws as tests-setup', () => {
    const { findings, coverage } = mapPageResults(pageSuiteReport('page-reduced-motion | src/app/Home.svelte | 1280x900', {
      status: 'unexpected',
      results: [{ status: 'failed', errors: [{ message: 'Error: page.evaluate: Target closed' }] }],
    }));
    expect(findings.map((f: { rule: string }) => f.rule)).toEqual(['tests-setup']);
    expect(coverage[at]['a11y-reduced-motion']).toEqual({ status: 'failed' });
  });
});

describe('a11y severity', () => {
  const finding = { rule: 'a11y-component', file: 'src/system/components/Widget.svelte', line: 1, message: 'widget: x' };
  const pageFinding = { rule: 'a11y-page', file: 'src/app/Home.svelte', line: 3, message: 'x' };

  it('warns and exits 0 by default', () => {
    expect(applySeverity([finding], COMPONENT_RULES)[0].severity).toBe('warn');
    expect(exitCode([finding], COMPONENT_RULES)).toBe(0);
    expect(exitCode([pageFinding], PAGE_RULES)).toBe(0);
  });

  it('exits non-zero under --strict', () => {
    expect(exitCode([finding], COMPONENT_RULES, { strict: true })).toBe(1);
    expect(exitCode([pageFinding], PAGE_RULES, { strict: true })).toBe(1);
  });

  it('warns for each page rule by default and blocks under --strict', () => {
    for (const rule of ['a11y-page', 'a11y-review', 'a11y-text-spacing', 'a11y-reduced-motion']) {
      expect(exitCode([{ ...pageFinding, rule }], PAGE_RULES), rule).toBe(0);
      expect(exitCode([{ ...pageFinding, rule }], PAGE_RULES, { strict: true }), rule).toBe(1);
    }
  });

  it('stays silent under --strict once --off names the rule', () => {
    expect(applySeverity([finding], COMPONENT_RULES, { strict: true, off: ['a11y-component'] })).toEqual([]);
    expect(exitCode([finding], COMPONENT_RULES, { strict: true, off: ['a11y-component'] })).toBe(0);
  });

  it('defaults every a11y rule in both tables to warn', () => {
    const ids = [...Object.keys(COMPONENT_RULES), ...Object.keys(PAGE_RULES)].filter((id) => id.startsWith('a11y-'));
    expect(new Set(ids)).toEqual(new Set([
      'a11y-component', 'a11y-page', 'a11y-review', 'a11y-focus-visible',
      'a11y-text-spacing', 'a11y-reduced-motion', 'a11y-keyboard',
    ]));
    for (const id of ids) expect((COMPONENT_RULES[id] ?? PAGE_RULES[id]).severity, id).toBe('warn');
  });
});

describe('a missing engine', () => {
  const report = a11ySuiteReport({ annotations: [{ type: 'inapplicable', description: 'axe-core is not installed' }] });

  it('reads as inapplicable coverage with the package name', () => {
    const { findings, coverage } = mapComponent(report);
    expect(findings).toEqual([]);
    expect(coverage.widget['a11y-component']).toEqual({ status: 'inapplicable', reason: 'axe-core is not installed' });
    expect(applyCoverageSeverity(coverage, COMPONENT_RULES, { strict: true }).widget['a11y-component'].status).toBe('inapplicable');
  });

  it('exits 0 under --strict', () => {
    const { findings } = mapComponent(report);
    expect(exitCode(findings, COMPONENT_RULES, { strict: true })).toBe(0);
  });
});
