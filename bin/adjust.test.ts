import { describe, it, expect, afterEach } from 'vitest';
import { mkdtempSync, mkdirSync, rmSync, readFileSync, existsSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { adjustAliases } from '../src/editor/core/components/adjustAliases';
import { matchesKind } from '../src/editor/core/components/aliasKinds';
import { sanitizeFileName } from '../src/editor/core/storage/files/versionedFileResourceClient';
// @ts-expect-error — plain .mjs module, no types
import { runAdjust, formatAdjustResult } from './adjust.mjs';

const engine = { adjustAliases, matchesKind, sanitizeFileName };
const CREATED = '2026-01-01T00:00:00.000Z';

const roots: string[] = [];

function project(components: Record<string, Record<string, string>>): string {
  const root = mkdtempSync(join(tmpdir(), 'lt-adjust-'));
  roots.push(root);
  for (const [component, aliases] of Object.entries(components)) {
    const dir = join(root, 'component-configs', component);
    mkdirSync(dir, { recursive: true });
    writeFileSync(
      join(dir, 'default.json'),
      JSON.stringify({ name: 'default', component, createdAt: CREATED, updatedAt: CREATED, aliases }, null, 2),
    );
    writeFileSync(join(dir, '_active.json'), JSON.stringify({ activeFile: 'default' }));
    writeFileSync(join(dir, '_production.json'), JSON.stringify({ productionFile: 'default' }));
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
    engine,
    ...opts,
  });
}

function readConfig(root: string, component: string, name: string) {
  return JSON.parse(readFileSync(join(root, 'component-configs', component, `${name}.json`), 'utf8'));
}

function activeOf(root: string, component: string): string {
  return JSON.parse(readFileSync(join(root, 'component-configs', component, '_active.json'), 'utf8')).activeFile;
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
  it('writes and activates the rolling slug for changed components only', async () => {
    const root = fixture();
    const result = await run(root, { ops: [{ kind: 'radius', shift: 1 }] });

    expect(result.slug).toBe('adjusted');
    expect(readConfig(root, 'button', 'adjusted').aliases['--button-primary-radius']).toBe('--radius-2xl');
    expect(readConfig(root, 'card', 'adjusted').aliases['--card-default-radius']).toBe('--radius-lg');
    expect(activeOf(root, 'button')).toBe('adjusted');
    expect(activeOf(root, 'card')).toBe('adjusted');

    expect(existsSync(join(root, 'component-configs/tooltip/adjusted.json'))).toBe(false);
    expect(activeOf(root, 'tooltip')).toBe('default');
    expect(result.totals).toEqual({ components: 2, aliases: 2, skips: 0 });
  });

  it('stamps a new file with now and keeps createdAt when the slug rolls over', async () => {
    const root = fixture();
    await run(root, { ops: [{ kind: 'radius', shift: 1 }] });
    const first = readConfig(root, 'button', 'adjusted');
    expect(first.name).toBe('adjusted');
    expect(first.createdAt).not.toBe(CREATED);
    expect(first.updatedAt).not.toBe(CREATED);

    await run(root, { ops: [{ kind: 'radius', shift: 1 }] });
    const second = readConfig(root, 'button', 'adjusted');
    expect(second.createdAt).toBe(first.createdAt);
    expect(second.aliases['--button-primary-radius']).toBe('--radius-3xl');
  });

  it('slugifies a given name and leaves the rolling file alone', async () => {
    const root = fixture();
    await run(root, { name: 'Pill Buttons', ops: [{ target: 'button', kind: 'radius', set: '--radius-full' }] });

    expect(readConfig(root, 'button', 'pill-buttons').aliases['--button-primary-radius']).toBe('--radius-full');
    expect(existsSync(join(root, 'component-configs/button/adjusted.json'))).toBe(false);
    expect(activeOf(root, 'button')).toBe('pill-buttons');
    expect(activeOf(root, 'card')).toBe('default');
  });

  it('leaves the active pointer alone with activate false', async () => {
    const root = fixture();
    await run(root, { ops: [{ kind: 'radius', shift: 1 }] }, { activate: false });

    expect(existsSync(join(root, 'component-configs/button/adjusted.json'))).toBe(true);
    expect(activeOf(root, 'button')).toBe('default');
  });

  it('writes nothing on a dry run', async () => {
    const root = fixture();
    const result = await run(root, { ops: [{ kind: 'radius', shift: 1 }] }, { dryRun: true });

    expect(result.totals.components).toBe(2);
    expect(result.activated).toBe(false);
    expect(existsSync(join(root, 'component-configs/button/adjusted.json'))).toBe(false);
    expect(activeOf(root, 'button')).toBe('default');
  });

  it('compounds shifts by reading the now-active config', async () => {
    const root = fixture();
    await run(root, { ops: [{ kind: 'padding', shift: 1 }] });
    await run(root, { ops: [{ kind: 'padding', shift: 1 }] });

    expect(readConfig(root, 'button', 'adjusted').aliases['--button-primary-padding']).toBe('--space-12');
  });

  it('refuses the protected default name', async () => {
    const root = fixture();
    await expect(run(root, { name: 'Default', ops: [{ kind: 'radius', shift: 1 }] })).rejects.toThrow(
      /protected package config/,
    );
    expect(existsSync(join(root, 'component-configs/button/default.json'))).toBe(true);
    expect(readConfig(root, 'button', 'default').aliases['--button-primary-radius']).toBe('--radius-xl');
  });

  it('surfaces engine validation errors intact', async () => {
    const root = fixture();
    await expect(run(root, { ops: [{ kind: 'shadow', shift: 1 }] })).rejects.toThrow(/Unknown kind "shadow"/);
    await expect(run(root, { ops: [{ target: 'nope', kind: 'radius', shift: 1 }] })).rejects.toThrow(
      /Unknown target component "nope"/,
    );
    expect(existsSync(join(root, 'component-configs/button/adjusted.json'))).toBe(false);
  });

  it('rejects an ops file with no ops', async () => {
    const root = fixture();
    await expect(run(root, { ops: [] })).rejects.toThrow(/non-empty "ops" array/);
  });
});

describe('formatAdjustResult', () => {
  it('marks a snap that moves against the requested shift', async () => {
    const root = fixture();
    const result = await run(root, { ops: [{ kind: 'padding', shift: 1 }] }, { dryRun: true });
    const out = formatAdjustResult(result);

    expect(out).toContain('! --card-hero-padding');
    expect(out).toContain('--space-64 → --space-48');
    expect(out).toContain('against the requested shift');
    expect(out).toContain('  --button-primary-padding');
    expect(out).not.toContain('! --button-primary-padding');
    expect(out).toContain('2 component(s) changed, 2 alias(es), 0 skipped.');
  });

  it('groups skips by reason and names the previous active config', async () => {
    const root = project({
      button: {
        '--button-primary-radius': '--radius-4xl',
        '--button-pill-radius': '--radius-full',
        '--button-ghost-radius': 'clamp(4px, 1vw, 12px)',
      },
    });
    const out = formatAdjustResult(await run(root, { ops: [{ kind: 'radius', shift: 1 }] }));

    expect(out).toContain('button  (active: default)');
    expect(out).toContain('skipped, raw value, not a token: --button-ghost-radius');
    expect(out).toContain('skipped, already at the ladder end: --button-primary-radius');
    expect(out).toContain('skipped, pill preserved (pass "full": true to move it): --button-pill-radius');
    expect(out).toContain('0 component(s) changed, 0 alias(es), 3 skipped.');
    expect(out).toContain('Nothing to change');
  });
});
