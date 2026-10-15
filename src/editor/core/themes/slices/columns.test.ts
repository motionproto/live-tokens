import { readFileSync, readdirSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { stripMediaBlocks } from '../parsers/mediaBlocks';
import type { EditorState } from '../../store/editorTypes';
import {
  COLUMN_BREAKPOINTS,
  COLUMN_COUNT_NAME,
  COLUMN_DEFAULTS,
  COLUMN_MAX_WIDTH_NAME,
  COLUMN_VAR_NAMES,
  COLUMN_VIEWPORTS,
  STRUCTURAL_COLUMN_NAMES,
  columnVarName,
  columnsFromVars,
  columnsToVars,
  defaultColumns,
  loadColumnsFromVars,
  normalizeColumnsState,
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
    expect(declared.get(COLUMN_COUNT_NAME)).toBe(String(COLUMN_DEFAULTS.count));
    expect(declared.get(COLUMN_MAX_WIDTH_NAME)).toBe(`${COLUMN_DEFAULTS.maxWidth}px`);
    for (const viewport of COLUMN_VIEWPORTS) {
      const values = COLUMN_DEFAULTS.viewports[viewport];
      expect(declared.get(columnVarName(viewport, 'gutter'))).toBe(`${values.gutter}px`);
      expect(declared.get(columnVarName(viewport, 'margin'))).toBe(`${values.margin}px`);
    }
  });
});

describe('column breakpoints', () => {
  const block = (width: number) =>
    TOKENS_CSS.match(new RegExp(`@media \\(max-width: ${width}px\\) \\{[\\s\\S]*?\\n\\}`))?.[0];

  it('match the blocks that re-point the structural names in tokens.css', () => {
    for (const [viewport, width] of Object.entries(COLUMN_BREAKPOINTS)) {
      for (const name of STRUCTURAL_COLUMN_NAMES) {
        expect(block(width), `${width}px`).toContain(`${name}: var(${name.replace('--columns-', `--columns-${viewport}-`)});`);
      }
    }
  });

  it('leave --columns-count alone', () => {
    for (const width of Object.values(COLUMN_BREAKPOINTS)) {
      expect(block(width), `${width}px`).not.toContain(COLUMN_COUNT_NAME);
    }
  });
});

describe('columnsToVars', () => {
  it('emits nothing for the defaults', () => {
    expect(columnsToVars(defaultColumns())).toEqual({});
  });

  it('emits each edited value under its own name', () => {
    const columns = defaultColumns();
    columns.count = 16;
    columns.maxWidth = 1200;
    columns.viewports.tablet.gutter = 20;
    columns.viewports.phone.margin = 8;
    expect(columnsToVars(columns)).toEqual({
      '--columns-count': '16',
      '--columns-max-width': '1200px',
      '--columns-tablet-gutter': '20px',
      '--columns-phone-margin': '8px',
    });
  });

  it('round-trips through columnsFromVars', () => {
    const columns = defaultColumns();
    columns.count = 10;
    columns.viewports.desktop = { gutter: 40, margin: 8 };
    columns.viewports.phone.margin = 12;
    expect(columnsFromVars(columnsToVars(columns))).toEqual(columns);
  });
});

describe('loadColumnsFromVars', () => {
  it('claims every column name and leaves the rest of the bag', () => {
    const bag: Record<string, string> = {
      '--columns-count': '6',
      '--columns-tablet-gutter': '20px',
      '--columns-max-width': '1280px',
      '--other': '1px',
    };
    const next = { columns: defaultColumns() } as EditorState;
    loadColumnsFromVars(next, bag);
    expect(next.columns.count).toBe(6);
    expect(next.columns.viewports.tablet.gutter).toBe(20);
    expect(next.columns.maxWidth).toBe(1280);
    expect(bag).toEqual({ '--other': '1px' });
    expect(COLUMN_VAR_NAMES).toHaveLength(8);
  });
});

describe('normalizeColumnsState', () => {
  it('passes a per-viewport state through', () => {
    const columns = defaultColumns();
    expect(normalizeColumnsState(columns)).toBe(columns);
  });

  it('maps a flat session on the old defaults to today\'s defaults', () => {
    expect(normalizeColumnsState({ count: 12, maxWidth: 1440, gutter: 16, margin: 0 })).toEqual(COLUMN_DEFAULTS);
  });

  it('maps a flat session on the shipped theme values to today\'s defaults', () => {
    expect(normalizeColumnsState({ count: 12, maxWidth: 1440, gutter: 32, margin: 0 })).toEqual(COLUMN_DEFAULTS);
  });

  it('moves an edited flat session onto the count, the max width and desktop', () => {
    const columns = normalizeColumnsState({ count: 10, maxWidth: 1200, gutter: 16, margin: 48 });
    expect(columns.count).toBe(10);
    expect(columns.maxWidth).toBe(1200);
    expect(columns.viewports.desktop).toEqual({ gutter: 16, margin: 48 });
    expect(columns.viewports.phone).toEqual(COLUMN_DEFAULTS.viewports.phone);
  });
});

describe('shipped column values', () => {
  it('hold no structural or desktop column name in any shipped theme', () => {
    const files = shippedCssVariables();
    expect(files.length).toBeGreaterThan(0);
    for (const [file, vars] of files) {
      for (const name of STRUCTURAL_COLUMN_NAMES) expect(vars, file).not.toHaveProperty(name);
      expect(Object.keys(vars).filter((name) => name.startsWith('--columns-desktop-')), file).toEqual([]);
    }
  });

  it('hold no structural or desktop column name in tokens.generated.css', () => {
    const generated = rootValues(readFileSync(join(DATA, 'tokens.generated.css'), 'utf8'));
    for (const name of STRUCTURAL_COLUMN_NAMES) expect(generated.has(name), name).toBe(false);
    expect([...generated.keys()].filter((name) => name.startsWith('--columns-desktop-'))).toEqual([]);
  });
});
