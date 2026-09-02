import { describe, it, expect, afterEach } from 'vitest';
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
// @ts-expect-error — plain .mjs module, no types
import { buildReport, formatReport, unreadTokens } from './lib/report.mjs';
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
    `<!-- Widget.svelte — a dial. -->
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

describe('unreadTokens', () => {
  it('counts a var() read, a mixin string, a style directive, an interpolated pattern, and a parent for its sides', () => {
    const source = `<div style:--w-c={x}></div>
<style lang="scss">
  :global(:root) { --w-a: 1; --w-b: 2; --w-c: 3; --w-info-fill: 4; --w-d: 5; --w-pad: 6; --w-pad-top: 7; }
  .a { color: var(--w-a); }
  .b { @include themed-padding(--w-b); }
  @each $v in (info) { .c { background: var(--w-#{$v}-fill); } }
  .p { @include themed-padding(--w-pad); }
</style>`;
    expect(unreadTokens(source, ['--w-a', '--w-b', '--w-c', '--w-info-fill', '--w-d', '--w-pad', '--w-pad-top'])).toEqual(['--w-d']);
  });
});

describe('buildReport', () => {
  it('states the facts: unread tokens, registration, usage, and findings by rule', () => {
    const root = project();
    const r = buildReport(loadVocabulary({ root }), { root });
    const widget = r.components.find((c: { id: string }) => c.id === 'widget');
    expect(widget.unread).toEqual(['--widget-glow-surface']);
    expect(widget.registered).toBe(true);
    expect(widget.described).toBe(true);
    expect(r.usage.customUnregistered).toEqual(['stray']);
    expect(r.usage.customUnused).toEqual(['stray', 'widget']);
    expect(r.usage.byPage).toEqual([{ file: 'src/pages/Home.svelte', components: [{ id: 'card', rendered: 2 }] }]);
    expect(r.usage.unusedShipped).toContain('button');
    expect(r.usage.unusedShipped).not.toContain('card');
    expect(r.findings.pages.byRule).toEqual({ 'color-literal': 1, 'dimension-literal': 1 });
    expect(r.findings.pages.errors).toBe(1);
    expect(r.findings.pages.strictErrors).toBe(2);
    expect(r.findings.components.checked).toEqual(['widget']);
  });

  it('formats every section with its count', () => {
    const root = project();
    const text = formatReport(buildReport(loadVocabulary({ root }), { root }));
    expect(text).toContain('widget: 1 unread (--widget-glow-surface)');
    expect(text).toContain('not registered: stray');
    expect(text).toContain('src/pages/Home.svelte: card×2');
    expect(text).toContain('check-page: 1 error(s), 1 warning(s); 2 under --strict');
  });
});
