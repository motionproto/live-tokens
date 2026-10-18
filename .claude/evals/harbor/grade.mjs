// Harbor's verifier for a billing run. It runs in a fresh container from the
// verifier image, where Harbor has already put the run's declared artifacts
// over the base project at their own paths, so every arm meets the full
// checkers whatever the arm could run itself. Writes the reward, the findings,
// the inventory, and a desktop and a mobile screenshot to /logs/verifier.
import { spawn } from 'node:child_process';
import { copyFileSync, existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import process from 'node:process';
import { BASE, authoredIds, checkRun, newPages, projectReport } from './checks.mjs';

const GRADERS = '/tests/graders';
const OUT = '/logs/verifier';
const BRAND = 'src/live-tokens/data/themes/brand.json';
const ROUTE = '/billing';
// Vite binds localhost to ::1 in the container, where Node's fetch tries 127.0.0.1.
const ORIGIN = 'http://127.0.0.1:5390';
const VIEWPORTS = [
  { name: 'desktop', width: 1280, height: 900 },
  { name: 'mobile', width: 390, height: 844 },
];
// Findings whose message names a raw value the run wrote instead of a token.
const LITERAL_RULES = new Set(['color-literal', 'dimension-literal', 'raw-text-axis', 'hardcoded-columns']);
mkdirSync(OUT, { recursive: true });
const notes = [];

// Every arm previews the same brand theme, so a run that edited it is scored
// against the image's copy and flagged.
const brandChanged = !existsSync(BRAND) || readFileSync(BRAND, 'utf8') !== readFileSync(join(BASE, BRAND), 'utf8');
if (brandChanged) {
  mkdirSync(dirname(BRAND), { recursive: true });
  copyFileSync(join(BASE, BRAND), BRAND);
  notes.push('the run changed brand.json, so it was scored against the image\'s copy');
}

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

const pages = newPages();
if (pages.length === 0) notes.push('no new page under src/pages');
const report = projectReport();
const ids = authoredIds(report);
if (ids.length === 0) notes.push('no component authored');
const checks = checkRun(pages, ids);
const errors = pages.length === 0 || checks.some((c) => c.errors === null) ? null : checks.reduce((n, c) => n + c.errors, 0);

const configPath = 'live-tokens.config.json';
const rules = existsSync(configPath) ? JSON.parse(readFileSync(configPath, 'utf8')).checks?.rules ?? {} : {};
const silenced = Object.entries(rules).filter(([, severity]) => severity === 'off').map(([rule]) => rule);
if (silenced.length > 0) notes.push(`live-tokens.config.json turns off: ${silenced.join(', ')}`);

function declarations(css) {
  const found = new Map();
  for (const m of css.matchAll(/(--[\w-]+)\s*:\s*([^;{}]+);/g)) {
    found.set(m[1], [...(found.get(m[1]) ?? []), m[2].trim()]);
  }
  return found;
}

function inventory() {
  const origin = new Map(report.components.map((c) => [c.id, c.origin]));
  const used = report.usage.byPage
    .filter((p) => pages.includes(p.file))
    .flatMap((p) => p.components.map((c) => ({ ...c, origin: origin.get(c.id) })));
  const created = report.components
    .filter((c) => c.origin !== 'shipped')
    .map(({ id, file, registered, tokens }) => ({ id, file, registered, properties: tokens }));

  const TOKENS = 'src/system/styles/tokens.css';
  const template = declarations(readFileSync(join(BASE, TOKENS), 'utf8'));
  const current = existsSync(TOKENS) ? declarations(readFileSync(TOKENS, 'utf8')) : new Map();
  const addedTokens = [...current.keys()].filter((name) => !template.has(name));
  const changedTokens = [...current.keys()].filter((name) => template.has(name) && current.get(name).join('|') !== template.get(name).join('|'));

  const owned = created.map((c) => `--${c.id}-`);
  const shipped = report.components.filter((c) => c.origin === 'shipped').map((c) => c.id);
  const authoredFiles = [...pages, ...created.map((c) => c.file), ...created.map((c) => c.file.replace(/\.svelte$/, 'Editor.svelte'))];
  const customProperties = [];
  for (const file of authoredFiles) {
    if (!existsSync(file)) continue;
    for (const name of declarations(readFileSync(file, 'utf8')).keys()) {
      // `--sketch-*` are the hooks the create-component skill's sketch mode prescribes.
      if (name.startsWith('--sketch-') || owned.some((prefix) => name.startsWith(prefix))) continue;
      // A shipped component's semantic property set in place is property-override's
      // finding, so it is listed but not counted as a new token.
      const component = shipped.find((id) => name.startsWith(`--${id}-`));
      customProperties.push({ name, file, overrides: template.has(name), component });
    }
  }
  const literals = checks
    .flatMap((c) => c.findings)
    .filter((f) => LITERAL_RULES.has(f.rule))
    .map((f) => `${f.file}:${f.line} ${f.message.replace(/\. Use .*$/s, '')}`);
  return { used, created, addedTokens, changedTokens, customProperties, literals };
}

async function waitForServer(url, child) {
  for (let i = 0; i < 120; i++) {
    if (child.exitCode !== null) throw new Error('the dev server exited');
    try {
      if ((await fetch(url)).ok) return;
    } catch {}
    await new Promise((r) => setTimeout(r, 500));
  }
  throw new Error('the dev server did not answer within 60 s');
}

async function screenshots() {
  const { chromium } = await import('/app/node_modules/playwright/index.mjs');
  const server = spawn(process.execPath, ['node_modules/vite/bin/vite.js', '--host', '127.0.0.1', '--port', new URL(ORIGIN).port, '--strictPort'], { stdio: 'ignore' });
  const browser = await chromium.launch();
  try {
    await waitForServer(`${ORIGIN}/`, server);
    const shots = [];
    for (const viewport of VIEWPORTS) {
      const page = await browser.newPage({ viewport: { width: viewport.width, height: viewport.height }, deviceScaleFactor: 2 });
      await page.goto(`${ORIGIN}${ROUTE}`, { waitUntil: 'networkidle' });
      await page.waitForSelector('[data-live-tokens-page]', { timeout: 15000 });
      await page.addStyleTag({ content: '[data-live-tokens-chrome] { display: none !important; }' });
      await page.waitForTimeout(500);
      await page.screenshot({ path: join(OUT, `${viewport.name}.png`), fullPage: true });
      await page.close();
      shots.push(viewport.name);
    }
    return shots;
  } catch (error) {
    notes.push(`screenshot failed: ${error.message.split('\n')[0]}`);
    return [];
  } finally {
    await browser.close();
    server.kill('SIGINT');
    await new Promise((r) => setTimeout(r, 300));
    if (server.exitCode === null) server.kill('SIGKILL');
  }
}

writeFileSync(join(OUT, 'inventory.json'), JSON.stringify(inventory(), null, 2));
const shots = pages.length > 0 ? await screenshots() : [];
writeFileSync(join(OUT, 'findings.json'), JSON.stringify({ graders, checks, errors, brandChanged, silenced, shots, notes }, null, 2));
const passed = graders.filter((g) => g.passed).length;
writeFileSync(join(OUT, 'reward.json'), JSON.stringify({
  grader_score: passed / graders.length,
  checker_errors: errors ?? -1,
  brand_changed: brandChanged ? 1 : 0,
}));
console.log(`graders ${passed}/${graders.length}, checker errors ${errors ?? 'unread'}${brandChanged ? ', brand.json changed' : ''}`);
for (const note of notes) console.log(note);
