/**
 * Columns slice. The column grid holds one max width and a count, a gutter and
 * a margin per viewport. `--columns-count`, `--columns-gutter` and
 * `--columns-margin` are structural: tokens.css points them at the viewport
 * values for the window's width, and the editor never writes them.
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

/** The widest window each narrower viewport covers, as tokens.css's `@media (max-width)` blocks declare it. */
export const COLUMN_BREAKPOINTS: Record<Exclude<ColumnViewport, 'desktop'>, number> = {
  tablet: 767,
  phone: 480,
};

export const COLUMN_MAX_WIDTH_NAME = '--columns-max-width';

export function columnVarName(viewport: ColumnViewport, property: ColumnProperty): string {
  return `--columns-${viewport}-${property}`;
}

export const VIEWPORT_COLUMN_NAMES: readonly string[] = COLUMN_VIEWPORTS.flatMap((viewport) =>
  COLUMN_PROPERTIES.map((property) => columnVarName(viewport, property)),
);

export const STRUCTURAL_COLUMN_NAMES = ['--columns-count', '--columns-gutter', '--columns-margin'] as const;

export const COLUMN_VAR_NAMES: readonly string[] = [COLUMN_MAX_WIDTH_NAME, ...VIEWPORT_COLUMN_NAMES];

export const COLUMN_DEFAULTS: Readonly<ColumnsState> = {
  maxWidth: 1440,
  viewports: {
    desktop: { count: 12, gutter: 32, margin: 0 },
    tablet: { count: 8, gutter: 24, margin: 24 },
    phone: { count: 4, gutter: 16, margin: 16 },
  },
};

export function defaultColumns(): ColumnsState {
  return structuredClone(COLUMN_DEFAULTS);
}

function formatColumnValue(property: ColumnProperty, value: number): string {
  return property === 'count' ? String(value) : `${value}px`;
}

/** Each name appears only when its value differs from the tokens.css default. */
export function columnsToVars(c: ColumnsState): Record<string, string> {
  const out: Record<string, string> = {};
  if (c.maxWidth !== COLUMN_DEFAULTS.maxWidth) out[COLUMN_MAX_WIDTH_NAME] = `${c.maxWidth}px`;
  for (const viewport of COLUMN_VIEWPORTS) {
    for (const property of COLUMN_PROPERTIES) {
      const value = c.viewports[viewport][property];
      if (value !== COLUMN_DEFAULTS.viewports[viewport][property]) {
        out[columnVarName(viewport, property)] = formatColumnValue(property, value);
      }
    }
  }
  return out;
}

function parseColumnValue(property: ColumnProperty, raw: string | undefined): number | undefined {
  if (raw === undefined) return undefined;
  if (property === 'count') {
    const count = parseInt(raw, 10);
    return Number.isFinite(count) && count > 0 ? count : undefined;
  }
  const length = parseFloat(raw);
  return Number.isFinite(length) ? Math.round(length) : undefined;
}

/** A name the bag lacks, or holds in a form the editor cannot edit, keeps its default. */
export function columnsFromVars(vars: Record<string, string>): ColumnsState {
  const columns = defaultColumns();
  const maxWidth = parseFloat(vars[COLUMN_MAX_WIDTH_NAME] ?? '');
  if (Number.isFinite(maxWidth)) columns.maxWidth = Math.round(maxWidth);
  for (const viewport of COLUMN_VIEWPORTS) {
    for (const property of COLUMN_PROPERTIES) {
      const value = parseColumnValue(property, vars[columnVarName(viewport, property)]);
      if (value !== undefined) columns.viewports[viewport][property] = value;
    }
  }
  return columns;
}

/**
 * Loader: route the relevant entries from a freshly-loaded theme's vars bag
 * into `next.columns` and remove them from the bag so derivation stays
 * single-source. Mutates `next` and `rawVars` in place.
 */
export function loadColumnsFromVars(next: EditorState, rawVars: Record<string, string>): void {
  next.columns = columnsFromVars(rawVars);
  for (const name of COLUMN_VAR_NAMES) delete rawVars[name];
}

interface FlatColumnsState {
  count: number;
  maxWidth: number;
  gutter: number;
  margin: number;
}

// The flat state's old defaults rendered nothing, so a session sitting on them
// takes today's defaults instead of pinning a 16px desktop gutter.
const FLAT_DEFAULTS: FlatColumnsState = { count: 12, maxWidth: 1440, gutter: 16, margin: 0 };

/**
 * A session persisted before the per-viewport state holds one flat set, which
 * the renderer wrote to the names that are now the desktop ones.
 */
export function normalizeColumnsState(raw: ColumnsState | FlatColumnsState): ColumnsState {
  if ('viewports' in raw) return raw;
  const columns = defaultColumns();
  const isFlatDefault = (Object.keys(FLAT_DEFAULTS) as (keyof FlatColumnsState)[])
    .every((key) => raw[key] === FLAT_DEFAULTS[key]);
  if (isFlatDefault) return columns;
  columns.maxWidth = raw.maxWidth;
  columns.viewports.desktop = { count: raw.count, gutter: raw.gutter, margin: raw.margin };
  return columns;
}
