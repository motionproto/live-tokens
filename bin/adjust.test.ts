import { describe, it, expect, afterEach } from 'vitest';
import { mkdtempSync, mkdirSync, rmSync, readFileSync, existsSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { adjustAliases } from '../src/editor/core/components/adjustAliases';
import { matchesKind } from '../src/editor/core/components/aliasKinds';
// @ts-expect-error — plain .mjs module, no types
import { runAdjust, formatAdjustResult } from './adjust.mjs';

const engine = { adjustAliases, matchesKind };
const CREATED = '2026-01-01T00:00:00.000Z';

const roots: string[] = [];

function project(components: Record<string, Record<string, string>>): string {
  const root = mkdtempSync(join(tmpdir(), 'lt-adjust-'));
  roots.push(root);
  mkdirSync(join(root, 'themes'), { recursive: true });
  // Every tree has a local Default theme: boot derives it. Without one here the
  // package fallback would serve this repo's own, and the fixture would be moot.
  writeFileSync(
    join(root, 'themes', 'default.json'),
    JSON.stringify({ name: 'Default', schemaVersion: 3, colorsAndType: {}, componentConfigs: {} }),
  );
  for (const [component, aliases] of Object.entries(components)) {
    const dir = join(root, 'component-configs', component);
    mkdirSync(dir, { recursive: true });
    writeFileSync(
      join(dir, 'default.json'),
      JSON.stringify({ name: 'default', component, createdAt: CREATED, updatedAt: CREATED, aliases }, null, 2),
    );
  }
  return root;
}

function opsFile(root: string, doc: unknown): string {
  const path = join(root, 'ops.json');
  writeFileSync(path, JSON.stringify(doc));
  return path;
}

function run(root: string, doc: unknown, opts: Record<string, unknown> = {}) {
  return runAdjust({
    opsPath: opsFile(root, doc),
    componentConfigsDir: join(root, 'component-configs'),
    themesDir: join(root, 'themes'),
    engine,
    ...opts,
  });
}

function buffer(root: string, component: string) {
  return JSON.parse(readFileSync(join(root, 'component-configs', component, '_working.json'), 'utf8'));
}

function hasBuffer(root: string, component: string): boolean {
  return existsSync(join(root, 'component-configs', component, '_working.json'));
}

/** An open theme carrying `component` by value, the way apply leaves the tree. */
function openTheme(root: string, slug: string, componentConfigs: Record<string, unknown>) {
  writeFileSync(
    join(root, 'themes', `${slug}.json`),
    JSON.stringify({ name: slug, schemaVersion: 3, colorsAndType: {}, componentConfigs }),
  );
  writeFileSync(join(root, 'themes', '_active.json'), JSON.stringify({ activeFile: slug }));
}

const fixture = () =>
  project({
    button: { '--button-primary-radius': '--radius-xl', '--button-primary-padding': '--space-8' },
    card: { '--card-default-radius': '--radius-md', '--card-hero-padding': '--space-64' },
    tooltip: { '--tooltip-default-text': '--text-primary' },
  });

afterEach(() => {
  while (roots.length) rmSync(roots.pop()!, { recursive: true, force: true });
});

describe('runAdjust', () => {
  it('fills the buffer of changed components only', async () => {
    const root = fixture();
    const result = await run(root, { ops: [{ kind: 'radius', shift: 1 }] });

    expect(buffer(root, 'button').aliases['--button-primary-radius']).toBe('--radius-2xl');
    expect(buffer(root, 'card').aliases['--card-default-radius']).toBe('--radius-lg');
    expect(buffer(root, 'button').component).toBe('button');
    expect(hasBuffer(root, 'tooltip')).toBe(false);
    expect(result.totals).toEqual({ components: 2, aliases: 2, skips: 0 });
  });

  it('writes no named file and no pointer', async () => {
    const root = fixture();
    await run(root, { ops: [{ kind: 'radius', shift: 1 }] });

    expect(existsSync(join(root, 'component-configs/button/adjusted.json'))).toBe(false);
    expect(existsSync(join(root, 'component-configs/button/_active.json'))).toBe(false);
    expect(existsSync(join(root, 'component-configs/button/_production.json'))).toBe(false);
    expect(readFileSync(join(root, 'component-configs/button/default.json'), 'utf8')).toContain('--radius-xl');
  });

  it('reads the open theme when a component has no buffer yet', async () => {
    const root = fixture();
    openTheme(root, 'sunset', {
      button: { name: 'sunset', aliases: { '--button-primary-radius': '--radius-sm' } },
    });

    const result = await run(root, { ops: [{ target: 'button', kind: 'radius', shift: 1 }] });

    expect(buffer(root, 'button').aliases['--button-primary-radius']).toBe('--radius-md');
    expect(result.openTheme).toBe('sunset');
    expect(result.components.find((c: { component: string }) => c.component === 'button').source).toBe('theme');
  });

  it('compounds shifts by reading back the buffer it wrote', async () => {
    const root = fixture();
    await run(root, { ops: [{ kind: 'padding', shift: 1 }] });
    await run(root, { ops: [{ kind: 'padding', shift: 1 }] });

    expect(buffer(root, 'button').aliases['--button-primary-padding']).toBe('--space-12');
  });

  it('writes nothing on a dry run', async () => {
    const root = fixture();
    const result = await run(root, { ops: [{ kind: 'radius', shift: 1 }] }, { dryRun: true });

    expect(result.totals.components).toBe(2);
    expect(result.buffered).toBe(false);
    expect(hasBuffer(root, 'button')).toBe(false);
  });

  it('surfaces engine validation errors intact', async () => {
    const root = fixture();
    await expect(run(root, { ops: [{ kind: 'shadow', shift: 1 }] })).rejects.toThrow(/Unknown kind "shadow"/);
    await expect(run(root, { ops: [{ target: 'nope', kind: 'radius', shift: 1 }] })).rejects.toThrow(
      /Unknown target component "nope"/,
    );
    expect(hasBuffer(root, 'button')).toBe(false);
  });

  it('rejects an ops file with no ops', async () => {
    const root = fixture();
    await expect(run(root, { ops: [] })).rejects.toThrow(/non-empty "ops" array/);
  });
});

describe('formatAdjustResult', () => {
  it('reports an above-ladder value as clamped rather than pulling it down', async () => {
    const root = fixture();
    const result = await run(root, { ops: [{ kind: 'padding', shift: 1 }] }, { dryRun: true });
    const out = formatAdjustResult(result);

    expect(out).toContain('skipped, already at the ladder end: --card-hero-padding');
    expect(out).not.toContain('--space-64 → ');
    expect(out).toContain('--button-primary-padding');
    expect(out).toContain('1 component(s) changed, 1 alias(es), 1 skipped.');
  });

  it('groups skips by reason and names where the config came from', async () => {
    const root = project({
      button: {
        '--button-primary-radius': '--radius-4xl',
        '--button-pill-radius': '--radius-full',
        '--button-ghost-radius': 'clamp(4px, 1vw, 12px)',
      },
    });
    const out = formatAdjustResult(await run(root, { ops: [{ kind: 'radius', shift: 1 }] }));

    expect(out).toContain('button  (from: the shipped default)');
    expect(out).toContain('skipped, raw value, not a token: --button-ghost-radius');
    expect(out).toContain('skipped, already at the ladder end: --button-primary-radius');
    expect(out).toContain('skipped, pill preserved (pass "full": true to move it): --button-pill-radius');
    expect(out).toContain('0 component(s) changed, 0 alias(es), 3 skipped.');
    expect(out).toContain('Nothing changed: every matching alias was skipped');
  });

  it('collapses successive ops on one alias into a single reported change', async () => {
    const root = fixture();
    const result = await run(root, {
      ops: [
        { kind: 'radius', shift: 1 },
        { target: 'button', kind: 'radius', set: '--radius-full' },
      ],
    });

    const button = result.components.find((c: { component: string }) => c.component === 'button');
    expect(button.changes).toEqual([
      { variable: '--button-primary-radius', from: '--radius-xl', to: '--radius-full' },
    ]);
    expect(result.totals.aliases).toBe(2);
    expect(buffer(root, 'button').aliases['--button-primary-radius']).toBe('--radius-full');
  });

  it('names the open theme as the source and says the edit is unsaved', async () => {
    const root = fixture();
    openTheme(root, 'sunset', {
      button: { name: 'sunset', aliases: { '--button-primary-radius': '--radius-sm' } },
    });
    const out = formatAdjustResult(await run(root, { ops: [{ target: 'button', kind: 'radius', shift: 1 }] }));

    expect(out).toContain('button  (from: theme "sunset")');
    expect(out).toContain('This is an unsaved edit');
  });

  it('says an ops-file name is ignored', async () => {
    const root = fixture();
    const out = formatAdjustResult(
      await run(root, { name: 'Pill Buttons', ops: [{ target: 'button', kind: 'radius', set: '--radius-full' }] }),
    );

    expect(out).toContain('Ignored "name": "Pill Buttons"');
    expect(existsSync(join(root, 'component-configs/button/pill-buttons.json'))).toBe(false);
  });
});
