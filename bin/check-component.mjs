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
//
// Returns { errors, warnings, findings }. `errors`/`warnings` are the message
// strings; `findings` carries the same items with a stable `rule` id and line
// number for --json consumers.

import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { extname, join, relative } from 'node:path';
import { lineOf } from './lib/findings.mjs';
import { isContractToken, loadVocabulary } from './lib/tokenVocabulary.mjs';

export const COMPONENT_RULES = {
  'invalid-id': 'error',
  'missing-file': 'error',
  'missing-root-block': 'error',
  'no-tokens': 'error',
  'state-after-property': 'error',
  'unknown-suffix': 'error',
  'color-literal': 'error',
  'missing-component-const': 'error',
  'missing-all-tokens': 'error',
  'deep-import': 'error',
  'missing-registration': 'error',
  'unknown-token-ref': 'error',
  'phantom-link': 'warn',
  'default-not-token': 'warn',
  'dimension-literal': 'warn',
};

// Shipped components keep their editor beside the other editors; a
// consumer-authored one sits next to its runtime. Probe both.
const EDITOR_DIRS = ['src/system/components', 'src/editor/component-editor'];

// Property suffixes the editor picker recognises (KIND_PATTERNS in the editor).
// Keep in sync with the skill's suffix vocabulary.
const KNOWN_SUFFIXES = [
  'surface', 'border', 'text', 'icon', 'label', 'fill',
  'radius', 'border-width', 'font-family', 'font-weight',
  'font-size', 'line-height', 'letter-spacing', 'padding',
  'thickness', 'width', 'color', 'size', 'gap', 'opacity', 'enabled', 'tint',
  'shadow', 'blur', 'divider',
];

// State tokens that must come *before* the property, never after.
const STATE_TOKENS = ['hover', 'disabled', 'selected', 'focus', 'active', 'focused'];

// Deep imports into the package internals are not a supported API.
const DEEP_IMPORT_PATTERNS = [
  /^@motion-proto\/live-tokens\/src\//,
  /node_modules\/@motion-proto\/live-tokens/,
];

function capitalize(id) {
  return id.charAt(0).toUpperCase() + id.slice(1);
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

function extractGlobalRootBlocks(source) {
  const blocks = [];
  const re = /:global\(:root\)\s*\{([^}]*)\}/g;
  let m;
  while ((m = re.exec(source)) !== null) {
    blocks.push(m[1]);
  }
  return blocks;
}

function extractTokensForId(blocks, id) {
  const tokens = new Set();
  const re = new RegExp(`--${id}-[a-z0-9-]+`, 'g');
  for (const block of blocks) {
    const matches = block.match(re) ?? [];
    for (const t of matches) tokens.add(t);
  }
  return [...tokens];
}

function tokenSuffix(token) {
  for (const suffix of KNOWN_SUFFIXES) {
    if (token.endsWith(`-${suffix}`)) return suffix;
  }
  return null;
}

function detectStateAfterProperty(token) {
  // e.g. --comp-part-surface-hover (wrong) vs --comp-part-hover-surface (right)
  for (const state of STATE_TOKENS) {
    if (token.endsWith(`-${state}`)) {
      const head = token.slice(0, -(state.length + 1));
      if (tokenSuffix(head)) return state;
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
 * Token patterns the editor declares in `intrinsics` — the only tokens allowed a
 * bare keyword instead of a theme token.
 *
 * Matched on each spec's `variable`, not its `key`: the two need not agree
 * (Image's `zoom` key declares `--image-zoom-enabled`), and `variable` is what
 * actually names the token. A `${...}` hole stands for a variant segment.
 */
function intrinsicMatchers(editor) {
  const block = editor.match(/export\s+const\s+intrinsics[^=]*=\s*\[([\s\S]*?)\n\s*\];/);
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

  const own = new Set();
  for (const block of blocks) {
    for (const m of block.matchAll(/(?:^|[;{])\s*(--[a-z0-9-]+)\s*:/gm)) own.add(m[1]);
  }

  for (const block of blocks) {
    for (const m of block.matchAll(/(--[a-z0-9-]+)\s*:\s*([^;]+);/g)) {
      const [decl, name, raw] = m;
      const value = raw.trim();
      const at = runtime.indexOf(decl);

      const refs = [...value.matchAll(/var\(\s*(--[a-z0-9-]+)/g)].map((x) => x[1]);
      for (const ref of refs) {
        if (own.has(ref) || vocab.knows(ref)) continue;
        record(
          'unknown-token-ref',
          STATE_TOKENS.includes(ref.replace(/^--/, '').split('-')[0])
            ? `${rel}: ${name} reads ${ref}, but a state is a segment of a property name, not a token of its own; read the token the state should paint`
            : isContractToken(ref)
              ? `${rel}: ${name} reads ${ref}, which looks like a theme token but no longer exists; check tokens.css for a rename`
              : `${rel}: ${name} reads ${ref}, which is not a theme token or a component token`,
          at,
        );
      }

      if (refs.length === 0 && !matchers.some((re) => re.test(name))) {
        record(
          'default-not-token',
          `${rel}: ${name}: ${value} has no theme token behind it; back it with a token, or declare it in the editor's \`intrinsics\` if it is a structural keyword`,
          at,
        );
      }

      if (/(?<![\w.-])\d*\.?\d+(?:px|rem)\b/.test(value)) {
        record(
          'dimension-literal',
          `${rel}: ${name}: ${value} pins a raw dimension; use a --space-*, --radius-*, or --border-width-* token`,
          at,
        );
      }
    }
  }
}

export function checkComponent(id, root = process.cwd(), { vocabulary } = {}) {
  const errors = [];
  const warnings = [];
  const findings = [];
  let file = '';
  let source = '';

  const record = (rule, message, index = -1) => {
    findings.push({
      rule,
      file,
      line: index >= 0 && source ? lineOf(source, index) : 1,
      message,
    });
    (COMPONENT_RULES[rule] === 'warn' ? warnings : errors).push(message);
  };
  const done = () => ({ errors, warnings, findings });

  if (!/^[a-z][a-z0-9]*$/.test(id)) {
    record('invalid-id', `id "${id}" is invalid; must be lowercase letters/digits, no dashes`);
    return done();
  }

  const Id = capitalize(id);
  const runtimePath = join(root, 'src/system/components', `${Id}.svelte`);
  const editorPath =
    EDITOR_DIRS.map((d) => join(root, d, `${Id}Editor.svelte`)).find(existsSync) ??
    join(root, EDITOR_DIRS[0], `${Id}Editor.svelte`);

  file = relative(root, runtimePath);
  if (!existsSync(runtimePath)) {
    record('missing-file', `runtime missing: ${relative(root, runtimePath)}`);
  }
  if (!existsSync(editorPath)) {
    record('missing-file', `editor missing: ${relative(root, editorPath)}`);
  }
  if (errors.length) return done();

  const runtime = readFileSync(runtimePath, 'utf8');
  const editor = readFileSync(editorPath, 'utf8');
  source = runtime;

  // Runtime: :global(:root) block present.
  const blocks = extractGlobalRootBlocks(runtime);
  if (blocks.length === 0) {
    record('missing-root-block', `${relative(root, runtimePath)}: missing :global(:root) declaration block`);
  }

  // Runtime: at least one --<id>-* token.
  const tokens = extractTokensForId(blocks, id);
  if (blocks.length > 0 && tokens.length === 0) {
    record('no-tokens', `${relative(root, runtimePath)}: no --${id}-* tokens declared in :global(:root)`);
  }

  // Runtime: state-after-property anti-pattern. Report this first; if it fires
  // for a token, skip the unknown-suffix error for the same token (the state-
  // suffix wouldn't be in the suffix list anyway, so it's the same root cause).
  const stateAfterTokens = new Set();
  for (const token of tokens) {
    const trailingState = detectStateAfterProperty(token);
    if (trailingState) {
      stateAfterTokens.add(token);
      record(
        'state-after-property',
        `${relative(root, runtimePath)}: ${token} has '${trailingState}' after the property; ` +
          `state must come before property (e.g. -${trailingState}-surface, not -surface-${trailingState})`,
        runtime.indexOf(token),
      );
    }
  }

  // Runtime: every token ends in a known suffix.
  for (const token of tokens) {
    if (stateAfterTokens.has(token)) continue;
    if (!tokenSuffix(token)) {
      record(
        'unknown-suffix',
        `${relative(root, runtimePath)}: ${token} doesn't end in a known suffix`,
        runtime.indexOf(token),
      );
    }
  }

  // Runtime: defaults inside :global(:root) reference theme tokens, not raw colours.
  for (const block of blocks) {
    const rawColours = block.match(/:\s*#[0-9a-fA-F]{3,8}\b/g) ?? [];
    if (rawColours.length > 0) {
      record(
        'color-literal',
        `${relative(root, runtimePath)}: :global(:root) contains ${rawColours.length} raw colour literal(s); ` +
          `defaults must reference theme tokens (e.g. var(--surface-primary))`,
      );
    }
  }

  checkDefaultsAreSemantic({ blocks, runtime, editor, root, runtimePath, record, vocabulary });

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

  // Imports across runtime + editor: reject deep imports into the package.
  for (const [path, source] of [[runtimePath, runtime], [editorPath, editor]]) {
    for (const imp of extractImports(source)) {
      for (const pattern of DEEP_IMPORT_PATTERNS) {
        if (pattern.test(imp)) {
          record('deep-import', `${relative(root, path)}: deep import not supported: ${imp}`);
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
  if (!registrationFile) {
    record(
      'missing-registration',
      `no registration for '${id}' under src/ — expected registerComponent({ id: '${id}', ... }) or bootLiveTokens({ components: [{ id: '${id}', ... }] })`,
    );
  } else {
    // Check the registration file's imports too.
    const regSource = readFileSync(registrationFile, 'utf8');
    for (const imp of extractImports(regSource)) {
      for (const pattern of DEEP_IMPORT_PATTERNS) {
        if (pattern.test(imp)) {
          record('deep-import', `${relative(root, registrationFile)}: deep import not supported: ${imp}`);
        }
      }
    }
  }

  return done();
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
