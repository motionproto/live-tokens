// tsup entry: bundles the pure generation pipeline (plus the path/slug helpers
// the CLI needs) into dist-plugin/generateColorsAndType so `bin/generate-theme.mjs`
// imports compiled JS, never the TS sources — the bin/migrate.mjs precedent.

export {
  buildColorsAndTypeFromSeeds,
  type CarryForward,
  type ContrastCheck,
  type GenerateColorsAndTypeReport,
  type GenerateColorsAndTypeResult,
  type ColorsAndTypeBrief,
} from '../../src/editor/core/themes/generateColorsAndType';
export { sanitizeFileName } from '../../src/editor/core/storage/files/versionedFileResourceClient';
export { readLiveTokensConfig, resolveDataDirs } from '../files/dataPaths';
