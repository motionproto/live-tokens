// @vitest-environment happy-dom
/**
 * The registry contract, run against the project's own registrations.
 *
 * The setup module is what puts a consumer's components in the registry.
 * Importing an editor does not register it, and importing the app's entry point
 * would mount the app, so the project names a module that registers and stops
 * there. Without one, the run covers the components the package registers
 * itself.
 */
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { describe, expect, it } from 'vitest';
import { checkRegistryEntry } from '../editor/component-editor/contract';
import { getComponentRegistryEntries } from '../editor/component-editor/registry';
// @ts-expect-error — plain .mjs module, no types
import { discoverComponents } from '../../bin/check-component.mjs';

const REGISTRY_SETUP_ENV = 'LIVE_TOKENS_REGISTRY_SETUP';

const setupModule = process.env[REGISTRY_SETUP_ENV];
if (setupModule) await import(pathToFileURL(path.resolve(setupModule)).href);

/** `<package>/src/testing/` is this file's directory in the repository and in
 *  an installed copy alike, so the package root is two levels up. */
const packageRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const consumerRoot = process.cwd();
const componentConfigsDir = path.resolve(
  process.env.LIVE_TOKENS_DATA_DIR ?? 'src/live-tokens/data',
  'component-configs',
);

const entries = getComponentRegistryEntries();
const requested = process.env.LIVE_TOKENS_COMPONENT;
const targets = requested ? entries.filter((entry) => entry.id === requested) : entries;

/** Ids authored in this project. `discoverComponents` reports the runtime and
 *  editor pair on disk, which is a different question from what the registry
 *  holds: a component can exist as files and never be registered. */
const authored: string[] = discoverComponents(consumerRoot);

describe('component registry contract', () => {
  it('selects at least one component', () => {
    expect(
      targets.map((entry) => entry.id),
      requested
        ? `no component is registered under the id "${requested}"`
        : 'no component is registered',
    ).not.toEqual([]);
  });

  it('registers every component authored in the project', () => {
    const ids = new Set(entries.map((entry) => entry.id));
    expect(authored.filter((id) => !ids.has(id))).toEqual([]);
  });

  describe.each(targets.map((entry) => [entry.id, entry] as const))('%s', (_id, entry) => {
    it('meets the registry contract', () => {
      // A shipped component's `sourceFile` is relative to the package; a
      // consumer's is relative to their own project.
      const projectRoot = entry.origin === 'system' ? packageRoot : consumerRoot;
      expect(checkRegistryEntry(entry, { projectRoot, componentConfigsDir })).toEqual([]);
    });
  });
});
