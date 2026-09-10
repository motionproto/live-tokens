#!/usr/bin/env node
// CLI for @motion-proto/live-tokens.
// Subcommands:
//   create <dir>             Scaffold a new app that depends on this package.
//   setup-claude [--force]   Copy bundled Claude Code skills into ./.claude/skills/.
//   components [id]          List every component the project has, shipped and its own, with props and tokens.
//   tokens [--scale <name>]  List every design token by scale, with its value.
//   report                   The project as facts: tokens read, components used, findings by rule. Always exits 0.
//   check-component [id]     Validate a component (or every authored one) against the create-component skill contract.
//   check-page [paths...]    Validate pages against the create-page skill contract.
//   set-colors <colors>      Build the color identity from 10 OKLCH base colors, into the open buffer.
//   set-geometry <ops>       Apply radius/padding/gap/border-width ops to the open buffer.
//   set-type <pairing>       Bind Google Fonts families to the theme's font stacks.
//   save-theme <name>        Compose the live state into themes/<slug>.json and open it.
//   migrate [...]            Reconcile tokens.css, the data tree, and route references.

import { writeSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import process from 'node:process';
import { COMPONENT_RULES, COMPONENT_RULE_FIX, checkComponent, discoverComponents, formatReport } from './check-component.mjs';
import { PAGE_RULES, checkPages, discoverPages } from './check-page.mjs';
import { resolvePageTargets } from './lib/pageRoutes.mjs';
import { describeComponents, describeTokens, formatComponents, formatTokens } from './lib/catalogue.mjs';
import { buildReport, formatReport as formatProjectReport } from './lib/report.mjs';
import { loadVocabulary } from './lib/tokenVocabulary.mjs';
import {
  applyCoverageSeverity,
  applySeverity,
  countBySeverity,
  formatFindings,
  isExcluded,
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
import { runSetupClaude, formatSetupResult } from './setup-claude.mjs';
import { runSetColors, formatSetColorsResult } from './set-colors.mjs';
import { runSetGeometry, formatSetGeometryResult } from './set-geometry.mjs';
import { runSetType, formatSetTypeResult } from './set-type.mjs';
import { runSaveTheme, formatSaveThemeResult } from './save-theme.mjs';

const USAGE = `Usage: npx @motion-proto/live-tokens <command> [options]

Commands:
  create <dir> [--force]      Scaffold a new Svelte + Vite app wired up with
                              live-tokens (editor, components, design tokens)
  setup-claude [--force]      Install bundled Claude Code skills into ./.claude/skills/
  components [id] [--json]    List every component the project has, shipped and
                              its own (src/system/components plus any
                              "componentDirs" in live-tokens.config.json). With
                              an id, that component's props, variants, tokens,
                              and defaults
  tokens [--scale <name>] [--json]
                              List every design token the project's tokens.css
                              declares, by scale, with its value
  report [--json]             The project as facts: pending migrations, tokens
                              each component declares and reads, which page
                              renders which component, and both checkers'
                              findings by rule under the project's severities
                              and under --strict. Always exits 0
  check-component [id] [--tests]
                              Validate <id>'s runtime, editor, and registration
                              against the live-tokens-create-component contract.
                              --tests also runs the registry contract under
                              vitest and the component contract suites under
                              Playwright, reporting coverage by rule. Needs
                              @playwright/test, vitest, and happy-dom; a
                              missing one is a tests-not-installed finding
                              naming the install command
  check-page [paths...] [--tests]
                              Validate pages against the live-tokens-create-page
                              contract: catalogue components only, and every CSS
                              value a design token. Checks every page under src/
                              when given no paths. --tests also opens each
                              page's own route in the consumer's own app and
                              proves, per shipped rule id, that the cascade
                              painted every component from its semantic
                              properties, every run of text sits in one shipped
                              text style, every text/surface pair meets AA,
                              sections sit on the page grid, and nothing
                              overflows. Needs @playwright/test, vitest, and
                              happy-dom; a missing one is a tests-not-installed
                              finding naming the install command

check-component and check-page also accept:
  --json                      Machine-readable findings, for a skill to iterate
                              against until the exit code is 0
  --strict                    Treat warnings as errors
  --off=<rule,...>            Silence rules; --warn=/--error= change severity
                              (or set "checks": { "rules": {...} } in
                              live-tokens.config.json; "checks": { "exclude":
                              [...] } drops paths from discovery entirely)
  set-colors <base-colors.json> [--dry-run]
                              Build the theme's whole color identity from 10
                              OKLCH base colors (see the live-tokens-set-colors
                              skill) and enforce AA contrast on the derived text
                              tokens. Reads the live colors and type and writes
                              the result to the colors-and-type buffer. Run
                              save-theme to keep it as a theme. Fonts and every
                              override no palette owns carry forward. --dry-run
                              prints the contrast report without writing.
  set-geometry <ops.json> [--dry-run]
                              Move radius, padding, gap, and border-width
                              aliases along their token scales (see the
                              live-tokens-set-geometry skill). Reads each
                              component's live config and writes the result to
                              that component's buffer. Run save-theme to keep it
                              as a theme. --dry-run prints the report without
                              writing.
  set-type <pairing.json> [--dry-run] [--no-verify]
                              Bind Google Fonts families to --font-display,
                              --font-sans, --font-serif, --font-mono and
                              --font-editorial (see
                              the live-tokens-set-type skill). Each family is
                              verified against the Google Fonts API and the URL
                              is negotiated from the weights it has. Writes the
                              result to the colors-and-type buffer. Run
                              save-theme to keep it as a theme. --dry-run prints
                              the report without writing. --no-verify skips the
                              network and requires an explicit URL per family.
  save-theme <name> [--no-activate] [--dry-run]
                              Compose the live state (the buffers, the open
                              theme under them, the shipped defaults under that)
                              into themes/<slug>.json and load it, which clears
                              the buffers. With no buffer it saves a copy of the
                              open theme under the new name. Loading never
                              changes what the site ships. Adopt in the editor
                              does that. --no-activate writes the theme and does
                              not load it, so a set of themes comes off one
                              starting theme. --dry-run prints the report
                              without writing.
  migrate [--check] [--write] [--tokens <path>]
                              Reconcile the project with the installed package:
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

if (command === 'create') {
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

function reportChecks(label, findings, checked, rules, opts, { coverage, hardFailure, fixes } = {}) {
  const checksConfig = readChecksConfig(process.cwd());
  const resolved = applySeverity(findings, rules, opts, checksConfig, fixes ?? {});
  const resolvedCoverage = coverage ? applyCoverageSeverity(coverage, rules, opts, checksConfig) : coverage;
  console.log(
    opts.json
      ? toJson(resolved, { label, checked, coverage: resolvedCoverage })
      : formatFindings(resolved, { label, checked }),
  );
  // Decision 2: a missing tool or a setup failure under --tests is an error
  // even if a project silenced its rule id, since silencing it would read as
  // "the tests passed" rather than "the tests did not run".
  process.exit(countBySeverity(resolved).errors === 0 && !hardFailure ? 0 : 1);
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
  const at = opts.rest.indexOf('--scale');
  const scale = at >= 0 ? opts.rest[at + 1] : undefined;
  const desc = describeTokens(loadVocabulary());
  if (scale && !desc.scales.some((s) => s.scale === scale)) fail(formatTokens(desc, { scale }));
  writeOut(
    opts.json
      ? JSON.stringify(scale ? desc.scales.find((s) => s.scale === scale) : desc, null, 2)
      : formatTokens(desc, { scale }),
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
  if (ids.length === 0 && !opts.tests) {
    console.log('✓ check-component: no component authored under src/system/components yet.');
    process.exit(0);
  }
  const results = ids.map((id) => [id, checkComponent(id)]);
  if (!opts.tests && ids.length === 1 && !opts.json && !opts.strict && opts.off.length + opts.warn.length + opts.error.length === 0) {
    const [id, result] = results[0];
    console.log(formatReport(id, result));
    process.exit(result.errors.length === 0 ? 0 : 1);
  }
  const label = ids.length === 1 ? `check-component ${ids[0]}${opts.tests ? ' --tests' : ''}` : `check-component${opts.tests ? ' --tests' : ''}`;
  if (!opts.tests) {
    reportChecks(label, results.flatMap(([, r]) => r.findings), ids.length, COMPONENT_RULES, opts, { fixes: COMPONENT_RULE_FIX });
  }
  const { hasHardFailure, runContractTests } = await import('./contractRunner.mjs');
  const testOutcome = await runContractTests(opts.rest[0], { root: process.cwd() });
  const findings = [...results.flatMap(([, r]) => r.findings), ...testOutcome.findings];
  reportChecks(label, findings, Math.max(ids.length, 1), COMPONENT_RULES, opts, {
    fixes: COMPONENT_RULE_FIX,
    coverage: testOutcome.coverage,
    hardFailure: hasHardFailure(testOutcome.findings),
  });
}

if (command === 'check-page') {
  const opts = parseCheckFlags(rest);
  const targets = opts.rest.length > 0 ? opts.rest : discoverPages(process.cwd());
  const { findings, checked } = checkPages(targets, { root: process.cwd() });
  if (!opts.tests) {
    reportChecks('check-page', findings, checked, PAGE_RULES, opts);
  }
  const { hasHardFailure, runPageTests } = await import('./contractRunner.mjs');
  const allTargets = resolvePageTargets(opts.rest, process.cwd());
  // Mirrors `discoverPages`'s own exclusion: an explicit path on the command
  // line always checks (`isExcluded`'s own contract), and only the
  // no-paths-given discovery drops `checks.exclude` paths — the seam Wave 2
  // left for this wave, so `--tests` targets the same pages the static half
  // just checked above.
  const pageTargets =
    opts.rest.length > 0 ? allTargets : allTargets.filter((t) => !isExcluded(t.source, process.cwd()));
  const testOutcome = await runPageTests(pageTargets, { root: process.cwd() });
  const label = 'check-page --tests';
  const allFindings = [...findings, ...testOutcome.findings];
  reportChecks(label, allFindings, Math.max(checked, pageTargets.length), PAGE_RULES, opts, {
    coverage: testOutcome.coverage,
    hardFailure: hasHardFailure(testOutcome.findings),
  });
}

if (command === 'set-colors') {
  const baseColorsPath = rest.find((a) => !a.startsWith('-'));
  if (!baseColorsPath) {
    fail(`Usage: npx @motion-proto/live-tokens set-colors <base-colors.json> [--dry-run]`);
  }
  if (rest.includes('--no-activate')) {
    fail(
      `set-colors has no --no-activate: it edits the open buffer, which is what the page already runs. ` +
        `Nothing is activated until save-theme, which takes the flag.`,
    );
  }
  if (rest.includes('--carry-from')) {
    fail(
      `set-colors has no --carry-from: it reads the live theme and edits it in place, so a second theme ` +
        `already starts from the first. Run save-theme --no-activate between themes.`,
    );
  }
  try {
    const result = await runSetColors({
      baseColorsPath,
      dryRun: rest.includes('--dry-run'),
    });
    console.log(formatSetColorsResult(result));
    process.exit(result.report.failures.length === 0 ? 0 : 1);
  } catch (err) {
    fail(`set-colors failed: ${err instanceof Error ? err.message : String(err)}`);
  }
}

if (command === 'set-geometry') {
  const opsPath = rest.find((a) => !a.startsWith('-'));
  if (!opsPath) {
    fail(`Usage: npx @motion-proto/live-tokens set-geometry <ops.json> [--dry-run]`);
  }
  if (rest.includes('--no-activate')) {
    fail(
      `set-geometry has no --no-activate: it edits the open buffer, which is what the page already runs. ` +
        `Drop the flag and re-run.`,
    );
  }
  try {
    const result = await runSetGeometry({
      opsPath,
      dryRun: rest.includes('--dry-run'),
    });
    console.log(formatSetGeometryResult(result));
    process.exit(0);
  } catch (err) {
    fail(`set-geometry failed: ${err instanceof Error ? err.message : String(err)}`);
  }
}

if (command === 'set-type') {
  const pairingPath = rest.find((a) => !a.startsWith('-'));
  if (!pairingPath) {
    fail(`Usage: npx @motion-proto/live-tokens set-type <pairing.json> [--dry-run] [--no-verify]`);
  }
  if (rest.includes('--no-activate')) {
    fail(
      `set-type has no --no-activate: it edits the open buffer, which is what the page already runs. ` +
        `Drop the flag and re-run.`,
    );
  }
  try {
    const result = await runSetType({
      pairingPath,
      dryRun: rest.includes('--dry-run'),
      verify: !rest.includes('--no-verify'),
    });
    console.log(formatSetTypeResult(result));
    process.exit(0);
  } catch (err) {
    fail(`set-type failed: ${err instanceof Error ? err.message : String(err)}`);
  }
}

if (command === 'save-theme') {
  const name = rest.find((a) => !a.startsWith('-'));
  if (!name) {
    fail(`Usage: npx @motion-proto/live-tokens save-theme <name> [--no-activate] [--dry-run]`);
  }
  try {
    const result = await runSaveTheme({
      name,
      activate: !rest.includes('--no-activate'),
      dryRun: rest.includes('--dry-run'),
    });
    console.log(formatSaveThemeResult(result));
    process.exit(0);
  } catch (err) {
    fail(`save-theme failed: ${err instanceof Error ? err.message : String(err)}`);
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

try {
  const result = runSetupClaude({
    pkgRoot,
    cwd: process.cwd(),
    force: rest.includes('--force'),
  });
  console.log(formatSetupResult(result));
  process.exit(0);
} catch (err) {
  fail(err instanceof Error ? err.message : String(err));
}
