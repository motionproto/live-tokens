import { createHash } from 'node:crypto';
import { describe, expect, it } from 'vitest';
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
  });

  it('returns null when the pattern carries no hash', () => {
    expect(hashedFileName('assets/Home.css', 'assets/[name].[ext]', 'a{}')).toBeNull();
  });

  it('throws when the name does not follow the pattern', () => {
    expect(() => hashedFileName('Home.css', 'assets/[name]-[hash].[ext]', 'a{}')).toThrow(/does not follow assetFileNames/);
  });
});

describe('rewriteBundle', () => {
  const asset = (fileName: string, source: string): BundleFile => ({
    type: 'asset',
    fileName,
    source,
    names: [],
    originalFileNames: [],
  });
  const chunk = (fileName: string, isEntry: boolean, imports: string[], css: string[]): BundleFile => ({
    type: 'chunk',
    fileName,
    code: '',
    isEntry,
    imports,
    viteMetadata: { importedCss: new Set(css) },
  });

  it('keeps a variable that only a lazy sheet declares when the entry sheet reads it', () => {
    const bundle: Record<string, BundleFile> = {
      'entry.css': asset('entry.css', '.box{margin:var(--gap);padding:var(--pad)}'),
      'shared.css': asset('shared.css', ':root{--pad:2px}'),
      'lazy.css': asset('lazy.css', ':root{--gap:4px}'),
      'entry.js': chunk('entry.js', true, ['shared.js'], ['entry.css']),
      'shared.js': chunk('shared.js', false, [], ['shared.css']),
      'lazy.js': chunk('lazy.js', false, ['shared.js'], ['lazy.css']),
    };
    rewriteBundle(bundle, {}, '[name].[ext]');
    expect((bundle['entry.css'] as { source: string }).source).toBe('.box{margin:var(--gap);padding:2px}');
    expect((bundle['lazy.css'] as { source: string }).source).toBe(':root{--gap:4px}');
  });
});
