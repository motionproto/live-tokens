// @vitest-environment node
//
// Guards the tarball regression where chapter bodies loaded via
// `import.meta.glob('./content/*.md', '?raw')` — a Vite compile-time transform
// esbuild's optimizeDeps left unexpanded inside a pre-bundled dep — so the map
// was empty and every chapter threw "Chapter not found". Bodies now come from
// the generated, transform-independent module; these assert it stays populated.

import { describe, it, expect } from 'vitest';
import { chapterIds, loadChapter } from './chapters';

describe('docs chapters', () => {
  it('resolves a non-empty body for every chapter', async () => {
    for (const id of chapterIds) {
      const md = await loadChapter(id);
      expect(md.length, id).toBeGreaterThan(0);
    }
  });

  it('rejects an unknown chapter', async () => {
    await expect(loadChapter('no-such-chapter')).rejects.toThrow('Chapter not found');
  });
});
