// Every check here is a drift that has actually happened: a catalogue missing
// shipped components, a worked example copied inline and left 174 lines behind
// its source, a recipe whose step count stopped matching its steps. None of
// them need a model to detect, so none of them should wait for a review to be
// found.
//
// The rules live here as one pure pass over sources the caller has already
// read, so `scripts/check-skills.mjs` and the test that proves each rule bites
// run the same implementation.

import { dispatchedVerbs, usageFlags } from './cliSurface.mjs';

// A body past this length is where the long material wants a reference file;
// the guide's own ceiling is 500, and every skill here fits in half of that.
export const MAX_SKILL_LINES = 250;
// Longer fences are almost always a shipped file pasted in, and a pasted file
// drifts. Point at node_modules instead.
const MAX_FENCE_LINES = 40;

// A flag whose owning skill leaves it out on purpose, keyed `verb --flag`, with
// the reason. Declaring one keeps the check honest; deleting the check does not.
const OMITTED_FLAGS = new Map();
// A flag the CLI used to take. Nothing dispatches it, so USAGE cannot say it is
// gone and the flag rule below has nothing to compare against; a skill still
// naming one hands the model a command that exits 1.
const RETIRED_FLAGS = new Set(['--carry-from']);
// Every verb the CLI dispatches has to reach a skill, minus the exemptions
// below. `--carry-from` shipped for a release with no skill naming it and
// `save-theme` was one wave away from the same, so the list of verbs that owe a
// skill is derived rather than hand-kept: a new verb owes one until someone
// writes down why it does not.
const UNSKILLED_VERBS = new Map([
  ['create', 'scaffolds the project, so it runs before setup-claude has put a skill in it'],
  ['init', 'the alias create still answers to'],
  ['setup-claude', 'installs the skills, so no skill can be what runs it'],
]);

const CONFIGS = 'src/live-tokens/data/component-configs';
const PICKER = 'live-tokens-pick-component';

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

// A token's suffix is what picks its editor control, and the list now sits in
// three places: KIND_RULES in the editor's aliasKinds decides (check-component
// reads the same table), references/token-naming.md explains, and the skill's
// inline summary is what a model reads before it names anything.
// Splitting the tables out of SKILL.md is what made this worth gating; while
// they sat inline next to the rule they serve, drift had nowhere to hide.
const SUFFIX_SOURCES = [
  ['live-tokens-create-component/references/token-naming.md', (t) => t],
  ['live-tokens-create-component/SKILL.md', (t) => t.match(/^### Suffix vocabulary\n([\s\S]*?)\n### /m)?.[1] ?? ''],
];

// `skills` maps a skill's directory name to its files keyed by the path within
// it, `SKILL.md` and `references/*.md`; the other three are the sources those
// files are checked against.
export function checkSkills({ skills, cli, components = [], aliasKinds = '' }) {
  const errors = [];
  const skillDirs = Object.keys(skills).sort();
  const fileAt = (path) => {
    const cut = path.indexOf('/');
    return skills[path.slice(0, cut)]?.[path.slice(cut + 1)];
  };

  const cliVerbs = dispatchedVerbs(cli);
  const cliFlags = usageFlags(cli);
  const verbsInSkills = new Set();
  const samplePrompts = new Set([...cli.matchAll(/^\s+'(live-tokens-[a-z-]+)':\s+['"]/gm)].map((m) => m[1]));

  for (const skill of skillDirs) {
    const files = skills[skill];
    const text = files['SKILL.md'];
    if (text === undefined) {
      errors.push(`${skill}: SKILL.md is missing`);
      continue;
    }
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
    const present = new Set(
      Object.keys(files)
        .filter((f) => f.startsWith('references/') && f.endsWith('.md'))
        .map((f) => f.slice('references/'.length)),
    );
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

  for (const verb of cliVerbs) {
    if (UNSKILLED_VERBS.has(verb) || verbsInSkills.has(verb)) continue;
    errors.push(
      `bin/cli.mjs dispatches \`live-tokens ${verb}\`, which no bundled skill runs; ` +
        `name the skill that runs it, or add it to UNSKILLED_VERBS with the reason`,
    );
  }
  for (const verb of UNSKILLED_VERBS.keys()) {
    if (!cliVerbs.has(verb)) {
      errors.push(`UNSKILLED_VERBS exempts "${verb}", which bin/cli.mjs no longer dispatches`);
    }
  }

  for (const skill of samplePrompts) {
    if (!skillDirs.includes(skill)) errors.push(`bin/cli.mjs: SAMPLE_PROMPTS names "${skill}", which is not bundled`);
  }

  // The picker is the only skill that enumerates components, and a component it
  // does not know is one it can never recommend.
  const picker = fileAt(`${PICKER}/SKILL.md`);
  if (picker !== undefined) {
    const catalogue = picker.match(/^## Catalogue\n\n([\s\S]*?)\n\n/m)?.[1] ?? '';
    const listed = new Set([...catalogue.matchAll(/`([A-Za-z]+)`/g)].map((m) => m[1].toLowerCase()));
    for (const comp of components) {
      if (!listed.has(comp)) errors.push(`${PICKER}: catalogue does not list "${comp}" (${CONFIGS}/${comp})`);
    }
    for (const item of listed) {
      if (!components.includes(item)) errors.push(`${PICKER}: catalogue lists "${item}", which has no component config`);
    }
  }

  const directions = fileAt(DIRECTIONS);
  if (directions === undefined) {
    errors.push(`${DIRECTIONS}: missing, so no anchor has an index`);
  } else {
    const indexed = anchorKeys(directions);
    const covered = new Set();
    for (const path of DIMENSIONS) {
      const dimension = fileAt(path);
      if (dimension === undefined) {
        errors.push(`${path}: missing, so one dimension has no anchors`);
        continue;
      }
      for (const key of anchorKeys(dimension)) {
        covered.add(key);
        if (!indexed.has(key)) errors.push(`${path}: anchors "${key}", which ${DIRECTIONS} does not index`);
      }
    }
    for (const key of indexed) {
      if (!covered.has(key)) errors.push(`${DIRECTIONS}: indexes "${key}", which no dimension anchors`);
    }
  }

  const kindRules = aliasKinds.match(/KIND_RULES[^=]*=\s*\[([\s\S]*?)\n\];/)?.[1] ?? '';
  const knownSuffixes = new Set(
    [...kindRules.matchAll(/suffix:\s*\[([\s\S]*?)\]/g)]
      .flatMap((m) => [...m[1].matchAll(/'-([a-z0-9-]+)'/g)].map((n) => n[1])),
  );
  for (const [path, scope] of SUFFIX_SOURCES) {
    const source = fileAt(path);
    if (source === undefined) {
      errors.push(`${path}: missing, so the suffix vocabulary has nowhere to live`);
      continue;
    }
    const listed = new Set([...scope(source).matchAll(/`-([a-z][a-z-]*)`/g)].map((m) => m[1]));
    for (const suffix of knownSuffixes) {
      if (!listed.has(suffix)) errors.push(`${path}: does not list \`-${suffix}\`, which check-component accepts`);
    }
    for (const suffix of listed) {
      if (!knownSuffixes.has(suffix)) errors.push(`${path}: lists \`-${suffix}\`, which check-component rejects`);
    }
  }

  return errors;
}
