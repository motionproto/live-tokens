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
  return foldMigrations(css, () => true);
}

/**
 * Fold only the `additive` migrations. Additive changes only insert new token
 * names, so applying them to a consumer's vendored `tokens.css` is always
 * backward-compatible — this is what the dev plugin's `autoMigrate` runs. The
 * `breaking` migrations (rename/remove) are deliberately skipped; they ride an
 * explicit `live-tokens migrate` during a major upgrade.
 */
export function runAdditiveTokensCssMigrations(css: string): RunResult {
  return foldMigrations(css, (m) => m.kind === 'additive');
}

function foldMigrations(css: string, include: (m: TokensCssMigration) => boolean): RunResult {
  let out = css;
  const applied: string[] = [];
  for (const m of TOKENS_CSS_MIGRATIONS) {
    if (!include(m)) continue;
    const next = m.apply(out);
    if (next !== out) {
      applied.push(m.id);
      out = next;
    }
  }
  return { css: out, applied, changed: out !== css };
}

export interface ContractViolation {
  id: string;
  /** Token names the migration removed or renamed away despite declaring `additive`. */
  removed: string[];
}

/**
 * Guardrail for the token-as-API contract: an `additive` migration must never
 * remove or rename a token. We verify behaviorally rather than trusting the
 * label — apply each additive migration to the package's own canonical
 * `tokens.css` (which defines the full current vocabulary) and flag any token
 * that disappears. A rename surfaces as the removal of its old name, so it is
 * caught too. This catches the dangerous direction: a breaking change shipped as
 * a backward-compatible one. (Over-labeling a no-op as `breaking` is harmless
 * and not checked.)
 */
export function findContractViolations(canonicalCss: string): ContractViolation[] {
  const violations: ContractViolation[] = [];
  for (const m of TOKENS_CSS_MIGRATIONS) {
    if (m.kind !== 'additive') continue;
    const before = collectDefinedTokens(canonicalCss);
    const after = collectDefinedTokens(m.apply(canonicalCss));
    const removed = [...before].filter((t) => !after.has(t)).sort();
    if (removed.length) violations.push({ id: m.id, removed });
  }
  return violations;
}

export type SemverBump = 'major' | 'minor' | 'patch' | 'none';

/** Classify the bump from `prev` to `next` (leading `v` and pre-release tags ignored). */
export function semverBumpType(prev: string, next: string): SemverBump {
  const p = parseSemver(prev);
  const n = parseSemver(next);
  if (n.major > p.major) return 'major';
  if (n.major === p.major && n.minor > p.minor) return 'minor';
  if (n.major === p.major && n.minor === p.minor && n.patch > p.patch) return 'patch';
  return 'none';
}

function parseSemver(v: string): { major: number; minor: number; patch: number } {
  const [core] = v.replace(/^v/, '').split(/[-+]/);
  const [major = 0, minor = 0, patch = 0] = core.split('.').map((n) => Number(n) || 0);
  return { major, minor, patch };
}

export interface BreakingGateResult {
  level: 'ok' | 'warn' | 'error';
  breakingIds: string[];
  bump: SemverBump;
  message: string;
}

/**
 * The version side of the token contract: a `breaking` migration introduced in a
 * release requires a major version bump. Pre-1.0 (next major is 0) this is only
 * a warning, since semver permits breaking changes in 0.x minors; from 1.0.0 on
 * it is an error. Pure so the release check and its tests share one rule.
 */
export function enforceBreakingRequiresMajor(args: {
  newMigrations: TokensCssMigration[];
  prevVersion: string;
  nextVersion: string;
}): BreakingGateResult {
  const breakingIds = args.newMigrations.filter((m) => m.kind === 'breaking').map((m) => m.id);
  const bump = semverBumpType(args.prevVersion, args.nextVersion);
  if (breakingIds.length === 0 || bump === 'major') {
    return { level: 'ok', breakingIds, bump, message: '' };
  }
  const pre1 = parseSemver(args.nextVersion).major < 1;
  const ids = breakingIds.join(', ');
  return {
    level: pre1 ? 'warn' : 'error',
    breakingIds,
    bump,
    message:
      `Breaking token migration(s) [${ids}] are shipping in a ${bump} bump ` +
      `(${args.prevVersion} -> ${args.nextVersion}). Token names are public API; ` +
      (pre1
        ? `pre-1.0 this is allowed, but the CHANGELOG must flag it under "Changed (breaking)".`
        : `from 1.0.0 a breaking token change requires a major bump.`),
  };
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
