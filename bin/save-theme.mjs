// `live-tokens save-theme` worker.
//
// Composes the live state into a theme document at `themes/<slug>.json` and
// opens it. Live state, and only live state: each layer resolves the way the
// dev server resolves it — the unsaved buffer, then the open theme's copy by
// value, then the shipped default — so the theme this writes is the look the
// page renders. Opening clears every `_working.json` and points
// `themes/_active.json` at the new document, exactly as the editor's apply door
// does; `--no-activate` writes the file and leaves the live state alone, which
// is how a set of themes comes off one starting look.
//
// This is the only verb that writes a theme. The three `set-*` verbs write
// buffers.

import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  componentNames,
  readActiveTheme,
  readLiveColorsAndType,
  readLiveComponentConfigs,
} from './lib/liveState.mjs';

const pkgRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
// The setColors bundle carries the slug helper, the component schema stamp and
// the dir resolution; composing a theme needs no color pipeline of its own.
const ENGINE = resolve(pkgRoot, 'dist-plugin/setColors/index.js');
// Source of truth: src/editor/core/themes/themeTypes.ts, which
// normalizeTheme.ts re-exports. This copy cannot import TS, so
// `bin/schemaVersionCopies.test.ts` is what catches a drift.
const THEME_SCHEMA_VERSION = 5;

async function loadEngine() {
  if (!existsSync(ENGINE)) {
    throw new Error(
      `setColors engine not found at ${relative(process.cwd(), ENGINE)}. ` +
        `Build the plugin first (npm run build:plugin).`,
    );
  }
  return import(ENGINE);
}

/** The destination file, read to keep its `createdAt`. Never the package copy:
 *  this is the file about to be overwritten, not a layer to fall through to. */
function readLocalJson(path) {
  return existsSync(path) ? JSON.parse(readFileSync(path, 'utf8')) : null;
}

/** `engine` is a test seam; the CLI always runs the compiled bundle. */
export async function runSaveTheme({
  name,
  activate = true,
  dryRun = false,
  colorsAndTypeDir,
  componentConfigsDir,
  themesDir,
  engine,
} = {}) {
  const { sanitizeFileName, resolveDataDirs, CURRENT_COMPONENT_SCHEMA_VERSION } =
    engine ?? (await loadEngine());

  const themeName = typeof name === 'string' ? name.trim() : '';
  if (!themeName) throw new Error('save-theme needs a theme name');
  const slug = sanitizeFileName(themeName);
  if (slug === 'default') {
    throw new Error('"default" is the protected package theme; pick another name');
  }

  const resolved = colorsAndTypeDir && componentConfigsDir && themesDir ? null : resolveDataDirs();
  const dirs = {
    colorsAndTypeDir: colorsAndTypeDir ?? resolved.colorsAndTypeDir,
    componentConfigsDir: componentConfigsDir ?? resolved.componentConfigsDir,
    themesDir: themesDir ?? resolved.themesDir,
  };

  const active = readActiveTheme(dirs.themesDir);
  const { colorsAndType, source } = readLiveColorsAndType(dirs.colorsAndTypeDir, active);
  const { configs, sources } = readLiveComponentConfigs(dirs.componentConfigsDir, active);

  const themePath = join(dirs.themesDir, `${slug}.json`);
  const existing = readLocalJson(themePath);
  const now = new Date().toISOString();
  const sketchSettings = active?.theme?.sketchSettings;

  const theme = {
    name: themeName,
    createdAt: existing?.createdAt ?? now,
    updatedAt: now,
    schemaVersion: THEME_SCHEMA_VERSION,
    colorsAndType: { ...colorsAndType, name: themeName },
    componentConfigs: configs,
    componentSchemaVersion: CURRENT_COMPONENT_SCHEMA_VERSION,
    ...(sketchSettings ? { sketchSettings } : {}),
  };

  if (!dryRun) {
    mkdirSync(dirs.themesDir, { recursive: true });
    writeFileSync(themePath, JSON.stringify(theme, null, 2) + '\n');
    if (activate) applyTheme(slug, dirs);
  }

  // `working` is the one source label that proves a buffer answered: a
  // component the open theme omits reports as `theme` after falling through to
  // its shipped default, so the report says what came from a buffer and names
  // the fall-through for the rest rather than claiming a layer per component.
  const bufferedComponents = componentNames(dirs.componentConfigsDir).filter(
    (comp) => sources[comp] === 'working',
  );

  return {
    name: themeName,
    slug,
    themePath,
    existed: existing !== null,
    dryRun,
    activated: activate && !dryRun,
    previousActive: active?.slug ?? 'default',
    openTheme: active?.slug ?? null,
    buffered: { colorsAndType: source === 'working', components: bufferedComponents },
    components: Object.keys(configs).length,
    sketchSettings: Boolean(sketchSettings),
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

export function formatSaveThemeResult(result) {
  const root = process.cwd();
  const lines = [];
  const wrote = result.dryRun ? 'Would write' : result.existed ? 'Updated' : 'Created';
  lines.push(`${wrote} theme "${result.name}" → ${relative(root, result.themePath)}`);
  lines.push(`It carries the colors and type and ${result.components} component config(s) by value.`);

  const edited = [
    ...(result.buffered.colorsAndType ? ['colors and type'] : []),
    ...result.buffered.components,
  ];
  const open = result.openTheme ? `the open theme "${result.openTheme}"` : 'the package defaults';
  const kept = result.dryRun ? 'Would save' : 'Saved';
  if (edited.length > 0) {
    lines.push(`${kept} your unsaved edits: ${edited.join(', ')}.`);
    lines.push(`Everything else came from ${open}, or the shipped defaults where it carries no entry.`);
  } else {
    lines.push(`No unsaved edits; ${kept.toLowerCase()} a copy of ${open}.`);
  }
  if (result.sketchSettings) lines.push(`Sketch settings rode through from the open theme.`);

  if (result.activated) {
    lines.push(
      `\nOpened "${result.slug}" (previously open: "${result.previousActive}"). ` +
        `Reload the app to see it; switch back any time from Load in the editor's Theme panel. ` +
        `Adopt it there to publish it to tokens.generated.css.`,
    );
  } else if (result.dryRun) {
    lines.push(`\nDry run: nothing written under ${relative(root, dirname(result.themePath))}.`);
  } else {
    lines.push(
      `\nNot opened (--no-activate). Your unsaved edits are still open, so the next ` +
        `save-theme starts from the same look. Load "${result.slug}" from the editor's Theme panel to see it.`,
    );
  }
  return lines.join('\n');
}
