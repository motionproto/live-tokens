import { createHash } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { hashedFileName } from './index';

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
