import { describe, it, expect, afterEach } from 'vitest';
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
// @ts-expect-error — plain .mjs module, no types
import { PAGE_RULES, checkPages, discoverPages } from './check-page.mjs';
// @ts-expect-error — plain .mjs module, no types
import { applySeverity, countBySeverity, parseCheckFlags } from './lib/findings.mjs';

const roots: string[] = [];
function fixtureRoot(): string {
  const dir = mkdtempSync(join(tmpdir(), 'lt-page-'));
  roots.push(dir);
  mkdirSync(join(dir, 'src/system/styles'), { recursive: true });
  mkdirSync(join(dir, 'src/pages'), { recursive: true });
  writeFileSync(
    join(dir, 'src/system/styles/tokens.css'),
    `:root {
      --surface-neutral: #111;
      --text-primary: #eee;
      --space-8: 0.5rem;
      --radius-xl: 1rem;
      --columns-count: 12;
      --heading-lg-font-size: 2rem;
    }`,
  );
  return dir;
}
afterEach(() => {
  while (roots.length) rmSync(roots.pop()!, { recursive: true, force: true });
});

function page(root: string, name: string, body: string): string {
  const rel = `src/pages/${name}`;
  writeFileSync(join(root, rel), body);
  return rel;
}

function rulesFor(root: string, rel: string): string[] {
  const { findings } = checkPages([rel], { root });
  return findings.map((f: { rule: string }) => f.rule);
}

describe('check-page component rules', () => {
  it('accepts a catalogue component and rejects one that does not exist', () => {
    const root = fixtureRoot();
    const ok = page(root, 'Ok.svelte', `<script>
      import Card from '@motion-proto/live-tokens/components/Card.svelte';
    </script>`);
    const bad = page(root, 'Bad.svelte', `<script>
      import Sparkle from '@motion-proto/live-tokens/components/Sparkle.svelte';
    </script>`);
    expect(rulesFor(root, ok)).not.toContain('unknown-component');
    expect(rulesFor(root, bad)).toContain('unknown-component');
  });

  it('flags a deep import into package internals', () => {
    const root = fixtureRoot();
    const rel = page(root, 'Deep.svelte', `<script>
      import x from '@motion-proto/live-tokens/src/editor/core/store/editorStore';
    </script>`);
    expect(rulesFor(root, rel)).toContain('deep-import');
  });

  it('flags a route inside the reserved namespace', () => {
    const root = fixtureRoot();
    const rel = page(root, 'Routes.svelte', `<script>
      const pages = { '/live-tokens/mine': { lazy: () => import('./x.svelte'), source: 'src/x.svelte' } };
    </script>`);
    expect(rulesFor(root, rel)).toContain('reserved-route');
  });

  it('flags a route entry with no source, and accepts one with it', () => {
    const root = fixtureRoot();
    const missing = page(root, 'NoSource.svelte', `<script>
      const pages = { '/a': { lazy: () => import('./a.svelte'), label: 'A' } };
    </script>`);
    const present = page(root, 'WithSource.svelte', `<script>
      const pages = { '/a': { lazy: () => import('./a.svelte'), source: 'src/a.svelte' } };
    </script>`);
    expect(rulesFor(root, missing)).toContain('missing-source');
    expect(rulesFor(root, present)).not.toContain('missing-source');
  });
});

describe('check-page token rules', () => {
  it('accepts theme tokens and rejects a name that resolves to nothing', () => {
    const root = fixtureRoot();
    const rel = page(root, 'Tokens.svelte', `<style>
      .a { color: var(--text-primary); }
      .b { color: var(--text-imaginary); }
    </style>`);
    const { findings } = checkPages([rel], { root });
    expect(findings.filter((f: { rule: string }) => f.rule === 'unknown-token')).toHaveLength(1);
    expect(findings[0].message).toContain('--text-imaginary');
  });

  it('accepts a custom property the page declares itself', () => {
    const root = fixtureRoot();
    const rel = page(root, 'Local.svelte', `<style>
      .a { --my-local: 4px; gap: var(--my-local); }
    </style>`);
    expect(rulesFor(root, rel)).not.toContain('unknown-token');
  });

  it('accepts a custom property the markup sets', () => {
    const root = fixtureRoot();
    const rel = page(root, 'Bound.svelte', `<span style:--mark-image={url}></span>
    <style>
      .a { mask: var(--mark-image); }
    </style>`);
    expect(rulesFor(root, rel)).not.toContain('unknown-token');
  });

  it('flags a colour literal', () => {
    const root = fixtureRoot();
    const rel = page(root, 'Colour.svelte', `<style>
      .a { color: #ff0055; }
    </style>`);
    expect(rulesFor(root, rel)).toContain('color-literal');
  });

  it('flags an absolute dimension but not a relative one', () => {
    const root = fixtureRoot();
    const abs = page(root, 'Abs.svelte', `<style>.a { padding: 12px; }</style>`);
    const rel = page(root, 'Rel.svelte', `<style>.a { padding: 0.5em; margin: 0; }</style>`);
    expect(rulesFor(root, abs)).toContain('dimension-literal');
    expect(rulesFor(root, rel)).not.toContain('dimension-literal');
  });

  it('ignores a media query breakpoint and a var() fallback', () => {
    const root = fixtureRoot();
    const rel = page(root, 'Media.svelte', `<style>
      @media (max-width: 768px) { .a { gap: var(--space-8, 4px); } }
    </style>`);
    expect(rulesFor(root, rel)).not.toContain('dimension-literal');
  });

  it('flags an absolute type value but not a relative one', () => {
    const root = fixtureRoot();
    const abs = page(root, 'Type.svelte', `<style>.a { font-size: 14px; }</style>`);
    const rel = page(root, 'TypeRel.svelte', `<style>.a { line-height: 1.6; font-size: 0.9em; }</style>`);
    expect(rulesFor(root, abs)).toContain('raw-text-axis');
    expect(rulesFor(root, rel)).not.toContain('raw-text-axis');
  });

  it('flags a hardcoded page grid but not a local two-up', () => {
    const root = fixtureRoot();
    const grid = page(root, 'Grid.svelte', `<style>.a { grid-template-columns: repeat(10, 1fr); }</style>`);
    const twoUp = page(root, 'TwoUp.svelte', `<style>.a { grid-template-columns: repeat(2, minmax(max-content, 1fr)); }</style>`);
    expect(rulesFor(root, grid)).toContain('hardcoded-columns');
    expect(rulesFor(root, twoUp)).not.toContain('hardcoded-columns');
  });
});

describe('check-page severity', () => {
  it('fails on an error and passes on a warning', () => {
    const root = fixtureRoot();
    const rel = page(root, 'Mixed.svelte', `<style>
      .a { color: var(--text-imaginary); padding: 12px; }
    </style>`);
    const { findings } = checkPages([rel], { root });
    const resolved = applySeverity(findings, PAGE_RULES, {});
    expect(countBySeverity(resolved)).toEqual({ errors: 1, warnings: 1 });
  });

  it('--strict promotes warnings and --off silences a rule', () => {
    const root = fixtureRoot();
    const rel = page(root, 'Warn.svelte', `<style>.a { padding: 12px; }</style>`);
    const { findings } = checkPages([rel], { root });
    expect(countBySeverity(applySeverity(findings, PAGE_RULES, parseCheckFlags(['--strict'])))).toEqual({
      errors: 1,
      warnings: 0,
    });
    expect(
      applySeverity(findings, PAGE_RULES, parseCheckFlags(['--off=dimension-literal'])),
    ).toHaveLength(0);
  });

  it('live-tokens.config.json can lower a rule', () => {
    const root = fixtureRoot();
    const rel = page(root, 'Configured.svelte', `<style>.a { color: #ff0055; }</style>`);
    const { findings } = checkPages([rel], { root });
    const resolved = applySeverity(findings, PAGE_RULES, {}, { rules: { 'color-literal': 'warn' } });
    expect(countBySeverity(resolved)).toEqual({ errors: 0, warnings: 1 });
  });
});

describe('discoverPages', () => {
  it('picks up pages and skips system code', () => {
    const root = fixtureRoot();
    page(root, 'Home.svelte', '<div />');
    mkdirSync(join(root, 'src/system/components'), { recursive: true });
    writeFileSync(join(root, 'src/system/components/Card.svelte'), '<div />');
    const found = discoverPages(root).map((f: string) => f.slice(root.length + 1));
    expect(found).toContain('src/pages/Home.svelte');
    expect(found.some((f: string) => f.startsWith('src/system/'))).toBe(false);
  });
});

describe("this repo's own pages", () => {
  it('carry no page errors', () => {
    const root = process.cwd();
    const { findings } = checkPages(discoverPages(root), { root });
    const errors = applySeverity(findings, PAGE_RULES, {}).filter(
      (f: { severity: string }) => f.severity === 'error',
    );
    expect(errors.map((f: { file: string; message: string }) => `${f.file}: ${f.message}`)).toEqual([]);
  });
});
