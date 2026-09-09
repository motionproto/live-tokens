import fs from 'node:fs';
import path from 'node:path';
import { DEFAULT_COMPONENTS_PATH } from '../editor/core/routing/ownedRoutes';
import type { ComponentContract } from './componentContract';

/** The file a project puts its shared test settings in, at the project root. */
export const TESTING_CONFIG_FILE = 'live-tokens.testing.ts';

/** The components route the run drives, published from the settings so the
 *  suites need no argument. */
export const COMPONENTS_PATH_ENV = 'LIVE_TOKENS_COMPONENTS_PATH';

/** Narrows a run to one component. */
export const COMPONENT_ENV = 'LIVE_TOKENS_COMPONENT';

/** What `resolveDataDirs` falls back to, restated because that resolver is
 *  plugin-side and the tarball ships the plugin built rather than as source.
 *  `vite-plugin/testingConfig.test.ts` pins the two together. */
const DEFAULT_DATA_DIR = 'src/live-tokens/data';

const DEFAULT_DEV_COMMAND = 'npm run dev -- --host {host} --port {port}';

export interface LiveTokensTestingConfig {
  /** Vite config a generated Vitest config merges. Default `vite.config.ts`. */
  viteConfig?: string;
  /** Command that starts the dev server. `{host}` and `{port}` are substituted.
   *  Default `npm run dev -- --host {host} --port {port}`. */
  devCommand?: string;
  /** Fixed port for the dev server. Omitted, the run takes a free one. */
  port?: number;
  /** The components route, when `editorRoutes` moved it off the owned default. */
  componentsPath?: string;
  /** The plugin's data directory. Default: `dataDir` from
   *  `live-tokens.config.json`, else `src/live-tokens/data`. The run never uses
   *  it directly; it is the tree the isolated copy is made from. */
  dataDir?: string;
  /** Module that registers the project's components without mounting the app.
   *  The registry contract imports it before it selects entries. */
  registrySetup?: string;
  /** Contracts the component suites run. Default: the shipped contracts. */
  contracts?: ComponentContract[];
}

export interface ResolvedTestingConfig {
  root: string;
  viteConfig: string;
  devCommand: string;
  port?: number;
  componentsPath: string;
  dataDir: string;
  registrySetup?: string;
  contracts?: ComponentContract[];
}

/** Types the settings file without importing the interface by hand. */
export function defineTestingConfig(config: LiveTokensTestingConfig): LiveTokensTestingConfig {
  return config;
}

/** `dataDir` as the plugin resolves it, from the same file the plugin reads. */
function configuredDataDir(root: string): string {
  try {
    const parsed = JSON.parse(fs.readFileSync(path.join(root, 'live-tokens.config.json'), 'utf-8'));
    if (parsed && typeof parsed === 'object' && typeof parsed.dataDir === 'string') {
      return path.resolve(root, parsed.dataDir);
    }
  } catch {
    // Missing or unparseable reads as absent, matching `readLiveTokensConfig`.
  }
  return path.resolve(root, DEFAULT_DATA_DIR);
}

export function resolveTestingConfig(
  config: LiveTokensTestingConfig = {},
  root: string = process.cwd(),
): ResolvedTestingConfig {
  const projectRoot = path.resolve(root);
  return {
    root: projectRoot,
    viteConfig: path.resolve(projectRoot, config.viteConfig ?? 'vite.config.ts'),
    devCommand: config.devCommand ?? DEFAULT_DEV_COMMAND,
    port: config.port,
    componentsPath: config.componentsPath ?? DEFAULT_COMPONENTS_PATH,
    dataDir: config.dataDir ? path.resolve(projectRoot, config.dataDir) : configuredDataDir(projectRoot),
    registrySetup: config.registrySetup
      ? path.resolve(projectRoot, config.registrySetup)
      : undefined,
    contracts: config.contracts,
  };
}

export function devServerCommand(command: string, host: string, port: number): string {
  return command.replaceAll('{host}', host).replaceAll('{port}', String(port));
}
