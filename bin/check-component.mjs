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
//   - the runtime exports a `catalogue` the CLI and the registry both read
//
// Returns { errors, warnings, findings }. `errors`/`warnings` are the message
// strings; `findings` carries the same items with a stable `rule` id, a line
// number, and, where a repair needs more than the message, `details`.

import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { extname, join, relative } from 'node:path';
import { catalogueOf } from './lib/catalogue.mjs';
import {
  SIDE_SUFFIXES,
  STATE_TOKENS,
  declaredTokens,
  intrinsicMatchers,
  readKnownSuffixes,
  tokenSuffix,
} from './lib/componentSource.mjs';
import { assembleRules, fixMap, lineOf } from './lib/findings.mjs';
import {
  EDITOR_DIRS,
  PKG_ROOT,
  builtInIds,
  componentInventory,
  extractGlobalRootBlocks,
  loadVocabulary,
} from './lib/tokenVocabulary.mjs';
import * as importsAndRoutes from './rules/importsAndRoutes.mjs';
import * as testRuns from './rules/testRuns.mjs';
import * as tokenRules from './rules/tokens.mjs';

export { unreadTokens } from './lib/componentSource.mjs';

/**
 * Every rule, with its default severity, where it is fixed, and how.
 *
 * `fix` is a stable slug the skills resolve to one of their own headings, so
 * adding a rule here costs no skill edit as long as it reuses a slug. `repair`
 * is the ceiling: `auto` when code can rewrite the site, `choice` when code can
 * name the candidates but not pick one, `authored` when a person writes the
 * repair. A finding may lower its rule's `repair`; none raises it.
 */
export const COMPONENT_RULES = assembleRules(
  [
    'invalid-id',
    'missing-file',
    'missing-root-block',
    'no-tokens',
    'missing-description',
    'unread-token',
    'state-after-property',
    'disabled-is-terminal',
    'unknown-suffix',
    'phantom-editor-token',
    'color-literal',
    'missing-component-const',
    'missing-all-tokens',
    'deep-import',
    'missing-registration',
    'unknown-token-ref',
    'default-not-token',
    'phantom-link',
    'dimension-literal',
    'config-token',
    'contract-registry',
    'contract-behavior',
    'contract-render',
    'contract-alias',
    'contract-persist',
    'contract-theme',
    'contract-states',
    'contract-interaction',
    'contract-listed',
    'contract-sketch',
    'contract-missing',
    'tests-not-installed',
    'tests-setup',
    'tests-incomplete',
  ],
  {
    'invalid-id': { severity: 'error', fix: 'runtime', repair: 'authored' },
    'missing-file': { severity: 'error', fix: 'runtime', repair: 'authored' },
    'missing-root-block': { severity: 'error', fix: 'runtime', repair: 'authored' },
    'no-tokens': { severity: 'error', fix: 'runtime', repair: 'authored' },
    'missing-description': { severity: 'warn', fix: 'runtime', repair: 'authored' },
    'state-after-property': { severity: 'error', fix: 'property-name', repair: 'authored' },
    'disabled-is-terminal': { severity: 'error', fix: 'property-name', repair: 'authored' },
    'unknown-suffix': { severity: 'error', fix: 'property-name', repair: 'authored' },
    'phantom-editor-token': { severity: 'error', fix: 'editor', repair: 'authored' },
    'missing-component-const': { severity: 'error', fix: 'editor', repair: 'authored' },
    'missing-all-tokens': { severity: 'error', fix: 'editor', repair: 'authored' },
    'missing-registration': { severity: 'error', fix: 'registration', repair: 'authored' },
    'phantom-link': { severity: 'warn', fix: 'editor', repair: 'authored' },
  },
  tokenRules.componentRules,
  importsAndRoutes.componentRules,
  testRuns.componentRules,
);

export const COMPONENT_RULE_FIX = fixMap(COMPONENT_RULES);

/** True when `id` is one of the package's own components. */
function isBuiltIn(id) {
  return builtInIds(process.cwd(), PKG_ROOT).has(id);
}

// Disabled is terminal: a disabled component cannot be hovered, focused, or
// selected, so a token naming both describes a state that never paints.
const TERMINAL_CONFLICTS = ['hover', 'focus', 'focused', 'selected', 'on', 'active', 'checked'];

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

/**
 * `--<id>-*` tokens declared in the given blocks.
 *
 * Segments never end on a hyphen, so a trailing `-` cannot be mistaken for a
 * token name.
 */
function extractTokensForId(blocks, id) {
  const tokens = new Set();
  // Comments name tokens too (`the --card-hover-* tokens`); they are prose.
  blocks = blocks.map((b) => b.replace(/\/\*[\s\S]*?\*\//g, ' '));
  const re = new RegExp(`--${id}(?:-[a-z0-9]+)+`, 'g');
  for (const block of blocks) {
    for (const t of block.match(re) ?? []) tokens.add(t);
  }
  return [...tokens];
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
  // For a finding about a file other than the runtime (config-token against
  // the saved alias config, deep-import against the editor or the registration
  // file): the line is already resolved against that file's own text, never
  // `source` (the runtime).
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
  // Recorded before the runtime check below, so an id with neither file gets
  // both findings rather than stopping silently on the first.
  const editorMissing = !existsSync(editorPath);
  if (editorMissing) {
    record('missing-file', `editor missing: ${relative(root, editorPath)}`);
  }
  if (!existsSync(runtimePath)) {
    record('missing-file', `runtime missing: ${relative(root, runtimePath)}`);
    return done();
  }
  // A missing editor still gets its own finding, but the rules that need only
  // the runtime (token shape, semantics, config, registration) still run —
  // an editor-less component is exactly the case those rules exist to catch.

  const runtime = readFileSync(runtimePath, 'utf8');
  const editor = editorMissing ? '' : readFileSync(editorPath, 'utf8');
  source = runtime;
  const vocab = vocabulary ?? loadVocabulary({ root });

  // Runtime: the file exports the `catalogue` that says what the component
  // is for. Without it the component is pickable but unexplained.
  const catalogue = catalogueOf(runtime);
  if (!catalogue) {
    record(
      'missing-description',
      `${relative(root, runtimePath)}: has no catalogue export. Say what ${Id} is for, and what it is not for`,
    );
  } else {
    for (const requiredField of ['description', 'useFor', 'notFor']) {
      if (!catalogue[requiredField]) {
        record('missing-description', `${relative(root, runtimePath)}: catalogue has no ${requiredField}`);
      }
    }
  }

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

  const declared = declaredTokens(blocks);
  const context = { id, root, runtimePath, runtime, blocks, vocab, intrinsic, declared };
  tokenRules.checkDefaultsAreSemantic(context, record);
  tokenRules.checkConfigTokens(context, recordAt);
  tokenRules.checkUnreadTokens(context, record);

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

  importsAndRoutes.checkComponentImports(root, [[runtimePath, runtime], [editorPath, editor]], recordAt);

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
    importsAndRoutes.checkComponentImports(root, [[registrationFile, readFileSync(registrationFile, 'utf8')]], recordAt);
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

  const context = {
    blocks: extractGlobalRootBlocks(runtime),
    runtime,
    root,
    runtimePath,
    vocab: vocabulary ?? loadVocabulary({ root }),
    intrinsic: intrinsicMatchers(editor),
  };
  tokenRules.checkDefaultsAreSemantic(context, record);
  return findings;
}
