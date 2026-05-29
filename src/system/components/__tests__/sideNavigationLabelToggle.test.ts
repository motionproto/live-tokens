// @vitest-environment happy-dom
//
// Behavior pin for SideNavigation's "click the label of the active section to
// toggle expansion" affordance. The label is rendered as an <a href> inside
// the CollapsibleSection (href branch), so without interception it would just
// re-navigate to the route you're already on. SideNavigation intercepts the
// click, calls preventDefault, and toggles. Modified clicks and the chevron
// button must keep their existing behavior.

import { beforeEach, describe, expect, it } from 'vitest';
import { mount, unmount, flushSync } from 'svelte';
import SideNavigation from '../SideNavigation.svelte';

beforeEach(() => {
  document.body.innerHTML = '';
});

function makeProps(currentPath: string) {
  return {
    titleLabel: 'Docs',
    currentPath,
    open: true,
    sections: [
      {
        path: '/docs',
        title: 'Docs',
        hasIndexPage: true,
        items: [
          { path: '/docs/intro', title: 'Intro' },
          { path: '/docs/setup', title: 'Setup' },
        ],
      },
    ],
  };
}

function fresh(): HTMLDivElement {
  const target = document.createElement('div');
  document.body.appendChild(target);
  return target;
}

function isExpanded(target: HTMLElement): boolean {
  // Section items are conditionally rendered behind {#if expandedSections[...]}.
  return !!target.querySelector('.sn-section .sn-items');
}

function labelLink(target: HTMLElement): HTMLAnchorElement {
  const a = target.querySelector<HTMLAnchorElement>('.sn-section a');
  if (!a) throw new Error('label link not found');
  return a;
}

function chevronButton(target: HTMLElement): HTMLButtonElement {
  const b = target.querySelector<HTMLButtonElement>('.sn-section .section-toggle-button');
  if (!b) throw new Error('chevron button not found');
  return b;
}

describe('SideNavigation — label-as-toggle on the active section', () => {
  it('clicking the active section label toggles expansion (collapse, then expand)', () => {
    const target = fresh();
    const c = mount(SideNavigation, { target, props: makeProps('/docs') });
    flushSync();

    // The $effect auto-expands the section whose path matches currentPath.
    expect(isExpanded(target)).toBe(true);

    const link = labelLink(target);

    const ev1 = new MouseEvent('click', { bubbles: true, cancelable: true });
    link.dispatchEvent(ev1);
    flushSync();
    expect(ev1.defaultPrevented).toBe(true);
    expect(isExpanded(target)).toBe(false);

    const ev2 = new MouseEvent('click', { bubbles: true, cancelable: true });
    link.dispatchEvent(ev2);
    flushSync();
    expect(ev2.defaultPrevented).toBe(true);
    expect(isExpanded(target)).toBe(true);

    unmount(c);
  });

  it('clicking the label of an inactive section does not preventDefault and does not toggle', () => {
    const target = fresh();
    const c = mount(SideNavigation, { target, props: makeProps('/other') });
    flushSync();

    expect(isExpanded(target)).toBe(false);

    const ev = new MouseEvent('click', { bubbles: true, cancelable: true });
    labelLink(target).dispatchEvent(ev);
    flushSync();

    expect(ev.defaultPrevented).toBe(false);
    expect(isExpanded(target)).toBe(false);

    unmount(c);
  });

  it('the chevron toggles regardless of whether the section is the active route', () => {
    const target = fresh();
    const c = mount(SideNavigation, { target, props: makeProps('/docs') });
    flushSync();

    expect(isExpanded(target)).toBe(true);
    chevronButton(target).click();
    flushSync();
    expect(isExpanded(target)).toBe(false);
    chevronButton(target).click();
    flushSync();
    expect(isExpanded(target)).toBe(true);

    unmount(c);
  });

  it('cmd-click on the active label lets the link navigate (no preventDefault, no toggle)', () => {
    const target = fresh();
    const c = mount(SideNavigation, { target, props: makeProps('/docs') });
    flushSync();

    expect(isExpanded(target)).toBe(true);

    const ev = new MouseEvent('click', {
      bubbles: true,
      cancelable: true,
      metaKey: true,
    });
    labelLink(target).dispatchEvent(ev);
    flushSync();

    expect(ev.defaultPrevented).toBe(false);
    expect(isExpanded(target)).toBe(true);

    unmount(c);
  });
});
