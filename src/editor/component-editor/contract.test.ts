// @vitest-environment happy-dom
/**
 * Exercises `checkRegistryEntry` against a fixture project — the consumer path,
 * where `projectRoot` and `componentConfigsDir` are somewhere other than this
 * repo. Without it a helper that resolved nothing would let every component in
 * `registryContract.test.ts` pass vacuously.
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import type { RegistryEntry } from './registry';
import type { Token } from './scaffolding/types';
import { checkRegistryEntry } from './contract';

let projectRoot: string;
let componentConfigsDir: string;

const SOURCE_FILE = 'src/system/components/Widget.svelte';

const RUNTIME = `<script lang="ts">let { label = '' } = $props();</script>
<div class="widget">{label}</div>
<style>
  :global(:root) {
    --widget-surface: var(--surface-canvas);
    --widget-panel-scrim: var(--surface-neutral-lowest);
  }
  .widget { background: var(--widget-surface); }
</style>
`;

const DEFAULTS = {
  name: 'default',
  component: 'widget',
  aliases: {
    '--widget-surface': '--surface-canvas',
    '--widget-panel-scrim': 'transparent',
  },
};

function entryWith(schema: Token[], sourceFile = SOURCE_FILE): RegistryEntry {
  return {
    id: 'widget',
    label: 'Widget',
    icon: 'fas fa-magic',
    sourceFile,
    editorComponent: (() => {}) as never,
    schema,
    origin: 'custom',
  };
}

const check = (schema: Token[], sourceFile?: string) =>
  checkRegistryEntry(entryWith(schema, sourceFile), { projectRoot, componentConfigsDir });

beforeAll(() => {
  projectRoot = mkdtempSync(path.join(tmpdir(), 'lt-contract-'));
  componentConfigsDir = path.join(projectRoot, 'src/live-tokens/data/component-configs');
  mkdirSync(path.join(projectRoot, 'src/system/components'), { recursive: true });
  writeFileSync(path.join(projectRoot, SOURCE_FILE), RUNTIME);
  mkdirSync(path.join(componentConfigsDir, 'widget'), { recursive: true });
  writeFileSync(
    path.join(componentConfigsDir, 'widget/default.json'),
    JSON.stringify(DEFAULTS, null, 2),
  );
});

afterAll(() => rmSync(projectRoot, { recursive: true, force: true }));

describe('checkRegistryEntry', () => {
  it('passes a component whose runtime and defaults cover its schema', () => {
    expect(check([{ label: 'surface', variable: '--widget-surface' }])).toEqual([]);
  });

  it('reports a schema with nothing in it', () => {
    expect(check([])).toEqual(['registration: schema is empty']);
  });

  it('reports a sourceFile that does not resolve', () => {
    const violations = check([{ label: 'surface', variable: '--widget-surface' }], 'src/Ghost.svelte');
    expect(violations).toHaveLength(1);
    expect(violations[0]).toMatch(/^registration: sourceFile does not resolve/);
  });

  it('reports a variable declared twice', () => {
    const token: Token = { label: 'surface', variable: '--widget-surface' };
    expect(check([token, token])).toEqual(['uniqueness: --widget-surface is declared twice']);
  });

  it('reports a token the runtime never declares and the defaults never seed', () => {
    expect(check([{ label: 'ghost', variable: '--widget-ghost-surface' }])).toEqual([
      `runtime: --widget-ghost-surface is not declared in ${SOURCE_FILE}`,
      'default config: --widget-ghost-surface has no seed in widget/default.json',
    ]);
  });

  it('reports a seed below its declared opacity floor', () => {
    expect(check([{ label: 'scrim', variable: '--widget-panel-scrim', minOpacity: 90 }])).toEqual([
      'opacity floor: --widget-panel-scrim seeds at 0%, below its 90% floor',
    ]);
  });

  it('excludes hidden, gradient, and split-padding tokens from the coverage checks', () => {
    expect(
      check([
        { label: 'hidden', variable: '--widget-ghost-a-surface', hidden: true },
        { label: 'gradient', variable: '--widget-ghost-b-surface', kind: 'gradient' },
        { label: 'padding top', variable: '--widget-ghost-padding-top' },
      ]),
    ).toEqual([]);
  });
});
