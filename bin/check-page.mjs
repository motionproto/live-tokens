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
import { isExcluded, lineOf } from './lib/findings.mjs';
import { blankStrings, hasColorLiteral, hasDimensionLiteral, stripVarFallbacks } from './lib/cssValues.mjs';
import { isContractToken, loadVocabulary, walk } from './lib/tokenVocabulary.mjs';
import { resolveTokensCssPath } from './migrate.mjs';

export const PAGE_RULES = {
  'unknown-component': 'error',
  'unknown-prop': 'error',
  'unknown-prop-value': 'error',
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

export const COMPONENT_IMPORT =
  /(?:@motion-proto\/live-tokens\/components|[./][^'"]*\/system\/components)\/([A-Za-z0-9]+)\.svelte$/;

const DEEP_IMPORT_PATTERNS = [
  /^@motion-proto\/live-tokens\/src\//,
  /node_modules\/@motion-proto\/live-tokens/,
];

const TEXT_AXES = ['font-size', 'font-family', 'font-weight', 'line-height', 'letter-spacing'];

// The geometry the theme owns: spacing, stroke, radius, and shadow all have a
// token scale, and `set-geometry` moves them. Sizing (a hero's height, a
// column's minimum width, a max content width) is layout, has no scale, and
// stays literal.
const THEMED_GEOMETRY = /^(padding|margin|gap|row-gap|column-gap|border|outline|inset|top|right|bottom|left|box-shadow|text-shadow)(-|$)|-radius$/;

// A local two-up or three-up is a layout. From four columns on, a hardcoded
// count reads as a claim about the page grid, which `--columns-count` owns.
const PAGE_GRID_COLUMNS = 4;

/** Blank out comments, url() payloads, and string contents so none of them can match a rule. */
function neutralise(css) {
  return blankStrings(
    css
      .replace(/\/\*[\s\S]*?\*\//g, (m) => ' '.repeat(m.length))
      .replace(/url\((?:[^()]|\([^()]*\))*\)/g, (m) => ' '.repeat(m.length)),
  );
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

/**
 * Inline styles in markup, as declaration lists the value rules can read: a
 * `style="..."` attribute verbatim, and a `style:prop="value"` directive
 * rewritten as `prop: value;`. A `{...}` expression is dynamic and skipped.
 */
function inlineStyleRegions(code) {
  const out = [];
  for (const m of code.matchAll(/\sstyle=(["'])([^"']*)\1/g)) {
    out.push({ text: `${m[2]};`, offset: m.index + m[0].indexOf(m[2]) });
  }
  for (const m of code.matchAll(/\sstyle:([a-z-]+)=(["'])([^"']*)\2/g)) {
    out.push({ text: `${m[1]}: ${m[3]};`, offset: m.index + 1 });
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
 * A property name is read from its start, so `--heading-2xl` is one custom
 * property and never the property `xl`.
 */
function declarations(css) {
  const body = css.replace(/@[a-z-]+[^;{]*(?=\{)/gi, (m) => ' '.repeat(m.length));
  const out = [];
  for (const m of body.matchAll(/(?<![\w-])((?:--)?[a-z][\w-]*)\s*:\s*([^;{}]+)[;}]/gi)) {
    out.push({ prop: m[1].toLowerCase(), value: m[2].trim(), index: m.index });
  }
  return out;
}

/**
 * The attributes of one component tag starting at `start` (the `<`), read with
 * `{}` depth and quotes tracked so an expression holding `>` does not end the
 * tag early. Returns null when the tag spreads an object, which makes its prop
 * set unknowable.
 */
function tagAttributes(code, start) {
  let i = code.indexOf(' ', start);
  const tagEnd = (() => {
    let depth = 0;
    let quote = null;
    for (let j = start; j < code.length; j++) {
      const c = code[j];
      if (quote) {
        if (c === quote) quote = null;
      } else if (c === '"' || c === "'") quote = c;
      else if (c === '{') depth++;
      else if (c === '}') depth--;
      else if (c === '>' && depth === 0) return j;
    }
    return code.length;
  })();
  if (i === -1 || i > tagEnd) return { attrs: [], end: tagEnd };
  const attrs = [];
  while (i < tagEnd) {
    const c = code[i];
    if (/\s/.test(c) || c === '/') {
      i++;
      continue;
    }
    if (c === '{') {
      let depth = 0;
      let j = i;
      for (; j < tagEnd; j++) {
        if (code[j] === '{') depth++;
        else if (code[j] === '}' && --depth === 0) break;
      }
      const inner = code.slice(i + 1, j).trim();
      if (inner.startsWith('...')) return null;
      if (/^\w+$/.test(inner)) attrs.push({ name: inner, value: null, index: i });
      i = j + 1;
      continue;
    }
    const name = code.slice(i).match(/^[^\s=/>]+/)?.[0];
    if (!name) break;
    const at = i;
    i += name.length;
    let value = null;
    if (code[i] === '=') {
      i++;
      const q = code[i];
      if (q === '"' || q === "'") {
        const close = code.indexOf(q, i + 1);
        value = code.slice(i + 1, close === -1 ? tagEnd : close);
        i = close === -1 ? tagEnd : close + 1;
      } else if (q === '{') {
        let depth = 0;
        for (; i < tagEnd; i++) {
          if (code[i] === '{') depth++;
          else if (code[i] === '}' && --depth === 0) break;
        }
        i++;
      } else {
        const bare = code.slice(i).match(/^[^\s>]+/)?.[0] ?? '';
        value = bare;
        i += bare.length;
      }
    }
    attrs.push({ name, value, index: at });
  }
  return { attrs, end: tagEnd };
}

/** Props a page passes that the component does not declare, or values outside a prop's union. */
function checkComponentUsage(code, imports, add) {
  for (const [local, entry] of imports) {
    const props = entry.props;
    if (!props) continue;
    const re = new RegExp(`<${local}(?=[\\s/>])`, 'g');
    for (const m of code.matchAll(re)) {
      const tag = tagAttributes(code, m.index);
      if (!tag) continue;
      for (const { name, value, index } of tag.attrs) {
        if (name.includes(':') || name.startsWith('@') || name === 'children') continue;
        if (!props.props.has(name)) {
          add('unknown-prop', index, `${entry.name} has no prop '${name}'; it accepts ${[...props.props].join(', ')}`);
          continue;
        }
        const allowed = props.enums.get(name);
        if (allowed && value !== null && !allowed.has(value)) {
          add('unknown-prop-value', index, `${entry.name} ${name}="${value}" is not one of ${[...allowed].join(', ')}`);
        }
      }
    }
  }
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
    const imports = new Map();
    for (const m of code.matchAll(/import\s+(?:([^'"]*?)\s+from\s+)?['"]([^'"]+)['"]/g)) {
      const spec = m[2];
      for (const pattern of DEEP_IMPORT_PATTERNS) {
        if (pattern.test(spec)) {
          add('deep-import', m.index, `deep import into package internals: ${spec}`);
        }
      }
      const comp = spec.match(COMPONENT_IMPORT);
      if (!comp) continue;
      const entry = vocab.components.get(comp[1].toLowerCase());
      if (!entry) {
        add(
          'unknown-component',
          m.index,
          `'${comp[1]}' is not in the component catalogue; author it with live-tokens-create-component or pick a shipped one`,
        );
        continue;
      }
      const local = m[1]?.trim().match(/^(\w+)$/)?.[1];
      if (local) imports.set(local, entry);
    }
    checkComponentUsage(code, imports, add);

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

  for (const region of [...regions, ...(code === null ? [] : inlineStyleRegions(code))]) {
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

      // A `var()` fallback only renders when the token is missing, so a literal
      // inside one is not the page's value.
      const painted = stripVarFallbacks(value);
      if (!TEXT_AXES.includes(prop) && hasColorLiteral(painted)) {
        add('color-literal', at(index), `${prop}: ${value}. Use a theme token, not a colour literal.`);
        continue;
      }

      // Only absolute type values are a finding. `em`, `%`, and a unitless
      // line-height are relative to the inherited type, so they ride whatever
      // the theme sets rather than overriding it.
      if (
        (TEXT_AXES.includes(prop) || prop === 'font') &&
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

      if (THEMED_GEOMETRY.test(prop) && hasDimensionLiteral(painted)) {
        add(
          'dimension-literal',
          at(index),
          `${prop}: ${value}. Use a --space-*, --radius-*, --border-width-*, or --shadow-* token.`,
        );
      }

      const columns = value.match(/\brepeat\(\s*(\d+)\s*,\s*1fr\s*\)/);
      if (columns && Number(columns[1]) >= PAGE_GRID_COLUMNS) {
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
