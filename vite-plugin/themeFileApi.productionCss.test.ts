import { describe, expect, it, vi } from 'vitest';
import { themeFileApi, type ThemeFileApiOptions } from './themeFileApi';
import type { BundleFile } from './productionCss';

const CSS = ':root{--unused:1px;--gap:4px;--tint:red}.box{margin:var(--gap);color:var(--tint)}';

function build(command: 'build' | 'serve', productionCss?: ThemeFileApiOptions['productionCss'], code = '') {
  const plugin = themeFileApi({ tokensCssPath: 'src/system/styles/tokens.css', productionCss });
  const info = vi.fn();
  (plugin.configResolved as (config: unknown) => void)({
    command,
    logger: { info, warn: vi.fn(), error: vi.fn() },
  });
  const bundle: Record<string, BundleFile> = {
    'assets/index.css': { type: 'asset', fileName: 'assets/index.css', source: CSS },
    'assets/index.js': { type: 'chunk', fileName: 'assets/index.js', code },
  };
  const hook = plugin.generateBundle as { order: string; handler: (...args: unknown[]) => void };
  hook.handler.call({}, {}, bundle, false);
  const sheet = bundle['assets/index.css'] as Extract<BundleFile, { type: 'asset' }>;
  return { css: sheet.source, info, order: hook.order };
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
});
