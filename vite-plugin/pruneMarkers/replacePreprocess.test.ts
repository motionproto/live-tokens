import { describe, expect, it } from 'vitest';
import { replacePreprocess } from './replacePreprocess';

/** Invoke the preprocessor's `markup` hook the way vite-plugin-svelte does and
 * return the resulting code. */
function runMarkup(
  pre: ReturnType<typeof replacePreprocess>,
  content: string,
): string {
  // `markup` is always defined on the group we build; the cast narrows the type.
  const result = (pre.markup as (arg: { content: string; filename: string }) => { code: string })({
    content,
    filename: 'Test.svelte',
  });
  return result.code;
}

describe('replacePreprocess', () => {
  it('applies a single rule to the markup', () => {
    const pre = replacePreprocess([[/foo/g, () => 'bar']]);
    expect(runMarkup(pre, 'a foo b foo c')).toBe('a bar b bar c');
  });

  it('applies rules in sequence — each rule sees the previous rule’s output', () => {
    const pre = replacePreprocess([
      [/foo/g, () => 'bar'],
      [/bar/g, () => 'baz'],
    ]);
    // foo→bar, then that bar→baz: order is load-bearing.
    expect(runMarkup(pre, 'foo')).toBe('baz');
  });

  it('passes the regex match through to the replacer function', () => {
    const pre = replacePreprocess([
      [/<!--KEEP (\w+)-->/g, (_match, name) => `<span>${name}</span>`],
    ]);
    expect(runMarkup(pre, '<!--KEEP hello-->')).toBe('<span>hello</span>');
  });

  it('is a no-op when no rule matches (content returned unchanged)', () => {
    const pre = replacePreprocess([[/never-here/g, () => 'x']]);
    const src = '<div>untouched</div>';
    expect(runMarkup(pre, src)).toBe(src);
  });

  it('operates on the whole source, not just element markup', () => {
    // svelte-preprocess's `replace` ran over the entire file (script + style
    // included); the prune pass relies on that. Lock the behaviour in.
    const pre = replacePreprocess([[/TOKEN/g, () => 'REPLACED']]);
    const src = '<script>const TOKEN = 1;</script>\n<style>/* TOKEN */</style>\n<p>TOKEN</p>';
    expect(runMarkup(pre, src)).toBe(
      '<script>const REPLACED = 1;</script>\n<style>/* REPLACED */</style>\n<p>REPLACED</p>',
    );
  });

  it('exposes a stable preprocessor name', () => {
    expect(replacePreprocess([]).name).toBe('live-tokens-prune-replace');
  });
});
