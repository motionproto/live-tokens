#!/usr/bin/env node
// Enforce the token-as-API contract at release time (see TOKENS.md, RELEASING.md).
//
// Token names (`--*` in tokens.css) are public API. This check has two parts:
//
//   1. Classification integrity — every additive migration must only add. We
//      apply each one to the canonical tokens.css and fail if any token
//      disappears (a rename/remove masquerading as backward-compatible).
//
//   2. Version gate — a *breaking* migration introduced in this release requires
//      a major version bump. Pre-1.0 this only warns (0.x may break in a minor,
//      if flagged in the CHANGELOG); from 1.0.0 it fails.
//
// Runs AFTER build:lib in prepublishOnly, so it imports the built engine
// (dist-plugin) — the same source of truth the CLI uses. The behavioral half is
// also covered by vite-plugin/tokensCssMigrations/contract.test.ts for fast
// local feedback; this script adds the git/version-aware half.

import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { resolve, basename } from 'node:path';
import { pathToFileURL } from 'node:url';

const ROOT = resolve(new URL('..', import.meta.url).pathname);
const ENGINE = resolve(ROOT, 'dist-plugin/tokensCssMigrations/index.js');
const TOKENS_CSS = resolve(ROOT, 'src/system/styles/tokens.css');
const MIGRATIONS_DIR = 'vite-plugin/tokensCssMigrations/migrations';

function fail(msg) {
  console.error(`[check-token-contract] ${msg}`);
  process.exit(1);
}

function git(args) {
  return execFileSync('git', args, { cwd: ROOT, encoding: 'utf8' }).trim();
}

const { TOKENS_CSS_MIGRATIONS, findContractViolations, enforceBreakingRequiresMajor } =
  await import(pathToFileURL(ENGINE).href).catch((e) =>
    fail(`could not load built engine at ${ENGINE} (run npm run build:plugin first): ${e.message}`),
  );

// Part 1: classification integrity.
const canonical = readFileSync(TOKENS_CSS, 'utf8');
const violations = findContractViolations(canonical);
if (violations.length) {
  for (const v of violations) {
    console.error(
      `[check-token-contract] migration "${v.id}" is declared additive but removes: ${v.removed.join(', ')}`,
    );
  }
  fail(`${violations.length} additive migration(s) remove or rename tokens. Mark them kind:'breaking'.`);
}

// Part 2: version gate. Best-effort — skips cleanly when there's no prior tag or
// git isn't available, since pre-1.0 the gate only warns anyway.
const nextVersion = JSON.parse(readFileSync(resolve(ROOT, 'package.json'), 'utf8')).version;

// The previous release tag — the newest v* reachable from HEAD that isn't this
// release's own tag. At CI publish time HEAD *is* the release tag, so a plain
// `git describe` would compare the tag to itself; skipping `v${nextVersion}`
// yields the real predecessor in both CI and local pre-tag working trees.
let prevTag;
try {
  const tags = git(['tag', '--sort=-v:refname', '--merged', 'HEAD', '--list', 'v*'])
    .split('\n')
    .filter(Boolean);
  prevTag = tags.find((t) => t !== `v${nextVersion}`);
} catch {
  /* git unavailable */
}
if (!prevTag) {
  console.log('[check-token-contract] OK (no prior tag; version gate skipped).');
  process.exit(0);
}

let newIds = [];
try {
  newIds = git(['diff', '--name-only', '--diff-filter=A', `${prevTag}..HEAD`, '--', MIGRATIONS_DIR])
    .split('\n')
    .filter(Boolean)
    .map((p) => basename(p, '.ts'));
} catch {
  // Detached/odd state — fall back to "nothing new" rather than a false alarm.
  newIds = [];
}

const newMigrations = TOKENS_CSS_MIGRATIONS.filter((m) => newIds.includes(m.id));
const gate = enforceBreakingRequiresMajor({
  newMigrations,
  prevVersion: prevTag,
  nextVersion,
});

if (gate.level === 'error') fail(gate.message);
if (gate.level === 'warn') console.warn(`[check-token-contract] WARNING: ${gate.message}`);

const note = newMigrations.length
  ? `${newMigrations.length} new migration(s) since ${prevTag}: ${newMigrations.map((m) => `${m.id}(${m.kind})`).join(', ')}`
  : `no new migrations since ${prevTag}`;
console.log(`[check-token-contract] OK — additive migrations are non-destructive; ${note}.`);
