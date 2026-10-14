#!/usr/bin/env node
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import postcss from 'postcss';

const args = process.argv.slice(2);
const asJson = args.includes('--json');
const dir = args.find((a) => !a.startsWith('--'));
if (!dir) {
  console.error('usage: node scripts/css-var-census.mjs <build-output-dir> [--json]');
  process.exit(2);
}

function walk(root) {
  return readdirSync(root).flatMap((name) => {
    const path = join(root, name);
    return statSync(path).isDirectory() ? walk(path) : [path];
  });
}

const files = walk(dir);
const cssFiles = files.filter((f) => f.endsWith('.css'));
const jsFiles = files.filter((f) => f.endsWith('.js') || f.endsWith('.mjs'));
const htmlFiles = files.filter((f) => f.endsWith('.html'));

const ROOT_SELECTORS = new Set([':root', ':root:root', ':where(:root)', 'html']);
const isRootSelector = (selector) =>
  selector.split(',').every((part) => ROOT_SELECTORS.has(part.trim()));
const varRefs = (text) => [...text.matchAll(/var\(\s*(--[\w-]+)/g)].map((m) => m[1]);

const decls = [];
const regularRefs = new Set();
const atRuleNames = new Set();
const registered = new Set();
const rootDeclsByFile = {};

for (const file of cssFiles) {
  const label = relative(dir, file);
  rootDeclsByFile[label] = 0;
  postcss.parse(readFileSync(file, 'utf8')).walk((node) => {
    if (node.type === 'atrule') {
      if (node.name === 'property') registered.add(node.params.trim());
      for (const m of node.params.matchAll(/--[\w-]+/g)) atRuleNames.add(m[0]);
      return;
    }
    if (node.type !== 'decl') return;
    if (!node.prop.startsWith('--')) {
      for (const ref of varRefs(node.value)) regularRefs.add(ref);
      return;
    }
    let atRules = 0;
    let selector = null;
    for (let p = node.parent; p && p.type !== 'root'; p = p.parent) {
      if (p.type === 'atrule') atRules += 1;
      else if (p.type === 'rule' && selector === null) selector = p.selector;
    }
    const onRoot = selector !== null && isRootSelector(selector);
    decls.push({ name: node.prop, value: node.value, onRoot, bareRoot: onRoot && atRules === 0 });
    if (onRoot) rootDeclsByFile[label] += 1;
  });
}

const declared = new Set(decls.map((d) => d.name));

// Minified JS is full of `--i` decrements, so only tokens that match a
// declared variable count as names the script reads or writes.
const scriptTokens = new Set(
  [...jsFiles, ...htmlFiles].flatMap((f) =>
    [...readFileSync(f, 'utf8').matchAll(/(?<![\w-])--[A-Za-z_][\w-]*/g)].map((m) => m[0]),
  ),
);
const scriptNames = new Set([...scriptTokens].filter((n) => declared.has(n)));

const deps = new Map();
for (const d of decls) {
  if (!deps.has(d.name)) deps.set(d.name, new Set());
  for (const ref of varRefs(d.value)) deps.get(d.name).add(ref);
}
const reached = new Set();
const pending = [...regularRefs, ...atRuleNames, ...scriptNames];
while (pending.length) {
  const name = pending.pop();
  if (reached.has(name)) continue;
  reached.add(name);
  for (const dep of deps.get(name) ?? []) pending.push(dep);
}

const scoped = new Set(decls.filter((d) => !d.bareRoot).map((d) => d.name));
const dynamicSeeds = [...declared].filter(
  (n) => scoped.has(n) || scriptNames.has(n) || atRuleNames.has(n) || registered.has(n),
);
const dependents = new Map();
for (const [name, refs] of deps) {
  for (const ref of refs) {
    if (!dependents.has(ref)) dependents.set(ref, new Set());
    dependents.get(ref).add(name);
  }
}
const dynamic = new Set();
const spread = [...dynamicSeeds];
while (spread.length) {
  const name = spread.pop();
  if (dynamic.has(name)) continue;
  dynamic.add(name);
  for (const dependent of dependents.get(name) ?? []) spread.push(dependent);
}

const rootDecls = decls.filter((d) => d.onRoot);
const rootNames = new Set(rootDecls.map((d) => d.name));
const prefixOf = (name) => name.slice(2).split('-')[0];
const rootByPrefix = {};
for (const name of rootNames) rootByPrefix[prefixOf(name)] = (rootByPrefix[prefixOf(name)] ?? 0) + 1;

const scriptNamesByFile = Object.fromEntries(
  jsFiles.map((f) => {
    const tokens = new Set(readFileSync(f, 'utf8').match(/(?<![\w-])--[A-Za-z_][\w-]*/g) ?? []);
    return [relative(dir, f), [...tokens].filter((n) => declared.has(n)).length];
  }),
);

const report = {
  dir,
  cssFiles: cssFiles.length,
  jsFiles: jsFiles.map((f) => relative(dir, f)).sort(),
  rootDistinct: rootNames.size,
  rootDeclarations: rootDecls.length,
  rootRedeclared: rootDecls.length - rootNames.size,
  bareRootRedeclared:
    decls.filter((d) => d.bareRoot).length - new Set(decls.filter((d) => d.bareRoot).map((d) => d.name)).size,
  scriptNames: scriptNames.size,
  reached: [...rootNames].filter((n) => reached.has(n)).length,
  unreached: [...rootNames].filter((n) => !reached.has(n)).length,
  dynamicReached: [...rootNames].filter((n) => reached.has(n) && dynamic.has(n)).length,
  dynamicReachedNames: [...rootNames].filter((n) => reached.has(n) && dynamic.has(n)).sort(),
  rootDeclarationsByFile: rootDeclsByFile,
  scriptNamesByFile,
  rootDistinctByPrefix: Object.fromEntries(Object.entries(rootByPrefix).sort((a, b) => b[1] - a[1])),
};

if (asJson) {
  console.log(JSON.stringify(report, null, 2));
} else {
  const rows = [
    ['Distinct variables declared on :root', report.rootDistinct],
    ['Declarations on :root', report.rootDeclarations],
    ['Redeclarations on :root (crossed out in DevTools)', report.rootRedeclared],
    ['Declared variables the JS names', report.scriptNames],
    ['Variables some rule reaches', report.reached],
    ['Variables no rule reaches', report.unreached],
    ['Reached variables that must stay variables', report.dynamicReached],
  ];
  const width = Math.max(...rows.map(([label]) => label.length));
  console.log(`${dir}: ${report.cssFiles} CSS files, ${report.jsFiles.length} JS files`);
  for (const [label, value] of rows) console.log(`  ${label.padEnd(width)}  ${value}`);
  const top = Object.entries(report.rootDistinctByPrefix).slice(0, 12);
  console.log(`  Largest :root prefixes: ${top.map(([p, n]) => `${p} ${n}`).join(', ')}`);
}
