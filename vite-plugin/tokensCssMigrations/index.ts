/**
 * tokens-css migration system — Node-side reconciliation of a consumer's
 * Layer-1 `tokens.css` against the package's evolving token vocabulary.
 *
 * Two entry points consume this module, both in Node:
 *   - the `live-tokens migrate` CLI (applies migrations, writes the file)
 *   - the `themeFileApi` dev plugin (validation-only, warns on boot)
 *
 * It is built as its own vite-free tsup entry (`dist-plugin/tokensCssMigrations`)
 * so the CLI can import it without pulling in `vite`.
 */
import { extractGlobalRootBody } from '../../src/editor/core/themes/parsers/globalRootBlock';
import { collectDefinedTokens, collectReferencedTokens } from './cssTokenOps';
import type { TokensCssMigration } from './types';
import { tokensCssMigration_2026_05_29_typographyScaleAdditions } from './migrations/2026-05-29-typography-scale-additions';
import { tokensCssMigration_2026_05_29_sectiondividerLegacyAxisCleanup } from './migrations/2026-05-29-sectiondivider-legacy-axis-cleanup';
import { tokensCssMigration_2026_06_03_transformScaleAdditions } from './migrations/2026-06-03-transform-scale-additions';
import { tokensCssMigration_2026_06_04_removeDeadSizeIconScale } from './migrations/2026-06-04-remove-dead-size-icon-scale';
import { tokensCssMigration_2026_06_04_easingColorAndTypescaleAdditions } from './migrations/2026-06-04-easing-color-and-typescale-additions';

export type { TokensCssMigration } from './types';
export {
  collectDefinedTokens,
  collectReferencedTokens,
  ensureScale,
  renameToken,
  removeToken,
  removeTokensMatching,
} from './cssTokenOps';
export { readLiveTokensConfig } from '../files/dataPaths';

/**
 * Registered tokens-css migrations, applied in array order. Unlike the
 * versioned data-file migrations, ordering here is explicit (chronological) and
 * every migration is idempotent, so the runner simply folds them left-to-right.
 */
export const TOKENS_CSS_MIGRATIONS: TokensCssMigration[] = [
  tokensCssMigration_2026_05_29_typographyScaleAdditions,
  tokensCssMigration_2026_05_29_sectiondividerLegacyAxisCleanup,
  tokensCssMigration_2026_06_03_transformScaleAdditions,
  tokensCssMigration_2026_06_04_removeDeadSizeIconScale,
  tokensCssMigration_2026_06_04_easingColorAndTypescaleAdditions,
];

export interface RunResult {
  /** The migrated source (identical to input when nothing changed). */
  css: string;
  /** ids of migrations whose `apply` actually changed the source. */
  applied: string[];
  /** True when `css` differs from the input. */
  changed: boolean;
}

/** Fold every registered migration over `css`. Pure and idempotent. */
export function runTokensCssMigrations(css: string): RunResult {
  let out = css;
  const applied: string[] = [];
  for (const m of TOKENS_CSS_MIGRATIONS) {
    const next = m.apply(out);
    if (next !== out) {
      applied.push(m.id);
      out = next;
    }
  }
  return { css: out, applied, changed: out !== css };
}

export interface ComponentSource {
  name: string;
  source: string;
}

export interface MissingToken {
  /** The undefined `--token` a component references. */
  token: string;
  /** Component names whose `:global(:root)` block references it. */
  referencedBy: string[];
}

export interface ValidateInput {
  /** Contents of the consumer's developer-authored `tokens.css`. */
  tokensCss: string;
  /** Contents of the editor-owned `tokens.generated.css`, if present. */
  generatedCss?: string;
  /** Component `.svelte` sources to scan for `:global(:root)` references. */
  componentSources: ComponentSource[];
}

/**
 * Find primitives that components reference but the runtime never defines.
 *
 * "Defined" is the union of: tokens declared in `tokens.css`, in the generated
 * sidecar, and in any component's own `:global(:root)` block (so component →
 * component references don't false-positive). Anything referenced but not in
 * that union is drift — the symptom the consumer sees as blank editor slots.
 */
export function validateTokensCss(input: ValidateInput): MissingToken[] {
  const defined = new Set<string>([
    ...collectDefinedTokens(input.tokensCss),
    ...collectDefinedTokens(input.generatedCss ?? ''),
  ]);

  const referencedBy = new Map<string, Set<string>>();
  for (const { name, source } of input.componentSources) {
    const body = extractGlobalRootBody(source);
    if (!body) continue;
    for (const t of collectDefinedTokens(body)) defined.add(t);
    for (const ref of collectReferencedTokens(body)) {
      let set = referencedBy.get(ref);
      if (!set) referencedBy.set(ref, (set = new Set()));
      set.add(name);
    }
  }

  const missing: MissingToken[] = [];
  for (const [token, names] of referencedBy) {
    if (!defined.has(token)) {
      missing.push({ token, referencedBy: [...names].sort() });
    }
  }
  return missing.sort((a, b) => a.token.localeCompare(b.token));
}
