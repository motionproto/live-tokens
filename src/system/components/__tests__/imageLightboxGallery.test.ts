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
const dialog = () => document.querySelector<HTMLElement>('[role="dialog"]');
const closeBtn = () => document.querySelector<HTMLButtonElement>('.image-lightbox-close')!;
const liveRegion = () => document.querySelector<HTMLElement>('.image-lightbox-sr');
const zoomInBtn = () =>
  document.querySelector<HTMLButtonElement>('.image-lightbox-toolbar button[aria-label="Zoom in"]')!;
const zoomPercent = () =>
  Number(/(\d+)%/.exec(document.querySelector('.image-lightbox-toolbar-label')!.textContent ?? '')![1]);

function key(name: string, opts: KeyboardEventInit = {}) {
  document.dispatchEvent(new KeyboardEvent('keydown', { key: name, bubbles: true, cancelable: true, ...opts }));
}

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

describe('ImageLightbox gallery — accessibility (guards S4)', () => {
  it('the open modal is a labelled dialog and focus moves inside it', async () => {
    const target = fresh();
    const c = mount(ImageLightbox, { target, props: { images: THREE } });
    flushSync();
    await open(target);

    const d = dialog()!;
    expect(d).not.toBeNull();
    expect(d.getAttribute('aria-modal')).toBe('true');
    expect(d.getAttribute('aria-label')).toContain('Image 1 of 3');

    // Focus landed on the close button (the modal's first control).
    expect(document.activeElement).toBe(closeBtn());

    unmount(c);
  });

  it('closing restores focus to the thumbnail trigger', async () => {
    const target = fresh();
    const c = mount(ImageLightbox, { target, props: { images: THREE } });
    flushSync();
    await open(target);
    expect(document.activeElement).toBe(closeBtn());

    key('Escape');
    await settle();
    expect(document.activeElement).toBe(thumb());

    unmount(c);
  });

  it('Tab wraps within the dialog at both ends', async () => {
    const target = fresh();
    const c = mount(ImageLightbox, { target, props: { images: THREE } });
    flushSync();
    await open(target);

    // Non-extended gallery chrome, in DOM order: close, prev, next.
    closeBtn().focus();
    key('Tab', { shiftKey: true }); // back from the first wraps to the last
    expect(document.activeElement).toBe(navNext());

    navNext().focus();
    key('Tab'); // forward from the last wraps to the first
    expect(document.activeElement).toBe(closeBtn());

    unmount(c);
  });

  it('a polite live region reports the current position and updates on nav', async () => {
    const target = fresh();
    const c = mount(ImageLightbox, { target, props: { images: THREE } });
    flushSync();
    await open(target);

    expect(liveRegion()?.getAttribute('aria-live')).toBe('polite');
    expect(liveRegion()?.textContent?.trim()).toBe('Image 1 of 3');

    navNext().click();
    await settle();
    expect(liveRegion()?.textContent?.trim()).toBe('Image 2 of 3');

    unmount(c);
  });
});

describe('ImageLightbox — maxZoom cap (natural-size)', () => {
  // The fitted modal width depends only on the (large) viewport caps and the 2:1
  // aspect, so a 200px-wide source is shown well above 100% at fit: maxZoom={1}
  // means it can't be zoomed in at all.
  const SMALL = { src: 'small.png', alt: 'Small', width: 200, height: 100 };
  const BIG = { src: 'big.png', alt: 'Big', width: 6000, height: 3000 };

  function maxOut() {
    // zoomTo always clamps to the cap, so over-clicking lands exactly at it.
    for (let i = 0; i < 12; i++) zoomInBtn().click();
    flushSync();
  }

  it('without maxZoom a small image can still zoom (default 5x-fit cap)', async () => {
    const target = fresh();
    const c = mount(ImageLightbox, { target, props: { images: [SMALL], extended: true } });
    flushSync();
    await open(target);

    expect(zoomInBtn().disabled).toBe(false);

    unmount(c);
  });

  it('maxZoom={1} forbids zooming in when the fitted image already exceeds native', async () => {
    const target = fresh();
    const c = mount(ImageLightbox, { target, props: { images: [SMALL], extended: true, maxZoom: 1 } });
    flushSync();
    await open(target);

    expect(zoomInBtn().disabled).toBe(true);

    unmount(c);
  });

  it('the cap scales linearly with maxZoom and halts further zoom-in', async () => {
    const t1 = fresh();
    const c1 = mount(ImageLightbox, { target: t1, props: { images: [BIG], extended: true, maxZoom: 1 } });
    flushSync();
    await open(t1);
    maxOut();
    const at1x = zoomPercent();
    expect(zoomInBtn().disabled).toBe(true);
    zoomInBtn().click(); // a click past the cap is a no-op
    flushSync();
    expect(zoomPercent()).toBe(at1x);
    unmount(c1);

    document.body.innerHTML = '';
    const t2 = fresh();
    const c2 = mount(ImageLightbox, { target: t2, props: { images: [BIG], extended: true, maxZoom: 2 } });
    flushSync();
    await open(t2);
    maxOut();
    const at2x = zoomPercent();
    unmount(c2);

    // maxZoom={2} permits twice the magnification of maxZoom={1} (±1% rounding).
    expect(Math.abs(at2x - 2 * at1x)).toBeLessThanOrEqual(1);
  });
});

describe('ImageLightbox — capNatural (open-fit cap)', () => {
  // happy-dom reports a real window.innerWidth/Height, so viewportTarget()
  // yields concrete geometry: the stage's open animation ends at the fitted
  // width, which capNatural clamps to the source's natural width.
  const SMALL = { src: 'small.png', alt: 'Small', width: 200, height: 100 };
  const BIG = { src: 'big.png', alt: 'Big', width: 6000, height: 3000 };

  function openWidth(): number {
    const call = animCalls
      .filter((a) => a.el instanceof HTMLElement && a.el.classList.contains('image-lightbox-stage'))
      .at(-1)!;
    const to = call.keyframes.at(-1)!;
    return Number(/(-?\d+(?:\.\d+)?)px/.exec(String(to.width))![1]);
  }

  it('without capNatural a small source is upscaled to fill the viewport', async () => {
    const target = fresh();
    const c = mount(ImageLightbox, { target, props: { images: [SMALL], extended: true } });
    flushSync();
    await open(target);
    expect(openWidth()).toBeGreaterThan(SMALL.width);
    unmount(c);
  });

  it('capNatural caps the open width at the source natural width', async () => {
    const target = fresh();
    const c = mount(ImageLightbox, { target, props: { images: [SMALL], extended: true, capNatural: true } });
    flushSync();
    await open(target);
    expect(openWidth()).toBe(SMALL.width);
    unmount(c);
  });

  it('capNatural leaves a large source fitting the viewport (no effect)', async () => {
    const target = fresh();
    const c = mount(ImageLightbox, { target, props: { images: [BIG], extended: true, capNatural: true } });
    flushSync();
    await open(target);
    expect(openWidth()).toBeLessThan(BIG.width);
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
