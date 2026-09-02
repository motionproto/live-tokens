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
      --text-secondary: #ccc;
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
    const twoUp = page(root, 'TwoUp.svelte', `<style>.a { grid-template-columns: repeat(2, 1fr); }</style>`);
    expect(rulesFor(root, grid)).toContain('hardcoded-columns');
    expect(rulesFor(root, twoUp)).not.toContain('hardcoded-columns');
  });

  it('flags a literal in themed geometry but not in layout sizing', () => {
    const root = fixtureRoot();
    const themed = page(root, 'Themed.svelte', `<style>.a { box-shadow: 0 2px 4px var(--surface-neutral); border-radius: 6px; }</style>`);
    const sizing = page(root, 'Sizing.svelte', `<style>.a { height: 32rem; max-width: 48rem; grid-template-columns: repeat(auto-fit, minmax(15rem, 1fr)); }</style>`);
    expect(rulesFor(root, themed).filter((r) => r === 'dimension-literal')).toHaveLength(2);
    expect(rulesFor(root, sizing)).not.toContain('dimension-literal');
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

/**
 * A page that passes under --strict, and one mutation per rule that a page can
 * break. Same idea as the component table: the clean page is the only shape
 * that passes, and each row proves its rule still fires.
 */
const CLEAN_PAGE = `<script lang="ts">
  import Card from '@motion-proto/live-tokens/components/Card.svelte';
  import Badge from '@motion-proto/live-tokens/components/Badge.svelte';
  import Button from '@motion-proto/live-tokens/components/Button.svelte';
  let count = 0;
</script>

<section class="hero" style="gap: var(--space-8)">
  <Card title="Welcome" hover={false} prose={false}>
    <Badge variant="neutral" size="small">New</Badge>
    <Button variant="secondary" onclick={() => (count = count > 1 ? 0 : count + 1)}>
      Count
    </Button>
  </Card>
  <p style:color="var(--text-secondary)">Body</p>
</section>

<style>
  .hero {
    display: grid;
    grid-template-columns: repeat(var(--columns-count), 1fr);
    padding: var(--space-8);
    border-radius: var(--radius-xl);
    color: var(--text-primary);
    background: var(--surface-neutral, #111);
  }
  .hero::before { content: "white"; }
</style>`;

function strictPage(body: string) {
  const root = fixtureRoot();
  const rel = page(root, 'Clean.svelte', body);
  return applySeverity(checkPages([rel], { root }).findings, PAGE_RULES, { strict: true });
}

const edit = (from: string, to: string) => (body: string) => {
  if (!body.includes(from)) throw new Error(`fixture no longer contains ${from}`);
  return body.replace(from, to);
};

const PAGE_MUTATIONS: [string, (body: string) => string, string][] = [
  ['a hex literal in an inline style attribute', edit('style="gap: var(--space-8)"', 'style="gap: var(--space-8); color: #fff"'), 'color-literal'],
  ['a raw dimension in an inline style attribute', edit('style="gap: var(--space-8)"', 'style="gap: 12px"'), 'dimension-literal'],
  ['a colour literal in a style: directive', edit('style:color="var(--text-secondary)"', 'style:color="rebeccapurple"'), 'color-literal'],
  ['an unknown token in a style: directive', edit('style:color="var(--text-secondary)"', 'style:color="var(--text-imaginary)"'), 'unknown-token'],
  ['a named colour in a style block', edit('color: var(--text-primary);', 'color: white;'), 'color-literal'],
  ['a colour function in a style block', edit('color: var(--text-primary);', 'color: rgb(0 0 0 / 50%);'), 'color-literal'],
  ['a prop the component does not declare', edit('hover={false}', 'elevation="high"'), 'unknown-prop'],
  ['a shorthand prop the component does not declare', edit('hover={false}', '{elevation}'), 'unknown-prop'],
  ['a variant outside the union', edit('variant="neutral"', 'variant="bogus"'), 'unknown-prop-value'],
  ['a size outside the union', edit('size="small"', 'size="xl"'), 'unknown-prop-value'],
  ['a variant after an expression holding >', edit('variant="secondary"', 'variant="tertiary"'), 'unknown-prop-value'],
  ['a component outside the catalogue', edit('components/Badge.svelte', 'components/Sparkle.svelte'), 'unknown-component'],
  ['a hardcoded column count', edit('repeat(var(--columns-count), 1fr)', 'repeat(12, 1fr)'), 'hardcoded-columns'],
  ['a font shorthand with an absolute size', edit('color: var(--text-primary);', 'font: 500 12px/1 system-ui;'), 'raw-text-axis'],
];

describe('the clean page and its mutations', () => {
  it('passes under --strict with no findings at all', () => {
    expect(strictPage(CLEAN_PAGE)).toEqual([]);
  });

  it.each(PAGE_MUTATIONS)('%s is caught', (_name, mutate, rule) => {
    expect(strictPage(mutate(CLEAN_PAGE)).map((f: { rule: string }) => f.rule)).toContain(rule);
  });

  it('skips a tag that spreads props, an expression value, and directives', () => {
    const body = edit('<Badge variant="neutral" size="small">', '<Badge {...rest} variant="bogus">')(
      edit('hover={false}', 'variant={kind} bind:title on:click class:active')(CLEAN_PAGE),
    );
    const rules = strictPage(body).map((f: { rule: string }) => f.rule);
    expect(rules).not.toContain('unknown-prop');
    expect(rules).not.toContain('unknown-prop-value');
  });

  it('reads a custom property with a digit in its name as one declaration', () => {
    const body = edit('padding: var(--space-8);', '--local-2xl: 2rem; padding: var(--local-2xl);')(CLEAN_PAGE);
    expect(strictPage(body)).toEqual([]);
  });
});

describe('discoverPages skips the files that define the vocabulary', () => {
  it('leaves out tokens.css at a legacy location and the generated token files', () => {
    const dir = mkdtempSync(join(tmpdir(), 'lt-page-'));
    roots.push(dir);
    mkdirSync(join(dir, 'src/pages'), { recursive: true });
    writeFileSync(join(dir, 'src/tokens.css'), ':root { --surface-neutral: #111; }');
    writeFileSync(join(dir, 'src/tokens.generated.css'), ':root { --surface-neutral: #222; }');
    writeFileSync(join(dir, 'src/pages/Home.svelte'), '<div />');
    const found = discoverPages(dir).map((f: string) => f.slice(dir.length + 1));
    expect(found).toEqual(['src/pages/Home.svelte']);
  });
});

describe('checks.exclude', () => {
  it('drops a declared path from discovery, and a directory covers what is under it', () => {
    const dir = mkdtempSync(join(tmpdir(), 'lt-page-'));
    roots.push(dir);
    mkdirSync(join(dir, 'src/pages'), { recursive: true });
    mkdirSync(join(dir, 'src/art'), { recursive: true });
    writeFileSync(join(dir, 'src/pages/Home.svelte'), '<div />');
    writeFileSync(join(dir, 'src/art/hero.css'), '.hero { color: #abc; }');
    writeFileSync(join(dir, 'src/banner.css'), '.banner { color: #def; }');
    writeFileSync(
      join(dir, 'live-tokens.config.json'),
      JSON.stringify({ checks: { exclude: ['src/art', 'src/banner.css'] } }),
    );
    const found = discoverPages(dir).map((f: string) => f.slice(dir.length + 1));
    expect(found).toEqual(['src/pages/Home.svelte']);
  });

  it('still checks an excluded file the caller names outright', () => {
    const dir = mkdtempSync(join(tmpdir(), 'lt-page-'));
    roots.push(dir);
    mkdirSync(join(dir, 'src'), { recursive: true });
    writeFileSync(join(dir, 'src/banner.css'), '.banner { color: #def; }');
    writeFileSync(
      join(dir, 'live-tokens.config.json'),
      JSON.stringify({ checks: { exclude: ['src/banner.css'] } }),
    );
    const { findings } = checkPages(['src/banner.css'], { root: dir });
    expect(findings.map((f: { rule: string }) => f.rule)).toContain('color-literal');
  });
});

describe('the create template', () => {
  it('passes check-page under --strict', () => {
    const root = join(process.cwd(), 'template');
    const resolved = applySeverity(checkPages(discoverPages(root), { root }).findings, PAGE_RULES, { strict: true });
    expect(resolved.map((f: { file: string; message: string }) => `${f.file}: ${f.message}`)).toEqual([]);
  });
});

describe("this repo's own pages", () => {
  it('carry no finding at all under --strict', () => {
    const root = process.cwd();
    const { findings } = checkPages(discoverPages(root), { root });
    const resolved = applySeverity(findings, PAGE_RULES, { strict: true });
    expect(resolved.map((f: { file: string; message: string }) => `${f.file}: ${f.message}`)).toEqual([]);
  });
});
