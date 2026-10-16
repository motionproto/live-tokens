// @vitest-environment happy-dom
import { beforeEach, describe, expect, it } from 'vitest';
import { flushSync, mount, unmount } from 'svelte';
import { get } from 'svelte/store';
import CustomColorsSection from './CustomColorsSection.svelte';
import {
  __getHistoryLengths,
  __resetForTests,
  addCustomColor,
  editorState,
  mutate,
} from '../../core/store/editorStore';

const TEAL = { l: 0.62, c: 0.11, h: 190 };
const ROSE = { l: 0.7, c: 0.14, h: 10 };

let destroy: (() => void) | null = null;

beforeEach(() => {
  destroy?.();
  destroy = null;
  __resetForTests();
  document.body.innerHTML = '';
});

function mountSection(): HTMLElement {
  const target = document.createElement('div');
  document.body.appendChild(target);
  const component = mount(CustomColorsSection, { target });
  destroy = () => unmount(component);
  flushSync();
  return target;
}

function click(el: Element | null | undefined): void {
  if (!el) throw new Error('element not found');
  (el as HTMLElement).click();
  flushSync();
}

function setHue(target: HTMLElement, hue: number): void {
  const input = target.querySelector<HTMLInputElement>('input.hsl-slider-input')!;
  input.value = String(hue);
  input.dispatchEvent(new Event('change', { bubbles: true }));
  flushSync();
}

const variables = (target: HTMLElement) =>
  Array.from(target.querySelectorAll('.token-variable')).map((el) => el.textContent?.trim());
const tokens = () => get(editorState).customColors.tokens;

describe('CustomColorsSection', () => {
  it('lists the theme custom colours by number', () => {
    addCustomColor(TEAL);
    addCustomColor(ROSE);
    expect(variables(mountSection())).toEqual(['--color-custom-1', '--color-custom-2']);
  });

  it('says so when the theme has none', () => {
    expect(mountSection().querySelector('.custom-empty')?.textContent).toBe('This theme has no custom colours.');
  });

  it('a confirmed edit moves the colour as one undo step', () => {
    addCustomColor(TEAL);
    const target = mountSection();
    const pastBefore = __getHistoryLengths().past;
    click(target.querySelector('button[aria-label="Edit --color-custom-1"]'));
    setHue(target, 40);
    click(target.querySelector('button[title="Apply changes"]'));

    expect(tokens()[0].color).toEqual({ ...TEAL, h: 40 });
    expect(__getHistoryLengths().past).toBe(pastBefore + 1);
  });

  it('a cancelled edit restores the colour and leaves no undo step', () => {
    addCustomColor(TEAL);
    const target = mountSection();
    const pastBefore = __getHistoryLengths().past;
    click(target.querySelector('button[aria-label="Edit --color-custom-1"]'));
    setHue(target, 40);
    click(target.querySelector('button[title="Discard changes"]'));

    expect(tokens()[0].color).toEqual(TEAL);
    expect(__getHistoryLengths().past).toBe(pastBefore);
  });

  it('removes a colour nothing names at once', () => {
    addCustomColor(TEAL);
    const target = mountSection();
    click(target.querySelector('button[aria-label="Remove --color-custom-1"]'));

    expect(tokens()).toEqual([]);
    expect(target.querySelector('.replace-step')).toBeNull();
  });

  it('removes a colour a slot names through the replace step', () => {
    addCustomColor(TEAL);
    addCustomColor(ROSE);
    mutate('seed usage', (s) => {
      s.components.button = { aliases: { '--button-bg': { kind: 'token', name: '--color-custom-1', opacity: 60 } }, config: {} };
    });
    const target = mountSection();
    click(target.querySelector('button[aria-label="Remove --color-custom-1"]'));

    expect(tokens()).toHaveLength(2);
    expect(target.querySelector('.replace-usage')?.textContent).toMatch(/^Used by 1 property in /);
    const replaceAndRemove = Array.from(target.querySelectorAll('button'))
      .find((b) => b.textContent?.trim() === 'Replace and remove');
    click(replaceAndRemove);

    expect(tokens().map((t) => t.variable)).toEqual(['--color-custom-2']);
    const alias = get(editorState).components.button.aliases['--button-bg'];
    expect(alias).toMatchObject({ kind: 'token', opacity: 60 });
    expect(alias).not.toMatchObject({ name: '--color-custom-1' });
  });

  it('a cancelled replace step changes nothing', () => {
    addCustomColor(TEAL);
    mutate('seed usage', (s) => {
      s.components.button = { aliases: { '--button-bg': { kind: 'token', name: '--color-custom-1' } }, config: {} };
    });
    const target = mountSection();
    click(target.querySelector('button[aria-label="Remove --color-custom-1"]'));
    const cancel = Array.from(target.querySelectorAll('.replace-actions button'))
      .find((b) => b.textContent?.trim() === 'Cancel');
    click(cancel);

    expect(tokens()).toHaveLength(1);
    expect(target.querySelector('.replace-step')).toBeNull();
    expect(get(editorState).components.button.aliases['--button-bg']).toEqual({ kind: 'token', name: '--color-custom-1' });
  });
});
