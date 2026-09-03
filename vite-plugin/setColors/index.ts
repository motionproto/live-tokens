// tsup entry: bundles the pure color pipeline (plus the path/slug helpers the
// CLI needs) into dist-plugin/setColors so `bin/set-colors.mjs` imports
// compiled JS, never the TS sources — the bin/migrate.mjs precedent.
// `bin/save-theme.mjs` loads this bundle too, for the slug helper, the
// component schema stamp, and the dir resolution; there is no fourth bundle.

export {
  buildColors,
  type CarryForward,
  type ContrastCheck,
  type BuildColorsReport,
  type BuildColorsResult,
  type ColorsInput,
  type ColorsState,
} from '../../src/editor/core/themes/buildColors';
export { sanitizeFileName } from '../../src/editor/core/storage/files/versionedFileResourceClient';
export { readLiveTokensConfig, resolveDataDirs } from '../files/dataPaths';
export { CURRENT_COMPONENT_SCHEMA_VERSION } from '../../src/editor/core/themes/migrations';
