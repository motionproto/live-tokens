// @vitest-environment happy-dom
//
// The slot-prose defense, on two levels:
//   1. the mixin pins exactly the owned type axes (font-family/size/weight,
//      line-height, color) onto slotted p/ul/ol/li and nothing else — links,
//      emphasis and the style/tracking axes stay free — all gated behind
//      `.prose`. Asserted by compiling the mixin (deterministic; happy-dom does
//      not resolve the cascade, so a computed-style test would be unreliable).
//   2. the `prose` prop wires the `.prose` class the mixin keys on, so
//      `prose={false}` drops the pin and the consumer's page styles win.
// See plans/slot-typography-isolation-plan.md.

import { describe, it, expect, beforeEach } from 'vitest';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { compileString } from 'sass';
import { mount, unmount, flushSync, createRawSnippet } from 'svelte';
import Card from '../Card.svelte';
import CollapsibleSection from '../CollapsibleSection.svelte';

const stylesDir = resolve(dirname(fileURLToPath(import.meta.url)), '../../styles');
const css = compileString(`@use 'slot-prose' as *;\n.card-body { @include slot-prose; }`, {
  loadPaths: [stylesDir],
}).css;

describe('slot-prose mixin — the pinned contract', () => {
  it('pins the five owned type axes on slotted flowing content', () => {
    for (const axis of ['font-family', 'font-size', 'font-weight', 'line-height', 'color']) {
      expect(css).toContain(`${axis}: inherit;`);
    }
  });

  it('leaves page-owned axes free — no font shorthand, font-style, tracking or transform', () => {
    expect(css).not.toContain('font:'); // the shorthand resets the free axes too
    expect(css).not.toMatch(/font-style|letter-spacing|text-transform|font-variant/);
  });

  it('does not touch links or inline emphasis', () => {
    expect(css).not.toContain(':global(a)');
    expect(css).not.toContain(':global(strong)');
    expect(css).not.toContain(':global(em)');
  });

  it('emits the paragraph + list spacing rhythm', () => {
    expect(css).toContain('margin: 0 0 var(--space-12)'); // p
    expect(css).toContain('margin-bottom: 0'); // p:last-child
    expect(css).toContain('padding-left: var(--space-24)'); // ul/ol
    expect(css).toContain('margin-bottom: var(--space-4)'); // li
  });

  it('gates every pin behind `.prose`', () => {
    const pinLines = css.split('\n').filter((l) => l.includes(':global('));
    expect(pinLines.length).toBeGreaterThan(0);
    for (const line of pinLines) expect(line).toContain('.prose');
  });
});

beforeEach(() => {
  document.body.innerHTML = '';
});

function fresh(): HTMLDivElement {
  const t = document.createElement('div');
  document.body.appendChild(t);
  return t;
}

const para = () => createRawSnippet(() => ({ render: () => '<p>body copy</p>' }));

function hasProse(target: HTMLElement, selector: string): boolean {
  const el = target.querySelector(selector);
  if (!el) throw new Error(`${selector} not rendered`);
  return el.classList.contains('prose');
}

describe('prose gating — the prop wires the class the mixin keys on', () => {
  it('Card: prose class on by default, dropped for prose={false}', () => {
    const on = fresh();
    const c1 = mount(Card, { target: on, props: { children: para() } });
    flushSync();
    expect(hasProse(on, '.card-body')).toBe(true);
    unmount(c1);

    const off = fresh();
    const c2 = mount(Card, { target: off, props: { prose: false, children: para() } });
    flushSync();
    expect(hasProse(off, '.card-body')).toBe(false);
    unmount(c2);
  });

  it('CollapsibleSection: prose class on by default, dropped for prose={false}', () => {
    const on = fresh();
    const c1 = mount(CollapsibleSection, {
      target: on,
      props: { label: 'S', expanded: true, children: para() },
    });
    flushSync();
    expect(hasProse(on, '.section-content')).toBe(true);
    unmount(c1);

    const off = fresh();
    const c2 = mount(CollapsibleSection, {
      target: off,
      props: { label: 'S', expanded: true, prose: false, children: para() },
    });
    flushSync();
    expect(hasProse(off, '.section-content')).toBe(false);
    unmount(c2);
  });
});
