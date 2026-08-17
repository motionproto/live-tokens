// @vitest-environment happy-dom

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { flushSync, mount, tick, unmount } from 'svelte';
import SectionDivider from '../SectionDivider.svelte';

type Box = { x: number; y: number; width: number; height: number };

let originalFontsDescriptor: PropertyDescriptor | undefined;
let originalGetBBox: PropertyDescriptor | undefined;

beforeEach(() => {
  document.body.innerHTML = '';
  document.documentElement.removeAttribute('style');
  originalFontsDescriptor = Object.getOwnPropertyDescriptor(document, 'fonts');
  originalGetBBox = Object.getOwnPropertyDescriptor(SVGTextElement.prototype, 'getBBox');
});

afterEach(() => {
  vi.unstubAllGlobals();
  if (originalFontsDescriptor) Object.defineProperty(document, 'fonts', originalFontsDescriptor);
  else Reflect.deleteProperty(document, 'fonts');
  if (originalGetBBox) Object.defineProperty(SVGTextElement.prototype, 'getBBox', originalGetBBox);
  else Reflect.deleteProperty(SVGTextElement.prototype, 'getBBox');
});

function installBBox(read: () => Box): void {
  Object.defineProperty(SVGTextElement.prototype, 'getBBox', {
    configurable: true,
    value: vi.fn(() => read()),
  });
}

describe('SectionDivider live computed-style bridge', () => {
  it('remeasures SVG text when a webfont finishes loading', async () => {
    let box: Box = { x: 0, y: 0, width: 100, height: 24 };
    installBBox(() => box);
    const fonts = new EventTarget() as EventTarget & { ready: Promise<void> };
    fonts.ready = new Promise(() => {});
    Object.defineProperty(document, 'fonts', { configurable: true, value: fonts });

    const target = document.createElement('div');
    document.body.appendChild(target);
    const component = mount(SectionDivider, { target, props: { title: 'Live title' } });
    await tick();
    flushSync();
    const svg = target.querySelector('svg.divider-label')!;
    fonts.dispatchEvent(new Event('loadingdone'));
    flushSync();
    expect(svg.getAttribute('width')).toBe('100');

    box = { x: 0, y: 0, width: 214, height: 31 };
    fonts.dispatchEvent(new Event('loadingdone'));
    flushSync();

    expect(svg.getAttribute('width')).toBe('214');
    expect(svg.getAttribute('height')).toBe('31');
    unmount(component);
  });

  it('refreshes outline filter attributes after a root token mutation', async () => {
    installBBox(() => ({ x: 0, y: 0, width: 120, height: 28 }));
    const fonts = new EventTarget() as EventTarget & { ready: Promise<void> };
    fonts.ready = new Promise(() => {});
    Object.defineProperty(document, 'fonts', { configurable: true, value: fonts });

    let outlineWidth = '12px';
    let outlineColor = 'rgb(150, 20, 30)';
    vi.stubGlobal('getComputedStyle', () => ({
      getPropertyValue: (name: string) =>
        name === '--_divider-title-outline-width' ? outlineWidth
          : name === '--_divider-title-outline-color' ? outlineColor
          : '',
    }));

    const target = document.createElement('div');
    document.body.appendChild(target);
    const component = mount(SectionDivider, { target, props: { title: 'Outlined' } });
    flushSync();
    const morphology = target.querySelector('feMorphology')!;
    const flood = target.querySelector('feFlood')!;
    expect(morphology.getAttribute('radius')).toBe('6');
    expect(flood.getAttribute('flood-color')).toBe('rgb(150, 20, 30)');

    outlineWidth = '4px';
    outlineColor = 'rgb(10, 80, 120)';
    document.documentElement.style.setProperty('--audit-trigger', '1');
    await Promise.resolve();
    flushSync();

    expect(morphology.getAttribute('radius')).toBe('2');
    expect(flood.getAttribute('flood-color')).toBe('rgb(10, 80, 120)');
    unmount(component);
  });
});
