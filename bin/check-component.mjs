// Static validator for a live-tokens component.
//
// Asserts that an authored component (runtime + editor + registration) satisfies
// the contract described in the live-tokens-create-component skill:
//
//   - runtime file at src/system/components/<Id>.svelte with :global(:root) block
//   - editor file at src/system/components/<Id>Editor.svelte exporting `component` + `allTokens`
//   - registerComponent({ id: '<id>', ... }) call somewhere in src/
//   - all imports in the three files use public live-tokens paths only
//   - token names match --<id>-<part>[-<state>][-<element>]-<property>
//     with the property being one of the recognised suffixes,
//     and state coming before property (never after)
//   - :global(:root) defaults are semantic: every one resolves to a real theme
//     token, so the component repaints when the theme changes. A value with no
//     token behind it must be a declared intrinsic (a structural keyword the
//     editor exports in `intrinsics`), never a literal.
//   - every property the runtime declares is read by the runtime's own CSS
//   - the runtime opens with the comment the catalogue reads
//
// Returns { errors, warnings, findings }. `errors`/`warnings` are the message
// strings; `findings` carries the same items with a stable `rule` id, a line
// number, and, where a repair needs more than the message, `details`.

import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { extname, join, relative } from 'node:path';
import { deepImportRepair, scaleTokens } from './lib/catalogue.mjs';
import { hasColorLiteral, hasDimensionLiteral, stripVarFallbacks } from './lib/cssValues.mjs';
import { fixMap, lineOf } from './lib/findings.mjs';
import { resolveGeometryLiteral } from './lib/geometry.mjs';
import {
  EDITOR_DIRS,
  PKG_ROOT,
  builtInIds,
  componentInventory,
  declaredCustomProperties,
  extractGlobalRootBlocks,
  isContractToken,
  loadVocabulary,
} from './lib/tokenVocabulary.mjs';

/**
 * Every rule, with its default severity, where it is fixed, and how.
 *
 * `fix` is a stable slug the skills resolve to one of their own headings, so
 * adding a rule here costs no skill edit as long as it reuses a slug. `repair`
 * is the ceiling: `auto` when code can rewrite the site, `choice` when code can
 * name the candidates but not pick one, `authored` when a person writes the
 * repair. A finding may lower its rule's `repair`; none raises it.
 */
export const COMPONENT_RULES = {
  'invalid-id': { severity: 'error', fix: 'runtime', repair: 'authored' },
  'missing-file': { severity: 'error', fix: 'runtime', repair: 'authored' },
  'missing-root-block': { severity: 'error', fix: 'runtime', repair: 'authored' },
  'no-tokens': { severity: 'error', fix: 'runtime', repair: 'authored' },
  'missing-description': { severity: 'warn', fix: 'runtime', repair: 'authored' },
  'unread-token': { severity: 'warn', fix: 'runtime', repair: 'choice' },
  'state-after-property': { severity: 'error', fix: 'property-name', repair: 'authored' },
  'disabled-is-terminal': { severity: 'error', fix: 'property-name', repair: 'authored' },
  'unknown-suffix': { severity: 'error', fix: 'property-name', repair: 'authored' },
  'phantom-editor-token': { severity: 'error', fix: 'editor', repair: 'authored' },
  'color-literal': { severity: 'error', fix: 'property-token', repair: 'choice' },
  'missing-component-const': { severity: 'error', fix: 'editor', repair: 'authored' },
  'missing-all-tokens': { severity: 'error', fix: 'editor', repair: 'authored' },
  'deep-import': { severity: 'error', fix: 'editor', repair: 'auto' },
  'missing-registration': { severity: 'error', fix: 'registration', repair: 'authored' },
  'unknown-token-ref': { severity: 'error', fix: 'property-token', repair: 'choice' },
  'default-not-token': { severity: 'error', fix: 'property-token', repair: 'choice' },
  'phantom-link': { severity: 'warn', fix: 'editor', repair: 'authored' },
  'dimension-literal': { severity: 'warn', fix: 'property-token', repair: 'auto' },
  'config-token': { severity: 'error', fix: 'property-token', repair: 'choice' },
  // `--tests` (bin/contractRunner.mjs). Fixed by design decision 8 so
  // `fix-findings` can map them; every one is an error, including the setup
  // rules, which `--tests` treats as never-silenceable (see cli.mjs). A failed
  // obligation is always authored: the component has to start behaving.
  'contract-registry': { severity: 'error', fix: 'registration', repair: 'authored' },
  'contract-render': { severity: 'error', fix: 'editor', repair: 'authored' },
  'contract-alias': { severity: 'error', fix: 'editor', repair: 'authored' },
  'contract-persist': { severity: 'error', fix: 'runtime-defaults', repair: 'authored' },
  'contract-theme': { severity: 'error', fix: 'property-token', repair: 'authored' },
  'contract-states': { severity: 'error', fix: 'editor', repair: 'authored' },
  'contract-interaction': { severity: 'error', fix: 'editor', repair: 'authored' },
  'contract-listed': { severity: 'error', fix: 'registration', repair: 'authored' },
  'contract-sketch': { severity: 'error', fix: 'sketch', repair: 'authored' },
  'contract-missing': { severity: 'error', fix: 'coverage', repair: 'authored' },
  'tests-not-installed': { severity: 'error', fix: 'tooling', repair: 'authored' },
  'tests-setup': { severity: 'error', fix: 'tooling', repair: 'authored' },
  'tests-incomplete': { severity: 'error', fix: 'coverage', repair: 'authored' },
};

export const COMPONENT_RULE_FIX = fixMap(COMPONENT_RULES);

// Property suffixes come from the editor's own kind table, so the checker and
// the picker can never disagree about what a name means. Read as text rather
// than imported: this module must load without the compiled engine (CI runs the
// suite before the plugin is built).
const ALIAS_KINDS = 'src/editor/core/components/aliasKinds.ts';

/** Each kind with the suffixes that name it, in the file's own order, since
 *  the first match wins there too. */
function readKindRules(root) {
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

function readKnownSuffixes(root) {
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
  'divider-inset': 'space',
  'border-width': 'border-width',
  'divider-width': 'border-width',
  'accent-width': 'border-width',
  shadow: 'shadow',
};

const COLOR_SCALES = ['text', 'surface', 'border'];
const GEOMETRY_SCALES = ['space', 'radius', 'border-width', 'shadow'];

function tokenScale(token, kindRules, wanted) {
  const bare = SIDE_SUFFIXES.find((x) => token.endsWith(x)) ? token.slice(0, token.lastIndexOf('-')) : token;
  const rule = kindRules.find((r) => r.suffixes.some((s) => bare.endsWith(`-${s}`)));
  const scale = rule ? (KIND_SCALE[rule.kind] ?? null) : null;
  return wanted.includes(scale) ? scale : null;
}

/** True when `id` is one of the package's own components. */
function isBuiltIn(id) {
  return builtInIds(process.cwd(), PKG_ROOT).has(id);
}

// Per-side padding names (`--card-body-padding-top`) are written by the padding
// selector, never declared by hand, and belong with their parent.
const SIDE_SUFFIXES = ['-top', '-right', '-bottom', '-left'];

// State tokens that must come *before* the property, never after.
const STATE_TOKENS = ['hover', 'disabled', 'selected', 'focus', 'active', 'focused'];

// Disabled is terminal: a disabled component cannot be hovered, focused, or
// selected, so a token naming both describes a state that never paints.
const TERMINAL_CONFLICTS = ['hover', 'focus', 'focused', 'selected', 'on', 'active', 'checked'];

// Deep imports into the package internals are not a supported API.
const DEEP_IMPORT_PATTERNS = [
  /^@motion-proto\/live-tokens\/src\//,
  /node_modules\/@motion-proto\/live-tokens/,
];

function capitalize(id) {
  return id.charAt(0).toUpperCase() + id.slice(1);
}

const pick = (entry) => ({ Id: entry.Id, runtimePath: entry.runtimePath, editorPath: entry.editorPath });

/**
 * Where `id`'s runtime and editor files live, resolved from `root`'s own
 * inventory first, the real on-disk filename rather than a capitalised guess,
 * since `cornerbadge` ships as `CornerBadge.svelte`. Exported so a caller
 * outside the lint (the `--tests` runner, attributing a contract finding to a
 * consumer artifact) doesn't re-derive it differently.
 */
export function resolveComponentPaths(id, root = process.cwd()) {
  const local = componentInventory(root).get(id);
  if (local?.runtimeExists) return pick(local);

  // A consumer names a shipped id and owns no copy of its files. Falling back
  // to the package keeps the lint reading the same source the contract run
  // resolves, instead of reporting the component's own files missing. In this
  // repo the consumer paths always exist, so this fallback never fires here.
  if (root !== PKG_ROOT && builtInIds(root, PKG_ROOT).has(id)) {
    const shipped = componentInventory(PKG_ROOT).get(id);
    if (shipped?.runtimeExists) return pick(shipped);
  }

  // A registered id with no runtime anywhere: report where it would live.
  if (local) return pick(local);

  const Id = capitalize(id);
  const editorPath =
    EDITOR_DIRS.map((d) => join(root, d, `${Id}Editor.svelte`)).find(existsSync) ??
    join(root, EDITOR_DIRS[0], `${Id}Editor.svelte`);
  return { Id, runtimePath: join(root, 'src/system/components', `${Id}.svelte`), editorPath };
}

function extractImports(source) {
  const out = [];
  const re = /import\s+(?:[^'"]*\s+from\s+)?['"]([^'"]+)['"]/g;
  let m;
  while ((m = re.exec(source)) !== null) {
    out.push(m[1]);
  }
  return out;
}

/**
 * `--<id>-*` tokens declared in the given blocks.
 *
 * The prefix may also be the hyphenated word form of the id: CornerBadge is
 * registered as `cornerbadge` but names its tokens `--corner-badge-*`, and the
 * whole system (config, theme, editor) follows that. Segments never end on a
 * hyphen, so a trailing `-` cannot be mistaken for a token name.
 */
function extractTokensForId(blocks, id, kebab) {
  const tokens = new Set();
  // Comments name tokens too (`the --card-hover-* tokens`); they are prose.
  blocks = blocks.map((b) => b.replace(/\/\*[\s\S]*?\*\//g, ' '));
  const prefixes = kebab && kebab !== id ? [id, kebab] : [id];
  for (const prefix of prefixes) {
    const re = new RegExp(`--${prefix}(?:-[a-z0-9]+)+`, 'g');
    for (const block of blocks) {
      for (const t of block.match(re) ?? []) tokens.add(t);
    }
  }
  return [...tokens];
}

/** `CornerBadge` -> `corner-badge`; the other accepted token prefix. */
function kebabOf(name) {
  return name.replace(/([a-z0-9])([A-Z])/g, '$1-$2').toLowerCase();
}

function tokenSuffix(token, known) {
  const bare = SIDE_SUFFIXES.find((x) => token.endsWith(x)) ? token.slice(0, token.lastIndexOf('-')) : token;
  for (const suffix of known) {
    if (bare.endsWith(`-${suffix}`)) return suffix;
  }
  return null;
}

function detectStateAfterProperty(token, known) {
  // e.g. --comp-part-surface-hover (wrong) vs --comp-part-hover-surface (right)
  for (const state of STATE_TOKENS) {
    if (token.endsWith(`-${state}`)) {
      const head = token.slice(0, -(state.length + 1));
      if (tokenSuffix(head, known)) return state;
    }
  }
  return null;
}

// True if `source` calls `fnName(` at least once with a single argument (no
// top-level comma before the matching close paren). Brackets/braces are balanced
// so commas inside nested objects/arrays/calls don't count.
function hasBareCall(source, fnName) {
  const needle = fnName + '(';
  let idx = 0;
  while ((idx = source.indexOf(needle, idx)) !== -1) {
    let i = idx + needle.length;
    let depth = 1;
    let topComma = false;
    for (; i < source.length && depth > 0; i++) {
      const c = source[i];
      if (c === '(' || c === '[' || c === '{') depth++;
      else if (c === ')' || c === ']' || c === '}') depth--;
      else if (c === ',' && depth === 1) topComma = true;
    }
    if (!topComma) return true;
    idx = i;
  }
  return false;
}

function findFilesRecursive(dir, exts) {
  if (!existsSync(dir)) return [];
  const out = [];
  for (const ent of readdirSync(dir, { withFileTypes: true })) {
    if (ent.name === 'node_modules' || ent.name.startsWith('.')) continue;
    const full = join(dir, ent.name);
    if (ent.isDirectory()) {
      out.push(...findFilesRecursive(full, exts));
    } else if (exts.includes(extname(ent.name))) {
      out.push(full);
    }
  }
  return out;
}

/**
 * Every token the editor names in a row: `variable: '--x'`, the type-group
 * `colorVariable` / `familyVariable` / ... keys, and the arrow form intrinsics
 * use. A `${...}` hole stands for a variant segment. Per-side padding names are
 * written by the padding selector rather than declared, so they resolve to
 * their parent.
 */
function editorTokenRefs(editor) {
  const literals = new Set();
  const patterns = [];
  for (const m of editor.matchAll(/\b(?:variable|[a-zA-Z]+Variable)\s*:\s*(?:\([^)]*\)\s*=>\s*)?[`'"](--(?:\$\{[^}]*\}|[^`'"])+)[`'"]/g)) {
    const name = stripSide(m[1]);
    if (name.includes('${')) {
      patterns.push([name, new RegExp(`^${name.replace(/[.*+?^()|[\]\\]/g, '\\$&').replace(/\$\{[^}]*\}/g, '[a-z0-9-]+')}$`)]);
    } else {
      literals.add(name);
    }
  }
  return { literals, patterns };
}

function stripSide(token) {
  const side = SIDE_SUFFIXES.find((x) => token.endsWith(x));
  return side ? token.slice(0, -side.length) : token;
}

/**
 * Token patterns the editor declares in `intrinsics` — the only tokens allowed a
 * bare keyword instead of a theme token.
 *
 * Matched on each spec's `variable`, not its `key`: the two need not agree
 * (Image's `zoom` key declares `--image-zoom-enabled`), and `variable` is what
 * actually names the token. A `${...}` hole stands for a variant segment.
 */
function intrinsicMatchers(editor) {
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

/**
 * The semantic half of the contract: a component token is a *property name*, and
 * its default is the theme token that property reads. So every default must
 * resolve to a real token — otherwise the component stops repainting when the
 * theme changes, which is the whole point of declaring it.
 */
function checkDefaultsAreSemantic({ blocks, runtime, editor, root, runtimePath, record, vocabulary }) {
  const vocab = vocabulary ?? loadVocabulary({ root });
  const matchers = intrinsicMatchers(editor);
  const rel = relative(root, runtimePath);
  const kindRules = readKindRules(root);

  const own = new Set();
  for (const block of blocks) {
    for (const m of block.matchAll(/(?:^|[;{])\s*(--[a-z0-9-]+)\s*:/gm)) own.add(m[1]);
  }

  for (const block of blocks) {
    for (const m of block.matchAll(/(--[a-z0-9-]+)\s*:\s*([^;]+);/g)) {
      const [decl, name, raw] = m;
      const value = raw.trim();
      const at = runtime.indexOf(decl);

      const painted = stripVarFallbacks(value);
      const refs = [...painted.matchAll(/var\(\s*(--[a-z0-9-]+)/g)].map((x) => x[1]);
      for (const ref of refs) {
        if (own.has(ref) || vocab.knows(ref)) continue;
        record(
          'unknown-token-ref',
          STATE_TOKENS.includes(ref.replace(/^--/, '').split('-')[0])
            ? `${rel}: ${name} reads ${ref}, but a state is a segment of a property name. Read the token the state should paint`
            : isContractToken(ref)
              ? `${rel}: ${name} reads ${ref}, which has the shape of a design token but no longer exists. Check tokens.css for a rename`
              : `${rel}: ${name} reads ${ref}, which is not a design token or a semantic property`,
          at,
        );
      }

      if (hasColorLiteral(painted)) {
        const scale = tokenScale(name, kindRules, COLOR_SCALES);
        record(
          'color-literal',
          `${rel}: ${name}: ${value} is a colour literal; defaults must reference design tokens (e.g. var(--surface-primary))`,
          at,
          { details: { scale, candidates: scaleTokens(vocab, scale).map((t) => t.name) } },
        );
        continue;
      }

      if (refs.length === 0 && !matchers.some((re) => re.test(name))) {
        record(
          'default-not-token',
          `${rel}: ${name}: ${value} has no design token behind it. Back it with a token, or declare it in the editor's \`intrinsics\` when it is a structural keyword`,
          at,
        );
      }

      if (hasDimensionLiteral(painted)) {
        const scale = tokenScale(name, kindRules, GEOMETRY_SCALES);
        const resolved = resolveGeometryLiteral(painted, scale, scaleTokens(vocab, scale));
        record(
          'dimension-literal',
          `${rel}: ${name}: ${value} pins a raw dimension; use a --space-*, --radius-*, or --border-width-* token`,
          at,
          {
            details: { scale: resolved.scale, literals: resolved.literals },
            ...(resolved.auto ? {} : { repair: 'choice' }),
          },
        );
      }
    }
  }
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

/** Every `--name` inside a JSON string value, in the order it appears. Simple
 *  greedy extraction: `--card-default-body-padding` is one match, never two,
 *  since `[a-z0-9-]+` already consumes the longer run first. */
const TOKEN_NAME_RE = /--[a-z0-9-]+/g;

/** The line a `"<key>":` sits on. The quote on both sides of the key makes
 *  this exact by construction — `"--card-default-body"` cannot match inside
 *  `"--card-default-body-padding"`, unlike a bare substring search. */
function findJsonKeyLine(text, key) {
  const escaped = key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const m = new RegExp(`"${escaped}"\\s*:`).exec(text);
  return m ? lineOf(text, m.index) : 1;
}

/**
 * Saved assignments, validated as data. Every `--name` an alias string in
 * `component-configs/<id>/default.json` carries, whatever wraps it (`var()`,
 * the color-mix opacity form the editor writes, or nothing), must resolve —
 * a design token, or one of the component's own properties. A string with no
 * `--name` at all is a bare literal, allowed only on a property the editor
 * declares in `intrinsics`. A structured (non-string) alias value, such as a
 * gradient, is out of scope here.
 */
function checkConfigTokens({ id, root, intrinsic, vocab, recordAt }) {
  const configPath = join(root, 'src/live-tokens/data/component-configs', id, 'default.json');
  if (!existsSync(configPath)) return;
  const text = readFileSync(configPath, 'utf8');
  const rel = relative(root, configPath);
  let data;
  try {
    data = JSON.parse(text);
  } catch {
    return;
  }
  for (const [prop, value] of Object.entries(data.aliases ?? {})) {
    if (typeof value !== 'string') continue;
    const line = findJsonKeyLine(text, prop);
    const names = value.match(TOKEN_NAME_RE);
    if (!names) {
      if (!intrinsic.some((re) => re.test(prop))) {
        recordAt(
          'config-token',
          `${rel}: ${prop}: "${value}" has no design token behind it, and ${prop} is not a declared intrinsic`,
          rel,
          line,
          { details: { property: prop, value } },
        );
      }
      continue;
    }
    for (const name of names) {
      if (vocab.knows(name)) continue;
      recordAt(
        'config-token',
        `${rel}: ${prop} names ${name}, which is not a design token or a semantic property`,
        rel,
        line,
        { details: { property: prop, value } },
      );
    }
  }
}

export function checkComponent(id, root = process.cwd(), { vocabulary } = {}) {
  const errors = [];
  const warnings = [];
  const findings = [];
  let file = '';
  let source = '';

  const record = (rule, message, index = -1, extra = {}) => {
    findings.push({
      rule,
      file,
      line: index >= 0 && source ? lineOf(source, index) : 1,
      message,
      ...extra,
    });
    (COMPONENT_RULES[rule]?.severity === 'warn' ? warnings : errors).push(message);
  };
  // For a finding about a different file (config-token, against the saved
  // alias config): the line is already resolved against that file's own text,
  // never `source` (the runtime).
  const recordAt = (rule, message, atFile, line = 1, extra = {}) => {
    findings.push({ rule, file: atFile, line, message, ...extra });
    (COMPONENT_RULES[rule]?.severity === 'warn' ? warnings : errors).push(message);
  };
  const done = () => ({ errors, warnings, findings });

  if (!/^[a-z][a-z0-9]*$/.test(id)) {
    record('invalid-id', `id "${id}" is invalid; must be lowercase letters/digits, no dashes`);
    return done();
  }

  const { Id, runtimePath, editorPath } = resolveComponentPaths(id, root);

  file = relative(root, runtimePath);
  if (!existsSync(runtimePath)) {
    record('missing-file', `runtime missing: ${relative(root, runtimePath)}`);
    return done();
  }
  // A missing editor still gets its own finding, but the rules that need only
  // the runtime (token shape, semantics, config, registration) still run —
  // an editor-less component is exactly the case those rules exist to catch.
  const editorMissing = !existsSync(editorPath);
  if (editorMissing) {
    record('missing-file', `editor missing: ${relative(root, editorPath)}`);
  }

  const runtime = readFileSync(runtimePath, 'utf8');
  const editor = editorMissing ? '' : readFileSync(editorPath, 'utf8');
  source = runtime;
  const vocab = vocabulary ?? loadVocabulary({ root });

  // Runtime: the file opens with the comment that says what the component is
  // for. The catalogue reads that comment; without it the component is
  // pickable but unexplained.
  if (!/^\s*<!--[\s\S]*?-->/.test(runtime)) {
    record(
      'missing-description',
      `${relative(root, runtimePath)}: opens with no description comment. Say what ${Id} is for, and what it is not for`,
    );
  }

  // Runtime: :global(:root) block present.
  const blocks = extractGlobalRootBlocks(runtime);
  if (blocks.length === 0) {
    record('missing-root-block', `${relative(root, runtimePath)}: missing :global(:root) declaration block`);
  }

  // Runtime: at least one --<id>-* token.
  const tokens = extractTokensForId(blocks, id, kebabOf(Id));
  if (blocks.length > 0 && tokens.length === 0) {
    record('no-tokens', `${relative(root, runtimePath)}: no --${id}-* tokens declared in :global(:root)`);
  }

  // A token the editor declares as an intrinsic carries a structural keyword,
  // not a themeable value, so a property-suffix rule is the wrong test for it.
  const intrinsic = intrinsicMatchers(editor);
  const known = readKnownSuffixes(root);

  // Runtime: state-after-property anti-pattern. Report this first; if it fires
  // for a token, skip the unknown-suffix error for the same token (the state-
  // suffix wouldn't be in the suffix list anyway, so it's the same root cause).
  const stateAfterTokens = new Set();
  for (const token of tokens) {
    if (intrinsic.some((re) => re.test(token))) continue;
    const trailingState = detectStateAfterProperty(token, known);
    if (trailingState) {
      stateAfterTokens.add(token);
      record(
        'state-after-property',
        `${relative(root, runtimePath)}: ${token} has '${trailingState}' after the property; ` +
          `state must come before property (e.g. -${trailingState}-surface)`,
        runtime.indexOf(token),
      );
    }
  }

  for (const token of tokens) {
    const segments = token.slice(2).split('-');
    if (!segments.includes('disabled')) continue;
    const conflict = TERMINAL_CONFLICTS.find((s) => segments.includes(s));
    if (conflict) {
      record(
        'disabled-is-terminal',
        `${relative(root, runtimePath)}: ${token} combines 'disabled' with '${conflict}'; disabled is terminal, so that state never paints. Drop the token.`,
        runtime.indexOf(token),
      );
    }
  }

  // Runtime: every token ends in a known suffix.
  for (const token of tokens) {
    if (stateAfterTokens.has(token) || intrinsic.some((re) => re.test(token))) continue;
    if (!tokenSuffix(token, known)) {
      record(
        'unknown-suffix',
        `${relative(root, runtimePath)}: ${token} doesn't end in a known suffix`,
        runtime.indexOf(token),
      );
    }
  }

  checkDefaultsAreSemantic({ blocks, runtime, editor, root, runtimePath, record, vocabulary: vocab });
  checkConfigTokens({ id, root, intrinsic, vocab, recordAt });

  const declared = new Set();
  for (const block of blocks) {
    for (const n of declaredCustomProperties(block.replace(/\/\*[\s\S]*?\*\//g, ' '))) declared.add(n);
  }

  // Runtime: a property nothing in the file reads paints nothing, so the editor
  // offers a control that moves nothing.
  for (const name of unreadTokens(runtime, declared)) {
    record(
      'unread-token',
      `${relative(root, runtimePath)}: ${name} is declared and never read in this file's own CSS. Read it where it paints, or drop it`,
      runtime.indexOf(name),
      { details: { property: name } },
    );
  }

  // The editor-dependent rules below need real editor content; a missing
  // editor already has its own `missing-file` finding, and running these
  // against an empty string would only restate it under different rules.
  if (!editorMissing) {
    // Editor: declares `const component = '<id>'` (module block).
    const componentDecl = new RegExp(`\\bconst\\s+component\\s*=\\s*['"]${id}['"]`);
    if (!componentDecl.test(editor)) {
      record(
        'missing-component-const',
        `${relative(root, editorPath)}: missing 'const component = "${id}"' in <script module>`,
      );
    }

    // Editor: exports allTokens.
    if (!/\bexport\s+const\s+allTokens\b/.test(editor)) {
      record('missing-all-tokens', `${relative(root, editorPath)}: missing 'export const allTokens'`);
    }

    // Editor: every token a row names is one the runtime declares. A row that
    // names nothing renders a control that edits nothing.
    const refs = editorTokenRefs(editor);
    for (const name of refs.literals) {
      if (!declared.has(name)) {
        record(
          'phantom-editor-token',
          `${relative(root, editorPath)}: names ${name}, which ${relative(root, runtimePath)} never declares in :global(:root)`,
        );
      }
    }
    for (const [name, re] of refs.patterns) {
      if (![...declared].some((d) => re.test(d))) {
        record(
          'phantom-editor-token',
          `${relative(root, editorPath)}: names ${name}, which matches nothing ${relative(root, runtimePath)} declares in :global(:root)`,
        );
      }
    }

    // Editor: phantom-link guard. The font type-group helpers fall back to bare
    // `font-family`/`font-size`/… keys when called with a single argument (no
    // derivation). Across more than one slot that silently links every slot's fonts
    // into one tree. Passing `{ component, variants }` (a second arg) opts into
    // distinct, structural keys and suppresses the check, so this only fires on the
    // silent inference path. (The color helper no longer infers — a bare call there
    // emits solo, un-grouped colors, which can't phantom-link.)
    const colorPatterns = new Set();
    for (const m of editor.matchAll(/colorVariable\s*:\s*[`'"]([^`'"]+)[`'"]/g)) {
      colorPatterns.add(m[1].replace(/\$\{[^}]*\}/g, '*'));
    }
    const slots = colorPatterns.size;
    const fontBare =
      hasBareCall(editor, 'buildTypeGroupFontTokens') || hasBareCall(editor, 'buildTypeGroupTokens');
    if (slots > 1 && fontBare) {
      record(
        'phantom-link',
        `${relative(root, editorPath)}: a type-group font helper is called across ${slots} slots without a derivation; ` +
          `its bare font-family/font-size/… keys would phantom-link every slot's fonts. Pass { component, variants } to buildTypeGroupTokens/buildTypeGroupFontTokens.`,
      );
    }
  }

  // Imports across runtime + editor: reject deep imports into the package.
  for (const [path, source] of [[runtimePath, runtime], [editorPath, editor]]) {
    for (const imp of extractImports(source)) {
      for (const pattern of DEEP_IMPORT_PATTERNS) {
        if (pattern.test(imp)) {
          record('deep-import', `${relative(root, path)}: deep import not supported: ${imp}`, -1, deepImportRepair(imp));
        }
      }
    }
  }

  // Registration: either a direct registerComponent({ id }) call or the id
  // passed through bootLiveTokens({ components: [{ id }] }) — the standard
  // scaffold boot. Accept both, somewhere under src/.
  const srcFiles = findFilesRecursive(join(root, 'src'), ['.ts', '.js', '.svelte', '.mjs']);
  const idLiteral = `id\\s*:\\s*['"]${id}['"]`;
  const directPattern = new RegExp(`registerComponent\\s*\\(\\s*\\{[^}]*${idLiteral}`, 's');
  const bootPattern = new RegExp(`bootLiveTokens\\s*\\([\\s\\S]*?components\\s*:\\s*\\[[\\s\\S]*?${idLiteral}`, 's');
  let registrationFile = null;
  for (const file of srcFiles) {
    try {
      const src = readFileSync(file, 'utf8');
      if (directPattern.test(src) || bootPattern.test(src)) {
        registrationFile = file;
        break;
      }
    } catch {
      // ignore unreadable files
    }
  }
  // A first-party component is registered by membership in the package's own
  // `builtInRegistry`, not by a `registerComponent` call, so look there too
  // before calling it unregistered.
  if (!registrationFile && isBuiltIn(id)) return done();

  if (!registrationFile) {
    record(
      'missing-registration',
      `no registration for '${id}' under src/. Expected registerComponent({ id: '${id}', ... }) or bootLiveTokens({ components: [{ id: '${id}', ... }] })`,
    );
  } else {
    // Check the registration file's imports too.
    const regSource = readFileSync(registrationFile, 'utf8');
    for (const imp of extractImports(regSource)) {
      for (const pattern of DEEP_IMPORT_PATTERNS) {
        if (pattern.test(imp)) {
          record('deep-import', `${relative(root, registrationFile)}: deep import not supported: ${imp}`, -1, deepImportRepair(imp));
        }
      }
    }
  }

  return done();
}

/**
 * Every component authored in `root`: a runtime file under
 * `src/system/components` or a configured `componentDirs` entry, editor or
 * not — a runtime with no editor is still in the batch, so `checkComponent`
 * can report its own `missing-file`. What `check-component` runs over when no
 * id is named.
 */
export function discoverComponents(root = process.cwd()) {
  return [...componentInventory(root).values()].filter((e) => e.runtimeExists).map((e) => e.id);
}

export function formatReport(id, result) {
  const lines = [];
  if (result.errors.length === 0 && result.warnings.length === 0) {
    lines.push(`✓ ${id}: passes the live-tokens-create-component contract.`);
  } else {
    if (result.errors.length > 0) {
      lines.push(`✗ ${id}: ${result.errors.length} error(s)`);
      for (const e of result.errors) lines.push(`  - ${e}`);
    }
    if (result.warnings.length > 0) {
      lines.push(`! ${id}: ${result.warnings.length} warning(s)`);
      for (const w of result.warnings) lines.push(`  - ${w}`);
    }
  }
  return lines.join('\n');
}

/**
 * The half of the contract that holds for every component, shipped or authored:
 * each `:global(:root)` default is a semantic property backed by a real token.
 *
 * Takes a runtime file rather than an id, so it works on the shipped naming
 * (`SectionDivider.svelte`) that an id round-trip would flatten, and it skips
 * the consumer-only rules — registration and file layout — that shipped
 * components satisfy through the package's own registry instead.
 */
export function checkComponentDefaults(runtimePath, { root = process.cwd(), vocabulary } = {}) {
  const findings = [];
  const runtime = readFileSync(runtimePath, 'utf8');
  const rel = relative(root, runtimePath);
  const record = (rule, message, index = -1) =>
    findings.push({ rule, file: rel, line: index >= 0 ? lineOf(runtime, index) : 1, message });

  const name = runtimePath.slice(runtimePath.lastIndexOf('/') + 1).replace('.svelte', '');
  const editorPath = EDITOR_DIRS.map((d) => join(root, d, `${name}Editor.svelte`)).find(existsSync);
  const editor = editorPath ? readFileSync(editorPath, 'utf8') : '';

  const blocks = extractGlobalRootBlocks(runtime);
  checkDefaultsAreSemantic({ blocks, runtime, editor, root, runtimePath, record, vocabulary });
  return findings;
}
