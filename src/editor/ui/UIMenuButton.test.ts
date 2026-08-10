// @vitest-environment happy-dom
//
// Pins UIMenuButton's interaction contract through HarmonyAxesList, its real
// composition: option primitives in the body, two trigger forms per row rules.

import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { flushSync, mount, unmount } from 'svelte';
import { get } from 'svelte/store';
import HarmonyAxesList from './colors/HarmonyAxesList.svelte';
import { HARMONY_ELIGIBLE, type HarmonyMode } from '../core/palettes/colorHarmony';
import { editorState, __resetForTests } from '../core/store/editorStore';

// happy-dom lacks Web Animations; the tray's animate:flip probes both on reorder.
Element.prototype.getAnimations ??= () => [];
Element.prototype.animate ??= () =>
  ({ cancel() {}, finish() {}, finished: Promise.resolve(), onfinish: null }) as unknown as Animation;

let target: HTMLDivElement;
let component: ReturnType<typeof mount> | null = null;

beforeEach(() => {
  __resetForTests();
  document.body.innerHTML = '';
  target = document.createElement('div');
  document.body.appendChild(target);
});

afterEach(() => {
  if (component) {
    unmount(component);
    component = null;
  }
  document.body.innerHTML = '';
});

function mountList(activeMode: HarmonyMode = 'custom') {
  component = mount(HarmonyAxesList, {
    target,
    props: { activeMode, selected: null, onSelect: () => {} },
  });
  flushSync();
}

const frame = () => new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));

function keydown(el: Element, key: string) {
  el.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true }));
  flushSync();
}

// The component positions and focuses behind a double rAF; two awaited frames
// land after that work.
async function openMenu(trigger: HTMLButtonElement, key?: 'ArrowDown' | 'ArrowUp') {
  if (key) {
    keydown(trigger, key);
  } else {
    trigger.click();
    flushSync();
  }
  await frame();
  await frame();
}

const rows = () => Array.from(target.querySelectorAll<HTMLElement>('.axis-row'));
const triggerOf = (row: HTMLElement) => row.querySelector<HTMLButtonElement>('[aria-haspopup="menu"]');
const menu = () => document.querySelector<HTMLElement>('[role="menu"]');
const menuItems = () => Array.from(menu()!.querySelectorAll<HTMLButtonElement>('button'));
const itemNamed = (text: string) => menuItems().find((b) => (b.textContent ?? '').includes(text))!;
const focused = () => document.activeElement;

describe('trigger semantics', () => {
  it('declares aria-haspopup="menu" and flips aria-expanded across open and close', async () => {
    mountList();
    const trigger = triggerOf(rows()[0])!;
    expect(trigger.getAttribute('aria-haspopup')).toBe('menu');
    expect(trigger.getAttribute('aria-expanded')).toBe('false');
    await openMenu(trigger);
    expect(trigger.getAttribute('aria-expanded')).toBe('true');
    keydown(focused()!, 'Escape');
    expect(trigger.getAttribute('aria-expanded')).toBe('false');
  });
});

describe('per-row trigger rules', () => {
  it('gives every bound row a trigger, on-wheel and off-wheel alike', () => {
    mountList('complementary');
    const [r1, r2, offWheel] = rows();
    expect(triggerOf(r1)).not.toBeNull();
    expect(triggerOf(r2)).not.toBeNull();
    expect(triggerOf(offWheel)).not.toBeNull();
  });

  it('renders "Assign a color…" as the trigger of an empty active row', () => {
    mountList('custom');
    expect(triggerOf(rows()[3])!.textContent).toContain('Assign a color…');
  });

  it('renders no trigger on an unused row', () => {
    mountList('complementary');
    expect(triggerOf(rows()[3])).toBeNull();
  });
});

describe('opening', () => {
  it('click opens the menu with the first item focused', async () => {
    mountList();
    await openMenu(triggerOf(rows()[0])!);
    expect(menu()).not.toBeNull();
    expect(focused()).toBe(menuItems()[0]);
  });

  it('ArrowDown on the closed trigger opens the menu focusing the first item', async () => {
    mountList();
    await openMenu(triggerOf(rows()[0])!, 'ArrowDown');
    expect(focused()).toBe(menuItems()[0]);
  });

  it('ArrowUp on the closed trigger opens the menu focusing the last item', async () => {
    mountList();
    await openMenu(triggerOf(rows()[0])!, 'ArrowUp');
    const items = menuItems();
    expect(focused()).toBe(items[items.length - 1]);
  });
});

describe('menu semantics', () => {
  it('names the popup after the axis and stamps every composed button as a menu item', async () => {
    mountList();
    await openMenu(triggerOf(rows()[3])!);
    expect(menu()!.getAttribute('aria-label')).toBe('Assign to axis 4');
    const items = menuItems();
    expect(items.length).toBe(HARMONY_ELIGIBLE.length + 1);
    for (const item of items) {
      expect(item.getAttribute('role')).toBe('menuitem');
      expect(item.getAttribute('tabindex')).toBe('-1');
    }
  });

  it('names the anchor menu "Assign to anchor"', async () => {
    mountList();
    await openMenu(triggerOf(rows()[0])!);
    expect(menu()!.getAttribute('aria-label')).toBe('Assign to anchor');
  });
});

describe('arrow navigation', () => {
  it('cycles the items and wraps at both ends', async () => {
    mountList();
    await openMenu(triggerOf(rows()[0])!);
    const items = menuItems();
    keydown(focused()!, 'ArrowDown');
    expect(focused()).toBe(items[1]);
    keydown(focused()!, 'ArrowUp');
    expect(focused()).toBe(items[0]);
    keydown(focused()!, 'ArrowUp');
    expect(focused()).toBe(items[items.length - 1]);
    keydown(focused()!, 'ArrowDown');
    expect(focused()).toBe(items[0]);
  });

  it('Home and End jump to the first and last item', async () => {
    mountList();
    await openMenu(triggerOf(rows()[0])!);
    const items = menuItems();
    keydown(focused()!, 'End');
    expect(focused()).toBe(items[items.length - 1]);
    keydown(focused()!, 'Home');
    expect(focused()).toBe(items[0]);
  });
});

describe('closing', () => {
  it('Escape closes the menu and returns focus to the trigger', async () => {
    mountList();
    const trigger = triggerOf(rows()[0])!;
    await openMenu(trigger);
    keydown(focused()!, 'Escape');
    expect(menu()).toBeNull();
    expect(focused()).toBe(trigger);
  });

  it('Tab closes the menu and returns focus to the trigger', async () => {
    mountList();
    const trigger = triggerOf(rows()[0])!;
    await openMenu(trigger);
    keydown(focused()!, 'Tab');
    expect(menu()).toBeNull();
    expect(focused()).toBe(trigger);
  });

  it('outside mousedown closes the menu without stealing focus', async () => {
    mountList();
    await openMenu(triggerOf(rows()[0])!);
    const outside = document.createElement('button');
    document.body.appendChild(outside);
    outside.focus();
    outside.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }));
    flushSync();
    expect(menu()).toBeNull();
    expect(focused()).toBe(outside);
  });
});

describe('store wiring', () => {
  it('selecting a family assigns it to the row axis and closes the menu', async () => {
    mountList();
    await openMenu(triggerOf(rows()[3])!);
    itemNamed('Special').click();
    flushSync();
    expect(get(editorState).harmonyAxes[3].family).toBe('Special');
    expect(menu()).toBeNull();
  });

  it('a family bound elsewhere says where it moves from', async () => {
    mountList();
    await openMenu(triggerOf(rows()[0])!);
    expect(itemNamed('Accent').textContent).toContain('moves from axis 2');
  });

  it('"Leave empty" unassigns the row family', async () => {
    mountList();
    await openMenu(triggerOf(rows()[2])!);
    itemNamed('Leave empty').click();
    flushSync();
    expect(get(editorState).harmonyAxes[2].family).toBeNull();
  });
});
