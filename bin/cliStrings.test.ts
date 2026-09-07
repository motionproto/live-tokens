import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const ROOT = join(__dirname, '..');
const FILES = [
  ...readdirSync(join(ROOT, 'bin')).filter((f) => f.endsWith('.mjs')).map((f) => `bin/${f}`),
  ...readdirSync(join(ROOT, 'bin/lib')).filter((f) => f.endsWith('.mjs')).map((f) => `bin/lib/${f}`),
  'src/editor/core/components/adjustAliases.ts',
  'src/editor/core/themes/buildColors.ts',
];

// The skills were rewritten under docs/plans/skill-simplification.md, and a
// model reads CLI output in the same turn, so the same words are banned in
// every string a verb prints. The concept terms are the shared vocabulary in
// docs/plans/cli-skill-alignment.md.
const BANNED =
  /\b(ladder|rung|rungs|unsaved|you|your|yours|actually|look|looks)\b|→|—|, not \b|\btheme tokens?\b|\bcomponent tokens?\b|\bpackage defaults?\b|\btoken famil(?:y|ies)\b|--family\b/i;

function stringLiterals(source: string): string[] {
  const withoutComments = source
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/(^|[^:'"`\\])\/\/[^\n]*/g, '$1');
  const literals: string[] = [];
  const re = /'((?:[^'\\\n]|\\.)*)'|"((?:[^"\\\n]|\\.)*)"|`((?:[^`\\]|\\.)*)`/g;
  for (const m of withoutComments.matchAll(re)) literals.push(m[1] ?? m[2] ?? m[3] ?? '');
  return literals;
}

describe('CLI strings use the skills\' vocabulary', () => {
  it.each(FILES)('%s', (file) => {
    const hits = stringLiterals(readFileSync(join(ROOT, file), 'utf8')).filter((s) => BANNED.test(s));
    expect(hits).toEqual([]);
  });
});
