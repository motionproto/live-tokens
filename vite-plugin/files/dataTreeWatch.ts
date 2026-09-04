import fs from 'fs';
import path from 'path';

export interface DataTreeWatchOptions {
  /** Directories watched recursively. A missing one is skipped. */
  dirs: string[];
  /** Which files count. Every other change under `dirs` is ignored. */
  isLive: (file: string) => boolean;
  debounceMs?: number;
}

export interface DataTreeWatch {
  /**
   * Record a write the server made itself. The watcher reports a file only
   * when its content differs from what the server last put there, so the
   * editor never receives its own save back.
   */
  noteOwnWrite(file: string): void;
  /** Listen for outside changes. The first listener starts the watchers, the
   *  last one leaving closes them. */
  subscribe(listener: () => void): () => void;
}

/** Absent files fingerprint as `null`, so a delete counts as a change. */
function fingerprint(file: string): string | null {
  try {
    return fs.readFileSync(file, 'utf-8');
  } catch {
    return null;
  }
}

export function dataTreeWatch(opts: DataTreeWatchOptions): DataTreeWatch {
  const debounceMs = opts.debounceMs ?? 100;
  const ownWrites = new Map<string, string | null>();
  const listeners = new Set<() => void>();
  let watchers: fs.FSWatcher[] = [];
  let timer: NodeJS.Timeout | null = null;

  function noteOwnWrite(file: string): void {
    const resolved = path.resolve(file);
    ownWrites.set(resolved, fingerprint(resolved));
  }

  function onEvent(dir: string, filename: string | Buffer | null): void {
    // A platform that reports no name cannot be reconciled against own writes,
    // and reporting anyway would hand every editor save back to the editor.
    if (!filename) return;
    const file = path.resolve(dir, filename.toString());
    if (!opts.isLive(file)) return;
    if (ownWrites.has(file) && ownWrites.get(file) === fingerprint(file)) return;
    ownWrites.delete(file);
    if (timer) clearTimeout(timer);
    timer = setTimeout(() => {
      timer = null;
      for (const listener of listeners) listener();
    }, debounceMs);
  }

  function start(): void {
    for (const dir of opts.dirs) {
      if (!fs.existsSync(dir)) continue;
      const watcher = fs.watch(dir, { recursive: true, persistent: false }, (_event, filename) =>
        onEvent(dir, filename),
      );
      watcher.on('error', () => watcher.close());
      watchers.push(watcher);
    }
  }

  function stop(): void {
    for (const watcher of watchers) watcher.close();
    watchers = [];
    if (timer) clearTimeout(timer);
    timer = null;
  }

  function subscribe(listener: () => void): () => void {
    if (listeners.size === 0) start();
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
      if (listeners.size === 0) stop();
    };
  }

  return { noteOwnWrite, subscribe };
}
