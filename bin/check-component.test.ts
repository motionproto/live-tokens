import { describe, it, expect, afterEach } from 'vitest';
import { mkdtempSync, mkdirSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
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
import { COMPONENT_RULES, checkComponentDefaults } from './check-component.mjs';
// @ts-expect-error — plain .mjs module, no types
import { applySeverity, countBySeverity } from './lib/findings.mjs';

function withTokens(root: string) {
  mkdirSync(join(root, 'src/system/styles'), { recursive: true });
  writeFileSync(
    join(root, 'src/system/styles/tokens.css'),
    ':root { --surface-neutral: #111; --text-primary: #eee; --space-8: 0.5rem; }',
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

  it('severity split keeps a raw dimension out of the failing set', () => {
    const root = fixtureRoot();
    widget(root, '--widget-width: 16rem;\n--widget-surface: var(--surface-neutral);');
    const { findings } = checkComponent('widget', root);
    const resolved = applySeverity(findings, COMPONENT_RULES, {});
    expect(countBySeverity(resolved).errors).toBe(0);
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
