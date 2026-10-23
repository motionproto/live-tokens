import { getContext, setContext } from 'svelte';
import { getComponentRegistry, getComponentRegistryEntries } from '../../component-editor/registry';
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

export function accessibilityIssuesLabel(count: number): string {
  return `${count} accessibility ${count === 1 ? 'issue' : 'issues'}`;
}

export function reviewLabel(count: number): string {
  return `${count} ${count === 1 ? 'result' : 'results'} to check by eye`;
}

/** The issues that carry a "!". Results to check by eye stay out of the count (decision 6). */
export function issueCount(issues: ComponentA11yIssues): number {
  return issues.contrast.length + issues.code.length;
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

/** Every registered component with an issue, in the component rail's order. */
export function componentsWithIssues(all: Record<string, ComponentA11yIssues>): A11yComponentRow[] {
  return getComponentRegistryEntries().flatMap(({ id, label, icon }) => {
    const issues = all[id];
    const count = issues ? issueCount(issues) : 0;
    return count > 0 ? [{ component: id, label, icon, count, issues }] : [];
  });
}

/** Every result to check by eye, grouped under its component in the rail's order. */
export function reviewResults(all: Record<string, ComponentA11yIssues>): { label: string; finding: A11yFinding }[] {
  return getComponentRegistryEntries().flatMap(({ id, label }) =>
    (all[id]?.review ?? []).map((finding) => ({ label, finding })),
  );
}

/** The label of the property row that sets `variable`, with its first letter raised. */
export function propertyLabel(component: string, variable: string): string | null {
  const label = getComponentRegistry()[component]?.schema.find((token) => token.variable === variable)?.label;
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
