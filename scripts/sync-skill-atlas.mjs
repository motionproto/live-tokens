#!/usr/bin/env node
// The Skill Atlas cites SKILL.md by line number, and a line number is the one
// thing an edit to a skill always changes. Nothing caught that, so an
// insertion anywhere above a cited range silently moved every node below it
// onto the wrong paragraph — visible only to someone who opened the page and
// read it. That coupling is why create-theme's step 1 still carries two
// decisions: renumbering was expensive, so it did not happen.
//
// Each range stores the opening text of the lines it means. The numbers are
// derived from that text, so an edit costs a sync rather than an audit.
//
//   node scripts/sync-skill-atlas.mjs [--write]
//
// Without --write it is a dry run that fails on drift. The rules are in
// scripts/lib/skillAtlas.mjs, under test; this half reads the files, counts
// what changed, and writes.

import { readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  atlasNodes,
  auditCommands,
  parseTrees,
  serializeTrees,
  syncDigest,
  syncNode,
  uncoveredSkills,
} from './lib/skillAtlas.mjs';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const ATLAS = join(ROOT, 'src/editor/skill-atlas/skillTrees.ts');
const SKILLS = join(ROOT, '.claude/skills');
const CLI = join(ROOT, 'bin/cli.mjs');

const write = process.argv.slice(2).includes('--write');

const parsed = parseTrees(readFileSync(ATLAS, 'utf8'));
const { trees } = parsed;

const bodies = new Map();
const linesOf = (id) => {
  if (!bodies.has(id)) bodies.set(id, readFileSync(join(SKILLS, id, 'SKILL.md'), 'utf8').split('\n'));
  return bodies.get(id);
};

const errors = [];
let moved = 0;
let anchored = 0;
let digested = 0;

const take = ({ error, moved: didMove, anchored: didAnchor, digested: didDigest }) => {
  if (error) errors.push(error);
  if (didMove) moved += 1;
  if (didAnchor) anchored += 1;
  if (didDigest) digested += 1;
};

for (const tree of Object.values(trees)) take(syncDigest(tree, linesOf(tree.id), write));
for (const { node, id, label } of atlasNodes(trees)) take(syncNode(node, { lines: linesOf(id), id, label, write }));
errors.push(...auditCommands(trees, readFileSync(CLI, 'utf8')));

// `check:skills` enumerates the same directory for the same reason.
const skillDirs = readdirSync(SKILLS, { withFileTypes: true })
  .filter((e) => e.isDirectory())
  .map((e) => e.name)
  .sort();
errors.push(...uncoveredSkills(trees, skillDirs));

if (errors.length > 0) {
  console.error(`check:skill-atlas FAILED — ${errors.length} problem(s):\n`);
  for (const e of errors) console.error(`  - ${e}`);
  console.error('\nRun `npm run sync:skill-atlas` to re-derive the line numbers from the anchors.');
  process.exit(1);
}

if (write) {
  writeFileSync(ATLAS, serializeTrees(parsed));
  const parts = [];
  if (anchored > 0) parts.push(`anchored ${anchored} range(s)`);
  if (moved > 0) parts.push(`re-pointed ${moved} range(s)`);
  if (digested > 0) parts.push(`stamped ${digested} skill digest(s)`);
  console.log(`sync:skill-atlas — ${parts.length > 0 ? parts.join(', ') : 'already in sync'}.`);
} else {
  console.log(
    'check:skill-atlas OK — every skill is byte-identical to the tree that maps it, every range still opens on the text it was written for, and every command names a verb the CLI dispatches.',
  );
}
