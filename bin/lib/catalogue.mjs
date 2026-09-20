// The registry as a query. Every component a project has, shipped or its own,
// with the props each takes and the tokens each declares, and every theme token
// grouped by scale. Read from files through the same vocabulary the checkers
// use, so a skill or a script sees exactly what the checkers will hold it to.

import { readFileSync } from 'node:fs';
import { join, relative } from 'node:path';
import { CONTRACT_SCALES, PKG_ROOT } from './tokenVocabulary.mjs';

const PKG = '@motion-proto/live-tokens';

// The one deep import with a public equivalent: a component by file.
const DEEP_COMPONENT = new RegExp(`^${PKG}/src/system/components/([A-Za-z0-9]+\\.svelte)$`);

let subpaths = null;

/** Everything the package's `exports` map makes importable, as specifiers. */
export function publicSubpaths() {
  if (subpaths) return subpaths;
  try {
    const pkg = JSON.parse(readFileSync(join(PKG_ROOT, 'package.json'), 'utf8'));
    subpaths = Object.keys(pkg.exports ?? {}).map((key) => (key === '.' ? PKG : `${PKG}/${key.slice(2)}`));
  } catch {
    subpaths = [];
  }
  return subpaths;
}

/**
 * What a `deep-import` finding's repair needs. A component file has one public
 * specifier, so the rewrite is mechanical; anything else reaches for internals
 * that may have no public equivalent at all, which leaves the choice open.
 */
export function deepImportRepair(specifier) {
  const m = DEEP_COMPONENT.exec(specifier);
  if (!m) return { details: { specifier, exports: publicSubpaths() }, repair: 'choice' };
  const publicSpecifier = `${PKG}/components/${m[1]}`;
  return { details: { specifier, public: publicSpecifier, patch: { from: specifier, to: publicSpecifier } } };
}

const STRING_LITERAL = /'(?:[^'\\]|\\.)*'|"(?:[^"\\]|\\.)*"|`(?:[^`\\]|\\.)*`/;

function literalValue(raw) {
  const quote = raw[0];
  const inner = raw.slice(1, -1);
  if (quote === '`' && inner.includes('${')) return undefined;
  return inner.replace(/\s+/g, ' ').trim();
}

/** The seven picker families a `catalogue.family` can name, in the order the
 *  live-tokens-pick-component skill sections them. The one home both the CLI
 *  (`components --family`) and `check:skills` read, so neither re-derives the
 *  union by parsing `types.ts`. */
export const CATALOGUE_FAMILIES = [
  'action',
  'single-selection',
  'text-entry',
  'on-off',
  'container',
  'messaging',
  'display',
];

// Brace/bracket matching skips over quoted literals so a closer inside a
// description (or a description containing a stray brace) never closes the
// group early. Shared by object literals (`{`/`}`) and array literals
// (`[`/`]`).
function findBalanced(text, openIndex, open = '{', close = '}') {
  let depth = 0;
  for (let i = openIndex; i < text.length; i++) {
    const ch = text[i];
    if (ch === "'" || ch === '"' || ch === '`') {
      const quote = ch;
      i++;
      while (i < text.length && text[i] !== quote) i += text[i] === '\\' ? 2 : 1;
      continue;
    }
    if (ch === open) depth++;
    else if (ch === close) {
      depth--;
      if (depth === 0) return { content: text.slice(openIndex + 1, i), end: i + 1 };
    }
  }
  return null;
}

function skipSeparators(text, i) {
  while (i < text.length && /[\s,]/.test(text[i])) i++;
  return i;
}

// The comma that ends the expression starting at `i`. A key or a literal
// inside an expression the reader cannot read must stay unread with it.
function expressionEnd(text, i) {
  let depth = 0;
  for (; i < text.length; i++) {
    const ch = text[i];
    if (ch === "'" || ch === '"' || ch === '`') {
      const quote = ch;
      i++;
      while (i < text.length && text[i] !== quote) i += text[i] === '\\' ? 2 : 1;
    } else if ('([{'.includes(ch)) depth++;
    else if (')]}'.includes(ch)) depth--;
    else if (ch === ',' && depth === 0) return i;
  }
  return text.length;
}

function readWholeExpression(text, i) {
  const end = expressionEnd(text, i);
  const expression = text.slice(i, end);
  const result = readValue(expression, 0);
  const literal = result && !expression.slice(result.end).trim();
  return { value: literal ? result.value : undefined, end };
}

/**
 * One literal value starting at `text[i]`: a quoted string, a `[...]` array of
 * values, or a `{...}` object of `key: value` pairs — the subset `catalogueOf`
 * reads, recursively, so a key nested inside a `whenNotToUse` row, `props`, or a
 * `{ rule, text }` constraint is read at its own depth and never mistaken for
 * a top-level field. An identifier, a template with `${}`, a concatenation,
 * or any other expression is outside the subset and reads as absent (`null`),
 * the same tolerance `catalogueOf` always gave a non-literal field.
 */
function readValue(text, i) {
  i = skipSeparators(text, i);
  const ch = text[i];
  if (ch === "'" || ch === '"' || ch === '`') {
    const m = STRING_LITERAL.exec(text.slice(i));
    if (!m || m.index !== 0) return null;
    const value = literalValue(m[0]);
    return value === undefined ? null : { value, end: i + m[0].length };
  }
  if (ch === '[') {
    const balanced = findBalanced(text, i, '[', ']');
    if (!balanced) return null;
    const items = [];
    let j = 0;
    while (j < balanced.content.length) {
      const item = readWholeExpression(balanced.content, j);
      if (item.value !== undefined) items.push(item.value);
      j = item.end + 1;
    }
    return { value: items, end: balanced.end };
  }
  if (ch === '{') {
    const balanced = findBalanced(text, i, '{', '}');
    if (!balanced) return null;
    return { value: readObject(balanced.content), end: balanced.end };
  }
  return null;
}

/** `key: value` pairs read by depth: the scan resumes after each value's
 *  whole expression, read or unread, so a key inside a value's own text is
 *  never read as one of `body`'s own fields. */
function readObject(body) {
  const fields = {};
  const keyRe = /([A-Za-z_$][A-Za-z0-9_$]*)\s*:/g;
  let m;
  while ((m = keyRe.exec(body))) {
    const result = readWholeExpression(body, keyRe.lastIndex);
    if (result.value !== undefined && !(m[1] in fields)) fields[m[1]] = result.value;
    keyRe.lastIndex = result.end;
  }
  return fields;
}

function isPlainObject(v) {
  return v !== null && typeof v === 'object' && !Array.isArray(v);
}

/** An object's own string-valued entries; a non-string value is dropped, key
 *  by key, the same tolerance a top-level field gets. */
function stringEntries(v) {
  if (!isPlainObject(v)) return undefined;
  const out = {};
  for (const [key, value] of Object.entries(v)) if (typeof value === 'string') out[key] = value;
  return out;
}

/** `whenNotToUse` entries: a `{ when, use? }` object with `when` a string and
 *  `use`, if present, a string. A row whose `when` is not a string literal is
 *  dropped from the array. */
function whenNotToUseEntries(v) {
  if (!Array.isArray(v)) return undefined;
  const out = [];
  for (const item of v) {
    if (isPlainObject(item) && typeof item.when === 'string') {
      out.push(typeof item.use === 'string' ? { when: item.when, use: item.use } : { when: item.when });
    }
  }
  return out;
}

/** `constraints` entries: a plain string, or a `{ rule, text }` object with
 *  both as strings. Anything else is dropped from the array. */
function constraintEntries(v) {
  if (!Array.isArray(v)) return undefined;
  const out = [];
  for (const item of v) {
    if (typeof item === 'string') out.push(item);
    else if (isPlainObject(item) && typeof item.rule === 'string' && typeof item.text === 'string') {
      out.push({ rule: item.rule, text: item.text });
    }
  }
  return out;
}

/**
 * Bounded, non-evaluating parse of the runtime file's `catalogue` export
 * inside the `<script module>` block's `export const catalogue = { ... }`,
 * the same way `builtInIds` and `componentProps` read the rest of the
 * vocabulary without importing the module. Returns `null` when the file has
 * no such export.
 */
export function catalogueOf(source) {
  const moduleBlock = source.match(/<script\s+module[^>]*>([\s\S]*?)<\/script>/);
  if (!moduleBlock) return null;
  const exportMatch = /export\s+const\s+catalogue\s*=\s*\{/.exec(moduleBlock[1]);
  if (!exportMatch) return null;
  const openIndex = exportMatch.index + exportMatch[0].length - 1;
  const balanced = findBalanced(moduleBlock[1], openIndex);
  if (!balanced) return null;

  const fields = readObject(balanced.content);
  const catalogue = {};
  if (typeof fields.description === 'string') catalogue.description = fields.description;
  if (typeof fields.family === 'string') catalogue.family = fields.family;
  if (typeof fields.whenToUse === 'string') catalogue.whenToUse = fields.whenToUse;
  const whenNotToUse = whenNotToUseEntries(fields.whenNotToUse);
  if (whenNotToUse) catalogue.whenNotToUse = whenNotToUse;
  const constraints = constraintEntries(fields.constraints);
  if (constraints && constraints.length) catalogue.constraints = constraints;
  const props = stringEntries(fields.props);
  if (props && Object.keys(props).length) catalogue.props = props;
  return catalogue;
}

function scaleOf(name) {
  const stem = name.replace(/^--/, '');
  const hit = CONTRACT_SCALES
    .filter((f) => stem === f || stem.startsWith(`${f}-`))
    .sort((a, b) => b.length - a.length)[0];
  return hit ?? stem.split('-')[0];
}

// Cached per vocabulary: a checker asks for a scale once per finding, and the
// values come from re-reading tokens.css.
const scalesCache = new WeakMap();

/**
 * Every design token grouped by its scale, each with the value tokens.css
 * declares for it. The candidates a `color-literal` or `dimension-literal`
 * repair picks from, and what `describeTokens` prints.
 */
export function tokenScales(vocab) {
  const cached = scalesCache.get(vocab);
  if (cached) return cached;

  const values = new Map();
  if (vocab.tokensCssPath) {
    const css = readFileSync(vocab.tokensCssPath, 'utf8').replace(/\/\*[\s\S]*?\*\//g, ' ');
    for (const m of css.matchAll(/(--[a-z0-9-]+)\s*:\s*([^;]+);/g)) {
      if (!values.has(m[1])) values.set(m[1], m[2].trim());
    }
  }
  const byScale = new Map();
  for (const name of vocab.themeTokens) {
    const scale = scaleOf(name);
    if (!byScale.has(scale)) byScale.set(scale, []);
    byScale.get(scale).push({ name, value: values.get(name) ?? '' });
  }
  scalesCache.set(vocab, byScale);
  return byScale;
}

/** One scale's tokens, empty when the project has no such scale. */
export function scaleTokens(vocab, scale) {
  return (scale && tokenScales(vocab).get(scale)) || [];
}

export function describeComponents(vocab, { root = process.cwd() } = {}) {
  const out = [];
  for (const entry of vocab.components.values()) {
    const source = readFileSync(entry.file, 'utf8');
    const props = entry.props
      ? [...entry.props.props].map((name) => ({
          name,
          type: entry.props.types.get(name) ?? '',
          values: entry.props.enums.has(name) ? [...entry.props.enums.get(name)] : undefined,
        }))
      : [];
    out.push({
      id: entry.id,
      name: entry.name,
      origin: entry.origin,
      file: relative(root, entry.file),
      registered: vocab.builtIn.has(entry.id) || vocab.registered.has(entry.id),
      catalogue: catalogueOf(source),
      variants: entry.props?.enums.get('variant') ? [...entry.props.enums.get('variant')] : [],
      props,
      tokens: [...entry.tokens].map(([name, value]) => ({ name, default: value })),
    });
  }
  return out.sort((a, b) => a.origin.localeCompare(b.origin) || a.id.localeCompare(b.id));
}

/** The list form's payload. `tokens` is most of a full listing's bytes, and the id form keeps it. */
export function withoutTokens(list) {
  return list.map(({ tokens, ...rest }) => rest);
}

export function describeTokens(vocab, { root = process.cwd() } = {}) {
  return {
    tokensCss: vocab.tokensCssPath ? relative(root, vocab.tokensCssPath) : null,
    scales: [...tokenScales(vocab)].map(([scale, tokens]) => ({ scale, tokens })),
    components: [...vocab.components.values()].map((c) => ({
      id: c.id,
      tokens: [...c.tokens].map(([name, value]) => ({ name, default: value })),
    })),
  };
}

function describeLines(c) {
  if (!c.catalogue) return [];
  const { description, family, whenToUse, whenNotToUse, constraints, props } = c.catalogue;
  const lines = [];
  if (description) lines.push(description);
  if (family) lines.push(`Family: ${family}`);
  if (whenToUse) lines.push(`When to use: ${whenToUse}`);
  for (const row of whenNotToUse ?? []) lines.push(row.use ? `Not for: ${row.when} Use ${row.use}.` : `Not for: ${row.when}`);
  for (const constraint of constraints ?? []) {
    lines.push(typeof constraint === 'string' ? `Rule: ${constraint}` : `Rule: ${constraint.text} [${constraint.rule}]`);
  }
  for (const [prop, text] of Object.entries(props ?? {})) lines.push(`${prop}: ${text}`);
  return lines;
}

export function formatComponents(list, { id } = {}) {
  const lines = [];
  if (id) {
    const c = list.find((x) => x.id === id);
    if (!c) return `No component "${id}". Run \`live-tokens components\` for the list.`;
    lines.push(`${c.name} (${c.id}, ${c.origin}${c.registered ? '' : ', unregistered'})  ${c.file}`);
    for (const line of describeLines(c)) lines.push(`  ${line}`);
    if (c.props.length) {
      lines.push('  props:');
      for (const p of c.props) lines.push(`    ${p.name}${p.values ? `: ${p.values.join(' | ')}` : p.type ? `: ${p.type}` : ''}`);
    }
    lines.push(`  tokens (${c.tokens.length}):`);
    for (const t of c.tokens) lines.push(`    ${t.name}: ${t.default}`);
    return lines.join('\n');
  }
  for (const c of list) {
    const variants = c.variants.length ? `  variants: ${c.variants.join(', ')}` : '';
    lines.push(`${c.id.padEnd(20)} ${c.origin.padEnd(8)} ${c.name}${c.registered ? '' : '  (NOT registered)'}${variants}`);
    for (const line of describeLines(c)) lines.push(`    ${line}`);
  }
  lines.push('');
  const unregistered = list.filter((c) => !c.registered).length;
  lines.push(
    `${list.length} component(s)${unregistered ? `, ${unregistered} not registered and so not in the catalogue` : ''}. ` +
      '`live-tokens components <id>` prints one with its props and tokens.',
  );
  return lines.join('\n');
}

export function formatTokens(desc, { scale } = {}) {
  const lines = [];
  const scales = scale ? desc.scales.filter((s) => s.scale === scale) : desc.scales;
  if (scale && scales.length === 0) {
    return `No token scale "${scale}". Scales: ${desc.scales.map((s) => s.scale).join(', ')}.`;
  }
  lines.push(`Design tokens from ${desc.tokensCss ?? '(no tokens.css found)'}`);
  for (const s of scales) {
    lines.push('');
    lines.push(`${s.scale} (${s.tokens.length})`);
    for (const t of s.tokens) lines.push(`  ${t.name}: ${t.value}`);
  }
  if (!scale) {
    lines.push('');
    lines.push(`Semantic properties: ${desc.components.reduce((n, c) => n + c.tokens.length, 0)} across ${desc.components.length} component(s). \`live-tokens components <id>\` lists one component's.`);
  }
  return lines.join('\n');
}
