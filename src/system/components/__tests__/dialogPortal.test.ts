// @vitest-environment happy-dom
//
// End-to-end pin for Dialog's `use:portal={!inline}` wiring: the fixed backdrop
// escapes to <body>, the inline preview variant stays in flow, and toggling
// `inline` at runtime moves it both ways (the S3 regression). The portal action
// itself is unit-tested in internal/__tests__/portal.test.ts; this covers the
// component that consumes it.

import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { mount, unmount, flushSync } from 'svelte';
import Dialog from '../Dialog.svelte';
import { reactiveProps } from './reactiveProps.svelte';

let target: HTMLDivElement;

beforeEach(() => {
  document.body.innerHTML = '';
  target = document.createElement('div');
  document.body.appendChild(target);
});

afterEach(() => {
  document.body.innerHTML = '';
});

const backdrop = () => document.querySelector<HTMLElement>('.dialog-backdrop');

// 'body' = portaled out; 'flow' = still inside the mounted subtree.
function location(): 'body' | 'flow' | null {
  const el = backdrop();
  if (!el) return null;
  if (el.parentElement === document.body) return 'body';
  if (target.contains(el)) return 'flow';
  return null;
}

describe('Dialog portal wiring', () => {
  it('portals the backdrop to <body> when not inline', () => {
    const props = reactiveProps({ show: true, inline: false });
    const c = mount(Dialog, { target, props });
    flushSync();
    expect(location()).toBe('body');
    unmount(c);
  });

  it('keeps the backdrop in flow when inline', () => {
    const props = reactiveProps({ show: true, inline: true });
    const c = mount(Dialog, { target, props });
    flushSync();
    expect(location()).toBe('flow');
    expect(backdrop()?.classList.contains('inline')).toBe(true);
    unmount(c);
  });

  it('moves the backdrop out and back as inline toggles at runtime', () => {
    const props = reactiveProps({ show: true, inline: true });
    const c = mount(Dialog, { target, props });
    flushSync();
    expect(location()).toBe('flow');

    props.inline = false;
    flushSync();
    expect(location()).toBe('body');

    props.inline = true; // the S3 regression: this used to strand it in <body>
    flushSync();
    expect(location()).toBe('flow');

    unmount(c);
  });

  it('removes the backdrop entirely when hidden, leaving no stray nodes in <body>', () => {
    const props = reactiveProps({ show: true, inline: false });
    const c = mount(Dialog, { target, props });
    flushSync();
    expect(location()).toBe('body');

    props.show = false;
    flushSync();
    expect(backdrop()).toBeNull();
    // No orphaned dialog markup left directly under <body> (anchor comment aside).
    expect(document.body.querySelector('.dialog-backdrop')).toBeNull();

    unmount(c);
  });
});
