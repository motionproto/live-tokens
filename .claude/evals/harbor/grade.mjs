// Harbor's verifier for a billing run, inside the run's own container: the
// case's graders, then the full checkers with their browser tests, which this
// container can start. Writes the reward and the findings to /logs/verifier.
import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const GRADERS = '/tests/graders';
const OUT = '/logs/verifier';
const TEMPLATE_PAGES = new Set(['Home.svelte']);
mkdirSync(OUT, { recursive: true });

// The graders' front matter is a fixed subset of YAML: `key: value`, one nested
// `target:` block, and single-quoted patterns that double an inner quote.
function frontMatter(text) {
  const block = text.match(/^---\n([\s\S]*?)\n---/)?.[1] ?? '';
  const fields = {};
  for (const line of block.split('\n')) {
    const m = line.match(/^\s*(\w+):\s*(.*)$/);
    if (!m || m[2] === '') continue;
    fields[m[1]] = m[2].startsWith("'") ? m[2].slice(1, -1).replace(/''/g, "'") : m[2];
  }
  return fields;
}

const graders = readdirSync(GRADERS).filter((name) => name.endsWith('.md')).map((name) => {
  const g = frontMatter(readFileSync(join(GRADERS, name), 'utf8'));
  if (g.type !== 'regex') throw new Error(`${name}: grade.mjs reads regex graders only, and this one is ${g.type}.`);
  const text = existsSync(g.path) ? readFileSync(g.path, 'utf8') : null;
  const found = text !== null && new RegExp(g.pattern).test(text);
  const passed = g.match === 'not_contains' ? text !== null && !found : found;
  return { name: name.replace(/\.md$/, ''), passed };
});

function check(args) {
  const out = spawnSync('npx', ['live-tokens', ...args, '--tests', '--strict', '--json', '--no-fix'], { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
  try {
    return { label: args.join(' '), ...JSON.parse(out.stdout) };
  } catch {
    return { label: args.join(' '), errors: null, note: (out.stderr || out.stdout).trim().split('\n').slice(0, 5).join('\n') };
  }
}

const pages = existsSync('src/pages') ? readdirSync('src/pages').filter((n) => n.endsWith('.svelte') && !TEMPLATE_PAGES.has(n)).map((n) => `src/pages/${n}`) : [];
const report = spawnSync('npx', ['live-tokens', 'report', '--json'], { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
const authored = JSON.parse(report.stdout).components.filter((c) => c.origin !== 'shipped').map((c) => c.id);
const checks = [
  ...(pages.length ? [check(['check-page', ...pages])] : []),
  ...authored.map((id) => check(['check-component', id])),
];
const errors = pages.length === 0 || checks.some((c) => c.errors === null) ? null : checks.reduce((n, c) => n + c.errors, 0);

writeFileSync(join(OUT, 'findings.json'), JSON.stringify({ graders, checks }, null, 2));
const score = graders.filter((g) => g.passed).length / graders.length;
writeFileSync(join(OUT, 'reward.json'), JSON.stringify({ grader_score: score, checker_errors: errors ?? -1 }));
console.log(`graders ${graders.filter((g) => g.passed).length}/${graders.length}, checker errors ${errors ?? 'unread'}`);
