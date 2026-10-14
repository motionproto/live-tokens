import postcss, { type AtRule, type Rule } from 'postcss';

/**
 * They follow the dynamic rule in docs/plans/production-css-variables.md, in
 * order. The last five mark properties whose winning token stream would
 * substitute wrongly: a CSS-wide keyword, a `var()` loop, `:root` values that
 * differ between assets, whose winner depends on which lazy chunks have loaded,
 * a reference to a name nothing declares, which a computed name may set at
 * runtime and which otherwise leaves the value guaranteed-invalid, so a `var()`
 * fallback applies, and a property only lazy CSS declares, which another asset
 * can read before that CSS loads.
 */
export type DynamicReason =
  | 'scoped'
  | 'script'
  | 'prelude'
  | 'registered'
  | 'keep'
  | 'reference'
  | 'keyword'
  | 'cycle'
  | 'assets'
  | 'undeclared'
  | 'lazy';

export type Specificity = readonly [number, number, number];

export interface Declaration {
  /** Index into the `css` input. */
  asset: number;
  /** Position among the asset's custom property declarations. */
  order: number;
  /** The nearest enclosing rule's selector. */
  selector: string | null;
  atRules: string[];
  value: string;
  important: boolean;
  /** The selector matches only the root element. */
  root: boolean;
  /** A root declaration outside any at-rule or outer rule. */
  bare: boolean;
  specificity: Specificity | null;
}

export interface Property {
  declarations: Declaration[];
  /** Names its values reference through `var()`. */
  references: string[];
  reached: boolean;
  dynamic: boolean;
  reasons: DynamicReason[];
  /** The cascade winner among its bare `:root` declarations. */
  winner: Declaration | null;
}

export interface AnalyzeInput {
  css: string[];
  js: string[];
  html: string[];
  keep: string[];
  /** Indices into `css` of the assets that load with the page. Every other asset belongs to a lazy chunk. */
  entries: number[];
}

const ROOT_SPECIFICITY = new Map<string, Specificity>([
  [':root', [0, 1, 0]],
  [':root:root', [0, 2, 0]],
  [':where(:root)', [0, 0, 0]],
  ['html', [0, 0, 1]],
]);

const NAME = String.raw`--(?:[\w-]|[^\x00-\x7f])+`;
const VAR_REF = new RegExp(String.raw`var\(\s*(${NAME})`, 'gi');
const PRELUDE_NAME = new RegExp(NAME, 'g');
// Minified JS is full of `--i` decrements. They only matter when CSS declares
// or references the same name.
const SCRIPT_NAME = new RegExp(String.raw`(?<![\w-])${NAME}`, 'g');
const CSS_WIDE_KEYWORD = /^\s*(?:initial|inherit|unset|revert|revert-layer)\s*$/i;

const varRefs = (value: string) => [...value.matchAll(VAR_REF)].map((m) => m[1]);

function compareSpecificity(a: Specificity, b: Specificity): number {
  return a[0] - b[0] || a[1] - b[1] || a[2] - b[2];
}

function rootSpecificity(selector: string): Specificity | null {
  let best: Specificity | null = null;
  for (const part of selector.split(',')) {
    const specificity = ROOT_SPECIFICITY.get(part.trim());
    if (!specificity) return null;
    if (!best || compareSpecificity(specificity, best) > 0) best = specificity;
  }
  return best;
}

function outranks(a: Declaration, b: Declaration): boolean {
  if (a.important !== b.important) return a.important;
  const bySpecificity = compareSpecificity(a.specificity!, b.specificity!);
  if (bySpecificity !== 0) return bySpecificity > 0;
  return a.asset !== b.asset ? a.asset > b.asset : a.order > b.order;
}

export function winnerOf(declarations: Declaration[]): Declaration | null {
  let winner: Declaration | null = null;
  for (const d of declarations) if (d.bare && (!winner || outranks(d, winner))) winner = d;
  return winner;
}

export function analyze({ css, js, html, keep, entries }: AnalyzeInput): Map<string, Property> {
  const declarations = new Map<string, Declaration[]>();
  const regularRefs = new Set<string>();
  const preludeNames = new Set<string>();
  const registered = new Set<string>();
  const reads = css.map(() => new Set<string>());

  css.forEach((source, asset) => {
    let order = 0;
    postcss.parse(source).walk((node) => {
      if (node.type === 'atrule') {
        if (node.name.toLowerCase() === 'property') registered.add(node.params.trim());
        for (const [name] of node.params.matchAll(PRELUDE_NAME)) preludeNames.add(name);
        return;
      }
      if (node.type !== 'decl') return;
      const refs = varRefs(node.value);
      for (const name of refs) reads[asset].add(name);
      if (!node.prop.startsWith('--')) {
        for (const name of refs) regularRefs.add(name);
        return;
      }
      let selector: string | null = null;
      let outerRule = false;
      const atRules: string[] = [];
      for (let p = node.parent; p && p.type !== 'root'; p = p.parent) {
        if (p.type === 'atrule') {
          const at = p as AtRule;
          atRules.unshift(`@${at.name} ${at.params}`.trim());
        } else if (p.type === 'rule') {
          if (selector === null) selector = (p as Rule).selector;
          else outerRule = true;
        }
      }
      const specificity = selector === null ? null : rootSpecificity(selector);
      const declaration: Declaration = {
        asset,
        order: order++,
        selector,
        atRules,
        value: node.value,
        important: node.important,
        root: specificity !== null,
        bare: specificity !== null && atRules.length === 0 && !outerRule,
        specificity,
      };
      const list = declarations.get(node.prop);
      if (list) list.push(declaration);
      else declarations.set(node.prop, [declaration]);
    });
  });

  const scriptNames = new Set<string>();
  for (const text of [...js, ...html]) {
    for (const [name] of text.matchAll(SCRIPT_NAME)) scriptNames.add(name);
  }
  const keepNames = new Set(keep);

  const references = new Map<string, Set<string>>();
  for (const [name, decls] of declarations) {
    references.set(name, new Set(decls.flatMap((d) => varRefs(d.value))));
  }

  const reached = new Set<string>();
  const toReach = [...regularRefs, ...preludeNames, ...scriptNames, ...keepNames];
  while (toReach.length) {
    const name = toReach.pop()!;
    if (reached.has(name)) continue;
    reached.add(name);
    for (const ref of references.get(name) ?? []) toReach.push(ref);
  }

  // Substituting a name that reaches a `var()` loop never terminates, and the
  // browser treats every name on the loop as guaranteed-invalid.
  const loops = new Map<string, boolean | 'visiting'>();
  const reachesCycle = (name: string): boolean => {
    const state = loops.get(name);
    if (state !== undefined) return state !== false;
    loops.set(name, 'visiting');
    let result = false;
    for (const ref of references.get(name) ?? []) {
      if (declarations.has(ref) && reachesCycle(ref)) result = true;
    }
    loops.set(name, result);
    return result;
  };

  const setByName = (name: string) => scriptNames.has(name) || keepNames.has(name) || registered.has(name);
  const entryAssets = new Set(entries);
  const winners = new Map<string, Declaration | null>();
  const reasons = new Map<string, DynamicReason[]>();
  for (const [name, decls] of declarations) {
    const winner = winnerOf(decls);
    winners.set(name, winner);
    const bare = decls.filter((d) => d.bare);
    const why: DynamicReason[] = [];
    if (decls.some((d) => !d.bare)) why.push('scoped');
    if (scriptNames.has(name)) why.push('script');
    if (preludeNames.has(name)) why.push('prelude');
    if (registered.has(name)) why.push('registered');
    if (keepNames.has(name)) why.push('keep');
    if (winner && CSS_WIDE_KEYWORD.test(winner.value)) why.push('keyword');
    if (reachesCycle(name)) why.push('cycle');
    if (new Set(bare.map((d) => d.asset)).size > 1 && new Set(bare.map((d) => d.value)).size > 1) {
      why.push('assets');
    }
    if ([...references.get(name)!].some((ref) => !declarations.has(ref) && !setByName(ref))) why.push('undeclared');
    const declaring = new Set(decls.map((d) => d.asset));
    if (
      ![...declaring].some((asset) => entryAssets.has(asset)) &&
      reads.some((names, asset) => !declaring.has(asset) && names.has(name))
    ) {
      why.push('lazy');
    }
    reasons.set(name, why);
  }

  // Undeclared names seed it too: a `:root` value that reads a name the JS or
  // a `keep` consumer sets on some element resolves differently there once
  // substituted.
  const dependents = new Map<string, string[]>();
  for (const [name, refs] of references) {
    for (const ref of refs) {
      const list = dependents.get(ref);
      if (list) list.push(name);
      else dependents.set(ref, [name]);
    }
  }
  const dynamic = new Set<string>();
  const toSpread = [
    ...[...reasons].filter(([, why]) => why.length > 0).map(([name]) => name),
    ...scriptNames,
    ...keepNames,
    ...registered,
  ];
  while (toSpread.length) {
    const name = toSpread.pop()!;
    if (dynamic.has(name)) continue;
    dynamic.add(name);
    for (const dependent of dependents.get(name) ?? []) toSpread.push(dependent);
  }

  const result = new Map<string, Property>();
  for (const [name, decls] of declarations) {
    const refs = [...references.get(name)!];
    const why = reasons.get(name)!;
    if (refs.some((ref) => dynamic.has(ref))) why.push('reference');
    result.set(name, {
      declarations: decls,
      references: refs,
      reached: reached.has(name),
      dynamic: why.length > 0,
      reasons: why,
      winner: winners.get(name)!,
    });
  }
  return result;
}
