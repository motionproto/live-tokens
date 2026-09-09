import { afterEach, describe, expect, it } from 'vitest';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { allContracts, CONTRACTS_MODULE_ENV, selectedContracts } from './index';
import type { ComponentContract } from '../componentContract';

const shipped = [{ id: 'badge' }, { id: 'button' }] as ComponentContract[];
const dirs: string[] = [];

function moduleExporting(source: string): string {
  const dir = mkdtempSync(join(tmpdir(), 'lt-contracts-'));
  dirs.push(dir);
  const file = join(dir, 'contracts.mjs');
  writeFileSync(file, source);
  return file;
}

afterEach(() => {
  delete process.env[CONTRACTS_MODULE_ENV];
  delete process.env.LIVE_TOKENS_COMPONENT;
  for (const dir of dirs.splice(0)) rmSync(dir, { recursive: true, force: true });
});

describe('allContracts', () => {
  it('returns the shipped list when no module is named', async () => {
    expect(await allContracts(shipped)).toBe(shipped);
  });

  it('appends the default export of the named module', async () => {
    process.env[CONTRACTS_MODULE_ENV] = moduleExporting("export default [{ id: 'statcard' }];");
    expect((await allContracts(shipped)).map((c) => c.id)).toEqual(['badge', 'button', 'statcard']);
  });

  it('accepts a named contracts export', async () => {
    process.env[CONTRACTS_MODULE_ENV] = moduleExporting("export const contracts = [{ id: 'statcard' }];");
    expect((await allContracts(shipped)).map((c) => c.id)).toEqual(['badge', 'button', 'statcard']);
  });

  it('rejects a module that exports no array', async () => {
    process.env[CONTRACTS_MODULE_ENV] = moduleExporting("export const statcard = { id: 'statcard' };");
    await expect(allContracts(shipped)).rejects.toThrow('does not export a contracts array');
  });
});

describe('selectedContracts', () => {
  it('narrows to a custom component by id', async () => {
    process.env[CONTRACTS_MODULE_ENV] = moduleExporting("export default [{ id: 'statcard' }];");
    process.env.LIVE_TOKENS_COMPONENT = 'statcard';
    expect((await selectedContracts(shipped)).map((c) => c.id)).toEqual(['statcard']);
  });
});
