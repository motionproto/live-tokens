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
import { extractGlobalRootBlocks } from './tokenVocabulary.mjs';

const SIDES = ['-top', '-right', '-bottom', '-left'];

/**
 * Tokens a component declares that nothing in its file reads. A read is the
 * name appearing outside the `:global(:root)` block: in a `var()`, in a `style:`
 * directive, or as the string a padding mixin takes. SCSS interpolation
 * (`--badge-#{$v}-surface`) reads every token the pattern covers. A per-side
 * padding is read through its parent.
 */
export function unreadTokens(source, tokens) {
  let body = source.replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/<!--[\s\S]*?-->/g, ' ');
  for (const block of extractGlobalRootBlocks(body)) body = body.replace(block, ' ');
  const patterns = [...body.matchAll(/--[a-z0-9-]*(?:#\{[^}]*\}[a-z0-9-]*)+/g)].map(
    (m) => new RegExp(`^${m[0].replace(/[.*+?^()|[\]\\]/g, '\\$&').replace(/#\{[^}]*\}/g, '[a-z0-9-]+')}$`),
  );
  const isRead = (name) => body.includes(name) || patterns.some((re) => re.test(name));
  return [...tokens].filter((name) => {
    const side = SIDES.find((s) => name.endsWith(s));
    return !isRead(name) && !(side && isRead(name.slice(0, -side.length)));
  });
}

function countByRule(findings) {
  const out = {};
  for (const f of findings) out[f.rule] = (out[f.rule] ?? 0) + 1;
  return out;
}

function summarise(findings, rules, config) {
  const resolved = applySeverity(findings, rules, {}, config);
  const strict = applySeverity(findings, rules, { strict: true }, config);
  return {
    errors: resolved.filter((f) => f.severity === 'error').length,
    warnings: resolved.filter((f) => f.severity === 'warn').length,
    strictErrors: strict.filter((f) => f.severity === 'error').length,
    byRule: countByRule(resolved),
    items: resolved.map((f) => ({ rule: f.rule, severity: f.severity, file: f.file, line: f.line, message: f.message })),
  };
}

export function buildReport(vocab, { root = process.cwd() } = {}) {
  const config = readChecksConfig(root);

  const components = [...vocab.components.values()].map((c) => {
    const source = readFileSync(c.file, 'utf8');
    return {
      id: c.id,
      name: c.name,
      origin: c.origin,
      file: relative(root, c.file),
      registered: vocab.builtIn.has(c.id) || vocab.registered.has(c.id),
      described: /^\s*<!--[\s\S]*?-->/.test(source),
      tokens: c.tokens.size,
      unread: unreadTokens(source, c.tokens.keys()),
    };
  });

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

  return {
    project: {
      root,
      tokensCss: vocab.tokensCssPath ? relative(root, vocab.tokensCssPath) : null,
      themeTokens: vocab.themeTokens.size,
      components: components.length,
      pages: pageFiles.length,
    },
    components,
    usage: {
      byPage,
      byComponent,
      unusedShipped: byComponent.filter((c) => c.origin === 'shipped' && c.pages.length === 0).map((c) => c.id),
      customUnregistered: components.filter((c) => c.origin === 'custom' && !c.registered).map((c) => c.id),
      customUnused: byComponent.filter((c) => c.origin === 'custom' && c.pages.length === 0).map((c) => c.id),
    },
    findings: {
      pages: summarise(pageFindings, PAGE_RULES, config),
      components: { checked: authored, ...summarise(componentFindings, COMPONENT_RULES, config) },
    },
  };
}

const list = (items, max = 20) =>
  items.length <= max ? items.join(', ') : `${items.slice(0, max).join(', ')}, +${items.length - max} more`;

export function formatReport(r) {
  const out = [];
  out.push(`Project: ${r.project.pages} page file(s), ${r.project.components} component(s), ${r.project.themeTokens} theme tokens from ${r.project.tokensCss ?? '(no tokens.css)'}`);
  if (r.migrations) {
    out.push('');
    out.push(`Migrations: ${r.migrations.status}${r.migrations.pending?.length ? ` (${list(r.migrations.pending)})` : ''}`);
  }

  out.push('');
  out.push('Components');
  const unread = r.components.filter((c) => c.unread.length);
  out.push(`  tokens declared and read by their own CSS: ${r.components.reduce((n, c) => n + c.tokens - c.unread.length, 0)} of ${r.components.reduce((n, c) => n + c.tokens, 0)}`);
  for (const c of unread) out.push(`    ${c.id}: ${c.unread.length} unread (${list(c.unread, 6)})`);
  const custom = r.components.filter((c) => c.origin === 'custom');
  out.push(`  custom: ${custom.length}${custom.length ? ` (${list(custom.map((c) => c.id))})` : ''}`);
  if (r.usage.customUnregistered.length) out.push(`    not registered: ${list(r.usage.customUnregistered)}`);
  const undescribed = custom.filter((c) => !c.described).map((c) => c.id);
  if (undescribed.length) out.push(`    no description comment: ${list(undescribed)}`);

  out.push('');
  out.push('Usage');
  for (const p of r.usage.byPage) {
    if (p.components.length === 0) continue;
    out.push(`  ${p.file}: ${p.components.map((c) => `${c.id}×${c.rendered}`).join(', ')}`);
  }
  out.push(`  pages rendering no catalogue component: ${r.usage.byPage.filter((p) => p.components.length === 0).length}`);
  out.push(`  shipped components used nowhere: ${r.usage.unusedShipped.length}${r.usage.unusedShipped.length ? ` (${list(r.usage.unusedShipped)})` : ''}`);
  if (r.usage.customUnused.length) out.push(`  custom components used nowhere: ${list(r.usage.customUnused)}`);

  const section = (label, s) => {
    out.push('');
    out.push(`${label}: ${s.errors} error(s), ${s.warnings} warning(s); ${s.strictErrors} under --strict`);
    for (const [rule, n] of Object.entries(s.byRule).sort((a, b) => b[1] - a[1])) out.push(`  ${rule}: ${n}`);
  };
  section('check-page', r.findings.pages);
  section(`check-component (${r.findings.components.checked.length} authored)`, r.findings.components);
  return out.join('\n');
}
