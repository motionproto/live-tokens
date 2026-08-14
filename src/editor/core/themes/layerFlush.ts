/**
 * Where the editor's unsaved colors and type go when the Theme panel captures
 * or ships. The panel writes files the user never named, so both decisions are
 * pure and pinned here rather than inline in the component.
 */

/** Step past anything already on disk rather than clobbering an earlier file. */
export function freshName(base: string, taken: Set<string>): string {
  if (!taken.has(base)) return base;
  for (let n = 1; n < 1000; n++) {
    const candidate = `${base}_${String(n).padStart(2, '0')}`;
    if (!taken.has(candidate)) return candidate;
  }
  return `${base}_${Date.now()}`;
}

export interface LayerFlushTarget {
  fileName: string;
  displayName: string;
}

/**
 * The file the colors and type on screen flush to. Normally the active layer
 * file, under its own name. The protected default cannot be written, so a
 * flush over it forks to a file of the user's own; the caller sets active to
 * the fork, which is what `persistColorsAndType` does.
 */
export function layerFlushTarget(
  activeFileName: string,
  activeDisplayName: string,
  taken: Iterable<string>,
): LayerFlushTarget {
  if (activeFileName !== 'default') {
    return { fileName: activeFileName, displayName: activeDisplayName };
  }
  return { fileName: freshName('my-colors', new Set(taken)), displayName: 'My Colors' };
}
