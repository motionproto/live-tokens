import fs from 'node:fs';
import path from 'node:path';
import { DEFAULT_COMPONENTS_PATH } from '../editor/core/routing/ownedRoutes';

/** The file a project puts its shared test settings in, at the project root. */
export const TESTING_CONFIG_FILE = 'live-tokens.testing.ts';

/** The components route the run drives, published from the settings so the
 *  suites need no argument. */
export const COMPONENTS_PATH_ENV = 'LIVE_TOKENS_COMPONENTS_PATH';

/** Narrows a run to one component. */
export const COMPONENT_ENV = 'LIVE_TOKENS_COMPONENT';

/** The page targets a run opens, as JSON: `[{ source, route }]`. */
export const PAGES_ENV = 'LIVE_TOKENS_PAGES';

/** The viewports every page rule runs at, as JSON: `[{ width, height }]`. */
export const PAGE_VIEWPORTS_ENV = 'LIVE_TOKENS_PAGE_VIEWPORTS';

export interface PageViewport {
  width: number;
  height: number;
}

/** The contract project's own desktop size, and the phone the text styles
 *  carry media overrides for. Nothing here is derived from a page. */
export const DEFAULT_PAGE_VIEWPORTS: PageViewport[] = [
  { width: 1280, height: 900 },
  { width: 390, height: 844 },
];

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
  /** Module exporting the `ComponentContract[]` a custom component adds to the
   *  shipped list (default export or a named `contracts` export). The suite
   *  files are static Playwright entry points, so an env var naming this path
   *  plus a dynamic import inside `selectedContracts()` is the only way a
   *  custom contract reaches them. */
  contractsModule?: string;
  /** Page source path to the concrete URL that renders it, for a route the
   *  `pages` object cannot express: one served by `resolve()`, or one whose
   *  parameters only the project knows. Page paths are relative to the
   *  project root. */
  pageRoutes?: Record<string, string>;
  /** Replaces the two sizes every page rule runs at. */
  pageViewports?: PageViewport[];
}

export interface ResolvedTestingConfig {
  root: string;
  viteConfig: string;
  devCommand: string;
  port?: number;
  componentsPath: string;
  dataDir: string;
  registrySetup?: string;
  contractsModule?: string;
  pageRoutes: Record<string, string>;
  pageViewports: PageViewport[];
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
    contractsModule: config.contractsModule
      ? path.resolve(projectRoot, config.contractsModule)
      : undefined,
    pageRoutes: config.pageRoutes ?? {},
    pageViewports: config.pageViewports?.length ? config.pageViewports : DEFAULT_PAGE_VIEWPORTS,
  };
}

export function devServerCommand(command: string, host: string, port: number): string {
  return command.replaceAll('{host}', host).replaceAll('{port}', String(port));
}
