import { createHash } from 'node:crypto';
import { describe, expect, it, vi } from 'vitest';
import { hashedFileName, rewriteBundle, type BundleFile } from './index';

const digest = (source: string, length = 8) => createHash('sha256').update(source).digest('base64url').slice(0, length);

describe('hashedFileName', () => {
  it('replaces the hash the pattern places in the name', () => {
    expect(hashedFileName('assets/Home-DmAZk9OB.css', 'assets/[name]-[hash].[ext]', 'a{}')).toBe(
      `assets/Home-${digest('a{}')}.css`,
    );
    expect(hashedFileName('assets/my-section-DmAZk9OB.css', 'assets/[name]-[hash][extname]', 'a{}')).toBe(
      `assets/my-section-${digest('a{}')}.css`,
    );
    expect(hashedFileName('css/0123456789abcdef/site.css', 'css/[hash:16]/[name][extname]', 'a{}')).toBe(
      `css/${digest('a{}', 16)}/site.css`,
    );
    expect(hashedFileName('js/index.es-DmAZk9OB.js', 'js/[name].[format]-[hash].js', 'a{}')).toBe(
      `js/index.es-${digest('a{}')}.js`,
    );
  });

  it('returns null when the pattern carries no hash', () => {
    expect(hashedFileName('assets/Home.css', 'assets/[name].[ext]', 'a{}')).toBeNull();
  });

  it('throws when the name does not follow the pattern', () => {
    expect(() => hashedFileName('Home.css', 'assets/[name]-[hash].[ext]', 'a{}')).toThrow(/does not follow the output pattern/);
  });
});

type Asset = Extract<BundleFile, { type: 'asset' }>;
type Chunk = Extract<BundleFile, { type: 'chunk' }>;

const asset = (fileName: string, source: string): Asset => ({
  type: 'asset',
  fileName,
  source,
  names: [],
  originalFileNames: [],
});

const chunk = ({ css = [], ...fields }: Partial<Chunk> & Pick<Chunk, 'fileName'> & { css?: string[] }): Chunk => ({
  type: 'chunk',
  code: '',
  name: fields.fileName.replace(/^.*\/|-.*$/g, ''),
  isEntry: false,
  isDynamicEntry: false,
  facadeModuleId: null,
  moduleIds: [],
  exports: [],
  imports: [],
  dynamicImports: [],
  sourcemapFileName: null,
  viteMetadata: { importedCss: new Set(css) },
  ...fields,
});

const VITE_NAMES = {
  assetFileNames: 'assets/[name]-[hash].[ext]',
  chunkFileNames: 'assets/[name]-[hash].js',
  entryFileNames: 'assets/[name]-[hash].js',
};

const ENTRY_CSS = 'assets/index-AAAAAAAA.css';
const LAZY_CSS = 'assets/Home-BBBBBBBB.css';
const ENTRY = 'assets/index-CCCCCCCC.js';
const LAZY = 'assets/Home-DDDDDDDD.js';
const VENDOR = 'assets/vendor-EEEEEEEE.js';

function viteBundle(lazyCss = '.home{margin:var(--gap)}'): Record<string, BundleFile> {
  return {
    [ENTRY_CSS]: asset(ENTRY_CSS, ':root{--gap:4px}.box{padding:var(--gap)}'),
    [LAZY_CSS]: asset(LAZY_CSS, lazyCss),
    [ENTRY]: chunk({
      fileName: ENTRY,
      isEntry: true,
      imports: [VENDOR],
      dynamicImports: [LAZY],
      css: [ENTRY_CSS],
      sourcemapFileName: `${ENTRY}.map`,
      code: `import"./vendor-EEEEEEEE.js";const d=["${LAZY}","${LAZY_CSS}"];import("./Home-DDDDDDDD.js");\n//# sourceMappingURL=index-CCCCCCCC.js.map`,
    }),
    [`${ENTRY}.map`]: asset(`${ENTRY}.map`, '{"file":"index-CCCCCCCC.js","mappings":""}'),
    [LAZY]: chunk({ fileName: LAZY, isDynamicEntry: true, imports: [ENTRY], css: [LAZY_CSS], code: 'import{a}from"./index-CCCCCCCC.js";' }),
    [VENDOR]: chunk({ fileName: VENDOR, code: 'export const v=1;' }),
    'index.html': asset(
      'index.html',
      `<script src="/${ENTRY}"></script><link rel="modulepreload" href="/${VENDOR}"><link rel="stylesheet" href="/${ENTRY_CSS}">`,
    ),
    '.vite/manifest.json': asset(
      '.vite/manifest.json',
      JSON.stringify({ 'index.html': { file: ENTRY, css: [ENTRY_CSS] }, 'src/Home.svelte': { file: LAZY, css: [LAZY_CSS] } }),
    ),
  };
}

const base = (fileName: string) => fileName.replace(/^.*\//, '');

describe('rewriteBundle', () => {
  it('keeps a variable that only a lazy sheet declares when the entry sheet reads it', () => {
    const bundle: Record<string, BundleFile> = {
      'entry.css': asset('entry.css', '.box{margin:var(--gap);padding:var(--pad)}'),
      'shared.css': asset('shared.css', ':root{--pad:2px}'),
      'lazy.css': asset('lazy.css', ':root{--gap:4px}'),
      'entry.js': chunk({ fileName: 'entry.js', isEntry: true, imports: ['shared.js'], css: ['entry.css'] }),
      'shared.js': chunk({ fileName: 'shared.js', css: ['shared.css'] }),
      'lazy.js': chunk({ fileName: 'lazy.js', imports: ['shared.js'], css: ['lazy.css'] }),
    };
    rewriteBundle(bundle, {}, { assetFileNames: '[name].[ext]', chunkFileNames: '[name].js', entryFileNames: '[name].js' });
    expect((bundle['entry.css'] as Asset).source).toBe('.box{margin:var(--gap);padding:2px}');
    expect((bundle['lazy.css'] as Asset).source).toBe(':root{--gap:4px}');
  });

  it('renames each chunk whose code or imported CSS changed, and points every reference at the final names', () => {
    const bundle = viteBundle();
    rewriteBundle(bundle, {}, VITE_NAMES);
    const [entryCss, lazyCss, map, html, manifest] = [ENTRY_CSS, LAZY_CSS, `${ENTRY}.map`, 'index.html', '.vite/manifest.json'].map(
      (key) => bundle[key] as Asset,
    );
    const [entry, lazy, vendor] = [ENTRY, LAZY, VENDOR].map((key) => bundle[key] as Chunk);

    for (const [file, pattern] of [
      [entryCss, /^assets\/index-[\w-]{8}\.css$/],
      [lazyCss, /^assets\/Home-[\w-]{8}\.css$/],
      [entry, /^assets\/index-[\w-]{8}\.js$/],
      [lazy, /^assets\/Home-[\w-]{8}\.js$/],
    ] as const) {
      expect(file.fileName).toMatch(pattern);
    }
    expect(new Set([entryCss, lazyCss, entry, lazy].map((f) => f.fileName)).size).toBe(4);
    expect([ENTRY_CSS, LAZY_CSS, ENTRY, LAZY]).not.toContain(entry.fileName);
    expect(vendor.fileName).toBe(VENDOR);

    expect(entry.code).toBe(
      `import"./vendor-EEEEEEEE.js";const d=["${lazy.fileName}","${lazyCss.fileName}"];import("./${base(lazy.fileName)}");\n` +
        `//# sourceMappingURL=${base(entry.fileName)}.map`,
    );
    expect(lazy.code).toBe(`import{a}from"./${base(entry.fileName)}";`);
    expect(entry).toMatchObject({ imports: [VENDOR], dynamicImports: [lazy.fileName], sourcemapFileName: `${entry.fileName}.map` });
    expect(lazy.imports).toEqual([entry.fileName]);
    expect([...entry.viteMetadata!.importedCss]).toEqual([entryCss.fileName]);
    expect([...lazy.viteMetadata!.importedCss]).toEqual([lazyCss.fileName]);

    expect(map.fileName).toBe(`${entry.fileName}.map`);
    expect(map.source).toBe(`{"file":"${base(entry.fileName)}","mappings":""}`);
    expect(html.source).toBe(
      `<script src="/${entry.fileName}"></script><link rel="modulepreload" href="/${VENDOR}"><link rel="stylesheet" href="/${entryCss.fileName}">`,
    );
    expect(JSON.parse(manifest.source as string)).toEqual({
      'index.html': { file: entry.fileName, css: [entryCss.fileName] },
      'src/Home.svelte': { file: lazy.fileName, css: [lazyCss.fileName] },
    });
  });

  it('names the same final bytes alike, and renames the entry chunk when only a lazy sheet changes', () => {
    const names = (bundle: Record<string, BundleFile>) => {
      rewriteBundle(bundle, {}, VITE_NAMES);
      return Object.fromEntries(Object.entries(bundle).map(([key, file]) => [key, file.fileName]));
    };
    const first = names(viteBundle());
    expect(names(viteBundle())).toEqual(first);

    const changed = names(viteBundle('.home{padding:var(--gap)}'));
    expect(changed[ENTRY_CSS]).toBe(first[ENTRY_CSS]);
    expect(changed[VENDOR]).toBe(VENDOR);
    for (const key of [LAZY_CSS, LAZY, ENTRY, `${ENTRY}.map`]) expect(changed[key]).not.toBe(first[key]);
  });

  it('keeps a chunk name whose pattern carries no hash, and points it at the renamed files', () => {
    const bundle = viteBundle();
    rewriteBundle(bundle, {}, { ...VITE_NAMES, entryFileNames: 'assets/[name].js' });
    const [entry, lazy] = [ENTRY, LAZY].map((key) => bundle[key] as Chunk);
    expect(entry.fileName).toBe(ENTRY);
    expect(lazy.fileName).not.toBe(LAZY);
    expect(entry.code).toContain(`import("./${base(lazy.fileName)}")`);
  });

  it('asks a function chunkFileNames for the pattern with the chunk naming fields', () => {
    const chunkFileNames = vi.fn(() => 'assets/[name]-[hash].js');
    rewriteBundle(viteBundle(), {}, { ...VITE_NAMES, chunkFileNames });
    expect(chunkFileNames).toHaveBeenCalledWith({
      name: 'Home',
      isEntry: false,
      isDynamicEntry: true,
      facadeModuleId: undefined,
      moduleIds: [],
      exports: [],
    });
  });
});
