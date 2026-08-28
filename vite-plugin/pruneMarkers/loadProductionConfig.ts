/**
 * Node-side loader for a component's *production* config. Used by the Svelte
 * `replace` preprocessor at build time to resolve PRUNE_FOR marker keys.
 *
 * Production is one saved theme, read by value:
 *   themes/_production.json      -> { "productionFile": "<slug>" }  (absent: default)
 *   themes/<slug>.json           -> { componentConfigs: { <component>: { aliases } } }
 *
 * Every theme this install writes carries every component by value, but this
 * reads the file straight off disk, ahead of any server-side fill — a
 * hand-authored or pre-migration theme can still omit one, so a missing
 * entry runs `component-configs/<component>/default.json`.
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
  /** Same, for the themes root. */
  themesDir?: string;
}

function readJson(filePath: string): unknown {
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf-8'));
  } catch (err) {
    throw new Error(`[prune-markers] Failed to parse ${filePath}: ${(err as Error).message}`);
  }
}

/**
 * Load a single component's production config. Cached after first read.
 * Throws if the config dir or the production theme is missing — fail loud, per
 * strict-mode (decision 3 in build-time-pruning-plan.md).
 */
export function loadProductionConfig(
  component: string,
  opts: LoadProductionConfigOptions = {},
): ProductionConfig {
  const cacheKey = `${component}|${opts.componentConfigsDir ?? ''}|${opts.themesDir ?? ''}`;
  const cached = cache.get(cacheKey);
  if (cached) return cached;

  const dirs = resolveDataDirs();
  const baseDir = opts.componentConfigsDir ? path.resolve(opts.componentConfigsDir) : dirs.componentConfigsDir;
  const themesDir = opts.themesDir ? path.resolve(opts.themesDir) : dirs.themesDir;
  const componentDir = path.join(baseDir, component);

  if (!fs.existsSync(componentDir)) {
    throw new Error(
      `[prune-markers] Component config dir not found: ${componentDir}. ` +
        `Marker referenced component "${component}".`,
    );
  }

  const pointerPath = path.join(themesDir, '_production.json');
  let productionTheme = 'default';
  if (fs.existsSync(pointerPath)) {
    const pointer = readJson(pointerPath) as { productionFile?: unknown };
    if (typeof pointer?.productionFile === 'string' && pointer.productionFile) {
      productionTheme = pointer.productionFile;
    }
  }

  const themePath = path.join(themesDir, `${productionTheme}.json`);
  if (!fs.existsSync(themePath)) {
    throw new Error(`[prune-markers] Production theme file not found: ${themePath}`);
  }
  const theme = readJson(themePath) as { componentConfigs?: Record<string, unknown> };
  const embedded = theme.componentConfigs?.[component];

  let raw: ProductionConfigOnDisk;
  if (embedded === undefined) {
    const defaultPath = path.join(componentDir, 'default.json');
    if (!fs.existsSync(defaultPath)) {
      throw new Error(`[prune-markers] Component default config not found: ${defaultPath}`);
    }
    raw = readJson(defaultPath) as ProductionConfigOnDisk;
  } else if (embedded && typeof embedded === 'object' && !Array.isArray(embedded)) {
    raw = embedded as ProductionConfigOnDisk;
  } else {
    // Pre-v3 themes named a config file instead of carrying one. Those files
    // are deletable now, so guessing here could prune against a config that no
    // longer exists.
    throw new Error(
      `[prune-markers] Theme "${productionTheme}" names component "${component}" by reference. ` +
        `Start the dev server once (or run \`npx live-tokens migrate\`) to carry it by value.`,
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
