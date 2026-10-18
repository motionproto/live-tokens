#!/usr/bin/env node
// Stages the skills one eval case runs with. A case without a tool runs a copy
// of the skills that never names it, kept in .claude/evals/_skills/<case>/:
// the files it changes, and skills.json listing what the case goes without and
// the hash of each shipped file a copy was made from.
//
//   node scripts/eval-stage-skills.mjs <case> <skills dir>   apply the case's copy
//   node scripts/eval-stage-skills.mjs --rehash <case>      record the current shipped hashes
//
// A shipped skill edited after its copy was made stops the stage, so a copy
// cannot fall behind the skill it stands in for.

import { createHash } from 'node:crypto';
import { cpSync, existsSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import process from 'node:process';

const REPO = resolve(dirname(new URL(import.meta.url).pathname), '..');
const SHIPPED = join(REPO, '.claude/skills');
const hash = (path) => createHash('sha256').update(readFileSync(path)).digest('hex');

const rehash = process.argv[2] === '--rehash';
const [name, dest] = rehash ? process.argv.slice(3) : process.argv.slice(2);
if (!name || (!rehash && !dest)) {
  console.error('usage: node scripts/eval-stage-skills.mjs <case> <skills dir> | --rehash <case>');
  process.exit(1);
}
const copy = join(REPO, '.claude/evals/_skills', name);
const manifestPath = join(copy, 'skills.json');
if (!existsSync(manifestPath)) process.exit(0);
const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));

if (rehash) {
  for (const file of Object.keys(manifest.copiedFrom)) manifest.copiedFrom[file] = hash(join(SHIPPED, file));
  writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);
  process.exit(0);
}

const stale = Object.entries(manifest.copiedFrom).filter(([file, sum]) => hash(join(SHIPPED, file)) !== sum);
if (stale.length > 0) {
  console.error(`eval: these shipped skill files changed since ${name}'s copy was made:`);
  for (const [file] of stale) console.error(`  .claude/skills/${file}`);
  console.error(`eval: carry the change into .claude/evals/_skills/${name}/, then run node scripts/eval-stage-skills.mjs --rehash ${name}.`);
  process.exit(1);
}
for (const path of manifest.without) {
  if (!existsSync(join(dest, path))) throw new Error(`${name} goes without ${path}, which the staged skills do not hold. Update ${manifestPath}.`);
  rmSync(join(dest, path), { recursive: true });
}
for (const file of Object.keys(manifest.copiedFrom)) cpSync(join(copy, file), join(dest, file));
