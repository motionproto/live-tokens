// `live-tokens set-colors` worker.
//
// Reads a base color file (JSON), builds the theme's whole color state via the
// compiled engine (dist-plugin/setColors — the CLI never imports TS sources),
// enforces the AA contrast gate, and writes the result into
// `colors-and-type/_working.json`: the same buffer the editor's own palette
// edits land in, so a recolor is an unsaved edit the user keeps by saving the
// open theme or by running `save-theme`. Named colors-and-type files, themes,
// tokens.css and fonts.css are never touched, and nothing is activated.
//
// Non-color content carries forward from the live colors and type, so a recolor
// replaces the color identity and nothing else. Swatch gradients ride along
// when user-tuned; stock ones are rebuilt from the new families by the engine.

import { existsSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  readActiveTheme,
  readLiveColorsAndType,
  readSavedColorsAndType,
  sameContent,
  savedColorsAndTypeSource,
} from './lib/liveState.mjs';

const pkgRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const ENGINE = resolve(pkgRoot, 'dist-plugin/setColors/index.js');

const SOURCE_LABELS = {
  working: 'your unsaved edits',
  theme: 'the open theme',
  default: 'the package default',
};

async function loadEngine() {
  if (!existsSync(ENGINE)) {
    throw new Error(
      `setColors engine not found at ${relative(process.cwd(), ENGINE)}. ` +
        `Build the plugin first (npm run build:plugin).`,
    );
  }
  return import(ENGINE);
}

function readJson(path) {
  return JSON.parse(readFileSync(path, 'utf8'));
}

/** `engine` is a test seam; the CLI always runs the compiled bundle. */
export async function runSetColors({
  baseColorsPath,
  dryRun = false,
  root = process.cwd(),
  colorsAndTypeDir,
  themesDir,
  engine,
} = {}) {
  const { buildColors, resolveDataDirs } = engine ?? (await loadEngine());

  const fullPath = resolve(root, baseColorsPath);
  if (!existsSync(fullPath)) {
    throw new Error(`base color file not found at ${relative(root, fullPath)}`);
  }
  let input;
  try {
    input = readJson(fullPath);
  } catch (err) {
    throw new Error(`base color file is not valid JSON: ${err instanceof Error ? err.message : String(err)}`);
  }

  const resolved = colorsAndTypeDir && themesDir ? null : resolveDataDirs();
  const colorsDir = colorsAndTypeDir ?? resolved.colorsAndTypeDir;
  const themes = themesDir ?? resolved.themesDir;
  if (!existsSync(colorsDir)) {
    throw new Error(`no colors and type at ${relative(root, colorsDir)}. Run the dev server once to create it.`);
  }

  const active = readActiveTheme(themes);
  const { colorsAndType: live, source } = readLiveColorsAndType(colorsDir, active);

  const { colors, report } = buildColors(input, {
    cssVariables: live.cssVariables,
    gradients: live.gradients,
  });

  const next = {
    ...live,
    ...colors,
    updatedAt: new Date().toISOString(),
    schemaVersion: live.schemaVersion,
  };

  const workingPath = join(colorsDir, '_working.json');
  const saved = readSavedColorsAndType(colorsDir, active);

  // Returning the buffer to what the layer under it already holds is a discard,
  // not an edit — the same call the dev server's own PUT makes.
  const backToSaved = saved !== null && sameContent(next, saved);
  let wrote = null;
  if (!dryRun) {
    if (backToSaved) {
      if (existsSync(workingPath)) rmSync(workingPath);
      wrote = 'cleared';
    } else {
      writeFileSync(workingPath, JSON.stringify(next, null, 2) + '\n');
      wrote = 'buffer';
    }
  }

  return {
    baseColorsPath: fullPath,
    colorsAndTypeDir: colorsDir,
    workingPath,
    openTheme: active?.slug ?? null,
    source,
    // Which layer the discard compared against, so the report can name it. It
    // is the open theme only when one is open; with none, it is the default the
    // package ships, and calling that "the open theme" named a file nobody had
    // opened.
    savedSource: savedColorsAndTypeSource(active),
    // The base color file's `name` used to pick a theme file name. This verb
    // writes no file of its own now, so it names nothing; say so rather than
    // drop it in silence.
    ignoredName: input.name === undefined ? null : String(input.name),
    dryRun,
    wrote,
    report,
  };
}

export function formatSetColorsResult(result) {
  const root = process.cwd();
  const lines = [];

  const from =
    result.source === 'theme' && result.openTheme
      ? `theme "${result.openTheme}"`
      : SOURCE_LABELS[result.source];
  const verb = result.dryRun ? 'Would replace' : 'Replaced';
  lines.push(`${verb} the color identity, carrying everything else forward from ${from}.`);
  if (result.ignoredName !== null) {
    lines.push(
      `Ignored "name": "${result.ignoredName}". The base color file no longer names a theme; ` +
        `name it when you run save-theme.`,
    );
  }

  lines.push(`\nContrast report (${result.report.scheme} scheme):`);
  const width = Math.max(...result.report.checks.map((c) => c.textVar.length));
  for (const c of result.report.checks) {
    const mark = c.pass ? '✓' : '✗';
    const fixed = c.corrected ? '  (auto-corrected)' : '';
    lines.push(
      `  ${mark} ${c.textVar.padEnd(width)}  ${c.ratio.toFixed(2).padStart(6)}:1  vs ${c.against}  floor ${c.floor}:1${fixed}`,
    );
  }
  if (result.report.failures.length > 0) {
    lines.push(`\nUnmet floors — adjust the base colors and re-run:`);
    for (const f of result.report.failures) lines.push(`  ! ${f}`);
  }

  lines.push(
    result.report.gradients === 'carried'
      ? '\nGradients: kept your tuned swatch gradients.'
      : '\nGradients: swatch tokens rebuilt from the theme families.',
  );
  lines.push(`Shadows: ${result.report.shadows}; carried geometry kept.`);
  if (result.report.canvasGradient) {
    lines.push(`Canvas sky: ${result.report.canvasGradient}.`);
  }

  if (result.wrote === 'buffer') {
    lines.push(
      `\nReload the app to see it. This is an unsaved edit: save the open theme in the ` +
        `editor's Theme panel to keep it, or run save-theme to write a new one.`,
    );
  } else if (result.wrote === 'cleared') {
    const held =
      result.savedSource === 'theme' ? `theme "${result.openTheme}"` : 'the package default';
    lines.push(
      result.source === 'working'
        ? `\nThat is what ${held} already holds, so the unsaved buffer was discarded. ` +
            `Reload the app to see it.`
        : `\nThat is what ${held} already holds, and there was no unsaved buffer, so nothing was written.`,
    );
  } else if (result.dryRun) {
    lines.push(`\nDry run: nothing written under ${relative(root, result.colorsAndTypeDir)}.`);
  }
  return lines.join('\n');
}
