/**
 * The data-tree heal behind `live-tokens migrate`.
 *
 * Before the working-set model a theme was applied by materialising it: its
 * colors and type and every component config it carried were written out under
 * the theme's slug, and an `_active.json` / `_production.json` pair per layer
 * was flipped at them. Nothing ever removed those copies. This pass reads what
 * the pointers resolved to, records it as the two things the model keeps — one
 * production theme and one `_working` buffer per layer — and deletes the rest.
 *
 * Two rules bound every deletion: a file whose content matches no theme is the
 * user's and survives, and the effective production output never changes
 * without being written down as a theme of its own.
 */
import fs from 'fs';
import path from 'path';
import {
  versionedFileResourceServer,
  type VersionedFileResourceServer,
} from '../files/versionedFileResourceServer';
import {
  isColorsAndTypeShaped,
  normalizeTheme,
  THEME_SCHEMA_VERSION,
  type EncapsulatedTheme,
  type ThemeResolvers,
} from '../themes/normalizeTheme';
import { nextAvailableName } from '../files/nameAllocator';
import {
  applyLegacyRenames,
  detectLegacyLayout,
  planLegacyRenames,
  type LegacyRename,
} from '../files/legacyLayout';
import { CURRENT_COMPONENT_SCHEMA_VERSION } from '../../src/editor/core/themes/migrations';

/** Slug for the theme that records a production state no saved theme matches.
 *  Fixed rather than derived: release notes, the boot warning and support
 *  answers all name one file. */
const RECOVERED_SLUG = 'recovered-production';
const RECOVERED_NAME = 'Recovered production';

/** Attached by read doors and by the pre-fix buffer writers, never part of a
 *  document. Stripped before content is compared or written back. */
const MARKER_KEYS = ['_fileName', '_source'];

/** Ignored when comparing two copies of the same content: a save door stamps
 *  `updatedAt` without changing the look. */
const VOLATILE_KEYS = [...MARKER_KEYS, 'updatedAt'];

type Json = Record<string, unknown>;

export interface MigrateDataOptions {
  /** The directory the three below sit under. Locates the pre-0.48
   *  `manifests/` directory, which no config key names any more. */
  dataDir: string;
  colorsAndTypeDir: string;
  componentConfigsDir: string;
  themesDir: string;
  /** The retired `manifestsDir` config key, when the consumer set it. */
  legacyManifestsDir?: string;
  /** The installed package's `src/live-tokens/data`. Its files are read-only:
   *  they resolve names the consumer has no local copy of, and are never
   *  deleted even when their content matches a theme. */
  packageDataDir?: string;
  /** Plan only, write nothing. */
  check?: boolean;
}

export interface MigrateDataResult {
  status: 'clean' | 'planned' | 'healed';
  /** Directories moved to the 0.48 layout, old → new, in the order they ran. */
  renames: LegacyRename[];
  /** The theme production resolves to after the heal, and how it was decided. */
  production: { slug: string; how: 'all-default' | 'matched' | 'recovered' } | null;
  /** Path of the theme written to record an unmatched production state. */
  recoveredThemePath: string | null;
  /** Buffers filled because the live state differed from the open theme. */
  workingWritten: string[];
  /** Buffers left as they were: the new server already owns them. */
  workingKept: string[];
  /** Materialised copies removed. */
  deletedFiles: string[];
  /** Retired per-layer pointer files removed. */
  deletedPointers: string[];
  /** Named files matching no theme. Yours, so they stay. */
  keptUserFiles: string[];
  /** Files in the themes directory that are not themes. Read past, never
   *  rewritten. */
  notThemes: string[];
  /** One sentence per reference a theme named that resolved to nothing. The
   *  theme carries the shipped default there now. */
  droppedRefs: string[];
  /** A local `colors-and-type/default.json` whose content differs from the copy
   *  the package ships. It shadows the shipped default. Reported only. */
  shadowedDefaults: string[];
  /** Themes rewritten from the pre-v3 by-reference form, so step 3 cannot
   *  delete a file they still name. */
  upgradedThemes: string[];
}

function isObject(value: unknown): value is Json {
  return !!value && typeof value === 'object' && !Array.isArray(value);
}

function sortDeep(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(sortDeep);
  if (!isObject(value)) return value;
  const out: Json = {};
  for (const key of Object.keys(value).sort()) out[key] = sortDeep(value[key]);
  return out;
}

/** Key order and the volatile fields say nothing about the look. */
function comparable(value: unknown): string {
  if (!isObject(value)) return JSON.stringify(sortDeep(value));
  const stable: Json = {};
  for (const key of Object.keys(value).sort()) {
    if (VOLATILE_KEYS.includes(key)) continue;
    stable[key] = sortDeep(value[key]);
  }
  return JSON.stringify(stable);
}

function sameContent(a: unknown, b: unknown): boolean {
  return comparable(a) === comparable(b);
}

function stripMarkers(value: Json): Json {
  const out: Json = {};
  for (const [key, v] of Object.entries(value)) {
    if (!MARKER_KEYS.includes(key)) out[key] = v;
  }
  return out;
}

function readPointerName(file: string, key: string): string | null {
  if (!fs.existsSync(file)) return null;
  try {
    const name = JSON.parse(fs.readFileSync(file, 'utf-8'))[key];
    return typeof name === 'string' && name ? name : null;
  } catch {
    return null;
  }
}

function localNamedFiles(dir: string): string[] {
  if (!fs.existsSync(dir)) return [];
  return fs
    .readdirSync(dir)
    .filter((f) => f.endsWith('.json') && !f.startsWith('_'))
    .map((f) => f.slice(0, -'.json'.length))
    .filter((name) => name !== 'default');
}

function componentNames(componentConfigsDir: string): string[] {
  if (!fs.existsSync(componentConfigsDir)) return [];
  return fs
    .readdirSync(componentConfigsDir, { withFileTypes: true })
    .filter((e) => e.isDirectory())
    .map((e) => e.name)
    .sort();
}

/** Basenames the installed package ships under `<packageDataDir>/<subdir>`, read
 *  from its own `files` listing — the only way to tell a shipped file from a
 *  user file in the library repo, where the local dir IS the package dir. The
 *  package ships no component configs, so there the answer is none, which is
 *  what lets the sweep reach them at all. */
function shippedNames(packageDataDir: string, subdir: string): string[] {
  try {
    const pkgRoot = path.resolve(packageDataDir, '..', '..', '..');
    const pkg = JSON.parse(fs.readFileSync(path.join(pkgRoot, 'package.json'), 'utf-8'));
    const files: string[] = Array.isArray(pkg.files) ? pkg.files : [];
    const prefix = `src/live-tokens/data/${subdir}/`;
    return files
      .filter((f) => f.startsWith(prefix) && /^[^/]+\.json$/.test(f.slice(prefix.length)))
      .map((f) => path.basename(f, '.json'));
  } catch {
    return [];
  }
}

export function migrateData(opts: MigrateDataOptions): MigrateDataResult {
  const { componentConfigsDir, check = false } = opts;
  const packageDataDir = opts.packageDataDir;

  // Step zero, before anything reads a theme: a tree on the pre-0.48 layout
  // keeps its colors and type in `themes/` and its looks in `manifests/`, so
  // the heal below would read every palette as a corrupt theme. Move the
  // directories first and the rest of the pass runs on the layout it expects.
  const layoutInput = {
    dataDir: opts.dataDir,
    colorsAndTypeDir: opts.colorsAndTypeDir,
    themesDir: opts.themesDir,
    configuredManifestsDir: opts.legacyManifestsDir,
  };
  const legacyLayout = detectLegacyLayout(layoutInput);
  const renames = legacyLayout ? planLegacyRenames(legacyLayout, layoutInput) : [];
  if (legacyLayout && !check) applyLegacyRenames(renames);

  // `--check` moves nothing, so it plans against the directories where the
  // content still sits: the old themes directory holds the colors and type, the
  // manifests directory holds the themes.
  const planningLegacy = legacyLayout !== null && check;
  const colorsAndTypeDir = planningLegacy ? opts.themesDir : opts.colorsAndTypeDir;
  const themesDir = planningLegacy ? legacyLayout!.manifestsDir : opts.themesDir;

  /** A planned path names where the file will be once the renames run, not the
   *  directory the plan had to read it from. */
  const reported = (p: string): string => {
    if (!planningLegacy) return p;
    for (const { from, to } of renames) {
      if (p.startsWith(from + path.sep)) return path.join(to, p.slice(from.length + 1));
    }
    return p;
  };

  const colorsRes = versionedFileResourceServer({
    dir: colorsAndTypeDir,
    packageDir: packageDataDir ? path.join(packageDataDir, 'colors-and-type') : undefined,
    packageOwnedNames: packageDataDir ? shippedNames(packageDataDir, 'colors-and-type') : undefined,
  });
  const themesRes = versionedFileResourceServer({
    dir: themesDir,
    packageDir: packageDataDir ? path.join(packageDataDir, 'themes') : undefined,
  });
  const componentResources = new Map<string, VersionedFileResourceServer>();
  const compRes = (comp: string): VersionedFileResourceServer => {
    let r = componentResources.get(comp);
    if (!r) {
      r = versionedFileResourceServer({
        dir: path.join(componentConfigsDir, comp),
        packageDir: packageDataDir
          ? path.join(packageDataDir, 'component-configs', comp)
          : undefined,
        packageOwnedNames: packageDataDir
          ? shippedNames(packageDataDir, `component-configs/${comp}`)
          : undefined,
      });
      componentResources.set(comp, r);
    }
    return r;
  };

  const comps = componentNames(componentConfigsDir);

  const legacyPointers: string[] = [];
  for (const dir of [colorsAndTypeDir, ...comps.map((c) => path.join(componentConfigsDir, c))]) {
    for (const name of ['_active.json', '_production.json']) {
      const p = path.join(dir, name);
      if (fs.existsSync(p)) legacyPointers.push(p);
    }
  }

  const empty: MigrateDataResult = {
    status: 'clean',
    renames,
    production: null,
    recoveredThemePath: null,
    workingWritten: [],
    workingKept: [],
    deletedFiles: [],
    deletedPointers: [],
    keptUserFiles: [],
    notThemes: [],
    droppedRefs: [],
    shadowedDefaults: [],
    upgradedThemes: [],
  };
  // The pointers are what says a tree still runs the old model. Without them
  // every named file is a preset the user saved, and there is nothing left to
  // heal once the directories carry their 0.48 names.
  if (legacyPointers.length === 0) {
    if (!legacyLayout) return empty;
    return { ...empty, status: check ? 'planned' : 'healed' };
  }

  // Identity normalisation: the heal compares what is on disk against what a
  // theme embedded, so reconciling either side would invent a difference.
  const resolvers: ThemeResolvers = {
    readColorsAndType: (name) => colorsRes.readJson(name),
    readComponentConfig: (comp, name) => compRes(comp).readJson(name),
    listComponentNames: () => comps,
    normalizeColorsAndType: (colorsAndType) => colorsAndType,
  };

  const upgradedThemes: string[] = [];
  const notThemes: string[] = [];
  const droppedRefs: string[] = [];
  const themes: Array<{ slug: string; theme: EncapsulatedTheme }> = [];
  for (const slug of themesRes.listNames()) {
    let raw: unknown;
    try {
      raw = themesRes.readJson(slug);
    } catch {
      continue;
    }
    if (!raw) continue;
    // A colors-and-type file someone left among the themes is not one, and
    // reading it as one would derive a production that paints the default.
    if (isColorsAndTypeShaped(raw)) {
      notThemes.push(themesRes.filePath(slug));
      continue;
    }
    const { theme, migrated, dropped } = normalizeTheme(raw, resolvers);
    themes.push({ slug, theme });
    // A pre-v3 theme names its slices by file. One naming a file that no longer
    // resolves takes the shipped default in its place, which is a different
    // look than the one saved. Silent is what makes that bad, so say it.
    for (const ref of dropped) {
      droppedRefs.push(
        `theme "${slug}": the reference ${ref} resolved to nothing, so it carries the shipped default instead`,
      );
    }
    // Step 3 deletes the files a pre-v3 theme names, so it has to carry them by
    // value before it can run.
    if (migrated && fs.existsSync(themesRes.filePath(slug))) {
      upgradedThemes.push(themesRes.filePath(slug));
      if (!check) fs.writeFileSync(themesRes.filePath(slug), JSON.stringify(theme, null, 2));
    }
  }
  const themeBySlug = new Map(themes.map((t) => [t.slug, t.theme]));

  /** A pointer that names a file nothing resolves runs on the default, the same
   *  reading every boot gives it. */
  const resolveName = (res: VersionedFileResourceServer, dir: string, file: string, key: string): string => {
    const name = readPointerName(path.join(dir, file), key);
    if (!name || res.existingPath(name) === null) return 'default';
    return name;
  };

  /** The heal's whole plan is built from what the retired pointers named, so a
   *  file that will not parse has to stop it by name. A raw SyntaxError says
   *  nothing about which file to fix. */
  const readPointed = (res: VersionedFileResourceServer, name: string): unknown => {
    try {
      return res.readJson(name);
    } catch (err) {
      const file = res.existingPath(name) ?? res.filePath(name);
      throw new Error(
        `${file} will not parse (${err instanceof Error ? err.message : String(err)}), and a retired ` +
          `pointer names it. Fix or delete the file, then run the migration again.`,
      );
    }
  };

  const defaultConfig = (comp: string): unknown => compRes(comp).readJson('default');

  /** What a theme says a component runs. The theme arrives from
   *  `normalizeTheme`, which fills every component this install has, so the
   *  fallback covers only a component the fill found no derived default for.
   *  An embedded copy carries its component id the way the file on disk does. */
  const themeConfigFor = (theme: EncapsulatedTheme, comp: string): unknown => {
    const embedded = theme.componentConfigs[comp];
    return embedded ? { ...embedded, component: comp } : defaultConfig(comp);
  };

  // ── 1. Derive the production theme ──────────────────────────────────────
  const prodColorsName = resolveName(colorsRes, colorsAndTypeDir, '_production.json', 'productionFile');
  const prodConfigNames = new Map(
    comps.map((comp) => [
      comp,
      resolveName(compRes(comp), path.join(componentConfigsDir, comp), '_production.json', 'productionFile'),
    ]),
  );
  const prodColors = readPointed(colorsRes, prodColorsName);
  const prodConfigs = new Map(
    comps.map((comp) => [comp, readPointed(compRes(comp), prodConfigNames.get(comp)!)]),
  );

  const allDefault =
    prodColorsName === 'default' && [...prodConfigNames.values()].every((n) => n === 'default');

  const matchesPointedProduction = (theme: EncapsulatedTheme): boolean =>
    sameContent(theme.colorsAndType, prodColors) &&
    comps.every((comp) => sameContent(themeConfigFor(theme, comp), prodConfigs.get(comp)));

  let production: MigrateDataResult['production'];
  let recoveredTheme: EncapsulatedTheme | null = null;
  let recoveredThemePath: string | null = null;

  if (allDefault) {
    production = { slug: 'default', how: 'all-default' };
  } else {
    const match = themes.find((t) => matchesPointedProduction(t.theme));
    if (match) {
      production = { slug: match.slug, how: 'matched' };
    } else {
      const now = new Date().toISOString();
      const componentConfigs: Record<string, Json> = {};
      for (const comp of comps) {
        const pointed = prodConfigs.get(comp);
        if (!isObject(pointed)) continue;
        componentConfigs[comp] = stripMarkers(pointed);
      }
      recoveredTheme = {
        name: RECOVERED_NAME,
        createdAt: now,
        updatedAt: now,
        schemaVersion: THEME_SCHEMA_VERSION,
        colorsAndType: isObject(prodColors) ? stripMarkers(prodColors) : null,
        componentConfigs,
        // The configs above are what boot just wrote (`prodConfigs`, read off
        // the pointed files), at the current component schema — not 0, which
        // would misdescribe them as unmigrated.
        componentSchemaVersion: CURRENT_COMPONENT_SCHEMA_VERSION,
      };
      const slug = nextAvailableName((n) => themesRes.existingPath(n) !== null, RECOVERED_SLUG);
      recoveredThemePath = themesRes.filePath(slug);
      production = { slug, how: 'recovered' };
    }
  }

  // ── 2. Derive the buffers ───────────────────────────────────────────────
  const activeThemeSlug = themesRes.getActiveName();
  const activeTheme = themeBySlug.get(activeThemeSlug) ?? null;

  const workingWritten: string[] = [];
  const workingKept: string[] = [];

  const planWorking = (res: VersionedFileResourceServer, live: unknown, saved: unknown): void => {
    if (!isObject(live) || sameContent(live, saved)) return;
    // A buffer already on disk was written by the new server and is newer than
    // anything a retired pointer names.
    if (res.hasWorking()) {
      workingKept.push(res.workingPath);
      return;
    }
    workingWritten.push(res.workingPath);
    if (!check) res.writeWorking(stripMarkers(live));
  };

  const activeColorsName = resolveName(colorsRes, colorsAndTypeDir, '_active.json', 'activeFile');
  planWorking(
    colorsRes,
    readPointed(colorsRes, activeColorsName),
    activeTheme?.colorsAndType ?? colorsRes.readJson('default'),
  );
  for (const comp of comps) {
    const activeName = resolveName(
      compRes(comp),
      path.join(componentConfigsDir, comp),
      '_active.json',
      'activeFile',
    );
    planWorking(
      compRes(comp),
      readPointed(compRes(comp), activeName),
      activeTheme ? themeConfigFor(activeTheme, comp) : defaultConfig(comp),
    );
  }

  // ── 3. Delete the materialised copies, keep the user's files ────────────
  const deletedFiles: string[] = [];
  const keptUserFiles: string[] = [];

  const sweep = (
    res: VersionedFileResourceServer,
    dir: string,
    savedCopies: (theme: EncapsulatedTheme) => unknown,
  ): void => {
    for (const name of localNamedFiles(dir)) {
      // A file the package ships is not a copy this tree made.
      if (res.isPackageFile(name)) continue;
      let content: unknown;
      try {
        content = res.readJson(name);
      } catch {
        keptUserFiles.push(res.filePath(name));
        continue;
      }
      const matched = themes.some((t) => sameContent(savedCopies(t.theme), content));
      if (!matched) {
        keptUserFiles.push(res.filePath(name));
        continue;
      }
      deletedFiles.push(res.filePath(name));
      if (!check) fs.unlinkSync(res.filePath(name));
    }
  };

  sweep(colorsRes, colorsAndTypeDir, (theme) => theme.colorsAndType);
  for (const comp of comps) {
    sweep(compRes(comp), path.join(componentConfigsDir, comp), (theme) => themeConfigFor(theme, comp));
  }

  // `default` is a baseline rather than a copy, so the sweep never considers
  // it. A local one that no longer matches the package is still worth saying
  // out loud: it shadows the shipped default, and an old one keeps a consumer
  // off improvements they think they upgraded into.
  const shadowedDefaults: string[] = [];
  const localDefault = path.join(colorsAndTypeDir, 'default.json');
  const packageDefault = packageDataDir
    ? path.join(packageDataDir, 'colors-and-type', 'default.json')
    : null;
  if (
    packageDefault &&
    fs.existsSync(localDefault) &&
    fs.existsSync(packageDefault) &&
    path.resolve(localDefault) !== path.resolve(packageDefault)
  ) {
    try {
      const local = JSON.parse(fs.readFileSync(localDefault, 'utf-8'));
      const shipped = JSON.parse(fs.readFileSync(packageDefault, 'utf-8'));
      if (!sameContent(local, shipped)) shadowedDefaults.push(localDefault);
    } catch { /* a file that will not parse is not a claim to make here */ }
  }

  // ── 4. Retire the per-layer pointers ────────────────────────────────────
  if (!check) {
    for (const p of legacyPointers) fs.unlinkSync(p);
  }

  if (!check) {
    if (recoveredTheme && recoveredThemePath) {
      themesRes.ensureDir();
      fs.writeFileSync(recoveredThemePath, JSON.stringify(recoveredTheme, null, 2));
    }
    themesRes.ensureDir();
    themesRes.setProductionName(production.slug);
  }

  return {
    status: check ? 'planned' : 'healed',
    renames,
    production,
    recoveredThemePath: recoveredThemePath && reported(recoveredThemePath),
    workingWritten: workingWritten.map(reported),
    workingKept: workingKept.map(reported),
    deletedFiles: deletedFiles.map(reported),
    deletedPointers: legacyPointers.map(reported),
    keptUserFiles: keptUserFiles.map(reported),
    notThemes: notThemes.map(reported),
    droppedRefs,
    shadowedDefaults: shadowedDefaults.map(reported),
    upgradedThemes: upgradedThemes.map(reported),
  };
}
