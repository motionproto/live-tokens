// `live-tokens generate-theme` worker.
//
// Reads a seed brief (JSON), builds a full validated colors-and-type file via
// the compiled engine (dist-plugin/generateColorsAndType — the CLI never imports
// TS sources), enforces the AA contrast gate, writes <themesDir>/<slug>.json,
// and activates it. Non-color content (gradients, shadows, component aliases,
// fonts) is carried forward from the currently active file so generation only
// replaces the color identity.

import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const pkgRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const ENGINE = resolve(pkgRoot, 'dist-plugin/generateColorsAndType/index.js');

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

/** Local colors-and-type dir first, then the installed package's shipped copy
 *  — the same fallback order the dev server uses for reads. */
function loadColorsAndTypeFile(themesDir, fileName) {
  return (
    readJsonIfExists(join(themesDir, `${fileName}.json`)) ??
    readJsonIfExists(join(pkgRoot, 'src/live-tokens/data/themes', `${fileName}.json`))
  );
}

export async function runGenerateTheme({ briefPath, activate = true, dryRun = false, carryFrom, root = process.cwd() } = {}) {
  const { buildColorsAndTypeFromSeeds, resolveDataDirs } = await loadEngine();

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

  const { themesDir } = resolveDataDirs();

  const activePointer = readJsonIfExists(join(themesDir, '_active.json'));
  const previousActive = activePointer?.activeFile ?? 'default';
  if (carryFrom && !loadColorsAndTypeFile(themesDir, carryFrom)) {
    throw new Error(`--carry-from theme "${carryFrom}" not found`);
  }
  const carrySource =
    loadColorsAndTypeFile(themesDir, carryFrom ?? previousActive) ?? loadColorsAndTypeFile(themesDir, 'default') ?? {};
  const carry = {
    cssVariables: carrySource.cssVariables,
    fontSources: carrySource.fontSources,
    fontStacks: carrySource.fontStacks,
  };

  const { colorsAndType, slug, report } = buildColorsAndTypeFromSeeds(brief, carry, new Date().toISOString());

  const colorsAndTypePath = join(themesDir, `${slug}.json`);
  const existing = readJsonIfExists(colorsAndTypePath);
  if (existing?.createdAt) colorsAndType.createdAt = existing.createdAt;

  if (!dryRun) {
    mkdirSync(themesDir, { recursive: true });
    writeFileSync(colorsAndTypePath, JSON.stringify(colorsAndType, null, 2) + '\n');
    if (activate) {
      writeFileSync(join(themesDir, '_active.json'), JSON.stringify({ activeFile: slug }, null, 2) + '\n');
    }
  }

  return {
    name: colorsAndType.name,
    slug,
    colorsAndTypePath,
    existed: existing !== null,
    activated: activate && !dryRun,
    previousActive,
    dryRun,
    report,
  };
}

export function formatGenerateThemeResult(result) {
  const root = process.cwd();
  const lines = [];
  const wrote = result.dryRun ? 'Would write' : result.existed ? 'Updated' : 'Created';
  lines.push(`${wrote} theme "${result.name}" → ${relative(root, result.colorsAndTypePath)}`);

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

  if (result.activated) {
    lines.push(
      `\nActivated "${result.slug}" (previous active: "${result.previousActive}"). ` +
        `Reload the app to see it; revert any time in the editor's Theme file manager.`,
    );
  } else if (!result.dryRun) {
    lines.push(`\nNot activated (--no-activate). Select "${result.slug}" in the editor's Theme file manager.`);
  }
  return lines.join('\n');
}
