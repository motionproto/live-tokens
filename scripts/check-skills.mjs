#!/usr/bin/env node
// Publish/CI gate for the bundled Claude Code skills. Every check here is a
// drift that has actually happened: a catalogue missing shipped components, a
// worked example copied inline and left 174 lines behind its source, a recipe
// whose step count stopped matching its steps. None of them need a model to
// detect, so none of them should wait for a review to be found.

import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const SKILLS = join(ROOT, '.claude/skills');
const CONFIGS = join(ROOT, 'src/live-tokens/data/component-configs');
const CLI = join(ROOT, 'bin/cli.mjs');
const rel = (p) => relative(ROOT, p);

// A body past this length is where the long material wants a reference file;
// the guide's own ceiling is 500, and every skill here fits in half of that.
const MAX_SKILL_LINES = 250;
// Longer fences are almost always a shipped file pasted in, and a pasted file
// drifts. Point at node_modules instead.
const MAX_FENCE_LINES = 40;

const errors = [];
const read = (p) => readFileSync(p, 'utf8');

const skillDirs = readdirSync(SKILLS, { withFileTypes: true })
  .filter((e) => e.isDirectory())
  .map((e) => e.name)
  .sort();

const cli = read(CLI);
const cliVerbs = new Set([...cli.matchAll(/command === '([a-z-]+)'/g)].map((m) => m[1]));

// Flags come off each verb's signature line in USAGE, never the indented prose
// under it: set-fonts describes the --font-* custom properties there, and those
// are not flags.
const usage = cli.match(/const USAGE = `([\s\S]*?)`;/)?.[1] ?? '';
const cliFlags = new Map(
  [...usage.matchAll(/^ {2}([a-z][a-z-]+)\s+(.*)$/gm)].map(([, verb, rest]) => [
    verb,
    [...rest.matchAll(/--[a-z-]+/g)].map((m) => m[0]),
  ]),
);
// A flag whose owning skill leaves it out on purpose, keyed `verb --flag`, with
// the reason. Declaring one keeps the check honest; deleting the check does not.
const OMITTED_FLAGS = new Map();
const samplePrompts = new Set([...cli.matchAll(/^\s+'(live-tokens-[a-z-]+)':\s+['"]/gm)].map((m) => m[1]));

const components = readdirSync(CONFIGS, { withFileTypes: true })
  .filter((e) => e.isDirectory())
  .map((e) => e.name)
  .sort();

for (const skill of skillDirs) {
  const dir = join(SKILLS, skill);
  const skillPath = join(dir, 'SKILL.md');
  if (!existsSync(skillPath)) {
    errors.push(`${skill}: SKILL.md is missing`);
    continue;
  }
  const text = read(skillPath);
  const lines = text.split('\n');

  const name = text.match(/^name:\s*(\S+)/m)?.[1];
  if (name !== skill) errors.push(`${skill}: frontmatter name is "${name}", directory is "${skill}"`);
  if (!/^description:\s*\S/m.test(text)) errors.push(`${skill}: frontmatter has no description`);

  if (lines.length > MAX_SKILL_LINES) {
    errors.push(`${skill}: SKILL.md is ${lines.length} lines (ceiling ${MAX_SKILL_LINES}); move the long material to references/`);
  }

  let fenceStart = null;
  lines.forEach((line, i) => {
    if (!/^\s*```/.test(line)) return;
    if (fenceStart === null) {
      fenceStart = i;
      return;
    }
    const length = i - fenceStart - 1;
    if (length > MAX_FENCE_LINES) {
      errors.push(`${skill}: code fence at line ${fenceStart + 1} is ${length} lines (ceiling ${MAX_FENCE_LINES}); point at the shipped file instead of pasting it`);
    }
    fenceStart = null;
  });
  if (fenceStart !== null) errors.push(`${skill}: unclosed code fence at line ${fenceStart + 1}`);

  // Every reference named is present, and every reference present is named,
  // so a file cannot be orphaned by a rewrite or pointed at before it exists.
  const named = new Set([...text.matchAll(/references\/([a-z0-9-]+\.md)/g)].map((m) => m[1]));
  const refDir = join(dir, 'references');
  const present = new Set(existsSync(refDir) ? readdirSync(refDir).filter((f) => f.endsWith('.md')) : []);
  for (const ref of named) {
    if (!present.has(ref)) errors.push(`${skill}: names references/${ref}, which does not exist`);
  }
  for (const ref of present) {
    if (!named.has(ref)) errors.push(`${skill}: references/${ref} exists but SKILL.md never points at it`);
  }

  // A skill naming a verb the CLI dropped is the cheap direction. The costly one
  // is the reverse: --carry-from shipped in bin/cli.mjs and in --help and reached
  // no skill, so two generate-theme runs silently carried the first theme's fonts
  // and geometry into the second. A flag its own skill never names is a flag the
  // model never reaches for.
  for (const [, verb] of text.matchAll(/npx (?:@motion-proto\/)?live-tokens ([a-z-]+)/g)) {
    if (!cliVerbs.has(verb)) {
      errors.push(`${skill}: mentions \`live-tokens ${verb}\`, which bin/cli.mjs does not dispatch`);
      continue;
    }
    for (const flag of cliFlags.get(verb) ?? []) {
      if (OMITTED_FLAGS.has(`${verb} ${flag}`)) continue;
      if (!text.includes(flag)) {
        errors.push(`${skill}: documents \`live-tokens ${verb}\` but never names ${flag}, which bin/cli.mjs offers`);
      }
    }
  }

  for (const [, sibling] of text.matchAll(/\b(live-tokens-[a-z-]+)\b/g)) {
    if (!skillDirs.includes(sibling)) errors.push(`${skill}: refers to skill "${sibling}", which is not bundled`);
  }

  if (!samplePrompts.has(skill)) errors.push(`${skill}: no SAMPLE_PROMPTS entry in bin/cli.mjs, so setup-claude cannot show how to trigger it`);

  for (const [, count] of text.matchAll(/^#+ .*\b(\w+)-step\b/gim)) {
    errors.push(`${skill}: a heading promises "${count}-step"; counts drift, so name the recipe instead`);
  }
}

for (const skill of samplePrompts) {
  if (!skillDirs.includes(skill)) errors.push(`bin/cli.mjs: SAMPLE_PROMPTS names "${skill}", which is not bundled`);
}

// The picker is the only skill that enumerates components, and a component it
// does not know is one it can never recommend.
const pickerPath = join(SKILLS, 'live-tokens-pick-component/SKILL.md');
if (existsSync(pickerPath)) {
  const picker = read(pickerPath);
  const catalogue = picker.match(/^## Catalogue\n\n([\s\S]*?)\n\n/m)?.[1] ?? '';
  const listed = new Set([...catalogue.matchAll(/`([A-Za-z]+)`/g)].map((m) => m[1].toLowerCase()));
  for (const comp of components) {
    if (!listed.has(comp)) errors.push(`live-tokens-pick-component: catalogue does not list "${comp}" (${rel(join(CONFIGS, comp))})`);
  }
  for (const item of listed) {
    if (!components.includes(item)) errors.push(`live-tokens-pick-component: catalogue lists "${item}", which has no component config`);
  }
}

if (errors.length > 0) {
  console.error(`check:skills FAILED — ${errors.length} problem(s):\n`);
  for (const e of errors) console.error(`  - ${e}`);
  process.exit(1);
}

console.log(`check:skills OK — ${skillDirs.length} skill(s), each under ${MAX_SKILL_LINES} lines with references resolved, CLI verbs real and their flags documented, and the picker catalogue complete.`);
