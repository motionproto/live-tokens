import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { versionedFileResourceServer } from './versionedFileResourceServer';

let root: string;
let localDir: string;
let packageDir: string;

beforeEach(() => {
  root = fs.mkdtempSync(path.join(os.tmpdir(), 'vfrs-'));
  localDir = path.join(root, 'local');
  packageDir = path.join(root, 'package');
  fs.mkdirSync(localDir, { recursive: true });
  fs.mkdirSync(packageDir, { recursive: true });
});

afterEach(() => {
  fs.rmSync(root, { recursive: true, force: true });
});

const write = (dir: string, name: string, data: unknown) =>
  fs.writeFileSync(path.join(dir, `${name}.json`), JSON.stringify(data));

describe('existingPath', () => {
  it('resolves to the local file when present', () => {
    const r = versionedFileResourceServer({ dir: localDir, packageDir });
    write(localDir, 'default', { a: 1 });
    expect(r.existingPath('default')).toBe(path.join(localDir, 'default.json'));
  });

  it('falls back to the package file when local is absent', () => {
    const r = versionedFileResourceServer({ dir: localDir, packageDir });
    write(packageDir, 'default', { a: 1 });
    expect(r.existingPath('default')).toBe(path.join(packageDir, 'default.json'));
  });

  it('prefers local over package (local shadows package)', () => {
    const r = versionedFileResourceServer({ dir: localDir, packageDir });
    write(localDir, 'default', { from: 'local' });
    write(packageDir, 'default', { from: 'package' });
    expect(r.existingPath('default')).toBe(path.join(localDir, 'default.json'));
  });

  it('returns null when neither local nor package has it', () => {
    const r = versionedFileResourceServer({ dir: localDir, packageDir });
    expect(r.existingPath('nope')).toBeNull();
  });

  it('returns null with no packageDir and no local file', () => {
    const r = versionedFileResourceServer({ dir: localDir });
    expect(r.existingPath('default')).toBeNull();
  });
});

describe('readJson', () => {
  it('reads and parses the local file', () => {
    const r = versionedFileResourceServer({ dir: localDir, packageDir });
    write(localDir, 'default', { from: 'local' });
    expect(r.readJson('default')).toEqual({ from: 'local' });
  });

  it('falls back to the package file', () => {
    const r = versionedFileResourceServer({ dir: localDir, packageDir });
    write(packageDir, 'default', { from: 'package' });
    expect(r.readJson('default')).toEqual({ from: 'package' });
  });

  it('returns null when neither exists', () => {
    const r = versionedFileResourceServer({ dir: localDir, packageDir });
    expect(r.readJson('nope')).toBeNull();
  });

  it('throws on a corrupt resolved file and does NOT fall back to package', () => {
    const r = versionedFileResourceServer({ dir: localDir, packageDir });
    fs.writeFileSync(path.join(localDir, 'default.json'), '{ not json');
    write(packageDir, 'default', { from: 'package' });
    expect(() => r.readJson('default')).toThrow();
  });
});

describe('listNames', () => {
  it('unions local then package basenames (local first), excluding pointers', () => {
    const r = versionedFileResourceServer({ dir: localDir, packageDir });
    write(localDir, 'custom', {});
    write(localDir, '_active', { activeFile: 'custom' });
    write(packageDir, 'default', {});
    expect(r.listNames()).toEqual(['custom', 'default']);
  });

  it('dedups names with local shadowing package', () => {
    const r = versionedFileResourceServer({ dir: localDir, packageDir });
    write(localDir, 'default', {});
    write(packageDir, 'default', {});
    expect(r.listNames()).toEqual(['default']);
  });

  it('does not double-list when local === package (library self-fallback)', () => {
    const r = versionedFileResourceServer({ dir: localDir, packageDir: localDir });
    write(localDir, 'default', {});
    write(localDir, 'custom', {});
    expect(r.listNames().sort()).toEqual(['custom', 'default']);
  });

  it('tolerates a missing package dir', () => {
    const r = versionedFileResourceServer({
      dir: localDir,
      packageDir: path.join(root, 'does-not-exist'),
    });
    write(localDir, 'custom', {});
    expect(r.listNames()).toEqual(['custom']);
  });

  it('tolerates a missing local dir', () => {
    const r = versionedFileResourceServer({ dir: path.join(root, 'no-local'), packageDir });
    write(packageDir, 'default', {});
    expect(r.listNames()).toEqual(['default']);
  });
});

describe('writes and pointers stay local', () => {
  it('filePath always resolves under the local dir', () => {
    const r = versionedFileResourceServer({ dir: localDir, packageDir });
    expect(r.filePath('default')).toBe(path.join(localDir, 'default.json'));
  });

  it('activePath / productionPath resolve under the local dir', () => {
    const r = versionedFileResourceServer({ dir: localDir, packageDir });
    expect(r.activePath).toBe(path.join(localDir, '_active.json'));
    expect(r.productionPath).toBe(path.join(localDir, '_production.json'));
  });

  it('setActiveName / setProductionName write under local, never package', () => {
    const r = versionedFileResourceServer({ dir: localDir, packageDir });
    r.setActiveName('custom');
    r.setProductionName('custom');
    expect(fs.existsSync(path.join(localDir, '_active.json'))).toBe(true);
    expect(fs.existsSync(path.join(localDir, '_production.json'))).toBe(true);
    expect(fs.existsSync(path.join(packageDir, '_active.json'))).toBe(false);
    expect(fs.existsSync(path.join(packageDir, '_production.json'))).toBe(false);
  });
});
