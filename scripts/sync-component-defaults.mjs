#!/usr/bin/env node
// Sync each component's baked `:global(:root)` defaults (what SHIPS to
// consumers) from its editor config `default.json` (what the demo renders).
// Only value lines inside the first `:global(:root){…}` block are rewritten;
// `@media` / class-selector responsive wiring is left untouched.
//
//   node scripts/sync-component-defaults.mjs [component] [--write]
//
// Without --write it's a dry run (prints the diff per component).

import { readFileSync, writeFileSync, readdirSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolveRoot();
const CONFIGS = join(ROOT, 'src/live-tokens/data/component-configs');
const COMPONENTS = join(ROOT, 'src/system/components');

const args = process.argv.slice(2);
const write = args.includes('--write');
const check = args.includes('--check'); // exit 1 if any drift (CI gate)
const only = args.find((a) => !a.startsWith('-'));

// Map a config dir (lowercase, no separators) → its PascalCase .svelte file.
const svelteByLower = new Map(
  readdirSync(COMPONENTS)
    .filter((f) => f.endsWith('.svelte') && !f.endsWith('Editor.svelte'))
    .map((f) => [f.replace('.svelte', '').toLowerCase(), f]),
);

// Mirror of src/editor/core/themes/slices/gradients.ts → formatGradientValue,
// so the baked default renders identically to what the editor produces.
function formatStopColor(s) {
  const base = s.color.startsWith('--') ? `var(${s.color})` : s.color;
  const op = s.opacity ?? 100;
  return op >= 100 ? base : `color-mix(in srgb, ${base} ${op}%, transparent)`;
}
function formatGradient(v) {
  if (v.type === 'none') return 'transparent';
  if (v.type === 'solid') return v.stops[0] ? formatStopColor(v.stops[0]) : 'transparent';
  const stops = v.stops.map((s) => `${formatStopColor(s)} ${s.position}%`).join(', ');
  if (v.type === 'linear') return `linear-gradient(${v.angle}deg, ${stops})`;
  const cx = v.centerX ?? 50;
  const ax = v.aspectX ?? 1, ay = v.aspectY ?? 1;
  const shape =
    ax === 1 && ay === 1
      ? v.radius > 0 ? `circle ${v.radius}px` : 'circle'
      : `ellipse ${((v.radius || 100) * ax).toFixed(2)}px ${((v.radius || 100) * ay).toFixed(2)}px`;
  return `radial-gradient(${shape} at ${cx}% 50%, ${stops})`;
}

function aliasToCss(v) {
  let css;
  if (v && typeof v === 'object') {
    if (v.kind === 'gradient' && v.value) css = formatGradient(v.value);
    else return { skip: 'object:' + (v.kind ?? '?') };
  } else {
    const s = String(v).trim();
    css = s.startsWith('--') ? `var(${s})` : s; // alias→var(); color-mix/literal pass through
  }
  // A bare `transparent` (raw literal or a type:none gradient) must use the
  // design token — component tokens have to alias a Layer-1 token, never a raw
  // color primitive. Same rendered value, canonical form. See editorTokens.test.
  if (css === 'transparent') css = 'var(--color-transparent)';
  return css;
}

/** Rewrite value lines inside the first :global(:root){…} block. */
function syncBlock(src, aliases) {
  const start = src.indexOf(':global(:root)');
  if (start === -1) return { src, changed: [], skipped: [] };
  const open = src.indexOf('{', start);
  let depth = 0,
    end = -1;
  for (let i = open; i < src.length; i++) {
    if (src[i] === '{') depth++;
    else if (src[i] === '}' && --depth === 0) {
      end = i;
      break;
    }
  }
  const before = src.slice(0, open + 1);
  const block = src.slice(open + 1, end);
  const after = src.slice(end);
  const changed = [];
  const skipped = [];
  const out = block.replace(
    /^([ \t]*)(--[\w-]+)([ \t]*:[ \t]*)([^;]+)(;.*)$/gm,
    (line, indent, token, sep, value, tail) => {
      if (!(token in aliases)) return line;
      const css = aliasToCss(aliases[token]);
      if (typeof css === 'object') {
        skipped.push(`${token} (${css.skip})`);
        return line;
      }
      if (value.trim() === css) return line;
      changed.push(`${token}: ${value.trim()} → ${css}`);
      return `${indent}${token}${sep}${css}${tail}`;
    },
  );
  return { src: before + out + after, changed, skipped };
}

const dirs = readdirSync(CONFIGS).filter((d) => !only || d === only);
let totalChanged = 0;
for (const dir of dirs.sort()) {
  const cfgPath = join(CONFIGS, dir, 'default.json');
  if (!existsSync(cfgPath)) continue;
  const svelteName = svelteByLower.get(dir);
  if (!svelteName) {
    console.log(`SKIP  ${dir} (no matching .svelte)`);
    continue;
  }
  const aliases = JSON.parse(readFileSync(cfgPath, 'utf8')).aliases ?? {};
  const sveltePath = join(COMPONENTS, svelteName);
  const src = readFileSync(sveltePath, 'utf8');
  const { src: next, changed, skipped } = syncBlock(src, aliases);
  if (changed.length || skipped.length) {
    console.log(`\n${svelteName}  (${changed.length} changed${skipped.length ? `, ${skipped.length} skipped` : ''})`);
    for (const c of changed) console.log(`   ${c}`);
    for (const s of skipped) console.log(`   ⊘ ${s}`);
  }
  totalChanged += changed.length;
  if (write && next !== src) writeFileSync(sveltePath, next);
}
console.log(`\n${write ? 'WROTE' : check ? 'CHECK' : 'DRY RUN'} — ${totalChanged} value(s) across components`);
if (check && totalChanged > 0) {
  console.error(
    `\nComponent .svelte defaults are out of sync with their config default.json.\n` +
      `Run: node scripts/sync-component-defaults.mjs --write`,
  );
  process.exit(1);
}

function resolveRoot() {
  return join(dirname(fileURLToPath(import.meta.url)), '..');
}
