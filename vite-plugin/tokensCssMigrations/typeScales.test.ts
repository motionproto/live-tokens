import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { recommendedEditedExpression, recommendedScaleExpression } from '../../src/editor/core/typeScale/typeScale';
import { collectTokenValues, runAdditiveTokensCssMigrations, runTokensCssMigrations } from './index';

const FIXTURE = readFileSync(resolve(__dirname, 'fixtures/tokens-0.91.2.css'), 'utf8');
const CANONICAL = readFileSync(resolve(process.cwd(), 'src/system/styles/tokens.css'), 'utf8');
const QUERIES = ['(max-width: 768px)', '(max-width: 480px)'];

const fold = (css: string) => runTokensCssMigrations(css).css;
const topLevel = (css: string) => Object.fromEntries(collectTokenValues(css));

function mediaDeclarations(css: string, query: string): Record<string, string> {
  const at = css.indexOf(`@media ${query} {`);
  if (at === -1) return {};
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
  return Object.fromEntries([...body.matchAll(/(--[a-z0-9-]+)\s*:\s*([^;}]*);/gi)].map((m) => [m[1], m[2].trim()]));
}

describe('2026-10-08-type-scales', () => {
  it('folds the 0.91.2 tokens.css to the canonical names and top-level values', () => {
    const { css, applied } = runTokensCssMigrations(FIXTURE);
    expect(applied).toEqual(['2026-10-08-type-scales']);
    expect(topLevel(css)).toEqual(topLevel(CANONICAL));
  });

  it('fills both breakpoint blocks with the canonical declarations', () => {
    const css = fold(FIXTURE);
    for (const query of QUERIES) {
      expect(mediaDeclarations(css, query), query).toEqual(mediaDeclarations(CANONICAL, query));
    }
  });

  it('changes nothing on a second fold', () => {
    const once = fold(FIXTURE);
    const twice = runTokensCssMigrations(once);
    expect(twice.changed).toBe(false);
    expect(twice.css).toBe(once);
  });

  it('leaves the canonical tokens.css unchanged', () => {
    expect(runTokensCssMigrations(CANONICAL).changed).toBe(false);
  });

  it('carries an edited step size into the desktop size', () => {
    const edited = FIXTURE.replace(
      '--heading-xl-font-size: var(--font-size-4xl);',
      '--heading-xl-font-size: 2.5rem;',
    );
    const values = collectTokenValues(fold(edited));
    expect(values.get('--heading-xl-desktop-font-size')).toBe('2.5rem');
    expect(values.get('--heading-xl-font-size')).toBe('var(--heading-xl-desktop-font-size)');
  });

  it("derives an edited rem or px size's tablet and phone sizes by the editor's rule", () => {
    const edited = FIXTURE.replace('--heading-xl-font-size: var(--font-size-4xl);', '--heading-xl-font-size: 2.5rem;')
      .replace('--heading-lg-font-size: var(--font-size-2xl);', '--heading-lg-font-size: 28px;');
    const values = collectTokenValues(fold(edited));
    for (const viewport of ['tablet', 'phone'] as const) {
      expect(values.get(`--heading-xl-${viewport}-font-size`)).toBe(recommendedEditedExpression('--heading-xl', 2.5, viewport));
      expect(values.get(`--heading-lg-${viewport}-font-size`)).toBe(recommendedEditedExpression('--heading-lg', 1.75, viewport));
    }
  });

  it("derives an edited alias's tablet and phone sizes from the desktop rem it resolves to", () => {
    const edited = FIXTURE.replace(
      '--heading-xl-font-size: var(--font-size-4xl);',
      '--heading-xl-font-size: var(--font-size-5xl);',
    ).replace('--body-sm-font-size: var(--font-size-sm);', '--body-sm-font-size: var(--font-size-md);');
    const values = collectTokenValues(fold(edited));
    expect(values.get('--heading-xl-desktop-font-size')).toBe('var(--font-size-5xl)');
    for (const viewport of ['tablet', 'phone'] as const) {
      expect(values.get(`--heading-xl-${viewport}-font-size`)).toBe(recommendedEditedExpression('--heading-xl', 3, viewport));
      expect(values.get(`--body-sm-${viewport}-font-size`)).toBe(recommendedEditedExpression('--body-sm', 1, viewport));
    }
  });

  it("keeps the scale's tablet and phone sizes for an edited size it cannot resolve", () => {
    const edited = FIXTURE.replace(
      '--heading-xl-font-size: var(--font-size-4xl);',
      '--heading-xl-font-size: calc(var(--font-size-4xl) * 1.1);',
    );
    const values = collectTokenValues(fold(edited));
    for (const viewport of ['tablet', 'phone'] as const) {
      expect(values.get(`--heading-xl-${viewport}-font-size`)).toBe(recommendedScaleExpression('heading', 'xl', viewport));
    }
  });

  it('carries a step 0.91.2 did not ship as an edit when the file declares it', () => {
    const declared = FIXTURE.replace(
      '--heading-xl-font-size: var(--font-size-4xl);',
      '--heading-xl-font-size: var(--font-size-4xl);\n  --heading-2xl-font-size: 1.75rem;',
    );
    const css = fold(declared);
    const values = collectTokenValues(css);
    expect(values.get('--heading-2xl-desktop-font-size')).toBe('1.75rem');
    expect(values.get('--heading-2xl-font-size')).toBe('var(--heading-2xl-desktop-font-size)');
    for (const viewport of ['tablet', 'phone'] as const) {
      expect(values.get(`--heading-2xl-${viewport}-font-size`)).toBe(recommendedEditedExpression('--heading-2xl', 1.75, viewport));
    }
    expect(runTokensCssMigrations(css).changed).toBe(false);
  });

  it('keeps a changed face in place of the link to its usage', () => {
    const edited = FIXTURE.replace(
      '--heading-lg-font-family: var(--font-display);',
      '--heading-lg-font-family: var(--font-serif);',
    );
    const values = collectTokenValues(fold(edited));
    expect(values.get('--heading-lg-font-family')).toBe('var(--font-serif)');
    expect(values.get('--heading-xl-font-family')).toBe('var(--heading-font-family)');
  });

  it('carries an edited code size through the rename', () => {
    const edited = FIXTURE.replace(
      '--code-font-size: var(--font-size-sm);',
      '--code-font-size: 0.8125rem;',
    );
    const css = fold(edited);
    const values = collectTokenValues(css);
    expect(values.get('--code-md-desktop-font-size')).toBe('0.8125rem');
    expect(values.get('--code-md-font-size')).toBe('var(--code-md-desktop-font-size)');
    expect(css).not.toMatch(/--code-(font-size|line-height|letter-spacing)\b/);
  });

  it('renames a reference to a code token along with its declaration', () => {
    const referenced = FIXTURE.replace(
      '--eyebrow-text-transform: none;',
      '--eyebrow-text-transform: none;\n  --snippet-leading: var(--code-line-height);',
    );
    expect(collectTokenValues(fold(referenced)).get('--snippet-leading')).toBe('var(--code-md-line-height)');
  });

  it('ships breaking, so the additive pass leaves a 0.91.2 file alone', () => {
    expect(runAdditiveTokensCssMigrations(FIXTURE).changed).toBe(false);
  });
});
