import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { collectTokenValues, runAdditiveTokensCssMigrations, runTokensCssMigrations } from './index';

const FIXTURE = readFileSync(resolve(__dirname, 'fixtures/tokens-0.94.3.css'), 'utf8');
const CANONICAL = readFileSync(resolve(process.cwd(), 'src/system/styles/tokens.css'), 'utf8');
const TABLET = '(max-width: 767px)';
const PHONE = '(max-width: 480px)';

const fold = (css: string) => runTokensCssMigrations(css).css;
const topLevel = (css: string) => Object.fromEntries(collectTokenValues(css));

function mediaDeclarations(css: string, query: string): Record<string, string> {
  const out: Record<string, string> = {};
  for (let at = css.indexOf(`@media ${query} {`); at !== -1; at = css.indexOf(`@media ${query} {`, at + 1)) {
    let depth = 0;
    let end = at;
    for (let i = at; i < css.length; i++) {
      if (css[i] === '{') depth++;
      else if (css[i] === '}' && --depth === 0) {
        end = i;
        break;
      }
    }
    const body = css.slice(at, end).replace(/\/\*[\s\S]*?\*\//g, '');
    for (const m of body.matchAll(/(--[a-z0-9-]+)\s*:\s*([^;}]*);/gi)) out[m[1]] = m[2].trim();
  }
  return out;
}

describe('2026-10-15-responsive-columns', () => {
  it('folds the 0.94.3 tokens.css to the canonical names and top-level values', () => {
    const { css, applied } = runTokensCssMigrations(FIXTURE);
    expect(applied).toEqual(['2026-10-15-responsive-columns']);
    expect(topLevel(css)).toEqual(topLevel(CANONICAL));
  });

  it('fills both breakpoint blocks with the canonical declarations', () => {
    const css = fold(FIXTURE);
    for (const query of [TABLET, PHONE]) {
      expect(mediaDeclarations(css, query), query).toEqual(mediaDeclarations(CANONICAL, query));
    }
  });

  it('puts the tablet block before the phone block, so the phone values win on a phone', () => {
    const css = fold(FIXTURE);
    expect(css.indexOf(`@media ${TABLET}`)).toBeLessThan(css.indexOf(`@media ${PHONE}`));
  });

  it('maps the shipped 0 margin to 32px and leaves the count alone', () => {
    const values = collectTokenValues(fold(FIXTURE));
    expect(values.get('--columns-desktop-margin')).toBe('32px');
    expect(values.get('--columns-desktop-gutter')).toBe('32px');
    expect(values.get('--columns-count')).toBe('12');
    expect(values.has('--columns-desktop-count')).toBe(false);
  });

  it('carries a hand-edited gutter and margin into the desktop names, and keeps a hand-edited count', () => {
    const edited = FIXTURE.replace('--columns-count: 12;', '--columns-count: 16;')
      .replace('--columns-gutter: clamp(0.5rem, 1.5vw, 1.5rem);', '--columns-gutter: 20px;')
      .replace('--columns-margin: 0;', '--columns-margin: 48px;');
    const values = collectTokenValues(fold(edited));
    expect(values.get('--columns-count')).toBe('16');
    expect(values.get('--columns-desktop-gutter')).toBe('20px');
    expect(values.get('--columns-desktop-margin')).toBe('48px');
    expect(values.get('--columns-gutter')).toBe('var(--columns-desktop-gutter)');
    expect(values.get('--columns-margin')).toBe('var(--columns-desktop-margin)');
  });

  it('changes nothing on a second fold', () => {
    const edited = FIXTURE.replace('--columns-count: 12;', '--columns-count: 16;');
    for (const css of [FIXTURE, edited]) {
      const once = fold(css);
      const twice = runTokensCssMigrations(once);
      expect(twice.changed).toBe(false);
      expect(twice.css).toBe(once);
    }
  });

  it('ships breaking, so the additive pass leaves a 0.94.3 file alone', () => {
    expect(runAdditiveTokensCssMigrations(FIXTURE).changed).toBe(false);
  });
});
