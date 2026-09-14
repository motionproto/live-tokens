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

/** The line a `"<key>":` sits on. The quote on both sides of the key makes
 *  this exact by construction — `"--card-default-body"` cannot match inside
 *  `"--card-default-body-padding"`, unlike a bare substring search. */
export function findJsonKeyLine(text, key) {
  const escaped = key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const m = new RegExp(`"${escaped}"\\s*:`).exec(text);
  return m ? lineOf(text, m.index) : 1;
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
 * `checks.exclude` in live-tokens.config.json: paths the checkers do not read
 * when they discover their own targets. Each entry is a project-relative path;
 * a directory entry covers everything under it. For a file that is not a themed
 * surface — hand-tuned artwork, vendored CSS — where the alternative is
 * downgrading a rule for the whole project. Naming the file explicitly on the
 * command line still checks it.
 */
export function isExcluded(relPath, root) {
  const list = readChecksConfig(root).exclude;
  if (!Array.isArray(list)) return false;
  return list.some((entry) => {
    const e = String(entry).replace(/\/+$/, '');
    return relPath === e || relPath.startsWith(`${e}/`);
  });
}

/**
 * Parse `--off=a,b --warn=c --error=d --strict --json` out of argv.
 * Unrecognised flags are returned in `rest` for the caller to handle.
 */
export function parseCheckFlags(argv) {
  const opts = { off: [], warn: [], error: [], strict: false, json: false, tests: false, noFix: false, rest: [] };
  for (const arg of argv) {
    const m = arg.match(/^--(off|warn|error)=(.+)$/);
    if (m) {
      opts[m[1]].push(...m[2].split(',').map((s) => s.trim()).filter(Boolean));
    } else if (arg === '--strict') opts.strict = true;
    else if (arg === '--json') opts.json = true;
    else if (arg === '--tests') opts.tests = true;
    else if (arg === '--no-fix') opts.noFix = true;
    else opts.rest.push(arg);
  }
  return opts;
}

/**
 * One checker's rule table, keyed in `order`, from the modules under
 * `bin/rules/` that define its rules. An id on one side and not the other
 * throws when the checker loads.
 */
export function assembleRules(order, ...tables) {
  const defined = Object.assign({}, ...tables);
  const stray = [...order.filter((id) => !defined[id]), ...Object.keys(defined).filter((id) => !order.includes(id))];
  if (stray.length > 0) throw new Error(`rule order and rule modules disagree on: ${stray.join(', ')}`);
  return Object.fromEntries(order.map((id) => [id, defined[id]]));
}

/** The slug half of a rule table, the shape the skills and the CLI read. */
export function fixMap(rules) {
  return Object.fromEntries(Object.entries(rules).map(([id, rule]) => [id, rule.fix]));
}

/**
 * The config entry that records a deliberate decision to keep a finding.
 *
 * A page or CSS file drops out of discovery, which is narrower than turning a
 * rule off across the project. Everything else steps its rule down one notch,
 * since a rule already resolved to `warn` is not silenced by `warn`.
 */
function exceptionFor(finding, severity, exclude) {
  return exclude
    ? { checks: { exclude: [finding.file] } }
    : { checks: { rules: { [finding.rule]: severity === 'error' ? 'warn' : 'off' } } };
}

/** The same last-wins resolution `applySeverity` applies per finding, exposed
 *  standalone so coverage (which has no findings to attach a severity to, but
 *  still has to honor `--off`) can ask the same question. */
export function resolveRuleSeverity(ruleId, rules, opts = {}, config = {}) {
  const configured = config.rules ?? {};
  let severity = rules[ruleId]?.severity ?? 'error';
  if (SEVERITIES.includes(configured[ruleId])) severity = configured[ruleId];
  if (opts.off?.includes(ruleId)) severity = 'off';
  if (opts.warn?.includes(ruleId)) severity = 'warn';
  if (opts.error?.includes(ruleId)) severity = 'error';
  if (opts.strict && severity === 'warn') severity = 'error';
  return severity;
}

/**
 * Resolve each finding's severity and drop the ones turned off, then attach
 * what a repair needs: where it is fixed (`fix`), how (`repair`), and the
 * config entry that records a decision to keep it (`exception`).
 *
 * `rules` maps rule id to `{ severity, fix, repair }`. A rule's `repair` is the
 * ceiling: a finding that arrives carrying its own has already lowered it,
 * because its context is more ambiguous than the rule's.
 */
export function applySeverity(findings, rules, opts = {}, config = {}, { exclude = false } = {}) {
  return findings
    .map((f) => {
      const severity = resolveRuleSeverity(f.rule, rules, opts, config);
      const rule = rules[f.rule];
      return {
        ...f,
        severity,
        ...(rule?.fix ? { fix: rule.fix } : {}),
        repair: f.repair ?? rule?.repair ?? 'authored',
        exception: exceptionFor(f, severity, exclude),
      };
    })
    .filter((f) => f.severity !== 'off');
}

/**
 * A coverage entry for a rule resolved to severity 'off' becomes 'disabled',
 * regardless of what actually happened: the plan requires `--off` to stay
 * visible as disabled coverage rather than silently reading as a pass (an
 * obligation that failed but was silenced is not the same as one that ran
 * clean), and disabled coverage can never establish a complete pass.
 */
export function applyCoverageSeverity(coverage, rules, opts = {}, config = {}) {
  const out = {};
  for (const [id, ruleMap] of Object.entries(coverage)) {
    out[id] = {};
    for (const [rule, entry] of Object.entries(ruleMap)) {
      out[id][rule] = resolveRuleSeverity(rule, rules, opts, config) === 'off' ? { status: 'disabled' } : entry;
    }
  }
  return out;
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

export function toJson(findings, { label, checked = 0, coverage, fix } = {}) {
  const { errors, warnings } = countBySeverity(findings);
  return JSON.stringify(
    { check: label, checked, errors, warnings, ...(fix ? { fix } : {}), findings, ...(coverage ? { coverage } : {}) },
    null,
    2,
  );
}

/** The unresolved property names a `contract-alias` finding lists, read off the
 *  first line: a Playwright or Vitest stack follows on the lines after it.
 *  `assertAliasesResolve` is the only obligation that lists them; every other
 *  `contract-alias` message (an empty shipped config, say) misses and is left
 *  alone. */
const UNRESOLVED_ALIASES = /aliases resolve to nothing at the root: (.+)/;

/** `component-configs/<id>/default.json`, the file both rules name. */
const CONFIG_FILE = /component-configs[/\\]([^/\\]+)[/\\]default\.json$/;

/**
 * One broken alias, one finding.
 *
 * A `default.json` alias naming something the vocabulary lacks is a
 * `config-token` finding from plain Node, and the same string makes the
 * property resolve to nothing at the root, which the browser reports as
 * `contract-alias`. Under `--tests` both run, so the merge drops the browser's
 * copy when every name it lists already carries a `config-token` finding for
 * the same component. A `contract-alias` naming a token the vocabulary knows,
 * declared, spelled correctly, and still unresolved, is a different defect and
 * stays.
 */
export function dedupeAliasFindings(findings) {
  const broken = new Map();
  for (const f of findings) {
    if (f.rule !== 'config-token') continue;
    const id = CONFIG_FILE.exec(f.file ?? '')?.[1];
    const property = f.details?.property;
    if (!id || !property) continue;
    if (!broken.has(id)) broken.set(id, new Set());
    broken.get(id).add(property);
  }
  if (broken.size === 0) return findings;
  return findings.filter((f) => {
    if (f.rule !== 'contract-alias') return true;
    const id = CONFIG_FILE.exec(f.file ?? '')?.[1];
    const known = id ? broken.get(id) : undefined;
    if (!known) return true;
    const listed = UNRESOLVED_ALIASES.exec(String(f.message ?? '').split('\n')[0])?.[1];
    if (!listed) return true;
    return !listed.split(',').map((name) => name.trim()).filter(Boolean).every((name) => known.has(name));
  });
}
