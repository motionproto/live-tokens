#!/usr/bin/env node
// Publish/CI gate for the bundled Claude Code skills. The rules live in
// scripts/lib/skillChecks.mjs, which the gate's test drives against fixtures;
// this half reads the tree and formats what comes back.

import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { MAX_SKILL_LINES, checkSkills } from './lib/skillChecks.mjs';
import { CATALOGUE_FAMILIES, catalogueOf } from '../bin/lib/catalogue.mjs';
import { PAGE_RULES } from '../bin/check-page.mjs';
import { COMPONENT_RULES } from '../bin/check-component.mjs';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const SKILLS = join(ROOT, '.claude/skills');
const CONFIGS = join(ROOT, 'src/live-tokens/data/component-configs');
const COMPONENTS = join(ROOT, 'src/system/components');

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

// Every shipped entry's family, read the same static way the CLI reads it, so
// this gate never has to import a component to see what it declares.
const shippedFamilies = readdirSync(COMPONENTS)
  .filter((f) => f.endsWith('.svelte') && !f.endsWith('Editor.svelte'))
  .map((f) => ({ id: f.replace(/\.svelte$/, '').toLowerCase(), family: catalogueOf(read(join(COMPONENTS, f)))?.family }))
  .filter((c) => c.family !== undefined);

const errors = checkSkills({
  skills,
  cli: read(join(ROOT, 'bin/cli.mjs')),
  setupClaude: read(join(ROOT, 'bin/setup-claude.mjs')),
  aliasKinds: read(join(ROOT, 'src/editor/core/components/aliasKinds.ts')),
  catalogueFamilies: CATALOGUE_FAMILIES,
  shippedFamilies,
  ruleIds: [...Object.keys(PAGE_RULES), ...Object.keys(COMPONENT_RULES)],
});

if (errors.length > 0) {
  console.error(`check:skills FAILED — ${errors.length} problem(s):\n`);
  for (const e of errors) console.error(`  - ${e}`);
  process.exit(1);
}

console.log(
  `check:skills OK — ${Object.keys(skills).length} skill(s), each under ${MAX_SKILL_LINES} lines with references resolved, ` +
    `CLI verbs real and their flags documented on the verb that takes them, every dispatched verb outside ` +
    `UNSKILLED_VERBS reached by a skill.`,
);
