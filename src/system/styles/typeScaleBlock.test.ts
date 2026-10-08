import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { stripMediaBlocks } from '../../editor/core/themes/parsers/mediaBlocks';
import {
  EDITABLE_NAMES,
  MEDIA_QUERY,
  STRUCTURAL_NAMES,
  typeScaleDeclarations,
  typeScaleMediaDeclarations,
  type CompressedViewport,
  type TokenDeclaration,
} from '../../editor/core/typeScale/typeScale';

const TOKENS_CSS = readFileSync(resolve(__dirname, 'tokens.css'), 'utf8');
const DECL_RE = /(?:^|[\s;{])(--[a-z0-9-]+)\s*:\s*([^;}]*);/gi;

function declarations(css: string): TokenDeclaration[] {
  const uncommented = css.replace(/\/\*[\s\S]*?\*\//g, '');
  return [...uncommented.matchAll(DECL_RE)].map((m) => ({ name: m[1], value: m[2].trim() }));
}

function mediaBlocks(css: string, query: string): string[] {
  const opener = `@media ${query} {`;
  const blocks: string[] = [];
  for (let at = css.indexOf(opener); at !== -1; at = css.indexOf(opener, at + 1)) {
    let depth = 0;
    for (let i = at; i < css.length; i++) {
      if (css[i] === '{') depth++;
      else if (css[i] === '}' && --depth === 0) {
        blocks.push(css.slice(at, i + 1));
        break;
      }
    }
  }
  return blocks;
}

describe('the text-style block of tokens.css', () => {
  it('declares exactly what the type-scale module emits, in order', () => {
    const typeScale = declarations(stripMediaBlocks(TOKENS_CSS)).filter(
      (d) => EDITABLE_NAMES.has(d.name) || STRUCTURAL_NAMES.has(d.name),
    );
    expect(typeScale).toEqual(typeScaleDeclarations());
  });

  for (const viewport of ['tablet', 'phone'] as CompressedViewport[]) {
    it(`re-points every structural size at ${MEDIA_QUERY[viewport]}, beside the primitive sizes`, () => {
      const blocks = mediaBlocks(TOKENS_CSS, MEDIA_QUERY[viewport]);
      expect(blocks).toHaveLength(1);
      const inBlock = declarations(blocks[0]);
      const primitives = inBlock.filter((d) => !STRUCTURAL_NAMES.has(d.name));
      expect(primitives.map((d) => d.name)).toEqual(
        ['2xl', '3xl', '4xl', '5xl', '6xl', '7xl'].map((s) => `--font-size-${s}`),
      );
      expect(inBlock.filter((d) => STRUCTURAL_NAMES.has(d.name))).toEqual(
        typeScaleMediaDeclarations(viewport),
      );
    });
  }
});
