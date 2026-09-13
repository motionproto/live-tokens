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
    `<script module lang="ts">
  export const catalogue = {
    description: 'A dial for one bounded number.',
    useFor: 'a value the reader sets by turning a ring.',
    notFor: 'free text.',
    props: { variant: '\`round\` is a full circle, \`flat\` is a half circle.' },
  };
</script>
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
    join(root, 'src/system/components/Dial.svelte'),
    `<script module lang="ts">
  export const catalogue = {
    description: 'A number chosen by turning a ring.',
    useFor: 'a bounded number whose position on the ring carries the meaning.',
    notFor: 'an exact number the reader would rather type (Input).',
  };
</script>
<script lang="ts">
  interface Props { value?: number }
  let { value = 0 }: Props = $props();
</script>
<div class="dial">{value}</div>
<style>:global(:root) { --dial-surface: var(--surface-neutral); }</style>`,
  );
  writeFileSync(
    join(root, 'src/widgets/Gizmo.svelte'),
    `<script lang="ts">
  interface Props { on?: boolean }
  let { on = false }: Props = $props();
</script>
<style>:global(:root) { --gizmo-surface: var(--surface-neutral); }</style>`,
  );
  writeFileSync(
    join(root, 'src/widgets/Knob.svelte'),
    `<script module lang="ts">
  export const catalogue = {
    description: 'A knob.',
    useFor: 'a value turned by hand.',
  };
</script>
<script lang="ts">
  interface Props { value?: number }
  let { value = 0 }: Props = $props();
</script>
<style>:global(:root) { --knob-surface: var(--surface-neutral); }</style>`,
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

  it('reads the catalogue export, the variants from the prop union, and the tokens with defaults', () => {
    const root = project();
    const widget = describeComponents(loadVocabulary({ root }), { root }).find((c: { id: string }) => c.id === 'widget');
    expect(widget.catalogue).toEqual({
      description: 'A dial for one bounded number.',
      useFor: 'a value the reader sets by turning a ring.',
      notFor: 'free text.',
      props: { variant: '`round` is a full circle, `flat` is a half circle.' },
    });
    expect(widget.variants).toEqual(['round', 'flat']);
    expect(widget.props.map((p: { name: string }) => p.name)).toEqual(['variant', 'value', 'label']);
    expect(widget.props[1].type).toBe('number');
    expect(widget.tokens).toEqual([
      { name: '--widget-surface', default: 'var(--surface-neutral)' },
      { name: '--widget-text', default: 'var(--text-primary)' },
    ]);
  });

  it('prints the catalogue as description, Use for, Not for, then one line per guidance-bearing prop', () => {
    const root = project();
    const widget = describeComponents(loadVocabulary({ root }), { root }).find((c: { id: string }) => c.id === 'widget');
    const dial = describeComponents(loadVocabulary({ root }), { root }).find((c: { id: string }) => c.id === 'dial');
    expect(formatComponents([widget], { id: 'widget' }).split('\n').slice(1, 5)).toEqual([
      '  A dial for one bounded number.',
      '  Use for: a value the reader sets by turning a ring.',
      '  Not for: free text.',
      '  variant: `round` is a full circle, `flat` is a half circle.',
    ]);
    expect(formatComponents([dial], { id: 'dial' })).toContain('  Not for: an exact number the reader would rather type (Input).');
  });

  it('prints only the catalogue fields the file has', () => {
    const root = project();
    const knob = describeComponents(loadVocabulary({ root }), { root }).find((c: { id: string }) => c.id === 'knob');
    const out = formatComponents([knob], { id: 'knob' });
    expect(out.split('\n').slice(1, 3)).toEqual(['  A knob.', '  Use for: a value turned by hand.']);
    expect(out).not.toContain('Not for:');
    expect(out).not.toContain('undefined');
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
  it('groups design tokens by contract scale with their values', () => {
    const root = project();
    const desc = describeTokens(loadVocabulary({ root }), { root });
    expect(desc.tokensCss).toBe('src/system/styles/tokens.css');
    const scales = Object.fromEntries(desc.scales.map((s: { scale: string; tokens: unknown[] }) => [s.scale, s.tokens]));
    expect(scales.space).toEqual([{ name: '--space-8', value: '0.5rem' }]);
    expect(scales.heading).toEqual([{ name: '--heading-lg-font-size', value: '2rem' }]);
    expect(scales.columns).toHaveLength(1);
    expect(desc.components.find((c: { id: string }) => c.id === 'widget').tokens).toHaveLength(2);
  });

  it('formats one scale and names a missing one', () => {
    const root = project();
    const desc = describeTokens(loadVocabulary({ root }), { root });
    expect(formatTokens(desc, { scale: 'space' })).toContain('--space-8: 0.5rem');
    expect(formatTokens(desc, { scale: 'nope' })).toContain('No token scale "nope"');
  });
});
