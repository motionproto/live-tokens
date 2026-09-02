#!/usr/bin/env node
// CLI for @motion-proto/live-tokens.
// Subcommands:
//   create <dir>             Scaffold a new app that depends on this package.
//   setup-claude [--force]   Copy bundled Claude Code skills into ./.claude/skills/.
//   components [id]          List every component the project has, shipped and its own, with props and tokens.
//   tokens [--family <name>] List every theme token by family, with its value.
//   report                   The project as facts: tokens read, components used, findings by rule. Always exits 0.
//   check-component [id]     Validate a component (or every authored one) against the create-component skill contract.
//   check-page [paths...]    Validate pages against the build-page skill contract.
//   generate-theme <brief>   Build a theme from a 10-seed OKLCH brief and open it.
//   adjust <ops.json>        Apply radius/padding/gap/border-width ops to the open buffer.
//   set-fonts <brief.json>   Bind Google Fonts families to the theme's font stacks.
//   migrate [...]            Reconcile tokens.css, the data tree, and route references.

import { cpSync, existsSync, mkdirSync, readdirSync, statSync, writeSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import process from 'node:process';
import { COMPONENT_RULES, checkComponent, discoverComponents, formatReport } from './check-component.mjs';
import { PAGE_RULES, checkPages, discoverPages } from './check-page.mjs';
import { describeComponents, describeTokens, formatComponents, formatTokens } from './lib/catalogue.mjs';
import { buildReport, formatReport as formatProjectReport } from './lib/report.mjs';
import { loadVocabulary } from './lib/tokenVocabulary.mjs';
import {
  applySeverity,
  countBySeverity,
  formatFindings,
  parseCheckFlags,
  readChecksConfig,
  toJson,
} from './lib/findings.mjs';
import {
  runMigrate,
  formatMigrateResult,
  runMigrateData,
  formatMigrateDataResult,
} from './migrate.mjs';
import { runMigrateRoutes, formatRouteResult } from './migrate-routes.mjs';
import { runCreate, formatCreateResult } from './create.mjs';
import { runGenerateTheme, formatGenerateThemeResult } from './generate-theme.mjs';
import { runAdjust, formatAdjustResult } from './adjust.mjs';
import { runSetFonts, formatSetFontsResult } from './set-fonts.mjs';

const USAGE = `Usage: npx @motion-proto/live-tokens <command> [options]

Commands:
  create <dir> [--force]      Scaffold a new Svelte + Vite app wired up with
                              live-tokens (editor, components, theme tokens)
  setup-claude [--force]      Install bundled Claude Code skills into ./.claude/skills/
  components [id] [--json]    List every component the project has, shipped and
                              its own (src/system/components plus any
                              "componentDirs" in live-tokens.config.json), with
                              the props each takes; with an id, that component's
                              props, variants, tokens, and defaults
  tokens [--family <name>] [--json]
                              List every theme token the project's tokens.css
                              declares, by family, with its value
  report [--json]             The project as facts: pending migrations, tokens
                              each component declares and reads, which page
                              renders which component, and both checkers'
                              findings by rule under the project's severities
                              and under --strict. A reading, not a gate: always
                              exits 0
  check-component [id]        Validate <id>'s runtime, editor, and registration
                              against the live-tokens-create-component contract
  check-page [paths...]       Validate pages against the live-tokens-build-page
                              contract: catalogue components only, and every CSS
                              value a theme token. Checks every page under src/
                              when given no paths.

Both check commands accept:
  --json                      Machine-readable findings, for a skill to iterate
                              against until the exit code is 0
  --strict                    Treat warnings as errors
  --off=<rule,...>            Silence rules; --warn=/--error= change severity
                              (or set "checks": { "rules": {...} } in
                              live-tokens.config.json; "checks": { "exclude":
                              [...] } drops paths from discovery entirely)
  generate-theme <brief.json> [--no-activate] [--dry-run] [--carry-from <name>]
                              Build a full theme from a 10-seed OKLCH brief
                              (see the live-tokens-generate-theme skill),
                              enforce AA contrast on derived text tokens, write
                              themes/<slug>.json, and open it in the editor.
                              Opening never changes what your site ships; Adopt
                              in the editor does that.
                              --no-activate writes the theme without opening it;
                              --dry-run prints the contrast report without
                              writing. Non-color content (gradients, fonts,
                              component aliases) carries forward from the live
                              look, or from theme <name> with --carry-from.
  adjust <ops.json> [--dry-run]
                              Move radius, padding, gap, and border-width
                              aliases along their token scales (see the
                              live-tokens-adjust-geometry skill). Reads each
                              component's live config and writes the result to
                              that component's unsaved buffer, so save the open
                              theme in the editor to keep it. --dry-run prints
                              the report without writing.
  set-fonts <brief.json> [--dry-run] [--no-verify]
                              Bind Google Fonts families to --font-display,
                              --font-sans, --font-serif, --font-mono and
                              --font-editorial (see
                              the live-tokens-pair-fonts skill). Each family is
                              verified against the Google Fonts API and the URL
                              is negotiated from the weights it actually has.
                              Writes the result to the unsaved colors-and-type
                              buffer, so save the open theme in the editor to
                              keep it. --dry-run prints the report without
                              writing; --no-verify skips the network and
                              requires an explicit URL per family.
  migrate [--check] [--write] [--tokens <path>]
                              Reconcile your project with the installed package:
                              applies additive tokens.css migrations, moves a
                              pre-0.48 data tree onto the current directory
                              names, heals what the retired pointer files named,
                              and reports source references to the
                              editor/components/docs routes that moved to
                              /live-tokens/* in 0.35.0. --write also rewrites the
                              unambiguous route references (never /docs). --check
                              prints both plans without writing (exit 1 when
                              either is pending; route findings are advisory).
`;

// A large body written through console.log is cut at the pipe buffer when the
// process exits before stdout drains, so a query writes synchronously.
function writeOut(text) {
  const buf = Buffer.from(`${text}\n`);
  let offset = 0;
  while (offset < buf.length) {
    try {
      offset += writeSync(1, buf, offset, buf.length - offset);
    } catch (error) {
      if (error.code !== 'EAGAIN') throw error;
    }
  }
}

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

function reportChecks(label, findings, checked, rules, opts) {
  const resolved = applySeverity(findings, rules, opts, readChecksConfig(process.cwd()));
  console.log(
    opts.json
      ? toJson(resolved, { label, checked })
      : formatFindings(resolved, { label, checked }),
  );
  process.exit(countBySeverity(resolved).errors === 0 ? 0 : 1);
}

if (command === 'components') {
  const opts = parseCheckFlags(rest);
  const list = describeComponents(loadVocabulary());
  const id = opts.rest[0];
  if (id && !list.some((c) => c.id === id)) fail(formatComponents(list, { id }));
  writeOut(opts.json ? JSON.stringify(id ? list.find((c) => c.id === id) : list, null, 2) : formatComponents(list, { id }));
  process.exit(0);
}

if (command === 'tokens') {
  const opts = parseCheckFlags(rest);
  const at = opts.rest.indexOf('--family');
  const family = at >= 0 ? opts.rest[at + 1] : undefined;
  const desc = describeTokens(loadVocabulary());
  if (family && !desc.families.some((f) => f.family === family)) fail(formatTokens(desc, { family }));
  writeOut(
    opts.json
      ? JSON.stringify(family ? desc.families.find((f) => f.family === family) : desc, null, 2)
      : formatTokens(desc, { family }),
  );
  process.exit(0);
}

if (command === 'report') {
  const opts = parseCheckFlags(rest);
  const report = buildReport(loadVocabulary());
  try {
    const plan = await runMigrate({ check: true });
    report.migrations =
      plan.status === 'no-path'
        ? { status: 'no tokens.css' }
        : plan.status === 'would-change'
          ? { status: 'pending', pending: plan.applied ?? plan.migrations ?? [] }
          : { status: 'none pending' };
  } catch {
    report.migrations = { status: 'unavailable (compiled engine not built)' };
  }
  writeOut(opts.json ? JSON.stringify(report, null, 2) : formatProjectReport(report));
  process.exit(0);
}

if (command === 'check-component') {
  const opts = parseCheckFlags(rest);
  const ids = opts.rest.length > 0 ? [opts.rest[0]] : discoverComponents();
  if (ids.length === 0) {
    console.log('✓ check-component: no component authored under src/system/components yet.');
    process.exit(0);
  }
  const results = ids.map((id) => [id, checkComponent(id)]);
  if (ids.length === 1 && !opts.json && !opts.strict && opts.off.length + opts.warn.length + opts.error.length === 0) {
    const [id, result] = results[0];
    console.log(formatReport(id, result));
    process.exit(result.errors.length === 0 ? 0 : 1);
  }
  const label = ids.length === 1 ? `check-component ${ids[0]}` : 'check-component';
  reportChecks(label, results.flatMap(([, r]) => r.findings), ids.length, COMPONENT_RULES, opts);
}

if (command === 'check-page') {
  const opts = parseCheckFlags(rest);
  const targets = opts.rest.length > 0 ? opts.rest : discoverPages(process.cwd());
  const { findings, checked } = checkPages(targets, { root: process.cwd() });
  reportChecks('check-page', findings, checked, PAGE_RULES, opts);
}

if (command === 'generate-theme') {
  const briefPath = rest.find((a) => !a.startsWith('-'));
  if (!briefPath) {
    fail(`Usage: npx @motion-proto/live-tokens generate-theme <brief.json> [--no-activate] [--dry-run]`);
  }
  try {
    const carryIdx = rest.indexOf('--carry-from');
    const carryFrom = carryIdx !== -1 ? rest[carryIdx + 1] : undefined;
    if (carryIdx !== -1 && !carryFrom) fail(`--carry-from requires a theme name`);
    const result = await runGenerateTheme({
      briefPath,
      activate: !rest.includes('--no-activate'),
      dryRun: rest.includes('--dry-run'),
      carryFrom,
    });
    console.log(formatGenerateThemeResult(result));
    process.exit(result.report.failures.length === 0 ? 0 : 1);
  } catch (err) {
    fail(`generate-theme failed: ${err instanceof Error ? err.message : String(err)}`);
  }
}

if (command === 'adjust') {
  const opsPath = rest.find((a) => !a.startsWith('-'));
  if (!opsPath) {
    fail(`Usage: npx @motion-proto/live-tokens adjust <ops.json> [--dry-run]`);
  }
  if (rest.includes('--no-activate')) {
    fail(
      `adjust has no --no-activate: it edits the open buffer, which is what the page already runs. ` +
        `Drop the flag and re-run.`,
    );
  }
  try {
    const result = await runAdjust({
      opsPath,
      dryRun: rest.includes('--dry-run'),
    });
    console.log(formatAdjustResult(result));
    process.exit(0);
  } catch (err) {
    fail(`adjust failed: ${err instanceof Error ? err.message : String(err)}`);
  }
}

if (command === 'set-fonts') {
  const briefPath = rest.find((a) => !a.startsWith('-'));
  if (!briefPath) {
    fail(`Usage: npx @motion-proto/live-tokens set-fonts <brief.json> [--dry-run] [--no-verify]`);
  }
  if (rest.includes('--no-activate')) {
    fail(
      `set-fonts has no --no-activate: it edits the open buffer, which is what the page already runs. ` +
        `Drop the flag and re-run.`,
    );
  }
  try {
    const result = await runSetFonts({
      briefPath,
      dryRun: rest.includes('--dry-run'),
      verify: !rest.includes('--no-verify'),
    });
    console.log(formatSetFontsResult(result));
    process.exit(0);
  } catch (err) {
    fail(`set-fonts failed: ${err instanceof Error ? err.message : String(err)}`);
  }
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

    // Data-tree pass: retires the pre-working-set pointer files and the copies
    // they named. Runs on every migrate, --write included, because leaving a
    // tree half on each model is what the heal exists to end.
    const data = await runMigrateData({ check });
    const dataOut = formatMigrateDataResult(data);
    if (dataOut) console.log('\n' + dataOut);

    // Route-reference pass: advisory by default, rewrites the unambiguous hits
    // only with --write (and never under --check).
    const routes = runMigrateRoutes({ root: process.cwd(), apply: write && !check });
    const routeOut = formatRouteResult(routes, { check });
    if (routeOut) console.log('\n' + routeOut);

    // Route findings are advisory; token migrations and the data heal gate the
    // exit code.
    if (result.status === 'no-path') process.exit(1);
    if (check && (result.status === 'would-change' || data.status === 'planned')) process.exit(1);
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
  'live-tokens-generate-theme': 'make me a bright and cheerful theme',
  'live-tokens-adjust-geometry': 'make the buttons pill shaped',
  'live-tokens-pair-fonts': 'pair some fonts for this theme',
  'live-tokens-fix-findings': 'make check:design pass',
  'live-tokens-check-compliance': 'check this project against the design system',
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
