import { describe, it, expect, afterEach } from 'vitest';
import { mkdtempSync, mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
// @ts-expect-error — plain .mjs module, no types
import { checkComponent } from './check-component.mjs';

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
  extractToken,
  extractViolationArray,
  findTokenLine,
  hasHardFailure,
  identifyComponent,
  mapPlaywrightResults,
  mapRegistryViolation,
  mapVitestResults,
  missingToolFindings,
  ruleForSpecTitle,
  runContractTests,
} from './contractRunner.mjs';

function widgetFixtureRoot(): string {
  const root = fixtureRoot();
  write(root, 'widget', BARE_FONT('widget'));
  return root;
}

function playwrightResult(overrides: Record<string, unknown> = {}) {
  return { status: 'passed', annotations: [], errors: [], ...overrides };
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

describe('contractRunner: rule and component identification', () => {
  it('maps every stable obligation title to its rule', () => {
    expect(ruleForSpecTitle('toggle is listed in its registry group')).toBe('contract-listed');
    expect(ruleForSpecTitle('toggle resolves every alias it paints with')).toBe('contract-alias');
    expect(ruleForSpecTitle("toggle takes the theme's values and gives them back")).toBe('contract-theme');
    expect(ruleForSpecTitle('an unrelated title')).toBeNull();
  });

  it('trusts the immediate describe title, then the leading word of the spec title, only against known ids', () => {
    const known = new Set(['toggle', 'card']);
    expect(identifyComponent(['toggle'], 'toggle is listed in its registry group', known)).toBe('toggle');
    expect(identifyComponent([], 'card repaints every property in its standardized runtime preview', known)).toBe('card');
    expect(identifyComponent([], 'component discovery covers every alias exactly once', known)).toBeNull();
    expect(identifyComponent(['some file suite'], 'every shipped component alias fans out...', known)).toBeNull();
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
    const entries = [
      {
        describeTitles: ['widget'],
        specTitle: 'widget resolves every alias it paints with',
        specFile: 'component-editor.contract.ts',
        specLine: 20,
        result: playwrightResult({
          status: 'failed',
          errors: [{ message: 'ContractViolation: [contract-alias] widget: aliases resolve to nothing at the root: --widget-header-text' }],
        }),
      },
    ];
    const { findings, coverage } = mapPlaywrightResults(entries, { root, sourceDataDir: join(root, 'data'), knownIds: new Set(['widget']) });
    expect(findings).toHaveLength(1);
    expect(findings[0].rule).toBe('contract-alias');
    expect(findings[0].message).toContain('widget:');
    expect(findings[0].context.suite).toBe('playwright');
    expect(coverage.widget['contract-alias']).toEqual({ status: 'failed' });
  });

  it('falls back to the title table for a plain expect() failure with no ContractViolation prefix', () => {
    const root = widgetFixtureRoot();
    const entries = [
      {
        describeTitles: [],
        specTitle: 'widget paints each declared property on its declared part',
        specFile: 'component-render.contract.ts',
        specLine: 682,
        result: playwrightResult({ status: 'failed', errors: [{ message: 'Error: expect(received).toBeGreaterThan(expected)' }] }),
      },
    ];
    const { findings } = mapPlaywrightResults(entries, { root, sourceDataDir: join(root, 'data'), knownIds: new Set(['widget']) });
    expect(findings[0].rule).toBe('contract-render');
  });

  it('records coverage for a pass, including an inapplicable annotation, and stays silent on a cascaded skip', () => {
    const root = widgetFixtureRoot();
    const entries = [
      {
        describeTitles: ['widget'],
        specTitle: 'widget draws every painted part in Sketch mode',
        specFile: 'component-editor.contract.ts',
        specLine: 46,
        result: playwrightResult({ status: 'passed', annotations: [{ type: 'inapplicable', description: 'no painted parts' }] }),
      },
      {
        describeTitles: ['widget'],
        specTitle: 'widget answers the pointer and the keyboard',
        specFile: 'component-editor.contract.ts',
        specLine: 30,
        result: playwrightResult({ status: 'skipped' }),
      },
    ];
    const { findings, coverage } = mapPlaywrightResults(entries, { root, sourceDataDir: join(root, 'data'), knownIds: new Set(['widget']) });
    expect(findings).toEqual([]);
    expect(coverage.widget['contract-sketch']).toEqual({ status: 'inapplicable', reason: 'no painted parts' });
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

  // This repo is its own consumer, with real Playwright/Vitest installs and a
  // real dev server, so this is the one genuine round trip: real subprocess,
  // real browser, real isolated copy. The defect fixtures (a broken alias
  // producing a `contract-alias` finding with a real line) are exercised by
  // hand per the plan's Verify step; a from-scratch fixture project able to
  // boot the dev server belongs to Wave 5a's consumer acceptance gate.
  it('passes clean for a real shipped component, here, with the real tools', async () => {
    const result = await runContractTests('toggle', { root: process.cwd() });
    expect(result.findings).toEqual([]);
    expect(result.coverage.toggle['contract-registry']).toEqual({ status: 'passed' });
  }, 60_000);
});
