// Severity resolution and reporting shared by check-page and check-component.
//
// Every rule has a default severity. Three things can override it, last wins:
// `checks.rules` in live-tokens.config.json, then the CLI flags
// (--off/--warn/--error), then --strict, which promotes every warning.
//
// A checker returns findings; this module decides what they mean and how they
// print. `--json` output is the contract a skill iterates against, so the shape
// here is deliberately stable.

import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

export const SEVERITIES = ['off', 'warn', 'error'];

/** Line number of `index` within `text`, 1-based. */
export function lineOf(text, index) {
  let line = 1;
  for (let i = 0; i < index && i < text.length; i++) if (text[i] === '\n') line++;
  return line;
}

export function readChecksConfig(root) {
  const path = join(root, 'live-tokens.config.json');
  if (!existsSync(path)) return {};
  try {
    return JSON.parse(readFileSync(path, 'utf8')).checks ?? {};
  } catch {
    return {};
  }
}

/**
 * Parse `--off=a,b --warn=c --error=d --strict --json` out of argv.
 * Unrecognised flags are returned in `rest` for the caller to handle.
 */
export function parseCheckFlags(argv) {
  const opts = { off: [], warn: [], error: [], strict: false, json: false, rest: [] };
  for (const arg of argv) {
    const m = arg.match(/^--(off|warn|error)=(.+)$/);
    if (m) {
      opts[m[1]].push(...m[2].split(',').map((s) => s.trim()).filter(Boolean));
    } else if (arg === '--strict') opts.strict = true;
    else if (arg === '--json') opts.json = true;
    else opts.rest.push(arg);
  }
  return opts;
}

/**
 * Resolve each finding's severity and drop the ones turned off.
 * `rules` maps rule id to its default severity.
 */
export function applySeverity(findings, rules, opts = {}, config = {}) {
  const configured = config.rules ?? {};
  const resolve = (id) => {
    let severity = rules[id] ?? 'error';
    if (SEVERITIES.includes(configured[id])) severity = configured[id];
    if (opts.off?.includes(id)) severity = 'off';
    if (opts.warn?.includes(id)) severity = 'warn';
    if (opts.error?.includes(id)) severity = 'error';
    if (opts.strict && severity === 'warn') severity = 'error';
    return severity;
  };
  return findings
    .map((f) => ({ ...f, severity: resolve(f.rule) }))
    .filter((f) => f.severity !== 'off');
}

export function countBySeverity(findings) {
  return {
    errors: findings.filter((f) => f.severity === 'error').length,
    warnings: findings.filter((f) => f.severity === 'warn').length,
  };
}

export function formatFindings(findings, { label, checked = 0 } = {}) {
  const { errors, warnings } = countBySeverity(findings);
  if (findings.length === 0) {
    return `✓ ${label}: ${checked} file(s) clean.`;
  }
  const lines = [];
  const byFile = new Map();
  for (const f of findings) {
    if (!byFile.has(f.file)) byFile.set(f.file, []);
    byFile.get(f.file).push(f);
  }
  for (const [file, group] of byFile) {
    lines.push(file);
    for (const f of group.sort((a, b) => a.line - b.line)) {
      const mark = f.severity === 'error' ? '✗' : '!';
      lines.push(`  ${mark} ${f.line}:  ${f.message}  [${f.rule}]`);
    }
    lines.push('');
  }
  lines.push(`${label}: ${errors} error(s), ${warnings} warning(s) across ${checked} file(s).`);
  if (warnings > 0 && errors === 0) {
    lines.push('Warnings do not fail the check. Re-run with --strict to treat them as errors.');
  }
  return lines.join('\n');
}

export function toJson(findings, { label, checked = 0 } = {}) {
  const { errors, warnings } = countBySeverity(findings);
  return JSON.stringify({ check: label, checked, errors, warnings, findings }, null, 2);
}
