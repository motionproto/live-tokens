// Page targets for `check-page --tests`: a page source file paired with the
// route that renders it.
//
// The route table is the consumer's own `pages` object, found by the file that
// imports `LiveTokensRouter`, and read statically the way `missing-source`
// already reads it. A route that object cannot express — one served by
// `resolve()` — is mapped by hand under `pageRoutes` in the testing settings.
// Parameter values are never guessed and the app entry point is never imported
// into Node.

import { existsSync, readFileSync, statSync } from 'node:fs';
import { join, relative, resolve } from 'node:path';
import { walk } from './tokenVocabulary.mjs';

/**
 * Directories that hold the system rather than pages built on it. Mirrors
 * `NOT_PAGES` in `check-page.mjs`; duplicated so the static checker can import
 * this module without an import cycle, and pinned to it by
 * `pageRoutes.test.ts`.
 */
export const SYSTEM_DIRS = ['src/system', 'src/editor', 'src/lib', 'src/live-tokens'];

const SETTINGS_FILES = [
  'live-tokens.testing.ts',
  'live-tokens.testing.mts',
  'live-tokens.testing.js',
  'live-tokens.testing.mjs',
];

export function settingsFilePath(root) {
  for (const name of SETTINGS_FILES) {
    const path = join(root, name);
    if (existsSync(path)) return path;
  }
  return null;
}

/** Block comments first: a `//` inside one must not seed a second, overlapping
 *  strip. Same reasoning as `contractRunner.mjs`'s own scraper. */
function stripComments(text) {
  return text.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '');
}

function skipString(text, start) {
  const quote = text[start];
  for (let i = start + 1; i < text.length; i++) {
    if (text[i] === '\\') { i++; continue; }
    if (text[i] === quote) return i;
  }
  return text.length;
}

/** The text between the braces of the object literal opening at `open`. */
function objectBody(text, open) {
  let depth = 0;
  for (let i = open; i < text.length; i++) {
    const ch = text[i];
    if (ch === "'" || ch === '"' || ch === '`') { i = skipString(text, i); continue; }
    if (ch === '{') depth++;
    else if (ch === '}') {
      depth--;
      if (depth === 0) return text.slice(open + 1, i);
    }
  }
  return null;
}

/** Top-level `key: value` pairs of an object body, values kept as source text. */
function objectEntries(body) {
  const entries = [];
  let depth = 0;
  let start = 0;
  const push = (chunk) => {
    const match = /^\s*(?:'([^']*)'|"([^"]*)"|([A-Za-z_$][\w$]*))\s*:([\s\S]*)$/.exec(chunk);
    if (!match) return;
    entries.push({ key: match[1] ?? match[2] ?? match[3], value: match[4].trim() });
  };
  for (let i = 0; i < body.length; i++) {
    const ch = body[i];
    if (ch === "'" || ch === '"' || ch === '`') { i = skipString(body, i); continue; }
    if (ch === '{' || ch === '[' || ch === '(') depth++;
    else if (ch === '}' || ch === ']' || ch === ')') depth--;
    else if (ch === ',' && depth === 0) {
      push(body.slice(start, i));
      start = i + 1;
    }
  }
  push(body.slice(start));
  return entries;
}

function namedObject(text, field) {
  const at = new RegExp(`\\b${field}\\s*[:=]\\s*\\{`).exec(text);
  if (!at) return null;
  return objectBody(text, at.index + at[0].length - 1);
}

const ROUTER_IMPORT = /import\s*\{[^}]*\bLiveTokensRouter\b[^}]*\}\s*from\s*['"]/;

/** Every file under `src/` that mounts the router, sorted so a project with
 *  more than one entry point resolves the same way on every run. */
export function routerFiles(root) {
  const src = join(root, 'src');
  if (!existsSync(src)) return [];
  return walk(src, ['.svelte'])
    .filter((file) => ROUTER_IMPORT.test(stripComments(readFileSync(file, 'utf8'))))
    .sort();
}

/** Route path -> page source, from the `pages` object of every router file.
 *  The first file to claim a route keeps it. */
export function routeTable(root) {
  const table = new Map();
  for (const file of routerFiles(root)) {
    const body = namedObject(stripComments(readFileSync(file, 'utf8')), 'pages');
    if (body === null) continue;
    for (const { key, value } of objectEntries(body)) {
      const source = /\bsource\s*:\s*['"]([^'"]+)['"]/.exec(value);
      if (!source || table.has(key)) continue;
      table.set(key, source[1]);
    }
  }
  return table;
}

/**
 * `pageRoutes` from the testing settings: page source -> concrete URL. Read
 * from the file's source text, like `contractRunner.mjs`'s `dataDir` scrape,
 * because importing the settings file would fail on its own extensionless
 * imports. A `pageRoutes` key present in live code that this cannot read as
 * a plain string map throws rather than falling through to a silent default:
 * an unread mapping reads as a page with no route.
 */
export function settingsPageRoutes(root) {
  const settings = settingsFilePath(root);
  if (!settings) return new Map();
  const live = stripComments(readFileSync(settings, 'utf8'));
  const body = namedObject(live, 'pageRoutes');
  if (body === null) {
    if (/\bpageRoutes\s*:/.test(live)) {
      throw new Error(
        `"pageRoutes" in ${settings} is not a plain object literal, so --tests cannot read it statically. `
        + 'Write it as literal page-path to URL string pairs, or remove the key.',
      );
    }
    return new Map();
  }
  const routes = new Map();
  for (const { key, value } of objectEntries(body)) {
    const url = /^['"]([^'"]+)['"]$/.exec(value);
    if (!url) {
      throw new Error(
        `"pageRoutes['${key}']" in ${settings} is not a plain string literal, so --tests cannot read it statically.`,
      );
    }
    routes.set(key, url[1]);
  }
  return routes;
}

function isSystemPath(rel) {
  return SYSTEM_DIRS.some((dir) => rel === dir || rel.startsWith(`${dir}/`));
}

function toRelative(root, target) {
  return relative(root, resolve(root, target)).split('\\').join('/');
}

const NO_ROUTE =
  'no route renders this page. Give its entry in the pages object a `source` field, '
  + 'or map the file to a concrete URL under `pageRoutes` in live-tokens.testing.ts.';

/**
 * The pages `--tests` opens, each with the route that renders it.
 *
 * With no paths, every mapped page outside the system directories is a target.
 * With paths, each one is looked up in the same map; a file no route names
 * comes back with `route: null` and the `reason` the caller reports as a
 * `tests-setup` finding.
 */
export function resolvePageTargets(paths = [], root = process.cwd()) {
  const mapped = new Map();
  for (const [route, source] of routeTable(root)) {
    const rel = toRelative(root, source);
    if (!mapped.has(rel)) mapped.set(rel, route);
  }
  // An explicit mapping wins: it exists because the route table could not
  // express the route in the first place.
  for (const [source, url] of settingsPageRoutes(root)) {
    mapped.set(toRelative(root, source), url);
  }

  const pages = [...mapped.entries()]
    .filter(([source]) => !isSystemPath(source))
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([source, route]) => ({ source, route }));

  if (paths.length === 0) return pages;

  const targets = [];
  for (const path of paths) {
    const full = resolve(root, path);
    if (existsSync(full) && statSync(full).isDirectory()) {
      const prefix = `${toRelative(root, path)}/`;
      targets.push(...pages.filter((page) => page.source.startsWith(prefix)));
      continue;
    }
    const rel = toRelative(root, path);
    const route = mapped.get(rel);
    targets.push(route === undefined ? { source: rel, route: null, reason: NO_ROUTE } : { source: rel, route });
  }
  return targets;
}
