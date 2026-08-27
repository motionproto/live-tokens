// @vitest-environment happy-dom
//
// The tile's fill. Light art on a light page needs a ground of its own, and the
// closed tile is the only box that tracks the image's geometry. The open stage
// has the overlay behind it and takes no fill of its own.

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

  it('stops at the closed tile — the open stage rides the overlay instead', () => {
    expect(rule('.image-lightbox-stage')).not.toContain('background:');
  });

  it('paints inside the tile radius, so the fill is a frame and not a slab', () => {
    expect(rule('.image-lightbox-thumb')).toContain('border-radius: var(--imagelightbox-tile-radius)');
    expect(rule('.image-lightbox-thumb')).toContain('overflow: hidden');
  });
});
