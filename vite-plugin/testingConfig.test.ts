/**
 * `resolveTestingConfig` in `src/testing` has to name the same data directory
 * the plugin will use, and it cannot call the plugin's resolver: the tarball
 * ships the plugin built rather than as source. These pin the two copies
 * together, from the side of the dependency that is allowed to cross.
 */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { _resetLiveTokensConfigCache, resolveDataDirs, TEST_DATA_DIR_ENV as PLUGIN_TEST_DATA_DIR_ENV } from './files/dataPaths';
import { resolveTestingConfig } from '../src/testing/config';
import { TEST_DATA_DIR_ENV } from '../src/testing/isolation';

const cwd = process.cwd();

afterEach(() => {
  process.chdir(cwd);
  _resetLiveTokensConfigCache();
});

describe('resolveTestingConfig', () => {
  it('names the directory the plugin resolves, with no config file', () => {
    const tmp = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), 'lt-testing-config-')));
    process.chdir(tmp);
    _resetLiveTokensConfigCache();
    expect(resolveTestingConfig({}, tmp).dataDir).toBe(resolveDataDirs().dataDir);
  });

  it('names the directory the plugin resolves, with a dataDir in the config file', () => {
    const tmp = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), 'lt-testing-config-')));
    fs.writeFileSync(path.join(tmp, 'live-tokens.config.json'), JSON.stringify({ dataDir: 'design/data' }));
    process.chdir(tmp);
    _resetLiveTokensConfigCache();
    expect(resolveTestingConfig({}, tmp).dataDir).toBe(resolveDataDirs().dataDir);
    expect(resolveTestingConfig({}, tmp).dataDir).toBe(path.join(tmp, 'design/data'));
  });

  it('takes an explicit dataDir over the config file', () => {
    const tmp = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), 'lt-testing-config-')));
    fs.writeFileSync(path.join(tmp, 'live-tokens.config.json'), JSON.stringify({ dataDir: 'design/data' }));
    expect(resolveTestingConfig({ dataDir: 'elsewhere' }, tmp).dataDir).toBe(path.join(tmp, 'elsewhere'));
  });
});

describe('the isolation variable', () => {
  it('is the name the plugin reads', () => {
    expect(TEST_DATA_DIR_ENV).toBe(PLUGIN_TEST_DATA_DIR_ENV);
  });
});
