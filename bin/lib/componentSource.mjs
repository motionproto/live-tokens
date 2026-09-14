import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { PKG_ROOT, declaredCustomProperties, extractGlobalRootBlocks } from './tokenVocabulary.mjs';

// Property suffixes come from the editor's own kind table, so the checker and
// the picker can never disagree about what a name means. Read as text rather
// than imported: this module must load without the compiled engine (CI runs the
// suite before the plugin is built).
const ALIAS_KINDS = 'src/editor/core/components/aliasKinds.ts';

/** Each kind with the suffixes that name it, in the file's own order, since
 *  the first match wins there too. */
export function readKindRules(root) {
  for (const base of [root, PKG_ROOT]) {
    const path = join(base, ALIAS_KINDS);
    if (!existsSync(path)) continue;
    const src = readFileSync(path, 'utf8');
    const block = src.match(/KIND_RULES[^=]*=\s*\[([\s\S]*?)\n\];/);
    if (!block) continue;
    const out = [];
    for (const m of block[1].matchAll(/\{\s*kind:\s*'([a-z-]+)',\s*suffix:\s*\[([\s\S]*?)\]/g)) {
      out.push({ kind: m[1], suffixes: [...m[2].matchAll(/'-([a-z0-9-]+)'/g)].map((n) => n[1]) });
    }
    if (out.length > 0) return out;
  }
  return [];
}

export function readKnownSuffixes(root) {
  return [...new Set(readKindRules(root).flatMap((r) => r.suffixes))];
}

/**
 * The token scale a property draws its value from, by way of the editor's own
 * kind for it. A kind with no scale behind it — a length, a duration, a font
 * axis — has none, so a literal there has no candidate to offer.
 */
const KIND_SCALE = {
  'text-color': 'text',
  surface: 'surface',
  border: 'border',
  radius: 'radius',
  padding: 'space',
  gap: 'space',
  'hairline-inset': 'space',
  'border-width': 'border-width',
  'hairline-width': 'border-width',
  'indicator-width': 'border-width',
  shadow: 'shadow',
};

export const COLOR_SCALES = ['text', 'surface', 'border'];
export const GEOMETRY_SCALES = ['space', 'radius', 'border-width', 'shadow'];

export function tokenScale(token, kindRules, wanted) {
  const bare = SIDE_SUFFIXES.find((x) => token.endsWith(x)) ? token.slice(0, token.lastIndexOf('-')) : token;
  const rule = kindRules.find((r) => r.suffixes.some((s) => bare.endsWith(`-${s}`)));
  const scale = rule ? (KIND_SCALE[rule.kind] ?? null) : null;
  return wanted.includes(scale) ? scale : null;
}

// Per-side padding names (`--card-body-padding-top`) are written by the padding
// selector, never declared by hand, and belong with their parent.
export const SIDE_SUFFIXES = ['-top', '-right', '-bottom', '-left'];

// State tokens that must come *before* the property, never after.
export const STATE_TOKENS = ['hover', 'disabled', 'selected', 'focus', 'active', 'focused'];

export function tokenSuffix(token, known) {
  const bare = SIDE_SUFFIXES.find((x) => token.endsWith(x)) ? token.slice(0, token.lastIndexOf('-')) : token;
  for (const suffix of known) {
    if (bare.endsWith(`-${suffix}`)) return suffix;
  }
  return null;
}

/**
 * Token patterns the editor declares in `intrinsics` — the only tokens allowed a
 * bare keyword instead of a theme token.
 *
 * Matched on each spec's `variable`, not its `key`: the two need not agree
 * (Image's `zoom` key declares `--image-zoom-enabled`), and `variable` is what
 * actually names the token. A `${...}` hole stands for a variant segment.
 */
export function intrinsicMatchers(editor) {
  const block = editor.match(/export\s+const\s+intrinsics[^=]*=\s*\[([\s\S]*?)\];/);
  if (!block) return [];
  const out = [];
  for (const m of block[1].matchAll(/\bvariable\s*:[^`'"]*[`'"]([^`'"]+)[`'"]/g)) {
    const pattern = m[1]
      .replace(/[.*+?^${}()|[\]\\]/g, (c) => (c === '$' ? '$' : `\\${c}`))
      .replace(/\$\\\{[^}]*\\\}/g, '[a-z0-9-]+')
      .replace(/\$\{[^}]*\}/g, '[a-z0-9-]+');
    out.push(new RegExp(`^${pattern}$`));
  }
  return out;
}

/** Every custom property the `:global(:root)` blocks declare, comments ignored. */
export function declaredTokens(blocks) {
  const declared = new Set();
  for (const block of blocks) {
    for (const n of declaredCustomProperties(block.replace(/\/\*[\s\S]*?\*\//g, ' '))) declared.add(n);
  }
  return declared;
}

/**
 * Properties a component declares that nothing in its own file reads. A read is
 * the name appearing outside the `:global(:root)` block: in a `var()`, in a
 * `style:` directive, or as the string a padding mixin takes. SCSS interpolation
 * (`--badge-#{$v}-surface`) reads every property the pattern covers. A per-side
 * padding is read through its parent.
 */
export function unreadTokens(source, tokens) {
  let body = source.replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/<!--[\s\S]*?-->/g, ' ');
  for (const block of extractGlobalRootBlocks(body)) body = body.replace(block, ' ');
  const patterns = [...body.matchAll(/--[a-z0-9-]*(?:#\{[^}]*\}[a-z0-9-]*)+/g)].map(
    (m) => new RegExp(`^${m[0].replace(/[.*+?^()|[\]\\]/g, '\\$&').replace(/#\{[^}]*\}/g, '[a-z0-9-]+')}$`),
  );
  const isRead = (name) => body.includes(name) || patterns.some((re) => re.test(name));
  return [...tokens].filter((name) => {
    const side = SIDE_SUFFIXES.find((s) => name.endsWith(s));
    return !isRead(name) && !(side && isRead(name.slice(0, -side.length)));
  });
}
