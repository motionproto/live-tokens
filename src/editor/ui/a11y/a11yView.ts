import { getContext, setContext } from 'svelte';
import { writable } from 'svelte/store';
import { getComponentRegistry, getComponentRegistryEntries } from '../../component-editor/registry';
import { selectedComponent, setEditorView } from '../../core/store/editorViewStore';
import type { ComponentA11yIssues } from '../../core/a11y/a11yReport';
import type { A11yFinding } from '../../core/a11y/a11yReportTypes';

export const A11Y_RUN_SECTION = 'a11y-run';
export const A11Y_REVIEW_SECTION = 'a11y-review';

export function a11ySectionId(component: string): string {
  return `a11y-component-${component}`;
}

const VIEW_LINK = Symbol('a11y-view-link');

/** Set by the editor shell, which hosts the Accessibility view. The standalone component page hosts none. */
export function setA11yViewLink(open: (sectionId: string) => void): void {
  setContext(VIEW_LINK, open);
}

export function getA11yViewLink(): ((sectionId: string) => void) | undefined {
  return getContext(VIEW_LINK);
}

export interface A11yRevealTarget {
  component: string;
  /** The property row to scroll to. Null scrolls to the component's issues panel. */
  variable: string | null;
}

/** One-shot: where the component page scrolls once it opens. The issues panel of that component clears it. */
export const pendingA11yReveal = writable<A11yRevealTarget | null>(null);

export function openComponentAt(component: string, variable: string | null = null): void {
  pendingA11yReveal.set({ component, variable });
  selectedComponent.set(component);
  setEditorView('components');
}

export function componentLabel(component: string): string {
  return getComponentRegistry()[component]?.label ?? component;
}

/** The success criteria the suite's own checks link to by their Understanding page. */
const UNDERSTANDING_CRITERIA: Record<string, string> = {
  'non-text-contrast': '1.4.11',
  'text-spacing': '1.4.12',
};

/** Names the kind of page a finding's help URL opens, so the link says where it goes.
 *  axe and Alfa link to their own rule pages; the suite's own checks link to WCAG and the APG. */
export function guidanceLabel(url: string): string {
  const { hostname, pathname } = new URL(url);
  if (hostname === 'www.w3.org') {
    const understanding = pathname.match(/\/Understanding\/([a-z-]+)\.html$/);
    if (understanding) {
      const criterion = UNDERSTANDING_CRITERIA[understanding[1]];
      return criterion ? `Success criterion ${criterion}` : 'Success criterion';
    }
    if (pathname.includes('/Techniques/')) return 'Technique';
    if (pathname.includes('/ARIA/apg/')) return 'Pattern';
  }
  if (hostname === 'playwright.dev') return 'Reference';
  return 'Rule';
}

export interface A11yIssueTotals {
  property: number;
  code: number;
  review: number;
}

/** A component's findings counted by the fix they need, as the view groups them. */
export function issueTotals(issues: ComponentA11yIssues): A11yIssueTotals {
  return {
    property: issues.contrast.length + issues.property.length,
    code: issues.code.length,
    review: issues.review.length,
  };
}

export function accessibilityIssuesLabel(count: number): string {
  return `${count} accessibility ${count === 1 ? 'issue' : 'issues'}`;
}

export function fixedLabel(count: number): string {
  return `${count} ${count === 1 ? 'issue' : 'issues'} fixed`;
}

export function reviewLabel(count: number): string {
  return `${count} ${count === 1 ? 'result' : 'results'} to check by eye`;
}

/** Every finding of the run counts, results to check by eye included (decision 6). */
export function issueCount(issues: ComponentA11yIssues): number {
  return issues.contrast.length + issues.property.length + issues.code.length + issues.review.length;
}

/** One panel row: the findings that share an engine rule, a help text and the properties they trace to. */
export interface A11yFindingRow {
  finding: A11yFinding;
  targets: string[];
  views: string;
  variables: string[];
}

const VIEW_LIMIT = 4;
const MORE_VIEWS = /^and \d+ more$/;

/** The views of several findings, once each, in the order they first
 *  appear. A finding lists four views and counts the rest, so the merged list
 *  cannot count what it drops and says "and more". */
function mergeViews(views: (string | undefined)[]): string {
  const named: string[] = [];
  let hidden = false;
  for (const view of views) {
    for (const part of view ? view.split('; ') : []) {
      if (MORE_VIEWS.test(part)) hidden = true;
      else if (!named.includes(part)) named.push(part);
    }
  }
  const shown = named.slice(0, VIEW_LIMIT);
  return hidden || named.length > shown.length ? [...shown, 'and more'].join('; ') : shown.join('; ');
}

/** Findings that share an engine rule, a help text and their traced properties merge into one row (decision 6). */
export function findingRows(findings: A11yFinding[]): A11yFindingRow[] {
  const rows = new Map<string, A11yFinding[]>();
  for (const finding of findings) {
    const key = finding.details
      ? [finding.rule, finding.details.engineRule, finding.details.help, ...(finding.details.variables ?? [])].join('\n')
      : finding.message;
    rows.set(key, [...(rows.get(key) ?? []), finding]);
  }
  return [...rows.values()].map((group) => ({
    finding: group[0],
    targets: [...new Set(group.flatMap((f) => (f.details ? [f.details.target] : [])))],
    views: group.length === 1 ? (group[0].details?.view ?? '') : mergeViews(group.map((f) => f.details?.view)),
    variables: group[0].details?.variables ?? [],
  }));
}

/** A finding's own words. A keyboard case's engine rule is the case's own name, which the help alone leaves out. */
export function findingText(finding: A11yFinding): string {
  if (!finding.details) return finding.message;
  return finding.rule === 'a11y-keyboard' ? `${finding.details.engineRule}: ${finding.details.help}` : finding.details.help;
}

export function elementsLabel(count: number): string {
  return `${count} ${count === 1 ? 'element' : 'elements'}`;
}

export function issuesLabel(count: number): string {
  return `${count} ${count === 1 ? 'issue' : 'issues'}`;
}

export interface A11yComponentRow {
  component: string;
  label: string;
  icon: string;
  count: number;
  issues: ComponentA11yIssues;
}

/** Every registered component with a finding, in the component rail's order. */
export function componentsWithIssues(all: Record<string, ComponentA11yIssues>): A11yComponentRow[] {
  return getComponentRegistryEntries().flatMap(({ id, label, icon }) => {
    const issues = all[id];
    const count = issues ? issueCount(issues) : 0;
    return count > 0 ? [{ component: id, label, icon, count, issues }] : [];
  });
}

/** Every registered component the report lists: those with an issue and those whose issues are all fixed. */
export function componentsInReport(all: Record<string, ComponentA11yIssues>): A11yComponentRow[] {
  return getComponentRegistryEntries().flatMap(({ id, label, icon }) => {
    const issues = all[id];
    const count = issues ? issueCount(issues) : 0;
    return count > 0 || (issues?.fixed.length ?? 0) > 0 ? [{ component: id, label, icon, count, issues }] : [];
  });
}

/** Every result to check by eye, merged into rows per component, in the rail's order. */
export function reviewResults(all: Record<string, ComponentA11yIssues>): { component: string; label: string; row: A11yFindingRow }[] {
  return getComponentRegistryEntries().flatMap(({ id, label }) =>
    findingRows(all[id]?.review ?? []).map((row) => ({ component: id, label, row })),
  );
}

/** The words of `variable` after the component's prefix that `label` lacks,
 *  such as "focused" for `--input-focused-border` and "border color". Rows in
 *  different variants and states share a label, so these words tell them apart. */
function qualifier(component: string, variable: string, label: string): string {
  const prefix = `--${component}-`;
  if (!variable.startsWith(prefix)) return '';
  const own = new Set(label.split(/[\s-]+/));
  return variable.slice(prefix.length).split('-').filter((word) => !own.has(word)).join(' ');
}

/** The label of the property row that sets `variable`, led by its variant and
 *  state words, with its first letter raised. An intrinsic has no schema row,
 *  so its key names it. */
export function propertyLabel(component: string, variable: string): string | null {
  const entry = getComponentRegistry()[component];
  const token = entry?.schema.find((t) => t.variable === variable);
  const label = token
    ? [qualifier(component, variable, token.label), token.label].filter(Boolean).join(' ')
    : entry?.intrinsics?.find((spec) => spec.variants.some((v) => spec.variable(v) === variable))?.key.replaceAll('-', ' ');
  return label ? label.charAt(0).toUpperCase() + label.slice(1) : null;
}

/** A message split on its backticks, so a command or a variable renders as code. */
export function codeSpans(message: string): { text: string; code: boolean }[] {
  return message.split('`').map((text, i) => ({ text, code: i % 2 === 1 })).filter((part) => part.text);
}

const pad = (n: number) => String(n).padStart(2, '0');

/** "14:02" for a time today, "22 Oct 14:02" for any other day. */
export function formatRunTime(iso: string, now: Date = new Date()): string {
  const at = new Date(iso);
  const clock = `${pad(at.getHours())}:${pad(at.getMinutes())}`;
  if (at.toDateString() === now.toDateString()) return clock;
  return `${at.toLocaleDateString(undefined, { day: 'numeric', month: 'short' })} ${clock}`;
}

export function formatElapsed(ms: number): string {
  const seconds = Math.max(0, Math.floor(ms / 1000));
  return `${Math.floor(seconds / 60)}:${pad(seconds % 60)}`;
}
