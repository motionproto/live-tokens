// `live-tokens migrate` route-reference pass (0.35.0 namespace move).
//
// The package's dev-only routes moved to a reserved `/live-tokens/*` namespace,
// so consumer source that hardcoded `/editor`, `/components`, or `/docs` (e.g.
// `navigate('/editor')` from the old scaffold) now 404s. This scans the
// consumer's source and reports those references; with `apply`, it rewrites the
// unambiguous ones.
//
// Safety: `/docs` is never auto-rewritten (consumers commonly own a docs page),
// and any path the project declares as its own (a `pages` key) or manages via
// `editorRoutes` is left as an advisory. A reference is rewritten only when the
// package definitely owns that path.

import { existsSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { extname, join, relative } from 'node:path';

const MOVED = [
  { old: '/editor', next: '/live-tokens/editor' },
  { old: '/components', next: '/live-tokens/components' },
  { old: '/docs', next: '/live-tokens/docs' },
];

// Never auto-rewritten: a consumer's own docs page is the common case, and we
// can't tell their `/docs` from the package's without guessing.
const NEVER_AUTOWRITE = new Set(['/docs']);

const SCAN_EXTS = new Set(['.svelte', '.ts', '.js', '.mjs', '.tsx', '.jsx']);
const SKIP_DIRS = new Set(['node_modules', 'dist', 'dist-plugin', '.git', '.svelte-kit', 'build']);

function walk(dir, out = []) {
  let entries;
  try {
    entries = readdirSync(dir, { withFileTypes: true });
  } catch {
    return out;
  }
  for (const e of entries) {
    if (e.isDirectory()) {
      if (!SKIP_DIRS.has(e.name)) walk(join(dir, e.name), out);
    } else if (SCAN_EXTS.has(extname(e.name))) {
      out.push(join(dir, e.name));
    }
  }
  return out;
}

// `navigate('/p')` / `navigate("/p")` / `navigate(`/p`)` and the href forms
// `href="/p"` / `href='/p'` / `href={'/p'}`. The closing backreference quote
// pins the path to the exact string, so `/live-tokens/editor` never matches
// `/editor` (the char before `/editor` there is `s`, not a quote).
function refRegex(oldPath) {
  return new RegExp(`(navigate\\(\\s*|href\\s*=\\s*\\{?\\s*)(['"\`])${oldPath}\\2`, 'g');
}

function kindOf(prefix) {
  return prefix.trimStart().startsWith('href') ? 'href' : 'navigate';
}

/**
 * A path is the consumer's, not the package's, if they declare a page at it
 * (`'/x':` in a pages map) or name it in an `editorRoutes` override. Conservative
 * by design: when unsure we mark it owned, which only ever downgrades a rewrite
 * to an advisory.
 */
function detectConsumerOwned(files) {
  const owned = new Set();
  for (const file of files) {
    const c = readFileSync(file, 'utf8');
    const hasEditorRoutes = /editorRoutes/.test(c);
    for (const { old } of MOVED) {
      const key = old.slice(1);
      if (new RegExp(`['"]\\/${key}['"]\\s*:`).test(c)) owned.add(old);
      if (hasEditorRoutes && new RegExp(`\\b${key}\\s*:`).test(c)) owned.add(old);
    }
  }
  return owned;
}

function scanContent(content) {
  const lines = content.split('\n');
  const found = [];
  for (const { old, next } of MOVED) {
    const re = refRegex(old);
    lines.forEach((text, i) => {
      re.lastIndex = 0;
      let m;
      while ((m = re.exec(text))) {
        found.push({ line: i + 1, kind: kindOf(m[1]), old, next });
      }
    });
  }
  return found;
}

function applyRewrites(content, paths) {
  let out = content;
  for (const { old, next } of paths) {
    out = out.replace(refRegex(old), (_full, prefix, quote) => `${prefix}${quote}${next}${quote}`);
  }
  return out;
}

/**
 * Scan (and with `apply`, rewrite) source under `root`. Returns
 * `{ scannedFiles, rewritten, pendingWrite, advisory, owned }` — `rewritten` is
 * populated only when `apply` is true; otherwise auto-writable hits land in
 * `pendingWrite`. `advisory` always holds the hits we won't touch automatically.
 */
export function runMigrateRoutes({ root = process.cwd(), apply = false } = {}) {
  const srcDir = join(root, 'src');
  const base = existsSync(srcDir) ? srcDir : root;
  const files = walk(base);
  const owned = detectConsumerOwned(files);

  const rewritten = [];
  const pendingWrite = [];
  const advisory = [];

  for (const file of files) {
    const content = readFileSync(file, 'utf8');
    const rel = relative(root, file);
    const hits = scanContent(content).map((h) => ({
      ...h,
      file: rel,
      autoWrite: !NEVER_AUTOWRITE.has(h.old) && !owned.has(h.old),
      reason: NEVER_AUTOWRITE.has(h.old) ? 'docs-never' : owned.has(h.old) ? 'consumer-owned' : null,
    }));
    if (hits.length === 0) continue;

    const auto = hits.filter((h) => h.autoWrite);
    advisory.push(...hits.filter((h) => !h.autoWrite));

    if (apply && auto.length) {
      const paths = MOVED.filter((m) => auto.some((h) => h.old === m.old));
      const next = applyRewrites(content, paths);
      if (next !== content) {
        writeFileSync(file, next);
        rewritten.push(...auto);
      }
    } else {
      pendingWrite.push(...auto);
    }
  }

  return { scannedFiles: files.length, rewritten, pendingWrite, advisory, owned: [...owned] };
}

export function formatRouteResult(result, { check = false } = {}) {
  const { rewritten, pendingWrite, advisory } = result;
  if (!rewritten.length && !pendingWrite.length && !advisory.length) return '';

  const ref = (h) => `      ${h.file}:${h.line}  ${h.kind} '${h.old}' → '${h.next}'`;
  const lines = ['Route references — /editor, /components, /docs moved to /live-tokens/* in 0.35.0:'];

  if (rewritten.length) {
    lines.push(`  ✓ Rewrote ${rewritten.length} reference(s):`);
    rewritten.forEach((h) => lines.push(ref(h)));
  }
  if (pendingWrite.length) {
    lines.push(
      check
        ? `  Would rewrite ${pendingWrite.length} reference(s) with --write:`
        : `  ${pendingWrite.length} reference(s) can be rewritten — re-run with --write to apply:`,
    );
    pendingWrite.forEach((h) => lines.push(ref(h)));
  }
  if (advisory.length) {
    lines.push(`  ⚠ ${advisory.length} reference(s) need manual review:`);
    advisory.forEach((h) => {
      const why =
        h.reason === 'docs-never'
          ? `/docs is never auto-rewritten — update to '${h.next}' only if it points at the package guide`
          : `you declare or relocate '${h.old}' yourself — leave it if it's your route`;
      lines.push(`      ${h.file}:${h.line}  ${h.kind} '${h.old}'  (${why})`);
    });
  }
  if (rewritten.length) lines.push('\n  Review the diff in git before committing.');
  return lines.join('\n');
}
