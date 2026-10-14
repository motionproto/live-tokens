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
  | {
      type: 'chunk';
      fileName: string;
      code: string;
      name: string;
      isEntry: boolean;
      isDynamicEntry: boolean;
      facadeModuleId: string | null;
      moduleIds: string[];
      exports: string[];
      imports: string[];
      dynamicImports: string[];
      sourcemapFileName: string | null;
      viteMetadata?: { importedCss: Set<string> };
    };

type AssetFile = Extract<BundleFile, { type: 'asset' }>;
type ChunkFile = Extract<BundleFile, { type: 'chunk' }>;

/** `output.assetFileNames`: a pattern, or a function that returns the pattern for one asset. */
export type AssetFileNames =
  | string
  | ((asset: Pick<AssetFile, 'type' | 'names' | 'originalFileNames' | 'source'>) => string);

/** `output.chunkFileNames` or `output.entryFileNames`. */
export type ChunkFileNames =
  | string
  | ((chunk: {
      name: string;
      isEntry: boolean;
      isDynamicEntry: boolean;
      facadeModuleId?: string;
      moduleIds: string[];
      exports: string[];
    }) => string);

export interface OutputFileNames {
  assetFileNames: AssetFileNames;
  chunkFileNames: ChunkFileNames;
  entryFileNames: ChunkFileNames;
}

export interface ProductionCssReport {
  propertiesBefore: number;
  propertiesAfter: number;
  bytesSaved: number;
}

const text = (source: string | Uint8Array) =>
  typeof source === 'string' ? source : new TextDecoder().decode(source);

const HASH = /\[hash(?::(\d+))?\]/;
const PLACEHOLDER = /\[(name|hash(?::\d+)?|ext|extname|format)\]/g;
const escape = (literal: string) => literal.replace(/[.*+?^${}()|[\]\\/]/g, '\\$&');
const TEXT_ASSET = /\.(css|html|json|map)$/;

/**
 * The name `pattern` gives a file whose final bytes `content` determines, in
 * place of `fileName`, or null when the pattern carries no hash. The bundler
 * hashed the name before the transform ran, so a rewritten file takes a new
 * hash or an immutable cache serves the old content under the same URL.
 */
export function hashedFileName(fileName: string, pattern: string, content: string): string | null {
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
  if (!match?.indices?.[1]) throw new Error(`live-tokens: ${fileName} does not follow the output pattern "${pattern}"`);
  const [start, end] = match.indices[1];
  const digest = createHash('sha256').update(content).digest('base64url').slice(0, length);
  return fileName.slice(0, start) + digest + fileName.slice(end);
}

/**
 * The text a reference to `from` carries, and its replacement: the path
 * segment that holds the hash and the rest of the name. A chunk imports
 * another by a path relative to its own directory.
 */
function tails(from: string, to: string): [string, string] {
  let i = 0;
  while (from[i] === to[i]) i += 1;
  const start = from.lastIndexOf('/', i) + 1;
  return [from.slice(start), to.slice(start)];
}

/**
 * Points every reference at the new names, and renames each file named
 * after a renamed one, such as its sourcemap. Returns the chunks whose code
 * or imported CSS changed.
 */
function repoint(files: BundleFile[], renames: Map<string, string>): Set<ChunkFile> {
  const pairs = [...renames].map(([from, to]) => tails(from, to));
  const replace = (s: string) => {
    for (const [from, to] of pairs) s = s.replaceAll(from, () => to);
    return s;
  };
  const renamed = (names: string[]) => names.map((name) => renames.get(name) ?? name);
  const changed = new Set<ChunkFile>();
  for (const file of files) {
    if (file.type === 'chunk') {
      const code = replace(file.code);
      if (code !== file.code) {
        file.code = code;
        changed.add(file);
      }
      if (file.imports.some((name) => renames.has(name))) file.imports = renamed(file.imports);
      if (file.dynamicImports.some((name) => renames.has(name))) file.dynamicImports = renamed(file.dynamicImports);
      const map = file.sourcemapFileName && replace(file.sourcemapFileName);
      if (map && map !== file.sourcemapFileName) file.sourcemapFileName = map;
      // A Set Vite defines on the chunk as read-only, so it changes in place.
      const imported = file.viteMetadata?.importedCss;
      if (imported && [...imported].some((name) => renames.has(name))) {
        const next = renamed([...imported]);
        imported.clear();
        for (const name of next) imported.add(name);
        changed.add(file);
      }
    } else if (TEXT_ASSET.test(file.fileName)) {
      const before = text(file.source);
      const after = replace(before);
      if (after !== before) file.source = after;
    }
    const fileName = replace(file.fileName);
    if (fileName !== file.fileName) file.fileName = fileName;
  }
  return changed;
}

/**
 * Renames each rewritten sheet, then each chunk whose code or imported CSS
 * changed, then each chunk that imports a renamed chunk, so that every
 * hashed name covers its file's final bytes. Chunks that import each other
 * cannot each hash the other's final name, so a chunk's hash covers its own
 * code and imported CSS and those of every chunk it reaches.
 */
function renameRewritten(files: BundleFile[], sheetRenames: Map<string, string>, names: OutputFileNames): void {
  const affected = repoint(files, sheetRenames);
  const chunks = files.filter((f): f is ChunkFile => f.type === 'chunk');
  const byName = new Map(chunks.map((c) => [c.fileName, c]));
  const imported = (c: ChunkFile) => [...c.imports, ...c.dynamicImports].flatMap((name) => byName.get(name) ?? []);
  for (let grew = true; grew; ) {
    grew = false;
    for (const chunk of chunks) {
      if (!affected.has(chunk) && imported(chunk).some((c) => affected.has(c))) {
        affected.add(chunk);
        grew = true;
      }
    }
  }

  const identity = (c: ChunkFile) => [c.code, ...(c.viteMetadata?.importedCss ?? [])].join('\0');
  const chunkRenames = new Map<string, string>();
  for (const chunk of affected) {
    const reached = new Set([chunk]);
    const toVisit = [chunk];
    while (toVisit.length) {
      for (const next of imported(toVisit.pop()!)) {
        if (!reached.has(next)) {
          reached.add(next);
          toVisit.push(next);
        }
      }
    }
    reached.delete(chunk);
    const others = [...reached].sort((a, b) => (a.fileName < b.fileName ? -1 : 1));
    const fileNames = chunk.isEntry ? names.entryFileNames : names.chunkFileNames;
    const pattern =
      typeof fileNames === 'string'
        ? fileNames
        : fileNames({
            name: chunk.name,
            isEntry: chunk.isEntry,
            isDynamicEntry: chunk.isDynamicEntry,
            facadeModuleId: chunk.facadeModuleId ?? undefined,
            moduleIds: chunk.moduleIds,
            exports: chunk.exports,
          });
    const renamed = hashedFileName(chunk.fileName, pattern, [chunk, ...others].map(identity).join('\0\0'));
    if (renamed !== null) chunkRenames.set(chunk.fileName, renamed);
  }
  if (chunkRenames.size > 0) repoint(files, chunkRenames);
}

/** The CSS of every entry chunk and of each chunk an entry imports statically. */
function entrySheets(files: BundleFile[]): Set<string> {
  const chunks = new Map(files.flatMap((f): [string, ChunkFile][] => (f.type === 'chunk' ? [[f.fileName, f]] : [])));
  const sheets = new Set<string>();
  const seen = new Set<string>();
  const toVisit = [...chunks.values()].filter((c) => c.isEntry);
  while (toVisit.length) {
    const chunk = toVisit.pop()!;
    if (seen.has(chunk.fileName)) continue;
    seen.add(chunk.fileName);
    for (const sheet of chunk.viteMetadata?.importedCss ?? []) sheets.add(sheet);
    for (const name of chunk.imports) {
      const imported = chunks.get(name);
      if (imported) toVisit.push(imported);
    }
  }
  return sheets;
}

/** Rewrites every CSS asset in the bundle in place. Returns null when the bundle holds no CSS. */
export function rewriteBundle(
  bundle: Record<string, BundleFile>,
  { substitute = true, keep = [] }: ProductionCssOptions,
  names: OutputFileNames,
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
  const loadedWithPage = entrySheets(files);
  const entries = sheets.flatMap((sheet, i) => (loadedWithPage.has(sheet.fileName) ? [i] : []));
  const analysis = analyze({ css, js, html, keep, entries });
  const values = substitute ? staticValues(analysis) : null;

  let bytesSaved = 0;
  const renames = new Map<string, string>();
  const { assetFileNames } = names;
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
    if (renamed !== null) renames.set(sheet.fileName, renamed);
  });
  if (renames.size > 0) renameRewritten(files, renames, names);

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
