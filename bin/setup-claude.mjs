// Installs the bundled Claude Code skills into a project's ./.claude/skills/.
//
// Claude Code discovers skills only under .claude/skills/, never inside
// node_modules, so the package's own copy has to be duplicated into each
// project that wants them. That makes this command the only thing keeping the
// two trees in step, and `--force` has to mean "make the destination match this
// release" rather than "write over the files I happen to ship today":
//
//   - a skill this release renamed leaves its old directory behind, where it
//     shadows the new one with stale instructions;
//   - a reference file this release dropped survives inside a skill that is
//     otherwise current, because cpSync merges into an existing directory.
//
// Both are invisible until a model reads the stale text, so --force replaces
// each directory outright and prunes the ones this release no longer ships.

import { cpSync, existsSync, mkdirSync, readdirSync, rmSync, statSync } from 'node:fs';
import { join } from 'node:path';

// The package owns this prefix in a project's skills directory. A skill without
// it is the project's own and is never touched, whatever the flags say.
const SKILL_PREFIX = 'live-tokens-';

const SAMPLE_PROMPTS = {
  'live-tokens-create-page': 'build a pricing page using live-tokens components',
  'live-tokens-pick-component': "what's the difference between TabBar and SegmentedControl?",
  'live-tokens-create-component': 'author a new Toggle component for my live-tokens project',
  'live-tokens-create-theme': 'make me a bright and cheerful theme',
  'live-tokens-set-colors': 'give me a cooler palette, same fonts',
  'live-tokens-set-type': 'pair some fonts for this theme',
  'live-tokens-set-geometry': 'make the buttons pill shaped',
  'live-tokens-fix-findings': 'make check:design pass',
  'live-tokens-check-compliance': 'check this project against the design system',
};

function directoriesIn(dir) {
  if (!existsSync(dir)) return [];
  return readdirSync(dir).filter((name) => statSync(join(dir, name)).isDirectory());
}

export function runSetupClaude({ pkgRoot, cwd, force = false }) {
  const srcSkills = join(pkgRoot, '.claude', 'skills');

  if (!existsSync(srcSkills)) {
    throw new Error(`No bundled skills found at ${srcSkills}. Is the package installed correctly?`);
  }

  const shipped = directoriesIn(srcSkills);
  if (shipped.length === 0) {
    throw new Error('No bundled skills to install.');
  }

  const destSkills = join(cwd, '.claude', 'skills');
  mkdirSync(destSkills, { recursive: true });

  const installed = [];
  const skipped = [];
  const removed = [];

  for (const skill of shipped) {
    const dest = join(destSkills, skill);
    if (existsSync(dest) && !force) {
      skipped.push(skill);
      continue;
    }
    // Replace rather than merge: a file this release dropped must not survive
    // inside a directory that otherwise looks current.
    rmSync(dest, { recursive: true, force: true });
    cpSync(join(srcSkills, skill), dest, { recursive: true });
    installed.push(skill);
  }

  if (force) {
    for (const name of directoriesIn(destSkills)) {
      if (!name.startsWith(SKILL_PREFIX) || shipped.includes(name)) continue;
      rmSync(join(destSkills, name), { recursive: true, force: true });
      removed.push(name);
    }
  }

  return { installed, skipped, removed, destSkills, shipped };
}

export function formatSetupResult({ installed, skipped, removed, destSkills, shipped }) {
  const lines = [];

  for (const skill of shipped) {
    if (installed.includes(skill)) lines.push(`  ok    ${skill}`);
    else lines.push(`  skip  ${skill}  (already exists; pass --force to overwrite)`);
  }
  for (const skill of removed) {
    lines.push(`  gone  ${skill}  (this release no longer ships it; removed)`);
  }

  const counts = [`${installed.length} installed`, `${skipped.length} skipped`];
  if (removed.length > 0) counts.push(`${removed.length} removed`);
  lines.push(`\n${counts.join(', ')}, in ${destSkills}`);

  if (skipped.length > 0 && removed.length === 0) {
    lines.push(`\nRe-run with --force to bring every skill up to this release.`);
  }

  const samples = shipped.map((s) => SAMPLE_PROMPTS[s] && [s, SAMPLE_PROMPTS[s]]).filter(Boolean);
  if (samples.length > 0) {
    lines.push(`\nIn Claude Code, prompts like these auto-trigger the matching skill:`);
    for (const [skill, prompt] of samples) lines.push(`  "${prompt}"\n    ${skill}`);
  }

  return lines.join('\n');
}
