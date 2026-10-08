/**
 * Pure, idempotent text operations on a `tokens.css` declaration set.
 *
 * `tokens.css` is the consumer's developer-authored Layer-1 source (palettes,
 * type/space/radius scales, motion). When the package evolves the Layer-1
 * vocabulary — adding a scale, renaming a step — consumers' forked `tokens.css`
 * drifts. `tokens-css` migrations reconcile that drift; these helpers are the
 * primitives they compose.
 *
 * Operations are text-level (not parse-and-reserialize) so the file's comments,
 * sectioning, and formatting survive untouched. They are idempotent **by
 * presence**: `ensure` skips a token that already exists, `rename` only fires
 * when the old name is present and the new one is absent, `remove` is a no-op
 * when the name is gone, `set` writes nothing when the value already matches,
 * and `appendMediaBlock` skips a name the block declares. Re-running a migration therefore never double-applies,
 * which is what lets the CLI run safely without a schema-version stamp.
 */

import { stripMediaBlocks } from '../../src/editor/core/themes/parsers/mediaBlocks';

const DECL_RE = /(^|[\s;{])(--[a-z0-9-]+)\s*:/gi;
const REF_RE = /var\(\s*(--[a-z0-9-]+)/gi;
const DECL_VALUE_RE = /(^|[\s;{])(--[a-z0-9-]+)\s*:([^;}]*)/gi;

/** Names declared as custom properties (`--x: …;`) anywhere in the source. */
export function collectDefinedTokens(css: string): Set<string> {
  const out = new Set<string>();
  for (const m of css.matchAll(DECL_RE)) out.add(m[2]);
  return out;
}

/**
 * Declared name → top-level value, last declaration winning. Declarations
 * inside `@media` are breakpoint re-points and never count.
 */
export function collectTokenValues(css: string): Map<string, string> {
  const out = new Map<string, string>();
  for (const m of stripMediaBlocks(css).matchAll(DECL_VALUE_RE)) out.set(m[2], m[3].trim());
  return out;
}

/** Names referenced via `var(--x)` anywhere in the source. */
export function collectReferencedTokens(css: string): Set<string> {
  const out = new Set<string>();
  for (const m of css.matchAll(REF_RE)) out.add(m[1]);
  return out;
}

export interface ScaleEntry {
  name: string;
  value: string;
}

export interface EnsureScaleOptions {
  /** Tokens to guarantee exist, in the order they should appear. */
  entries: ScaleEntry[];
  /**
   * Comment emitted once above the first inserted token of the group (only when
   * at least one token is actually inserted). Written without the `/​* *​/`.
   */
  sectionComment?: string;
  /**
   * Prefixes, in priority order, used to find where to insert. The block is
   * placed after the last declaration whose name starts with one of these.
   * Falls back to just before the closing brace of the first `:root` block.
   */
  anchorPrefixes?: string[];
}

/**
 * Insert any missing tokens from `entries` as one contiguous block. Tokens that
 * already exist (by name) are left as-is. Returns the source unchanged when
 * every entry is already present.
 */
export function ensureScale(css: string, opts: EnsureScaleOptions): string {
  const defined = collectDefinedTokens(css);
  const missing = opts.entries.filter((e) => !defined.has(e.name));
  if (missing.length === 0) return css;

  const lines = css.split('\n');
  const { indent, insertAfter } = findInsertionPoint(lines, opts.anchorPrefixes ?? []);

  const block: string[] = [];
  if (opts.sectionComment) block.push(`${indent}/* ${opts.sectionComment} */`);
  for (const e of missing) block.push(`${indent}${e.name}: ${e.value};`);

  lines.splice(insertAfter + 1, 0, ...block);
  return lines.join('\n');
}

/**
 * Rename a token: rewrites its declaration and every `var()` reference to it.
 * No-op unless the old name is present and the new name is absent (so a
 * half-applied rename, or a re-run, leaves the file alone).
 */
export function renameToken(css: string, oldName: string, newName: string): string {
  const defined = collectDefinedTokens(css);
  if (!defined.has(oldName) || defined.has(newName)) return css;
  // Word-boundary on the trailing side via negative lookahead for name chars,
  // so `--color-primary` doesn't also match `--color-primary-500`.
  const re = new RegExp(escapeRe(oldName) + '(?![a-z0-9-])', 'gi');
  return css.replace(re, newName);
}

/** Remove a token's declaration line. No-op when the name isn't declared. */
export function removeToken(css: string, name: string): string {
  const lines = css.split('\n');
  const declRe = new RegExp('(^|[\\s;{])' + escapeRe(name) + '\\s*:');
  const kept = lines.filter((line) => !declRe.test(line));
  if (kept.length === lines.length) return css;
  return kept.join('\n');
}

/**
 * Remove every custom-property declaration whose name satisfies `predicate`.
 * Operates line-by-line (tokens.css is one declaration per line), so only the
 * matched declarations are dropped — surrounding comments and structure stay.
 * No-op when nothing matches. Use for retiring a whole retired namespace.
 */
export function removeTokensMatching(css: string, predicate: (name: string) => boolean): string {
  const lines = css.split('\n');
  const declRe = /^\s*(--[a-z0-9-]+)\s*:/;
  const kept = lines.filter((line) => {
    const m = line.match(declRe);
    return !(m && predicate(m[1]));
  });
  if (kept.length === lines.length) return css;
  return kept.join('\n');
}

export interface SetTokenValueOptions {
  /** Rewrite only when the current value equals this one, so a consumer's edit stays. */
  from?: string;
}

/**
 * Rewrite the value of `name` where the top-level `:root` declares it. A
 * re-declaration inside `@media` keeps its value. No-op when the top-level
 * `:root` does not declare `name`.
 */
export function setTokenValue(
  css: string,
  name: string,
  value: string,
  opts: SetTokenValueOptions = {},
): string {
  const lines = css.split('\n');
  const declRe = new RegExp('(^|[\\s;{])(' + escapeRe(name) + ')(\\s*:)([^;}]*)');
  let changed = false;
  for (const root of findTopLevelRoots(lines)) {
    let depth = 1;
    for (let i = root.start + 1; i < root.end; i++) {
      if (depth === 1) {
        const m = lines[i].match(declRe);
        const current = m?.[4].trim();
        if (m && current !== value && (opts.from === undefined || current === opts.from.trim())) {
          const at = m.index! + m[1].length + m[2].length + m[3].length;
          lines[i] = lines[i].slice(0, at) + ' ' + value + lines[i].slice(at + m[4].length);
          changed = true;
        }
      }
      depth += braceDelta(lines[i]);
    }
  }
  return changed ? lines.join('\n') : css;
}

/**
 * Append each entry that no top-level `@media <query>` block declares yet to
 * that block's `:root`. The query must match exactly. With no such block, a new
 * one goes at the end of the file.
 */
export function appendMediaBlock(css: string, query: string, entries: ScaleEntry[]): string {
  const lines = css.split('\n');
  const at = query.trim();
  const blocks = findTopLevelBlocks(lines, (line) => mediaQueryOf(line) === at);
  const declared = collectDefinedTokens(
    blocks.map((b) => lines.slice(b.start, b.end + 1).join('\n')).join('\n'),
  );
  const missing = entries.filter((e) => !declared.has(e.name));
  if (missing.length === 0) return css;

  const media = blocks.find((b) => b.end > b.start);
  if (!media) {
    const block = [`@media ${at} {`, '  :root {', ...declarationLines(missing, '    '), '  }', '}', ''];
    while (lines.length > 0 && lines[lines.length - 1].trim() === '') lines.pop();
    return [...lines, '', ...block].join('\n');
  }

  const root = findNestedRoot(lines, media);
  if (!root) {
    lines.splice(media.end, 0, '  :root {', ...declarationLines(missing, '    '), '  }');
    return lines.join('\n');
  }

  let indent = (lines[root.end].match(/^\s*/)?.[0] ?? '') + '  ';
  for (let i = root.start + 1; i < root.end; i++) {
    const m = lines[i].match(/^(\s*)--[a-z0-9-]+\s*:/i);
    if (m) indent = m[1];
  }
  lines.splice(root.end, 0, ...declarationLines(missing, indent));
  return lines.join('\n');
}

function declarationLines(entries: ScaleEntry[], indent: string): string[] {
  return entries.map((e) => `${indent}${e.name}: ${e.value};`);
}

/**
 * Locate where a new token block should be inserted.
 *
 * Insertion is constrained to the file's *top-level* `:root {…}` block: both the
 * anchor search and the fallback only ever look at declarations that are direct
 * children of that block. Declarations inside nested at-rules — e.g. responsive
 * `@media { :root { --font-size-*: … } }` overrides, which are common at the foot
 * of a tokens.css — are deliberately ignored. Following an anchor into such a
 * block would splice the new tokens inside, or after, the nested `:root`,
 * yielding declarations that sit directly inside `@media` with no selector. That
 * is invalid CSS; browsers and the dev server tolerate it, but strict minifiers
 * (lightningcss, Vite's default from v8) reject it with "Unexpected end of input".
 */
function findInsertionPoint(
  lines: string[],
  anchorPrefixes: string[],
): { indent: string; insertAfter: number } {
  const root = findTopLevelRoot(lines);

  // No top-level `:root` to anchor against — append at end of file.
  if (!root) return { indent: '  ', insertAfter: lines.length - 1 };

  // Walk the direct children of the top-level `:root` once, recording the last
  // declaration per anchor prefix and the last declaration overall (used for the
  // no-anchor fallback). `depth` is relative to the block: 1 == direct child.
  const lastByPrefix = new Map<string, { index: number; indent: string }>();
  let lastDecl: { index: number; indent: string } | null = null;
  let depth = 1;
  for (let i = root.start + 1; i < root.end; i++) {
    const line = lines[i];
    if (depth === 1) {
      const m = line.match(/^(\s*)(--[a-z0-9-]+)\s*:/);
      if (m) {
        const hit = { index: i, indent: m[1] || '  ' };
        lastDecl = hit;
        for (const prefix of anchorPrefixes) {
          if (m[2].startsWith(prefix)) lastByPrefix.set(prefix, hit);
        }
      }
    }
    depth += braceDelta(line);
  }

  // Prefer the highest-priority prefix that matched a direct child of `:root`.
  for (const prefix of anchorPrefixes) {
    const hit = lastByPrefix.get(prefix);
    if (hit) return { indent: hit.indent, insertAfter: hit.index };
  }

  // Fallback: just before the top-level `:root` closing brace.
  return { indent: lastDecl?.indent ?? '  ', insertAfter: root.end - 1 };
}

interface LineBlock {
  /** Line of the opening brace. */
  start: number;
  /** Line of the matching closing brace. */
  end: number;
}

const ROOT_OPEN_RE = /(^|[\s,]):root[^{]*\{/;

/**
 * Find the file's top-level `:root { … }` block: the first `:root` selector that
 * opens a block at brace-depth 0 (i.e. not nested inside `@media` or any other
 * at-rule). Returns the line indices of its opening and closing braces, or
 * `null` when there is no such block.
 */
function findTopLevelRoot(lines: string[]): LineBlock | null {
  return findTopLevelRoots(lines)[0] ?? null;
}

function findTopLevelRoots(lines: string[]): LineBlock[] {
  return findTopLevelBlocks(lines, (line) => ROOT_OPEN_RE.test(line));
}

/** Blocks that open at brace-depth 0 on a line `opens` accepts. */
function findTopLevelBlocks(lines: string[], opens: (line: string) => boolean): LineBlock[] {
  const blocks: LineBlock[] = [];
  let depth = 0;
  for (let i = 0; i < lines.length; i++) {
    if (depth === 0 && opens(lines[i])) {
      const end = blockEnd(lines, i);
      blocks.push({ start: i, end });
      i = end;
      continue;
    }
    depth += braceDelta(lines[i]);
  }
  return blocks;
}

/** The first multi-line `:root` block directly inside `parent`. */
function findNestedRoot(lines: string[], parent: LineBlock): LineBlock | null {
  let depth = 1;
  for (let i = parent.start + 1; i < parent.end; i++) {
    if (depth === 1 && ROOT_OPEN_RE.test(lines[i])) {
      const end = blockEnd(lines, i);
      if (end > i && end < parent.end) return { start: i, end };
    }
    depth += braceDelta(lines[i]);
  }
  return null;
}

function blockEnd(lines: string[], start: number): number {
  let depth = 0;
  for (let j = start; j < lines.length; j++) {
    depth += braceDelta(lines[j]);
    if (depth === 0) return j;
  }
  return lines.length - 1;
}

function mediaQueryOf(line: string): string | null {
  return line.match(/^\s*@media\s+([^{]*?)\s*\{/i)?.[1] ?? null;
}

function braceDelta(line: string): number {
  return (line.match(/\{/g)?.length ?? 0) - (line.match(/\}/g)?.length ?? 0);
}

function escapeRe(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
