// The project as facts. Every section is deterministic: what the tokens.css
// declares, what each component reads, which component each page renders, and
// what the two checkers report under the project's severities and under
// --strict. Nothing here interprets; the check skill narrates it and the fix
// skill acts on it. Reads files only, like the vocabulary it is built on.

import { readFileSync } from 'node:fs';
import { relative } from 'node:path';
import { COMPONENT_RULES, checkComponent, discoverComponents } from '../check-component.mjs';
import { COMPONENT_IMPORT, PAGE_RULES, checkPages, discoverPages } from '../check-page.mjs';
import { applySeverity, readChecksConfig } from './findings.mjs';

function countByRule(findings) {
  const out = {};
  for (const f of findings) out[f.rule] = (out[f.rule] ?? 0) + 1;
  return out;
}

const SEVERITY_ORDER = { error: 0, warn: 1 };

/**
 * Errors first, then the rule with the most findings, then file and line. The
 * rule tiebreak keeps one rule's findings together when two rules tie on count,
 * so the list reads as a fix list rather than a file listing.
 */
function sortFindings(findings) {
  const counts = countByRule(findings);
  return [...findings].sort(
    (a, b) =>
      SEVERITY_ORDER[a.severity] - SEVERITY_ORDER[b.severity] ||
      counts[b.rule] - counts[a.rule] ||
      a.rule.localeCompare(b.rule) ||
      a.file.localeCompare(b.file) ||
      a.line - b.line,
  );
}

function summarise(findings, rules, config, exclude) {
  const resolved = sortFindings(applySeverity(findings, rules, {}, config, { exclude }));
  const strict = applySeverity(findings, rules, { strict: true }, config, { exclude });
  return {
    errors: resolved.filter((f) => f.severity === 'error').length,
    warnings: resolved.filter((f) => f.severity === 'warn').length,
    strictErrors: strict.filter((f) => f.severity === 'error').length,
    byRule: countByRule(resolved),
    items: resolved,
  };
}

export function buildReport(vocab, { root = process.cwd() } = {}) {
  const config = readChecksConfig(root);

  // What a component is, as facts. What is wrong with it is a finding:
  // unread properties, a missing description, and an unregistered project
  // component are rules now, each carrying its own severity and repair.
  const components = [...vocab.components.values()].map((c) => ({
    id: c.id,
    origin: c.origin,
    file: relative(root, c.file),
    registered: vocab.builtIn.has(c.id) || vocab.registered.has(c.id),
    tokens: c.tokens.size,
  }));

  const pageFiles = discoverPages(root);
  const byPage = [];
  const pagesOf = new Map();
  for (const file of pageFiles) {
    if (!file.endsWith('.svelte')) continue;
    const text = readFileSync(file, 'utf8').replace(/<style[^>]*>[\s\S]*?<\/style>/g, ' ');
    const used = [];
    for (const m of text.matchAll(/import\s+(\w+)\s+from\s+['"]([^'"]+)['"]/g)) {
      const comp = m[2].match(COMPONENT_IMPORT);
      if (!comp) continue;
      const id = comp[1].toLowerCase();
      const rendered = [...text.matchAll(new RegExp(`<${m[1]}(?=[\\s/>])`, 'g'))].length;
      used.push({ id, rendered });
      if (!pagesOf.has(id)) pagesOf.set(id, []);
      pagesOf.get(id).push(relative(root, file));
    }
    byPage.push({ file: relative(root, file), components: used });
  }
  const byComponent = components.map((c) => ({ id: c.id, origin: c.origin, pages: pagesOf.get(c.id) ?? [] }));

  const pageFindings = checkPages(pageFiles, { root, vocabulary: vocab }).findings;
  const authored = discoverComponents(root);
  const componentFindings = authored.flatMap((id) => checkComponent(id, root, { vocabulary: vocab }).findings);

  // Key order is the order a reader takes the report in, and `migrations` is
  // filled by the caller (it needs the compiled engine), so it holds its place
  // here rather than landing last.
  return {
    project: {
      root,
      tokensCss: vocab.tokensCssPath ? relative(root, vocab.tokensCssPath) : null,
      themeTokens: vocab.themeTokens.size,
      components: components.length,
      pages: pageFiles.length,
    },
    migrations: null,
    components,
    findings: {
      pages: summarise(pageFindings, PAGE_RULES, config, true),
      components: { checked: authored, ...summarise(componentFindings, COMPONENT_RULES, config) },
    },
    usage: {
      byPage,
      byComponent,
      unusedShipped: byComponent.filter((c) => c.origin === 'shipped' && c.pages.length === 0).map((c) => c.id),
      customUnused: byComponent.filter((c) => c.origin === 'custom' && c.pages.length === 0).map((c) => c.id),
    },
  };
}

const list = (items, max = 20) =>
  items.length <= max ? items.join(', ') : `${items.slice(0, max).join(', ')}, +${items.length - max} more`;

/** How a rule's findings are repaired. A rule that lowered its repair on some
 *  of them names both, so the line never overstates what code can do. */
const repairsFor = (items, rule) =>
  [...new Set(items.filter((f) => f.rule === rule).map((f) => f.repair))].sort().join('/');

export function formatReport(r) {
  const out = [];
  out.push(`Project: ${r.project.pages} page file(s), ${r.project.components} component(s), ${r.project.themeTokens} design tokens from ${r.project.tokensCss ?? '(no tokens.css)'}`);
  if (r.migrations) {
    out.push('');
    out.push(`Migrations: ${r.migrations.status}${r.migrations.pending?.length ? ` (${list(r.migrations.pending)})` : ''}`);
  }

  out.push('');
  out.push('Components');
  out.push(`  semantic properties declared: ${r.components.reduce((n, c) => n + c.tokens, 0)}`);
  const custom = r.components.filter((c) => c.origin === 'custom');
  out.push(`  custom: ${custom.length}${custom.length ? ` (${list(custom.map((c) => c.id))})` : ''}`);

  const section = (label, s) => {
    out.push('');
    out.push(`${label}: ${s.errors} error(s), ${s.warnings} warning(s); ${s.strictErrors} under --strict`);
    for (const [rule, n] of Object.entries(s.byRule).sort((a, b) => b[1] - a[1])) {
      out.push(`  ${rule}: ${n}  [${repairsFor(s.items, rule)}]`);
    }
  };
  section('check-page', r.findings.pages);
  section(`check-component (${r.findings.components.checked.length} authored)`, r.findings.components);

  out.push('');
  out.push('Usage');
  for (const p of r.usage.byPage) {
    if (p.components.length === 0) continue;
    out.push(`  ${p.file}: ${p.components.map((c) => `${c.id}×${c.rendered}`).join(', ')}`);
  }
  out.push(`  pages rendering no catalogue component: ${r.usage.byPage.filter((p) => p.components.length === 0).length}`);
  out.push(`  shipped components used nowhere: ${r.usage.unusedShipped.length}${r.usage.unusedShipped.length ? ` (${list(r.usage.unusedShipped)})` : ''}`);
  if (r.usage.customUnused.length) out.push(`  custom components used nowhere: ${list(r.usage.customUnused)}`);
  return out.join('\n');
}
