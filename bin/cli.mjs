#!/usr/bin/env node
// CLI for @motion-proto/live-tokens.
// Subcommands:
//   create <dir>             Scaffold a new app that depends on this package.
//   setup-claude [--force]   Copy bundled Claude Code skills into ./.claude/skills/.
//   check-component <id>     Validate a component against the add-component skill contract.

import { cpSync, existsSync, mkdirSync, readdirSync, statSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import process from 'node:process';
import { checkComponent, formatReport } from './check-component.mjs';
import { runMigrate, formatMigrateResult } from './migrate.mjs';
import { runMigrateRoutes, formatRouteResult } from './migrate-routes.mjs';
import { runCreate, formatCreateResult } from './create.mjs';

const USAGE = `Usage: npx @motion-proto/live-tokens <command> [options]

Commands:
  create <dir> [--force]      Scaffold a new Svelte + Vite app wired up with
                              live-tokens (editor, components, theme tokens)
  setup-claude [--force]      Install bundled Claude Code skills into ./.claude/skills/
  check-component <id>        Validate <id>'s runtime, editor, and registration
                              against the live-tokens-create-component contract
  migrate [--check] [--write] [--tokens <path>]
                              Reconcile your project with the installed package:
                              applies additive tokens.css migrations (unless
                              --check), and reports source references to the
                              editor/components/docs routes that moved to
                              /live-tokens/* in 0.35.0. --write also rewrites the
                              unambiguous route references (never /docs). --check
                              reports without writing (exit 1 if token migrations
                              are pending; route findings are advisory).
`;

function fail(message, code = 1) {
  console.error(message);
  process.exit(code);
}

const [, , command, ...rest] = process.argv;

if (!command || command === '--help' || command === '-h') {
  console.log(USAGE);
  process.exit(0);
}

const pkgRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');

if (command === 'create' || command === 'init') {
  const targetArg = rest.find((a) => !a.startsWith('-'));
  if (!targetArg) {
    fail(`Usage: npx @motion-proto/live-tokens create <project-directory>`);
  }
  const force = rest.includes('--force');
  const targetDir = resolve(process.cwd(), targetArg);
  try {
    const result = runCreate({ targetDir, pkgRoot, force });
    console.log(formatCreateResult(result, targetArg));
    process.exit(0);
  } catch (err) {
    fail(err instanceof Error ? err.message : String(err));
  }
}

if (command === 'check-component') {
  const id = rest[0];
  if (!id) fail(`Usage: npx @motion-proto/live-tokens check-component <id>`);
  const result = checkComponent(id);
  console.log(formatReport(id, result));
  process.exit(result.errors.length === 0 ? 0 : 1);
}

if (command === 'migrate') {
  const check = rest.includes('--check');
  const write = rest.includes('--write');
  const tokensIdx = rest.indexOf('--tokens');
  const tokensArg = tokensIdx !== -1 ? rest[tokensIdx + 1] : undefined;
  if (tokensIdx !== -1 && !tokensArg) fail(`--tokens requires a path`);
  try {
    const result = await runMigrate({ tokensArg, check });
    console.log(formatMigrateResult(result, { check }));

    // Route-reference pass: advisory by default, rewrites the unambiguous hits
    // only with --write (and never under --check).
    const routes = runMigrateRoutes({ root: process.cwd(), apply: write && !check });
    const routeOut = formatRouteResult(routes, { check });
    if (routeOut) console.log('\n' + routeOut);

    // Route findings are advisory; only token migrations gate the exit code.
    if (result.status === 'no-path') process.exit(1);
    if (check && result.status === 'would-change') process.exit(1);
    process.exit(0);
  } catch (err) {
    fail(`migrate failed: ${err instanceof Error ? err.message : String(err)}`);
  }
}

if (command !== 'setup-claude') {
  fail(`Unknown command: ${command}\n\n${USAGE}`);
}

if (process.platform === 'win32') {
  fail('setup-claude is macOS/Linux only.');
}

const force = rest.includes('--force');

const srcSkills = join(pkgRoot, '.claude', 'skills');

if (!existsSync(srcSkills)) {
  fail(`No bundled skills found at ${srcSkills}. Is the package installed correctly?`);
}

const skills = readdirSync(srcSkills).filter((name) =>
  statSync(join(srcSkills, name)).isDirectory(),
);

if (skills.length === 0) {
  fail('No bundled skills to install.');
}

const destSkills = join(process.cwd(), '.claude', 'skills');
mkdirSync(destSkills, { recursive: true });

let installed = 0;
let skipped = 0;
for (const skill of skills) {
  const src = join(srcSkills, skill);
  const dest = join(destSkills, skill);
  if (existsSync(dest) && !force) {
    console.log(`  skip  ${skill}  (already exists; pass --force to overwrite)`);
    skipped++;
    continue;
  }
  cpSync(src, dest, { recursive: true });
  console.log(`  ok    ${skill}`);
  installed++;
}

console.log(`\n${installed} installed, ${skipped} skipped → ${destSkills}`);

const SAMPLE_PROMPTS = {
  'live-tokens-build-page': 'build a pricing page using live-tokens components',
  'live-tokens-pick-component': "what's the difference between TabBar and SegmentedControl?",
  'live-tokens-create-component': 'author a new Toggle component for my live-tokens project',
};

const installedSamples = skills
  .map((s) => SAMPLE_PROMPTS[s] && [s, SAMPLE_PROMPTS[s]])
  .filter(Boolean);

if (installedSamples.length > 0) {
  console.log(`\nIn Claude Code, prompts like these auto-trigger the matching skill:`);
  for (const [skill, prompt] of installedSamples) {
    console.log(`  • "${prompt}"\n    → ${skill}`);
  }
}
