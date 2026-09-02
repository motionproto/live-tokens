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
const CONTRACT_FAMILIES = [
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

export function extractGlobalRootBlocks(source) {
  return [...source.matchAll(/:global\(:root\)\s*\{([\s\S]*?)\n\s*\}/g)].map((m) => m[1]);
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
  const dirs = [join(pkgRoot, SHIPPED_COMPONENTS_DIR), join(root, SHIPPED_COMPONENTS_DIR)];
  for (const file of componentFiles(dirs)) {
    const Id = file.slice(file.lastIndexOf('/') + 1).replace('.svelte', '');
    components.set(Id.toLowerCase(), { id: Id.toLowerCase(), name: Id, file });
    const src = readFileSync(file, 'utf8');
    for (const block of extractGlobalRootBlocks(src)) {
      for (const n of declaredCustomProperties(block)) componentTokens.add(n);
    }
  }
  const registered = registeredIds(root);

  return {
    themeTokens,
    componentTokens,
    components,
    registered,
    tokensCssPath,
    /** True when `name` resolves to something real at runtime. */
    knows(name) {
      return themeTokens.has(name) || componentTokens.has(name);
    },
  };
}

export { PKG_ROOT, walk };
