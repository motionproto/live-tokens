/**
 * Node-side loader for a component's *production* config. Used by the Svelte
 * `replace` preprocessor at build time to resolve PRUNE_FOR marker keys.
 *
 * On-disk layout (mirrored from `vite-plugin/themeFileApi.ts`):
 *   component-configs/<component>/_production.json -> { "productionFile": "<name>" }
 *   component-configs/<component>/<name>.json      -> { aliases: { ... } }
 *
 * The intrinsic CSS-var keys we evaluate (e.g. `--sectiondivider-md-align`)
 * live under `aliases`. Values are usually plain strings (`"start"`, `"none"`)
 * but the alias type is a union — non-string values (e.g. gradient objects)
 * never appear for intrinsics, so we throw if we see one.
 */
import fs from 'node:fs';
import path from 'node:path';
import { resolveDataDirs } from '../files/dataPaths';

interface ProductionConfigOnDisk {
  aliases?: Record<string, unknown>;
}

export interface ProductionConfig {
  /** Plain string CSS-var values keyed by CSS-var name. Non-string alias
   * shapes (gradients, etc.) are filtered out — markers can only key off
   * scalar values. */
  values: Record<string, string>;
}

const cache = new Map<string, ProductionConfig>();

export interface LoadProductionConfigOptions {
  /** Project-root-relative or absolute path to the component-configs root.
   * When omitted, resolved through `live-tokens.config.json` / the package
   * default `src/live-tokens/data/component-configs` — same resolution
   * `themeFileApi` uses, so build-time pruning and the dev-server stay in sync. */
  componentConfigsDir?: string;
}

/**
 * Load a single component's production config. Cached after first read.
 * Throws if the config dir or production file is missing — fail loud, per
 * strict-mode (decision 3 in build-time-pruning-plan.md).
 */
export function loadProductionConfig(
  component: string,
  opts: LoadProductionConfigOptions = {},
): ProductionConfig {
  const cacheKey = `${component}|${opts.componentConfigsDir ?? ''}`;
  const cached = cache.get(cacheKey);
  if (cached) return cached;

  const baseDir = opts.componentConfigsDir
    ? path.resolve(opts.componentConfigsDir)
    : resolveDataDirs().componentConfigsDir;
  const componentDir = path.join(baseDir, component);

  if (!fs.existsSync(componentDir)) {
    throw new Error(
      `[prune-markers] Component config dir not found: ${componentDir}. ` +
        `Marker referenced component "${component}".`,
    );
  }

  const pointerPath = path.join(componentDir, '_production.json');
  let productionFile = 'default';
  if (fs.existsSync(pointerPath)) {
    try {
      const pointer = JSON.parse(fs.readFileSync(pointerPath, 'utf-8'));
      if (typeof pointer?.productionFile === 'string' && pointer.productionFile) {
        productionFile = pointer.productionFile;
      }
    } catch (err) {
      throw new Error(
        `[prune-markers] Failed to parse ${pointerPath}: ${(err as Error).message}`,
      );
    }
  }

  const configPath = path.join(componentDir, `${productionFile}.json`);
  if (!fs.existsSync(configPath)) {
    throw new Error(
      `[prune-markers] Production config file not found: ${configPath}`,
    );
  }

  let raw: ProductionConfigOnDisk;
  try {
    raw = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
  } catch (err) {
    throw new Error(
      `[prune-markers] Failed to parse ${configPath}: ${(err as Error).message}`,
    );
  }

  const values: Record<string, string> = {};
  for (const [k, v] of Object.entries(raw.aliases ?? {})) {
    if (typeof v === 'string') values[k] = v;
    // Non-string aliases (gradient objects, etc.) skipped silently — markers
    // never key off them; if a marker references such a key, the strict-mode
    // lookup in pruneReplace will throw with the bad key.
  }

  const result: ProductionConfig = { values };
  cache.set(cacheKey, result);
  return result;
}

/** Clear the cache. For tests only. */
export function _resetProductionConfigCache(): void {
  cache.clear();
}
