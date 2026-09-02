// The token and component vocabulary both static checkers validate against.
//
// One module so `check-page` and `check-component` can never disagree about
// what counts as a real token. Two sources feed it:
//
//   1. tokens.css — the developer-authored file (the consumer's, or the
//      package's when a consumer has none yet). A theme token *is* a name
//      declared here; there is no second register of tokens to consult.
//   2. Component tokens — every `--<id>-*` a component declares in its
//      `:global(:root)` block, shipped or consumer-authored.
//
// A state word is not a token. `hover` is a segment inside a semantic property
// name (`--button-outline-hover-surface`), so `var(--hover)` names nothing and
// the checkers say so.
//
// Reads files only. Nothing here may import dist-plugin at module top: CI runs
// the suite before the plugin is built (see bin/engineLoadsLazily.test.ts).

import { existsSync, readFileSync, readdirSync, realpathSync, statSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { resolveTokensCssPath } from '../migrate.mjs';

const PKG_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../..');

const SHIPPED_COMPONENTS_DIR = 'src/system/components';

/** Families whose names are governed by the token contract (see TOKENS.md). */
export const CONTRACT_FAMILIES = [
  'surface', 'text', 'border', 'color', 'space', 'radius', 'font', 'line-height',
  'letter-spacing', 'shadow', 'blur', 'icon-size', 'scrim', 'tint', 'columns',
  'heading', 'body', 'editorial', 'eyebrow', 'code', 'easing', 'duration', 'zoom',
  'gradient', 'stroke',
];

/** True when `name` belongs to a contract-governed family, so a miss is a typo. */
export function isContractToken(name) {
  const stem = name.replace(/^--/, '');
  return CONTRACT_FAMILIES.some((f) => stem === f || stem.startsWith(`${f}-`));
}

/** Every `--name:` declared anywhere in a stylesheet or style block. */
export function declaredCustomProperties(css) {
  const out = new Set();
  for (const m of css.matchAll(/(?:^|[;{])\s*(--[a-z0-9-]+)\s*:/gim)) out.add(m[1]);
  return out;
}

/** Every `var(--name)` referenced in a stylesheet or style block. */
export function referencedCustomProperties(css) {
  const out = new Set();
  for (const m of css.matchAll(/var\(\s*(--[a-z0-9-]+)/g)) out.add(m[1]);
  return out;
}

/**
 * The body of every `:global(:root) { ... }` block, brace-balanced so a nested
 * at-rule or an SCSS block inside it neither truncates the block nor leaks
 * declarations from the rule after it.
 */
export function extractGlobalRootBlocks(source) {
  const out = [];
  const re = /:global\(:root\)\s*\{/g;
  let m;
  while ((m = re.exec(source)) !== null) {
    const start = m.index + m[0].length;
    let depth = 1;
    let i = start;
    for (; i < source.length && depth > 0; i++) {
      if (source[i] === '{') depth++;
      else if (source[i] === '}') depth--;
    }
    out.push(source.slice(start, depth === 0 ? i - 1 : i));
    re.lastIndex = i;
  }
  return out;
}

const STRING_UNION = /^(?:'[^']*'\s*\|?\s*)+$/;

function unionValues(text) {
  return [...text.matchAll(/'([^']*)'/g)].map((m) => m[1]);
}

/**
 * The public props of a component: every name its `interface Props` declares,
 * and for each prop typed as a union of string literals (inline, via a `type`
 * alias, or via `typeof <const array>[number]`), the values it accepts.
 *
 * Shipped components declare their props this way and none spreads a rest
 * object onto the element, so an attribute outside this set is silently
 * dropped at runtime. Returns null when the file declares no `interface Props`.
 */
export function componentProps(source) {
  const script = source.replace(/<style[^>]*>[\s\S]*?<\/style>/g, '');
  const iface = script.match(/interface\s+Props\b[^{]*\{([\s\S]*?)\n\s*\}/);
  if (!iface) return null;
  const aliases = new Map();
  for (const m of script.matchAll(/\btype\s+(\w+)\s*=\s*([^;]+);/g)) aliases.set(m[1], m[2].trim());
  const arrays = new Map();
  for (const m of script.matchAll(/\bconst\s+(\w+)\s*=\s*\[([\s\S]*?)\]\s*as\s+const/g)) arrays.set(m[1], unionValues(m[2]));

  const resolveEnum = (type) => {
    const t = type.replace(/\|\s*undefined\b/g, '').replace(/\bundefined\s*\|/g, '').trim();
    if (STRING_UNION.test(t)) return unionValues(t);
    const viaArray = t.match(/^typeof\s+(\w+)\[number\]$/);
    if (viaArray) return arrays.get(viaArray[1]) ?? null;
    if (/^\w+$/.test(t) && aliases.has(t)) return resolveEnum(aliases.get(t));
    return null;
  };

  const props = new Set();
  const enums = new Map();
  const types = new Map();
  const body = iface[1].replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
  for (const m of body.matchAll(/^\s*(?:readonly\s+)?(\w+)\??\s*:\s*([^;\n]+)/gm)) {
    props.add(m[1]);
    types.set(m[1], m[2].trim());
    const values = resolveEnum(m[2]);
    if (values) enums.set(m[1], new Set(values));
  }
  return { props, enums, types };
}

/** `live-tokens.config.json` at the project root, or nothing. */
export function readProjectConfig(root) {
  const path = join(root, 'live-tokens.config.json');
  if (!existsSync(path)) return {};
  try {
    return JSON.parse(readFileSync(path, 'utf8'));
  } catch {
    return {};
  }
}

function walk(dir, exts, out = []) {
  if (!existsSync(dir)) return out;
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === 'node_modules' || entry.name.startsWith('.') || entry.name.startsWith('__')) continue;
    const full = join(dir, entry.name);
    if (entry.isDirectory()) walk(full, exts, out);
    else if (exts.some((e) => entry.name.endsWith(e))) out.push(full);
  }
  return out;
}

function componentFiles(roots) {
  const seen = new Set();
  const files = [];
  for (const dir of roots) {
    for (const file of walk(dir, ['.svelte'])) {
      if (file.endsWith('Editor.svelte')) continue;
      let key = file;
      try {
        key = realpathSync(file);
      } catch {
        // unreadable link; fall back to the path itself
      }
      if (seen.has(key)) continue;
      seen.add(key);
      files.push(file);
    }
  }
  return files;
}

/** The package's own component ids, read from the frozen registry that declares
    them. A shipped component is registered by the package rather than by the
    project, so it never appears in the project's own `registerComponent` scan. */
const BUILT_IN_REGISTRY = 'src/editor/component-editor/registry.ts';

export function builtInIds(root = process.cwd(), pkgRoot = PKG_ROOT) {
  const ids = new Set();
  for (const base of [pkgRoot, root]) {
    const path = join(base, BUILT_IN_REGISTRY);
    if (!existsSync(path)) continue;
    const block = readFileSync(path, 'utf8')
      .match(/builtInRegistry[^=]*=\s*Object\.freeze\(\{([\s\S]*?)\n\}\);/);
    if (!block) continue;
    for (const m of block[1].matchAll(/\bid:\s*'([a-z][a-z0-9]*)'/g)) ids.add(m[1]);
  }
  return ids;
}

function registeredIds(root) {
  const ids = new Set();
  for (const file of walk(join(root, 'src'), ['.ts', '.js', '.mjs', '.svelte'])) {
    let src;
    try {
      src = readFileSync(file, 'utf8');
    } catch {
      continue;
    }
    if (!/registerComponent|bootLiveTokens/.test(src)) continue;
    for (const m of src.matchAll(/id\s*:\s*['"]([a-z][a-z0-9]*)['"]/g)) ids.add(m[1]);
  }
  return ids;
}

/**
 * Build the vocabulary for `root` (a consumer project, or this repo).
 *
 * Returns sets of names plus the paths they came from, so a checker can say
 * *which* tokens.css a finding was judged against.
 */
export function loadVocabulary({ root = process.cwd(), pkgRoot = PKG_ROOT } = {}) {
  const tokensCssPath =
    resolveTokensCssPath(null, null, root) ??
    (existsSync(join(pkgRoot, 'src/system/styles/tokens.css'))
      ? join(pkgRoot, 'src/system/styles/tokens.css')
      : null);

  const themeTokens = new Set();
  if (tokensCssPath && existsSync(tokensCssPath)) {
    for (const n of declaredCustomProperties(readFileSync(tokensCssPath, 'utf8'))) themeTokens.add(n);
  }

  const componentTokens = new Set();
  const components = new Map();
  // A project's own components sit beside the shipped ones, plus any directory
  // `componentDirs` in live-tokens.config.json names.
  const own = [SHIPPED_COMPONENTS_DIR, ...(readProjectConfig(root).componentDirs ?? [])].map((d) => join(root, d));
  const shippedDir = join(pkgRoot, SHIPPED_COMPONENTS_DIR);
  const dirs = [shippedDir, ...own];
  for (const file of componentFiles(dirs)) {
    const Id = file.slice(file.lastIndexOf('/') + 1).replace('.svelte', '');
    const src = readFileSync(file, 'utf8');
    const tokens = new Map();
    for (const block of extractGlobalRootBlocks(src)) {
      const clean = block.replace(/\/\*[\s\S]*?\*\//g, ' ');
      for (const n of declaredCustomProperties(clean)) componentTokens.add(n);
      for (const m of clean.matchAll(/(--[a-z0-9-]+)\s*:\s*([^;]+);/g)) if (!tokens.has(m[1])) tokens.set(m[1], m[2].trim());
    }
    components.set(Id.toLowerCase(), {
      id: Id.toLowerCase(),
      name: Id,
      file,
      origin: file.startsWith(shippedDir) ? 'shipped' : 'custom',
      props: componentProps(src),
      tokens,
    });
  }
  const registered = registeredIds(root);
  const builtIn = builtInIds(root, pkgRoot);

  return {
    themeTokens,
    componentTokens,
    components,
    registered,
    builtIn,
    tokensCssPath,
    /** True when `name` resolves to something real at runtime. */
    knows(name) {
      return themeTokens.has(name) || componentTokens.has(name);
    },
  };
}

export { PKG_ROOT, walk };
