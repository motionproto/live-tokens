import fs from 'fs';
import path from 'path';

export interface LiveTokensFileConfig {
  dataDir?: string;
  themesDir?: string;
  componentConfigsDir?: string;
  manifestsDir?: string;
  /**
   * Path to the developer-authored `tokens.css`. The dev plugin takes this from
   * its `themeFileApi({ tokensCssPath })` option; the standalone `live-tokens
   * migrate` CLI has no plugin options, so it reads this key to locate the file.
   */
  tokensCssPath?: string;
}

export interface ResolveDataDirsInput {
  dataDir?: string;
  themesDir?: string;
  componentConfigsDir?: string;
  manifestsDir?: string;
}

export interface ResolvedDataDirs {
  dataDir: string;
  themesDir: string;
  componentConfigsDir: string;
  manifestsDir: string;
}

const DEFAULT_DATA_DIR = 'src/live-tokens/data';

const KNOWN_CONFIG_KEYS = new Set<keyof LiveTokensFileConfig>([
  'dataDir',
  'themesDir',
  'componentConfigsDir',
  'manifestsDir',
  'tokensCssPath',
]);

/**
 * Read `live-tokens.config.json` from cwd. Missing file, unparseable JSON, or
 * non-object content all degrade to `{}` — the file is strictly optional.
 *
 * Read once per process and cached: vite dev servers are long-running and
 * re-reading on every plugin-init or pruning-marker resolution would be wasted
 * work. Restart the dev server to pick up config changes.
 *
 * Logs a one-line warning per unrecognised key so typos (`themesDr`,
 * `compoenntConfigsDir`) don't silently degrade to defaults — the consumer
 * would think their config applied when it didn't. `$schema` is ignored as a
 * common IDE-hint convention.
 */
let cached: LiveTokensFileConfig | null = null;
export function readLiveTokensConfig(): LiveTokensFileConfig {
  if (cached) return cached;
  try {
    const configPath = path.resolve('live-tokens.config.json');
    if (!fs.existsSync(configPath)) return (cached = {});
    const parsed = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
    if (!parsed || typeof parsed !== 'object') return (cached = {});
    const unknown = Object.keys(parsed).filter(
      (k) => k !== '$schema' && !KNOWN_CONFIG_KEYS.has(k as keyof LiveTokensFileConfig),
    );
    if (unknown.length > 0) {
      console.warn(
        `[live-tokens] Unknown key(s) in live-tokens.config.json: ${unknown.join(', ')}. ` +
          `Known keys: ${Array.from(KNOWN_CONFIG_KEYS).join(', ')}.`,
      );
    }
    cached = parsed as LiveTokensFileConfig;
    return cached;
  } catch {
    return (cached = {});
  }
}

/** Test-only: clear the config cache so subsequent reads pick up file changes. */
export function _resetLiveTokensConfigCache(): void {
  cached = null;
}

/**
 * Resolve the four data directories for a single plugin/preprocessor.
 *
 * Per-folder resolution order (most specific wins):
 *   1. explicit opts (e.g. `opts.themesDir`)
 *   2. `live-tokens.config.json` field (e.g. `fileConfig.themesDir`)
 *   3. `<dataDir>/<sub>` where dataDir comes from opts > config file > the
 *      package default (`src/live-tokens/data`)
 *
 * This lets a consumer set `dataDir` once and have all three subfolders move
 * together, while still allowing per-folder overrides for unusual layouts
 * (e.g. a monorepo where themes are shared across packages but
 * component-configs aren't).
 *
 * All returned paths are absolute (resolved via `path.resolve` against cwd).
 */
export function resolveDataDirs(opts: ResolveDataDirsInput = {}): ResolvedDataDirs {
  const fileConfig = readLiveTokensConfig();
  const dataDirRaw = opts.dataDir ?? fileConfig.dataDir ?? DEFAULT_DATA_DIR;
  const dataDir = path.resolve(dataDirRaw);
  const sub = (name: string) => path.resolve(dataDir, name);

  return {
    dataDir,
    themesDir: opts.themesDir
      ? path.resolve(opts.themesDir)
      : fileConfig.themesDir
        ? path.resolve(fileConfig.themesDir)
        : sub('themes'),
    componentConfigsDir: opts.componentConfigsDir
      ? path.resolve(opts.componentConfigsDir)
      : fileConfig.componentConfigsDir
        ? path.resolve(fileConfig.componentConfigsDir)
        : sub('component-configs'),
    manifestsDir: opts.manifestsDir
      ? path.resolve(opts.manifestsDir)
      : fileConfig.manifestsDir
        ? path.resolve(fileConfig.manifestsDir)
        : sub('manifests'),
  };
}
