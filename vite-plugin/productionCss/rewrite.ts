import postcss, { AtRule, Rule, type Container } from 'postcss';
import { winnerOf, type Property } from './analyze';

export type Analysis = Map<string, Property>;

export interface RewriteOptions {
  substitute: boolean;
}

// A function name preceded by one of these belongs to a longer token.
const TOKEN_BEFORE_FUNCTION = /[\w\-#@\\]|[^\x00-\x7f]/;
const VAR_NAME = /^\s*(--(?:[\w-]|[^\x00-\x7f])+)\s*(?:,|$)/;
// Characters that can end and start tokens which would merge when written
// side by side, after CSS Syntax's serialization table.
const JOINS_LEFT = /[\w\-#@.+\\]|[^\x00-\x7f]/;
const JOINS_RIGHT = /[\w\-.+%(\\]|[^\x00-\x7f]/;
const EMPTIED_AT_RULES = new Set(['media', 'supports', 'container']);

function skipString(value: string, start: number): number {
  const quote = value[start];
  let i = start + 1;
  while (i < value.length && value[i] !== quote) i += value[i] === '\\' ? 2 : 1;
  return i + 1;
}

function skipComment(value: string, start: number): number {
  const end = value.indexOf('*/', start + 2);
  return end < 0 ? value.length : end + 2;
}

/** The index of the `)` that closes the parenthesis at `open`, or -1. */
function closingParen(value: string, open: number): number {
  let depth = 0;
  let i = open;
  while (i < value.length) {
    const c = value[i];
    if (c === '"' || c === "'") i = skipString(value, i);
    else if (c === '/' && value[i + 1] === '*') i = skipComment(value, i);
    else {
      if (c === '\\') i += 1;
      else if (c === '(') depth += 1;
      else if (c === ')' && --depth === 0) return i;
      i += 1;
    }
  }
  return -1;
}

// An unquoted `url(` is one token that runs to the next `)`, and a quoted one
// is a function around a string.
function afterUrl(value: string, start: number): number {
  let i = start;
  while (/\s/.test(value[i] ?? '')) i += 1;
  if (value[i] === '"' || value[i] === "'") {
    const close = closingParen(value, start - 1);
    return close < 0 ? value.length : close + 1;
  }
  while (i < value.length && value[i] !== ')') i += value[i] === '\\' ? 2 : 1;
  return i + 1;
}

function functionAt(value: string, i: number, name: string): boolean {
  return (
    value.slice(i, i + name.length).toLowerCase() === name &&
    (i === 0 || !TOKEN_BEFORE_FUNCTION.test(value[i - 1]))
  );
}

function breaksBetween(left: string | undefined, right: string | undefined): boolean {
  if (!left || !right) return false;
  return (JOINS_LEFT.test(left) && JOINS_RIGHT.test(right)) || (left === '/' && right === '*');
}

/** Writes `text` between two neighbours, with an empty comment wherever their tokens would merge. */
function spliced(before: string | undefined, text: string, after: string | undefined): string {
  if (text === '') return breaksBetween(before, after) ? '/**/' : '';
  const head = breaksBetween(before, text[0]) ? '/**/' : '';
  const tail = breaksBetween(text[text.length - 1], after) ? '/**/' : '';
  return head + text + tail;
}

/**
 * Replaces each `var()` whose name `valueOf` resolves with that token stream,
 * dropping the reference's own fallback, and substitutes inside the fallbacks
 * of the references it leaves.
 */
export function substituteValue(value: string, valueOf: (name: string) => string | undefined): string {
  let out = '';
  let copied = 0;
  let i = 0;
  while (i < value.length) {
    const c = value[i];
    if (c === '"' || c === "'") {
      i = skipString(value, i);
    } else if (c === '/' && value[i + 1] === '*') {
      i = skipComment(value, i);
    } else if (c === '\\') {
      i += 2;
    } else if (functionAt(value, i, 'url(')) {
      i = afterUrl(value, i + 4);
    } else if (functionAt(value, i, 'var(')) {
      const close = closingParen(value, i + 3);
      if (close < 0) break;
      const args = value.slice(i + 4, close);
      const name = VAR_NAME.exec(args)?.[1];
      const replacement = name === undefined ? undefined : valueOf(name);
      out += value.slice(copied, i);
      out +=
        replacement === undefined
          ? `${value.slice(i, i + 4)}${substituteValue(args, valueOf)})`
          : spliced(out[out.length - 1], replacement, value[close + 1]);
      copied = i = close + 1;
    } else {
      i += 1;
    }
  }
  return out + value.slice(copied);
}

/** Each reached static property's winning value, with its own static references substituted. */
export function staticValues(analysis: Analysis): Map<string, string> {
  const values = new Map<string, string>();
  const valueOf = (name: string): string | undefined => {
    const property = analysis.get(name);
    if (!property || property.dynamic) return undefined;
    let value = values.get(name);
    if (value === undefined) {
      value = substituteValue(property.winner!.value.trim(), valueOf);
      values.set(name, value);
    }
    return value;
  };
  for (const [name, property] of analysis) if (property.reached) valueOf(name);
  return values;
}

/**
 * Positions among one asset's custom property declarations that the rewrite
 * drops: every declaration of an unreached property, every one of a static
 * property when substituting, and each bare `:root` declaration that loses to
 * another in the same asset. Lazy chunks load their own CSS, so a winner in
 * another asset cannot stand in for this one.
 */
export function droppedDeclarations(analysis: Analysis, asset: number, { substitute }: RewriteOptions): Set<number> {
  const dropped = new Set<number>();
  for (const property of analysis.values()) {
    const own = property.declarations.filter((d) => d.asset === asset);
    if (!property.reached || (substitute && !property.dynamic)) {
      for (const d of own) dropped.add(d.order);
      continue;
    }
    const winner = winnerOf(own);
    for (const d of own) if (d.bare && d !== winner) dropped.add(d.order);
  }
  return dropped;
}

const removableWhenEmpty = (node: unknown): node is Rule | AtRule =>
  node instanceof Rule || (node instanceof AtRule && EMPTIED_AT_RULES.has(node.name.toLowerCase()));

function removeEmptied(containers: Set<Container>): void {
  for (const container of containers) {
    let node: unknown = container;
    while (removableWhenEmpty(node) && node.nodes?.length === 0) {
      const parent: unknown = node.parent;
      node.remove();
      node = parent;
    }
  }
}

/**
 * Rewrites the CSS asset at index `asset` of the analysed input. With
 * `substitute`, pass `values` from `staticValues` to share them across assets.
 */
export function rewrite(
  css: string,
  asset: number,
  analysis: Analysis,
  options: RewriteOptions,
  values: Map<string, string> | null = options.substitute ? staticValues(analysis) : null,
): string {
  const dropped = droppedDeclarations(analysis, asset, options);
  const root = postcss.parse(css);
  const emptied = new Set<Container>();
  let order = 0;
  root.walkDecls((decl) => {
    if (decl.prop.startsWith('--') && dropped.has(order++)) {
      emptied.add(decl.parent!);
      decl.remove();
      return;
    }
    if (!values) return;
    const value = substituteValue(decl.value, (name) => values.get(name));
    if (value !== decl.value) decl.value = value;
  });
  removeEmptied(emptied);
  return root.toString();
}
