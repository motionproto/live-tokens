import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { extname, join, relative } from 'node:path';
import { catalogueOf } from '../lib/catalogue.mjs';
import { STATE_TOKENS, editorTokenRefs, readKnownSuffixes, tokenSuffix } from '../lib/componentSource.mjs';
import { PKG_ROOT, builtInIds } from '../lib/tokenVocabulary.mjs';

const RUNTIME = 'Wire the component as the recipe in live-tokens-create-component wires it.';

const PROPERTY_NAME =
  'Rename the semantic property to the name a shipped component uses for the same role. The vocabulary and the state model are in live-tokens-create-component.';

const EDITOR =
  'Fix the editor schema, states, or preview props by the Component editor section of live-tokens-create-component.';

export const componentRules = {
  'invalid-id': {
    severity: 'error',
    repair: 'authored',
    guidance: `Give the component an id of lowercase letters and digits with no dashes, and use it in the runtime, the editor, and the registration. ${RUNTIME}`,
  },
  'missing-file': {
    severity: 'error',
    repair: 'authored',
    guidance: `Create the runtime or editor file the message names. ${RUNTIME}`,
  },
  'missing-root-block': {
    severity: 'error',
    repair: 'authored',
    guidance: `Declare the semantic properties in a :global(:root) block in the runtime's <style>. ${RUNTIME}`,
  },
  'no-tokens': {
    severity: 'error',
    repair: 'authored',
    guidance: `Declare the component's --<id>-* semantic properties in its :global(:root) block. ${RUNTIME}`,
  },
  'missing-description': {
    severity: 'warn',
    repair: 'authored',
    guidance:
      "Add the catalogue export to the runtime's <script module> block, with description and whenToUse as string literals, and whenNotToUse as an array of { when, use? } rows: `when` names the condition that rules this component out, and `use` names the sibling component id that fits instead. A row with no sibling to name takes no `use`. A component with no disqualifying condition takes `whenNotToUse: []`. An optional constraints array states each rule of use as one sentence. The message names the field that is missing or malformed, and `npx live-tokens components <id>` prints the entry once it is there.",
  },
  'state-after-property': {
    severity: 'error',
    repair: 'authored',
    guidance: `Move the state ahead of the property suffix, such as -hover-surface. ${PROPERTY_NAME}`,
  },
  'disabled-is-terminal': {
    severity: 'error',
    repair: 'authored',
    guidance: `Disabled is terminal, so a name that joins disabled with another state never paints. Delete the semantic property, or rename it. ${PROPERTY_NAME}`,
  },
  'unknown-suffix': {
    severity: 'error',
    repair: 'authored',
    guidance: `End the name in a suffix check-component accepts. references/token-naming.md in live-tokens-create-component lists every suffix, and the suffix selects the editor control. ${PROPERTY_NAME}`,
  },
  'phantom-editor-token': {
    severity: 'error',
    repair: 'authored',
    guidance: `The editor names a semantic property the runtime never declares. Point the row at a declared property, or declare the property in the runtime's :global(:root) block. ${EDITOR}`,
  },
  'missing-component-const': {
    severity: 'error',
    repair: 'authored',
    guidance: `Declare const component = '<id>' in the editor's <script module> block. ${EDITOR}`,
  },
  'missing-all-tokens': {
    severity: 'error',
    repair: 'authored',
    guidance: `Export allTokens from the editor's <script module> block. ${EDITOR}`,
  },
  'missing-registration': {
    severity: 'error',
    repair: 'authored',
    guidance:
      'Register the component in the shared module the Registration section of live-tokens-create-component wires up, importable by the app and by check-component --tests. The call is registerComponent({ id }) or an entry in bootLiveTokens({ components }).',
  },
  'phantom-link': {
    severity: 'warn',
    repair: 'authored',
    guidance: `Pass { component, variants } to buildTypeGroupTokens or buildTypeGroupFontTokens, so each slot keeps its own font keys. ${EDITOR}`,
  },
};

/** True when `id` is one of the package's own components. */
function isBuiltIn(id) {
  return builtInIds(process.cwd(), PKG_ROOT).has(id);
}

// Disabled is terminal: a disabled component cannot be hovered, focused, or
// selected, so a token naming both describes a state that never paints.
const TERMINAL_CONFLICTS = ['hover', 'focus', 'focused', 'selected', 'on', 'active', 'checked'];

export function checkId(id, record) {
  if (/^[a-z][a-z0-9]*$/.test(id)) return true;
  record('invalid-id', `id "${id}" is invalid; must be lowercase letters/digits, no dashes`);
  return false;
}

/** The editor is checked first, so an id with neither file gets both findings
 *  rather than stopping silently on the first. */
export function checkFiles({ root, runtimePath, editorPath }, record) {
  const editorMissing = !existsSync(editorPath);
  if (editorMissing) {
    record('missing-file', `editor missing: ${relative(root, editorPath)}`);
  }
  const runtimeMissing = !existsSync(runtimePath);
  if (runtimeMissing) {
    record('missing-file', `runtime missing: ${relative(root, runtimePath)}`);
  }
  return { editorMissing, runtimeMissing };
}

export function checkRuntime({ id, Id, root, runtimePath, runtime, blocks, intrinsic, vocab }, record) {
  // Runtime: the file exports the `catalogue` that says what the component
  // is for. Without it the component is pickable but unexplained.
  const catalogue = catalogueOf(runtime);
  if (!catalogue) {
    record(
      'missing-description',
      `${relative(root, runtimePath)}: has no catalogue export. Say what ${Id} is for and when not to use it`,
    );
  } else {
    for (const requiredField of ['description', 'whenToUse', 'whenNotToUse']) {
      if (!catalogue[requiredField]) {
        record('missing-description', `${relative(root, runtimePath)}: catalogue has no ${requiredField}`);
      }
    }
    for (const row of catalogue.whenNotToUse ?? []) {
      if (row.use && !vocab.components.has(row.use)) {
        record(
          'missing-description',
          `${relative(root, runtimePath)}: catalogue whenNotToUse names "${row.use}", which is not a component id`,
        );
      }
    }
  }

  // Runtime: :global(:root) block present.
  if (blocks.length === 0) {
    record('missing-root-block', `${relative(root, runtimePath)}: missing :global(:root) declaration block`);
  }

  // Runtime: at least one --<id>-* token.
  const tokens = extractTokensForId(blocks, id);
  if (blocks.length > 0 && tokens.length === 0) {
    record('no-tokens', `${relative(root, runtimePath)}: no --${id}-* tokens declared in :global(:root)`);
  }

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
}

export function checkEditor({ id, root, runtimePath, editorPath, editor, declared }, record) {
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

/** The file under src/ that registers `id`, or null when none does. */
export function checkRegistration({ id, root }, record) {
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
  if (!registrationFile && isBuiltIn(id)) return null;

  if (!registrationFile) {
    record(
      'missing-registration',
      `no registration for '${id}' under src/. Expected registerComponent({ id: '${id}', ... }) or bootLiveTokens({ components: [{ id: '${id}', ... }] })`,
    );
  }
  return registrationFile;
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
