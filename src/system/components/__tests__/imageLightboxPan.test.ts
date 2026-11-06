// @vitest-environment happy-dom
//
// happy-dom has no layout or WAAPI: the stage rect and the viewport are stubbed,
// and animate() resolves on a microtask so the open lifecycle completes.

import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { flushSync, mount, tick, unmount } from 'svelte';
import ImageLightbox from '../ImageLightbox.svelte';

const VIEW = { w: 1000, h: 800 };
const STAGE = { left: 200, top: 200, width: 600, height: 400 };

let app: ReturnType<typeof mount> | undefined;
let restore: (() => void) | undefined;

beforeEach(() => {
  const proto = Element.prototype as unknown as Record<string, unknown>;
  const saved = {
    animate: proto.animate,
    getAnimations: proto.getAnimations,
    setPointerCapture: proto.setPointerCapture,
    releasePointerCapture: proto.releasePointerCapture,
  };
  proto.animate = () => {
    const a = { onfinish: null as (() => void) | null, cancel() {}, commitStyles() {} };
    queueMicrotask(() => a.onfinish?.());
    return a;
  };
  proto.getAnimations = () => [];
  proto.setPointerCapture = () => {};
  proto.releasePointerCapture = () => {};
  Object.defineProperty(window, 'innerWidth', { value: VIEW.w, configurable: true });
  Object.defineProperty(window, 'innerHeight', { value: VIEW.h, configurable: true });
  restore = () => Object.assign(proto, saved);
});

afterEach(() => {
  if (app) unmount(app);
  app = undefined;
  restore?.();
  document.body.innerHTML = '';
  document.body.style.overflow = '';
});

const stage = () => document.querySelector<HTMLElement>('.image-lightbox-stage')!;
const transform = () => document.querySelector<HTMLElement>('.image-lightbox-transform')!;
const zoomIn = () => document.querySelector<HTMLButtonElement>('button[aria-label="Zoom in"]')!;

async function openZoomed(steps: number) {
  app = mount(ImageLightbox, {
    target: document.body,
    props: { src: 'shot.png', alt: 'Shot', width: 1200, height: 800, extended: true },
  });
  flushSync();
  document.querySelector<HTMLButtonElement>('.image-lightbox-thumb')!.click();
  flushSync();
  await tick();
  await Promise.resolve();
  stage().getBoundingClientRect = () =>
    ({ ...STAGE, right: STAGE.left + STAGE.width, bottom: STAGE.top + STAGE.height, x: STAGE.left, y: STAGE.top }) as DOMRect;
  for (let i = 0; i < steps; i++) zoomIn().click();
  flushSync();
}

function drag(dx: number, dy: number) {
  const at = { clientX: 500, clientY: 400, pointerId: 1, bubbles: true };
  stage().dispatchEvent(new PointerEvent('pointerdown', at));
  stage().dispatchEvent(new PointerEvent('pointermove', { ...at, clientX: at.clientX + dx, clientY: at.clientY + dy }));
  stage().dispatchEvent(new PointerEvent('pointerup', at));
}

function translate(): { x: number; y: number } {
  const m = /translate\((-?[\d.]+)px, (-?[\d.]+)px\)/.exec(transform().style.transform)!;
  return { x: Number(m[1]), y: Number(m[2]) };
}

describe('ImageLightbox zoomed pan', () => {
  it('lets the zoomed image spill past the stage', async () => {
    await openZoomed(1);
    expect(stage().classList.contains('zoomed')).toBe(true);
  });

  it('pans an image larger than the viewport until its edge meets the viewport edge', async () => {
    await openZoomed(3); // 3.375× → 2025 × 1350
    drag(5000, 5000);
    expect(translate()).toEqual({ x: 2025 / 2 - 500, y: 1350 / 2 - 400 });
    drag(-10000, -10000);
    expect(translate()).toEqual({ x: 1000 - 500 - 2025 / 2, y: 800 - 400 - 1350 / 2 });
  });

  it('keeps an image smaller than the viewport whole on screen', async () => {
    await openZoomed(1); // 1.5× → 900 × 600
    drag(5000, -5000);
    expect(translate()).toEqual({ x: 50, y: -100 });
  });
});
