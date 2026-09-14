import { describe, it, expect, afterEach } from 'vitest';
import { execFileSync, spawnSync } from 'node:child_process';
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
  it('recognizes --no-fix', () => {
    expect(parseCheckFlags(['--no-fix']).noFix).toBe(true);
    expect(parseCheckFlags([]).noFix).toBe(false);
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

const CARD_IMPORT = `<script>\n  import Card from "@motion-proto/live-tokens/components/Card.svelte";\n</script>\n`;

function checkAndFix(root: string, files: string[]) {
  const { findings } = checkPages(files, { root });
  const resolved = applySeverity(findings, PAGE_RULES, {}, {});
  return { resolved, ...applyFixes(resolved, root) };
}

describe('check-page fixes, per rule', () => {
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

  it('dimension-literal: a var() fallback beside the literal leaves the declaration a choice, with no patch', () => {
    const root = pageRoot(SPACE_TOKENS);
    const rel = 'src/pages/Detail.svelte';
    const source = `<style>.a { padding: var(--space-8, 4px) 16px; }</style>`;
    writeFileSync(join(root, rel), source);
    const { resolved, applied } = checkAndFix(root, [rel]);
    expect(applied).toHaveLength(0);
    expect(readFileSync(join(root, rel), 'utf8')).toBe(source);
    const f = resolved.find((x: { rule: string }) => x.rule === 'dimension-literal');
    expect(f.repair).toBe('choice');
    expect(f.details.patch).toBeUndefined();
  });

  it('dimension-literal: lands on the flagged declaration, never an earlier namesake literal on an unflagged property', () => {
    const root = pageRoot(SPACE_TOKENS);
    const rel = 'src/pages/Detail.svelte';
    writeFileSync(
      join(root, rel),
      `<div style="width: 8px; padding: 8px"></div>\n<style>.a { width: 8px; padding: 8px; }</style>`,
    );
    const { resolved, applied } = checkAndFix(root, [rel]);
    expect(resolved.filter((x: { rule: string }) => x.rule === 'dimension-literal')).toHaveLength(2);
    expect(applied).toHaveLength(2);
    const fixed = readFileSync(join(root, rel), 'utf8');
    expect(fixed).toBe(
      `<div style="width: 8px; padding: var(--space-8)"></div>\n<style>.a { width: 8px; padding: var(--space-8); }</style>`,
    );

    const second = checkAndFix(root, [rel]);
    expect(second.resolved.filter((x: { rule: string }) => x.rule === 'dimension-literal')).toHaveLength(0);
    expect(second.applied).toHaveLength(0);
    expect(readFileSync(join(root, rel), 'utf8')).toBe(fixed);
  });

  it('dimension-literal: rewrites a style: directive in place, and a second pass is a no-op', () => {
    const root = pageRoot(SPACE_TOKENS);
    const rel = 'src/pages/Detail.svelte';
    writeFileSync(join(root, rel), `<div style:width="8px" style:padding="8px"></div>`);
    const { applied } = checkAndFix(root, [rel]);
    expect(applied).toHaveLength(1);
    expect(applied[0].details.patch).toEqual({ from: 'style:padding="8px"', to: 'style:padding="var(--space-8)"' });
    const fixed = readFileSync(join(root, rel), 'utf8');
    expect(fixed).toBe(`<div style:width="8px" style:padding="var(--space-8)"></div>`);

    const second = checkAndFix(root, [rel]);
    expect(second.applied).toHaveLength(0);
    expect(readFileSync(join(root, rel), 'utf8')).toBe(fixed);
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

  it('control-size: an attribute a newline precedes keeps that newline, so no later finding shifts a line', () => {
    const root = pageRoot(SPACE_TOKENS);
    const rel = 'src/pages/Detail.svelte';
    const head = `<script>\n  import Card from "@motion-proto/live-tokens/components/Card.svelte";\n</script>\n`;
    writeFileSync(join(root, rel), `${head}<Card class="x"\nsize="small"\n/>`);
    const { resolved, applied } = checkAndFix(root, [rel]);
    expect(applied.some((f: { rule: string }) => f.rule === 'control-size')).toBe(true);
    const f = resolved.find((x: { rule: string }) => x.rule === 'control-size');
    expect(f.details.patch).toEqual({ from: 'size="small"', to: '' });
    expect(readFileSync(join(root, rel), 'utf8')).toBe(`${head}<Card class="x"\n\n/>`);
  });

  it('control-size: an expression value spanning lines is left untouched, reported as choice', () => {
    const root = pageRoot(SPACE_TOKENS);
    const rel = 'src/pages/Detail.svelte';
    const source = `${CARD_IMPORT}<Card\n  size={\n    big\n  }\n/>`;
    writeFileSync(join(root, rel), source);
    const { resolved, applied } = checkAndFix(root, [rel]);
    expect(applied).toHaveLength(0);
    expect(readFileSync(join(root, rel), 'utf8')).toBe(source);
    const f = resolved.find((x: { rule: string }) => x.rule === 'control-size');
    expect(f.repair).toBe('choice');
    expect(f.details.patch).toBeUndefined();
  });

  it('control-size: a value on the next line is left untouched, never cut down to an orphan', () => {
    const root = pageRoot(SPACE_TOKENS);
    const rel = 'src/pages/Detail.svelte';
    const source = `${CARD_IMPORT}<Card size=\n"small" />`;
    writeFileSync(join(root, rel), source);
    const { resolved, applied } = checkAndFix(root, [rel]);
    expect(applied.some((f: { rule: string }) => f.rule === 'control-size')).toBe(false);
    expect(readFileSync(join(root, rel), 'utf8')).toBe(source);
    const f = resolved.find((x: { rule: string }) => x.rule === 'control-size');
    expect(f.repair).toBe('choice');
    expect(f.details.patch).toBeUndefined();
  });

  it('control-size: spaces around the equals sign read as one attribute, as Svelte does, and delete whole', () => {
    const root = pageRoot(SPACE_TOKENS);
    const rel = 'src/pages/Detail.svelte';
    const source = `${CARD_IMPORT}<Card size = "small" />`;
    writeFileSync(join(root, rel), source);
    const { resolved, applied } = checkAndFix(root, [rel]);
    expect(applied.some((f: { rule: string }) => f.rule === 'control-size')).toBe(true);
    const f = resolved.find((x: { rule: string }) => x.rule === 'control-size');
    expect(f.message).toContain('size="small"'); // parses the spaced `=` to the value, not a stray attribute
    expect(f.details.patch).toEqual({ from: ' size = "small"', to: '' });
    expect(readFileSync(join(root, rel), 'utf8')).toBe(`${CARD_IMPORT}<Card />`);
  });

  it('control-size: an attribute with nothing but a newline before it still deletes whole, keeping that newline', () => {
    const root = pageRoot(SPACE_TOKENS);
    const rel = 'src/pages/Detail.svelte';
    const source = `${CARD_IMPORT}<Card\nsize="small"\n/>`;
    writeFileSync(join(root, rel), source);
    const { resolved, applied } = checkAndFix(root, [rel]);
    expect(applied.some((f: { rule: string }) => f.rule === 'control-size')).toBe(true);
    const f = resolved.find((x: { rule: string }) => x.rule === 'control-size');
    expect(f.details.patch).toEqual({ from: 'size="small"', to: '' });
    expect(readFileSync(join(root, rel), 'utf8')).toBe(`${CARD_IMPORT}<Card\n\n/>`);
  });

  it('dimension-literal: lands on its own line while an unfixable control-size sits above it', () => {
    const root = pageRoot(SPACE_TOKENS);
    const rel = 'src/pages/Detail.svelte';
    const head = `${CARD_IMPORT}<Card\n  size={\n    big\n  }\n/>\n`;
    writeFileSync(join(root, rel), `${head}<style>.a { padding: 8px; }</style>\n<p>docs say padding: 8px here</p>\n`);
    checkAndFix(root, [rel]);
    expect(readFileSync(join(root, rel), 'utf8')).toBe(
      `${head}<style>.a { padding: var(--space-8); }</style>\n<p>docs say padding: 8px here</p>\n`,
    );
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

  it('property-override: a value holding a comment with a `;` inside is left untouched, reported as choice', () => {
    const root = pageRoot(SPACE_TOKENS);
    const rel = 'src/pages/Detail.svelte';
    const source = `<style>.a { --card-default-radius: 0 /* was 4px; */; color: red; }</style>`;
    writeFileSync(join(root, rel), source);
    const { resolved, applied } = checkAndFix(root, [rel]);
    expect(applied).toHaveLength(0);
    expect(readFileSync(join(root, rel), 'utf8')).toBe(source);
    const f = resolved.find((x: { rule: string }) => x.rule === 'property-override');
    expect(f.repair).toBe('choice');
    expect(f.details.patch).toBeUndefined();
  });

  it('property-override: a semicolon-less declaration never reaches a later namesake or a string literal', () => {
    const root = pageRoot(SPACE_TOKENS);
    const rel = 'src/pages/Detail.svelte';
    const source = `<style>.a { --card-default-radius: 0 }\n  .b { --card-default-radius: 4px; }</style>\n<script>\n  const css = "--card-default-radius: 8px;";\n</script>`;
    writeFileSync(join(root, rel), source);
    const { resolved, applied } = checkAndFix(root, [rel]);
    expect(applied).toHaveLength(0);
    expect(readFileSync(join(root, rel), 'utf8')).toBe(source);
    const f = resolved.find((x: { rule: string }) => x.rule === 'property-override');
    expect(f.repair).toBe('choice');
    expect(f.details.patch).toBeUndefined();
  });

  it('property-override: a directive whose value is an expression is left untouched, never cut to a later namesake', () => {
    const root = pageRoot(SPACE_TOKENS);
    const rel = 'src/pages/Detail.svelte';
    const source = `<div style:--card-default-radius={r}>x</div>\n<span style:--card-default-radius="0.25rem">y</span>`;
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

  it('property-override: a directive whose quoted value runs over a line is left untouched', () => {
    const root = pageRoot(SPACE_TOKENS);
    const rel = 'src/pages/Detail.svelte';
    const source = `<div\n  style:--card-default-radius="0 0\n  0 0"\n>x</div>\n<style>.a { padding: 8px; }</style>\n`;
    writeFileSync(join(root, rel), source);
    const { resolved, applied } = checkAndFix(root, [rel]);
    expect(applied.some((f: { rule: string }) => f.rule === 'property-override')).toBe(false);
    const f = resolved.find((x: { rule: string }) => x.rule === 'property-override');
    expect(f.repair).toBe('choice');
    expect(f.details.patch).toBeUndefined();
    expect(readFileSync(join(root, rel), 'utf8')).toBe(
      `<div\n  style:--card-default-radius="0 0\n  0 0"\n>x</div>\n<style>.a { padding: var(--space-8); }</style>\n`,
    );
  });

  it('property-override: a declaration wrapped onto a second line is left untouched, and a later finding lands at its own site', () => {
    const root = pageRoot(SPACE_TOKENS);
    const rel = 'src/pages/Detail.svelte';
    const source = `<style>\n.a {\n  --card-default-radius:\n    0.5rem;\n}\n.b { padding: 8px; }\n</style>\n<p>the docs say padding: 8px in prose</p>`;
    writeFileSync(join(root, rel), source);
    const { resolved, applied } = checkAndFix(root, [rel]);
    const f = resolved.find((x: { rule: string }) => x.rule === 'property-override');
    expect(f.repair).toBe('choice');
    expect(f.details.patch).toBeUndefined();
    expect(applied.map((x: { rule: string }) => x.rule)).toEqual(['dimension-literal']);
    expect(readFileSync(join(root, rel), 'utf8')).toBe(
      `<style>\n.a {\n  --card-default-radius:\n    0.5rem;\n}\n.b { padding: var(--space-8); }\n</style>\n<p>the docs say padding: 8px in prose</p>`,
    );
  });

  it('property-override: a setProperty override stays authored, left unfixed', () => {
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

const RUNTIME = 'src/system/components/Widget.svelte';
const EDITOR = 'src/system/components/WidgetEditor.svelte';
const MAIN = 'src/main.ts';
const DEEP_CARD = '@motion-proto/live-tokens/src/system/components/Card.svelte';
const PUBLIC_CARD = '@motion-proto/live-tokens/components/Card.svelte';

function widgetRoot(files: { runtime: string; editor: string; main: string }): string {
  const root = fixtureRoot();
  mkdirSync(join(root, 'src/system/components'), { recursive: true });
  mkdirSync(join(root, 'src/system/styles'), { recursive: true });
  writeFileSync(join(root, 'src/system/styles/tokens.css'), ':root { --surface-neutral: #111; --radius-md: 0.5rem; }');
  writeFileSync(join(root, RUNTIME), files.runtime);
  writeFileSync(join(root, EDITOR), files.editor);
  writeFileSync(join(root, MAIN), files.main);
  return root;
}

function fixWidget(root: string) {
  const { findings } = checkComponent('widget', root);
  const resolved = applySeverity(findings, COMPONENT_RULES, {}, {});
  return { resolved, ...applyFixes(resolved, root) };
}

// The runtime's description names the deep specifier, so a deep-import patch
// recorded against the runtime would land inside this comment.
const RUNTIME_NAMING_CARD = `<!-- Widget.svelte — a dial. Not ${DEEP_CARD}. -->\n<style>:global(:root){\n--widget-radius: var(--radius-md);\n}\n.w { border-radius: var(--widget-radius); }</style>`;
const PLAIN_EDITOR = `<script module lang="ts">\n  const component = 'widget';\n  export const allTokens = [];\n</script>`;
const PLAIN_MAIN = `registerComponent({ id: 'widget', label: 'Widget' });`;

describe('check-component fixes', () => {
  it('dimension-literal on a runtime default: rewrites the literal, and a second pass is a no-op', () => {
    const root = widgetRoot({
      runtime: `<!-- Widget.svelte — a dial. -->\n<style>:global(:root){\n--widget-radius: 4px;\n}</style>`,
      editor: PLAIN_EDITOR,
      main: PLAIN_MAIN,
    });

    const { applied } = fixWidget(root);
    expect(applied.some((f: { rule: string }) => f.rule === 'dimension-literal')).toBe(true);
    const fixed = readFileSync(join(root, RUNTIME), 'utf8');
    expect(fixed).toContain('--widget-radius: var(--radius-md);');

    const second = fixWidget(root);
    expect(second.applied).toHaveLength(0);
    expect(readFileSync(join(root, RUNTIME), 'utf8')).toBe(fixed);
  });

  it('deep-import in the editor: rewrites that import in place, leaves the runtime byte-identical, and a second pass is a no-op', () => {
    const editor = `<script module lang="ts">\n  import Card from '${DEEP_CARD}';\n  const component = 'widget';\n  export const allTokens = [];\n</script>`;
    const root = widgetRoot({ runtime: RUNTIME_NAMING_CARD, editor, main: PLAIN_MAIN });

    const { resolved, applied } = fixWidget(root);
    const f = resolved.find((x: { rule: string }) => x.rule === 'deep-import');
    expect(f.file).toBe(EDITOR);
    expect(f.line).toBe(2);
    expect(f.repair).toBe('auto');
    expect(f.details.patch).toEqual({ from: DEEP_CARD, to: PUBLIC_CARD });
    expect(applied.map((x: { rule: string }) => x.rule)).toEqual(['deep-import']);
    expect(readFileSync(join(root, EDITOR), 'utf8')).toBe(editor.replace(DEEP_CARD, PUBLIC_CARD));
    expect(readFileSync(join(root, RUNTIME), 'utf8')).toBe(RUNTIME_NAMING_CARD);

    const second = fixWidget(root);
    expect(second.resolved.some((x: { rule: string }) => x.rule === 'deep-import')).toBe(false);
    expect(second.applied).toHaveLength(0);
    expect(readFileSync(join(root, EDITOR), 'utf8')).toBe(editor.replace(DEEP_CARD, PUBLIC_CARD));
    expect(readFileSync(join(root, RUNTIME), 'utf8')).toBe(RUNTIME_NAMING_CARD);
  });

  it('deep-import in the registration file: rewrites that import in place, leaves the runtime byte-identical, and a second pass is a no-op', () => {
    const main = `import Card from '${DEEP_CARD}';\n${PLAIN_MAIN}`;
    const root = widgetRoot({ runtime: RUNTIME_NAMING_CARD, editor: PLAIN_EDITOR, main });

    const { resolved, applied } = fixWidget(root);
    const f = resolved.find((x: { rule: string }) => x.rule === 'deep-import');
    expect(f.file).toBe(MAIN);
    expect(f.line).toBe(1);
    expect(f.repair).toBe('auto');
    expect(f.details.patch).toEqual({ from: DEEP_CARD, to: PUBLIC_CARD });
    expect(applied.map((x: { rule: string }) => x.rule)).toEqual(['deep-import']);
    expect(readFileSync(join(root, MAIN), 'utf8')).toBe(main.replace(DEEP_CARD, PUBLIC_CARD));
    expect(readFileSync(join(root, RUNTIME), 'utf8')).toBe(RUNTIME_NAMING_CARD);

    const second = fixWidget(root);
    expect(second.resolved.some((x: { rule: string }) => x.rule === 'deep-import')).toBe(false);
    expect(second.applied).toHaveLength(0);
    expect(readFileSync(join(root, MAIN), 'utf8')).toBe(main.replace(DEEP_CARD, PUBLIC_CARD));
    expect(readFileSync(join(root, RUNTIME), 'utf8')).toBe(RUNTIME_NAMING_CARD);
  });
});

describe('fixing through the CLI', () => {
  const cli = join(process.cwd(), 'bin/cli.mjs');
  const rel = 'src/pages/Detail.svelte';
  const literal = `<style>.a { padding: 8px; }</style>`;
  const fixed = `<style>.a { padding: var(--space-8); }</style>`;

  it('applies a fix, reports it, and exits 0', () => {
    const root = pageRoot(SPACE_TOKENS);
    writeFileSync(join(root, rel), literal);
    const out = execFileSync('node', [cli, 'check-page', rel], { cwd: root }).toString();
    expect(out).toContain('1 fix(es) applied');
    expect(out).toContain('padding: 8px → padding: var(--space-8)  [dimension-literal]  shift 0px');
    expect(readFileSync(join(root, rel), 'utf8')).toBe(fixed);
  });

  it('reports the finding and edits nothing under --no-fix', () => {
    const root = pageRoot(SPACE_TOKENS);
    writeFileSync(join(root, rel), literal);
    const report = JSON.parse(execFileSync('node', [cli, 'check-page', rel, '--no-fix', '--json'], { cwd: root }).toString());
    expect(report.fix).toBeUndefined();
    expect(report.findings.map((f: { rule: string }) => f.rule)).toContain('dimension-literal');
    expect(readFileSync(join(root, rel), 'utf8')).toBe(literal);
  });

  it('applies the fixes before --tests and returns them beside the remaining findings', () => {
    const root = pageRoot(SPACE_TOKENS);
    writeFileSync(join(root, rel), literal);
    const run = spawnSync('node', [cli, 'check-page', rel, '--tests', '--json'], { cwd: root, encoding: 'utf8' });
    expect(run.status).toBe(1);
    const report = JSON.parse(run.stdout);
    expect(report.fix.applied.map((f: { rule: string }) => f.rule)).toEqual(['dimension-literal']);
    expect(report.findings.map((f: { rule: string }) => f.rule)).toContain('tests-not-installed');
    expect(readFileSync(join(root, rel), 'utf8')).toBe(fixed);
  });
});

describe('invariant 5: a fix touches only the file a finding names', () => {
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
