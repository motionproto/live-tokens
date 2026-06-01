import { describe, it, expect, afterEach } from 'vitest';
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
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
