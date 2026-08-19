// tsup entry: bundles the pure ops applier (plus the kind matcher and the path
// resolution the CLI needs) into dist-plugin/adjust so `bin/adjust.mjs`
// imports compiled JS, never the TS sources — the bin/migrate.mjs precedent.

export {
  adjustAliases,
  type AdjustKind,
  type AdjustOp,
  type AdjustReport,
  type AdjustResult,
  type AliasChange,
  type AliasSkip,
  type ComponentReport,
  type SkipReason,
} from '../../src/editor/core/components/adjustAliases';
export { matchesKind } from '../../src/editor/core/components/aliasKinds';
export { readLiveTokensConfig, resolveDataDirs } from '../files/dataPaths';
export { CURRENT_COMPONENT_SCHEMA_VERSION } from '../../src/editor/core/themes/migrations';
