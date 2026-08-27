/**
 * `themed-padding` emits `var(--x-side, <base>)` for each side, so a per-side
 * token is an OVERRIDE SLOT: set by the editor when the user splits the
 * padding, absent otherwise. A declaration of `--x-side` that names anything
 * but the base always wins over that fallback, which makes the base token
 * inert — the padding control writes it and nothing moves. Merging split
 * padding back to a single value is the path that hits it, because merge
 * clears the per-side aliases and expects the fallback to take over.
 *
 * A side may be declared, but only against its own base: either the base
 * outright or a `var(--side, <base>)` that still falls through to it.
 */
import { describe, expect, it } from 'vitest';
import fs from 'fs';
import path from 'path';

const COMPONENTS_DIR = path.join(process.cwd(), 'src/system/components');
const SIDES = ['top', 'right', 'bottom', 'left'] as const;

function sourcesWithThemedPadding(): { file: string; src: string; bases: string[] }[] {
  return fs
    .readdirSync(COMPONENTS_DIR)
    .filter((f) => f.endsWith('.svelte'))
    .map((file) => {
      const src = fs.readFileSync(path.join(COMPONENTS_DIR, file), 'utf-8');
      const bases = [...src.matchAll(/@include themed-padding\(\s*(--[\w-]+)/g)].map((m) => m[1]);
      return { file, src, bases: [...new Set(bases)] };
    })
    .filter((e) => e.bases.length > 0);
}

describe('a split-padding base token stays live', () => {
  const entries = sourcesWithThemedPadding();

  it('finds components to inspect', () => {
    expect(entries.length).toBeGreaterThan(0);
  });

  for (const { file, src, bases } of entries) {
    for (const base of bases) {
      for (const side of SIDES) {
        it(`${file}: ${base}-${side} does not shadow ${base}`, () => {
          const decl = new RegExp(`^\\s*${base}-${side}:\\s*([^;]+);`, 'm').exec(src);
          if (!decl) return;
          const value = decl[1].trim();
          // The base directly, or a same-side lookup that falls back to a base.
          const tracksBase =
            value === `var(${base})` ||
            /^var\(--[\w-]+,\s*(var\(--[\w-]+\)|calc\([^)]*var\(--[\w-]+\)[^)]*\))\s*\)$/.test(value);
          expect(
            tracksBase,
            `${file}: \`${base}-${side}: ${value}\` outranks the themed-padding fallback, ` +
              `so editing ${base} does nothing. Name the base, or give the lookup a ` +
              `fallback to it: \`var(${base}-${side}, var(${base}))\`.`,
          ).toBe(true);
        });
      }
    }
  }
});
