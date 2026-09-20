import { describe, it, expect, afterEach } from 'vitest';
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
// @ts-expect-error — plain .mjs module, no types
import { buildReport, formatReport } from './lib/report.mjs';
// @ts-expect-error — plain .mjs module, no types
import { PAGE_RULES } from './check-page.mjs';
// @ts-expect-error — plain .mjs module, no types
import { loadVocabulary } from './lib/tokenVocabulary.mjs';

const roots: string[] = [];
afterEach(() => {
  while (roots.length) rmSync(roots.pop()!, { recursive: true, force: true });
});

function project(): string {
  const root = mkdtempSync(join(tmpdir(), 'lt-report-'));
  roots.push(root);
  mkdirSync(join(root, 'src/system/components'), { recursive: true });
  mkdirSync(join(root, 'src/system/styles'), { recursive: true });
  mkdirSync(join(root, 'src/pages'), { recursive: true });
  writeFileSync(join(root, 'src/system/styles/tokens.css'), ':root { --surface-neutral: #111; --text-primary: #eee; --space-8: 0.5rem; }');
  writeFileSync(
    join(root, 'src/system/components/Widget.svelte'),
    `<script module lang="ts">
  export const catalogue = { description: 'A dial.', whenToUse: 'testing.', whenNotToUse: [{ when: 'the setting is on or off.', use: 'toggle' }] };
</script>
<script lang="ts">
  interface Props { label?: string }
  let { label = '' }: Props = $props();
</script>
<div class="widget">{label}</div>
<style>
  :global(:root) {
    --widget-surface: var(--surface-neutral);
    --widget-glow-surface: var(--surface-neutral);
  }
  .widget { background: var(--widget-surface); }
</style>`,
  );
  writeFileSync(join(root, 'src/system/components/WidgetEditor.svelte'), `<script module lang="ts">
  const component = 'widget';
  export const allTokens = [{ label: 'surface', variable: '--widget-surface' }];
</script>`);
  writeFileSync(join(root, 'src/system/components/Stray.svelte'), `<div />\n<style>:global(:root) { --stray-surface: var(--surface-neutral); }</style>`);
  writeFileSync(join(root, 'src/main.ts'), `bootLiveTokens(App, '#app', { components: [{ id: 'widget' }] });`);
  writeFileSync(
    join(root, 'src/pages/Home.svelte'),
    `<script>
  import Card from '@motion-proto/live-tokens/components/Card.svelte';
</script>
<Card title="a" /><Card title="b" />
<style>.x { padding: 12px; color: #fff; }</style>`,
  );
  return root;
}

describe('buildReport', () => {
  it('states the facts: what a component is, what each page renders, and the findings by rule', () => {
    const root = project();
    const r = buildReport(loadVocabulary({ root }), { root });
    const widget = r.components.find((c: { id: string }) => c.id === 'widget');
    expect(widget).toEqual({
      id: 'widget',
      origin: 'custom',
      file: 'src/system/components/Widget.svelte',
      registered: true,
      tokens: 2,
    });
    expect(r.usage.customUnused).toEqual(['stray', 'widget']);
    expect(r.usage.byPage).toEqual([{ file: 'src/pages/Home.svelte', components: [{ id: 'card', rendered: 2 }] }]);
    expect(r.usage.unusedShipped).toContain('button');
    expect(r.usage.unusedShipped).not.toContain('card');
    expect(r.findings.pages.byRule).toEqual({ 'color-literal': 1, 'dimension-literal': 1 });
    expect(r.findings.pages.errors).toBe(1);
    expect(r.findings.pages.strictErrors).toBe(2);
    expect(r.findings.components.checked.slice().sort()).toEqual(['stray', 'widget']);
  });

  it('reports an unread property, a missing description, and an unregistered component as findings', () => {
    const root = project();
    const byRule = buildReport(loadVocabulary({ root }), { root }).findings.components.byRule;
    expect(byRule['unread-token']).toBe(2);
    expect(byRule['missing-description']).toBe(1);
    expect(byRule['missing-registration']).toBe(1);
  });

  it('sorts findings by severity, then by how many share the rule, then by file and line', () => {
    const root = project();
    const items = buildReport(loadVocabulary({ root }), { root }).findings.components.items;
    expect(items.map((f: { rule: string }) => f.rule)).toEqual([
      'missing-file',
      'missing-registration',
      'unread-token',
      'unread-token',
      'missing-description',
    ]);
  });

  it('orders the JSON sections the way the report reads', () => {
    const root = project();
    expect(Object.keys(buildReport(loadVocabulary({ root }), { root }))).toEqual([
      'project',
      'migrations',
      'components',
      'findings',
      'usage',
    ]);
  });

  it('formats every section with its count, and names each rule\'s repair', () => {
    const root = project();
    const text = formatReport(buildReport(loadVocabulary({ root }), { root }));
    expect(text).toMatch(/semantic properties declared: \d+/);
    expect(text).toContain('custom: 2 (stray, widget)');
    expect(text).toContain('unread-token: 2  [choice]');
    expect(text).toContain('dimension-literal: 1  [auto]');
    expect(text).toContain('src/pages/Home.svelte: card×2');
    expect(text).toContain('check-page: 1 error(s), 1 warning(s); 2 under --strict');
  });
});

describe('the finding contract both checkers meet', () => {
  it('carries the fields a repair needs on every finding', () => {
    const root = project();
    const r = buildReport(loadVocabulary({ root }), { root });
    const all = [...r.findings.pages.items, ...r.findings.components.items];
    expect(all.length).toBeGreaterThan(4);
    for (const f of all) {
      expect(Object.keys(f)).toEqual(
        expect.arrayContaining(['rule', 'severity', 'file', 'line', 'message', 'guidance', 'repair', 'exception']),
      );
      expect(['auto', 'choice', 'authored']).toContain(f.repair);
      expect(f.guidance.length).toBeGreaterThan(0);
      expect(f).not.toHaveProperty('fix');
    }
  });

  it('reads as one object, whole', () => {
    const root = project();
    const r = buildReport(loadVocabulary({ root }), { root });
    expect(r.findings.pages.items.find((f: { rule: string }) => f.rule === 'dimension-literal')).toEqual({
      rule: 'dimension-literal',
      severity: 'warn',
      file: 'src/pages/Home.svelte',
      line: 5,
      message: 'padding: 12px. Use a --space-*, --radius-*, --border-width-*, or --shadow-* token.',
      guidance: PAGE_RULES['dimension-literal'].guidance,
      repair: 'auto',
      exception: { checks: { exclude: ['src/pages/Home.svelte'] } },
      details: {
        scale: 'space',
        literals: [{ value: '12px', px: 12, candidates: [{ token: '--space-8', px: 8, shift: -4 }] }],
        patch: { from: 'padding: 12px', to: 'padding: var(--space-8)' },
      },
    });
  });

  it('excludes the file for a page finding and steps the rule down for a component one', () => {
    const root = project();
    const r = buildReport(loadVocabulary({ root }), { root });
    expect(r.findings.pages.items[0].exception).toEqual({ checks: { exclude: ['src/pages/Home.svelte'] } });
    const unread = r.findings.components.items.find((f: { rule: string }) => f.rule === 'unread-token');
    expect(unread.exception).toEqual({ checks: { rules: { 'unread-token': 'off' } } });
    const registration = r.findings.components.items.find((f: { rule: string }) => f.rule === 'missing-registration');
    expect(registration.exception).toEqual({ checks: { rules: { 'missing-registration': 'warn' } } });
  });
});
