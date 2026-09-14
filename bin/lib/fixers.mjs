// Applies the patches an `auto` finding already computed in its own
// `details.patch`. This module owns none of the per-rule repair logic — that
// lives beside each rule, in bin/rules/, pageSource.mjs, geometry.mjs, and
// catalogue.mjs, since only the rule that found the fault knows its shape.
// This module only knows how to write one down safely.

import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

/** The character offset where 1-based `line` begins. The inverse of
 *  `lineOf` in findings.mjs. */
function offsetOfLine(text, line) {
  let n = 1;
  for (let i = 0; i < text.length; i++) {
    if (n === line) return i;
    if (text[i] === '\n') n++;
  }
  return text.length;
}

/**
 * Writes every `auto` finding's patch, one file at a time.
 *
 * A patch applies at the first occurrence of `from` at or after the finding's
 * own line: the file has moved since the finding was computed, or another
 * patch in the same file shifted text, so a patch whose `from` cannot be
 * found there is not applied and comes back in `skipped` instead of guessing
 * at a different occurrence. Findings within one file apply in line order;
 * none of the four fixers inserts or removes a newline, so an earlier
 * patch's line never moves a later one's.
 */
export function applyFixes(findings, root) {
  const byFile = new Map();
  for (const f of findings) {
    if (f.repair !== 'auto' || !f.details?.patch) continue;
    if (!byFile.has(f.file)) byFile.set(f.file, []);
    byFile.get(f.file).push(f);
  }

  const applied = [];
  const skipped = [];
  for (const [file, list] of byFile) {
    const path = join(root, file);
    if (!existsSync(path)) {
      skipped.push(...list);
      continue;
    }
    let text = readFileSync(path, 'utf8');
    let changed = false;
    for (const finding of list.sort((a, b) => a.line - b.line)) {
      const { from, to } = finding.details.patch;
      const at = text.indexOf(from, offsetOfLine(text, finding.line));
      if (at === -1) {
        skipped.push(finding);
        continue;
      }
      text = text.slice(0, at) + to + text.slice(at + from.length);
      changed = true;
      applied.push(finding);
    }
    if (changed) writeFileSync(path, text);
  }
  return { applied, skipped };
}
