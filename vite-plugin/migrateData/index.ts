// tsup entry: bundles the data-tree heal (plus the path resolution the CLI
// needs) into dist-plugin/migrateData so `bin/migrate.mjs` imports compiled JS,
// never the TS sources — the tokensCssMigrations precedent.

export {
  migrateData,
  type MigrateDataOptions,
  type MigrateDataResult,
} from './migrateData';
export { readLiveTokensConfig, resolveDataDirs } from '../files/dataPaths';
