/**
 * Columns slice. The column grid holds one max width and a count, a gutter and
 * a margin per viewport. `--columns-count`, `--columns-gutter` and
 * `--columns-margin` are structural: tokens.css points them at the viewport
 * values for the window's width, and the editor never writes them.
 *
 * The editor state holds one set, which edits the max width and the desktop
 * values. A theme's tablet and phone values ride in the catch-all bag.
 */
import type { ColumnsState, EditorState } from '../../store/editorTypes';

export const COLUMN_VIEWPORTS = ['desktop', 'tablet', 'phone'] as const;
export type ColumnViewport = (typeof COLUMN_VIEWPORTS)[number];

export interface ColumnViewportValues {
  count: number;
  gutter: number;
  margin: number;
}
export type ColumnProperty = keyof ColumnViewportValues;
export const COLUMN_PROPERTIES: readonly ColumnProperty[] = ['count', 'gutter', 'margin'];

export const COLUMN_MAX_WIDTH_NAME = '--columns-max-width';

export function columnVarName(viewport: ColumnViewport, property: ColumnProperty): string {
  return `--columns-${viewport}-${property}`;
}

export const VIEWPORT_COLUMN_NAMES: readonly string[] = COLUMN_VIEWPORTS.flatMap((viewport) =>
  COLUMN_PROPERTIES.map((property) => columnVarName(viewport, property)),
);

export const STRUCTURAL_COLUMN_NAMES = ['--columns-count', '--columns-gutter', '--columns-margin'] as const;

export const COLUMN_DEFAULTS: { maxWidth: number; viewports: Record<ColumnViewport, ColumnViewportValues> } = {
  maxWidth: 1440,
  viewports: {
    desktop: { count: 12, gutter: 32, margin: 0 },
    tablet: { count: 8, gutter: 24, margin: 24 },
    phone: { count: 4, gutter: 16, margin: 16 },
  },
};

export const DEFAULT_COLUMNS: ColumnsState = { maxWidth: COLUMN_DEFAULTS.maxWidth, ...COLUMN_DEFAULTS.viewports.desktop };

export const COLUMN_VAR_NAMES = [
  COLUMN_MAX_WIDTH_NAME,
  ...COLUMN_PROPERTIES.map((property) => columnVarName('desktop', property)),
] as const;

export function columnsToVars(c: ColumnsState): Record<string, string> {
  return {
    [COLUMN_MAX_WIDTH_NAME]: `${c.maxWidth}px`,
    [columnVarName('desktop', 'count')]: String(c.count),
    [columnVarName('desktop', 'gutter')]: `${c.gutter}px`,
    [columnVarName('desktop', 'margin')]: `${c.margin}px`,
  };
}

/** While columns match the default, tokens.css stays in charge of every column var. */
export function columnsEqualsDefault(c: ColumnsState): boolean {
  return c.count === DEFAULT_COLUMNS.count
    && c.maxWidth === DEFAULT_COLUMNS.maxWidth
    && c.gutter === DEFAULT_COLUMNS.gutter
    && c.margin === DEFAULT_COLUMNS.margin;
}

export function parseColumnVars(vars: Record<string, string>): Partial<ColumnsState> {
  const out: Partial<ColumnsState> = {};
  const count = parseInt(vars[columnVarName('desktop', 'count')] ?? '', 10);
  if (Number.isFinite(count) && count > 0) out.count = count;
  const maxWidth = parseFloat(vars[COLUMN_MAX_WIDTH_NAME] ?? '');
  if (Number.isFinite(maxWidth)) out.maxWidth = Math.round(maxWidth);
  const gutter = parseFloat(vars[columnVarName('desktop', 'gutter')] ?? '');
  if (Number.isFinite(gutter)) out.gutter = Math.round(gutter);
  const margin = parseFloat(vars[columnVarName('desktop', 'margin')] ?? '');
  if (Number.isFinite(margin)) out.margin = Math.round(margin);
  return out;
}

/**
 * Loader: route the relevant entries from a freshly-loaded theme's vars bag
 * into `next.columns` and remove them from the bag so derivation stays
 * single-source. Mutates `next` and `rawVars` in place.
 */
export function loadColumnsFromVars(next: EditorState, rawVars: Record<string, string>): void {
  const overrides = parseColumnVars(rawVars);
  next.columns = { ...DEFAULT_COLUMNS, ...overrides };
  for (const name of COLUMN_VAR_NAMES) delete rawVars[name];
}
