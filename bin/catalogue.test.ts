import { describe, it, expect, afterEach } from 'vitest';
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
// @ts-expect-error — plain .mjs module, no types
import { describeComponents, describeTokens, formatComponents, formatTokens } from './lib/catalogue.mjs';
// @ts-expect-error — plain .mjs module, no types
import { loadVocabulary } from './lib/tokenVocabulary.mjs';

const roots: string[] = [];
afterEach(() => {
  while (roots.length) rmSync(roots.pop()!, { recursive: true, force: true });
});

function project(): string {
  const root = mkdtempSync(join(tmpdir(), 'lt-catalogue-'));
  roots.push(root);
  mkdirSync(join(root, 'src/system/components'), { recursive: true });
  mkdirSync(join(root, 'src/system/styles'), { recursive: true });
  mkdirSync(join(root, 'src/widgets'), { recursive: true });
  writeFileSync(
    join(root, 'src/system/styles/tokens.css'),
    ':root { --surface-neutral: #111; --text-primary: #eee; --space-8: 0.5rem; --heading-lg-font-size: 2rem; --columns-count: 12; }',
  );
  writeFileSync(
    join(root, 'src/system/components/Widget.svelte'),
    `<!--
  Widget.svelte — a dial for one bounded number. Not for free text.
-->
<script lang="ts">
  interface Props {
    variant?: 'round' | 'flat';
    value?: number;
    label?: string;
  }
  let { variant = 'round', value = 0, label = '' }: Props = $props();
</script>
<div class="widget {variant}">{label}{value}</div>
<style>
  :global(:root) {
    --widget-surface: var(--surface-neutral);
    --widget-text: var(--text-primary);
  }
</style>`,
  );
  writeFileSync(
    join(root, 'src/widgets/Gizmo.svelte'),
    `<script lang="ts">
  interface Props { on?: boolean }
  let { on = false }: Props = $props();
</script>
<style>:global(:root) { --gizmo-surface: var(--surface-neutral); }</style>`,
  );
  writeFileSync(join(root, 'live-tokens.config.json'), JSON.stringify({ componentDirs: ['src/widgets'] }));
  writeFileSync(join(root, 'src/main.ts'), `bootLiveTokens(App, '#app', { components: [{ id: 'widget' }] });`);
  return root;
}

describe('describeComponents', () => {
  it('lists the shipped set and the project\'s own, from every configured directory', () => {
    const root = project();
    const list = describeComponents(loadVocabulary({ root }), { root });
    const byId = Object.fromEntries(list.map((c: { id: string }) => [c.id, c]));
    expect(byId.card.origin).toBe('shipped');
    expect(byId.card.registered).toBe(true);
    expect(byId.widget.origin).toBe('custom');
    expect(byId.widget.registered).toBe(true);
    expect(byId.gizmo.origin).toBe('custom');
    expect(byId.gizmo.registered).toBe(false);
    expect(byId.gizmo.file).toBe('src/widgets/Gizmo.svelte');
  });

  it('reads the description from the header comment, the variants from the prop union, and the tokens with defaults', () => {
    const root = project();
    const widget = describeComponents(loadVocabulary({ root }), { root }).find((c: { id: string }) => c.id === 'widget');
    expect(widget.description).toBe('a dial for one bounded number. Not for free text.');
    expect(widget.variants).toEqual(['round', 'flat']);
    expect(widget.props.map((p: { name: string }) => p.name)).toEqual(['variant', 'value', 'label']);
    expect(widget.props[1].type).toBe('number');
    expect(widget.tokens).toEqual([
      { name: '--widget-surface', default: 'var(--surface-neutral)' },
      { name: '--widget-text', default: 'var(--text-primary)' },
    ]);
  });

  it('lists custom components first and names an unknown id', () => {
    const root = project();
    const list = describeComponents(loadVocabulary({ root }), { root });
    expect(list[0].origin).toBe('custom');
    expect(formatComponents(list, { id: 'nope' })).toContain('No component "nope"');
    expect(formatComponents(list, { id: 'widget' })).toContain('variant: round | flat');
  });
});

describe('describeTokens', () => {
  it('groups theme tokens by contract family with their values', () => {
    const root = project();
    const desc = describeTokens(loadVocabulary({ root }), { root });
    expect(desc.tokensCss).toBe('src/system/styles/tokens.css');
    const families = Object.fromEntries(desc.families.map((f: { family: string; tokens: unknown[] }) => [f.family, f.tokens]));
    expect(families.space).toEqual([{ name: '--space-8', value: '0.5rem' }]);
    expect(families.heading).toEqual([{ name: '--heading-lg-font-size', value: '2rem' }]);
    expect(families.columns).toHaveLength(1);
    expect(desc.components.find((c: { id: string }) => c.id === 'widget').tokens).toHaveLength(2);
  });

  it('formats one family and names a missing one', () => {
    const root = project();
    const desc = describeTokens(loadVocabulary({ root }), { root });
    expect(formatTokens(desc, { family: 'space' })).toContain('--space-8: 0.5rem');
    expect(formatTokens(desc, { family: 'nope' })).toContain('No family "nope"');
  });
});
