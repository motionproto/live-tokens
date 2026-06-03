// @vitest-environment happy-dom
//
// Pins Dialog's `use:portal={!inline}` wiring: the fixed backdrop escapes to
// <body>, while the inline preview variant stays in flow. (The check:overlay-portal
// guard only proves Dialog *uses* the portal; this proves the `!inline` condition.)

import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { mount, unmount, flushSync } from 'svelte';
import Dialog from '../Dialog.svelte';

let target: HTMLDivElement;

beforeEach(() => {
  document.body.innerHTML = '';
  target = document.createElement('div');
  document.body.appendChild(target);
});

afterEach(() => {
  document.body.innerHTML = '';
});

const backdrop = () => document.querySelector<HTMLElement>('.dialog-backdrop')!;

describe('Dialog portal wiring', () => {
  it('portals the backdrop to <body> when not inline', () => {
    const c = mount(Dialog, { target, props: { show: true, inline: false } });
    flushSync();
    expect(backdrop().parentElement).toBe(document.body);
    expect(target.contains(backdrop())).toBe(false);
    unmount(c);
  });

  it('keeps the backdrop in flow when inline', () => {
    const c = mount(Dialog, { target, props: { show: true, inline: true } });
    flushSync();
    expect(target.contains(backdrop())).toBe(true);
    expect(backdrop().classList.contains('inline')).toBe(true);
    unmount(c);
  });
});
