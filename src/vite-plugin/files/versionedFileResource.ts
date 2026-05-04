/**
 * Server-side filesystem helpers for any "versioned file resource" — a
 * directory of `.json` files with a paired `_active.json`, `_production.json`,
 * and `_backups/` directory. Both `themes/` and `component-configs/{comp}/`
 * follow this exact shape; they previously had separate copies of the same
 * code.
 *
 * Pure Node (`fs`, `path`) — no Vite or Svelte coupling, so the tsup
 * ESM+CJS build bundles it cleanly.
 */
import fs from 'fs';
import path from 'path';

/** How many timestamped backups to keep per file. Single source of truth. */
export const BACKUP_RETENTION = 10;

export interface VersionedFileResourceServerOptions {
  /** Absolute path to the directory holding the resource's `.json` files. */
  dir: string;
  /** Absolute path to the `_backups/` directory. Default: `${dir}/_backups`. */
  backupDir?: string;
  /** Default name when `_active.json` / `_production.json` are missing. */
  defaultName?: string;
}

export interface VersionedFileResourceServer {
  readonly dir: string;
  readonly backupDir: string;
  readonly activePath: string;
  readonly productionPath: string;

  /** Create the directory (and pointer files) if missing. Pointer files default
   * to `defaultName`. */
  ensureDir(): void;
  /** Create the `_active.json` and `_production.json` pointer files if missing. */
  ensureMeta(): void;
  /** Resolve the path of a named file (`{name}.json`) inside `dir`. */
  filePath(name: string): string;
  /** Read the active-file pointer, or `defaultName` if missing/corrupt. */
  getActiveName(): string;
  /** Read the production-file pointer, or `defaultName` if missing/corrupt. */
  getProductionName(): string;
  /** Atomically write the active-file pointer. */
  setActiveName(name: string): void;
  /** Atomically write the production-file pointer. */
  setProductionName(name: string): void;
  /** Copy `filePath` into `_backups/` with an ISO-timestamped suffix and trim
   * the per-name history to the most recent `BACKUP_RETENTION`. No-op if the
   * source doesn't exist. */
  backup(filePath: string, name: string): void;
}

/**
 * Bind the helpers above to a single resource directory. The constructor is
 * pure — no filesystem touched until you call a method.
 */
export function versionedFileResourceServer(
  opts: VersionedFileResourceServerOptions,
): VersionedFileResourceServer {
  const dir = opts.dir;
  const backupDir = opts.backupDir ?? path.join(dir, '_backups');
  const activePath = path.join(dir, '_active.json');
  const productionPath = path.join(dir, '_production.json');
  const defaultName = opts.defaultName ?? 'default';

  function ensureDir(): void {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  }

  function ensureMeta(): void {
    if (!fs.existsSync(activePath)) {
      fs.writeFileSync(activePath, JSON.stringify({ activeFile: defaultName }));
    }
    if (!fs.existsSync(productionPath)) {
      fs.writeFileSync(productionPath, JSON.stringify({ productionFile: defaultName }));
    }
  }

  function filePath(name: string): string {
    return path.join(dir, `${name}.json`);
  }

  function getActiveName(): string {
    try {
      const data = JSON.parse(fs.readFileSync(activePath, 'utf-8'));
      return data.activeFile || defaultName;
    } catch {
      return defaultName;
    }
  }

  function getProductionName(): string {
    try {
      const data = JSON.parse(fs.readFileSync(productionPath, 'utf-8'));
      return data.productionFile || defaultName;
    } catch {
      return defaultName;
    }
  }

  function setActiveName(name: string): void {
    fs.writeFileSync(activePath, JSON.stringify({ activeFile: name }));
  }

  function setProductionName(name: string): void {
    fs.writeFileSync(productionPath, JSON.stringify({ productionFile: name }));
  }

  function backup(filePathToBackup: string, name: string): void {
    if (!fs.existsSync(filePathToBackup)) return;
    if (!fs.existsSync(backupDir)) {
      fs.mkdirSync(backupDir, { recursive: true });
    }
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupPath = path.join(backupDir, `${name}_${timestamp}.json`);
    fs.copyFileSync(filePathToBackup, backupPath);

    const allBackups = fs
      .readdirSync(backupDir)
      .filter((f) => f.startsWith(`${name}_`) && f.endsWith('.json'))
      .sort()
      .reverse();
    for (const old of allBackups.slice(BACKUP_RETENTION)) {
      fs.unlinkSync(path.join(backupDir, old));
    }
  }

  return {
    dir,
    backupDir,
    activePath,
    productionPath,
    ensureDir,
    ensureMeta,
    filePath,
    getActiveName,
    getProductionName,
    setActiveName,
    setProductionName,
    backup,
  };
}

/**
 * Trim a flat backup directory (e.g. `_backups/` for tokens.css) to the most
 * recent `BACKUP_RETENTION` files matching `{prefix}_{...}.{ext}`. Mirrors the
 * named-file backup pattern but for the css/single-file case.
 */
export function trimFlatBackups(backupDir: string, prefix: string, ext: string): void {
  if (!fs.existsSync(backupDir)) return;
  const all = fs
    .readdirSync(backupDir)
    .filter((f) => f.startsWith(`${prefix}_`) && f.endsWith(`.${ext}`))
    .sort()
    .reverse();
  for (const old of all.slice(BACKUP_RETENTION)) {
    fs.unlinkSync(path.join(backupDir, old));
  }
}
