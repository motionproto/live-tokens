// tsup entry: bundles the pure generation pipeline (plus the path/slug helpers
// the CLI needs) into dist-plugin/generateTheme so `bin/generate-theme.mjs`
// imports compiled JS, never the TS sources — the bin/migrate.mjs precedent.

export {
  buildThemeFromSeeds,
  type CarryForward,
  type ContrastCheck,
  type GenerateThemeReport,
  type GenerateThemeResult,
  type ThemeBrief,
} from '../../src/editor/core/themes/generateTheme';
export { sanitizeFileName } from '../../src/editor/core/storage/files/versionedFileResourceClient';
export { readLiveTokensConfig, resolveDataDirs } from '../files/dataPaths';
