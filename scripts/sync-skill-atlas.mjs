#!/usr/bin/env node
// The Skill Atlas cites SKILL.md by line number, and a line number is the one
// thing an edit to a skill always changes. Nothing caught that, so an
// insertion anywhere above a cited range silently moved every node below it
// onto the wrong paragraph — visible only to someone who opened the page and
// read it. That coupling is why generate-theme's step 1 still carries two
// decisions: renumbering was expensive, so it did not happen.
//
// Each range stores the opening text of the lines it means. The numbers are
// derived from that text, so an edit costs a sync rather than an audit.
//
//   node scripts/sync-skill-atlas.mjs [--write]
//
// Without --write it is a dry run that fails on drift.

import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const ATLAS = join(ROOT, 'src/editor/skill-atlas/skillTrees.ts');
const SKILLS = join(ROOT, '.claude/skills');

// Long enough to be unique for all but three lines that are genuinely
// identical to another line in the same file; those resolve by proximity.
const ANCHOR_LENGTH = 60;

const write = process.argv.slice(2).includes('--write');
// A workflow step carries its own number, and renumbering one is the most
// common edit these files see. Anchoring on the prose after the marker lets a
// step move without re-anchoring, while still breaking when its words change.
const normalize = (line) => line.trim().replace(/^\d+\.\s+/, '');
const anchorOf = (line) => normalize(line).slice(0, ANCHOR_LENGTH);

const source = readFileSync(ATLAS, 'utf8');
const open = source.indexOf('= {', source.indexOf('skillTrees')) + 2;
const close = source.lastIndexOf('}');
const head = source.slice(0, open);
const tail = source.slice(close + 1);
const trees = JSON.parse(source.slice(open, close + 1));

const bodies = new Map();
const linesOf = (id) => {
  if (!bodies.has(id)) bodies.set(id, readFileSync(join(SKILLS, id, 'SKILL.md'), 'utf8').split('\n'));
  return bodies.get(id);
};

// Anchors only prove that the text a node cites is still somewhere in the file.
// They say nothing about a skill that gained a step, dropped a branch, or
// reordered its decisions while every quoted line survived — the tree is then
// wrong in the one way the atlas exists to be right about. The digest catches
// any edit at all and names the skill to re-read; re-running with --write is
// the record that someone did.
const digestOf = (id) => `sha256:${createHash('sha256').update(linesOf(id).join('\n')).digest('hex').slice(0, 16)}`;

function checkDigest(tree) {
  const current = digestOf(tree.id);
  if (tree.digest === current) return;
  if (!write) {
    errors.push(
      tree.digest === undefined
        ? `${tree.id}: no digest recorded; run \`npm run sync:skill-atlas\``
        : `${tree.id}/SKILL.md has changed since the tree was written — re-read it against the tree (new steps and dropped branches are invisible to the anchors), then run \`npm run sync:skill-atlas\``,
    );
    return;
  }
  rebuild(tree, { digest: current }, 'id');
  digested += 1;
}

const errors = [];
let moved = 0;
let anchored = 0;
let digested = 0;

// Nearest match wins so that a repeated line resolves to the range it was
// written for rather than to the first copy in the file.
function locate(lines, anchor, hint, from = 0) {
  const hits = [];
  for (let i = from; i < lines.length; i += 1) {
    if (normalize(lines[i]).startsWith(anchor)) hits.push(i + 1);
  }
  if (hits.length === 0) return null;
  return hits.reduce((best, n) => (Math.abs(n - hint) < Math.abs(best - hint) ? n : best));
}

function sync(node, id, label) {
  if (!Array.isArray(node.lines)) return;
  const lines = linesOf(id);
  const [start, end] = node.lines;

  if (typeof node.anchor !== 'string') {
    if (!write) {
      errors.push(`${label}: no anchor; run \`npm run sync:skill-atlas\` to record one`);
      return;
    }
    // A blank line normalizes to the empty string, which would match every
    // line in the file and silently anchor the node to nothing.
    if (anchorOf(lines[start - 1]) === '' || (end > start && anchorOf(lines[end - 1]) === '')) {
      errors.push(`${label}: lines ${start}-${end} of ${id}/SKILL.md open or close on a blank line; point the range at the text it means`);
      return;
    }
    rebuild(node, { anchor: anchorOf(lines[start - 1]), ...(end > start ? { anchorEnd: anchorOf(lines[end - 1]) } : {}) });
    anchored += 1;
    return;
  }

  const foundStart = locate(lines, node.anchor, start);
  if (foundStart === null) {
    errors.push(`${label}: anchor ${JSON.stringify(node.anchor)} is no longer in ${id}/SKILL.md; re-point the node or update its anchor`);
    return;
  }
  let foundEnd = foundStart;
  if (typeof node.anchorEnd === 'string') {
    foundEnd = locate(lines, node.anchorEnd, end, foundStart - 1);
    if (foundEnd === null) {
      errors.push(`${label}: end anchor ${JSON.stringify(node.anchorEnd)} is not at or below line ${foundStart} of ${id}/SKILL.md`);
      return;
    }
  } else if (end > start) {
    foundEnd = end + (foundStart - start);
  }

  if (foundStart === start && foundEnd === end) return;
  moved += 1;
  if (!write) {
    errors.push(`${label}: cites lines ${start}-${end} of ${id}/SKILL.md, but its anchor is now at ${foundStart}-${foundEnd}`);
    return;
  }
  node.lines = [foundStart, foundEnd];
}

// Key order is the file's diff: rebuilding in place keeps `anchor` next to the
// `lines` it explains rather than appending it after the node's prose.
function rebuild(node, extra, after = 'lines') {
  const next = {};
  for (const [key, value] of Object.entries(node)) {
    // A key already on the node would otherwise overwrite the new value on the
    // way past, which silently dropped every digest restamp after the first.
    if (!(key in extra)) next[key] = value;
    if (key === after) Object.assign(next, extra);
  }
  for (const key of Object.keys(node)) delete node[key];
  Object.assign(node, next);
}

function walk(value, id, label) {
  if (Array.isArray(value)) {
    value.forEach((item, i) => walk(item, id, `${label}[${i}]`));
    return;
  }
  if (value === null || typeof value !== 'object') return;
  sync(value, id, value.id ? `${id} ${value.id}` : label);
  for (const [key, child] of Object.entries(value)) walk(child, id, `${label}.${key}`);
}

for (const tree of Object.values(trees)) {
  checkDigest(tree);
  walk(tree, tree.id, tree.id);
}

if (errors.length > 0) {
  console.error(`check:skill-atlas FAILED — ${errors.length} problem(s):\n`);
  for (const e of errors) console.error(`  - ${e}`);
  console.error('\nRun `npm run sync:skill-atlas` to re-derive the line numbers from the anchors.');
  process.exit(1);
}

if (write) {
  writeFileSync(ATLAS, head + JSON.stringify(trees, null, 2) + tail);
  const parts = [];
  if (anchored > 0) parts.push(`anchored ${anchored} range(s)`);
  if (moved > 0) parts.push(`re-pointed ${moved} range(s)`);
  if (digested > 0) parts.push(`stamped ${digested} skill digest(s)`);
  console.log(`sync:skill-atlas — ${parts.length > 0 ? parts.join(', ') : 'already in sync'}.`);
} else {
  console.log('check:skill-atlas OK — every skill is byte-identical to the tree that maps it, and every range still opens on the text it was written for.');
}
