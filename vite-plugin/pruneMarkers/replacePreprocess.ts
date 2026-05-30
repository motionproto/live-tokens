/**
 * Markup-level find/replace as a Svelte preprocessor.
 *
 * Mirrors the `replace` option svelte-preprocess used to provide: apply a list
 * of `[RegExp, ReplaceFn]` rules to the raw `.svelte` source before the Svelte
 * compiler runs. We dropped svelte-preprocess in favour of `vitePreprocess`
 * (no conflicting `sugarss` peer), and `vitePreprocess` has no `replace` hook —
 * so the build-time pruning pass lives here instead.
 *
 * Pair with `buildPruneReplace()` from `./pruneReplace`.
 */
import type { PreprocessorGroup } from 'svelte/compiler';

type ReplaceRule = [RegExp, (match: string, ...rest: string[]) => string];

export function replacePreprocess(rules: ReplaceRule[]): PreprocessorGroup {
  return {
    name: 'live-tokens-prune-replace',
    markup({ content }) {
      let code = content;
      for (const [re, fn] of rules) code = code.replace(re, fn);
      return { code };
    },
  };
}
