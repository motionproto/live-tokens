// `live-tokens generate-theme` worker.
//
// Reads a seed brief (JSON), builds a full validated colors-and-type layer via
// the compiled engine (dist-plugin/generateColorsAndType — the CLI never imports
// TS sources), enforces the AA contrast gate, and saves the result as a theme:
// <themesDir>/<slug>.json, the document that carries the whole theme by value.
// Unless --no-activate it then opens that theme the way the dev server's apply
// door does — existing `_working` buffers are cleared and
// `themes/_active.json` names it. Nothing else moves, so generating a theme
// cannot change what the site ships.
//
// Non-color content (shadows, component aliases, fonts) carries forward from
// the live state so generation only replaces the color identity. Swatch
// gradients ride along too when user-tuned; stock ones are rebuilt from the new
// theme's families by the engine.

import { existsSync, mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const pkgRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const ENGINE = resolve(pkgRoot, 'dist-plugin/generateColorsAndType/index.js');
const packageDataDir = join(pkgRoot, 'src/live-tokens/data');
// Source of truth: src/editor/core/themes/themeTypes.ts, which
// normalizeTheme.ts re-exports. This copy cannot import TS, so
// `check:preset-themes` and generate-theme.test.ts are what catch a drift.
const THEME_SCHEMA_VERSION = 5;

async function loadEngine() {
  if (!existsSync(ENGINE)) {
    throw new Error(
      `theme engine not found at ${relative(process.cwd(), ENGINE)}. ` +
        `Build the plugin first (npm run build:plugin).`,
    );
  }
  return import(ENGINE);
}

function readJson(path) {
  return JSON.parse(readFileSync(path, 'utf8'));
}

function readJsonIfExists(path) {
  try {
    return existsSync(path) ? readJson(path) : null;
  } catch {
    return null;
  }
}

/** Local dir first, then the installed package's shipped copy — the same
 *  fallback order the dev server's reads use. */
function readData(localDir, packageSubdir, fileName) {
  return (
    readJsonIfExists(join(localDir, `${fileName}.json`)) ??
    readJsonIfExists(join(packageDataDir, packageSubdir, `${fileName}.json`))
  );
}

function componentNames(componentConfigsDir) {
  if (!existsSync(componentConfigsDir)) return [];
  return readdirSync(componentConfigsDir, { withFileTypes: true })
    .filter((e) => e.isDirectory())
    .map((e) => e.name)
    .sort();
}

/** `_fileName` and `_source` are read-door markers, never part of a document. */
function stripMarkers(value) {
  if (!value || typeof value !== 'object') return value;
  const { _fileName, _source, ...rest } = value;
  return rest;
}

/** A component's derived default, local tree first, then the installed
 *  package's shipped copy — same fallback order every other read here uses. */
function defaultComponentConfig(componentConfigsDir, comp) {
  return readData(join(componentConfigsDir, comp), `component-configs/${comp}`, 'default');
}

/**
 * The look the new theme carries forward. Without --carry-from that is the LIVE
 * state — buffer first, then the open theme, then the shipped default — because
 * what the user sees is what they expect to keep. With it, the named theme,
 * then the shipped default for anything that theme omits, so an incomplete
 * source never produces an incomplete result.
 */
function resolveCarrySource({ carryFrom, colorsAndTypeDir, componentConfigsDir, themesDir }) {
  const comps = componentNames(componentConfigsDir);

  if (carryFrom) {
    const theme = readData(themesDir, 'themes', carryFrom);
    if (!theme) throw new Error(`--carry-from theme "${carryFrom}" not found`);
    const componentConfigs = {};
    for (const comp of comps) {
      const cfg = theme.componentConfigs?.[comp] ?? defaultComponentConfig(componentConfigsDir, comp);
      if (cfg) componentConfigs[comp] = stripMarkers(cfg);
    }
    return { colorsAndType: stripMarkers(theme.colorsAndType), componentConfigs };
  }

  const activeSlug = readJsonIfExists(join(themesDir, '_active.json'))?.activeFile ?? 'default';
  const activeTheme = readData(themesDir, 'themes', activeSlug);
  const colorsAndType = stripMarkers(
    readJsonIfExists(join(colorsAndTypeDir, '_working.json')) ??
      activeTheme?.colorsAndType ??
      readData(colorsAndTypeDir, 'colors-and-type', 'default'),
  );

  // A working buffer is an unsaved delta from the active theme; absent theme
  // component entries fall through to the component defaults. Mirrors
  // `bin/adjust.mjs`'s `readLiveConfigs` and the dev server's
  // `resolveLiveComponentConfig` — all three layers, in the same order.
  const componentConfigs = {};
  for (const comp of comps) {
    const live =
      readJsonIfExists(join(componentConfigsDir, comp, '_working.json')) ??
      activeTheme?.componentConfigs?.[comp] ??
      defaultComponentConfig(componentConfigsDir, comp);
    if (live) componentConfigs[comp] = stripMarkers(live);
  }
  return { colorsAndType, componentConfigs };
}

/** `engine` is a test seam; the CLI always runs the compiled bundle. */
export async function runGenerateTheme({
  briefPath,
  activate = true,
  dryRun = false,
  carryFrom,
  root = process.cwd(),
  colorsAndTypeDir,
  componentConfigsDir,
  themesDir,
  engine,
} = {}) {
  const { buildColorsAndTypeFromSeeds, resolveDataDirs, CURRENT_COMPONENT_SCHEMA_VERSION } =
    engine ?? (await loadEngine());

  const briefFull = resolve(root, briefPath);
  if (!existsSync(briefFull)) {
    throw new Error(`brief not found at ${relative(root, briefFull)}`);
  }
  let brief;
  try {
    brief = readJson(briefFull);
  } catch (err) {
    throw new Error(`brief is not valid JSON: ${err instanceof Error ? err.message : String(err)}`);
  }

  const dirs =
    colorsAndTypeDir && componentConfigsDir && themesDir
      ? { colorsAndTypeDir, componentConfigsDir, themesDir }
      : resolveDataDirs();

  const previousActive = readJsonIfExists(join(dirs.themesDir, '_active.json'))?.activeFile ?? 'default';
  const carry = resolveCarrySource({ carryFrom, ...dirs });

  const { colorsAndType, slug, report } = buildColorsAndTypeFromSeeds(
    brief,
    {
      cssVariables: carry.colorsAndType?.cssVariables,
      fontSources: carry.colorsAndType?.fontSources,
      fontStacks: carry.colorsAndType?.fontStacks,
      gradients: carry.colorsAndType?.gradients,
    },
    new Date().toISOString(),
  );

  const themePath = join(dirs.themesDir, `${slug}.json`);
  const existing = readJsonIfExists(themePath);
  const theme = {
    name: colorsAndType.name,
    createdAt: existing?.createdAt ?? colorsAndType.createdAt,
    updatedAt: colorsAndType.updatedAt,
    schemaVersion: THEME_SCHEMA_VERSION,
    colorsAndType,
    componentConfigs: carry.componentConfigs,
    componentSchemaVersion: CURRENT_COMPONENT_SCHEMA_VERSION,
  };

  if (!dryRun) {
    mkdirSync(dirs.themesDir, { recursive: true });
    writeFileSync(themePath, JSON.stringify(theme, null, 2) + '\n');
    if (activate) applyTheme(slug, dirs);
  }

  return {
    name: theme.name,
    slug,
    themePath,
    existed: existing !== null,
    activated: activate && !dryRun,
    previousActive,
    carriedFrom: carryFrom ?? null,
    componentsCarried: Object.keys(carry.componentConfigs).length,
    dryRun,
    report,
  };
}

/** The apply door's write set, reproduced: clear every working delta and point
 *  `themes/_active.json` at the open document. Production is untouched. */
function applyTheme(slug, dirs) {
  const colorsWorking = join(dirs.colorsAndTypeDir, '_working.json');
  if (existsSync(colorsWorking)) rmSync(colorsWorking);

  for (const comp of componentNames(dirs.componentConfigsDir)) {
    const workingPath = join(dirs.componentConfigsDir, comp, '_working.json');
    if (existsSync(workingPath)) rmSync(workingPath);
  }

  writeFileSync(join(dirs.themesDir, '_active.json'), JSON.stringify({ activeFile: slug }));
}

export function formatGenerateThemeResult(result) {
  const root = process.cwd();
  const lines = [];
  const wrote = result.dryRun ? 'Would write' : result.existed ? 'Updated' : 'Created';
  lines.push(`${wrote} theme "${result.name}" → ${relative(root, result.themePath)}`);
  lines.push(
    `Carried forward from ${result.carriedFrom ? `theme "${result.carriedFrom}"` : 'the live state'}: ` +
      `fonts, gradients and ${result.componentsCarried} component config(s).`,
  );

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
    lines.push(`\nUnmet floors — adjust the brief's seeds and re-run:`);
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

  if (result.activated) {
    lines.push(
      `\nOpened "${result.slug}" (previously open: "${result.previousActive}"). ` +
        `Reload the app to see it; switch back any time from Load in the editor's Theme panel. ` +
        `Adopt it there to publish it to tokens.generated.css.`,
    );
  } else if (!result.dryRun) {
    lines.push(`\nNot opened (--no-activate). Load "${result.slug}" from the editor's Theme panel to see it.`);
  }
  return lines.join('\n');
}
