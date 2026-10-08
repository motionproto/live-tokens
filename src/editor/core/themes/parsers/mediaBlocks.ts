/**
 * `css` with every `@media` block removed. Readers that want a token's declared
 * default go through it, so a breakpoint re-point never stands in for the
 * top-level value.
 *
 * Dependency-free so the vite plugin build can import it, as it does
 * `globalRootBlock`.
 */
export function stripMediaBlocks(css: string): string {
  const kept: string[] = [];
  let from = 0;
  let i = 0;
  while (i < css.length) {
    if (css.startsWith('/*', i)) {
      i = commentEnd(css, i);
    } else if (css[i] === '@' && /^@media\b/i.test(css.slice(i, i + 7))) {
      kept.push(css.slice(from, i));
      i = from = blockEnd(css, i);
    } else {
      i++;
    }
  }
  kept.push(css.slice(from));
  return kept.join('');
}

function commentEnd(css: string, start: number): number {
  const end = css.indexOf('*/', start + 2);
  return end === -1 ? css.length : end + 2;
}

/** Index just past the brace that closes the first block opened at or after `start`. */
function blockEnd(css: string, start: number): number {
  let depth = 0;
  let i = start;
  while (i < css.length) {
    if (css.startsWith('/*', i)) {
      i = commentEnd(css, i);
      continue;
    }
    const c = css[i++];
    if (c === '{') depth++;
    else if (c === '}' && --depth === 0) return i;
  }
  return css.length;
}
