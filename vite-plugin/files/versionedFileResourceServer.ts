/**
 * Server-side filesystem helpers for any "versioned file resource" — a
 * directory of `.json` files with a paired `_active.json` and
 * `_production.json` pointer plus a reserved `_working.json` buffer slot.
 * `themes/`, `colors-and-type/` and `component-configs/{comp}/` all share the
 * shape; only `themes/` uses the pointer pair, the layers use the buffer alone.
 *
 * Pure Node (`fs`, `path`) — no Vite or Svelte coupling, so the tsup
 * ESM+CJS build bundles it cleanly.
 */
import fs from 'fs';
import path from 'path';

export interface VersionedFileResourceServerOptions {
  /** Absolute path to the directory holding the resource's `.json` files. */
  dir: string;
  /** Default name when `_active.json` / `_production.json` are missing. */
  defaultName?: string;
  /**
   * Optional read-only package directory. Reads (`existingPath`, `readJson`,
   * `listNames`) fall back to `<packageDir>/{name}.json` when the local file is
   * absent, so a default shipped in the installed package reaches a consumer
   * who has no local copy. Writes and pointer files NEVER target it — the
   * package copy stays immutable, the consumer's local dir owns all state.
   */
  packageDir?: string;
  /**
   * Names the installed package ships for this resource. Only consulted when
   * the local dir and the package dir are the same path (the library repo),
   * where path identity cannot distinguish a shipped file from a user file.
   */
  packageOwnedNames?: string[];
}

export interface VersionedFileResourceServer {
  readonly dir: string;
  readonly activePath: string;
  readonly productionPath: string;
  readonly workingPath: string;

  /** Create the directory (and pointer files) if missing. Pointer files default
   * to `defaultName`. */
  ensureDir(): void;
  /** Create the `_active.json` and `_production.json` pointer files if missing. */
  ensureMeta(): void;
  /** Resolve the WRITE-TARGET path of a named file (`{name}.json`) inside the
   * local `dir`. Always local — never the package fallback. Once `existingPath`
   * / `readJson` exist, any *read* through `filePath` is a smell. */
  filePath(name: string): string;
  /** Resolve a readable path for `{name}.json`: the local file if it exists,
   * else the package file if it exists, else `null`. Existence-only — a parse
   * error never triggers the fallback, so a consumer's broken custom file is
   * not silently masked by the package default. */
  existingPath(name: string): string | null;
  /** `true` when `{name}.json` resolves from the read-only package dir and no
   * distinct local copy shadows it: deleting it is refused, and it is a file
   * the package owns rather than one the user made. In the library repo the
   * local and package dirs are the same directory, so the single file there is
   * the package's. */
  isPackageFile(name: string): boolean;
  /** Read and `JSON.parse` `{name}.json` resolved via `existingPath`. Returns
   * `null` only when neither local nor package has it. Throws (does NOT fall
   * back) on a corrupt resolved file — the path is already pinned to an
   * existing file, so the no-fallback-on-parse-error invariant holds for free.
   * Corruption-tolerant callers wrap in try/catch. */
  readJson(name: string): unknown | null;
  /** Union of file basenames (`.json` stripped, `_*` pointers excluded) from
   * local then package; local shadows package; deduped by name. Tolerates
   * either directory being absent (a consumer ships no package component-config
   * dir, so an unguarded readdir would throw). */
  listNames(): string[];
  /** Read the active-file pointer, or `defaultName` if missing/corrupt. */
  getActiveName(): string;
  /** Read the production-file pointer, or `defaultName` if missing/corrupt. */
  getProductionName(): string;
  /** Atomically write the active-file pointer. */
  setActiveName(name: string): void;
  /** Atomically write the production-file pointer. */
  setProductionName(name: string): void;
  /** `true` when the buffer slot is filled. Absence means "on the saved
   * state", so presence is the answer several doors want without paying for a
   * parse — and without a corrupt buffer taking a listing down. */
  hasWorking(): boolean;
  /** Read the `_working.json` buffer, or `null` when there is none — `null`
   * answers absence alone, never content. Local only: the buffer is the
   * consumer's unsaved edit, so a package copy must never stand in for its
   * absence. Throws on a corrupt file or a non-object payload, same
   * no-silent-fallback rule as `readJson`. */
  readWorking(): Record<string, unknown> | null;
  /** Write the `_working.json` buffer, creating `dir` if it is missing. */
  writeWorking(data: Record<string, unknown>): void;
  /** Delete the `_working.json` buffer. No-op when there is none. */
  clearWorking(): void;
}

/**
 * Bind the helpers above to a single resource directory. The constructor is
 * pure — no filesystem touched until you call a method.
 */
export function versionedFileResourceServer(
  opts: VersionedFileResourceServerOptions,
): VersionedFileResourceServer {
  const dir = opts.dir;
  const activePath = path.join(dir, '_active.json');
  const productionPath = path.join(dir, '_production.json');
  const workingPath = path.join(dir, '_working.json');
  const defaultName = opts.defaultName ?? 'default';
  // Resolve both dirs so the library-repo self-fallback (local === package)
  // is detectable in `listNames` and never double-lists.
  const resolvedDir = path.resolve(dir);
  const resolvedPackageDir = opts.packageDir ? path.resolve(opts.packageDir) : null;

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

  function existingPath(name: string): string | null {
    const local = filePath(name);
    if (fs.existsSync(local)) return local;
    if (resolvedPackageDir) {
      const pkg = path.join(resolvedPackageDir, `${name}.json`);
      if (fs.existsSync(pkg)) return pkg;
    }
    return null;
  }

  function isPackageFile(name: string): boolean {
    if (!resolvedPackageDir) return false;
    const pkg = path.join(resolvedPackageDir, `${name}.json`);
    if (!fs.existsSync(pkg)) return false;
    const local = path.resolve(filePath(name));
    if (local === pkg) {
      // The library repo's local dir IS the package dir, so path identity says
      // nothing there: only the names the package actually ships count as
      // package files, or every user file would vanish from layer listings.
      return opts.packageOwnedNames ? opts.packageOwnedNames.includes(name) : true;
    }
    return !fs.existsSync(local);
  }

  function readJson(name: string): unknown | null {
    const resolved = existingPath(name);
    if (!resolved) return null;
    return JSON.parse(fs.readFileSync(resolved, 'utf-8'));
  }

  function listNames(): string[] {
    const names: string[] = [];
    const seen = new Set<string>();
    const collect = (d: string | null) => {
      if (!d || !fs.existsSync(d)) return;
      for (const f of fs.readdirSync(d)) {
        if (!f.endsWith('.json') || f.startsWith('_')) continue;
        const name = f.slice(0, -'.json'.length);
        if (seen.has(name)) continue;
        seen.add(name);
        names.push(name);
      }
    };
    collect(resolvedDir);
    if (resolvedPackageDir && resolvedPackageDir !== resolvedDir) collect(resolvedPackageDir);
    return names;
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

  function hasWorking(): boolean {
    return fs.existsSync(workingPath);
  }

  function readWorking(): Record<string, unknown> | null {
    if (!fs.existsSync(workingPath)) return null;
    const parsed = JSON.parse(fs.readFileSync(workingPath, 'utf-8'));
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
      // Absence is the only meaning `null` carries, so a slot holding `null`
      // (or a scalar, or an array) is corruption to report, not emptiness.
      throw new Error(`${workingPath} does not hold a JSON object`);
    }
    return parsed as Record<string, unknown>;
  }

  function writeWorking(data: Record<string, unknown>): void {
    ensureDir();
    fs.writeFileSync(workingPath, JSON.stringify(data, null, 2));
  }

  function clearWorking(): void {
    if (fs.existsSync(workingPath)) fs.unlinkSync(workingPath);
  }

  return {
    dir,
    activePath,
    productionPath,
    workingPath,
    ensureDir,
    ensureMeta,
    filePath,
    existingPath,
    isPackageFile,
    readJson,
    listNames,
    getActiveName,
    getProductionName,
    setActiveName,
    setProductionName,
    hasWorking,
    readWorking,
    writeWorking,
    clearWorking,
  };
}
