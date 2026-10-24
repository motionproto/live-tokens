// @vitest-environment happy-dom

import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { flushSync, mount, tick, unmount } from 'svelte';
import Dialog from '../Dialog.svelte';

let target: HTMLDivElement;
let opener: HTMLButtonElement;

beforeEach(() => {
  document.body.innerHTML = '';
  opener = document.createElement('button');
  opener.textContent = 'Open';
  target = document.createElement('div');
  document.body.append(opener, target);
  opener.focus();
});

afterEach(() => {
  document.body.innerHTML = '';
});

const props = (inline: boolean) => ({
  open: true,
  inline,
  title: 'Delete file',
  confirm: { label: 'Delete', onClick: () => {} },
  cancel: { label: 'Keep', onClick: () => {} },
});

async function settle() {
  flushSync();
  await tick();
  await Promise.resolve();
}

function pressTab(shiftKey = false) {
  const event = new KeyboardEvent('keydown', { key: 'Tab', shiftKey, bubbles: true, cancelable: true });
  (document.activeElement ?? document.body).dispatchEvent(event);
  return event;
}

const button = (name: string) =>
  [...document.querySelectorAll<HTMLButtonElement>('.dialog button')].find(
    (b) => (b.getAttribute('aria-label') ?? b.textContent?.trim()) === name,
  )!;

describe('Dialog focus trap', () => {
  it('moves focus to the confirm button on open', async () => {
    const c = mount(Dialog, { target, props: props(false) });
    await settle();
    expect(document.activeElement).toBe(button('Delete'));
    unmount(c);
  });

  it('wraps Tab from the last button to the first, and Shift+Tab back', async () => {
    const c = mount(Dialog, { target, props: props(false) });
    await settle();
    expect(pressTab().defaultPrevented).toBe(true);
    expect(document.activeElement).toBe(button('Close'));
    expect(pressTab(true).defaultPrevented).toBe(true);
    expect(document.activeElement).toBe(button('Delete'));
    unmount(c);
  });

  it('leaves Tab between inner buttons to the browser', async () => {
    const c = mount(Dialog, { target, props: props(false) });
    await settle();
    button('Keep').focus();
    expect(pressTab().defaultPrevented).toBe(false);
    unmount(c);
  });

  it('pulls focus back in from outside the dialog', async () => {
    const c = mount(Dialog, { target, props: props(false) });
    await settle();
    opener.focus();
    expect(pressTab().defaultPrevented).toBe(true);
    expect(document.activeElement).toBe(button('Close'));
    unmount(c);
  });

  it('holds focus on the panel when it has nothing to tab to', async () => {
    const c = mount(Dialog, { target, props: { open: true, inline: false } });
    await settle();
    const panel = document.querySelector<HTMLElement>('.dialog')!;
    expect(document.activeElement).toBe(panel);
    expect(pressTab().defaultPrevented).toBe(true);
    expect(document.activeElement).toBe(panel);
    unmount(c);
  });

  it('returns focus to the opener when the dialog closes', async () => {
    const c = mount(Dialog, { target, props: { open: true, inline: false, title: 'Notice' } });
    await settle();
    expect(document.activeElement).toBe(button('Close'));
    button('Close').click();
    await settle();
    expect(document.querySelector('.dialog')).toBeNull();
    expect(document.activeElement).toBe(opener);
    unmount(c);
  });

  it('leaves focus and Tab alone in the inline preview', async () => {
    const c = mount(Dialog, { target, props: props(true) });
    await settle();
    expect(document.activeElement).toBe(opener);
    expect(pressTab().defaultPrevented).toBe(false);
    unmount(c);
  });
});
