// @vitest-environment happy-dom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { flushSync, mount, tick, unmount } from 'svelte';
import { get } from 'svelte/store';
import { __resetForTests, editorState } from '../../core/store/editorStore';
import TextStylesSection from './TextStylesSection.svelte';

vi.mock('../../core/palettes/tokenRegistry', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../core/palettes/tokenRegistry')>();
  const { typeScaleDeclarations } = await import('../../core/typeScale/typeScale');
  const declared = new Map(typeScaleDeclarations().map((d) => [d.name, d.value]));
  return { ...actual, getDeclaredValue: (name: string) => declared.get(name) ?? null };
});

let component: ReturnType<typeof mount> | null = null;

beforeEach(() => {
  __resetForTests();
  document.body.innerHTML = '';
  component = mount(TextStylesSection, { target: document.body });
  flushSync();
});

afterEach(() => {
  if (component) unmount(component);
  component = null;
});

const tabs = () => Array.from(document.querySelectorAll<HTMLButtonElement>('[role="tab"]'));
const selected = () => tabs().find((t) => t.getAttribute('aria-selected') === 'true')!;
const label = (tab: HTMLElement) => tab.firstChild?.textContent?.trim();

async function press(key: string) {
  document.activeElement!.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true }));
  flushSync();
  await tick();
}

describe('TextStylesSection', () => {
  it('renders a tab per usage with the heading tab selected', () => {
    expect(tabs().map(label)).toEqual(['Display', 'Heading', 'Body', 'Editorial', 'Code']);
    expect(label(selected())).toBe('Heading');
    expect(tabs().map((t) => t.tabIndex)).toEqual([-1, 0, -1, -1, -1]);
    expect(selected().textContent).toContain('Major third');
  });

  it('moves between tabs with the arrow keys, Home and End', async () => {
    selected().focus();
    await press('ArrowRight');
    expect(label(selected())).toBe('Body');
    expect(document.activeElement).toBe(selected());
    await press('ArrowLeft');
    expect(label(selected())).toBe('Heading');
    await press('End');
    expect(label(selected())).toBe('Code');
    await press('ArrowRight');
    expect(label(selected())).toBe('Display');
    await press('Home');
    expect(label(selected())).toBe('Display');
  });

  it('renders seven step rows, and the Body tab adds the eyebrow', async () => {
    const names = () => Array.from(document.querySelectorAll('.step-name')).map((n) => n.textContent);
    expect(names()).toEqual(['heading-2xl', 'heading-xl', 'heading-lg', 'heading-md', 'heading-sm', 'heading-xs', 'heading-2xs']);
    selected().focus();
    await press('ArrowRight');
    expect(names()).toHaveLength(8);
    expect(names().at(-1)).toBe('eyebrow');
  });

  it('stores a typed size through the store', () => {
    const input = document.querySelector<HTMLInputElement>('input[aria-label="heading-xl phone size in px"]')!;
    input.value = '30';
    input.dispatchEvent(new Event('change', { bubbles: true }));
    flushSync();
    expect(get(editorState).cssVars).toEqual({ '--heading-xl-phone-font-size': '1.875rem' });
    expect(document.querySelector('[aria-label="Reset heading-xl phone size to default"]')).not.toBeNull();
  });
});
