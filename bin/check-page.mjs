// Static validator for a live-tokens page.
//
// Asserts that a page satisfies the contract described in the
// live-tokens-build-page skill: it is assembled from catalogue components, and
// every value in its CSS is a theme token rather than a literal. The rules and
// their default severities are in PAGE_RULES; each is overridable per project
// (live-tokens.config.json) or per run (--off/--warn/--error/--strict), because
// the line between "wrong" and "deliberate" moves with the project.
//
// Returns { findings, checked } — findings carry a stable `rule` id so a skill
// can parse --json output, fix, and re-run until the exit code is 0.

import { existsSync, readFileSync, statSync } from 'node:fs';
import { join, relative, resolve, basename } from 'node:path';
import { lineOf } from './lib/findings.mjs';
import { isContractToken, loadVocabulary, walk } from './lib/tokenVocabulary.mjs';

export const PAGE_RULES = {
  'unknown-component': 'error',
  'deep-import': 'error',
  'unknown-token': 'error',
  'color-literal': 'error',
  'reserved-route': 'error',
  'site-css-in-main': 'error',
  'dimension-literal': 'warn',
  'hardcoded-columns': 'warn',
  'raw-text-axis': 'warn',
  'missing-source': 'warn',
};

// Directories that hold the system, not pages built on it.
const NOT_PAGES = ['src/system', 'src/editor', 'src/lib', 'src/live-tokens'];

const COMPONENT_IMPORT =
  /(?:@motion-proto\/live-tokens\/components|[./][^'"]*\/system\/components)\/([A-Za-z0-9]+)\.svelte$/;

const DEEP_IMPORT_PATTERNS = [
  /^@motion-proto\/live-tokens\/src\//,
  /node_modules\/@motion-proto\/live-tokens/,
];

const TEXT_AXES = ['font-size', 'font-family', 'font-weight', 'line-height', 'letter-spacing'];

/** Blank out comments and url() payloads so their contents never match a rule. */
function neutralise(css) {
  return css
    .replace(/\/\*[\s\S]*?\*\//g, (m) => ' '.repeat(m.length))
    .replace(/url\((?:[^()]|\([^()]*\))*\)/g, (m) => ' '.repeat(m.length));
}

/**
 * Replace `var(--x, <fallback>)` with `var(--x)`. A fallback only renders when
 * the token is missing, so its literals are not the page's real values.
 */
function stripVarFallbacks(value) {
  let out = '';
  for (let i = 0; i < value.length; i++) {
    if (!value.startsWith('var(', i)) {
      out += value[i];
      continue;
    }
    let depth = 0;
    let comma = -1;
    let j = i;
    for (; j < value.length; j++) {
      const c = value[j];
      if (c === '(') depth++;
      else if (c === ')') {
        depth--;
        if (depth === 0) break;
      } else if (c === ',' && depth === 1 && comma === -1) comma = j;
    }
    out += comma === -1 ? value.slice(i, j + 1) : `${value.slice(i, comma)})`;
    i = j;
  }
  return out;
}

/** `<style>` blocks with their absolute offset in the file; whole file for .css. */
function styleRegions(text, file) {
  if (file.endsWith('.css')) return [{ text, offset: 0 }];
  const out = [];
  for (const m of text.matchAll(/<style[^>]*>([\s\S]*?)<\/style>/g)) {
    out.push({ text: m[1], offset: m.index + m[0].indexOf(m[1]) });
  }
  return out;
}

/** Everything outside `<style>`: script and markup. */
function codeRegion(text, file) {
  if (file.endsWith('.css')) return null;
  return text.replace(/<style[^>]*>[\s\S]*?<\/style>/g, (m) => ' '.repeat(m.length));
}

/**
 * Declarations in a stylesheet, with at-rule preludes excluded. A breakpoint in
 * `@media (max-width: 768px)` is structural geometry, not a themeable value.
 */
function declarations(css) {
  const body = css.replace(/@[a-z-]+[^;{]*(?=\{)/gi, (m) => ' '.repeat(m.length));
  const out = [];
  for (const m of body.matchAll(/([a-z-]+)\s*:\s*([^;{}]+)[;}]/gi)) {
    out.push({ prop: m[1].toLowerCase(), value: m[2].trim(), index: m.index });
  }
  return out;
}

/** The object literal enclosing `index`, found by balancing braces outward. */
function enclosingObject(text, index) {
  let depth = 0;
  let start = -1;
  for (let i = index; i >= 0; i--) {
    const c = text[i];
    if (c === '}') depth++;
    else if (c === '{') {
      if (depth === 0) {
        start = i;
        break;
      }
      depth--;
    }
  }
  if (start === -1) return null;
  depth = 0;
  for (let i = start; i < text.length; i++) {
    const c = text[i];
    if (c === '{') depth++;
    else if (c === '}') {
      depth--;
      if (depth === 0) return text.slice(start, i + 1);
    }
  }
  return null;
}

function checkFile(file, text, vocab, root) {
  const rel = relative(root, file);
  const findings = [];
  const add = (rule, index, message) =>
    findings.push({ rule, file: rel, line: lineOf(text, index), message });

  const code = codeRegion(text, file);
  if (code !== null) {
    for (const m of code.matchAll(/import\s+(?:[^'"]*\s+from\s+)?['"]([^'"]+)['"]/g)) {
      const spec = m[1];
      for (const pattern of DEEP_IMPORT_PATTERNS) {
        if (pattern.test(spec)) {
          add('deep-import', m.index, `deep import into package internals: ${spec}`);
        }
      }
      const comp = spec.match(COMPONENT_IMPORT);
      if (comp && !vocab.components.has(comp[1].toLowerCase())) {
        add(
          'unknown-component',
          m.index,
          `'${comp[1]}' is not in the component catalogue; author it with live-tokens-create-component or pick a shipped one`,
        );
      }
    }

    for (const m of code.matchAll(/['"](\/live-tokens[^'"]*)['"]\s*:/g)) {
      add('reserved-route', m.index, `route '${m[1]}' is inside the reserved /live-tokens/* namespace`);
    }

    for (const m of code.matchAll(/\blazy\s*:/g)) {
      const entry = enclosingObject(code, m.index);
      if (entry && !/\bsource\s*:/.test(entry)) {
        add('missing-source', m.index, `route entry has no 'source', so Page Source cannot open it`);
      }
    }

    if (/^main\.(ts|js)$/.test(basename(file))) {
      for (const m of code.matchAll(/import\s+['"]([^'"]*site\.css)['"]/g)) {
        add(
          'site-css-in-main',
          m.index,
          `site.css imported from main; import it from each page's <script> so it cannot leak into editor routes`,
        );
      }
    }
  }

  // A page may also mint a custom property outside its <style> block — a
  // `style:--x={...}` directive or an el.style.setProperty call — and those are
  // just as declared as one written in CSS.
  const declaredHere = new Set();
  const regions = styleRegions(text, file);
  for (const region of regions) {
    for (const m of neutralise(region.text).matchAll(/(?:^|[;{])\s*(--[a-z0-9-]+)\s*:/gim)) {
      declaredHere.add(m[1]);
    }
  }
  for (const m of text.matchAll(/(?:style:|setProperty\(\s*['"`]|['"`])(--[a-z0-9-]+)/g)) {
    declaredHere.add(m[1]);
  }

  for (const region of regions) {
    const css = neutralise(region.text);
    const at = (i) => region.offset + i;

    for (const m of css.matchAll(/var\(\s*(--[a-z0-9-]+)/g)) {
      const name = m[1];
      if (declaredHere.has(name) || vocab.knows(name)) continue;
      add(
        'unknown-token',
        at(m.index),
        isContractToken(name)
          ? `${name} looks like a theme token but no longer exists; check tokens.css for a rename`
          : `${name} is not a theme token, a component token, or declared in this file`,
      );
    }

    for (const decl of declarations(css)) {
      const { prop, value, index } = decl;
      if (prop.startsWith('--')) continue;

      if (/#[0-9a-f]{3,8}\b|\brgba?\(|\bhsla?\(|\boklch\(|\boklab\(/i.test(value)) {
        add('color-literal', at(index), `${prop}: ${value}. Use a theme token, not a colour literal.`);
        continue;
      }

      // Only absolute type values are a finding. `em`, `%`, and a unitless
      // line-height are relative to the inherited type, so they ride whatever
      // the theme sets rather than overriding it.
      if (
        TEXT_AXES.includes(prop) &&
        !value.includes('var(') &&
        !/^(inherit|initial|unset|normal)$/.test(value) &&
        /\d(px|rem|pt)\b|^[a-z"']/i.test(value)
      ) {
        add(
          'raw-text-axis',
          at(index),
          `${prop}: ${value}. Set type from a text style bundle (--heading-*, --body-*, --editorial-*).`,
        );
        continue;
      }

      const dims = [...stripVarFallbacks(value).matchAll(/(?<![\w.-])(\d*\.?\d+)(px|rem)\b/g)].filter(
        (d) => parseFloat(d[1]) !== 0,
      );
      if (dims.length > 0) {
        add(
          'dimension-literal',
          at(index),
          `${prop}: ${value}. Use a --space-*, --radius-*, or --border-width-* token.`,
        );
      }

      // Only the page-grid shape. `repeat(2, minmax(max-content, 1fr))` is a
      // local two-up, not a claim about the page's columns.
      if (/\brepeat\(\s*\d+\s*,\s*1fr\s*\)/.test(value)) {
        add(
          'hardcoded-columns',
          at(index),
          `${prop}: ${value}. Use repeat(var(--columns-count), 1fr) so the page grid stays in step.`,
        );
      }
    }
  }

  return findings;
}

/** Pages to check when the caller names none: every .svelte/.css under src/ that is not system code. */
export function discoverPages(root) {
  const src = join(root, 'src');
  if (!existsSync(src)) return [];
  return walk(src, ['.svelte', '.css', '.ts', '.js']).filter((f) => {
    const rel = relative(root, f);
    if (NOT_PAGES.some((d) => rel.startsWith(`${d}/`))) return false;
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
      files.push(...walk(full, ['.svelte', '.css']));
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
