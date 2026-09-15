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

import { existsSync, readFileSync } from 'node:fs';
import { join, relative } from 'node:path';
import { declaredTokens, intrinsicMatchers } from './lib/componentSource.mjs';
import { assembleRules, lineOf } from './lib/findings.mjs';
import {
  EDITOR_DIRS,
  PKG_ROOT,
  builtInIds,
  componentInventory,
  extractGlobalRootBlocks,
  loadVocabulary,
} from './lib/tokenVocabulary.mjs';
import * as componentStructure from './rules/componentStructure.mjs';
import * as importsAndRoutes from './rules/importsAndRoutes.mjs';
import * as testRuns from './rules/testRuns.mjs';
import * as tokenRules from './rules/tokens.mjs';

export { unreadTokens } from './lib/componentSource.mjs';

/**
 * Every rule, with its default severity, its repair, and the guidance every
 * finding of it carries.
 *
 * `repair` is the ceiling: `auto` when code can rewrite the site, `choice` when
 * code can name the candidates but not pick one, `authored` when a person
 * writes the repair. A finding may lower its rule's `repair`; none raises it.
 */
export const COMPONENT_RULES = assembleRules(
  [
    'tokens-migration',
    'tokens-breaking-migration',
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
  componentStructure.componentRules,
  tokenRules.componentRules,
  importsAndRoutes.componentRules,
  testRuns.componentRules,
);

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

  if (!componentStructure.checkId(id, record)) return done();

  const { Id, runtimePath, editorPath } = resolveComponentPaths(id, root);
  file = relative(root, runtimePath);
  const { editorMissing, runtimeMissing } = componentStructure.checkFiles({ root, runtimePath, editorPath }, record);
  if (runtimeMissing) return done();
  // A missing editor still gets its own finding, but the rules that need only
  // the runtime (token shape, semantics, config, registration) still run —
  // an editor-less component is exactly the case those rules exist to catch.

  const runtime = readFileSync(runtimePath, 'utf8');
  const editor = editorMissing ? '' : readFileSync(editorPath, 'utf8');
  source = runtime;
  const blocks = extractGlobalRootBlocks(runtime);
  const context = {
    id,
    Id,
    root,
    runtimePath,
    editorPath,
    runtime,
    editor,
    blocks,
    vocab: vocabulary ?? loadVocabulary({ root }),
    // A token the editor declares as an intrinsic carries a structural keyword,
    // not a themeable value, so a property-suffix rule is the wrong test for it.
    intrinsic: intrinsicMatchers(editor),
    declared: declaredTokens(blocks),
  };

  componentStructure.checkRuntime(context, record);
  tokenRules.checkDefaultsAreSemantic(context, record);
  tokenRules.checkConfigTokens(context, recordAt);
  tokenRules.checkUnreadTokens(context, record);
  // The editor rules need real editor content; a missing editor already has
  // its own `missing-file` finding, and running them against an empty string
  // would only restate it under different rules.
  if (!editorMissing) componentStructure.checkEditor(context, record);
  importsAndRoutes.checkComponentImports(root, [[runtimePath, runtime], [editorPath, editor]], recordAt);

  const registrationFile = componentStructure.checkRegistration(context, record);
  if (registrationFile) {
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
