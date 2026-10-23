// @vitest-environment happy-dom

import { afterEach, describe, expect, it } from 'vitest';
import { flushSync, mount, unmount } from 'svelte';
import ImageLightbox from '../ImageLightbox.svelte';

let app: ReturnType<typeof mount> | undefined;

afterEach(() => {
  if (app) unmount(app);
  app = undefined;
  document.body.innerHTML = '';
});

function tileFit(props: Record<string, unknown>): string {
  app = mount(ImageLightbox, { target: document.body, props: { src: 'tile.png', alt: 'Tile', ...props } });
  flushSync();
  return document.querySelector<HTMLElement>('.image-lightbox-thumb')!.style.getPropertyValue('--imagelightbox-tile-object-fit');
}

describe('ImageLightbox tile fit', () => {
  it('follows the theme until an instance sets fit', () => {
    expect(tileFit({})).toBe('');
  });

  it('lets an instance set its own fit', () => {
    expect(tileFit({ fit: 'cover' })).toBe('cover');
  });
});
