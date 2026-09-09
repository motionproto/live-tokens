#!/usr/bin/env node
// Publish gate, not part of `npm test`: a functional run must not go red over
// prose. Two things still fail a pack:
//   - RETIRED_TERMS: names for a flag or concept the CLI no longer has. A
//     model reads CLI output in the same turn and would reach for one of
//     these and exit 1. Same class as RETIRED_FLAGS in scripts/lib/skillChecks.mjs.
//   - DOMAIN_VOCAB: this design system's own naming choices (scale/step over
//     ladder/rung, "the buffer" over "unsaved"), so the CLI stays internally
//     consistent even though getting it wrong doesn't break an invocation.
// The audit is docs/plans/cli-skill-alignment.md.

import { readFileSync, readdirSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');

const FILES = [
  ...readdirSync(join(ROOT, 'bin')).filter((f) => f.endsWith('.mjs')).map((f) => `bin/${f}`),
  ...readdirSync(join(ROOT, 'bin/lib')).filter((f) => f.endsWith('.mjs')).map((f) => `bin/lib/${f}`),
  'src/editor/core/components/adjustAliases.ts',
  'src/editor/core/themes/buildColors.ts',
];

const RETIRED_TERMS = /--family\b|\btheme tokens?\b|\bcomponent tokens?\b|\bpackage defaults?\b|\btoken famil(?:y|ies)\b/i;
const DOMAIN_VOCAB = /\b(?:ladder|rung|rungs|unsaved)\b/i;

function stringLiterals(source) {
  const withoutComments = source
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/(^|[^:'"`\\])\/\/[^\n]*/g, '$1');
  const literals = [];
  const re = /'((?:[^'\\\n]|\\.)*)'|"((?:[^"\\\n]|\\.)*)"|`((?:[^`\\]|\\.)*)`/g;
  for (const m of withoutComments.matchAll(re)) literals.push(m[1] ?? m[2] ?? m[3] ?? '');
  return literals;
}

const errors = [];
for (const file of FILES) {
  const literals = stringLiterals(readFileSync(join(ROOT, file), 'utf8'));
  for (const literal of literals) {
    if (RETIRED_TERMS.test(literal)) errors.push(`${file}: retired term in ${JSON.stringify(literal)}`);
    if (DOMAIN_VOCAB.test(literal)) errors.push(`${file}: off-vocabulary word in ${JSON.stringify(literal)}`);
  }
}

if (errors.length > 0) {
  console.error(`check:cli-strings FAILED, ${errors.length} problem(s):\n`);
  for (const e of errors) console.error(`  - ${e}`);
  process.exit(1);
}

console.log(`check:cli-strings OK: ${FILES.length} file(s) clear of retired terms and off-vocabulary words.`);
