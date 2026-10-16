// @vitest-environment happy-dom
import { beforeEach, describe, expect, it } from 'vitest';
import { flushSync, mount, unmount } from 'svelte';
import { get } from 'svelte/store';
import UIPaletteSelector from './UIPaletteSelector.svelte';
import {
  __getHistoryLengths,
  __resetForTests,
  addCustomColor,
  editorState,
  mutate,
} from '../core/store/editorStore';

const SLOT = '--test-slot-color';

beforeEach(() => {
  __resetForTests();
  document.body.innerHTML = '';
  document.documentElement.style.removeProperty(SLOT);
});

function mountPicker(): { target: HTMLElement; destroy: () => void } {
  const target = document.createElement('div');
  document.body.appendChild(target);
  const component = mount(UIPaletteSelector, { target, props: { variable: SLOT } });
  flushSync();
  return { target, destroy: () => unmount(component) };
}

function click(el: Element | null | undefined): void {
  if (!el) throw new Error('element not found');
  (el as HTMLElement).click();
  flushSync();
}

function byText(target: HTMLElement, selector: string, text: string): HTMLElement | undefined {
  return Array.from(target.querySelectorAll<HTMLElement>(selector)).find((el) => el.textContent?.trim() === text);
}

function openCustom(target: HTMLElement): void {
  click(target.querySelector('button.ui-ts-trigger'));
  click(byText(target, 'button.family-item', 'Custom'));
}

function setOpacity(target: HTMLElement, pct: number): void {
  const input = target.querySelector<HTMLInputElement>('input.opacity-input')!;
  input.value = String(pct);
  input.dispatchEvent(new Event('input', { bubbles: true }));
  input.dispatchEvent(new Event('change', { bubbles: true }));
  flushSync();
}

const meta = (target: HTMLElement) => target.querySelector('.ui-ts-meta-text')?.textContent?.trim();

describe('UIPaletteSelector custom colours', () => {
  it.each([
    [100, 'var(--color-custom-1)', 'color-custom-1'],
    [60, 'color-mix(in srgb, var(--color-custom-1) 60%, transparent)', 'color-custom-1 (60%)'],
  ])('selects, reopens and reads the meta at %i%% opacity', (pct, written, label) => {
    addCustomColor({ l: 0.62, c: 0.11, h: 190 });
    const first = mountPicker();
    openCustom(first.target);
    if (pct < 100) setOpacity(first.target, pct);
    click(byText(first.target, 'button.step-item', '1'));

    expect(document.documentElement.style.getPropertyValue(SLOT)).toBe(written);
    expect(meta(first.target)).toBe(label);
    first.destroy();

    const reopened = mountPicker();
    expect(meta(reopened.target)).toBe(label);
  });

  it('a cancelled add removes the new colour, restores the slot, and leaves no undo step', () => {
    document.documentElement.style.setProperty(SLOT, 'var(--color-white)');
    const { target } = mountPicker();
    const pastBefore = __getHistoryLengths().past;
    openCustom(target);
    click(target.querySelector('button[aria-label="Add a custom colour"]'));

    expect(get(editorState).customColors.tokens.map((t) => t.variable)).toEqual(['--color-custom-1']);
    expect(document.documentElement.style.getPropertyValue(SLOT)).toBe('var(--color-custom-1)');

    click(target.querySelector('button[title="Discard changes"]'));
    expect(get(editorState).customColors.tokens).toEqual([]);
    expect(document.documentElement.style.getPropertyValue(SLOT)).toBe('var(--color-white)');
    expect(__getHistoryLengths().past).toBe(pastBefore);
  });

  it('a confirmed add keeps the colour on the slot as one undo step', () => {
    const { target } = mountPicker();
    const pastBefore = __getHistoryLengths().past;
    openCustom(target);
    click(target.querySelector('button[aria-label="Add a custom colour"]'));
    click(target.querySelector('button[title="Apply changes"]'));

    expect(get(editorState).customColors.tokens).toHaveLength(1);
    expect(meta(target)).toBe('color-custom-1');
    expect(__getHistoryLengths().past).toBe(pastBefore + 1);
  });

  it('removing a colour nothing names deletes it from the swatch at once', () => {
    addCustomColor({ l: 0.62, c: 0.11, h: 190 });
    const { target } = mountPicker();
    openCustom(target);
    click(target.querySelector('button[aria-label="Remove custom colour 1"]'));

    expect(get(editorState).customColors.tokens).toEqual([]);
    expect(target.querySelector('.replace-usage')).toBeNull();
  });

  it('cancelling the replace step keeps the colour', () => {
    addCustomColor({ l: 0.62, c: 0.11, h: 190 });
    mutate('seed usage', (s) => {
      s.components.button = { aliases: { '--button-bg': { kind: 'token', name: '--color-custom-1' } }, config: {} };
    });
    const { target } = mountPicker();
    openCustom(target);
    click(target.querySelector('button[aria-label="Remove custom colour 1"]'));
    click(byText(target, 'button', 'Cancel'));

    expect(get(editorState).customColors.tokens).toHaveLength(1);
    expect(target.querySelector('.replace-usage')).toBeNull();
  });

  it('removing a colour a slot names replaces it through the replace step', () => {
    addCustomColor({ l: 0.62, c: 0.11, h: 190 });
    mutate('seed usage', (s) => {
      s.components.button = { aliases: { '--button-bg': { kind: 'token', name: '--color-custom-1', opacity: 60 } }, config: {} };
    });
    const { target } = mountPicker();
    openCustom(target);
    click(target.querySelector('button[aria-label="Remove custom colour 1"]'));

    expect(target.querySelector('.replace-usage')?.textContent).toMatch(/^Used by 1 property in /);
    click(byText(target, 'button', 'Replace and remove'));

    const s = get(editorState);
    expect(s.customColors.tokens).toEqual([]);
    expect(s.components.button.aliases['--button-bg']).toMatchObject({ kind: 'token', opacity: 60 });
    expect(s.components.button.aliases['--button-bg']).not.toMatchObject({ name: '--color-custom-1' });
  });
});
