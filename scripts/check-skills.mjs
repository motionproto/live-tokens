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
const CHECK_COMPONENT = join(ROOT, 'bin/check-component.mjs');
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
// under it: set-type describes the --font-* custom properties there, and those
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
// A flag the CLI used to take. Nothing dispatches it, so USAGE cannot say it is
// gone and the flag rule below has nothing to compare against; a skill still
// naming one hands the model a command that exits 1.
const RETIRED_FLAGS = new Set(['--carry-from']);
// A verb that has to reach a skill. `--carry-from` shipped for a release with no
// skill naming it; `save-theme` was one wave away from the same. A verb no skill
// runs is a verb the model never reaches for.
const SKILLED_VERBS = ['set-colors', 'set-type', 'set-geometry', 'save-theme'];
const verbsInSkills = new Set();
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
  // no skill, so two set-colors runs silently carried the first theme's fonts
  // and geometry into the second. A flag its own skill never names is a flag the
  // model never reaches for.
  const runs = new Set([...text.matchAll(/npx (?:@motion-proto\/)?live-tokens ([a-z-]+)/g)].map((m) => m[1]));
  for (const verb of runs) {
    verbsInSkills.add(verb);
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

  for (const flag of RETIRED_FLAGS) {
    if (text.includes(flag)) errors.push(`${skill}: names ${flag}, which the CLI no longer takes`);
  }

  // The third direction: a flag that is real, but on another verb. The skill
  // reads as if the verb it runs took it, and the run exits 1 on a flag the
  // help text does list. Token names open with `--` too, so only a name some
  // verb actually offers can trip this.
  if (runs.size > 0) {
    const ran = [...runs].map((v) => `\`${v}\``).join(', ');
    for (const flag of new Set([...text.matchAll(/--[a-z][a-z-]+/g)].map((m) => m[0]))) {
      if ([...runs].some((verb) => (cliFlags.get(verb) ?? []).includes(flag))) continue;
      const owner = [...cliFlags].find(([, flags]) => flags.includes(flag))?.[0];
      if (owner) {
        errors.push(`${skill}: names ${flag}, which bin/cli.mjs offers on \`${owner}\` and not on ${ran}, the verb(s) this skill runs`);
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

for (const verb of SKILLED_VERBS) {
  if (!cliVerbs.has(verb)) {
    errors.push(`SKILLED_VERBS names "${verb}", which bin/cli.mjs no longer dispatches`);
  } else if (!verbsInSkills.has(verb)) {
    errors.push(`bin/cli.mjs dispatches \`live-tokens ${verb}\`, which no bundled skill runs`);
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

// One reading of a request produces three intents, and each contributing skill
// reads its own dimension's column by the anchor name create-theme hands it. A
// name that reaches only two of the four files is an anchor a sibling silently
// cannot look up, and nothing else would catch it.
const DIRECTIONS = 'live-tokens-create-theme/references/design-directions.md';
const DIMENSIONS = [
  'live-tokens-set-colors/references/color-anchors.md',
  'live-tokens-set-type/references/type-anchors.md',
  'live-tokens-set-geometry/references/geometry-anchors.md',
];
// Anchors live under a Feelings, Idioms, or Occasions heading, so the axes
// table in the preamble is not mistaken for one. The key is a row's first cell
// up to its first comma, which is how every table names its anchor: "Art deco,
// opulent, luxurious" keys on "art deco".
const ANCHOR_SECTIONS = /^(feelings|idioms|occasions)\b/i;
const anchorKeys = (text) =>
  new Set(
    text
      .split(/^## /m)
      .filter((section) => ANCHOR_SECTIONS.test(section))
      .flatMap((section) => [...section.matchAll(/^\|\s*([^|\n]+?)\s*\|/gm)])
      .map((m) => m[1].split(',')[0].trim().toLowerCase())
      .filter((key) => key && !/^-+$/.test(key) && !['request', 'anchor'].includes(key)),
  );

const directionsPath = join(SKILLS, DIRECTIONS);
if (!existsSync(directionsPath)) {
  errors.push(`${DIRECTIONS}: missing, so no anchor has an index`);
} else {
  const indexed = anchorKeys(read(directionsPath));
  const covered = new Set();
  for (const path of DIMENSIONS) {
    const full = join(SKILLS, path);
    if (!existsSync(full)) {
      errors.push(`${path}: missing, so one dimension has no anchors`);
      continue;
    }
    for (const key of anchorKeys(read(full))) {
      covered.add(key);
      if (!indexed.has(key)) errors.push(`${path}: anchors "${key}", which ${DIRECTIONS} does not index`);
    }
  }
  for (const key of indexed) {
    if (!covered.has(key)) errors.push(`${DIRECTIONS}: indexes "${key}", which no dimension anchors`);
  }
}

// A token's suffix is what picks its editor control, and the list now sits in
// three places: KIND_RULES in the editor's aliasKinds decides (check-component
// reads the same table), references/token-naming.md explains, and the skill's
// inline summary is what a model reads before it names anything.
// Splitting the tables out of SKILL.md is what made this worth gating; while
// they sat inline next to the rule they serve, drift had nowhere to hide.
const suffixSources = [
  ['live-tokens-create-component/references/token-naming.md', (t) => t],
  ['live-tokens-create-component/SKILL.md', (t) => t.match(/^### Suffix vocabulary\n([\s\S]*?)\n### /m)?.[1] ?? ''],
];
const ALIAS_KINDS = 'src/editor/core/components/aliasKinds.ts';
const kindRules = read(join(ROOT, ALIAS_KINDS)).match(/KIND_RULES[^=]*=\s*\[([\s\S]*?)\n\];/)?.[1] ?? '';
const knownSuffixes = new Set(
  [...kindRules.matchAll(/suffix:\s*\[([\s\S]*?)\]/g)]
    .flatMap((m) => [...m[1].matchAll(/'-([a-z0-9-]+)'/g)].map((n) => n[1])),
);
for (const [path, scope] of suffixSources) {
  const full = join(SKILLS, path);
  if (!existsSync(full)) {
    errors.push(`${path}: missing, so the suffix vocabulary has nowhere to live`);
    continue;
  }
  const listed = new Set([...scope(read(full)).matchAll(/`-([a-z][a-z-]*)`/g)].map((m) => m[1]));
  for (const suffix of knownSuffixes) {
    if (!listed.has(suffix)) errors.push(`${path}: does not list \`-${suffix}\`, which check-component accepts`);
  }
  for (const suffix of listed) {
    if (!knownSuffixes.has(suffix)) errors.push(`${path}: lists \`-${suffix}\`, which check-component rejects`);
  }
}

if (errors.length > 0) {
  console.error(`check:skills FAILED — ${errors.length} problem(s):\n`);
  for (const e of errors) console.error(`  - ${e}`);
  process.exit(1);
}

console.log(
  `check:skills OK — ${skillDirs.length} skill(s), each under ${MAX_SKILL_LINES} lines with references resolved, ` +
    `CLI verbs real and their flags documented on the verb that takes them, every verb in SKILLED_VERBS reached, ` +
    `and the picker catalogue complete.`,
);
