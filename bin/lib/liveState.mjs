// The live state the three `set-*` workers read, in one place.
//
// Every resolver mirrors the dev server's own resolution order — the unsaved
// buffer, then the open theme's copy by value, then the shipped default — so a
// CLI edits what the page runs. Pure file reads: the caller passes the resolved
// dirs, so nothing here loads `dist-plugin` and `bin/engineLoadsLazily.test.ts`
// holds by construction.

import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const packageDataDir = resolve(dirname(fileURLToPath(import.meta.url)), '../..', 'src/live-tokens/data');

function readJsonIfExists(path) {
  if (!existsSync(path)) return null;
  try {
    return JSON.parse(readFileSync(path, 'utf8'));
  } catch (err) {
    throw new Error(`${path} is not valid JSON: ${err instanceof Error ? err.message : String(err)}`);
  }
}

/** Local tree first, then the copy the installed package ships. */
function readData(localDir, packageSubdir, fileName) {
  return (
    readJsonIfExists(join(localDir, `${fileName}.json`)) ??
    readJsonIfExists(join(packageDataDir, packageSubdir, `${fileName}.json`))
  );
}

/** `_fileName` and `_source` are read-door markers, never part of a document. */
export function stripMarkers(value) {
  if (!value || typeof value !== 'object') return value;
  const { _fileName, _source, ...rest } = value;
  return rest;
}

export function componentNames(componentConfigsDir) {
  if (!existsSync(componentConfigsDir)) return [];
  return readdirSync(componentConfigsDir, { withFileTypes: true })
    .filter((e) => e.isDirectory())
    .map((e) => e.name)
    .sort();
}

export function readActiveTheme(themesDir) {
  if (!themesDir) return null;
  const slug = readJsonIfExists(join(themesDir, '_active.json'))?.activeFile ?? 'default';
  const theme = readData(themesDir, 'themes', slug);
  return theme ? { slug, theme } : null;
}

export function readLiveColorsAndType(colorsAndTypeDir, active) {
  const working = readJsonIfExists(join(colorsAndTypeDir, '_working.json'));
  if (working) return { colorsAndType: stripMarkers(working), source: 'working' };
  if (active?.theme?.colorsAndType) {
    return { colorsAndType: stripMarkers(active.theme.colorsAndType), source: 'theme' };
  }
  const shipped = readData(colorsAndTypeDir, 'colors-and-type', 'default');
  if (!shipped) throw new Error(`no colors and type to read at ${colorsAndTypeDir}`);
  return { colorsAndType: stripMarkers(shipped), source: 'default' };
}

/** `updatedAt` records when a buffer was written, not what it holds, so the
 *  comparison that tells a discard from an edit ignores it. Both writers of
 *  `colors-and-type/_working.json` ask this one question, and a rule that kept
 *  `updatedAt` missed every buffer the other verb had stamped. */
export function sameContent(a, b) {
  const strip = ({ updatedAt: _updatedAt, ...rest }) => rest;
  return JSON.stringify(strip(a)) === JSON.stringify(strip(b));
}

/** The layer under the buffer. Returning the buffer to exactly this is a
 *  discard, not an edit, so a caller compares against it before writing. */
export function readSavedColorsAndType(colorsAndTypeDir, active) {
  const saved = active?.theme?.colorsAndType ?? readData(colorsAndTypeDir, 'colors-and-type', 'default');
  return saved ? stripMarkers(saved) : null;
}

/** Each component's live config, and whether a buffer or the open document
 *  answered. Every theme carries every component by value, but this is a raw
 *  file read, ahead of any server-side fill — a theme written before a
 *  component existed can still omit it, so a missing entry falls back to the
 *  shipped default the same way the theme's own fill would, and still reports
 *  as the document. */
export function readLiveComponentConfigs(componentConfigsDir, active) {
  const configs = {};
  const sources = {};
  for (const comp of componentNames(componentConfigsDir)) {
    const working = readJsonIfExists(join(componentConfigsDir, comp, '_working.json'));
    const config =
      working ??
      active?.theme?.componentConfigs?.[comp] ??
      readData(join(componentConfigsDir, comp), `component-configs/${comp}`, 'default');
    if (!config) continue;
    configs[comp] = stripMarkers(config);
    sources[comp] = working ? 'working' : 'theme';
  }
  return { configs, sources };
}
