// `live-tokens set-fonts` worker.
//
// Reads a pairing brief (JSON), verifies each family against Google Fonts,
// binds it to a font stack via the compiled engine (dist-plugin/fontPairing —
// the CLI never imports TS sources), and writes the result into
// `colors-and-type/_working.json`: the same buffer the editor's own font edits
// land in, so a retype is an unsaved edit the user saves into a theme when they
// want to keep it. Named colors-and-type files, themes, tokens.css and
// fonts.css are never touched, and nothing is activated.

import { existsSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { resolveTokensCssPath } from './migrate.mjs';

const pkgRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const ENGINE = resolve(pkgRoot, 'dist-plugin/fontPairing/index.js');
const packageDataDir = join(pkgRoot, 'src/live-tokens/data');

// Google serves a different stylesheet per user agent; ask as a browser would
// so the weight census matches what the page will actually load.
const BROWSER_UA =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36';

const SOURCE_LABELS = {
  working: 'your unsaved edits',
  theme: 'the open theme',
  default: 'the package default',
};

async function loadEngine() {
  if (!existsSync(ENGINE)) {
    throw new Error(
      `font pairing engine not found at ${relative(process.cwd(), ENGINE)}. ` +
        `Build the plugin first (npm run build:plugin).`,
    );
  }
  return import(ENGINE);
}

function readJson(path) {
  return JSON.parse(readFileSync(path, 'utf8'));
}

function readJsonIfExists(path) {
  return existsSync(path) ? readJson(path) : null;
}

function browserFetch(url) {
  return fetch(url, { headers: { 'user-agent': BROWSER_UA } });
}

/** The open theme, read the way every other door reads it: the local file
 *  first, then the copy the installed package ships. */
function readActiveTheme(themesDir) {
  const slug = readJsonIfExists(join(themesDir, '_active.json'))?.activeFile ?? 'default';
  const theme =
    readJsonIfExists(join(themesDir, `${slug}.json`)) ??
    readJsonIfExists(join(packageDataDir, 'themes', `${slug}.json`));
  return theme ? { slug, theme } : null;
}

/** Mirrors the dev server's live colors-and-type resolution: the unsaved
 *  buffer, then the open theme's own copy, then the package default. */
function readLiveColorsAndType(colorsAndTypeDir, active) {
  const working = readJsonIfExists(join(colorsAndTypeDir, '_working.json'));
  if (working) return { colorsAndType: working, source: 'working' };
  if (active?.theme?.colorsAndType) return { colorsAndType: active.theme.colorsAndType, source: 'theme' };
  const shipped =
    readJsonIfExists(join(colorsAndTypeDir, 'default.json')) ??
    readJsonIfExists(join(packageDataDir, 'colors-and-type', 'default.json'));
  if (!shipped) throw new Error(`no colors and type to read at ${colorsAndTypeDir}`);
  return { colorsAndType: shipped, source: 'default' };
}

function normalizeFace(slot, value) {
  if (typeof value === 'string') return { name: value };
  if (value && typeof value === 'object' && typeof value.name === 'string') {
    return { name: value.name, ...(value.url ? { url: value.url } : {}) };
  }
  throw new Error(`brief slot "${slot}" must be a family name or { "name": "...", "url": "..." }`);
}

function sameJson(a, b) {
  return JSON.stringify(a) === JSON.stringify(b);
}

/** `engine` and `fetcher` are test seams; the CLI always runs the compiled
 *  bundle against the live API. */
export async function runSetFonts({
  briefPath,
  dryRun = false,
  verify = true,
  root = process.cwd(),
  colorsAndTypeDir,
  themesDir,
  tokensCssPath,
  engine,
  fetcher = browserFetch,
} = {}) {
  const {
    applyFontPairing,
    resolveGoogleFont,
    requiredWeights,
    weightCoverage,
    SLOT_ORDER,
    SLOT_VARIABLES,
    readLiveTokensConfig,
    resolveDataDirs,
  } = engine ?? (await loadEngine());

  const briefFull = resolve(root, briefPath);
  if (!existsSync(briefFull)) throw new Error(`brief file not found at ${relative(root, briefFull)}`);
  let brief;
  try {
    brief = readJson(briefFull);
  } catch (err) {
    throw new Error(`brief file is not valid JSON: ${err instanceof Error ? err.message : String(err)}`);
  }

  const requested = SLOT_ORDER.filter((slot) => brief[slot] !== undefined).map((slot) => ({
    slot,
    face: normalizeFace(slot, brief[slot]),
  }));
  if (requested.length === 0) {
    throw new Error(`brief names no slot. Use one or more of: ${SLOT_ORDER.join(', ')}.`);
  }

  const resolved = colorsAndTypeDir && themesDir ? null : resolveDataDirs();
  const colorsDir = colorsAndTypeDir ?? resolved.colorsAndTypeDir;
  const themes = themesDir ?? resolved.themesDir;
  if (!existsSync(colorsDir)) {
    throw new Error(`no colors and type at ${relative(root, colorsDir)}. Run the dev server once to create it.`);
  }

  const active = readActiveTheme(themes);
  const { colorsAndType, source } = readLiveColorsAndType(colorsDir, active);

  const pairing = {};
  const faces = [];
  for (const { slot, face } of requested) {
    if (!verify) {
      if (!face.url) {
        throw new Error(
          `--no-verify needs an explicit URL for "${slot}". Give it as ` +
            `{ "name": "${face.name}", "url": "https://fonts.googleapis.com/css2?..." } ` +
            `or drop the flag and let the CLI negotiate one.`,
        );
      }
      pairing[slot] = { name: face.name, url: face.url };
      faces.push({ slot, name: face.name, url: face.url, weights: [], italics: false, verified: false });
      continue;
    }
    const found = face.url
      ? { name: face.name, url: face.url, weights: [], italics: false }
      : await resolveGoogleFont(face.name, fetcher);
    pairing[slot] = { name: found.name, url: found.url, weights: found.weights, italics: found.italics };
    faces.push({ slot, ...found, verified: true, pinned: Boolean(face.url) });
  }

  const { colorsAndType: next, report } = applyFontPairing(colorsAndType, pairing);

  const tokensPath = resolveTokensCssPath(tokensCssPath, readLiveTokensConfig().tokensCssPath, root);
  let coverage = [];
  if (tokensPath && existsSync(tokensPath)) {
    const covered = {};
    for (const face of faces) {
      if (!face.verified || face.weights.length === 0) continue;
      covered[SLOT_VARIABLES[face.slot]] = { name: face.name, weights: face.weights, italics: face.italics };
    }
    coverage = weightCoverage(
      requiredWeights(readFileSync(tokensPath, 'utf8'), next.cssVariables ?? {}),
      covered,
    );
  }

  const workingPath = join(colorsDir, '_working.json');
  const savedColorsAndType =
    active?.theme?.colorsAndType ??
    readJsonIfExists(join(colorsDir, 'default.json')) ??
    readJsonIfExists(join(packageDataDir, 'colors-and-type', 'default.json'));

  // Returning the buffer to what the open theme already holds is a discard,
  // not an edit — the same call the dev server's own PUT makes.
  const backToSaved = savedColorsAndType !== null && sameJson(next, savedColorsAndType);
  let wrote = null;
  if (!dryRun && report.changed) {
    if (backToSaved) {
      if (existsSync(workingPath)) rmSync(workingPath);
      wrote = 'cleared';
    } else {
      writeFileSync(workingPath, JSON.stringify(next, null, 2) + '\n');
      wrote = 'buffer';
    }
  }

  return {
    briefPath: briefFull,
    colorsAndTypeDir: colorsDir,
    workingPath,
    openTheme: active?.slug ?? null,
    source,
    verified: verify,
    dryRun,
    faces,
    changes: report.changes,
    dropped: report.dropped,
    coverage,
    changed: report.changed,
    wrote,
  };
}

export function formatSetFontsResult(result) {
  const root = process.cwd();
  const lines = [];

  if (!result.changed) {
    lines.push('Nothing to change: those faces are already bound to those stacks.');
    return lines.join('\n');
  }

  const from =
    result.source === 'theme' && result.openTheme
      ? `theme "${result.openTheme}"`
      : SOURCE_LABELS[result.source];
  const verb = result.dryRun ? 'Would set' : 'Set';
  lines.push(`${verb} ${result.changes.length} font stack(s), reading from ${from}.`);

  const width = Math.max(0, ...result.changes.map((c) => c.variable.length));
  for (const change of result.changes) {
    lines.push(`    ${change.variable.padEnd(width)}  ${change.from ?? '(none)'} → ${change.to}`);
  }

  for (const face of result.faces) {
    if (!face.verified) continue;
    const weights = face.weights.length > 0 ? `${face.weights.join(', ')}` : 'single weight';
    lines.push(`\n${face.name}  (${face.slot})`);
    lines.push(`    weights: ${weights}${face.italics ? ' + italics' : ', no italics'}`);
    lines.push(`    ${face.url}`);
  }

  if (result.dropped.length > 0) {
    lines.push(
      `\nDropped ${result.dropped.length} source(s) no stack references any more: ` +
        `${result.dropped.map((d) => d.names.join(', ')).join('; ')}.`,
    );
  }

  const gaps = result.coverage.filter((c) => c.missing.length > 0);
  if (gaps.length > 0) {
    lines.push('\nWeight coverage:');
    for (const gap of gaps) {
      lines.push(
        `    ${gap.family} (${gap.stack}) has no ${gap.missing.join(', ')}; ` +
          `tokens ask for ${gap.required.join(', ')}. The browser will synthesize the rest.`,
      );
    }
  }
  const body = result.coverage.find((c) => c.stack === '--font-sans');
  if (body && !body.italics) {
    lines.push(`\n${body.family} has no italics. Emphasis in body text will be synthesized.`);
  }

  if (result.wrote === 'buffer') {
    lines.push(
      `\nReload the app to see it. This is an unsaved edit: save the open theme in the ` +
        `editor's Theme panel to keep it, or load a theme to discard it.`,
    );
  } else if (result.wrote === 'cleared') {
    lines.push(
      `\nThat is what the open theme already holds, so the unsaved buffer was discarded. ` +
        `Reload the app to see it.`,
    );
  } else if (result.dryRun) {
    lines.push(`\nDry run: nothing written under ${relative(root, result.colorsAndTypeDir)}.`);
  }
  return lines.join('\n');
}
