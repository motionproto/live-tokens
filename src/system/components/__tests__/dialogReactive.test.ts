// @vitest-environment happy-dom

import { beforeEach, describe, expect, it } from 'vitest';
import { flushSync, mount, unmount } from 'svelte';
import Dialog from '../Dialog.svelte';

beforeEach(() => {
  document.body.innerHTML = '';
  document.documentElement.removeAttribute('style');
});

describe('Dialog live configuration bridge', () => {
  it('updates nested button variants after root config mutations', async () => {
    document.documentElement.style.setProperty('--dialog-confirm-variant', 'danger');
    document.documentElement.style.setProperty('--dialog-cancel-variant', 'secondary');
    const target = document.createElement('div');
    document.body.appendChild(target);
    const component = mount(Dialog, {
      target,
      props: {
        show: true,
        inline: true,
        confirm: { label: 'Confirm', onClick: () => {} },
        cancel: { label: 'Cancel', onClick: () => {} },
      },
    });
    flushSync();
    const buttons = target.querySelectorAll<HTMLButtonElement>('.dialog-footer-buttons button');
    expect(buttons[0].classList.contains('secondary')).toBe(true);
    expect(buttons[1].classList.contains('danger')).toBe(true);

    document.documentElement.style.setProperty('--dialog-confirm-variant', 'success');
    document.documentElement.style.setProperty('--dialog-cancel-variant', 'outline');
    await Promise.resolve();
    flushSync();

    expect(buttons[0].classList.contains('outline')).toBe(true);
    expect(buttons[1].classList.contains('success')).toBe(true);
    unmount(component);
  });
});
