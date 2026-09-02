// The registry as a query. Every component a project has, shipped or its own,
// with the props each takes and the tokens each declares, and every theme token
// grouped by family. Read from files through the same vocabulary the checkers
// use, so a skill or a script sees exactly what the checkers will hold it to.

import { readFileSync } from 'node:fs';
import { relative } from 'node:path';
import { CONTRACT_FAMILIES } from './tokenVocabulary.mjs';

/** The runtime file's leading HTML comment, which is where a component says what it is for. */
function descriptionOf(source) {
  const m = source.match(/^\s*<!--([\s\S]*?)-->/);
  if (!m) return '';
  return m[1]
    .split('\n')
    .map((line) => line.trim())
    .join(' ')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/^\S+\.svelte\s*[—–-]+\s*/, '');
}

function familyOf(name) {
  const stem = name.replace(/^--/, '');
  const hit = CONTRACT_FAMILIES
    .filter((f) => stem === f || stem.startsWith(`${f}-`))
    .sort((a, b) => b.length - a.length)[0];
  return hit ?? stem.split('-')[0];
}

export function describeComponents(vocab, { root = process.cwd() } = {}) {
  const out = [];
  for (const entry of vocab.components.values()) {
    const source = readFileSync(entry.file, 'utf8');
    const props = entry.props
      ? [...entry.props.props].map((name) => ({
          name,
          type: entry.props.types.get(name) ?? '',
          values: entry.props.enums.has(name) ? [...entry.props.enums.get(name)] : undefined,
        }))
      : [];
    out.push({
      id: entry.id,
      name: entry.name,
      origin: entry.origin,
      file: relative(root, entry.file),
      registered: entry.origin === 'shipped' || vocab.registered.has(entry.id),
      description: descriptionOf(source),
      variants: entry.props?.enums.get('variant') ? [...entry.props.enums.get('variant')] : [],
      props,
      tokens: [...entry.tokens].map(([name, value]) => ({ name, default: value })),
    });
  }
  return out.sort((a, b) => a.origin.localeCompare(b.origin) || a.id.localeCompare(b.id));
}

export function describeTokens(vocab, { root = process.cwd() } = {}) {
  const values = new Map();
  if (vocab.tokensCssPath) {
    const css = readFileSync(vocab.tokensCssPath, 'utf8').replace(/\/\*[\s\S]*?\*\//g, ' ');
    for (const m of css.matchAll(/(--[a-z0-9-]+)\s*:\s*([^;]+);/g)) {
      if (!values.has(m[1])) values.set(m[1], m[2].trim());
    }
  }
  const byFamily = new Map();
  for (const name of vocab.themeTokens) {
    const family = familyOf(name);
    if (!byFamily.has(family)) byFamily.set(family, []);
    byFamily.get(family).push({ name, value: values.get(name) ?? '' });
  }
  return {
    tokensCss: vocab.tokensCssPath ? relative(root, vocab.tokensCssPath) : null,
    families: [...byFamily].map(([family, tokens]) => ({ family, tokens })),
    components: [...vocab.components.values()].map((c) => ({
      id: c.id,
      tokens: [...c.tokens].map(([name, value]) => ({ name, default: value })),
    })),
  };
}

export function formatComponents(list, { id } = {}) {
  const lines = [];
  if (id) {
    const c = list.find((x) => x.id === id);
    if (!c) return `No component "${id}". Run \`live-tokens components\` for the list.`;
    lines.push(`${c.name} (${c.id}, ${c.origin}${c.registered ? '' : ', NOT registered'})  ${c.file}`);
    if (c.description) lines.push(`  ${c.description}`);
    if (c.props.length) {
      lines.push('  props:');
      for (const p of c.props) lines.push(`    ${p.name}${p.values ? `: ${p.values.join(' | ')}` : p.type ? `: ${p.type}` : ''}`);
    }
    lines.push(`  tokens (${c.tokens.length}):`);
    for (const t of c.tokens) lines.push(`    ${t.name}: ${t.default}`);
    return lines.join('\n');
  }
  for (const c of list) {
    const variants = c.variants.length ? `  variants: ${c.variants.join(', ')}` : '';
    lines.push(`${c.id.padEnd(20)} ${c.origin.padEnd(8)} ${c.name}${c.registered ? '' : '  (NOT registered)'}${variants}`);
    if (c.description) lines.push(`${''.padEnd(29)} ${c.description}`);
  }
  lines.push('');
  lines.push(`${list.length} component(s). \`live-tokens components <id>\` prints one with its props and tokens.`);
  return lines.join('\n');
}

export function formatTokens(desc, { family } = {}) {
  const lines = [];
  const families = family ? desc.families.filter((f) => f.family === family) : desc.families;
  if (family && families.length === 0) {
    return `No family "${family}". Families: ${desc.families.map((f) => f.family).join(', ')}.`;
  }
  lines.push(`Theme tokens from ${desc.tokensCss ?? '(no tokens.css found)'}`);
  for (const f of families) {
    lines.push('');
    lines.push(`${f.family} (${f.tokens.length})`);
    for (const t of f.tokens) lines.push(`  ${t.name}: ${t.value}`);
  }
  if (!family) {
    lines.push('');
    lines.push(`Component tokens: ${desc.components.reduce((n, c) => n + c.tokens.length, 0)} across ${desc.components.length} component(s). \`live-tokens components <id>\` lists one component's.`);
  }
  return lines.join('\n');
}
