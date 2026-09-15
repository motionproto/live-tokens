// Static validator for a live-tokens page.
//
// Asserts that a page satisfies the contract described in the
// live-tokens-create-page skill: it is assembled from catalogue components, and
// every value in its CSS is a theme token rather than a literal. The rules and
// their default severities are in PAGE_RULES; each is overridable per project
// (live-tokens.config.json) or per run (--off/--warn/--error/--strict), because
// the line between "wrong" and "deliberate" moves with the project.
//
// Returns { findings, checked } — findings carry a stable `rule` id so a skill
// can parse --json output, fix, and re-run until the exit code is 0.

import { existsSync, readFileSync, statSync } from 'node:fs';
import { join, relative, resolve, basename } from 'node:path';
import { assembleRules, isExcluded, lineOf } from './lib/findings.mjs';
import { codeRegion, inlineStyleRegions, styleRegions } from './lib/pageSource.mjs';
import { loadVocabulary, walk } from './lib/tokenVocabulary.mjs';
import { resolveTokensCssPath } from './migrate.mjs';
import * as componentUse from './rules/componentUse.mjs';
import * as importsAndRoutes from './rules/importsAndRoutes.mjs';
import * as testRuns from './rules/testRuns.mjs';
import * as tokenRules from './rules/tokens.mjs';

/** Every rule, with its default severity, its repair, and its guidance. Same
 *  three fields, same meanings, as `COMPONENT_RULES`. */
export const PAGE_RULES = assembleRules(
  [
    'tokens-migration',
    'tokens-breaking-migration',
    'unknown-component',
    'unknown-prop',
    'unknown-prop-value',
    'deep-import',
    'unknown-token',
    'color-literal',
    'reserved-route',
    'site-css-in-main',
    'raw-text-axis',
    'dimension-literal',
    'hardcoded-columns',
    'missing-source',
    'control-size',
    'multiple-primary',
    'danger-without-dialog',
    'native-control',
    'property-override',
    'page-component-paint',
    'page-text-style',
    'page-contrast',
    'page-grid',
    'page-overflow',
    'tests-not-installed',
    'tests-setup',
    'tests-incomplete',
  ],
  componentUse.pageRules,
  importsAndRoutes.pageRules,
  tokenRules.pageRules,
  testRuns.pageRules,
);

// Directories that hold the system, not pages built on it.
export const NOT_PAGES = ['src/system', 'src/editor', 'src/lib', 'src/live-tokens'];

export { COMPONENT_IMPORT } from './rules/componentUse.mjs';

function checkFile(file, text, vocab, root) {
  const rel = relative(root, file);
  const findings = [];
  const add = (rule, index, message, extra = {}) =>
    findings.push({ rule, file: rel, line: lineOf(text, index), message, ...extra });

  const code = codeRegion(text, file);
  const regions = styleRegions(text, file);
  const inlineRegions = code === null ? [] : inlineStyleRegions(code);
  if (code !== null) {
    const imports = new Map();
    for (const m of code.matchAll(/import\s+(?:([^'"]*?)\s+from\s+)?['"]([^'"]+)['"]/g)) {
      const statement = { index: m.index, clause: m[1], specifier: m[2] };
      importsAndRoutes.checkPageImport(statement, add);
      componentUse.resolveComponentImport(statement, vocab, imports, add);
    }
    componentUse.checkComponentTags(code, imports, add);
    importsAndRoutes.checkRoutes({ file, code }, add);
  }

  componentUse.checkPropertyOverrides({ text, regions, inlineRegions, vocab }, add);
  tokenRules.checkPageValues({ text, regions, inlineRegions, vocab }, add);

  return findings;
}

// Files that define the vocabulary rather than consume it.
const TOKEN_SOURCES = ['tokens.generated.css', 'fonts.css'];

/** Pages to check when the caller names none: every .svelte/.css under src/ that is not system code. */
export function discoverPages(root) {
  const src = join(root, 'src');
  if (!existsSync(src)) return [];
  const tokensCss = resolveTokensCssPath(null, null, root);
  return walk(src, ['.svelte', '.css', '.ts', '.js']).filter((f) => {
    const rel = relative(root, f);
    if (NOT_PAGES.some((d) => rel.startsWith(`${d}/`))) return false;
    if (isExcluded(rel, root)) return false;
    if (f === tokensCss || TOKEN_SOURCES.includes(basename(f))) return false;
    if (/\.(test|spec)\.[tj]s$/.test(rel)) return false;
    if (rel.endsWith('.ts') || rel.endsWith('.js')) return /main\.(ts|js)$/.test(rel);
    return true;
  });
}

export function checkPages(targets, { root = process.cwd(), vocabulary } = {}) {
  const vocab = vocabulary ?? loadVocabulary({ root });
  const files = [];
  for (const t of targets) {
    const full = resolve(root, t);
    if (!existsSync(full)) continue;
    if (statSync(full).isDirectory()) {
      files.push(...walk(full, ['.svelte', '.css']).filter((f) => !isExcluded(relative(root, f), root)));
    } else {
      files.push(full);
    }
  }
  const findings = [];
  for (const file of files) {
    findings.push(...checkFile(file, readFileSync(file, 'utf8'), vocab, root));
  }
  return { findings, checked: files.length };
}
