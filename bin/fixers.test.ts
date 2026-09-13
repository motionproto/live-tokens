import { describe, it, expect, afterEach } from 'vitest';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
// @ts-expect-error — plain .mjs module, no types
import { applyFixes } from './lib/fixers.mjs';
// @ts-expect-error — plain .mjs module, no types
import { PAGE_RULES, checkPages } from './check-page.mjs';
// @ts-expect-error — plain .mjs module, no types
import { COMPONENT_RULES, checkComponent } from './check-component.mjs';
// @ts-expect-error — plain .mjs module, no types
import { applySeverity, parseCheckFlags } from './lib/findings.mjs';

const roots: string[] = [];
function fixtureRoot(): string {
  const dir = mkdtempSync(join(tmpdir(), 'lt-fix-'));
  roots.push(dir);
  return dir;
}
afterEach(() => {
  while (roots.length) rmSync(roots.pop()!, { recursive: true, force: true });
});

function finding(file: string, line: number, rule: string, patch: { from: string; to: string }, repair = 'auto') {
  return { rule, file, line, message: rule, repair, details: { patch } };
}

describe('parseCheckFlags', () => {
  it('recognizes --fix', () => {
    expect(parseCheckFlags(['--fix']).fix).toBe(true);
    expect(parseCheckFlags([]).fix).toBe(false);
  });
});

describe('applyFixes', () => {
  it('writes a patch and reports it applied', () => {
    const root = fixtureRoot();
    writeFileSync(join(root, 'a.txt'), 'padding: 8px;\n');
    const { applied, skipped } = applyFixes([finding('a.txt', 1, 'dimension-literal', { from: '8px', to: 'var(--space-8)' })], root);
    expect(readFileSync(join(root, 'a.txt'), 'utf8')).toBe('padding: var(--space-8);\n');
    expect(applied).toHaveLength(1);
    expect(skipped).toHaveLength(0);
  });

  it('applies every patch for one file in a single write', () => {
    const root = fixtureRoot();
    writeFileSync(join(root, 'a.txt'), 'a: 8px;\nb: 16px;\n');
    const { applied } = applyFixes(
      [
        finding('a.txt', 1, 'dimension-literal', { from: '8px', to: 'var(--space-8)' }),
        finding('a.txt', 2, 'dimension-literal', { from: '16px', to: 'var(--space-16)' }),
      ],
      root,
    );
    expect(readFileSync(join(root, 'a.txt'), 'utf8')).toBe('a: var(--space-8);\nb: var(--space-16);\n');
    expect(applied).toHaveLength(2);
  });

  it('applies at the first occurrence at or after the finding line, never an earlier one', () => {
    const root = fixtureRoot();
    writeFileSync(join(root, 'a.txt'), 'x: 8px;\ny: 8px;\n');
    applyFixes([finding('a.txt', 2, 'dimension-literal', { from: '8px', to: 'var(--space-8)' })], root);
    expect(readFileSync(join(root, 'a.txt'), 'utf8')).toBe('x: 8px;\ny: var(--space-8);\n');
  });

  it('skips a patch whose `from` is no longer there, and leaves the file untouched', () => {
    const root = fixtureRoot();
    writeFileSync(join(root, 'a.txt'), 'padding: 16px;\n');
    const { applied, skipped } = applyFixes([finding('a.txt', 1, 'dimension-literal', { from: '8px', to: 'var(--space-8)' })], root);
    expect(readFileSync(join(root, 'a.txt'), 'utf8')).toBe('padding: 16px;\n');
    expect(applied).toHaveLength(0);
    expect(skipped).toHaveLength(1);
  });

  it('never touches a finding whose repair is not auto, even with a patch present', () => {
    const root = fixtureRoot();
    writeFileSync(join(root, 'a.txt'), 'padding: 14px;\n');
    const { applied, skipped } = applyFixes(
      [finding('a.txt', 1, 'dimension-literal', { from: '14px', to: 'var(--space-12)' }, 'choice')],
      root,
    );
    expect(readFileSync(join(root, 'a.txt'), 'utf8')).toBe('padding: 14px;\n');
    expect(applied).toHaveLength(0);
    expect(skipped).toHaveLength(0);
  });

  it('reports a file it cannot find as every one of its findings skipped', () => {
    const root = fixtureRoot();
    const { applied, skipped } = applyFixes([finding('gone.txt', 1, 'dimension-literal', { from: '8px', to: 'var(--space-8)' })], root);
    expect(applied).toHaveLength(0);
    expect(skipped).toHaveLength(1);
  });
});

function pageRoot(tokensCss: string): string {
  const root = fixtureRoot();
  mkdirSync(join(root, 'src/system/styles'), { recursive: true });
  mkdirSync(join(root, 'src/pages'), { recursive: true });
  writeFileSync(join(root, 'src/system/styles/tokens.css'), tokensCss);
  return root;
}

const SPACE_TOKENS = `:root {
  --surface-neutral: #111;
  --text-primary: #eee;
  --space-8: 0.5rem;
  --space-12: 0.75rem;
  --space-16: 1rem;
  --card-default-radius: 0.25rem;
}`;

function checkAndFix(root: string, files: string[]) {
  const { findings } = checkPages(files, { root });
  const resolved = applySeverity(findings, PAGE_RULES, {}, {});
  return { resolved, ...applyFixes(resolved, root) };
}

describe('check-page --fix, per rule', () => {
  it('dimension-literal: rewrites the one unique literal, and a second pass is a no-op', () => {
    const root = pageRoot(SPACE_TOKENS);
    const rel = 'src/pages/Detail.svelte';
    writeFileSync(join(root, rel), `<style>.a { padding: 8px; }</style>`);
    const { applied } = checkAndFix(root, [rel]);
    expect(applied).toHaveLength(1);
    const fixed = readFileSync(join(root, rel), 'utf8');
    expect(fixed).toBe(`<style>.a { padding: var(--space-8); }</style>`);

    const second = checkAndFix(root, [rel]);
    expect(second.applied).toHaveLength(0);
    expect(readFileSync(join(root, rel), 'utf8')).toBe(fixed);
  });

  it('dimension-literal: leaves a tie for a person, reported as choice', () => {
    const root = pageRoot(SPACE_TOKENS);
    const rel = 'src/pages/Detail.svelte';
    const source = `<style>.a { padding: 14px; }</style>`;
    writeFileSync(join(root, rel), source);
    const { resolved, applied } = checkAndFix(root, [rel]);
    expect(applied).toHaveLength(0);
    expect(readFileSync(join(root, rel), 'utf8')).toBe(source);
    const f = resolved.find((x: { rule: string }) => x.rule === 'dimension-literal');
    expect(f.repair).toBe('choice');
    expect(f.details.patch).toBeUndefined();
  });

  it('dimension-literal: a shorthand with one unresolvable term stays a choice for the whole declaration', () => {
    const root = pageRoot(SPACE_TOKENS);
    const rel = 'src/pages/Detail.svelte';
    // 8px is unique (--space-8); 14px ties --space-12/--space-16. One
    // ambiguous term makes the whole shorthand a choice, per resolveGeometryLiteral.
    const source = `<style>.a { padding: 8px 14px; }</style>`;
    writeFileSync(join(root, rel), source);
    const { resolved, applied } = checkAndFix(root, [rel]);
    expect(applied).toHaveLength(0);
    expect(readFileSync(join(root, rel), 'utf8')).toBe(source);
    const f = resolved.find((x: { rule: string }) => x.rule === 'dimension-literal');
    expect(f.repair).toBe('choice');
    expect(f.details.patch).toBeUndefined();
  });

  it('control-size: deletes the size attribute, and a second pass is a no-op', () => {
    const root = pageRoot(SPACE_TOKENS);
    // control-size only fires for a shipped-origin component, so this uses the real Card.
    const rel = 'src/pages/Detail.svelte';
    const source = `<script>\n  import Card from "@motion-proto/live-tokens/components/Card.svelte";\n</script>\n<Card size="small" />`;
    writeFileSync(join(root, rel), source);
    const { applied } = checkAndFix(root, [rel]);
    expect(applied.some((f: { rule: string }) => f.rule === 'control-size')).toBe(true);
    const fixed = readFileSync(join(root, rel), 'utf8');
    expect(fixed).toBe(`<script>\n  import Card from "@motion-proto/live-tokens/components/Card.svelte";\n</script>\n<Card />`);

    const second = checkAndFix(root, [rel]);
    expect(second.applied.some((f: { rule: string }) => f.rule === 'control-size')).toBe(false);
    expect(readFileSync(join(root, rel), 'utf8')).toBe(fixed);
  });

  it('property-override: deletes a declaration in place, and a second pass is a no-op', () => {
    const root = pageRoot(SPACE_TOKENS);
    const rel = 'src/pages/Detail.svelte';
    writeFileSync(join(root, rel), `<style>.a { --card-default-radius: 0; }</style>`);
    const { applied } = checkAndFix(root, [rel]);
    expect(applied.some((f: { rule: string }) => f.rule === 'property-override')).toBe(true);
    const fixed = readFileSync(join(root, rel), 'utf8');
    expect(fixed).toBe(`<style>.a {  }</style>`);

    const second = checkAndFix(root, [rel]);
    expect(second.applied.some((f: { rule: string }) => f.rule === 'property-override')).toBe(false);
    expect(readFileSync(join(root, rel), 'utf8')).toBe(fixed);
  });

  it('property-override: a declaration with no terminating semicolon is left untouched, not deleted into the next rule', () => {
    const root = pageRoot(SPACE_TOKENS);
    const rel = 'src/pages/Detail.svelte';
    const source = `<style>.a { --card-default-radius: 0 }\n  .b { display: block; }</style>`;
    writeFileSync(join(root, rel), source);
    const { resolved, applied } = checkAndFix(root, [rel]);
    expect(applied).toHaveLength(0);
    expect(readFileSync(join(root, rel), 'utf8')).toBe(source);
    const f = resolved.find((x: { rule: string }) => x.rule === 'property-override');
    expect(f.repair).toBe('choice');
    expect(f.details.patch).toBeUndefined();
  });

  it('property-override: deletes a style:--x directive in place', () => {
    const root = pageRoot(SPACE_TOKENS);
    const rel = 'src/pages/Detail.svelte';
    writeFileSync(join(root, rel), `<div style:--card-default-radius="0"></div>`);
    const { applied } = checkAndFix(root, [rel]);
    expect(applied.some((f: { rule: string }) => f.rule === 'property-override')).toBe(true);
    expect(readFileSync(join(root, rel), 'utf8')).toBe(`<div></div>`);
  });

  it('property-override: a setProperty override stays authored, untouched by --fix', () => {
    const root = pageRoot(SPACE_TOKENS);
    const rel = 'src/pages/Detail.svelte';
    const source = `<script>\n  el.style.setProperty("--card-default-radius", "0");\n</script>`;
    writeFileSync(join(root, rel), source);
    const { resolved, applied } = checkAndFix(root, [rel]);
    expect(applied).toHaveLength(0);
    expect(readFileSync(join(root, rel), 'utf8')).toBe(source);
    const f = resolved.find((x: { rule: string }) => x.rule === 'property-override');
    expect(f.repair).toBe('authored');
    expect(f.details.patch).toBeUndefined();
  });

  it('deep-import: rewrites a component specifier to its public path, and a second pass is a no-op', () => {
    const root = pageRoot(SPACE_TOKENS);
    const rel = 'src/pages/Detail.svelte';
    writeFileSync(join(root, rel), `<script>\n  import Card from "@motion-proto/live-tokens/src/system/components/Card.svelte";\n</script>`);
    const { applied } = checkAndFix(root, [rel]);
    expect(applied.some((f: { rule: string }) => f.rule === 'deep-import')).toBe(true);
    const fixed = readFileSync(join(root, rel), 'utf8');
    expect(fixed).toBe(`<script>\n  import Card from "@motion-proto/live-tokens/components/Card.svelte";\n</script>`);

    const second = checkAndFix(root, [rel]);
    expect(second.applied).toHaveLength(0);
    expect(readFileSync(join(root, rel), 'utf8')).toBe(fixed);
  });

  it('deep-import: outside the components subpath, left as a choice with no rewrite', () => {
    const root = pageRoot(SPACE_TOKENS);
    const rel = 'src/pages/Detail.svelte';
    const source = `<script>\n  import { x } from "@motion-proto/live-tokens/src/editor/core/state";\n</script>`;
    writeFileSync(join(root, rel), source);
    const { resolved, applied } = checkAndFix(root, [rel]);
    expect(applied).toHaveLength(0);
    expect(readFileSync(join(root, rel), 'utf8')).toBe(source);
    const f = resolved.find((x: { rule: string }) => x.rule === 'deep-import');
    expect(f.repair).toBe('choice');
    expect(f.details.patch).toBeUndefined();
  });
});

describe('check-component --fix', () => {
  it('dimension-literal on a runtime default: rewrites the literal, and a second pass is a no-op', () => {
    const root = fixtureRoot();
    mkdirSync(join(root, 'src/system/components'), { recursive: true });
    mkdirSync(join(root, 'src/system/styles'), { recursive: true });
    writeFileSync(join(root, 'src/system/styles/tokens.css'), ':root { --surface-neutral: #111; --radius-md: 0.5rem; }');
    writeFileSync(
      join(root, 'src/system/components/Widget.svelte'),
      `<!-- Widget.svelte — a dial. -->\n<style>:global(:root){\n--widget-radius: 4px;\n}</style>`,
    );
    writeFileSync(
      join(root, 'src/system/components/WidgetEditor.svelte'),
      `<script module lang="ts">\n  const component = 'widget';\n  export const allTokens = [];\n</script>`,
    );
    writeFileSync(join(root, 'src/main.ts'), `registerComponent({ id: 'widget', label: 'Widget' });`);

    const runFix = () => {
      const { findings } = checkComponent('widget', root);
      const resolved = applySeverity(findings, COMPONENT_RULES, {}, {});
      return { resolved, ...applyFixes(resolved, root) };
    };
    const { applied } = runFix();
    expect(applied.some((f: { rule: string }) => f.rule === 'dimension-literal')).toBe(true);
    const fixed = readFileSync(join(root, 'src/system/components/Widget.svelte'), 'utf8');
    expect(fixed).toContain('--widget-radius: var(--radius-md);');

    const second = runFix();
    expect(second.applied).toHaveLength(0);
    expect(readFileSync(join(root, 'src/system/components/Widget.svelte'), 'utf8')).toBe(fixed);
  });
});

describe('--fix through the CLI', () => {
  const cli = join(process.cwd(), 'bin/cli.mjs');

  it('applies a fix, reports it, and exits 0', () => {
    const root = pageRoot(SPACE_TOKENS);
    const rel = 'src/pages/Detail.svelte';
    writeFileSync(join(root, rel), `<style>.a { padding: 8px; }</style>`);
    const out = execFileSync('node', [cli, 'check-page', rel, '--fix'], { cwd: root }).toString();
    expect(out).toContain('1 patch(es) applied');
    expect(readFileSync(join(root, rel), 'utf8')).toBe(`<style>.a { padding: var(--space-8); }</style>`);
  });

  it('refuses --fix together with --tests', () => {
    const root = pageRoot(SPACE_TOKENS);
    expect(() => execFileSync('node', [cli, 'check-page', '--fix', '--tests'], { cwd: root, stdio: 'pipe' })).toThrow();
    try {
      execFileSync('node', [cli, 'check-component', '--fix', '--tests'], { cwd: root, stdio: 'pipe' });
    } catch (err) {
      expect(String((err as { stderr: Buffer }).stderr)).toContain('--fix cannot run with --tests');
    }
  });
});

describe('invariant 5: --fix touches only the file a finding names', () => {
  it('leaves tokens.css and the data tree byte-identical while it fixes a page', () => {
    const root = pageRoot(SPACE_TOKENS);
    const tokensCssPath = join(root, 'src/system/styles/tokens.css');
    const beforeTokensCss = readFileSync(tokensCssPath, 'utf8');
    const dataDir = join(root, 'src/live-tokens/data');
    mkdirSync(join(dataDir, 'themes'), { recursive: true });
    writeFileSync(join(dataDir, 'themes/_active.json'), '{"marker":true}');
    const beforeData = readFileSync(join(dataDir, 'themes/_active.json'), 'utf8');

    const rel = 'src/pages/Detail.svelte';
    writeFileSync(join(root, rel), `<style>.a { padding: 8px; }</style>`);
    const { applied } = checkAndFix(root, [rel]);
    expect(applied).toHaveLength(1);

    expect(readFileSync(tokensCssPath, 'utf8')).toBe(beforeTokensCss);
    expect(readFileSync(join(dataDir, 'themes/_active.json'), 'utf8')).toBe(beforeData);
  });
});
