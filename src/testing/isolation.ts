import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

/**
 * The plugin reads this name ahead of its own options and
 * `live-tokens.config.json`, so setting it redirects every server-side write —
 * the data tree, `tokens.generated.css`, and `fonts.css` — into the copy.
 */
export const TEST_DATA_DIR_ENV = 'LIVE_TOKENS_TEST_DATA_DIR';

/** What the suites and the harness read component configs from in the runner's
 *  own process. It names the same directory and is a separate variable because
 *  it answers a different question: where a reader looks, not where the server
 *  is confined. */
export const DATA_DIR_ENV = 'LIVE_TOKENS_DATA_DIR';

/**
 * A developer's current session rather than the document under test. Each one
 * is gitignored or dev-written, so leaving it in the copy would make the run
 * pass or fail on whichever theme the maintainer has open.
 *
 *   _working.json     an unsaved buffer, which reads as a dirty document and
 *                     can raise a destructive confirmation dialog
 *   _active.json      the theme the editor has open. One carrying a sketchstyle
 *                     boots the suite with the sketch layer on, which paints
 *                     every fill onto a pseudo-element and leaves the real
 *                     background transparent
 *   _production.json  the theme baked into tokens.generated.css
 *
 * A missing pointer resolves to "default" at runtime, so removing them is the
 * whole reset.
 */
const SESSION_FILES = new Set(['_working.json', '_active.json', '_production.json']);

export interface IsolatedData {
  dataDir: string;
  /** True when this process made the copy and owns removing it. */
  created: boolean;
}

let removed = false;

function registerCleanup(dataDir: string): void {
  const remove = () => {
    if (removed) return;
    removed = true;
    fs.rmSync(dataDir, { recursive: true, force: true });
  };
  process.once('exit', remove);
  // Playwright owns the exit path on a signal: it stops the workers and kills
  // the dev server's process group, then exits, which reaches `exit` above.
  // These two only make sure the copy is gone before that teardown starts.
  process.once('SIGINT', remove);
  process.once('SIGTERM', remove);
}

/**
 * Copy `sourceDataDir` into a unique temporary directory and point both the
 * server and the runner at it. Idempotent across processes: Playwright loads
 * the config again in every worker, and each inherits the parent's environment,
 * so only the first call copies anything.
 */
export function isolateDataDir(sourceDataDir: string): IsolatedData {
  const existing = process.env[TEST_DATA_DIR_ENV];
  if (existing) {
    const dataDir = path.resolve(existing);
    if (!fs.existsSync(dataDir)) {
      throw new Error(`${TEST_DATA_DIR_ENV} names ${dataDir}, which does not exist`);
    }
    process.env[DATA_DIR_ENV] = dataDir;
    return { dataDir, created: false };
  }

  const source = path.resolve(sourceDataDir);
  if (!fs.existsSync(source)) {
    throw new Error(
      `No data directory at ${source}. Set \`dataDir\` in live-tokens.testing.ts `
      + 'when the project keeps its live-tokens data somewhere else.',
    );
  }

  // realpath: macOS resolves os.tmpdir() through a symlink, and the plugin
  // compares resolved paths when it decides whether a write is in scope.
  const dataDir = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), 'live-tokens-contract-')));
  fs.cpSync(source, dataDir, { recursive: true });
  for (const entry of fs.readdirSync(dataDir, { recursive: true }) as string[]) {
    if (SESSION_FILES.has(path.basename(entry))) {
      fs.rmSync(path.join(dataDir, entry), { force: true });
    }
  }

  process.env[TEST_DATA_DIR_ENV] = dataDir;
  process.env[DATA_DIR_ENV] = dataDir;
  registerCleanup(dataDir);
  return { dataDir, created: true };
}
