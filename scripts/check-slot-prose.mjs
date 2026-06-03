#!/usr/bin/env node
// Fail if a slot-rendering component hand-rolls the slot-prose pin instead of
// `@include slot-prose`.
//
// Components that slot the consumer's raw HTML into light DOM must pin their
// owned body type axes onto p/ul/ol/li, or a consumer's global element rules
// (site.css `p`, `ul li`, …) repaint the slot — the original serif-card bug.
// That pin lives in ONE place, src/system/styles/_slot-prose.scss, applied via
// `@include slot-prose`. Hand-copying it drifts (three diverging copies shipped
// before this guard). This fails the build if a copy comes back.
//
// Signal: a `:global(p|ul|ol|li)` rule whose body sets an axis to the literal
// `inherit` keyword — the sledgehammer's signature. Legitimate slot styling
// uses concrete token values (`var(--space-16)`, `var(--ui-font-size-xs)`),
// never `inherit`, so a component styling its own slotted prose with tokens is
// not flagged. A `<style>` that `@use`s the mixin is the sanctioned path and is
// skipped.
//
// Scope: src/system + src/demo — the surfaces that slot consumer content and
// face site.css. The editor (src/editor) is excluded: it is theme-isolated
// (see check-editor-font-isolation) and styles its own rendered markdown prose
// with --ui-*/theme tokens, never `inherit`.

import { readdir, readFile } from 'node:fs/promises';
import { join, relative } from 'node:path';

const ROOT = new URL('..', import.meta.url).pathname;
const SCAN_ROOTS = ['src/system', 'src/demo'];

async function walk(dir) {
  const out = [];
  for (const ent of await readdir(dir, { withFileTypes: true })) {
    const full = join(dir, ent.name);
    if (ent.isDirectory()) {
      if (ent.name === 'node_modules' || ent.name.startsWith('.')) continue;
      out.push(...(await walk(full)));
    } else if (ent.name.endsWith('.svelte')) {
      out.push(full);
    }
  }
  return out;
}

const STYLE_BLOCK = /<style[^>]*>([\s\S]*?)<\/style>/g;
// A `:global(p|ul|ol|li)` rule plus its (flat) declaration body. The leading
// [^{}]* cannot cross a brace, so each match's prelude is bounded by the prior
// rule and the captured body belongs only to this rule (a sibling `:global(a)`
// in the same parent block is never swept in).
const SLOT_PIN_RULE = /[^{}]*:global\(\s*(?:p|ul|ol|li)\b[^{}]*\{([^{}]*)\}/g;
const USES_MIXIN = /@use\s+[^;]*slot-prose/;

const violations = [];
for (const root of SCAN_ROOTS) {
  for (const file of await walk(join(ROOT, root))) {
    const src = await readFile(file, 'utf8');
    let sb;
    while ((sb = STYLE_BLOCK.exec(src)) !== null) {
      const block = sb[1];
      if (USES_MIXIN.test(block)) continue;
      const blockStart = sb.index + sb[0].indexOf(block);
      let rule;
      const re = new RegExp(SLOT_PIN_RULE.source, 'g');
      while ((rule = re.exec(block)) !== null) {
        if (!/\binherit\b/.test(rule[1])) continue;
        const pinRel = Math.max(0, rule[0].indexOf(':global('));
        const line = src.slice(0, blockStart + rule.index + pinRel).split('\n').length;
        violations.push({ file: relative(ROOT, file), line });
      }
    }
  }
}

if (violations.length > 0) {
  console.error('[check-slot-prose] Hand-rolled slot-prose pin found.');
  console.error('Slot type pins must use `@include slot-prose` (src/system/styles/_slot-prose.scss),');
  console.error('not a hand-copied `:global(p|ul|ol|li) { … inherit … }` rule. See CONVENTIONS.md.\n');
  for (const v of violations) {
    console.error(`  ${v.file}:${v.line}`);
  }
  process.exit(1);
}

console.log('[check-slot-prose] OK — no hand-rolled slot-prose pins.');
