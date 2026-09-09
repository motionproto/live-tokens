import { describe, it, expect, afterEach } from 'vitest';
import { existsSync, mkdtempSync, mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
// @ts-expect-error — plain .mjs module, no types
import { checkComponent } from './check-component.mjs';

// `npm test` runs before CI installs Chromium, so the real-browser round trip
// near the end of this file is guarded on it already being present (as it is
// in this dev environment) rather than failing a clean runner.
let hasChromium = false;
try {
  const { chromium } = await import('@playwright/test');
  hasChromium = existsSync(chromium.executablePath());
} catch {
  hasChromium = false;
}

const roots: string[] = [];
function fixtureRoot(): string {
  const dir = mkdtempSync(join(tmpdir(), 'lt-check-'));
  roots.push(dir);
  mkdirSync(join(dir, 'src/system/components'), { recursive: true });
  return dir;
}
afterEach(() => {
  while (roots.length) rmSync(roots.pop()!, { recursive: true, force: true });
});

function write(root: string, id: string, editor: string) {
  const Id = id.charAt(0).toUpperCase() + id.slice(1);
  writeFileSync(
    join(root, 'src/system/components', `${Id}.svelte`),
    `<style>:global(:root){--${id}-header-text:var(--text-primary);--${id}-body-text:var(--text-primary);}</style>`,
  );
  writeFileSync(join(root, 'src/system/components', `${Id}Editor.svelte`), editor);
  writeFileSync(join(root, 'src/main.ts'), `registerComponent({ id: '${id}', label: '${Id}' });`);
}

const twoSlots = (id: string) => `
  const typeGroups = { default: [
    { colorVariable: '--${id}-header-text', familyVariable: '--${id}-header-font-family' },
    { colorVariable: '--${id}-body-text', familyVariable: '--${id}-body-font-family' },
  ] };`;

const BARE_FONT = (id: string) => `<script module lang="ts">
  import { buildTypeGroupTokens } from '@motion-proto/live-tokens/component-editor';
  const component = '${id}';${twoSlots(id)}
  export const allTokens = [ ...buildTypeGroupTokens(typeGroups) ];
</script>`;

const DERIVED_FONT = (id: string) => `<script module lang="ts">
  import { buildTypeGroupTokens } from '@motion-proto/live-tokens/component-editor';
  const component = '${id}';${twoSlots(id)}
  export const allTokens = [ ...buildTypeGroupTokens(typeGroups, { component, variants: ['default'] }) ];
</script>`;

const BARE_COLOR = (id: string) => `<script module lang="ts">
  import { buildTypeGroupColorTokens } from '@motion-proto/live-tokens/component-editor';
  const component = '${id}';${twoSlots(id)}
  export const allTokens = [ ...buildTypeGroupColorTokens(typeGroups) ];
</script>`;

describe('check-component phantom-link guard', () => {
  it('warns (does not error) when a bare font helper spans multiple slots', () => {
    const root = fixtureRoot();
    write(root, 'widget', BARE_FONT('widget'));
    const { errors, warnings } = checkComponent('widget', root);
    expect(warnings.some((w: string) => /font helper.*without a derivation/.test(w))).toBe(true);
    expect(errors.some((e: string) => /font helper/.test(e))).toBe(false);
  });

  it('is silent once a derivation is supplied to the font helper', () => {
    const root = fixtureRoot();
    write(root, 'widget', DERIVED_FONT('widget'));
    const { warnings } = checkComponent('widget', root);
    expect(warnings.some((w: string) => /font helper/.test(w))).toBe(false);
  });

  it('does not flag a bare color helper — it no longer infers, so it cannot phantom-link', () => {
    const root = fixtureRoot();
    write(root, 'widget', BARE_COLOR('widget'));
    const { errors, warnings } = checkComponent('widget', root);
    expect([...errors, ...warnings].some((m: string) => /phantom|font helper/.test(m))).toBe(false);
  });
});

// @ts-expect-error — plain .mjs module, no types
import { COMPONENT_RULES, checkComponentDefaults, discoverComponents } from './check-component.mjs';
// @ts-expect-error — plain .mjs module, no types
import { applySeverity, countBySeverity } from './lib/findings.mjs';

function withTokens(root: string) {
  mkdirSync(join(root, 'src/system/styles'), { recursive: true });
  writeFileSync(
    join(root, 'src/system/styles/tokens.css'),
    ':root { --surface-neutral: #111; --text-primary: #eee; --space-8: 0.5rem; --radius-md: 0.5rem; }',
  );
}

function widget(root: string, rootBlock: string, editorExtra = '') {
  withTokens(root);
  writeFileSync(
    join(root, 'src/system/components/Widget.svelte'),
    `<style>:global(:root){\n${rootBlock}\n}</style>`,
  );
  writeFileSync(
    join(root, 'src/system/components/WidgetEditor.svelte'),
    `<script module lang="ts">
      const component = 'widget';
      export const allTokens = [];
      ${editorExtra}
    </script>`,
  );
  writeFileSync(join(root, 'src/main.ts'), `registerComponent({ id: 'widget', label: 'Widget' });`);
  return join(root, 'src/system/components/Widget.svelte');
}

function rules(root: string, id = 'widget'): string[] {
  return checkComponent(id, root).findings.map((f: { rule: string }) => f.rule);
}

describe('check-component semantic defaults', () => {
  it('accepts a default backed by a theme token', () => {
    const root = fixtureRoot();
    widget(root, '--widget-surface: var(--surface-neutral);');
    expect(rules(root)).not.toContain('unknown-token-ref');
    expect(rules(root)).not.toContain('default-not-token');
  });

  it('accepts a default composed from theme tokens', () => {
    const root = fixtureRoot();
    widget(root, '--widget-surface: color-mix(in srgb, var(--surface-neutral) 70%, transparent);');
    expect(rules(root)).not.toContain('default-not-token');
  });

  it('rejects a default reading a token that does not exist', () => {
    const root = fixtureRoot();
    widget(root, '--widget-surface: var(--surface-imaginary);');
    const { errors, findings } = checkComponent('widget', root);
    expect(findings.map((f: { rule: string }) => f.rule)).toContain('unknown-token-ref');
    expect(errors.some((e: string) => e.includes('--surface-imaginary'))).toBe(true);
  });

  it('rejects a state word used as a token', () => {
    const root = fixtureRoot();
    widget(root, '--widget-hover-surface: var(--hover);');
    const { errors, findings } = checkComponent('widget', root);
    expect(findings.map((f: { rule: string }) => f.rule)).toContain('unknown-token-ref');
    expect(errors.some((e: string) => e.includes('a state is a segment of a property name'))).toBe(true);
  });

  it('warns on a bare keyword unless the editor declares it an intrinsic', () => {
    const undeclared = fixtureRoot();
    widget(undeclared, '--widget-align: start;');
    expect(rules(undeclared)).toContain('default-not-token');

    const declared = fixtureRoot();
    widget(
      declared,
      '--widget-align: start;',
      `export const intrinsics = [
        { key: 'align', variants: ['default'], variable: () => '--widget-align', values: ['start'], default: { default: 'start' } },
      ];`,
    );
    expect(rules(declared)).not.toContain('default-not-token');
  });

  it('matches a variant-shaped intrinsic against the token it declares', () => {
    const root = fixtureRoot();
    widget(
      root,
      '--widget-lg-align: start;',
      `export const intrinsics = [
        { key: 'align', variants: ['lg'], variable: (v) => \`--widget-\${v}-align\`, values: ['start'], default: { lg: 'start' } },
      ];`,
    );
    expect(rules(root)).not.toContain('default-not-token');
  });

  it('warns on a raw dimension in a default', () => {
    const root = fixtureRoot();
    widget(root, '--widget-width: 16rem;');
    const { warnings } = checkComponent('widget', root);
    expect(rules(root)).toContain('dimension-literal');
    expect(warnings.some((w: string) => w.includes('16rem'))).toBe(true);
  });

  it('checkComponentDefaults reads a runtime file without the consumer-only rules', () => {
    const root = fixtureRoot();
    const file = widget(root, '--widget-surface: var(--surface-imaginary);');
    const findings = checkComponentDefaults(file, { root });
    expect(findings.map((f: { rule: string }) => f.rule)).toEqual(['unknown-token-ref']);
  });

  it('severity split keeps a raw dimension out of the failing set when a token backs the value', () => {
    const root = fixtureRoot();
    widget(root, '--widget-width: calc(var(--space-8) + 2px);\n--widget-surface: var(--surface-neutral);');
    const { findings } = checkComponent('widget', root);
    const resolved = applySeverity(findings, COMPONENT_RULES, {});
    expect(countBySeverity(resolved).errors).toBe(0);
  });
});

/**
 * The shipped catalogue is the checker's fixture. It is the only body of
 * components written to this contract, so if the rule and the components ever
 * disagree, one of them is wrong and this is where it shows. It caught the
 * suffix vocabulary drifting narrower than the components it governs: 109
 * errors across 26 components, none of them defects in the components.
 */
describe('the shipped catalogue satisfies the contract it documents', () => {
  const root = process.cwd();
  const registry = readFileSync(join(root, 'src/editor/component-editor/registry.ts'), 'utf8');
  const ids = [...registry.matchAll(/^\s{4}id: '([a-z0-9]+)',$/gm)].map((m) => m[1]);

  it('registers a catalogue to check', () => {
    expect(ids.length).toBeGreaterThan(20);
  });

  it.each(ids)('%s', (id) => {
    expect(checkComponent(id, root).errors).toEqual([]);
  });
});

describe('shipped components', () => {
  it('every default resolves to a real token', () => {
    const root = process.cwd();
    const files = readdirSync(join(root, 'src/system/components'))
      .filter((f) => f.endsWith('.svelte') && !f.endsWith('Editor.svelte'))
      .map((f) => join(root, 'src/system/components', f));
    const findings = files.flatMap((f) => checkComponentDefaults(f, { root }));
    const errors = applySeverity(findings, COMPONENT_RULES, {}).filter(
      (f: { severity: string }) => f.severity === 'error',
    );
    expect(errors.map((f: { message: string }) => f.message)).toEqual([]);
  });
});

/**
 * A component that passes under --strict, and one mutation per rule. Each
 * mutation is the smallest edit that breaks the contract in one way, so the
 * table is the proof that every rule can still fire and the clean shape is
 * the only one that passes. A rule whose row goes green without its mutation
 * has stopped holding the line.
 */
const CLEAN = {
  runtime: `<script lang="ts">
  import { editorState } from '@motion-proto/live-tokens';
</script>
<style>
  :global(:root) {
    --widget-surface: var(--surface-neutral);
    --widget-hover-surface: color-mix(in srgb, var(--surface-neutral) 80%, transparent);
    --widget-radius: var(--radius-md);
    --widget-align: start;
  }
</style>`,
  editor: `<script module lang="ts">
  import type { Token } from '@motion-proto/live-tokens/component-editor';
  const component = 'widget';
  export const allTokens: Token[] = [
    { label: 'surface', variable: '--widget-surface' },
    { label: 'surface', variable: '--widget-hover-surface' },
    { label: 'radius', variable: '--widget-radius' },
  ];
  export const intrinsics = [
    { key: 'align', variants: ['default'], variable: () => '--widget-align', values: ['start', 'center'], default: { default: 'start' } },
  ];
</script>`,
  main: `bootLiveTokens(App, '#app', { components: [{ id: 'widget', label: 'Widget' }] });`,
};

type Files = typeof CLEAN;

function strictFindings(files: Files) {
  const root = fixtureRoot();
  withTokens(root);
  writeFileSync(join(root, 'src/system/components/Widget.svelte'), files.runtime);
  writeFileSync(join(root, 'src/system/components/WidgetEditor.svelte'), files.editor);
  writeFileSync(join(root, 'src/main.ts'), files.main);
  return applySeverity(checkComponent('widget', root).findings, COMPONENT_RULES, { strict: true });
}

const swap = (field: keyof Files, from: string, to: string) => (f: Files): Files => {
  if (!f[field].includes(from)) throw new Error(`fixture no longer contains ${from}`);
  return { ...f, [field]: f[field].replace(from, to) };
};
const declare = (line: string) => swap('runtime', '--widget-align: start;', `--widget-align: start;\n    ${line}`);

const MUTATIONS: [string, (f: Files) => Files, string][] = [
  ['a suffix outside the vocabulary', declare('--widget-glow: var(--surface-neutral);'), 'unknown-suffix'],
  ['a state after the property', declare('--widget-surface-hover: var(--surface-neutral);'), 'state-after-property'],
  ['a hex default', swap('runtime', 'var(--surface-neutral);', '#6a4ce8;'), 'color-literal'],
  ['an rgb default', swap('runtime', 'var(--surface-neutral);', 'rgb(20 20 20);'), 'color-literal'],
  ['an oklch default', swap('runtime', 'var(--surface-neutral);', 'oklch(60% 0.1 200);'), 'color-literal'],
  ['a named colour default', swap('runtime', 'var(--surface-neutral);', 'white;'), 'color-literal'],
  ['a token that does not exist', swap('runtime', 'var(--radius-md)', 'var(--radius-imaginary)'), 'unknown-token-ref'],
  ['a state word read as a token', swap('runtime', 'color-mix(in srgb, var(--surface-neutral) 80%, transparent)', 'var(--hover)'), 'unknown-token-ref'],
  ['a raw dimension with no token behind it', swap('runtime', 'var(--radius-md)', '8px'), 'default-not-token'],
  ['a raw dimension is also reported as one', swap('runtime', 'var(--radius-md)', '8px'), 'dimension-literal'],
  ['a keyword the editor does not declare', swap('editor', 'export const intrinsics', 'const notIntrinsics'), 'default-not-token'],
  ['no :global(:root) block', swap('runtime', ':global(:root)', ':root'), 'missing-root-block'],
  ['a deep import', swap('editor', "'@motion-proto/live-tokens/component-editor'", "'@motion-proto/live-tokens/src/editor/component-editor/scaffolding/types'"), 'deep-import'],
  ['no registration', swap('main', "id: 'widget'", "id: 'gadget'"), 'missing-registration'],
  ['an editor without the component const', swap('editor', "const component = 'widget';", "const name = 'widget';"), 'missing-component-const'],
  ['an editor without allTokens', swap('editor', 'export const allTokens: Token[]', 'const allTokens: Token[]'), 'missing-all-tokens'],
  ['a disabled state that is also hovered', declare('--widget-disabled-hover-surface: var(--surface-neutral);'), 'disabled-is-terminal'],
  ['a selected state that is also disabled', declare('--widget-selected-disabled-surface: var(--surface-neutral);'), 'disabled-is-terminal'],
  ['an editor row naming a token the runtime lacks', swap('editor', "{ label: 'radius', variable: '--widget-radius' },", "{ label: 'radius', variable: '--widget-radius' }, { label: 'glow', variable: '--widget-glow' },"), 'phantom-editor-token'],
  ['an editor pattern matching nothing', swap('editor', "{ label: 'radius', variable: '--widget-radius' },", "{ label: 'radius', variable: '--widget-radius' }, { label: 'x', variable: `--widget-${'lg'}-glow` },"), 'phantom-editor-token'],
];

describe('the clean component and its mutations', () => {
  it('passes under --strict with no findings at all', () => {
    expect(strictFindings(CLEAN)).toEqual([]);
  });

  it.each(MUTATIONS)('%s is caught', (_name, mutate, rule) => {
    expect(strictFindings(mutate(CLEAN)).map((f: { rule: string }) => f.rule)).toContain(rule);
  });

  it('an editor row may name a per-side padding the runtime declares only as a parent', () => {
    const files = swap('editor', "{ label: 'radius', variable: '--widget-radius' },", "{ label: 'radius', variable: '--widget-radius' }, { label: 'top', variable: '--widget-padding-top' }, { label: 'all', variable: `--widget-${'default'}-surface` },")(
      swap('runtime', '--widget-align: start;', '--widget-align: start;\n    --widget-padding: var(--space-8);\n    --widget-default-surface: var(--surface-neutral);')(CLEAN),
    );
    expect(strictFindings(files)).toEqual([]);
  });

  it('a literal inside a var() fallback is not the default', () => {
    const rules = strictFindings(swap('runtime', 'var(--surface-neutral);', 'var(--surface-neutral, #fff);')(CLEAN)).map((f: { rule: string }) => f.rule);
    expect(rules).not.toContain('color-literal');
  });

  it('a nested at-rule neither ends the block nor hides what follows it', () => {
    const nested = declare('@media (min-width: 40rem) { --widget-surface: var(--surface-neutral); }\n    --widget-glow: var(--surface-neutral);');
    expect(strictFindings(nested(CLEAN)).map((f: { rule: string }) => f.rule)).toContain('unknown-suffix');
  });

  it('a single-line intrinsics array still exempts its token', () => {
    const oneLine = swap(
      'editor',
      /export const intrinsics[\s\S]*?\];/.exec(CLEAN.editor)![0],
      "export const intrinsics = [{ key: 'align', variants: ['default'], variable: () => '--widget-align', values: ['start'], default: { default: 'start' } }];",
    );
    expect(strictFindings(oneLine(CLEAN))).toEqual([]);
  });
});

describe('discoverComponents', () => {
  it('finds every runtime with an editor beside it and skips the rest', () => {
    const root = fixtureRoot();
    writeFileSync(join(root, 'src/system/components/Widget.svelte'), CLEAN.runtime);
    writeFileSync(join(root, 'src/system/components/WidgetEditor.svelte'), CLEAN.editor);
    writeFileSync(join(root, 'src/system/components/Stray.svelte'), '<div />');
    expect(discoverComponents(root)).toEqual(['widget']);
  });

  it('covers the shipped catalogue in this repo', () => {
    const registry = readFileSync(join(process.cwd(), 'src/editor/component-editor/registry.ts'), 'utf8');
    const ids = [...registry.matchAll(/^\s{4}id: '([a-z0-9]+)',$/gm)].map((m) => m[1]);
    for (const id of ids) expect(discoverComponents(process.cwd())).toContain(id);
  });
});

// @ts-expect-error — plain .mjs module, no types
import {
  artifactForContractRule,
  classifyInfrastructureError,
  extractToken,
  extractViolationArray,
  findTokenLine,
  hasHardFailure,
  identifyComponent,
  mapPlaywrightResults,
  mapRegistryViolation,
  mapVitestResults,
  missingToolFindings,
  readPlaywrightTests,
  readReportOrSetupFinding,
  reconcileCoverage,
  runContractTests,
  runPlaywrightSuite,
  runRegistrySuite,
  writeGeneratedConfigs,
} from './contractRunner.mjs';
// @ts-expect-error — plain .mjs module, no types
import { applyCoverageSeverity, resolveRuleSeverity } from './lib/findings.mjs';

function widgetFixtureRoot(): string {
  const root = fixtureRoot();
  write(root, 'widget', BARE_FONT('widget'));
  return root;
}

/** A Playwright JSON report shaped like the real one: a file suite, a
 *  `describe.serial(id)` group nested inside it (one entry per spec's
 *  `test.status`/`test.annotations`/`test.results`), matching what a real
 *  `component-editor.contract.ts` run produces (verified against live runs
 *  while building this). */
function editorSuiteReport(componentId: string, specs: Array<Record<string, unknown>>) {
  return {
    suites: [
      {
        title: 'component-editor.contract.ts',
        suites: [{ title: componentId, specs }],
      },
    ],
  };
}

function flatSuiteReport(file: string, specs: Array<Record<string, unknown>>) {
  return { suites: [{ title: file, specs }] };
}

function spec(title: string, file: string, line: number, test: Record<string, unknown>) {
  return { title, file, line, tests: [{ status: 'expected', annotations: [], results: [{ status: 'passed', errors: [] }], ...test }] };
}

describe('contractRunner: tool detection', () => {
  it('reports every missing peer, and none once node_modules has all three', () => {
    const root = fixtureRoot();
    const missing = missingToolFindings(root).map((f: { rule: string }) => f.rule);
    expect(missing).toEqual(['tests-not-installed', 'tests-not-installed', 'tests-not-installed']);

    for (const pkg of ['@playwright/test', 'vitest', 'happy-dom']) {
      mkdirSync(join(root, 'node_modules', pkg), { recursive: true });
    }
    expect(missingToolFindings(root)).toEqual([]);
  });
});

describe('contractRunner: infrastructure vs. contract failures', () => {
  it('recognises a missing browser and a crashed worker; nothing else', () => {
    expect(classifyInfrastructureError("browserType.launch: Executable doesn't exist at /nope")).toEqual({
      rule: 'tests-not-installed',
      message: 'Chromium is not installed for Playwright. Run `npx playwright install chromium`.',
    });
    expect(classifyInfrastructureError('Worker process exited unexpectedly')?.rule).toBe('tests-setup');
    expect(classifyInfrastructureError('ContractViolation: [contract-alias] toggle: nope')).toBeNull();
  });
});

describe('contractRunner: rule and component identification', () => {
  it('trusts the immediate describe title, then the leading word of the spec title, only against known ids', () => {
    const known = new Set(['toggle', 'card']);
    expect(identifyComponent(['toggle'], 'toggle is listed in its registry group', known)).toBe('toggle');
    expect(identifyComponent([], 'card repaints every property in its standardized runtime preview', known)).toBe('card');
    expect(identifyComponent([], 'component discovery covers every alias exactly once', known)).toBeNull();
    expect(identifyComponent(['some file suite'], 'every shipped component alias fans out...', known)).toBeNull();
  });
});

describe('contractRunner: reading a Playwright report into tests', () => {
  it('reads test.status and test.annotations, not the per-result ones, and only the final result', () => {
    const report = editorSuiteReport('widget', [
      spec('widget draws every painted part in Sketch mode', 'component-editor.contract.ts', 46, {
        status: 'flaky',
        annotations: [{ type: 'inapplicable', description: 'no painted parts' }],
        results: [{ status: 'failed', errors: [{ message: 'boom' }] }, { status: 'passed', errors: [] }],
      }),
    ]);
    const [t] = readPlaywrightTests(report);
    expect(t.status).toBe('flaky');
    expect(t.annotations).toEqual([{ type: 'inapplicable', description: 'no painted parts' }]);
    expect(t.lastResult.status).toBe('passed');
  });
});

describe('contractRunner: token and line attribution', () => {
  it('extracts a design token from a violation message, or nothing', () => {
    expect(extractToken('aliases resolve to nothing at the root: --toggle-track-surface')).toBe('--toggle-track-surface');
    expect(extractToken('no probe value for CSS property "color"')).toBeNull();
  });

  it('finds the real line a token sits on, and falls back to line 1', () => {
    const root = fixtureRoot();
    const file = join(root, 'sample.json');
    writeFileSync(file, '{\n  "a": 1,\n  "--widget-surface": "x"\n}\n');
    expect(findTokenLine(file, '--widget-surface')).toBe(3);
    expect(findTokenLine(file, '--not-there')).toBe(1);
    expect(findTokenLine(join(root, 'missing.json'), '--widget-surface')).toBe(1);
  });

  it('never invents a line for a token that is not literally in the file', () => {
    const root = fixtureRoot();
    const file = join(root, 'sample.json');
    writeFileSync(file, '{}');
    expect(findTokenLine(file, '--widget-surface')).toBe(1);
  });

  it('requires a trailing boundary, so a shorter token cannot match inside a longer one', () => {
    const root = fixtureRoot();
    const file = join(root, 'sample.json');
    writeFileSync(file, '{\n  "--card-default-body-padding": "1",\n  "--card-default-body": "2"\n}\n');
    expect(findTokenLine(file, '--card-default-body')).toBe(3);
  });
});

describe('contractRunner: finding artifacts', () => {
  it('points contract-alias/persist/theme at the shipped config, with the config directory rooted where the source tree is', () => {
    const root = widgetFixtureRoot();
    const dataDir = join(root, 'data');
    mkdirSync(join(dataDir, 'component-configs/widget'), { recursive: true });
    writeFileSync(
      join(dataDir, 'component-configs/widget/default.json'),
      '{\n  "aliases": {\n    "--widget-header-text": "--text-primary"\n  }\n}\n',
    );
    for (const rule of ['contract-alias', 'contract-persist', 'contract-theme']) {
      const { file, line } = artifactForContractRule(root, dataDir, rule, 'widget', '--widget-header-text');
      expect(file).toBe('data/component-configs/widget/default.json');
      expect(line).toBe(3);
    }
  });

  it('points contract-listed at the editor file and contract-render/preview/sketch at the runtime, line 1 with no token to find', () => {
    const root = widgetFixtureRoot();
    const listed = artifactForContractRule(root, join(root, 'data'), 'contract-listed', 'widget', null);
    expect(listed.file).toBe('src/system/components/WidgetEditor.svelte');
    expect(listed.line).toBe(1);

    const rendered = artifactForContractRule(root, join(root, 'data'), 'contract-render', 'widget', null);
    expect(rendered.file).toBe('src/system/components/Widget.svelte');
    expect(rendered.line).toBe(1);
  });

  it('falls back to package.json, line 1, when no component could be identified', () => {
    const root = widgetFixtureRoot();
    expect(artifactForContractRule(root, join(root, 'data'), 'contract-render', null, null)).toEqual({
      file: 'package.json',
      line: 1,
    });
  });
});

describe('contractRunner: registry violation parsing', () => {
  it('reads checkRegistryEntry violation strings back out of an untruncated Vitest diff', () => {
    const text =
      "AssertionError: expected [ 'default config: --widget-header-text has no seed in widget/default.json' ] to deeply equal []";
    expect(extractViolationArray(text)).toEqual(['default config: --widget-header-text has no seed in widget/default.json']);
    expect(extractViolationArray('expected [ Array(1) ] to deeply equal []')).toEqual([]);
  });

  it('routes a "default config"/"opacity floor" violation at the shipped config, everything else at the runtime', () => {
    const root = widgetFixtureRoot();
    const dataDir = join(root, 'data');
    const config = mapRegistryViolation(root, dataDir, 'widget', 'default config: --widget-header-text has no seed in widget/default.json');
    expect(config.file).toBe('data/component-configs/widget/default.json');

    const runtime = mapRegistryViolation(root, dataDir, 'widget', 'runtime: --widget-header-text is not declared in src/system/components/Widget.svelte');
    expect(runtime.file).toBe('src/system/components/Widget.svelte');
  });
});

describe('contractRunner: mapping a Playwright report', () => {
  it('reads the rule and component straight out of a ContractViolation prefix', () => {
    const root = widgetFixtureRoot();
    const report = editorSuiteReport('widget', [
      spec('widget is listed in its registry group', 'component-editor.contract.ts', 10, {}),
      spec('widget declares every part and every shipped alias', 'component-editor.contract.ts', 15, {}),
      spec('widget resolves every alias it paints with', 'component-editor.contract.ts', 20, {
        status: 'unexpected',
        results: [
          {
            status: 'failed',
            errors: [{ message: 'ContractViolation: [contract-alias] widget: aliases resolve to nothing at the root: --widget-header-text' }],
          },
        ],
      }),
    ]);
    const { findings, coverage } = mapPlaywrightResults(report, { root, sourceDataDir: join(root, 'data'), knownIds: new Set(['widget']) });
    expect(findings).toHaveLength(1);
    expect(findings[0].rule).toBe('contract-alias');
    expect(findings[0].message).toContain('widget:');
    expect(findings[0].context.suite).toBe('playwright');
    expect(coverage.widget['contract-alias']).toEqual({ status: 'failed' });
  });

  it('derives the rule from the suite file and position, never from title wording, for a plain expect() failure', () => {
    const root = widgetFixtureRoot();
    const report = flatSuiteReport('component-render.contract.ts', [
      spec('a completely reworded title with no fixed wording at all', 'component-render.contract.ts', 682, {
        status: 'unexpected',
        results: [{ status: 'failed', errors: [{ message: 'Error: expect(received).toBeGreaterThan(expected)' }] }],
      }),
    ]);
    // No component id recoverable (the reworded title has no known leading
    // word), so this exercises the file-based fallback specifically.
    const { findings } = mapPlaywrightResults(report, { root, sourceDataDir: join(root, 'data'), knownIds: new Set(['widget']) });
    expect(findings[0].rule).toBe('contract-render');
  });

  it('positions rather than titles identify the obligation: two positions share contract-alias, two share contract-preview', () => {
    const root = widgetFixtureRoot();
    const failing = (title: string) =>
      spec(title, 'component-editor.contract.ts', 1, {
        status: 'unexpected',
        results: [{ status: 'failed', errors: [{ message: 'Error: some assertion' }] }],
      });
    const report = editorSuiteReport('widget', [
      failing('renamed: listed check'),
      failing('renamed: inventory check'),
      failing('renamed: alias resolution check'),
      failing('renamed: states check'),
      failing('renamed: interaction check'),
      failing('renamed: persistence check'),
      failing('renamed: theme check'),
      failing('renamed: sketch check'),
    ]);
    const { findings } = mapPlaywrightResults(report, { root, sourceDataDir: join(root, 'data'), knownIds: new Set(['widget']) });
    expect(findings.map((f: { rule: string }) => f.rule)).toEqual([
      'contract-listed',
      'contract-alias',
      'contract-alias',
      'contract-preview',
      'contract-preview',
      'contract-persist',
      'contract-theme',
      'contract-sketch',
    ]);
  });

  it('records coverage for a pass, including an inapplicable annotation, and stays silent on a cascaded skip', () => {
    const root = widgetFixtureRoot();
    const passing = (title: string) => spec(title, 'component-editor.contract.ts', 1, {});
    const report = editorSuiteReport('widget', [
      spec('widget is listed in its registry group', 'component-editor.contract.ts', 10, {
        status: 'unexpected',
        results: [{ status: 'failed', errors: [{ message: 'ContractViolation: [contract-listed] widget: no registry entry' }] }],
      }),
      spec('widget declares every part and every shipped alias', 'component-editor.contract.ts', 15, { status: 'skipped', results: [{ status: 'skipped', errors: [] }] }),
      passing('position 2: alias-resolve'),
      passing('position 3: states'),
      passing('position 4: interaction'),
      passing('position 5: persist'),
      passing('position 6: theme'),
      spec('widget draws every painted part in Sketch mode', 'component-editor.contract.ts', 46, {
        annotations: [{ type: 'inapplicable', description: 'no painted parts' }],
      }),
    ]);
    const { findings, coverage } = mapPlaywrightResults(report, { root, sourceDataDir: join(root, 'data'), knownIds: new Set(['widget']) });
    expect(findings).toHaveLength(1);
    expect(findings[0].rule).toBe('contract-listed');
    expect(coverage.widget['contract-sketch']).toEqual({ status: 'inapplicable', reason: 'no painted parts' });
    // Position 1 (inventory) was skipped, but position 2 (alias-resolve) — the
    // other obligation sharing contract-alias — passed, so the rule reads
    // passed. reconcileCoverage, not this function, is what turns a rule with
    // no entry at all into `incomplete`.
    expect(coverage.widget['contract-alias']).toEqual({ status: 'passed' });
  });

  it('failed beats passed beats inapplicable when two obligations share one rule', () => {
    const root = widgetFixtureRoot();
    const report = editorSuiteReport('widget', [
      spec('widget previews the state being edited', 'component-editor.contract.ts', 25, {}), // passed, applicable
      spec('widget answers the pointer and the keyboard', 'component-editor.contract.ts', 30, {
        annotations: [{ type: 'inapplicable', description: 'no interactive role' }],
      }),
    ]);
    // Two entries at positions 3 and 4 both map to contract-preview; the real
    // pass must win over the inapplicable one.
    const withPositions = editorSuiteReport('widget', [
      spec('p0', 'component-editor.contract.ts', 1, {}),
      spec('p1', 'component-editor.contract.ts', 1, {}),
      spec('p2', 'component-editor.contract.ts', 1, {}),
      ...report.suites[0].suites[0].specs,
    ]);
    const { coverage } = mapPlaywrightResults(withPositions, { root, sourceDataDir: join(root, 'data'), knownIds: new Set(['widget']) });
    expect(coverage.widget['contract-preview']).toEqual({ status: 'passed' });
  });

  it('a timeout or an interruption is tests-incomplete, not a contract finding', () => {
    const root = widgetFixtureRoot();
    const report = editorSuiteReport('widget', [
      spec('widget persists an edit and resets to the saved config', 'component-editor.contract.ts', 35, {
        status: 'unexpected',
        results: [{ status: 'timedOut', errors: [] }],
      }),
    ]);
    const { findings } = mapPlaywrightResults(report, { root, sourceDataDir: join(root, 'data'), knownIds: new Set(['widget']) });
    expect(findings).toEqual([
      {
        rule: 'tests-incomplete',
        file: 'package.json',
        line: 1,
        message: 'widget: "widget persists an edit and resets to the saved config" did not finish (timedOut)',
        context: expect.objectContaining({ suite: 'playwright' }),
      },
    ]);
  });

  it('a missing browser short-circuits the whole run: one finding, no per-obligation noise, empty coverage', () => {
    const root = widgetFixtureRoot();
    const report = editorSuiteReport('widget', [
      spec('widget is listed in its registry group', 'component-editor.contract.ts', 10, {
        status: 'unexpected',
        results: [{ status: 'failed', errors: [{ message: "browserType.launch: Executable doesn't exist at /nope" }] }],
      }),
    ]);
    const { findings, coverage } = mapPlaywrightResults(report, { root, sourceDataDir: join(root, 'data'), knownIds: new Set(['widget']) });
    expect(findings).toEqual([
      { rule: 'tests-not-installed', file: 'package.json', line: 1, message: 'Chromium is not installed for Playwright. Run `npx playwright install chromium`.' },
    ]);
    expect(coverage).toEqual({});
  });

  it('zero collected tests, or a report-level error, is tests-incomplete rather than a clean pass, and marks itself as already explaining every gap', () => {
    const root = widgetFixtureRoot();
    const zero = mapPlaywrightResults({ suites: [] }, { root, sourceDataDir: join(root, 'data'), knownIds: new Set() });
    expect(zero.findings[0].rule).toBe('tests-incomplete');
    expect(zero.coverage).toEqual({});
    // Without this, one collection failure would multiply into a separate
    // reconciliation finding for every expected (component, rule) pair.
    expect(zero.explained).toBe(true);

    const withError = mapPlaywrightResults(
      { suites: [{ title: 'x', specs: [] }], errors: [{ message: 'Error: Process from config.webServer was not able to start. Exit code: 1' }] },
      { root, sourceDataDir: join(root, 'data'), knownIds: new Set() },
    );
    expect(withError.findings[0].rule).toBe('tests-incomplete');
    expect(withError.findings[0].message).toContain('webServer');
  });

  it('multi-line ContractViolation messages keep every line, not just the first', () => {
    const root = widgetFixtureRoot();
    const report = editorSuiteReport('widget', [
      spec('widget declares every part and every shipped alias', 'component-editor.contract.ts', 15, {
        status: 'unexpected',
        results: [
          {
            status: 'failed',
            errors: [
              {
                message:
                  'ContractViolation: [contract-render] widget: 2 shipped aliases reach no paint map and carry no reason:\n--widget-a\n--widget-b\n\n    at ContractHarness.fail (…)',
              },
            ],
          },
        ],
      }),
    ]);
    const { findings } = mapPlaywrightResults(report, { root, sourceDataDir: join(root, 'data'), knownIds: new Set(['widget']) });
    expect(findings[0].message).toContain('--widget-a\n--widget-b');
  });
});

describe('contractRunner: reconciling expected coverage against what actually ran', () => {
  it('marks an unexplained gap incomplete and reports it', () => {
    const { coverage, findings } = reconcileCoverage({ widget: { 'contract-listed': { status: 'passed' } } }, ['widget'], {
      expectedRules: ['contract-listed', 'contract-alias'],
    });
    expect(coverage.widget['contract-alias']).toEqual({ status: 'incomplete' });
    expect(findings).toEqual([
      { rule: 'tests-incomplete', file: 'package.json', line: 1, message: 'widget: contract-alias did not run, and nothing else for widget failed to explain why' },
    ]);
  });

  it('stays silent when a sibling rule already failed (describe.serial cascade)', () => {
    const { findings } = reconcileCoverage({ widget: { 'contract-listed': { status: 'failed' } } }, ['widget'], {
      expectedRules: ['contract-listed', 'contract-alias'],
    });
    expect(findings).toEqual([]);
  });

  it('stays silent everywhere when a global setup finding already explains the whole run', () => {
    const { findings } = reconcileCoverage({}, ['widget', 'other'], {
      expectedRules: ['contract-listed'],
      explainedGlobally: true,
    });
    expect(findings).toEqual([]);
  });
});

describe('contractRunner: mapping a Vitest registry report', () => {
  it('emits one contract-registry finding per violation, attributed by category', () => {
    const root = widgetFixtureRoot();
    const dataDir = join(root, 'data');
    mkdirSync(join(dataDir, 'component-configs/widget'), { recursive: true });
    writeFileSync(join(dataDir, 'component-configs/widget/default.json'), '{}');
    const report = {
      testResults: [
        {
          assertionResults: [
            { ancestorTitles: ['component registry contract'], title: 'selects at least one component', status: 'passed', failureMessages: [] },
            {
              ancestorTitles: ['component registry contract', 'widget'],
              title: 'meets the registry contract',
              fullName: 'component registry contract widget meets the registry contract',
              status: 'failed',
              failureMessages: [
                "AssertionError: expected [ 'default config: --widget-header-text has no seed in widget/default.json' ] to deeply equal []",
              ],
            },
          ],
        },
      ],
    };
    const { findings, coverage } = mapVitestResults(report, { root, sourceDataDir: dataDir });
    expect(findings).toEqual([
      {
        rule: 'contract-registry',
        file: 'data/component-configs/widget/default.json',
        line: 1,
        message: 'widget: default config: --widget-header-text has no seed in widget/default.json',
        context: { suite: 'vitest', title: 'component registry contract widget meets the registry contract' },
      },
    ]);
    expect(coverage.widget['contract-registry']).toEqual({ status: 'failed' });
  });

  it('routes a catalogue-level failure (no component ancestor) to tests-setup', () => {
    const report = {
      testResults: [
        {
          assertionResults: [
            {
              ancestorTitles: ['component registry contract'],
              title: 'selects at least one component',
              fullName: 'component registry contract selects at least one component',
              status: 'failed',
              failureMessages: ['AssertionError: no component is registered'],
            },
          ],
        },
      ],
    };
    const { findings } = mapVitestResults(report, { root: process.cwd(), sourceDataDir: 'data' });
    expect(findings[0].rule).toBe('tests-setup');
    expect(findings[0].file).toBe('package.json');
  });
});

describe('contractRunner: hard failures never get silenced', () => {
  it('flags the three setup rules and nothing else', () => {
    expect(hasHardFailure([{ rule: 'tests-not-installed' }])).toBe(true);
    expect(hasHardFailure([{ rule: 'tests-setup' }])).toBe(true);
    expect(hasHardFailure([{ rule: 'tests-incomplete' }])).toBe(true);
    expect(hasHardFailure([{ rule: 'contract-alias' }])).toBe(false);
  });
});

describe('coverage honors --off: disabled, not a silent pass', () => {
  it('resolveRuleSeverity answers the same question applySeverity does, for a rule with no finding to attach it to', () => {
    const rules = { 'contract-alias': 'error' };
    expect(resolveRuleSeverity('contract-alias', rules, { off: ['contract-alias'] })).toBe('off');
    expect(resolveRuleSeverity('contract-alias', rules, {})).toBe('error');
  });

  it('turns an off rule into disabled coverage regardless of its actual status', () => {
    const coverage = { toggle: { 'contract-alias': { status: 'failed' }, 'contract-render': { status: 'passed' } } };
    const out = applyCoverageSeverity(coverage, { 'contract-alias': 'error', 'contract-render': 'error' }, { off: ['contract-alias'] });
    expect(out.toggle['contract-alias']).toEqual({ status: 'disabled' });
    expect(out.toggle['contract-render']).toEqual({ status: 'passed' });
  });
});

describe('contractRunner: generated configs', () => {
  it('passes the settings module through directly — it is already the default export, not a namespace object with one', () => {
    const root = fixtureRoot();
    writeFileSync(join(root, 'live-tokens.testing.ts'), "export default { registrySetup: 'src/register.ts' };\n");
    const configDir = mkdtempSync(join(tmpdir(), 'lt-gencfg-'));
    try {
      const { playwrightConfigPath, vitestConfigPath } = writeGeneratedConfigs({ configDir, root });
      const pw = readFileSync(playwrightConfigPath, 'utf8');
      const vi = readFileSync(vitestConfigPath, 'utf8');
      expect(pw).toContain('...settingsModule,');
      expect(pw).not.toContain('.default');
      expect(vi).toContain('resolveTestingConfig(settingsModule,');
    } finally {
      rmSync(configDir, { recursive: true, force: true });
    }
  });

  it('omits the settings import entirely when there is no settings file', () => {
    const root = fixtureRoot();
    const configDir = mkdtempSync(join(tmpdir(), 'lt-gencfg-'));
    try {
      const { playwrightConfigPath } = writeGeneratedConfigs({ configDir, root });
      expect(readFileSync(playwrightConfigPath, 'utf8')).not.toContain('settingsModule');
    } finally {
      rmSync(configDir, { recursive: true, force: true });
    }
  });
});

describe('contractRunner: report reading and setup failures', () => {
  it('explains a missing report as tests-setup, with the process output', () => {
    const root = fixtureRoot();
    const result = readReportOrSetupFinding('Playwright', join(root, 'nope.json'), 1, 'stdout text', 'stderr text');
    expect(result.setupFinding.rule).toBe('tests-setup');
    expect(result.setupFinding.message).toContain('stdout text');
  });

  it('explains a malformed report as tests-setup rather than throwing', () => {
    const root = fixtureRoot();
    const reportPath = join(root, 'bad.json');
    writeFileSync(reportPath, '{ not json');
    const result = readReportOrSetupFinding('Vitest', reportPath, 0, '', '');
    expect(result.setupFinding.rule).toBe('tests-setup');
    expect(result.setupFinding.message).toContain('did not parse');
  });

  // `root` here is this repo's own root, not the fixture directory: `peerBin`
  // needs a real, installed `@playwright/test` to find, and this repo has one.
  // The fixture only supplies the (absolute) config and test file paths.
  it('a config that throws on load is tests-setup, no browser required', async () => {
    const fixture = fixtureRoot();
    const configPath = join(fixture, 'broken.config.ts');
    writeFileSync(configPath, "throw new Error('deliberately broken config');\n");
    const configDir = mkdtempSync(join(tmpdir(), 'lt-badcfg-'));
    try {
      const result = await runPlaywrightSuite({ root: process.cwd(), configDir, playwrightConfigPath: configPath });
      expect(result.setupFinding.rule).toBe('tests-setup');
      expect(result.setupFinding.message).toContain('deliberately broken config');
    } finally {
      rmSync(configDir, { recursive: true, force: true });
    }
  }, 30_000);

  it('a webServer that fails to start collects zero tests, mapped as tests-incomplete', async () => {
    const fixture = fixtureRoot();
    mkdirSync(join(fixture, 'tests'), { recursive: true });
    writeFileSync(join(fixture, 'tests/dummy.spec.ts'), "import { test, expect } from '@playwright/test';\ntest('noop', () => expect(1).toBe(1));\n");
    writeFileSync(
      join(fixture, 'server.config.ts'),
      "export default { testDir: './tests', webServer: { command: 'node -e \"process.exit(1)\"', url: 'http://127.0.0.1:59321', reuseExistingServer: false, timeout: 5000 } };\n",
    );
    const configDir = mkdtempSync(join(tmpdir(), 'lt-badsrv-'));
    try {
      const result = await runPlaywrightSuite({ root: process.cwd(), configDir, playwrightConfigPath: join(fixture, 'server.config.ts') });
      expect(result.report.errors[0].message).toContain('webServer');
      const mapped = mapPlaywrightResults(result.report, { root: process.cwd(), sourceDataDir: join(fixture, 'data'), knownIds: new Set() });
      expect(mapped.findings[0].rule).toBe('tests-incomplete');
    } finally {
      rmSync(configDir, { recursive: true, force: true });
    }
  }, 30_000);
});

describe('contractRunner: runContractTests, end to end', () => {
  it('is an error, not a silent skip, when a required tool is missing', async () => {
    const root = fixtureRoot();
    const result = await runContractTests('toggle', { root });
    expect(result.findings.map((f: { rule: string }) => f.rule)).toEqual([
      'tests-not-installed',
      'tests-not-installed',
      'tests-not-installed',
    ]);
    expect(result.coverage).toEqual({});
  });

  it('reports nothing to test rather than guessing, for omitted-id batch discovery over an empty project', async () => {
    const root = fixtureRoot();
    for (const pkg of ['@playwright/test', 'vitest', 'happy-dom']) {
      mkdirSync(join(root, 'node_modules', pkg), { recursive: true });
    }
    const result = await runContractTests(undefined, { root });
    expect(result.findings).toEqual([
      {
        rule: 'tests-setup',
        file: 'package.json',
        line: 1,
        message: 'no component authored under src/system/components yet; nothing for --tests to run',
      },
    ]);
  });

  it('a bad root (no data directory to isolate) is tests-setup, not a raw crash', async () => {
    const root = fixtureRoot();
    for (const pkg of ['@playwright/test', 'vitest', 'happy-dom']) {
      mkdirSync(join(root, 'node_modules', pkg), { recursive: true });
    }
    write(root, 'widget', BARE_FONT('widget'));
    const result = await runContractTests('widget', { root });
    expect(result.findings).toEqual([
      expect.objectContaining({ rule: 'tests-setup' }),
    ]);
  });

  // The two tests below are the genuine round trip: real subprocess, real
  // browser, real dev server, against this repo's own real data — this repo
  // is its own consumer. Guarded on Chromium actually being installed, since
  // `npm test` runs before CI installs it (`.github/workflows/*.yml` run
  // `npx playwright install` after the unit suite); skipping rather than
  // failing keeps a clean-runner `npm test` green while still exercising the
  // real path wherever a browser is already present, such as here. A
  // from-scratch fixture project able to boot its own dev server belongs to
  // Wave 5a's consumer acceptance gate.
  it.skipIf(!hasChromium)('passes clean for a real shipped component, here, with the real tools', async () => {
    const result = await runContractTests('toggle', { root: process.cwd() });
    expect(result.findings).toEqual([]);
    expect(result.coverage.toggle).toEqual({
      'contract-registry': { status: 'passed' },
      'contract-listed': { status: 'passed' },
      'contract-alias': { status: 'passed' },
      'contract-preview': { status: 'passed' },
      'contract-persist': { status: 'passed' },
      'contract-theme': { status: 'passed' },
      'contract-sketch': { status: 'passed' },
      'contract-render': { status: 'passed' },
    });
  }, 60_000);

  it.skipIf(!hasChromium)('a broken shipped alias produces one contract-alias finding with a real line, and cascade skips read as incomplete, not silently missing', async () => {
    const configPath = join(process.cwd(), 'src/live-tokens/data/component-configs/toggle/default.json');
    const original = readFileSync(configPath, 'utf8');
    const data = JSON.parse(original);
    data.aliases['--toggle-track-surface'] = '--nonexistent-token-xyz';
    writeFileSync(configPath, JSON.stringify(data, null, 2));
    try {
      const result = await runContractTests('toggle', { root: process.cwd() });
      expect(result.findings).toHaveLength(1);
      expect(result.findings[0]).toEqual(
        expect.objectContaining({
          rule: 'contract-alias',
          file: 'src/live-tokens/data/component-configs/toggle/default.json',
          line: 7,
        }),
      );
      for (const rule of ['contract-preview', 'contract-persist', 'contract-theme', 'contract-sketch']) {
        expect(result.coverage.toggle[rule]).toEqual({ status: 'incomplete' });
      }
    } finally {
      writeFileSync(configPath, original);
      rmSync(join(process.cwd(), 'test-results'), { recursive: true, force: true });
    }
  }, 60_000);
});
