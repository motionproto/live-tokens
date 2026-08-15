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

describe('isPackageFile', () => {
  it('is true for a package file with no local copy', () => {
    const r = versionedFileResourceServer({ dir: localDir, packageDir });
    write(packageDir, 'ocean', {});
    expect(r.isPackageFile('ocean')).toBe(true);
  });

  it('is false once a local copy shadows it', () => {
    const r = versionedFileResourceServer({ dir: localDir, packageDir });
    write(packageDir, 'ocean', {});
    write(localDir, 'ocean', {});
    expect(r.isPackageFile('ocean')).toBe(false);
  });

  it('is false for a local-only file', () => {
    const r = versionedFileResourceServer({ dir: localDir, packageDir });
    write(localDir, 'mine', {});
    expect(r.isPackageFile('mine')).toBe(false);
  });

  it('falls back to path identity in the self-dir case with no owned-names list', () => {
    const r = versionedFileResourceServer({ dir: localDir, packageDir: localDir });
    write(localDir, 'ocean', {});
    expect(r.isPackageFile('ocean')).toBe(true);
  });

  it('uses the owned-names list in the self-dir case, so user files stay user files', () => {
    const r = versionedFileResourceServer({
      dir: localDir,
      packageDir: localDir,
      packageOwnedNames: ['ocean'],
    });
    write(localDir, 'ocean', {});
    write(localDir, 'my-theme', {});
    expect(r.isPackageFile('ocean')).toBe(true);
    expect(r.isPackageFile('my-theme')).toBe(false);
  });

  it('ignores the owned-names list when the dirs differ', () => {
    const r = versionedFileResourceServer({
      dir: localDir,
      packageDir,
      packageOwnedNames: ['mine'],
    });
    write(localDir, 'mine', {});
    expect(r.isPackageFile('mine')).toBe(false);
  });

  it('is false with no package dir at all', () => {
    const r = versionedFileResourceServer({ dir: localDir });
    write(localDir, 'mine', {});
    expect(r.isPackageFile('mine')).toBe(false);
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

describe('the working buffer', () => {
  it('reads back what was written', () => {
    const r = versionedFileResourceServer({ dir: localDir, packageDir });
    r.writeWorking({ name: 'Buffer' });
    expect(r.readWorking()).toEqual({ name: 'Buffer' });
  });

  it('reads null when there is none', () => {
    const r = versionedFileResourceServer({ dir: localDir, packageDir });
    expect(r.readWorking()).toBeNull();
  });

  it('never falls back to a package buffer', () => {
    const r = versionedFileResourceServer({ dir: localDir, packageDir });
    write(packageDir, '_working', { name: 'Package buffer' });
    expect(r.readWorking()).toBeNull();
  });

  it('answers presence without parsing', () => {
    const r = versionedFileResourceServer({ dir: localDir, packageDir });
    expect(r.hasWorking()).toBe(false);
    fs.writeFileSync(r.workingPath, '{ not json');
    expect(r.hasWorking()).toBe(true);
  });

  // `null` from readWorking means "no buffer"; a stored scalar would read back
  // as content that is indistinguishable from absence.
  it('throws when the slot holds something other than an object', () => {
    const r = versionedFileResourceServer({ dir: localDir, packageDir });
    fs.writeFileSync(r.workingPath, JSON.stringify('a string'));
    expect(() => r.readWorking()).toThrow();
  });

  it('creates a missing dir on write', () => {
    const fresh = path.join(root, 'fresh');
    const r = versionedFileResourceServer({ dir: fresh });
    r.writeWorking({ name: 'Buffer' });
    expect(fs.existsSync(path.join(fresh, '_working.json'))).toBe(true);
  });

  it('clears the buffer, and clearing nothing is a no-op', () => {
    const r = versionedFileResourceServer({ dir: localDir, packageDir });
    r.writeWorking({ name: 'Buffer' });
    r.clearWorking();
    r.clearWorking();
    expect(fs.existsSync(r.workingPath)).toBe(false);
  });
});

describe('writes and pointers stay local', () => {
  it('filePath always resolves under the local dir', () => {
    const r = versionedFileResourceServer({ dir: localDir, packageDir });
    expect(r.filePath('default')).toBe(path.join(localDir, 'default.json'));
  });

  it('activePath / productionPath / workingPath resolve under the local dir', () => {
    const r = versionedFileResourceServer({ dir: localDir, packageDir });
    expect(r.activePath).toBe(path.join(localDir, '_active.json'));
    expect(r.productionPath).toBe(path.join(localDir, '_production.json'));
    expect(r.workingPath).toBe(path.join(localDir, '_working.json'));
  });

  it('setActiveName / setProductionName / writeWorking write under local, never package', () => {
    const r = versionedFileResourceServer({ dir: localDir, packageDir });
    r.setActiveName('custom');
    r.setProductionName('custom');
    r.writeWorking({ name: 'Buffer' });
    expect(fs.existsSync(path.join(localDir, '_active.json'))).toBe(true);
    expect(fs.existsSync(path.join(localDir, '_production.json'))).toBe(true);
    expect(fs.existsSync(path.join(localDir, '_working.json'))).toBe(true);
    expect(fs.readdirSync(packageDir)).toEqual([]);
  });
});
