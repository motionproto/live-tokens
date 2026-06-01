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
//   - :global(:root) defaults reference theme tokens (no raw colour literals)
//
// Returns { errors: string[], warnings: string[] }.

import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { extname, join, relative } from 'node:path';

// Property suffixes the editor picker recognises (KIND_PATTERNS in the editor).
// Keep in sync with the skill's suffix vocabulary.
const KNOWN_SUFFIXES = [
  'surface', 'border', 'text', 'icon', 'label', 'fill',
  'radius', 'border-width', 'font-family', 'font-weight',
  'font-size', 'line-height', 'letter-spacing', 'padding',
  'thickness', 'width', 'color', 'size', 'gap', 'opacity',
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

export function checkComponent(id, root = process.cwd()) {
  const errors = [];
  const warnings = [];

  if (!/^[a-z][a-z0-9]*$/.test(id)) {
    errors.push(`id "${id}" is invalid; must be lowercase letters/digits, no dashes`);
    return { errors, warnings };
  }

  const Id = capitalize(id);
  const runtimePath = join(root, 'src/system/components', `${Id}.svelte`);
  const editorPath = join(root, 'src/system/components', `${Id}Editor.svelte`);

  if (!existsSync(runtimePath)) {
    errors.push(`runtime missing: ${relative(root, runtimePath)}`);
  }
  if (!existsSync(editorPath)) {
    errors.push(`editor missing: ${relative(root, editorPath)}`);
  }
  if (errors.length) return { errors, warnings };

  const runtime = readFileSync(runtimePath, 'utf8');
  const editor = readFileSync(editorPath, 'utf8');

  // Runtime: :global(:root) block present.
  const blocks = extractGlobalRootBlocks(runtime);
  if (blocks.length === 0) {
    errors.push(`${relative(root, runtimePath)}: missing :global(:root) declaration block`);
  }

  // Runtime: at least one --<id>-* token.
  const tokens = extractTokensForId(blocks, id);
  if (blocks.length > 0 && tokens.length === 0) {
    errors.push(`${relative(root, runtimePath)}: no --${id}-* tokens declared in :global(:root)`);
  }

  // Runtime: state-after-property anti-pattern. Report this first; if it fires
  // for a token, skip the unknown-suffix error for the same token (the state-
  // suffix wouldn't be in the suffix list anyway, so it's the same root cause).
  const stateAfterTokens = new Set();
  for (const token of tokens) {
    const trailingState = detectStateAfterProperty(token);
    if (trailingState) {
      stateAfterTokens.add(token);
      errors.push(
        `${relative(root, runtimePath)}: ${token} has '${trailingState}' after the property; ` +
          `state must come before property (e.g. -${trailingState}-surface, not -surface-${trailingState})`,
      );
    }
  }

  // Runtime: every token ends in a known suffix.
  for (const token of tokens) {
    if (stateAfterTokens.has(token)) continue;
    if (!tokenSuffix(token)) {
      errors.push(`${relative(root, runtimePath)}: ${token} doesn't end in a known suffix`);
    }
  }

  // Runtime: defaults inside :global(:root) reference theme tokens, not raw colours.
  for (const block of blocks) {
    const rawColours = block.match(/:\s*#[0-9a-fA-F]{3,8}\b/g) ?? [];
    if (rawColours.length > 0) {
      errors.push(
        `${relative(root, runtimePath)}: :global(:root) contains ${rawColours.length} raw colour literal(s); ` +
          `defaults must reference theme tokens (e.g. var(--surface-primary))`,
      );
    }
  }

  // Editor: declares `const component = '<id>'` (module block).
  const componentDecl = new RegExp(`\\bconst\\s+component\\s*=\\s*['"]${id}['"]`);
  if (!componentDecl.test(editor)) {
    errors.push(`${relative(root, editorPath)}: missing 'const component = "${id}"' in <script module>`);
  }

  // Editor: exports allTokens.
  if (!/\bexport\s+const\s+allTokens\b/.test(editor)) {
    errors.push(`${relative(root, editorPath)}: missing 'export const allTokens'`);
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
    warnings.push(
      `${relative(root, editorPath)}: a type-group font helper is called across ${slots} slots without a derivation; ` +
        `its bare font-family/font-size/… keys would phantom-link every slot's fonts. Pass { component, variants } to buildTypeGroupTokens/buildTypeGroupFontTokens.`,
    );
  }

  // Imports across runtime + editor: reject deep imports into the package.
  for (const [path, source] of [[runtimePath, runtime], [editorPath, editor]]) {
    for (const imp of extractImports(source)) {
      for (const pattern of DEEP_IMPORT_PATTERNS) {
        if (pattern.test(imp)) {
          errors.push(`${relative(root, path)}: deep import not supported: ${imp}`);
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
    errors.push(`no registration for '${id}' under src/ — expected registerComponent({ id: '${id}', ... }) or bootLiveTokens({ components: [{ id: '${id}', ... }] })`);
  } else {
    // Check the registration file's imports too.
    const regSource = readFileSync(registrationFile, 'utf8');
    for (const imp of extractImports(regSource)) {
      for (const pattern of DEEP_IMPORT_PATTERNS) {
        if (pattern.test(imp)) {
          errors.push(`${relative(root, registrationFile)}: deep import not supported: ${imp}`);
        }
      }
    }
  }

  return { errors, warnings };
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
