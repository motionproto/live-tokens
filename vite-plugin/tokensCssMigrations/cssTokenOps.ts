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
 * when the name is gone. Re-running a migration therefore never double-applies,
 * which is what lets the CLI run safely without a schema-version stamp.
 */

const DECL_RE = /(^|[\s;{])(--[a-z0-9-]+)\s*:/gi;
const REF_RE = /var\(\s*(--[a-z0-9-]+)/gi;

/** Names declared as custom properties (`--x: …;`) anywhere in the source. */
export function collectDefinedTokens(css: string): Set<string> {
  const out = new Set<string>();
  for (const m of css.matchAll(DECL_RE)) out.add(m[2]);
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

function findInsertionPoint(
  lines: string[],
  anchorPrefixes: string[],
): { indent: string; insertAfter: number } {
  // Prefer the last declaration matching the highest-priority prefix present.
  for (const prefix of anchorPrefixes) {
    let last = -1;
    let indent = '  ';
    for (let i = 0; i < lines.length; i++) {
      const m = lines[i].match(/^(\s*)(--[a-z0-9-]+)\s*:/);
      if (m && m[2].startsWith(prefix)) {
        last = i;
        indent = m[1] || '  ';
      }
    }
    if (last !== -1) return { indent, insertAfter: last };
  }

  // Fallback: just before the closing brace of the first `:root {` block.
  let depth = 0;
  let inRoot = false;
  let lastDeclIndent = '  ';
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (!inRoot && /(^|\s):root[^{]*\{/.test(line)) {
      inRoot = true;
      depth = 1;
      continue;
    }
    if (!inRoot) continue;
    const declIndent = line.match(/^(\s*)--[a-z0-9-]+\s*:/);
    if (declIndent) lastDeclIndent = declIndent[1] || '  ';
    depth += (line.match(/\{/g)?.length ?? 0) - (line.match(/\}/g)?.length ?? 0);
    if (depth === 0) {
      // `i` is the closing-brace line; insert before it.
      return { indent: lastDeclIndent, insertAfter: i - 1 };
    }
  }

  // No `:root` block at all — append at end of file.
  return { indent: '  ', insertAfter: lines.length - 1 };
}

function escapeRe(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
