/**
 * Build-time pruning preprocessor entry point.
 *
 * Returns a `[RegExp, ReplaceFn][]` array consumed by `replacePreprocess`
 * (our local stand-in for svelte-preprocess's old `replace` option, since we
 * now preprocess with `vitePreprocess`). The single regex matches a trigger
 * comment and the
 * replacer hands off to a stack-based scanner that resolves arbitrarily
 * nested `<!--PRUNE_FOR ...-->...<!--END_PRUNE-->` blocks. For each block
 * we look up the production config and emit either:
 *   - raw markup (all variants pass),
 *   - empty string (no variants pass),
 *   - `{#if variant === 'X' || ...}<markup>{/if}` (mixed).
 *
 * Pair with `{#if import.meta.env.DEV}<dev branch>{:else}<marked branch>{/if}`
 * at the call site — Vite strips the dev branch in production builds, leaving
 * only the variant-guarded markup.
 *
 * See `temp/build-time-pruning-plan.md` for full design rationale.
 */
import { parsePruneArgs, evaluatePruneMarker, type PruneMarkerArgs } from './parser';
import { loadProductionConfig, type ProductionConfig } from './loadProductionConfig';

export interface BuildPruneReplaceOptions {
  /** Project-root-relative or absolute path. Default: `component-configs`. */
  componentConfigsDir?: string;
}

/** Scan the source for both opens and closes in one pass. Captures `argsRaw`
 * inside the PRUNE_FOR open marker; for END_PRUNE the capture is undefined. */
const SCAN_RE = /<!--\s*PRUNE_FOR\s+([\s\S]*?)\s*-->|<!--\s*END_PRUNE\s*-->/g;

/** A subset of the SCAN_RE pattern, used as the entry-point trigger so
 * `String.prototype.replace` only fires when at least one marker exists. */
const TRIGGER_RE = /<!--\s*PRUNE_FOR\s+[\s\S]*?<!--\s*END_PRUNE\s*-->/;

interface Frame {
  argsRaw: string | null; // null for the root frame
  pieces: string[];
}

export function buildPruneReplace(
  opts: BuildPruneReplaceOptions = {},
): [RegExp, (match: string, ...rest: string[]) => string][] {
  // The trigger regex (no `g` flag) matches at most once; the replacer then
  // takes the *whole* source via the second argument trick: actually
  // String.prototype.replace passes only the matched substring as the first
  // arg, so instead we expose a `_replaceWholeSource` indirection by using a
  // regex that captures everything. Approach: use TRIGGER_RE without `g` to
  // make replace fire once; pull the full source from a closure variable...
  //
  // Simpler approach implemented below: TRIGGER_RE matches only the
  // first-through-last marker region greedily, and we pass that whole region
  // through the scanner. Pre-marker and post-marker text is preserved by the
  // surrounding `String.prototype.replace` itself.
  return [
    [
      // Match the first PRUNE_FOR through the last END_PRUNE in the source.
      // Greedy `[\s\S]*` between them ensures we cover all nested markers.
      /<!--\s*PRUNE_FOR\s+[\s\S]*<!--\s*END_PRUNE\s*-->/,
      (match: string): string => transformMarkers(match, opts),
    ],
  ];
}

function transformMarkers(source: string, opts: BuildPruneReplaceOptions): string {
  const root: Frame = { argsRaw: null, pieces: [] };
  const stack: Frame[] = [root];
  let lastEnd = 0;
  let m: RegExpExecArray | null;
  // Reset stateful regex.
  SCAN_RE.lastIndex = 0;
  while ((m = SCAN_RE.exec(source))) {
    const top = stack[stack.length - 1];
    top.pieces.push(source.slice(lastEnd, m.index));
    const isOpen = m[1] !== undefined;
    if (isOpen) {
      stack.push({ argsRaw: m[1], pieces: [] });
    } else {
      if (stack.length < 2) {
        throw new Error(
          `[prune-markers] Unmatched <!--END_PRUNE--> at position ${m.index}`,
        );
      }
      const closed = stack.pop()!;
      const body = closed.pieces.join('');
      const out = resolveMarker(closed.argsRaw as string, body, opts);
      stack[stack.length - 1].pieces.push(out);
    }
    lastEnd = SCAN_RE.lastIndex;
  }
  if (stack.length > 1) {
    throw new Error(
      `[prune-markers] Unmatched <!--PRUNE_FOR ${stack[stack.length - 1].argsRaw}--> (missing END_PRUNE)`,
    );
  }
  root.pieces.push(source.slice(lastEnd));
  return root.pieces.join('');
}

function resolveMarker(
  argsRaw: string,
  block: string,
  opts: BuildPruneReplaceOptions,
): string {
  const args = parsePruneArgs(argsRaw);
  const config = loadProductionConfig(args.component, {
    componentConfigsDir: opts.componentConfigsDir,
  });

  const variants = extractVariants(args.component, args.key, config, args);
  if (variants.length === 0) {
    throw new Error(
      `[prune-markers] No variant has key "--${args.component}-<variant>-${args.key}" ` +
        `in production config. If the suffix is correct, ensure at least one variant ` +
        `sets it explicitly. Marker: PRUNE_FOR ${args.component} ${args.key} ${args.op} ${formatValue(args.value)}`,
    );
  }

  const passing: string[] = [];
  const unknown: string[] = [];
  for (const variant of variants) {
    const fullKey = `--${args.component}-${variant}-${args.key}`;
    const raw = config.values[fullKey];
    // Marker may supply `default=<v>` to stand in when the variant doesn't
    // set the key — typically the .svelte file's `:root` default. Without
    // one, fall through to the safe-fallback path: we don't know the
    // effective value, so keep the block.
    const value = raw !== undefined ? raw : args.default;
    if (value === undefined) {
      unknown.push(variant);
      continue;
    }
    if (evaluatePruneMarker(args, value)) {
      passing.push(variant);
    }
  }

  const keep = [...passing, ...unknown];
  if (keep.length === 0) return '';
  if (keep.length === variants.length) return block;
  const guards = keep.map((v) => `variant === '${v}'`).join(' || ');
  return `{#if ${guards}}${block}{/if}`;
}

/** Discover variants from any `--<component>-<v>-<anything>` key in the
 * production config. Returns variants where the marker key exists; when
 * `default` is supplied, returns all variants (the default lets us evaluate
 * keys no variant materializes). */
function extractVariants(
  component: string,
  suffix: string,
  config: ProductionConfig,
  args: PruneMarkerArgs,
): string[] {
  const prefix = `--${component}-`;
  const all = new Set<string>();
  const withSuffix = new Set<string>();
  for (const key of Object.keys(config.values)) {
    if (!key.startsWith(prefix)) continue;
    const rest = key.slice(prefix.length);
    const firstDash = rest.indexOf('-');
    if (firstDash <= 0) continue;
    const variant = rest.slice(0, firstDash);
    const tail = rest.slice(firstDash + 1);
    all.add(variant);
    if (tail === suffix) withSuffix.add(variant);
  }
  if (withSuffix.size === 0 && args.default === undefined) return [];
  return Array.from(all);
}

function formatValue(v: string | string[]): string {
  return Array.isArray(v) ? `[${v.join(', ')}]` : v;
}

// Re-export _ for direct testing of the scanner.
export { transformMarkers as _transformMarkers };
