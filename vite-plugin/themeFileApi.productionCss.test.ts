import { describe, expect, it, vi } from 'vitest';
import { themeFileApi, type ThemeFileApiOptions } from './themeFileApi';
import type { AssetFileNames, BundleFile } from './productionCss';

const CSS = ':root{--unused:1px;--gap:4px;--tint:red}.box{margin:var(--gap);color:var(--tint)}';
const SHEET = 'assets/index-AAAAAAAA.css';
const PLAIN = 'assets/plain-BBBBBBBB.css';
const CHUNK = 'assets/index-CCCCCCCC.js';
const VITE_DEFAULT = 'assets/[name]-[hash].[ext]';

type Asset = Extract<BundleFile, { type: 'asset' }>;
type Chunk = Extract<BundleFile, { type: 'chunk' }>;

function build(
  command: 'build' | 'serve',
  productionCss?: ThemeFileApiOptions['productionCss'],
  code = '',
  assetFileNames: AssetFileNames = VITE_DEFAULT,
) {
  const plugin = themeFileApi({ tokensCssPath: 'src/system/styles/tokens.css', productionCss });
  const info = vi.fn();
  (plugin.configResolved as (config: unknown) => void)({
    command,
    logger: { info, warn: vi.fn(), error: vi.fn() },
  });
  const asset = (fileName: string, source: string, names: string[] = []): Asset => ({
    type: 'asset',
    fileName,
    source,
    names,
    originalFileNames: [],
  });
  const bundle: Record<string, BundleFile> = {
    [SHEET]: asset(SHEET, CSS, ['index.css']),
    [PLAIN]: asset(PLAIN, '.plain{color:red}', ['plain.css']),
    [CHUNK]: { type: 'chunk', fileName: CHUNK, code, viteMetadata: { importedCss: new Set([SHEET, PLAIN]) } },
    'index.html': asset('index.html', `<link rel="stylesheet" href="/${SHEET}"><link rel="stylesheet" href="/${PLAIN}">`),
    '.vite/manifest.json': asset('.vite/manifest.json', JSON.stringify({ 'index.html': { file: CHUNK, css: [SHEET, PLAIN] } })),
  };
  const hook = plugin.generateBundle as { order: string; handler: (...args: unknown[]) => void };
  hook.handler.call({}, { assetFileNames }, bundle, false);
  const sheet = bundle[SHEET] as Asset;
  return { bundle, sheet, css: sheet.source, info, order: hook.order };
}

describe('themeFileApi productionCss', () => {
  it('leaves the bundle untouched under vite serve', () => {
    const { css, info } = build('serve');
    expect(css).toBe(CSS);
    expect(info).not.toHaveBeenCalled();
  });

  it('leaves the bundle untouched when productionCss is false', () => {
    const { css, info } = build('build', false);
    expect(css).toBe(CSS);
    expect(info).not.toHaveBeenCalled();
  });

  it('rewrites the CSS after the other plugins and logs one line', () => {
    const { css, info, order } = build('build');
    expect(order).toBe('post');
    expect(css).toBe('.box{margin:4px;color:red}');
    expect(info).toHaveBeenCalledTimes(1);
    expect(info.mock.calls[0][0]).toMatch(/declares 0 of 3 custom properties and is 0\.1 kB smaller/);
  });

  it('keeps every var() with substitute: false', () => {
    expect(build('build', { substitute: false }).css).toBe(':root{--gap:4px;--tint:red}.box{margin:var(--gap);color:var(--tint)}');
  });

  it('keeps a name the JS names or keep lists', () => {
    expect(build('build', undefined, 'el.style.setProperty("--tint","blue")').css).toBe(
      ':root{--tint:red}.box{margin:4px;color:var(--tint)}',
    );
    expect(build('build', { keep: ['--gap'] }).css).toBe(':root{--gap:4px}.box{margin:var(--gap);color:red}');
  });

  it('renames a rewritten sheet to its content hash and points every reference at it', () => {
    const code = `__vitePreload(()=>import("./x.js"),["${SHEET}","${PLAIN}"])`;
    const { bundle, sheet } = build('build', undefined, code);
    expect(sheet.fileName).toMatch(/^assets\/index-[\w-]{8}\.css$/);
    expect(sheet.fileName).not.toBe(SHEET);
    expect(build('build', undefined, code).sheet.fileName).toBe(sheet.fileName);
    expect((bundle[PLAIN] as Asset).fileName).toBe(PLAIN);

    const chunk = bundle[CHUNK] as Chunk;
    expect(chunk.code).toBe(`__vitePreload(()=>import("./x.js"),["${sheet.fileName}","${PLAIN}"])`);
    expect(chunk.viteMetadata!.importedCss).toEqual(new Set([PLAIN, sheet.fileName]));
    expect((bundle['index.html'] as Asset).source).toBe(
      `<link rel="stylesheet" href="/${sheet.fileName}"><link rel="stylesheet" href="/${PLAIN}">`,
    );
    expect(JSON.parse((bundle['.vite/manifest.json'] as Asset).source as string)).toEqual({
      'index.html': { file: CHUNK, css: [sheet.fileName, PLAIN] },
    });
  });

  it('asks a function assetFileNames for the pattern', () => {
    const pattern = vi.fn(({ names }: { names: string[] }) => (names[0] === 'index.css' ? VITE_DEFAULT : 'other/[name].[ext]'));
    const { sheet } = build('build', undefined, '', pattern);
    expect(pattern).toHaveBeenCalledTimes(1);
    expect(pattern.mock.calls[0][0]).toMatchObject({ type: 'asset', names: ['index.css'], source: '.box{margin:4px;color:red}' });
    expect(sheet.fileName).toMatch(/^assets\/index-[\w-]{8}\.css$/);
  });

  it('keeps the file name when assetFileNames carries no hash', () => {
    const { sheet } = build('build', undefined, '', 'assets/[name].[ext]');
    expect(sheet.fileName).toBe(SHEET);
    expect(sheet.source).toBe('.box{margin:4px;color:red}');
  });
});
