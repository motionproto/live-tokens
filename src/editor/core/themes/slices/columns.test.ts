import { readFileSync, readdirSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { stripMediaBlocks } from '../parsers/mediaBlocks';
import {
  COLUMN_DEFAULTS,
  COLUMN_MAX_WIDTH_NAME,
  COLUMN_VIEWPORTS,
  STRUCTURAL_COLUMN_NAMES,
  columnVarName,
} from './columns';

const TOKENS_CSS = readFileSync(resolve(process.cwd(), 'src/system/styles/tokens.css'), 'utf8');
const DATA = resolve(process.cwd(), 'src/live-tokens/data');

function rootValues(css: string): Map<string, string> {
  return new Map([...css.matchAll(/(--[a-z0-9-]+)\s*:\s*([^;}]*);/gi)].map((m) => [m[1], m[2].trim()]));
}

function shippedCssVariables(): [string, Record<string, string>][] {
  return ['themes', 'colors-and-type'].flatMap((dir) =>
    readdirSync(join(DATA, dir))
      .filter((file) => file.endsWith('.json') && !file.startsWith('_'))
      .map((file): [string, Record<string, string>] => {
        const doc = JSON.parse(readFileSync(join(DATA, dir, file), 'utf8'));
        return [`${dir}/${file}`, (doc.colorsAndType ?? doc).cssVariables];
      }),
  );
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

describe('structural column names', () => {
  it('appear in no shipped theme', () => {
    const files = shippedCssVariables();
    expect(files.length).toBeGreaterThan(0);
    for (const [file, vars] of files) {
      for (const name of STRUCTURAL_COLUMN_NAMES) expect(vars, file).not.toHaveProperty(name);
    }
  });

  it('appear in no tokens.generated.css declaration', () => {
    const generated = rootValues(readFileSync(join(DATA, 'tokens.generated.css'), 'utf8'));
    for (const name of STRUCTURAL_COLUMN_NAMES) expect(generated.has(name), name).toBe(false);
  });
});
