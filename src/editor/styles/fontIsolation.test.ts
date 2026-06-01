// @vitest-environment node
//
// Editor font-isolation specificity invariant.
//
// `ui-editor.css` resets every non-icon element under `.editor-page` to
// `font-family: inherit`, so editor *chrome* picks up `--ui-font-sans` from
// `.editor-page` instead of the consumer's theme font (the "editor font
// invariant" in CONVENTIONS.md). That override only needs to beat the
// zero-specificity `:where(*:not(...))` baseline in tokens.css.
//
// But the rendered component *preview* lives under `.editor-page` too, and a
// component paints its own text font with an ordinary single-class scoped rule
// — e.g. `.sn-title-label` becomes `.sn-title-label.svelte-HASH`, specificity
// (0,2,0). If the isolation override also reaches (0,2,0) it TIES, and source
// order (not intent) decides the winner. When the override wins, the preview is
// frozen on `--ui-font-sans`: font-token edits update the CSS variable but the
// preview never repaints. SideNavigation, Card, and Badge all regressed this
// way; Button/Table only escaped by accident (compound selectors → (0,3,0)).
//
// Invariant: the isolation override must out-specify the tokens.css baseline
// yet stay BELOW a single-class component font rule. A component rule always
// carries at least two classes once Svelte appends its scope hash, so the
// override must compute to at most one class/attr/pseudo-class — i.e. keep its
// element matcher inside `:where()`.

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const TEST_DIR = dirname(fileURLToPath(import.meta.url));
const UI_EDITOR_CSS = join(TEST_DIR, 'ui-editor.css');

type Spec = [number, number, number];

function add(a: Spec, b: Spec): Spec {
  return [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
}
function cmp(a: Spec, b: Spec): number {
  return a[0] - b[0] || a[1] - b[1] || a[2] - b[2];
}
function maxSpec(specs: Spec[]): Spec {
  return specs.reduce((best, cur) => (cmp(cur, best) > 0 ? cur : best), [0, 0, 0] as Spec);
}

/** Index of the `)` matching the `(` at `open`, accounting for nesting. */
function matchParen(s: string, open: number): number {
  let depth = 0;
  for (let i = open; i < s.length; i++) {
    if (s[i] === '(') depth++;
    else if (s[i] === ')' && --depth === 0) return i;
  }
  return s.length - 1;
}

/** Specificity of a single complex selector as [ids, classes, types]. `:where()`
 *  contributes nothing; `:is()`/`:not()` contribute the max specificity of their
 *  arguments. Handles nested functional pseudo-classes (e.g.
 *  `:where(*:not([class*="fa-"]))`). Good enough for the selectors in ui-editor.css. */
function specificity(selector: string): Spec {
  let total: Spec = [0, 0, 0];
  let s = selector;

  const fnRe = /:(where|is|not|has)\(/i;
  let m: RegExpExecArray | null;
  while ((m = fnRe.exec(s))) {
    const open = m.index + m[0].length - 1;
    const close = matchParen(s, open);
    const fn = m[1].toLowerCase();
    const inner = s.slice(open + 1, close);
    if (fn !== 'where') {
      total = add(total, maxSpec(inner.split(',').map((a) => specificity(a))));
    }
    s = s.slice(0, m.index) + ' ' + s.slice(close + 1);
  }

  const attrs = (s.match(/\[[^\]]+\]/g) ?? []).length;     // [attr]
  const noAttrs = s.replace(/\[[^\]]*\]/g, ' ');           // drop attr internals before the type scan
  total = add(total, [
    (noAttrs.match(/#[\w-]+/g) ?? []).length,
    (noAttrs.match(/\.[\w-]+/g) ?? []).length              // .class
      + attrs
      + (noAttrs.match(/(?<!:):[\w-]+/g) ?? []).length,    // :pseudo-class
    (noAttrs.match(/(?<![.#:\w-])[a-z][\w-]*/gi) ?? []).length, // bare type
  ]);
  return total;
}

/** Pull every selector that sets `font-family: inherit` from a CSS source. */
function fontInheritSelectors(css: string): string[] {
  css = css.replace(/\/\*[\s\S]*?\*\//g, '');
  const out: string[] = [];
  const ruleRe = /([^{}]+)\{([^{}]*)\}/g;
  let m: RegExpExecArray | null;
  while ((m = ruleRe.exec(css))) {
    const body = m[2];
    if (/font-family\s*:\s*inherit\s*;?/i.test(body)) {
      for (const sel of m[1].split(',')) out.push(sel.trim());
    }
  }
  return out;
}

describe('editor font isolation', () => {
  const css = readFileSync(UI_EDITOR_CSS, 'utf8');
  const selectors = fontInheritSelectors(css);

  it('declares a font-family: inherit isolation rule', () => {
    expect(selectors.length).toBeGreaterThan(0);
  });

  // A component paints text with a single-class scoped rule, which Svelte
  // compiles to two classes (its own class + the `.svelte-HASH` scope) = (0,2,0).
  const SINGLE_CLASS_COMPONENT_RULE: [number, number, number] = [0, 2, 0];
  const TOKENS_BASELINE: [number, number, number] = [0, 0, 0]; // tokens.css :where()

  for (const sel of selectors) {
    it(`"${sel}" stays below a single-class component font rule`, () => {
      const spec = specificity(sel);
      expect(
        cmp(spec, SINGLE_CLASS_COMPONENT_RULE) < 0,
        `font isolation selector "${sel}" has specificity ${spec.join(',')}, which ties or ` +
          `beats a component's single-class scoped font rule (0,2,0). It would clobber the ` +
          `component preview's font, freezing it on --ui-font-sans. Wrap the element matcher ` +
          `in :where() so it can't out-specify component styles.`,
      ).toBe(true);
    });

    it(`"${sel}" still out-specifies the tokens.css :where() baseline`, () => {
      expect(cmp(specificity(sel), TOKENS_BASELINE) > 0).toBe(true);
    });
  }
});
