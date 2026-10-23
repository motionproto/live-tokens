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

  it('read every a11y annotation the test carries', () => {
    const { findings } = mapComponent(a11ySuiteReport({ annotations: [annotation([contrast]), annotation([focus])] }));
    expect(findings.map((f: { rule: string }) => f.rule)).toEqual(['a11y-component', 'a11y-focus-visible']);
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
      expect.objectContaining({ rule: 'a11y-page', file: 'src/app/Home.svelte', line: 14 }),
    ]);
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
