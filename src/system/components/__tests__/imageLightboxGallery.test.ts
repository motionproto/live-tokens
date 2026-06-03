// @vitest-environment happy-dom
//
// Behavior pins for ImageLightbox gallery mode. happy-dom has no WAAPI, so a
// minimal Element.prototype.animate / getAnimations shim stands in: it records
// every animate() call (element + keyframes) and fires onfinish on a microtask
// so the close/nav lifecycle resolves. Geometry isn't asserted (rects are zero
// here) — only the index/counter state, the thumbnail's aspect-ratio, and the
// keyframes the component asks the browser for.

import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { mount, unmount, flushSync, tick } from 'svelte';
import ImageLightbox from '../ImageLightbox.svelte';

interface AnimCall {
  el: Element;
  keyframes: Keyframe[];
  options: KeyframeAnimationOptions | number | undefined;
}

let animCalls: AnimCall[] = [];
let restoreAnimate: (() => void) | undefined;

class FakeAnimation {
  onfinish: (() => void) | null = null;
  oncancel: (() => void) | null = null;
  constructor() {
    // onfinish is assigned by the caller synchronously after animate() returns,
    // so defer the callback to a microtask — it's set by the time this fires.
    queueMicrotask(() => this.onfinish?.());
  }
  cancel() {}
  commitStyles() {}
  finish() { this.onfinish?.(); }
}

function installWaapiShim() {
  const proto = Element.prototype as unknown as Record<string, unknown>;
  const hadAnimate = 'animate' in proto;
  const hadGetAnimations = 'getAnimations' in proto;
  proto.animate = function (
    this: Element,
    keyframes: Keyframe[],
    options?: KeyframeAnimationOptions | number,
  ) {
    animCalls.push({ el: this, keyframes: keyframes ?? [], options });
    return new FakeAnimation() as unknown as Animation;
  };
  proto.getAnimations = function () { return []; };
  restoreAnimate = () => {
    if (!hadAnimate) delete proto.animate;
    if (!hadGetAnimations) delete proto.getAnimations;
  };
}

function settable(img: HTMLImageElement, w: number, h: number) {
  Object.defineProperty(img, 'naturalWidth', { value: w, configurable: true });
  Object.defineProperty(img, 'naturalHeight', { value: h, configurable: true });
}

async function settle() {
  flushSync();
  await tick();
  await Promise.resolve();
  flushSync();
}

function fresh(): HTMLDivElement {
  const target = document.createElement('div');
  document.body.appendChild(target);
  return target;
}

// The modal portals to <body>, so query the document, not the mount target.
const wrapper = () => document.querySelector<HTMLElement>('.image-lightbox-wrapper')!;
const thumb = () => document.querySelector<HTMLButtonElement>('.image-lightbox-thumb')!;
const thumbImg = () => document.querySelector<HTMLImageElement>('.image-lightbox-thumb img')!;
const counter = () => document.querySelector<HTMLElement>('.image-lightbox-counter');
const modalImg = () =>
  document.querySelector<HTMLImageElement>('.image-lightbox-layer:not(.image-lightbox-layer-exit)')!;
const navNext = () => document.querySelector<HTMLButtonElement>('.image-lightbox-nav-next')!;
const navPrev = () => document.querySelector<HTMLButtonElement>('.image-lightbox-nav-prev')!;

const THREE = [
  { src: 'a.png', alt: 'A' },
  { src: 'b.png', alt: 'B' },
  { src: 'c.png', alt: 'C' },
];

function translateX(transform: unknown): number {
  const m = /translateX\((-?\d+(?:\.\d+)?)px\)/.exec(String(transform ?? ''));
  if (!m) throw new Error(`no translateX in: ${String(transform)}`);
  return Number(m[1]);
}

async function open(target: HTMLElement) {
  // Cover load gives the thumbnail its aspect before opening.
  settable(thumbImg(), 1600, 1000); // 1.6
  thumbImg().dispatchEvent(new Event('load'));
  thumb().click();
  await settle();
}

beforeEach(() => {
  document.body.innerHTML = '';
  animCalls = [];
  installWaapiShim();
});

afterEach(() => {
  restoreAnimate?.();
  document.body.style.overflow = '';
});

describe('ImageLightbox gallery — index & counter', () => {
  it('next/prev advance the counter and wrap at both ends', async () => {
    const target = fresh();
    const c = mount(ImageLightbox, { target, props: { images: THREE } });
    flushSync();
    await open(target);

    expect(counter()?.textContent?.trim()).toBe('1 / 3');

    navNext().click(); await settle();
    expect(counter()?.textContent?.trim()).toBe('2 / 3');

    navNext().click(); await settle();
    expect(counter()?.textContent?.trim()).toBe('3 / 3');

    navNext().click(); await settle(); // wrap forward
    expect(counter()?.textContent?.trim()).toBe('1 / 3');

    navPrev().click(); await settle(); // wrap backward
    expect(counter()?.textContent?.trim()).toBe('3 / 3');

    unmount(c);
  });

  it('closing resets the index to the first image', async () => {
    const target = fresh();
    const c = mount(ImageLightbox, { target, props: { images: THREE } });
    flushSync();
    await open(target);

    navNext().click(); await settle();
    expect(counter()?.textContent?.trim()).toBe('2 / 3');

    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    await settle();
    expect(counter()).toBeNull(); // modal unmounted

    await open(target); // reopen
    expect(counter()?.textContent?.trim()).toBe('1 / 3');

    unmount(c);
  });

  it('a single-image array renders no gallery chrome', async () => {
    const target = fresh();
    const c = mount(ImageLightbox, { target, props: { images: [THREE[0]] } });
    flushSync();
    settable(thumbImg(), 1600, 1000);
    thumbImg().dispatchEvent(new Event('load'));
    thumb().click();
    await settle();

    expect(counter()).toBeNull();
    expect(document.querySelector('.image-lightbox-nav')).toBeNull();

    unmount(c);
  });
});

describe('ImageLightbox gallery — thumbnail aspect independence (guards B1)', () => {
  it('paging to an image with a different ratio does not change the thumbnail box', async () => {
    const target = fresh();
    const c = mount(ImageLightbox, { target, props: { images: THREE } });
    flushSync();
    await open(target); // cover ratio 1.6

    expect(wrapper().style.aspectRatio).toBe('1.6 / 1');

    // Navigate; the incoming modal image reports a very different ratio.
    navNext().click();
    await settle();
    settable(modalImg(), 500, 1000); // 0.5 (portrait)
    modalImg().dispatchEvent(new Event('load'));
    await settle();

    // The inline thumbnail must still reflect the cover (items[0]) ratio.
    expect(wrapper().style.aspectRatio).toBe('1.6 / 1');

    // And it survives a close back to index 0.
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    await settle();
    expect(wrapper().style.aspectRatio).toBe('1.6 / 1');

    unmount(c);
  });
});

describe('ImageLightbox gallery — slide direction (guards S1)', () => {
  it('next enters from the right and exits to the left', async () => {
    const target = fresh();
    const c = mount(ImageLightbox, { target, props: { images: THREE } });
    flushSync();
    await open(target);

    animCalls = [];
    navNext().click();
    await settle();

    const incoming = animCalls.find(
      (a) =>
        a.el instanceof HTMLImageElement &&
        a.el.classList.contains('image-lightbox-layer') &&
        !a.el.classList.contains('image-lightbox-layer-exit'),
    )!;
    const outgoing = animCalls.find(
      (a) => a.el instanceof HTMLImageElement && a.el.classList.contains('image-lightbox-layer-exit'),
    )!;

    // Next = forward: new image arrives from the right (positive start X),
    // old image leaves toward the left (negative end X).
    expect(translateX(incoming.keyframes[0].transform)).toBeGreaterThan(0);
    expect(translateX(outgoing.keyframes[1].transform)).toBeLessThan(0);

    unmount(c);
  });

  it('prev mirrors next: enters from the left and exits to the right', async () => {
    const target = fresh();
    const c = mount(ImageLightbox, { target, props: { images: THREE } });
    flushSync();
    await open(target);

    animCalls = [];
    navPrev().click();
    await settle();

    const incoming = animCalls.find(
      (a) =>
        a.el instanceof HTMLImageElement &&
        a.el.classList.contains('image-lightbox-layer') &&
        !a.el.classList.contains('image-lightbox-layer-exit'),
    )!;
    const outgoing = animCalls.find(
      (a) => a.el instanceof HTMLImageElement && a.el.classList.contains('image-lightbox-layer-exit'),
    )!;

    expect(translateX(incoming.keyframes[0].transform)).toBeLessThan(0);
    expect(translateX(outgoing.keyframes[1].transform)).toBeGreaterThan(0);

    unmount(c);
  });
});
