// @vitest-environment happy-dom
//
// The tile's fill. Light art on a light page needs a ground of its own, and the
// tile is the only box that tracks the image's geometry in both states.

import { describe, it, expect } from 'vitest';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { readFileSync } from 'node:fs';

const here = dirname(fileURLToPath(import.meta.url));
const style = readFileSync(resolve(here, '../ImageLightbox.svelte'), 'utf8')
  .match(/<style[^>]*>([\s\S]*?)<\/style>/)![1];

const rule = (selector: string) =>
  style.match(new RegExp(`\\${selector}\\s*\\{[^}]*\\}`))![0];

describe('ImageLightbox tile fill', () => {
  it('is none until a theme sets one, so cut-out art still floats on the page', () => {
    expect(style).toMatch(/--imagelightbox-tile-surface:\s*var\(--color-transparent\);/);
  });

  it('grounds the closed tile', () => {
    expect(rule('.image-lightbox-thumb')).toContain('background: var(--imagelightbox-tile-surface)');
  });

  it('follows the image into the open stage', () => {
    expect(rule('.image-lightbox-stage')).toContain('background: var(--imagelightbox-tile-surface)');
  });

  it('paints inside the tile radius, so the fill is a frame and not a slab', () => {
    expect(rule('.image-lightbox-thumb')).toContain('border-radius: var(--imagelightbox-tile-radius)');
    expect(rule('.image-lightbox-thumb')).toContain('overflow: hidden');
  });
});
