import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

export interface BuildCheckResult {
  errors: number;
  warnings: number;
  report: string;
}

export interface BuildCheckLogger {
  info(msg: string): void;
  warn(msg: string): void;
  error(msg: string): void;
}

export type BuildCheckRunner = (root: string) => Promise<BuildCheckResult>;

const runPackageChecks: BuildCheckRunner = async (root) => {
  // bin/ ships beside dist-plugin/, and this repo's vite-plugin/ sits at the same depth.
  // Resolved here, not at module scope: the CJS build has no import.meta.url, and
  // a module-scope lookup would make require() of the plugin throw.
  const runner = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', 'bin', 'lib', 'buildChecks.mjs');
  const { runBuildChecks } = await import(pathToFileURL(runner).href);
  return runBuildChecks({ root });
};

/** Returns the message the build stops with, or null when the build may continue. */
export async function checkBeforeBuild({
  root,
  logger,
  run = runPackageChecks,
}: {
  root: string;
  logger: BuildCheckLogger;
  run?: BuildCheckRunner;
}): Promise<string | null> {
  const result = await run(root);
  if (result.errors > 0) {
    logger.error(result.report);
    return (
      `live-tokens: the design checks found ${result.errors} error(s). ` +
      'Run the live-tokens-check-compliance skill, or `npx live-tokens check-page` and ' +
      '`npx live-tokens check-component`, to repair them.'
    );
  }
  (result.warnings > 0 ? logger.warn : logger.info).call(logger, result.report);
  return null;
}
