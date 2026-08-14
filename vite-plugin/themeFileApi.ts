import type { Plugin } from 'vite';
import fs from 'fs';
import path from 'path';
import { extractGlobalRootBody } from '../src/editor/core/themes/parsers/globalRootBlock';
import { parseColorOpacity } from '../src/editor/core/themes/parsers/colorOpacity';
import { sanitizeFileName } from '../src/editor/core/storage/files/versionedFileResourceClient';
import {
  palettesToVars,
  reconcilePalettesFromCssVars,
} from '../src/editor/core/palettes/paletteDerivation';
import { migratePaletteColorsToOklch } from '../src/editor/core/themes/migrations/2026-07-21-palette-oklch-basis';
import {
  versionedFileResourceServer,
  type VersionedFileResourceServer,
} from './files/versionedFileResourceServer';
import { dispatch, type Route } from './files/routeTable';
import {
  THEME_SCHEMA_VERSION,
  normalizeTheme,
  type EncapsulatedTheme,
  type ThemeResolvers,
} from './themes/normalizeTheme';
import { nextAvailableName as allocNextAvailableName } from './files/nameAllocator';
import { resolveDataDirs } from './files/dataPaths';
import { validateTokensCss, runAdditiveTokensCssMigrations } from './tokensCssMigrations';
import { fileURLToPath } from 'node:url';

// Read live-tokens' own package.json by walking up from this file. Works the
// same in dev (plugin source) and built (dist-plugin/index.js) — single source.
const PKG_VERSION: string = (() => {
  try {
    let dir = path.dirname(fileURLToPath(import.meta.url));
    for (let i = 0; i < 4; i++) {
      const p = path.join(dir, 'package.json');
      if (fs.existsSync(p)) {
        const json = JSON.parse(fs.readFileSync(p, 'utf-8'));
        if (json?.name === '@motion-proto/live-tokens') return json.version ?? '';
      }
      const up = path.dirname(dir);
      if (up === dir) break;
      dir = up;
    }
  } catch { /* fall through */ }
  return '';
})();

/** Bundle envelope kind per schema version. `manifest-bundle` is what every
 *  release through 0.47.1 exported, always v1; the current version writes
 *  `theme-bundle`. Import accepts each kind only with its own version, so a
 *  crossed pair — which no release ever wrote — stays rejected. */
const BUNDLE_KIND_BY_VERSION: Record<number, string> = {
  1: 'manifest-bundle',
  [THEME_SCHEMA_VERSION]: 'theme-bundle',
};

export interface ThemeFileApiOptions {
  tokensCssPath: string;       // required, e.g. 'src/styles/tokens.css'. Developer-authored, never written.
  tokensGeneratedCssPath?: string; // default: '<dataDir>/tokens.generated.css'. Editor-owned content.
  fontsCssPath?: string;       // default: sibling of tokensCssPath named 'fonts.css'
  apiBase?: string;            // default: '/api/live-tokens'. Plain '/path' — regex metacharacters are escaped at use site.
  // Data directories. Per-folder resolution order: explicit option >
  // `live-tokens.config.json` at cwd > `<dataDir>/<sub>` where dataDir comes
  // from opts > config file > package default `src/live-tokens/data`.
  dataDir?: string;            // default: 'src/live-tokens/data'
  colorsAndTypeDir?: string;   // default: `<dataDir>/colors-and-type`
  componentConfigsDir?: string; // default: `<dataDir>/component-configs`
  themesDir?: string;          // default: `<dataDir>/themes`
  componentsSrcDir?: string;   // default: scans both 'src/components' and 'src/system/components'
  // When true, the dev server applies pending *additive* tokens.css migrations
  // (new token names only) to `tokensCssPath` at boot and writes the file; the
  // change shows up in git for review. Off by default: with it off the plugin
  // never writes tokensCssPath (a pre-1.0 invariant). Breaking migrations
  // (rename/remove) are never auto-applied — run `npx live-tokens migrate`.
  autoMigrate?: boolean;
}

export function themeFileApi(opts: ThemeFileApiOptions): Plugin {
  const dataDirs = resolveDataDirs({
    dataDir: opts.dataDir,
    colorsAndTypeDir: opts.colorsAndTypeDir,
    componentConfigsDir: opts.componentConfigsDir,
    themesDir: opts.themesDir,
  });
  const COLORS_AND_TYPE_DIR = dataDirs.colorsAndTypeDir;
  const COMPONENT_CONFIGS_DIR = dataDirs.componentConfigsDir;
  const THEMES_DIR = dataDirs.themesDir;
  const CSS_PATH = path.resolve(opts.tokensCssPath);
  const GENERATED_CSS_PATH = opts.tokensGeneratedCssPath
    ? path.resolve(opts.tokensGeneratedCssPath)
    : path.join(dataDirs.dataDir, 'tokens.generated.css');
  const FONTS_CSS_PATH = opts.fontsCssPath
    ? path.resolve(opts.fontsCssPath)
    : path.join(path.dirname(CSS_PATH), 'fonts.css');
  // Default keeps live-tokens' REST routes under a single namespace so they
  // can't collide with the consumer's own `/api/themes` or `/api/components`.
  // The client side reads the same value via the `__LIVE_TOKENS_API_BASE__`
  // define injected in `config()` below.
  const API_BASE = opts.apiBase ?? '/api/live-tokens';
  // Consumer-side dirs to scan for components. With no explicit option, both
  // `src/components` (the Vite/Svelte convention) and `src/system/components`
  // (the historical default) are scanned — whichever the consumer uses works
  // out of the box and an existing consumer doesn't break on upgrade.
  const consumerComponentDirs: string[] = opts.componentsSrcDir
    ? [path.resolve(opts.componentsSrcDir)]
    : [path.resolve('src/components'), path.resolve('src/system/components')];

  // First-party components ship in the package at <package>/src/system/components/.
  // Both the source plugin (vite-plugin/themeFileApi.ts) and the built plugin
  // (dist-plugin/index.js) live one directory above that, so the same `../src/system/components`
  // relative path resolves correctly in either case — live-tokens own dev or
  // any consumer that depends on the published package.
  const packageComponentsDir = path.resolve(
    path.dirname(fileURLToPath(import.meta.url)),
    '..',
    'src',
    'system',
    'components',
  );

  // Package-shipped default data lives at <package>/src/live-tokens/data/. Same
  // `..`-from-this-file resolution as packageComponentsDir, so it works in
  // library-dev, in a consumer's node_modules, and from dist-plugin/. The
  // resource server's read-only fallback resolves a consumer's `default` colors
  // and type to the shipped copy when they have no local one, and serves shipped example
  // themes the same way. The Default theme never ships:
  // `ensureDefaultTheme` derives the full local set at boot, before the
  // first request.
  const packageDataDir = path.resolve(
    path.dirname(fileURLToPath(import.meta.url)),
    '..',
    'src',
    'live-tokens',
    'data',
  );
  const packageColorsAndTypeDir = path.join(packageDataDir, 'colors-and-type');
  const packageThemesDir = path.join(packageDataDir, 'themes');
  const packageComponentConfigsDir = path.join(packageDataDir, 'component-configs');

  /** Colors-and-type basenames the package ships, read from its own `files` listing. */
  function shippedColorsAndTypeNames(dataDir: string): string[] {
    try {
      const pkgRoot = path.resolve(dataDir, '..', '..', '..');
      const pkg = JSON.parse(fs.readFileSync(path.join(pkgRoot, 'package.json'), 'utf-8'));
      const files: string[] = Array.isArray(pkg.files) ? pkg.files : [];
      return files
        .filter((f) => /^src\/live-tokens\/data\/colors-and-type\/[^/]+\.json$/.test(f))
        .map((f) => path.basename(f, '.json'));
    } catch {
      return [];
    }
  }

  // Union of dirs to scan for component .svelte files. Consumer dirs first so
  // a consumer-authored component shadows a first-party one when names collide.
  const COMPONENTS_SCAN_DIRS: string[] = [...consumerComponentDirs];
  if (
    !COMPONENTS_SCAN_DIRS.includes(packageComponentsDir) &&
    fs.existsSync(packageComponentsDir)
  ) {
    COMPONENTS_SCAN_DIRS.push(packageComponentsDir);
  }

  // Colors-and-type resource — list/load/save/delete + active/production. The
  // package fallback ships the real default file so a consumer always has one to
  // load / restore to, and picks up an upgraded default on `npm upgrade`.
  // `packageOwnedNames` comes from the package's own `package.json` so the
  // library repo (whose local dir IS the package dir) can still tell a shipped
  // file from a user file when flagging `isPackage` in the list.
  const colorsAndTypeResource = versionedFileResourceServer({
    dir: COLORS_AND_TYPE_DIR,
    packageDir: packageColorsAndTypeDir,
    packageOwnedNames: shippedColorsAndTypeNames(packageDataDir),
  });

  // Per-component resources are constructed on demand because the set of
  // components is discovered at runtime from `src/system/components/*.svelte`.
  const componentResourceCache = new Map<string, VersionedFileResourceServer>();
  function componentResource(comp: string): VersionedFileResourceServer {
    let r = componentResourceCache.get(comp);
    if (!r) {
      // The package ships NO component-config JSON by design — component
      // defaults derive from the shipped `.svelte` `:global(:root)` via
      // generateDefaultConfig, re-derived locally on dev start / HMR. This
      // packageDir is therefore inert for consumers (the dir doesn't exist) and
      // self-referential in library-dev (local === package); it's wired only
      // for construction symmetry with colors-and-type/themes, and existingPath /
      // listNames no-op on a missing dir. Do NOT "fix" the asymmetry by shipping
      // component JSON — it becomes a second source of truth that drifts and is
      // shadowed on first dev-start anyway.
      r = versionedFileResourceServer({
        dir: path.join(COMPONENT_CONFIGS_DIR, comp),
        packageDir: path.join(packageComponentConfigsDir, comp),
      });
      componentResourceCache.set(comp, r);
    }
    return r;
  }

  // Themes resource — files that carry one colors-and-type file plus a config
  // per off-default component, by value. The active theme is the single live
  // snapshot; colors-and-type/component Adopts re-embed that slice (see
  // `patchActiveTheme`). `_production.json` is unused for this resource —
  // the model has no separate Production slot.
  const themesResource = versionedFileResourceServer({
    dir: THEMES_DIR,
    packageDir: packageThemesDir,
  });

  function ensureColorsAndTypeDir() {
    // No local default.json is written: `default` resolves to the shipped
    // package file via the resource server's read-only fallback. Writing an
    // empty local default here would shadow it. A missing package default fails
    // loudly downstream (caught by npm pack verification), not papered over.
    colorsAndTypeResource.ensureDir();
    colorsAndTypeResource.ensureMeta();
  }

  function readBody(req: any): Promise<string> {
    return new Promise((resolve, reject) => {
      let body = '';
      req.on('data', (chunk: Buffer) => (body += chunk));
      req.on('end', () => resolve(body));
      req.on('error', reject);
    });
  }

  function jsonResponse(res: any, status: number, data: any) {
    res.statusCode = status;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify(data));
  }

  /**
   * Single-door colors-and-type normaliser. Runs the per-slice reconciler (palettes
   * today; fonts/shadows/gradients later phases), then strips every variable
   * the typed slices now own from the catch-all `cssVariables` bag.
   *
   * The reconciler is gated by `_imported` per palette — editor-authored
   * files are no-ops, importers opt in. Strip runs unconditionally because
   * the renderer already overlays typed-slice derivations on top of
   * cssVariables; stripped values were dead data.
   *
   * Call from every colors-and-type read door. See
   * temp/manifest-robustness-plan.md §10.
   */
  function normalizeColorsAndType<T extends { cssVariables?: Record<string, string>; editorConfigs?: any } | null | undefined>(
    colorsAndType: T,
  ): T {
    if (!colorsAndType || typeof colorsAndType !== 'object') return colorsAndType;
    const palettes = colorsAndType.editorConfigs ?? {};
    const cssVars = colorsAndType.cssVariables ?? {};
    const { palettes: nextPalettes, consumed } = reconcilePalettesFromCssVars(palettes, cssVars);
    const nextCssVars: Record<string, string> = {};
    for (const [k, v] of Object.entries(cssVars)) {
      if (!consumed.has(k)) nextCssVars[k] = v;
    }
    return { ...colorsAndType, editorConfigs: nextPalettes, cssVariables: nextCssVars };
  }

  const SYSTEM_CASCADES_SSR: Record<string, string> = {
    'system-ui-sans':
      'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
    'system-ui-serif': 'Georgia, "Times New Roman", serif',
    'system-ui-mono': 'ui-monospace, "SF Mono", Menlo, Consolas, monospace',
  };

  function resolveFontStacks(colorsAndTypeData: any): Record<string, string> {
    const stacks = colorsAndTypeData.fontStacks as Array<{ variable: string; slots: any[] }> | undefined;
    const sources = colorsAndTypeData.fontSources as Array<{ id: string; families: Array<{ id: string; cssName: string }> }> | undefined;
    if (!stacks || stacks.length === 0) return {};
    const familyById = new Map<string, string>();
    for (const src of sources ?? []) {
      for (const f of src.families) familyById.set(f.id, f.cssName);
    }
    const out: Record<string, string> = {};
    for (const stack of stacks) {
      const parts: string[] = [];
      for (const slot of stack.slots) {
        if (slot.kind === 'project') {
          const css = familyById.get(slot.familyId);
          if (css) parts.push(css);
        } else if (slot.kind === 'system') {
          const cascade = SYSTEM_CASCADES_SSR[slot.preset];
          if (cascade) parts.push(cascade);
        } else if (slot.kind === 'generic') {
          parts.push(slot.value);
        }
      }
      if (parts.length > 0) out[stack.variable] = parts.join(', ');
    }
    return out;
  }

  /**
   * Regenerate the editor-owned `tokens.generated.css` sidecar from the
   * production colors and type and every component's `_production.json`. The
   * developer-authored `tokens.css` is never written — it holds defaults the
   * user is free to hand-edit and stays the single source of truth for
   * primitives. The generated file is imported immediately after `tokens.css`
   * and uses `:root:root` selectors (specificity 0,0,2) so its overrides win
   * over the defaults (0,0,1) and the component-default `:global(:root)`
   * blocks (0,0,1) regardless of CSS chunk ordering.
   *
   * Mirrors the client renderer's overlay order in `editorRenderer.ts`:
   * catch-all cssVariables first, then typed-slice derivations (palette ramps,
   * font stacks) on top. Per-component alias overrides emit only when a
   * component's production config differs from its default.
   */
  function regenerateTokensCss(): void {
    const lines: string[] = [];
    lines.push('/* Generated by themeFileApi from the production colors and type and component configs. Do not edit. */');
    lines.push('/* tokens.css holds developer-authored defaults; this file holds editor overrides. */');
    lines.push('');

    // Section 1: production colors-and-type overrides (palette ramps, font stacks, custom vars).
    const productionColorsAndTypeName = colorsAndTypeResource.getProductionName();
    const colorsAndTypeData = colorsAndTypeResource.readJson(productionColorsAndTypeName) as any;
    let colorsAndTypeVarCount = 0;
    if (colorsAndTypeData) {
      const cssVars: Record<string, string> = { ...(colorsAndTypeData.cssVariables || {}) };
      // On-disk JSON is a pre-basis (hex or already-numeric) input; convert
      // to the OKLCH basis at this boundary before deriving, mirroring loadFromFile.
      Object.assign(cssVars, palettesToVars(migratePaletteColorsToOklch(colorsAndTypeData.editorConfigs ?? {})));
      const resolvedFontVars = resolveFontStacks(colorsAndTypeData);
      for (const [name, value] of Object.entries(resolvedFontVars)) {
        cssVars[name] = value;
      }
      colorsAndTypeVarCount = Object.keys(cssVars).length;
      if (colorsAndTypeVarCount > 0) {
        lines.push(`/* Production colors and type: ${productionColorsAndTypeName} */`);
        lines.push(':root:root {');
        for (const [name, value] of Object.entries(cssVars)) {
          lines.push(`  ${name}: ${value};`);
        }
        lines.push('}');
        lines.push('');
      }
    }

    // Section 2: component-alias overrides — every production config that
    // differs from the component's default. When production points to
    // 'default', no overrides are emitted (the source `.svelte` is
    // authoritative).
    let componentOverrideCount = 0;
    if (fs.existsSync(COMPONENT_CONFIGS_DIR)) {
      const blocks: string[][] = [];
      for (const comp of listComponentNames()) {
        const prod = componentResource(comp).getProductionName();
        if (prod === 'default') continue;
        const prodCfg = readComponentConfig(comp, prod);
        const defaultCfg = readComponentConfig(comp, 'default');
        if (!prodCfg || !defaultCfg) continue;
        const overrides: [string, AliasDiskValue][] = [];
        const defaultAliases = (defaultCfg.aliases ?? {}) as Record<string, AliasDiskValue>;
        for (const [varName, semanticValue] of Object.entries((prodCfg.aliases ?? {}) as Record<string, AliasDiskValue>)) {
          if (!aliasValuesEqual(defaultAliases[varName], semanticValue)) {
            overrides.push([varName, semanticValue]);
          }
        }
        if (overrides.length === 0) continue;
        const block: string[] = [`  /* ${comp} (${prod}) */`];
        for (const [varName, semanticValue] of overrides) {
          block.push(`  ${varName}: ${aliasValueToCss(semanticValue)};`);
        }
        blocks.push(block);
        componentOverrideCount += overrides.length;
      }
      if (blocks.length > 0) {
        lines.push('/* Component aliases (production configs differing from defaults) */');
        lines.push(':root:root {');
        for (let i = 0; i < blocks.length; i++) {
          if (i > 0) lines.push('');
          lines.push(...blocks[i]);
        }
        lines.push('}');
        lines.push('');
      }
    }

    if (!fs.existsSync(path.dirname(GENERATED_CSS_PATH))) {
      fs.mkdirSync(path.dirname(GENERATED_CSS_PATH), { recursive: true });
    }
    fs.writeFileSync(GENERATED_CSS_PATH, lines.join('\n'));
    console.log(
      `[regenerateTokensCss] Wrote ${path.basename(GENERATED_CSS_PATH)} (${colorsAndTypeVarCount} theme vars, ${componentOverrideCount} component overrides)`,
    );
  }

  /** Back-compat wrapper. The argument is ignored; the generated file is
   * always rebuilt from the current production colors and type. Existing call sites
   * pass a fileName for historical reasons (they all set the production
   * pointer first, then call this). */
  function syncTokensToCss(_fileName: string): void {
    regenerateTokensCss();
  }

  /**
   * Regenerate fonts.css from a colors-and-type file's fontSources. Called alongside
   * syncTokensToCss so the production build's static font-loading layer
   * matches the registry the editor last promoted.
   */
  function syncFontsToCss(fileName: string): void {
    const colorsAndTypeData = colorsAndTypeResource.readJson(fileName) as any;
    if (!colorsAndTypeData) return;
    const sources = colorsAndTypeData.fontSources as Array<{
      id: string;
      kind: string;
      url?: string;
      cssText?: string;
      label?: string;
      families: Array<{ name: string }>;
    }> | undefined;
    if (!sources) return;

    const lines: string[] = [];
    lines.push('/* Generated from the production colors and type by syncFontsToCss. Do not edit. */');
    lines.push('/* Both fonts.css and fonts/ are in dist/, so relative paths work at runtime. */');
    lines.push('');

    // CSS requires all @import rules to precede other statements, so emit
    // URL-based sources first and font-face rules after, regardless of the
    // order they appear in fontSources.
    const urlSources = sources.filter((s) => s.kind !== 'font-face' && s.url);
    const faceSources = sources.filter((s) => s.kind === 'font-face' && s.cssText);

    for (const source of urlSources) {
      const familyNames = source.families.map((f) => f.name).join(', ');
      const label = source.label ? `${source.label} — ${familyNames}` : familyNames;
      lines.push(`/* ${label} */`);
      lines.push(`@import url('${source.url}');`);
      lines.push('');
    }

    for (const source of faceSources) {
      const familyNames = source.families.map((f) => f.name).join(', ');
      const label = source.label ? `${source.label} — ${familyNames}` : familyNames;
      lines.push(`/* ${label} */`);
      lines.push(source.cssText!);
      lines.push('');
    }

    const content = lines.join('\n');
    if (!fs.existsSync(path.dirname(FONTS_CSS_PATH))) {
      fs.mkdirSync(path.dirname(FONTS_CSS_PATH), { recursive: true });
    }
    fs.writeFileSync(FONTS_CSS_PATH, content);
    console.log(`[syncFontsToCss] Wrote ${sources.length} source(s) into ${path.basename(FONTS_CSS_PATH)}`);
  }

  // ── Component-configs helpers ─────────────────────────────────────────────
  //
  // Each component under `src/system/components/*.svelte` has an independent editor
  // artifact: component-configs/{comp}/{default.json,_active.json,_production.json}.
  // default.json is regenerated from the component's `:global(:root)` block at
  // dev startup and on HMR; other files are user-authored.

  function extractAliasDeclarations(body: string): Record<string, string> {
    const aliases: Record<string, string> = {};
    // A component property is either a plain alias to a design token
    // (`--v: var(--token);`) or that token carried at reduced opacity
    // (`--v: color-mix(in srgb, var(--token) NN%, transparent);`) — the form the
    // color picker emits below 100% opacity (see parsers/colorOpacity, the one
    // place that knows that shape). Plain aliases are stored as the bare token
    // name (the editor's disk convention); opacity declarations are stored as
    // the full color-mix string, matching the production configs the editor
    // writes. Any other literal is intentionally ignored — a property must bind
    // a design token, not a raw color.
    const re = /(--[a-z0-9-]+)\s*:\s*([^;]+);/gi;
    let m: RegExpExecArray | null;
    while ((m = re.exec(body)) !== null) {
      const value = m[2].trim();
      const plain = value.match(/^var\((--[a-z0-9-]+)\)$/i);
      if (plain) aliases[m[1]] = plain[1];
      else if (parseColorOpacity(value)) aliases[m[1]] = value;
    }
    return aliases;
  }

  function componentNameFromFile(filePath: string): string {
    return path.basename(filePath, '.svelte').toLowerCase();
  }

  /**
   * A `.svelte` file is a theme-aware runtime component iff it declares its
   * tokens in a `:global(:root) { ... }` block. Editor companion files
   * (e.g. `Foo.editor.svelte` or `FooEditor.svelte`) and plain utility
   * components don't have that block, so they're skipped. This is the
   * cheapest, most semantic way to distinguish — no filename convention is
   * imposed on the consumer beyond what's already required for theme
   * awareness.
   */
  function isThemeAwareComponent(filePath: string): boolean {
    try {
      const source = fs.readFileSync(filePath, 'utf-8');
      return /:global\(:root\)\s*\{/.test(source);
    } catch {
      return false;
    }
  }

  function listComponentSourcePaths(): string[] {
    const byName = new Map<string, string>();
    // Earlier dirs (consumer) win over later (package) on name collision —
    // see COMPONENTS_SCAN_DIRS ordering.
    for (const dir of COMPONENTS_SCAN_DIRS) {
      if (!fs.existsSync(dir)) continue;
      for (const f of fs.readdirSync(dir)) {
        if (!f.endsWith('.svelte')) continue;
        const full = path.join(dir, f);
        if (!isThemeAwareComponent(full)) continue;
        const name = componentNameFromFile(f);
        if (!byName.has(name)) byName.set(name, full);
      }
    }
    return Array.from(byName.values());
  }

  function listComponentNames(): string[] {
    return listComponentSourcePaths().map(componentNameFromFile);
  }

  /**
   * Boot-time drift guardrail. Components reference Layer-1 primitives through
   * `var(--…)`; when the package's token vocabulary moves ahead of the
   * consumer's developer-authored `tokens.css`, those references resolve to
   * nothing and the editor renders blank/`—` slots. We never auto-write
   * `tokens.css` (that invariant stands), so the fix is to surface the drift
   * loudly and point at `npx live-tokens migrate`.
   */
  function warnOnTokenDrift(log: (msg: string) => void): void {
    let tokensCss = '';
    try {
      tokensCss = fs.readFileSync(CSS_PATH, 'utf-8');
    } catch {
      return; // No tokens.css to validate against — nothing to say.
    }
    let generatedCss = '';
    try {
      generatedCss = fs.readFileSync(GENERATED_CSS_PATH, 'utf-8');
    } catch {
      /* sidecar optional */
    }
    const componentSources = listComponentSourcePaths().map((p) => ({
      name: componentNameFromFile(p),
      source: fs.readFileSync(p, 'utf-8'),
    }));

    const missing = validateTokensCss({ tokensCss, generatedCss, componentSources });
    if (missing.length === 0) return;

    const lines = missing.map(
      (m) => `  ${m.token}  (referenced by ${m.referencedBy.join(', ')})`,
    );
    log(
      `[live-tokens] ${missing.length} token(s) referenced by components are not defined in ` +
        `${path.relative(process.cwd(), CSS_PATH)}:\n${lines.join('\n')}\n` +
        `  These render as blank/empty editor slots. Run \`npx live-tokens migrate\` to reconcile.`,
    );
  }

  /**
   * Opt-in (`autoMigrate`) boot step: apply pending *additive* migrations to the
   * developer-authored `tokens.css` and write it. Additive changes only add new
   * token names, so this stays backward-compatible; breaking migrations are left
   * for `warnOnTokenDrift` to surface and an explicit `live-tokens migrate`. This
   * is the one sanctioned path by which the plugin writes `tokensCssPath`.
   */
  function autoMigrateAdditive(log: (msg: string) => void): void {
    let before = '';
    try {
      before = fs.readFileSync(CSS_PATH, 'utf-8');
    } catch {
      return; // No tokens.css to migrate.
    }
    const { css, applied, changed } = runAdditiveTokensCssMigrations(before);
    if (!changed) return;
    fs.writeFileSync(CSS_PATH, css);
    log(
      `[live-tokens] autoMigrate applied ${applied.length} additive migration(s) to ` +
        `${path.relative(process.cwd(), CSS_PATH)}: ${applied.join(', ')}. Review the diff in git.`,
    );
  }

  /**
   * Regenerate `component-configs/{comp}/default.json` from the component's
   * `:global(:root)` block. Writes only if missing or stale (source mtime >
   * default mtime). Preserves createdAt on regeneration.
   */
  function generateDefaultConfig(comp: string, sourcePath: string): void {
    if (!fs.existsSync(sourcePath)) return;
    const r = componentResource(comp);
    r.ensureDir();
    const defaultPath = r.filePath('default');
    const sourceStat = fs.statSync(sourcePath);
    if (fs.existsSync(defaultPath)) {
      const defaultStat = fs.statSync(defaultPath);
      if (defaultStat.mtimeMs >= sourceStat.mtimeMs) return;
    }
    const source = fs.readFileSync(sourcePath, 'utf-8');
    const body = extractGlobalRootBody(source);
    const aliases: Record<string, unknown> = extractAliasDeclarations(body);
    const now = new Date().toISOString();
    let createdAt = now;
    let existingUpdatedAt: string | undefined;
    let existingAliases: Record<string, unknown> | undefined;
    if (fs.existsSync(defaultPath)) {
      try {
        const existing = JSON.parse(fs.readFileSync(defaultPath, 'utf-8'));
        if (existing.createdAt) createdAt = existing.createdAt;
        if (typeof existing.updatedAt === 'string') existingUpdatedAt = existing.updatedAt;
        if (existing.aliases && typeof existing.aliases === 'object') {
          existingAliases = existing.aliases as Record<string, unknown>;
        }
      } catch { /* overwrite */ }
    }
    // Structured aliases (e.g. a `kind:'gradient'` object) bake into :root as a
    // gradient literal, which extractAliasDeclarations can't reverse into an
    // alias — it only recovers var()/color-mix forms. Carry any prior
    // structured alias forward so regenerating from source doesn't silently
    // drop a component's gradient default.
    if (existingAliases) {
      for (const [token, val] of Object.entries(existingAliases)) {
        if (val !== null && typeof val === 'object' && !(token in aliases)) {
          aliases[token] = val;
        }
      }
    }
    const aliasesUnchanged =
      existingAliases !== undefined &&
      JSON.stringify(existingAliases) === JSON.stringify(aliases);
    const defaultConfig = {
      name: 'default',
      component: comp,
      createdAt,
      updatedAt: aliasesUnchanged && existingUpdatedAt ? existingUpdatedAt : now,
      aliases,
    };
    if (aliasesUnchanged && existingUpdatedAt) {
      // Bump default.json's mtime so the source > default check stops firing,
      // but leave file bytes (including updatedAt) untouched.
      const t = new Date();
      fs.utimesSync(defaultPath, t, t);
      return;
    }
    fs.writeFileSync(defaultPath, JSON.stringify(defaultConfig, null, 2));
  }

  function ensureComponentConfigsDir(): void {
    if (!fs.existsSync(COMPONENT_CONFIGS_DIR)) {
      fs.mkdirSync(COMPONENT_CONFIGS_DIR, { recursive: true });
    }
    for (const sourcePath of listComponentSourcePaths()) {
      const comp = componentNameFromFile(sourcePath);
      const r = componentResource(comp);
      r.ensureDir();
      generateDefaultConfig(comp, sourcePath);
      r.ensureMeta();
    }
  }

  // ── Themes helpers ────────────────────────────────────────────────────────

  /** Resolve a v1 theme's refs against the files on disk, package fallback
   *  included. Import passes its own bundle-scoped resolvers instead. */
  const diskThemeResolvers: ThemeResolvers = {
    readColorsAndType: (name) => colorsAndTypeResource.readJson(sanitizeFileName(name)),
    readComponentConfig: (comp, name) => readComponentConfig(comp, sanitizeFileName(name)),
    normalizeColorsAndType: (colorsAndType) => normalizeColorsAndType(colorsAndType as any),
  };

  /** `null` covers both "no such theme" and "the file is there but won't
   *  parse": one unreadable file must not take the list door down with it.
   *  Doors that answer a single theme tell the two apart via
   *  `respondUnreadableTheme`. */
  function readTheme(fileName: string) {
    let raw: unknown;
    try {
      raw = themesResource.readJson(fileName);
    } catch {
      return null;
    }
    if (!raw) return null;
    return normalizeTheme(raw, diskThemeResolvers);
  }

  function respondUnreadableTheme(res: any, fileName: string, missingError: string): void {
    if (themesResource.existingPath(fileName) !== null) {
      jsonResponse(res, 422, {
        error: `Theme file "${fileName}" is not valid JSON`,
        code: 'CORRUPT_THEME',
      });
      return;
    }
    jsonResponse(res, 404, { error: missingError });
  }

  function writeTheme(fileName: string, theme: EncapsulatedTheme): void {
    themesResource.ensureDir();
    fs.writeFileSync(themesResource.filePath(fileName), JSON.stringify(theme, null, 2));
  }

  /**
   * Rewrite local pointer-form themes to the encapsulated form. Eager, at
   * boot: from here on colors-and-type files and configs are freely deletable, so a theme
   * that still names them can lose its content between one boot and the next.
   */
  function migrateLocalThemes(warn: (msg: string) => void): void {
    // In the live-tokens repo the local data dir IS the package data dir.
    // Shipped data is regenerated deliberately, never as a boot side effect —
    // `npm test` boots this plugin too.
    if (path.resolve(THEMES_DIR) === path.resolve(packageThemesDir)) return;
    if (!fs.existsSync(THEMES_DIR)) return;
    for (const file of fs.readdirSync(THEMES_DIR)) {
      if (!file.endsWith('.json') || file.startsWith('_')) continue;
      const fileName = file.slice(0, -'.json'.length);
      // `default` is regenerated by ensureDefaultTheme before this runs,
      // so it is already current.
      if (fileName === 'default') continue;
      let raw: unknown;
      try {
        raw = JSON.parse(fs.readFileSync(path.join(THEMES_DIR, file), 'utf-8'));
      } catch {
        continue;
      }
      const { theme, dropped, migrated } = normalizeTheme(raw, diskThemeResolvers);
      if (!migrated) continue;
      writeTheme(fileName, theme);
      if (dropped.length > 0) {
        warn(
          `[live-tokens] Theme "${fileName}": ${dropped.join(', ')} no longer exists; ` +
            'those slices now use their defaults.',
        );
      }
    }
  }

  /**
   * Materialise the Default theme: the shipped colors and type plus EVERY
   * component's derived default config, by value. It is the one theme that is
   * not delta-encoded, because it is the written record of the whole default state.
   *
   * Its source of truth is code (the colors-and-type file plus each component's
   * `:global(:root)`), so regenerating it on every boot is safe: deletion
   * outside the file manager heals, and a removed component cannot linger in it
   * the way `stat` did. Writes only on real drift, like `generateDefaultConfig`
   * — a boot that changes nothing leaves bytes and mtime alone.
   */
  function ensureDefaultTheme(): void {
    const colorsAndType = normalizeColorsAndType(colorsAndTypeResource.readJson('default') as any);
    const componentConfigs: Record<string, any> = {};
    for (const comp of listComponentNames()) {
      const cfg = readComponentConfig(comp, 'default');
      if (cfg) componentConfigs[comp] = cfg;
    }

    let existing: any = null;
    try {
      existing = JSON.parse(fs.readFileSync(themesResource.filePath('default'), 'utf-8'));
    } catch { /* missing or corrupt — regenerate */ }
    if (
      existing?.schemaVersion === THEME_SCHEMA_VERSION &&
      JSON.stringify(existing.colorsAndType) === JSON.stringify(colorsAndType) &&
      JSON.stringify(existing.componentConfigs) === JSON.stringify(componentConfigs)
    ) {
      return;
    }

    const now = new Date().toISOString();
    writeTheme('default', {
      name: 'Default',
      createdAt: typeof existing?.createdAt === 'string' ? existing.createdAt : now,
      updatedAt: now,
      schemaVersion: THEME_SCHEMA_VERSION,
      colorsAndType,
      componentConfigs,
    });
  }

  function ensureThemesDir(warn: (msg: string) => void): void {
    themesResource.ensureDir();
    // Runs before the migration and in every project, this repo included: the
    // Default set is derived, so regenerating shipped data here is the point
    // rather than a side effect.
    ensureDefaultTheme();
    migrateLocalThemes(warn);

    // Ensure `_active.json` exists; the theme model has no Production slot,
    // so `_production.json` is never written for this resource.
    if (!fs.existsSync(themesResource.activePath)) {
      fs.writeFileSync(
        themesResource.activePath,
        JSON.stringify({ activeFile: 'default' }),
      );
    } else {
      // Normalize: if the pointer references a name that resolves neither
      // locally nor in the package, fall back to default.
      const activeName = themesResource.getActiveName();
      if (themesResource.existingPath(activeName) === null) {
        themesResource.setActiveName('default');
      }
    }
  }

  /** One slice of the live look, named by the file it runs. */
  type AdoptedSlice =
    | { field: 'colors-and-type'; fileName: string }
    | { field: 'component'; comp: string; fileName: string };

  /**
   * Re-embed slices of the currently-active theme in response to an Adopt:
   * each adopted file's content is copied in by value. Adopting `default` for
   * a component drops its entry — absent is default. Returns `false` if the
   * active theme is `default` (protected) or nothing resolved.
   *
   * Takes a list so the whole-look adopt lands as one read and one write; a
   * per-slice loop would rewrite the file once per component.
   *
   * Adopting into a package-shipped theme forks it: the read resolves
   * through the package fallback, the write lands locally under the same name.
   * The alternative is a shipped theme that stays marked active while the
   * live state moves away from it.
   */
  function patchActiveTheme(slices: AdoptedSlice[]): boolean {
    const activeFile = themesResource.getActiveName();
    if (activeFile === 'default') return false;
    const read = readTheme(activeFile);
    if (!read) return false;
    const { theme } = read;
    let applied = 0;
    for (const slice of slices) {
      if (slice.field === 'colors-and-type') {
        const colorsAndType = colorsAndTypeResource.readJson(sanitizeFileName(slice.fileName));
        if (!colorsAndType) continue;
        theme.colorsAndType = normalizeColorsAndType(colorsAndType as any);
      } else if (slice.fileName === 'default') {
        delete theme.componentConfigs[slice.comp];
      } else {
        const cfg = readComponentConfig(slice.comp, slice.fileName);
        if (!cfg) continue;
        theme.componentConfigs[slice.comp] = { ...cfg, component: slice.comp };
      }
      applied++;
    }
    if (applied === 0) return false;
    theme.updatedAt = new Date().toISOString();
    writeTheme(activeFile, theme);
    return true;
  }

  /** Inline structured gradient on a component alias. Mirrors the client's
   *  `AliasDiskValue` discriminant — kept inline here because the vite plugin
   *  has no clean import path into `src/editor/core/themes`. */
  type AliasDiskGradient = {
    kind: 'gradient';
    value: {
      type: 'linear' | 'radial' | 'solid' | 'none';
      angle: number;
      radius?: number;
      centerX?: number;
      aspectX?: number;
      aspectY?: number;
      stops: { position: number; color: string; opacity?: number }[];
    };
  };
  type AliasDiskValue = string | AliasDiskGradient;

  interface ComponentConfigRead {
    name?: string;
    component?: string;
    createdAt?: string;
    updatedAt?: string;
    aliases?: Record<string, AliasDiskValue>;
    config?: Record<string, unknown>;
  }

  /** Server-side mirror of `formatGradientValue` from
   *  `src/editor/core/themes/slices/gradients.ts`. Emits the same CSS the
   *  client's renderer writes into `:root`, so production overrides stay in
   *  sync with the live editor. */
  function formatAliasGradient(v: AliasDiskGradient['value']): string {
    const stopColor = (s: { color: string; opacity?: number }): string => {
      const base = s.color.startsWith('--') ? `var(${s.color})` : s.color;
      const opacity = s.opacity ?? 100;
      return opacity >= 100 ? base : `color-mix(in srgb, ${base} ${opacity}%, transparent)`;
    };
    if (v.type === 'none') return 'transparent';
    if (v.type === 'solid') {
      const first = v.stops[0];
      if (!first) return 'transparent';
      return stopColor(first);
    }
    const stops = v.stops.map((s) => `${stopColor(s)} ${s.position}%`).join(', ');
    if (v.type === 'linear') return `linear-gradient(${v.angle}deg, ${stops})`;
    const radial = v.radius && v.radius > 0
      ? `circle ${v.radius}px at center`
      : 'circle';
    return `radial-gradient(${radial}, ${stops})`;
  }

  function aliasValueToCss(v: AliasDiskValue): string {
    if (typeof v === 'string') return v.startsWith('--') ? `var(${v})` : v;
    return formatAliasGradient(v.value);
  }

  function aliasValuesEqual(a: AliasDiskValue | undefined, b: AliasDiskValue | undefined): boolean {
    if (a === undefined || b === undefined) return a === b;
    if (typeof a === 'string' && typeof b === 'string') return a === b;
    if (typeof a !== typeof b) return false;
    return JSON.stringify(a) === JSON.stringify(b);
  }

  function readComponentConfig(comp: string, name: string): ComponentConfigRead | null {
    try {
      return componentResource(comp).readJson(name) as ComponentConfigRead | null;
    } catch {
      return null;
    }
  }

  /** Back-compat wrapper. Component-alias overrides are now emitted as a
   * second `:root:root` block inside `tokens.generated.css`; see
   * `regenerateTokensCss`. The developer-authored `tokens.css` is never
   * written. */
  function syncComponentsToCss(): void {
    regenerateTokensCss();
  }

  // Build parameterized routes/regexes from API_BASE.
  // Escape regex metacharacters so custom apiBase values still work.
  const escapedBase = API_BASE.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const COLORS_AND_TYPE_ROUTE = `${API_BASE}/colors-and-type`;
  const COLORS_AND_TYPE_ACTIVE_ROUTE = `${API_BASE}/colors-and-type/active`;
  const COLORS_AND_TYPE_PRODUCTION_ROUTE = `${API_BASE}/colors-and-type/production`;
  const COMPONENT_CONFIGS_ROUTE = `${API_BASE}/component-configs`;
  const THEMES_ROUTE = `${API_BASE}/themes`;
  const THEMES_ACTIVE_ROUTE = `${API_BASE}/themes/active`;
  const COLORS_AND_TYPE_BY_NAME_REGEX = new RegExp(`^${escapedBase}/colors-and-type/([a-z0-9\\-_]+)$`);
  const COMP_LIST_REGEX = new RegExp(`^${escapedBase}/component-configs/([a-z0-9\\-_]+)$`);
  const COMP_ACTIVE_REGEX = new RegExp(`^${escapedBase}/component-configs/([a-z0-9\\-_]+)/active$`);
  const COMP_PRODUCTION_REGEX = new RegExp(`^${escapedBase}/component-configs/([a-z0-9\\-_]+)/production$`);
  const COMP_BY_NAME_REGEX = new RegExp(`^${escapedBase}/component-configs/([a-z0-9\\-_]+)/([a-z0-9\\-_]+)$`);
  const THEME_APPLY_REGEX = new RegExp(`^${escapedBase}/themes/([a-z0-9\\-_]+)/apply$`);
  const THEME_EXPORT_REGEX = new RegExp(`^${escapedBase}/themes/([a-z0-9\\-_]+)/export$`);
  const THEME_IMPORT_ROUTE = `${API_BASE}/themes/import`;
  const THEME_BY_NAME_REGEX = new RegExp(`^${escapedBase}/themes/([a-z0-9\\-_]+)$`);
  // Root peer of `/colors-and-type/production` and `/component-configs/:comp/production`:
  // the production state of the whole look.
  const PRODUCTION_ROUTE = `${API_BASE}/production`;

  // ── Route handlers ────────────────────────────────────────────────────────
  // Each handler can throw — the route-table dispatcher centralises the 500
  // catch. Order in the routes table matters: the active/production patterns
  // MUST appear before the catch-all `:name` patterns (the table replaces
  // the previous "warning comment" with explicit ordering).

  // ── /api/colors-and-type ─────────────────────────────────────────────────

  async function handleListColorsAndType(_ctx: any) {
    const activeFile = colorsAndTypeResource.getActiveName();
    const files = colorsAndTypeResource.listNames().map((fileName) => {
      const data = colorsAndTypeResource.readJson(fileName) as any;
      return {
        name: data?.name || fileName,
        fileName,
        updatedAt: data?.updatedAt || '',
        isActive: fileName === activeFile,
        // Package-owned rows are the shipped presets and the default. The Load
        // window offers those as whole themes, so it lists only the rows a
        // local file backs — including a local copy of a shipped name, which
        // holds whatever the user did to it.
        isPackage: colorsAndTypeResource.isPackageFile(fileName),
      };
    });
    jsonResponse(_ctx.res, 200, { files });
  }

  async function handleGetActiveColorsAndType({ res }: any) {
    const activeFile = colorsAndTypeResource.getActiveName();
    const raw = colorsAndTypeResource.readJson(activeFile);
    if (!raw) {
      jsonResponse(res, 404, { error: 'Active colors and type not found' });
      return;
    }
    const data = normalizeColorsAndType(raw as any);
    data._fileName = activeFile;
    jsonResponse(res, 200, data);
  }

  async function handleSetActiveColorsAndType({ req, res }: any) {
    const body = JSON.parse(await readBody(req));
    const fileName = sanitizeFileName(body.name || 'default');
    if (colorsAndTypeResource.existingPath(fileName) === null) {
      jsonResponse(res, 404, { error: 'Colors and type not found' });
      return;
    }
    colorsAndTypeResource.setActiveName(fileName);
    jsonResponse(res, 200, { ok: true, activeFile: fileName });
  }

  async function handleGetProductionColorsAndType({ res }: any) {
    const prodFile = colorsAndTypeResource.getProductionName();
    const raw = colorsAndTypeResource.readJson(prodFile);
    if (!raw) {
      jsonResponse(res, 200, { fileName: prodFile, name: prodFile, cssVariables: {} });
      return;
    }
    const data = normalizeColorsAndType(raw as any);
    jsonResponse(res, 200, {
      fileName: prodFile,
      name: data.name || prodFile,
      updatedAt: data.updatedAt || '',
      cssVariables: data.cssVariables || {},
    });
  }

  async function handleSetProductionColorsAndType({ req, res }: any) {
    const body = JSON.parse(await readBody(req));
    const fileName = sanitizeFileName(body.name || 'default');
    if (colorsAndTypeResource.existingPath(fileName) === null) {
      jsonResponse(res, 404, { error: 'Colors and type not found' });
      return;
    }
    // Reject before any destructive write if the active theme is the
    // protected default — the client recovers by prompting Save As.
    if (themesResource.getActiveName() === 'default') {
      jsonResponse(res, 409, {
        error: 'Active theme is protected. Save As first.',
        code: 'ACTIVE_IS_PROTECTED',
      });
      return;
    }
    colorsAndTypeResource.setProductionName(fileName);
    syncTokensToCss(fileName);
    syncFontsToCss(fileName);
    syncComponentsToCss();
    patchActiveTheme([{ field: 'colors-and-type', fileName }]);
    const data = colorsAndTypeResource.readJson(fileName) as any;
    jsonResponse(res, 200, {
      ok: true,
      fileName,
      name: data?.name || fileName,
      updatedAt: data?.updatedAt || '',
    });
  }

  async function handleColorsAndTypeByName({ params, req, res }: any) {
    const [fileName] = params;
    const filePath = colorsAndTypeResource.filePath(fileName);

    if (req.method === 'GET') {
      const raw = colorsAndTypeResource.readJson(fileName);
      if (!raw) {
        jsonResponse(res, 404, { error: 'Not found' });
        return;
      }
      const data = normalizeColorsAndType(raw as any);
      data._fileName = fileName;
      jsonResponse(res, 200, data);
      return;
    }

    if (req.method === 'PUT') {
      // `default` is live from the package and immutable, symmetric with
      // component-config and theme PUT. Without this guard a client could
      // write colors-and-type/default.json locally and fork the default the
      // live-from-package model treats as read-only. The editor's save flow
      // already redirects a Save on the active default into Save As, so no
      // legitimate client PUTs this path.
      if (fileName === 'default') {
        jsonResponse(res, 403, { error: 'Cannot overwrite the default colors and type (live from package)' });
        return;
      }
      const body = JSON.parse(await readBody(req));
      body.updatedAt = new Date().toISOString();
      // Preserve createdAt from existing file
      if (fs.existsSync(filePath)) {
        try {
          const existing = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
          if (existing.createdAt) body.createdAt = existing.createdAt;
        } catch { /* use body value or set below */ }
      }
      if (!body.createdAt) body.createdAt = body.updatedAt;
      fs.writeFileSync(filePath, JSON.stringify(body, null, 2));
      // Keep tokens.css and fonts.css in sync when the production file is saved
      if (fileName === colorsAndTypeResource.getProductionName()) {
        syncTokensToCss(fileName);
        syncFontsToCss(fileName);
        syncComponentsToCss();
      }
      jsonResponse(res, 200, { ok: true, fileName });
      return;
    }

    if (req.method === 'DELETE') {
      if (fileName === 'default') {
        jsonResponse(res, 403, { error: 'Cannot delete the default colors and type' });
        return;
      }
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
        // Deleting a local file that shadows a shipped preset restores the
        // package version, which still resolves — pointers may keep naming it,
        // but the CSS must resync to the restored content. Only a name that no
        // longer resolves anywhere heals its pointers to default, mirroring
        // the component-config delete handler.
        const stillShipped = colorsAndTypeResource.existingPath(fileName) !== null;
        if (!stillShipped) {
          if (colorsAndTypeResource.getActiveName() === fileName) {
            colorsAndTypeResource.setActiveName('default');
          }
          if (colorsAndTypeResource.getProductionName() === fileName) {
            colorsAndTypeResource.setProductionName('default');
            syncTokensToCss('default');
            syncFontsToCss('default');
          }
        } else if (colorsAndTypeResource.getProductionName() === fileName) {
          syncTokensToCss(fileName);
          syncFontsToCss(fileName);
        }
      } else if (colorsAndTypeResource.existingPath(fileName)) {
        // No local copy — only the package ships this file. Without this
        // guard the delete would report ok while it stays listed.
        jsonResponse(res, 403, {
          error: 'Cannot delete colors and type shipped with the package. Saving it creates a local copy; deleting that copy restores the shipped version.',
          code: 'PACKAGE_COLORS_AND_TYPE',
        });
        return;
      }
      jsonResponse(res, 200, { ok: true });
      return;
    }
  }

  // ── /api/component-configs ───────────────────────────────────────────────

  async function handleListComponents({ res }: any) {
    const components = listComponentNames().map((comp) => {
      const r = componentResource(comp);
      return {
        name: comp,
        activeFile: r.getActiveName(),
        productionFile: r.getProductionName(),
      };
    });
    jsonResponse(res, 200, { components });
  }

  async function handleGetComponentActive({ params, res }: any) {
    const [comp] = params;
    const r = componentResource(comp);
    const activeFile = r.getActiveName();
    const cfg = readComponentConfig(comp, activeFile);
    if (!cfg) {
      jsonResponse(res, 404, { error: 'Active config not found' });
      return;
    }
    jsonResponse(res, 200, { ...cfg, _fileName: activeFile });
  }

  async function handleSetComponentActive({ params, req, res }: any) {
    const [comp] = params;
    const body = JSON.parse(await readBody(req));
    const fileName = sanitizeFileName(body.name || 'default');
    const r = componentResource(comp);
    if (r.existingPath(fileName) === null) {
      jsonResponse(res, 404, { error: 'Config not found' });
      return;
    }
    r.ensureDir();
    r.setActiveName(fileName);
    jsonResponse(res, 200, { ok: true, activeFile: fileName });
  }

  async function handleGetComponentProduction({ params, res }: any) {
    const [comp] = params;
    const r = componentResource(comp);
    const prodFile = r.getProductionName();
    const cfg = readComponentConfig(comp, prodFile);
    jsonResponse(res, 200, {
      fileName: prodFile,
      name: cfg?.name || prodFile,
      aliases: cfg?.aliases || {},
    });
  }

  async function handleSetComponentProduction({ params, req, res }: any) {
    const [comp] = params;
    const body = JSON.parse(await readBody(req));
    const fileName = sanitizeFileName(body.name || 'default');
    const r = componentResource(comp);
    if (r.existingPath(fileName) === null) {
      jsonResponse(res, 404, { error: 'Config not found' });
      return;
    }
    if (themesResource.getActiveName() === 'default') {
      jsonResponse(res, 409, {
        error: 'Active theme is protected. Save As first.',
        code: 'ACTIVE_IS_PROTECTED',
      });
      return;
    }
    r.ensureDir();
    r.setProductionName(fileName);
    syncComponentsToCss();
    patchActiveTheme([{ field: 'component', comp, fileName }]);
    const cfg = readComponentConfig(comp, fileName);
    jsonResponse(res, 200, {
      ok: true,
      fileName,
      name: cfg?.name || fileName,
      aliases: cfg?.aliases || {},
    });
  }

  async function handleComponentConfigByName({ params, req, res }: any) {
    const [comp, name] = params;
    const r = componentResource(comp);
    const configPath = r.filePath(name);

    if (req.method === 'GET') {
      const raw = r.readJson(name);
      if (!raw) {
        jsonResponse(res, 404, { error: 'Not found' });
        return;
      }
      const data = raw as any;
      data._fileName = name;
      jsonResponse(res, 200, data);
      return;
    }

    if (req.method === 'PUT') {
      if (name === 'default') {
        jsonResponse(res, 403, { error: 'Cannot modify default config (regenerated from source)' });
        return;
      }
      const body = JSON.parse(await readBody(req));
      body.component = comp;
      body.name = body.name || name;
      body.updatedAt = new Date().toISOString();
      if (fs.existsSync(configPath)) {
        try {
          const existing = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
          if (existing.createdAt) body.createdAt = existing.createdAt;
        } catch { /* use body value or set below */ }
      }
      if (!body.createdAt) body.createdAt = body.updatedAt;
      r.ensureDir();
      fs.writeFileSync(configPath, JSON.stringify(body, null, 2));
      if (r.getProductionName() === name) {
        syncComponentsToCss();
      }
      jsonResponse(res, 200, { ok: true, fileName: name });
      return;
    }

    if (req.method === 'DELETE') {
      if (name === 'default') {
        jsonResponse(res, 403, { error: 'Cannot delete default config' });
        return;
      }
      if (fs.existsSync(configPath)) {
        fs.unlinkSync(configPath);
        if (r.getActiveName() === name) {
          r.setActiveName('default');
        }
        if (r.getProductionName() === name) {
          r.setProductionName('default');
          syncComponentsToCss();
        }
      }
      jsonResponse(res, 200, { ok: true });
      return;
    }
  }

  async function handleListComponentConfigs({ params, res }: any) {
    const [comp] = params;
    const r = componentResource(comp);
    // Local dir is authoritative for "is this a real component" — it's derived
    // on boot by ensureComponentConfigsDir; the package ships no component JSON.
    if (!fs.existsSync(r.dir)) {
      jsonResponse(res, 404, { error: 'Component not found' });
      return;
    }
    const activeFile = r.getActiveName();
    const productionFile = r.getProductionName();
    const files = r.listNames().map((fileName) => {
      const data = r.readJson(fileName) as any;
      return {
        name: data?.name || fileName,
        fileName,
        updatedAt: data?.updatedAt || '',
        isActive: fileName === activeFile,
        isProduction: fileName === productionFile,
      };
    });
    jsonResponse(res, 200, { component: comp, files, activeFile, productionFile });
  }

  // ── /api/themes ──────────────────────────────────────────────────────────

  async function handleListThemes({ res }: any) {
    const activeFile = themesResource.getActiveName();
    const files = [];
    for (const fileName of themesResource.listNames()) {
      const read = readTheme(fileName);
      if (!read) {
        console.warn(`[live-tokens] Theme "${fileName}" is unreadable and was left out of the list.`);
        continue;
      }
      files.push({
        name: read.theme.name,
        fileName,
        updatedAt: read.theme.updatedAt,
        isActive: fileName === activeFile,
        isProtected: fileName === 'default',
      });
    }
    jsonResponse(res, 200, { files, activeFile });
  }

  async function handleGetActiveTheme({ res }: any) {
    const activeFile = themesResource.getActiveName();
    const read = readTheme(activeFile);
    if (!read) {
      respondUnreadableTheme(res, activeFile, 'Active theme not found');
      return;
    }
    jsonResponse(res, 200, { ...read.theme, _fileName: activeFile });
  }

  async function handleSetActiveTheme({ req, res }: any) {
    const body = JSON.parse(await readBody(req));
    const fileName = sanitizeFileName(body.name || 'default');
    if (themesResource.existingPath(fileName) === null) {
      jsonResponse(res, 404, { error: 'Theme not found' });
      return;
    }
    themesResource.setActiveName(fileName);
    jsonResponse(res, 200, { ok: true, activeFile: fileName });
  }

  async function handleThemeByName({ params, req, res }: any) {
    const [fileName] = params;
    const filePath = themesResource.filePath(fileName);

    if (req.method === 'GET') {
      const read = readTheme(fileName);
      if (!read) {
        respondUnreadableTheme(res, fileName, 'Not found');
        return;
      }
      jsonResponse(res, 200, { ...read.theme, _fileName: fileName });
      return;
    }

    if (req.method === 'PUT') {
      if (fileName === 'default') {
        jsonResponse(res, 403, { error: 'Cannot overwrite the default theme' });
        return;
      }
      const body = JSON.parse(await readBody(req));
      // Normalize the incoming body too, so what lands on disk is encapsulated
      // whatever form the client sent.
      const { theme } = normalizeTheme(body, diskThemeResolvers);
      theme.updatedAt = new Date().toISOString();
      if (fs.existsSync(filePath)) {
        try {
          const existing = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
          if (existing.createdAt) theme.createdAt = existing.createdAt;
        } catch { /* keep the body's value */ }
      }
      writeTheme(fileName, theme);
      jsonResponse(res, 200, { ok: true, fileName });
      return;
    }

    if (req.method === 'DELETE') {
      if (fileName === 'default') {
        jsonResponse(res, 403, { error: 'Cannot delete the default theme' });
        return;
      }
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
        // Deleting the theme you are on is legal: the Default set always
        // sits on disk to fall back to. Deleting a local file that shadows a
        // shipped theme restores the package version, which still resolves,
        // so the pointer keeps naming it — only a name that resolves nowhere
        // heals, mirroring the colors-and-type delete handler.
        if (
          themesResource.existingPath(fileName) === null &&
          themesResource.getActiveName() === fileName
        ) {
          themesResource.setActiveName('default');
        }
      } else if (themesResource.existingPath(fileName)) {
        // No local copy — only the package ships this theme. Without this
        // guard the delete would report ok while the theme stays listed.
        jsonResponse(res, 403, {
          error: 'Cannot delete a theme shipped with the package. Saving it creates a local copy; deleting that copy restores the shipped version.',
          code: 'PACKAGE_THEME',
        });
        return;
      }
      jsonResponse(res, 200, { ok: true });
      return;
    }
  }

  /**
   * Apply a theme: materialise its embedded colors and type and configs into
   * working files under the theme's own slug, flip the colors-and-type +
   * each component's `_active.json` and `_production.json` pointers at them, sync
   * tokens.css/fonts.css, mark the theme active, and return the resolved
   * state in one payload. The client follows with a full page reload. Setting
   * production here (not just active) means the running page picks up the new
   * look without the user having to Adopt colors and type + every component by hand.
   *
   * A theme is a complete look, so components it doesn't carry are reset to
   * their defaults rather than left as they were.
   */
  async function handleApplyTheme({ params, res }: any) {
    const [fileName] = params;
    const read = readTheme(fileName);
    if (!read) {
      respondUnreadableTheme(res, fileName, 'Theme not found');
      return;
    }
    const { theme } = read;
    // The default theme IS the baseline: it applies pure defaults and
    // materialises nothing (`default.json` is derived from source, read-only).
    const isDefault = fileName === 'default';
    if (!isDefault && !theme.colorsAndType) {
      jsonResponse(res, 422, { error: 'This theme carries no colors and type' });
      return;
    }

    const colorsAndTypeName = isDefault ? 'default' : fileName;
    if (!isDefault) {
      colorsAndTypeResource.ensureDir();
      fs.writeFileSync(
        colorsAndTypeResource.filePath(colorsAndTypeName),
        JSON.stringify(theme.colorsAndType, null, 2),
      );
    }

    // Flip colors and type: active drives the editor, production drives the running page
    // (syncTokensToCss/syncFontsToCss write into tokens.css).
    colorsAndTypeResource.setActiveName(colorsAndTypeName);
    colorsAndTypeResource.setProductionName(colorsAndTypeName);
    syncTokensToCss(colorsAndTypeName);
    syncFontsToCss(colorsAndTypeName);
    const colorsAndTypeData = normalizeColorsAndType(colorsAndTypeResource.readJson(colorsAndTypeName) as any);
    colorsAndTypeData._fileName = colorsAndTypeName;

    const knownComponents = listComponentNames();
    const resolvedConfigs: Record<string, any> = {};
    for (const comp of knownComponents) {
      const embedded = isDefault ? undefined : theme.componentConfigs[comp];
      const r = componentResource(comp);
      const configFile = embedded ? fileName : 'default';
      if (embedded) {
        r.ensureDir();
        fs.writeFileSync(
          r.filePath(configFile),
          JSON.stringify({ ...embedded, component: comp }, null, 2),
        );
      }
      r.setActiveName(configFile);
      r.setProductionName(configFile);
      const cfg = readComponentConfig(comp, configFile);
      if (cfg) resolvedConfigs[comp] = { ...cfg, _fileName: configFile };
    }

    // Data for components this install doesn't have is inert, but silence here
    // is what let a removed component sit in the default theme unnoticed.
    const skippedComponents = Object.keys(theme.componentConfigs).filter(
      (comp) => !knownComponents.includes(comp),
    );

    // One sync after all component production pointers are flipped so the
    // tokens.css component-alias block lands in a single write.
    syncComponentsToCss();

    themesResource.setActiveName(fileName);

    jsonResponse(res, 200, {
      ok: true,
      theme: { ...theme, _fileName: fileName },
      colorsAndType: colorsAndTypeData,
      componentConfigs: resolvedConfigs,
      skippedComponents,
    });
  }

  /**
   * Export a theme for sharing: the theme already carries its colors and
   * type and its configs, so the bundle is the envelope plus provenance. Served with a
   * `Content-Disposition` attachment header so browsers save rather than
   * display. `liveTokensVersion` lets the UI warn on compatibility drift in a
   * future iteration.
   */
  async function handleExportTheme({ params, res }: any) {
    const [fileName] = params;
    const read = readTheme(fileName);
    if (!read) {
      respondUnreadableTheme(res, fileName, 'Theme not found');
      return;
    }

    const bundle = {
      kind: 'theme-bundle' as const,
      schemaVersion: THEME_SCHEMA_VERSION,
      liveTokensVersion: PKG_VERSION,
      exportedAt: new Date().toISOString(),
      manifest: read.theme,
    };

    res.statusCode = 200;
    res.setHeader('Content-Type', 'application/json');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="${fileName}.bundle.json"`,
    );
    res.end(JSON.stringify(bundle, null, 2));
  }

  /**
   * Bind `nextAvailableName` (pure, in `./files/nameAllocator`) to a resource's
   * existence predicate: sanitise the base and walk suffixes until one is free.
   * Used by the import handler on name collision. Callers pass a package-aware
   * predicate (`existingPath(n) !== null`) so an imported file named `default`
   * is renamed (`default-2`) rather than written locally, where it would shadow
   * the read-only package default.
   */
  function nextAvailableName(
    exists: (name: string) => boolean,
    baseName: string,
  ): string {
    return allocNextAvailableName(exists, sanitizeFileName(baseName));
  }

  /**
   * Import a `ThemeBundle`: one validated theme file, no materialisation
   * — Apply is what turns embedded data into working files. Returns the final
   * theme filename plus a rename map so the UI can surface a collision
   * rename (`-2` / `-3` suffixes), and whatever the bundle failed to carry.
   * Does not auto-apply — the user clicks Load on the new row.
   *
   * v1 bundles (pointer theme + separately inlined colors and type and configs) still
   * import: their refs resolve inside the bundle, never against local files
   * that happen to share a name. A v1 bundle's top-level `theme` is that
   * inlined colors and type, which is why the envelope key stays `manifest`:
   * one key, both versions, no ambiguity.
   *
   * Kind and version come as a pair (`BUNDLE_KIND_BY_VERSION`): a real v1
   * bundle says `manifest-bundle`, so gating on the current kind alone would
   * reject every file a released install ever exported.
   */
  async function handleImportTheme({ req, res }: any) {
    let bundle: any;
    try {
      bundle = JSON.parse(await readBody(req));
    } catch {
      jsonResponse(res, 400, { error: 'Body is not valid JSON' });
      return;
    }
    if (!bundle || !Object.values(BUNDLE_KIND_BY_VERSION).includes(bundle.kind)) {
      jsonResponse(res, 400, {
        error: 'Not a theme bundle (kind discriminator missing or wrong)',
      });
      return;
    }
    if (bundle.kind !== BUNDLE_KIND_BY_VERSION[bundle.schemaVersion]) {
      jsonResponse(res, 400, {
        error: `Unsupported bundle: kind "${bundle.kind}" with schemaVersion ${bundle.schemaVersion}`,
      });
      return;
    }
    if (!bundle.manifest) {
      jsonResponse(res, 400, { error: 'Bundle missing theme' });
      return;
    }

    const bundleResolvers: ThemeResolvers = {
      readColorsAndType: () => bundle.theme,
      readComponentConfig: (comp, name) => bundle.componentConfigs?.[`${comp}/${name}`],
      normalizeColorsAndType: (colorsAndType) => normalizeColorsAndType(colorsAndType as any),
    };
    const { theme, dropped } = normalizeTheme(bundle.manifest, bundleResolvers);
    // Foreign data door: an embedded copy arrives unreconciled, which is what
    // normalizeColorsAndType's `_imported` palette path exists for.
    if (theme.colorsAndType) theme.colorsAndType = normalizeColorsAndType(theme.colorsAndType as any);
    if (!theme.colorsAndType) {
      jsonResponse(res, 400, { error: 'Bundle carries no theme' });
      return;
    }
    theme.updatedAt = new Date().toISOString();

    const renames: Record<string, string> = {};
    const originalName = sanitizeFileName(theme.name || 'imported');
    const finalName = nextAvailableName(
      (n) => themesResource.existingPath(n) !== null,
      originalName,
    );
    if (finalName !== originalName) {
      renames[`theme:${originalName}`] = finalName;
    }
    writeTheme(finalName, theme);

    jsonResponse(res, 200, {
      ok: true,
      theme: finalName,
      renames,
      dropped,
    });
  }

  // ── /api/production ──────────────────────────────────────────────────────

  /**
   * Adopt the whole look: promote the live state to production in one pass —
   * the colors-and-type layer plus every component whose active config is not what
   * production runs. The per-slice production doors stay for the component
   * editors' own Adopt; this is the root one, and it exists so shipping a look
   * cannot land halfway.
   *
   * Promotes what is SAVED. Editor state that never reached a file is not
   * visible from here; the client flushes the colors and type it holds before
   * it calls, and warns about component edits it cannot flush.
   */
  async function handleAdoptLook({ res }: any) {
    // Reject before any write. The protected Default look cannot record what
    // shipped, so the client forks it and retries.
    if (themesResource.getActiveName() === 'default') {
      jsonResponse(res, 409, {
        error: 'Active theme is protected. Save As first.',
        code: 'ACTIVE_IS_PROTECTED',
      });
      return;
    }

    const colorsAndTypeName = colorsAndTypeResource.getActiveName();
    const colorsAndTypePromoted = colorsAndTypeResource.getProductionName() !== colorsAndTypeName;
    const components = listComponentNames();
    const promotedComponents = components.filter((comp) => {
      const r = componentResource(comp);
      return r.getProductionName() !== r.getActiveName();
    });

    if (!colorsAndTypePromoted && promotedComponents.length === 0) {
      jsonResponse(res, 200, { ok: true, promoted: false, colorsAndType: null, components: [] });
      return;
    }

    if (colorsAndTypePromoted) colorsAndTypeResource.setProductionName(colorsAndTypeName);
    for (const comp of promotedComponents) {
      const r = componentResource(comp);
      r.ensureDir();
      r.setProductionName(r.getActiveName());
    }

    // syncTokensToCss and syncComponentsToCss are the same rebuild, so one call
    // covers every pointer just flipped. fonts.css tracks the production colors
    // and type alone.
    regenerateTokensCss();
    if (colorsAndTypePromoted) syncFontsToCss(colorsAndTypeName);

    // The look records what shipped, and only that: re-embedding a slice that
    // did not move would delete the look's entry for every component sitting
    // on its default, which is data the adopt never touched.
    patchActiveTheme([
      ...(colorsAndTypePromoted ? [{ field: 'colors-and-type' as const, fileName: colorsAndTypeName }] : []),
      ...promotedComponents.map((comp) => ({
        field: 'component' as const,
        comp,
        fileName: componentResource(comp).getActiveName(),
      })),
    ]);

    const colorsAndTypeData = colorsAndTypeResource.readJson(colorsAndTypeName) as any;
    jsonResponse(res, 200, {
      ok: true,
      promoted: true,
      colorsAndType: colorsAndTypePromoted ? { fileName: colorsAndTypeName, name: colorsAndTypeData?.name || colorsAndTypeName } : null,
      components: promotedComponents,
    });
  }

  // ── Method-not-allowed shims ─────────────────────────────────────────────
  // Routes that match the URL pattern but were called with the wrong method
  // need to return 405 instead of falling through to next(). We register a
  // catch-all 405 route per pattern after the real handlers.

  function methodNotAllowed({ res }: any) {
    jsonResponse(res, 405, { error: 'Method not allowed' });
  }

  // Build the route table. ORDER MATTERS:
  //   1. The active/production patterns must precede COMP_BY_NAME_REGEX so
  //      `/api/component-configs/button/active` doesn't match `:comp/:name`
  //      with `name='active'`.
  //   2. COMP_LIST_REGEX (`/api/component-configs/:comp`) must come after the
  //      :comp/:name routes because the latter is more specific.
  const routes: Route[] = [
    // Colors and type — list / active / production are exact strings; they must
    // run before COLORS_AND_TYPE_BY_NAME_REGEX
    { method: 'GET',    pattern: COLORS_AND_TYPE_ROUTE,            handler: handleListColorsAndType },
    { method: 'GET',    pattern: COLORS_AND_TYPE_ACTIVE_ROUTE,     handler: handleGetActiveColorsAndType },
    { method: 'PUT',    pattern: COLORS_AND_TYPE_ACTIVE_ROUTE,     handler: handleSetActiveColorsAndType },
    { method: 'GET',    pattern: COLORS_AND_TYPE_PRODUCTION_ROUTE, handler: handleGetProductionColorsAndType },
    { method: 'PUT',    pattern: COLORS_AND_TYPE_PRODUCTION_ROUTE, handler: handleSetProductionColorsAndType },

    // Component configs — list of components
    { method: 'GET',    pattern: COMPONENT_CONFIGS_ROUTE, handler: handleListComponents },

    // Component configs — :comp/active (must precede :comp/:name)
    { method: 'GET',    pattern: COMP_ACTIVE_REGEX,       handler: handleGetComponentActive },
    { method: 'PUT',    pattern: COMP_ACTIVE_REGEX,       handler: handleSetComponentActive },
    { method: 'POST',   pattern: COMP_ACTIVE_REGEX,       handler: methodNotAllowed },
    { method: 'DELETE', pattern: COMP_ACTIVE_REGEX,       handler: methodNotAllowed },

    // Component configs — :comp/production (must precede :comp/:name)
    { method: 'GET',    pattern: COMP_PRODUCTION_REGEX,   handler: handleGetComponentProduction },
    { method: 'PUT',    pattern: COMP_PRODUCTION_REGEX,   handler: handleSetComponentProduction },
    { method: 'POST',   pattern: COMP_PRODUCTION_REGEX,   handler: methodNotAllowed },
    { method: 'DELETE', pattern: COMP_PRODUCTION_REGEX,   handler: methodNotAllowed },

    // Component configs — :comp/:name (must precede :comp listing)
    { method: 'GET',    pattern: COMP_BY_NAME_REGEX,      handler: handleComponentConfigByName },
    { method: 'PUT',    pattern: COMP_BY_NAME_REGEX,      handler: handleComponentConfigByName },
    { method: 'DELETE', pattern: COMP_BY_NAME_REGEX,      handler: handleComponentConfigByName },
    { method: 'POST',   pattern: COMP_BY_NAME_REGEX,      handler: methodNotAllowed },

    // Component configs — list configs for :comp (broadest, runs last among comp routes)
    { method: 'GET',    pattern: COMP_LIST_REGEX,         handler: handleListComponentConfigs },

    // Colors and type — :name CRUD (broadest colors-and-type route, runs last)
    { method: 'GET',    pattern: COLORS_AND_TYPE_BY_NAME_REGEX, handler: handleColorsAndTypeByName },
    { method: 'PUT',    pattern: COLORS_AND_TYPE_BY_NAME_REGEX, handler: handleColorsAndTypeByName },
    { method: 'DELETE', pattern: COLORS_AND_TYPE_BY_NAME_REGEX, handler: handleColorsAndTypeByName },

    // Themes — list / active are exact strings, must run before regexes
    { method: 'GET',    pattern: THEMES_ROUTE,            handler: handleListThemes },
    { method: 'GET',    pattern: THEMES_ACTIVE_ROUTE,     handler: handleGetActiveTheme },
    { method: 'PUT',    pattern: THEMES_ACTIVE_ROUTE,     handler: handleSetActiveTheme },

    // Themes — exact import route runs before :name regexes
    { method: 'POST',   pattern: THEME_IMPORT_ROUTE,      handler: handleImportTheme },
    { method: 'PUT',    pattern: THEME_IMPORT_ROUTE,      handler: methodNotAllowed },
    { method: 'GET',    pattern: THEME_IMPORT_ROUTE,      handler: methodNotAllowed },
    { method: 'DELETE', pattern: THEME_IMPORT_ROUTE,      handler: methodNotAllowed },

    // Themes — :name/apply (more specific than :name)
    { method: 'PUT',    pattern: THEME_APPLY_REGEX,       handler: handleApplyTheme },
    { method: 'POST',   pattern: THEME_APPLY_REGEX,       handler: methodNotAllowed },
    { method: 'GET',    pattern: THEME_APPLY_REGEX,       handler: methodNotAllowed },
    { method: 'DELETE', pattern: THEME_APPLY_REGEX,       handler: methodNotAllowed },

    // Themes — :name/export (more specific than :name)
    { method: 'GET',    pattern: THEME_EXPORT_REGEX,      handler: handleExportTheme },
    { method: 'PUT',    pattern: THEME_EXPORT_REGEX,      handler: methodNotAllowed },
    { method: 'POST',   pattern: THEME_EXPORT_REGEX,      handler: methodNotAllowed },
    { method: 'DELETE', pattern: THEME_EXPORT_REGEX,      handler: methodNotAllowed },

    // Themes — :name CRUD (broadest theme route, runs last)
    { method: 'GET',    pattern: THEME_BY_NAME_REGEX,     handler: handleThemeByName },
    { method: 'PUT',    pattern: THEME_BY_NAME_REGEX,     handler: handleThemeByName },
    { method: 'DELETE', pattern: THEME_BY_NAME_REGEX,     handler: handleThemeByName },

    // Production — the whole-look adopt door
    { method: 'PUT',    pattern: PRODUCTION_ROUTE,        handler: handleAdoptLook },
    { method: 'GET',    pattern: PRODUCTION_ROUTE,        handler: methodNotAllowed },
    { method: 'POST',   pattern: PRODUCTION_ROUTE,        handler: methodNotAllowed },
    { method: 'DELETE', pattern: PRODUCTION_ROUTE,        handler: methodNotAllowed },
  ];

  return {
    name: 'theme-file-api',
    config() {
      // __PROJECT_ROOT__ powers the overlay's "Page Source" vscode:// links;
      // __APP_VERSION__ feeds the overlay's header version badge;
      // __LIVE_TOKENS_API_BASE__ keeps the client's REST URLs in sync with
      // whatever `apiBase` the plugin was constructed with.
      return {
        define: {
          __PROJECT_ROOT__: JSON.stringify(process.cwd()),
          __APP_VERSION__: JSON.stringify(PKG_VERSION),
          __LIVE_TOKENS_API_BASE__: JSON.stringify(API_BASE),
        },
      };
    },
    configureServer(server) {
      ensureColorsAndTypeDir();
      ensureComponentConfigsDir();
      ensureThemesDir((msg) => server.config.logger.warn(msg));
      // Make sure the editor-owned sidecar exists and reflects current
      // production state before the first request lands. Without this, a
      // fresh checkout would import a stale (or missing) generated file.
      regenerateTokensCss();

      // Opt-in: bring tokens.css up to date with additive migrations first, so
      // the drift warning below only fires for genuinely breaking gaps.
      if (opts.autoMigrate) autoMigrateAdditive((msg) => server.config.logger.info(msg));

      // Surface Layer-1 token drift (consumer tokens.css behind the package's
      // component vocabulary) before the editor loads, so blank slots have an
      // explanation and a one-command fix.
      warnOnTokenDrift((msg) => server.config.logger.warn(msg));

      server.middlewares.use(async (req, res, next) => {
        const handled = await dispatch(req, res, routes);
        if (!handled) next();
      });
    },
    handleHotUpdate(ctx) {
      // When a component source file changes, regenerate its default.json.
      // The editor's componentConfigService picks up the new defaults on its
      // next fetch; a full reload is not required since runtime state owns
      // the override layer.
      const normalized = path.resolve(ctx.file);
      if (!COMPONENTS_SCAN_DIRS.some((d) => normalized.startsWith(d))) return;
      if (!normalized.endsWith('.svelte')) return;
      // Editor companion files and utility components don't declare a
      // `:global(:root)` block; skip them the same way the boot scan does.
      if (!isThemeAwareComponent(normalized)) return;
      const comp = componentNameFromFile(normalized);
      generateDefaultConfig(comp, normalized);
    },
  };
}
