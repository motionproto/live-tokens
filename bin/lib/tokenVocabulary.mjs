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

// Shipped components keep their editor beside the other editors; a
// consumer-authored one sits next to its runtime. Probe both.
export const EDITOR_DIRS = ['src/system/components', 'src/editor/component-editor'];

function capitalize(id) {
  return id.charAt(0).toUpperCase() + id.slice(1);
}

/** Token scales whose names are governed by the token contract (see TOKENS.md).
 *  `border-width` stands apart from `border` because the two measure different
 *  things: a stroke's width resolves on a length scale, its paint on a colour
 *  one, and a repair that offered the other's tokens would be nonsense. */
export const CONTRACT_SCALES = [
  'surface', 'text', 'border', 'border-width', 'color', 'space', 'radius', 'font', 'line-height',
  'letter-spacing', 'shadow', 'blur', 'icon-size', 'scrim', 'tint', 'columns',
  'heading', 'body', 'editorial', 'eyebrow', 'code', 'easing', 'duration', 'zoom',
  'gradient', 'stroke',
];

/** True when `name` belongs to a contract-governed scale, so a miss is a typo. */
export function isContractToken(name) {
  const stem = name.replace(/^--/, '');
  return CONTRACT_SCALES.some((f) => stem === f || stem.startsWith(`${f}-`));
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
 * Every component this project can resolve on its own: a runtime under
 * `src/system/components` or a configured `componentDirs` entry, plus every
 * id `registeredIds` finds with no runtime anywhere, so a dangling
 * registration is a fact in the inventory rather than a silent gap.
 *
 * Deliberately never looks under `pkgRoot` for a shipped id a project hasn't
 * vendored — that is `resolveComponentPaths`'s own fallback for a single
 * named id, not a batch this inventory would run over (a consumer's batch is
 * their own components only; shipped runtimes sit in node_modules, where no
 * inventory looks).
 *
 * The single scan every caller reads: `report`, the `check-component` batch,
 * `resolveComponentPaths`, and the `components` verb.
 */
export function componentInventory(root = process.cwd(), pkgRoot = PKG_ROOT) {
  const built = builtInIds(root, pkgRoot);
  const registered = registeredIds(root);
  const dirs = [SHIPPED_COMPONENTS_DIR, ...(readProjectConfig(root).componentDirs ?? [])];
  const entries = new Map();

  const guessEditorPath = (Id) =>
    EDITOR_DIRS.map((d) => join(root, d, `${Id}Editor.svelte`)).find(existsSync) ??
    join(root, EDITOR_DIRS[0], `${Id}Editor.svelte`);

  for (const dirRel of dirs) {
    const dir = join(root, dirRel);
    if (!existsSync(dir)) continue;
    for (const fileName of readdirSync(dir)) {
      if (!fileName.endsWith('.svelte') || fileName.endsWith('Editor.svelte')) continue;
      const Id = fileName.replace('.svelte', '');
      const id = Id.toLowerCase();
      if (entries.has(id)) continue;
      const editorPath = guessEditorPath(Id);
      entries.set(id, {
        id,
        Id,
        origin: built.has(id) ? 'shipped' : 'custom',
        runtimePath: join(dir, fileName),
        editorPath,
        registered: built.has(id) || registered.has(id),
        runtimeExists: true,
        editorExists: existsSync(editorPath),
      });
    }
  }

  for (const id of registered) {
    if (entries.has(id)) continue;
    const Id = capitalize(id);
    const editorPath = guessEditorPath(Id);
    entries.set(id, {
      id,
      Id,
      origin: built.has(id) ? 'shipped' : 'custom',
      runtimePath: join(root, SHIPPED_COMPONENTS_DIR, `${Id}.svelte`),
      editorPath,
      registered: true,
      runtimeExists: false,
      editorExists: existsSync(editorPath),
    });
  }

  return entries;
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
  const registered = registeredIds(root);
  const builtIn = builtInIds(root, pkgRoot);

  // The package's shipped directory first, so a shipped component's tokens
  // are in the vocabulary even when a project hasn't vendored it — the one
  // gap the inventory itself deliberately leaves, since it never looks under
  // `pkgRoot`. Then the project's own inventory (its `src/system/components`
  // plus any `componentDirs`), which overrides by id: a project's own copy of
  // a shipped component wins over the package's. Reusing the inventory here,
  // instead of a second directory scan, is what keeps `report.components` and
  // `report.findings.components.checked` naming the same ids.
  const filesById = new Map();
  for (const file of componentFiles([join(pkgRoot, SHIPPED_COMPONENTS_DIR)])) {
    const id = file.slice(file.lastIndexOf('/') + 1).replace('.svelte', '').toLowerCase();
    filesById.set(id, file);
  }
  for (const entry of componentInventory(root, pkgRoot).values()) {
    if (entry.runtimeExists) filesById.set(entry.id, entry.runtimePath);
  }

  for (const [id, file] of filesById) {
    const Id = file.slice(file.lastIndexOf('/') + 1).replace('.svelte', '');
    const src = readFileSync(file, 'utf8');
    const tokens = new Map();
    for (const block of extractGlobalRootBlocks(src)) {
      const clean = block.replace(/\/\*[\s\S]*?\*\//g, ' ');
      for (const n of declaredCustomProperties(clean)) componentTokens.add(n);
      for (const m of clean.matchAll(/(--[a-z0-9-]+)\s*:\s*([^;]+);/g)) if (!tokens.has(m[1])) tokens.set(m[1], m[2].trim());
    }
    components.set(id, {
      id,
      name: Id,
      file,
      origin: builtIn.has(id) ? 'shipped' : 'custom',
      props: componentProps(src),
      tokens,
    });
  }

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
