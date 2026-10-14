import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { stripMediaBlocks } from '../parsers/mediaBlocks';
import { COLUMN_DEFAULTS, COLUMN_MAX_WIDTH_NAME, COLUMN_VIEWPORTS, columnVarName } from './columns';

const TOKENS_CSS = readFileSync(resolve(process.cwd(), 'src/system/styles/tokens.css'), 'utf8');

function rootValues(css: string): Map<string, string> {
  return new Map([...css.matchAll(/(--[a-z0-9-]+)\s*:\s*([^;}]*);/gi)].map((m) => [m[1], m[2].trim()]));
}

describe('column defaults', () => {
  it('match the values tokens.css declares', () => {
    const declared = rootValues(stripMediaBlocks(TOKENS_CSS));
    expect(declared.get(COLUMN_MAX_WIDTH_NAME)).toBe(`${COLUMN_DEFAULTS.maxWidth}px`);
    for (const viewport of COLUMN_VIEWPORTS) {
      const values = COLUMN_DEFAULTS.viewports[viewport];
      expect(declared.get(columnVarName(viewport, 'count'))).toBe(String(values.count));
      expect(declared.get(columnVarName(viewport, 'gutter'))).toBe(`${values.gutter}px`);
      expect(declared.get(columnVarName(viewport, 'margin'))).toBe(`${values.margin}px`);
    }
  });
});
