#!/usr/bin/env node
// Publish/CI gate for the bundled Claude Code skills. The rules live in
// scripts/lib/skillChecks.mjs, which the gate's test drives against fixtures;
// this half reads the tree and formats what comes back.

import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { MAX_SKILL_LINES, checkSkills } from './lib/skillChecks.mjs';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const SKILLS = join(ROOT, '.claude/skills');
const CONFIGS = join(ROOT, 'src/live-tokens/data/component-configs');

const read = (p) => readFileSync(p, 'utf8');
const dirNames = (dir) =>
  readdirSync(dir, { withFileTypes: true })
    .filter((e) => e.isDirectory())
    .map((e) => e.name)
    .sort();

const skills = {};
for (const skill of dirNames(SKILLS)) {
  const dir = join(SKILLS, skill);
  const files = {};
  if (existsSync(join(dir, 'SKILL.md'))) files['SKILL.md'] = read(join(dir, 'SKILL.md'));
  const refDir = join(dir, 'references');
  for (const ref of existsSync(refDir) ? readdirSync(refDir) : []) {
    if (ref.endsWith('.md')) files[`references/${ref}`] = read(join(refDir, ref));
  }
  skills[skill] = files;
}

const errors = checkSkills({
  skills,
  cli: read(join(ROOT, 'bin/cli.mjs')),
  components: dirNames(CONFIGS),
  aliasKinds: read(join(ROOT, 'src/editor/core/components/aliasKinds.ts')),
});

if (errors.length > 0) {
  console.error(`check:skills FAILED — ${errors.length} problem(s):\n`);
  for (const e of errors) console.error(`  - ${e}`);
  process.exit(1);
}

console.log(
  `check:skills OK — ${Object.keys(skills).length} skill(s), each under ${MAX_SKILL_LINES} lines with references resolved, ` +
    `CLI verbs real and their flags documented on the verb that takes them, every dispatched verb outside ` +
    `UNSKILLED_VERBS reached by a skill, ` +
    `and the picker catalogue complete.`,
);
