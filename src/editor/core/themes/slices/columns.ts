/**
 * Columns slice. The column grid holds one count and one max width, and a
 * gutter and a margin per viewport. `--columns-gutter` and `--columns-margin`
 * are structural: tokens.css points them at the viewport values for the
 * window's width, and the editor never writes them.
 */
import type { ColumnsState, EditorState } from '../../store/editorTypes';

export const COLUMN_VIEWPORTS = ['desktop', 'tablet', 'phone'] as const;
export type ColumnViewport = (typeof COLUMN_VIEWPORTS)[number];

export interface ColumnViewportValues {
  gutter: number;
  margin: number;
}
export type ColumnProperty = keyof ColumnViewportValues;
export const COLUMN_PROPERTIES: readonly ColumnProperty[] = ['gutter', 'margin'];

/** The widest window each narrower viewport covers, as tokens.css's `@media (max-width)` blocks declare it. */
export const COLUMN_BREAKPOINTS: Record<Exclude<ColumnViewport, 'desktop'>, number> = {
  tablet: 767,
  phone: 480,
};

export const COLUMN_COUNT_NAME = '--columns-count';
export const COLUMN_MAX_WIDTH_NAME = '--columns-max-width';

export function columnVarName(viewport: ColumnViewport, property: ColumnProperty): string {
  return `--columns-${viewport}-${property}`;
}

export const VIEWPORT_COLUMN_NAMES: readonly string[] = COLUMN_VIEWPORTS.flatMap((viewport) =>
  COLUMN_PROPERTIES.map((property) => columnVarName(viewport, property)),
);

export const STRUCTURAL_COLUMN_NAMES = ['--columns-gutter', '--columns-margin'] as const;

export const COLUMN_VAR_NAMES: readonly string[] = [COLUMN_COUNT_NAME, COLUMN_MAX_WIDTH_NAME, ...VIEWPORT_COLUMN_NAMES];

export const COLUMN_DEFAULTS: Readonly<ColumnsState> = {
  count: 12,
  maxWidth: 1440,
  viewports: {
    desktop: { gutter: 32, margin: 32 },
    tablet: { gutter: 24, margin: 24 },
    phone: { gutter: 16, margin: 16 },
  },
};

export function defaultColumns(): ColumnsState {
  return structuredClone(COLUMN_DEFAULTS);
}

/** Each name appears only when its value differs from the tokens.css default. */
export function columnsToVars(c: ColumnsState): Record<string, string> {
  const out: Record<string, string> = {};
  if (c.count !== COLUMN_DEFAULTS.count) out[COLUMN_COUNT_NAME] = String(c.count);
  if (c.maxWidth !== COLUMN_DEFAULTS.maxWidth) out[COLUMN_MAX_WIDTH_NAME] = `${c.maxWidth}px`;
  for (const viewport of COLUMN_VIEWPORTS) {
    for (const property of COLUMN_PROPERTIES) {
      const value = c.viewports[viewport][property];
      if (value !== COLUMN_DEFAULTS.viewports[viewport][property]) {
        out[columnVarName(viewport, property)] = `${value}px`;
      }
    }
  }
  return out;
}

function parseLength(raw: string | undefined): number | undefined {
  const length = parseFloat(raw ?? '');
  return Number.isFinite(length) ? Math.round(length) : undefined;
}

/** A name the bag lacks, or holds in a form the editor cannot edit, keeps its default. */
export function columnsFromVars(vars: Record<string, string>): ColumnsState {
  const columns = defaultColumns();
  const count = parseInt(vars[COLUMN_COUNT_NAME] ?? '', 10);
  if (Number.isFinite(count) && count > 0) columns.count = count;
  const maxWidth = parseLength(vars[COLUMN_MAX_WIDTH_NAME]);
  if (maxWidth !== undefined) columns.maxWidth = maxWidth;
  for (const viewport of COLUMN_VIEWPORTS) {
    for (const property of COLUMN_PROPERTIES) {
      const value = parseLength(vars[columnVarName(viewport, property)]);
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
 * the renderer wrote to the names that are now the count, the max width and
 * the desktop gutter and margin. Its `0` margin is the one every shipped theme
 * held, so it takes today's default as a stored theme's does.
 */
export function normalizeColumnsState(raw: ColumnsState | FlatColumnsState): ColumnsState {
  if ('viewports' in raw) return raw;
  const columns = defaultColumns();
  const isFlatDefault = (Object.keys(FLAT_DEFAULTS) as (keyof FlatColumnsState)[])
    .every((key) => raw[key] === FLAT_DEFAULTS[key]);
  if (isFlatDefault) return columns;
  columns.count = raw.count;
  columns.maxWidth = raw.maxWidth;
  columns.viewports.desktop.gutter = raw.gutter;
  if (raw.margin !== FLAT_DEFAULTS.margin) columns.viewports.desktop.margin = raw.margin;
  return columns;
}
