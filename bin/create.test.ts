import { describe, it, expect, afterEach } from 'vitest';
import { mkdtempSync, mkdirSync, rmSync, readFileSync, existsSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
// @ts-expect-error — plain .mjs module, no types
import { runCreate, appNameFrom } from './create.mjs';

const pkgRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const pkgVersion = JSON.parse(readFileSync(join(pkgRoot, 'package.json'), 'utf8')).version;

const created: string[] = [];
function freshTarget(name = 'app'): string {
  const dir = join(mkdtempSync(join(tmpdir(), 'lt-create-')), name);
  created.push(dir);
  return dir;
}

afterEach(() => {
  while (created.length) rmSync(dirname(created.pop()!), { recursive: true, force: true });
});

describe('runCreate', () => {
  it('scaffolds the expected app shell', () => {
    const targetDir = freshTarget();
    runCreate({ targetDir, pkgRoot });
    for (const f of [
      'package.json',
      'index.html',
      'svelte.config.js',
      'vite.config.ts',
      'tsconfig.json',
      'src/main.ts',
      'src/App.svelte',
      'src/pages/Home.svelte',
      'src/vite-env.d.ts',
    ]) {
      expect(existsSync(join(targetDir, f)), f).toBe(true);
    }
  });

  it('restores the leading dot on shipped dotfiles', () => {
    const targetDir = freshTarget();
    runCreate({ targetDir, pkgRoot });
    expect(existsSync(join(targetDir, '.gitignore'))).toBe(true);
    expect(existsSync(join(targetDir, '_gitignore'))).toBe(false);
  });

  it('seeds token/theme CSS from the package with real content', () => {
    const targetDir = freshTarget();
    runCreate({ targetDir, pkgRoot });
    for (const f of [
      'src/system/styles/tokens.css',
      'src/live-tokens/data/tokens.generated.css',
      'src/styles/site.css',
    ]) {
      expect(readFileSync(join(targetDir, f), 'utf8').length, f).toBeGreaterThan(0);
    }
  });

  it('fills the app name and pins the package version, leaving no placeholders', () => {
    const targetDir = freshTarget('My_App');
    const result = runCreate({ targetDir, pkgRoot });
    expect(result.appName).toBe('my_app');

    const pkg = JSON.parse(readFileSync(join(targetDir, 'package.json'), 'utf8'));
    expect(pkg.name).toBe('my_app');
    expect(pkg.dependencies['@motion-proto/live-tokens']).toBe(`^${pkgVersion}`);

    for (const f of ['package.json', 'index.html', 'README.md']) {
      const body = readFileSync(join(targetDir, f), 'utf8');
      expect(body, f).not.toContain('__APP_NAME__');
      expect(body, f).not.toContain('__LT_VERSION__');
    }
  });

  it('refuses a non-empty target unless forced', () => {
    const targetDir = freshTarget();
    mkdirSync(targetDir, { recursive: true });
    writeFileSync(join(targetDir, 'keep.txt'), 'mine');

    expect(() => runCreate({ targetDir, pkgRoot })).toThrow(/not empty/);
    expect(() => runCreate({ targetDir, pkgRoot, force: true })).not.toThrow();
    expect(existsSync(join(targetDir, 'src/App.svelte'))).toBe(true);
  });
});

describe('appNameFrom', () => {
  it('sanitizes to a valid npm package name', () => {
    expect(appNameFrom('/x/My App')).toBe('my-app');
    expect(appNameFrom('/x/My_App')).toBe('my_app');
    expect(appNameFrom('/x/.hidden.')).toBe('hidden');
    expect(appNameFrom('/')).toBe('live-tokens-app');
  });
});
