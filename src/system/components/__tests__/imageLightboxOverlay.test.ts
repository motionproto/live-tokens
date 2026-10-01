// @vitest-environment happy-dom

import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { createRawSnippet, flushSync, mount, tick, unmount } from 'svelte';
import ImageLightbox from '../ImageLightbox.svelte';

let animated: Element[] = [];
let restore: (() => void) | undefined;

beforeEach(() => {
  document.body.innerHTML = '';
  animated = [];
  const proto = Element.prototype as unknown as Record<string, unknown>;
  proto.animate = function (this: Element) {
    animated.push(this);
    const anim = { onfinish: null as null | (() => void), cancel() {}, commitStyles() {} };
    queueMicrotask(() => anim.onfinish?.());
    return anim;
  };
  proto.getAnimations = () => [];
  restore = () => {
    delete proto.animate;
    delete proto.getAnimations;
  };
});

afterEach(() => {
  restore?.();
  document.body.style.overflow = '';
});

async function settle() {
  flushSync();
  await tick();
  await Promise.resolve();
  flushSync();
}

const badge = createRawSnippet(() => ({ render: () => '<span class="test-badge">AI</span>' }));
const thumbCopy = () => document.querySelector<HTMLElement>('.image-lightbox-wrapper .image-lightbox-attached');
const stageCopy = () => document.querySelector<HTMLElement>('.image-lightbox-stage .image-lightbox-attached');

describe('ImageLightbox overlay', () => {
  it('renders nothing extra without an overlay', () => {
    const c = mount(ImageLightbox, { target: document.body, props: { src: 'a.png', alt: 'A' } });
    flushSync();
    expect(document.querySelector('.image-lightbox-attached')).toBeNull();
    unmount(c);
  });

  it('sits beside the thumbnail, outside its clip', () => {
    const c = mount(ImageLightbox, { target: document.body, props: { src: 'a.png', alt: 'A', overlay: badge } });
    flushSync();
    expect(thumbCopy()?.querySelector('.test-badge')).not.toBeNull();
    expect(document.querySelector('.image-lightbox-thumb .test-badge')).toBeNull();
    unmount(c);
  });

  it('travels into the stage on open and hides the thumbnail copy', async () => {
    const c = mount(ImageLightbox, { target: document.body, props: { src: 'a.png', alt: 'A', overlay: badge } });
    flushSync();
    document.querySelector<HTMLButtonElement>('.image-lightbox-thumb')!.click();
    await settle();

    expect(stageCopy()?.querySelector('.test-badge')).not.toBeNull();
    expect(stageCopy()?.closest('.image-lightbox-clip')).toBeNull();
    expect(thumbCopy()?.classList.contains('away')).toBe(true);
    expect(animated).toContain(stageCopy());
    unmount(c);
  });

  it('returns to the thumbnail on close', async () => {
    const c = mount(ImageLightbox, { target: document.body, props: { src: 'a.png', alt: 'A', overlay: badge } });
    flushSync();
    document.querySelector<HTMLButtonElement>('.image-lightbox-thumb')!.click();
    await settle();
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    await settle();

    expect(stageCopy()).toBeNull();
    expect(thumbCopy()?.classList.contains('away')).toBe(false);
    unmount(c);
  });
});
