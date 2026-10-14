import { createHash } from 'node:crypto';
import { analyze } from './analyze';
import { rewrite, staticValues } from './rewrite';

export interface ProductionCssOptions {
  /** default: true. With false the build removes unreached properties only and keeps every `var()`. */
  substitute?: boolean;
  /** Names a script sets or reads under a name it assembles at runtime. */
  keep?: string[];
}

/** The fields of a Rollup or Rolldown output file that the transform reads and writes. */
export type BundleFile =
  | { type: 'asset'; fileName: string; source: string | Uint8Array; names: string[]; originalFileNames: string[] }
  | { type: 'chunk'; fileName: string; code: string; viteMetadata?: { importedCss: Set<string> } };

type AssetFile = Extract<BundleFile, { type: 'asset' }>;

/** `output.assetFileNames`: a pattern, or a function that returns the pattern for one asset. */
export type AssetFileNames =
  | string
  | ((asset: Pick<AssetFile, 'type' | 'names' | 'originalFileNames' | 'source'>) => string);

export interface ProductionCssReport {
  propertiesBefore: number;
  propertiesAfter: number;
  bytesSaved: number;
}

const text = (source: string | Uint8Array) =>
  typeof source === 'string' ? source : new TextDecoder().decode(source);

const HASH = /\[hash(?::(\d+))?\]/;
const PLACEHOLDER = /\[(name|hash(?::\d+)?|ext|extname)\]/g;
const escape = (literal: string) => literal.replace(/[.*+?^${}()|[\]\\/]/g, '\\$&');

/**
 * The name `pattern` gives a file whose content is `source`, in place of
 * `fileName`, or null when the pattern carries no hash. The bundler hashed
 * the name before the transform ran, so a rewritten sheet takes a new hash
 * or an immutable cache serves the old content under the same URL.
 */
export function hashedFileName(fileName: string, pattern: string, source: string): string | null {
  const hash = HASH.exec(pattern);
  if (!hash) return null;
  const length = hash[1] ? Number(hash[1]) : 8;
  let regex = '^';
  let last = 0;
  for (const m of pattern.matchAll(PLACEHOLDER)) {
    regex += escape(pattern.slice(last, m.index));
    if (m.index === hash.index) regex += `([A-Za-z0-9_-]{${length}})`;
    else if (m[1] === 'ext') regex += '[^./]*';
    else if (m[1] === 'extname') regex += '(?:\\.[^./]*)?';
    else regex += '.*?';
    last = m.index + m[0].length;
  }
  regex += escape(pattern.slice(last)) + '$';
  const match = new RegExp(regex, 'd').exec(fileName);
  if (!match?.indices?.[1]) throw new Error(`live-tokens: ${fileName} does not follow assetFileNames "${pattern}"`);
  const [start, end] = match.indices[1];
  const digest = createHash('sha256').update(source).digest('base64url').slice(0, length);
  return fileName.slice(0, start) + digest + fileName.slice(end);
}

function repoint(files: BundleFile[], renames: Map<string, string>): void {
  const replace = (s: string) => {
    for (const [from, to] of renames) s = s.replaceAll(from, () => to);
    return s;
  };
  for (const file of files) {
    if (file.type === 'chunk') {
      const code = replace(file.code);
      if (code !== file.code) file.code = code;
      const imported = file.viteMetadata?.importedCss;
      if (imported) {
        for (const [from, to] of renames) if (imported.delete(from)) imported.add(to);
      }
    } else if (/\.(html|json)$/.test(file.fileName)) {
      const before = text(file.source);
      const after = replace(before);
      if (after !== before) file.source = after;
    }
  }
}

/** Rewrites every CSS asset in the bundle in place. Returns null when the bundle holds no CSS. */
export function rewriteBundle(
  bundle: Record<string, BundleFile>,
  { substitute = true, keep = [] }: ProductionCssOptions,
  assetFileNames: AssetFileNames,
): ProductionCssReport | null {
  const files = Object.values(bundle);
  const assets = files.filter((f): f is AssetFile => f.type === 'asset');
  const sheets = assets.filter((f) => f.fileName.endsWith('.css'));
  if (sheets.length === 0) return null;

  const css = sheets.map((f) => text(f.source));
  const js = [
    ...files.flatMap((f) => (f.type === 'chunk' ? [f.code] : [])),
    ...assets.filter((f) => /\.[cm]?js$/.test(f.fileName)).map((f) => text(f.source)),
  ];
  const html = assets.filter((f) => f.fileName.endsWith('.html')).map((f) => text(f.source));
  const analysis = analyze({ css, js, html, keep });
  const values = substitute ? staticValues(analysis) : null;

  let bytesSaved = 0;
  const renames = new Map<string, string>();
  sheets.forEach((sheet, i) => {
    const rewritten = rewrite(css[i], i, analysis, { substitute }, values);
    bytesSaved += Buffer.byteLength(css[i]) - Buffer.byteLength(rewritten);
    if (rewritten === css[i]) return;
    sheet.source = rewritten;
    const pattern =
      typeof assetFileNames === 'string'
        ? assetFileNames
        : assetFileNames({ type: 'asset', names: sheet.names, originalFileNames: sheet.originalFileNames, source: rewritten });
    const renamed = hashedFileName(sheet.fileName, pattern, rewritten);
    if (renamed === null) return;
    renames.set(sheet.fileName, renamed);
    sheet.fileName = renamed;
  });
  if (renames.size > 0) repoint(files, renames);

  let propertiesAfter = 0;
  for (const property of analysis.values()) {
    if (property.reached && (property.dynamic || !substitute)) propertiesAfter += 1;
  }
  return { propertiesBefore: analysis.size, propertiesAfter, bytesSaved };
}

export function formatReport({ propertiesBefore, propertiesAfter, bytesSaved }: ProductionCssReport): string {
  const kB = (Math.abs(bytesSaved) / 1000).toFixed(1);
  return (
    `live-tokens: the production CSS declares ${propertiesAfter.toLocaleString('en-US')} of ` +
    `${propertiesBefore.toLocaleString('en-US')} custom properties and is ${kB} kB ` +
    `${bytesSaved >= 0 ? 'smaller' : 'larger'}.`
  );
}
