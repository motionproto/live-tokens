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
import {
  versionedFileResourceServer,
  type VersionedFileResourceServer,
} from './files/versionedFileResourceServer';
import { dispatch, type Route } from './files/routeTable';
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

export interface ThemeFileApiOptions {
  tokensCssPath: string;       // required, e.g. 'src/styles/tokens.css'. Developer-authored, never written.
  tokensGeneratedCssPath?: string; // default: '<dataDir>/tokens.generated.css'. Editor-owned content.
  fontsCssPath?: string;       // default: sibling of tokensCssPath named 'fonts.css'
  apiBase?: string;            // default: '/api/live-tokens'. Plain '/path' — regex metacharacters are escaped at use site.
  // Data directories. Per-folder resolution order: explicit option >
  // `live-tokens.config.json` at cwd > `<dataDir>/<sub>` where dataDir comes
  // from opts > config file > package default `src/live-tokens/data`.
  dataDir?: string;            // default: 'src/live-tokens/data'
  themesDir?: string;          // default: `<dataDir>/themes`
  componentConfigsDir?: string; // default: `<dataDir>/component-configs`
  manifestsDir?: string;       // default: `<dataDir>/manifests`
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
    themesDir: opts.themesDir,
    componentConfigsDir: opts.componentConfigsDir,
    manifestsDir: opts.manifestsDir,
  });
  const THEMES_DIR = dataDirs.themesDir;
  const COMPONENT_CONFIGS_DIR = dataDirs.componentConfigsDir;
  const MANIFESTS_DIR = dataDirs.manifestsDir;
  const CSS_PATH = path.resolve(opts.tokensCssPath);
  const GENERATED_CSS_PATH = opts.tokensGeneratedCssPath
    ? path.resolve(opts.tokensGeneratedCssPath)
    : path.join(dataDirs.dataDir, 'tokens.generated.css');
  const FONTS_CSS_PATH = opts.fontsCssPath
    ? path.resolve(opts.fontsCssPath)
    : path.join(path.dirname(CSS_PATH), 'fonts.css');
  // Default keeps live-tokens' REST routes under a single namespace so they
  // can't collide with the consumer's own `/api/themes` or `/api/manifests`.
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
  // library-dev, in a consumer's node_modules, and from dist-plugin/. Only
  // themes/default.json and manifests/default.json actually ship (package.json
  // `files`); the resource server's read-only fallback resolves a consumer's
  // `default` to these when they have no local copy.
  const packageDataDir = path.resolve(
    path.dirname(fileURLToPath(import.meta.url)),
    '..',
    'src',
    'live-tokens',
    'data',
  );
  const packageThemesDir = path.join(packageDataDir, 'themes');
  const packageManifestsDir = path.join(packageDataDir, 'manifests');
  const packageComponentConfigsDir = path.join(packageDataDir, 'component-configs');

  // Union of dirs to scan for component .svelte files. Consumer dirs first so
  // a consumer-authored component shadows a first-party one when names collide.
  const COMPONENTS_SCAN_DIRS: string[] = [...consumerComponentDirs];
  if (
    !COMPONENTS_SCAN_DIRS.includes(packageComponentsDir) &&
    fs.existsSync(packageComponentsDir)
  ) {
    COMPONENTS_SCAN_DIRS.push(packageComponentsDir);
  }

  // Themes resource — list/load/save/delete + active/production. The package
  // fallback ships the real default theme so a consumer always has one to load
  // / restore to, and picks up an upgraded default on `npm upgrade`.
  const themesResource = versionedFileResourceServer({
    dir: THEMES_DIR,
    packageDir: packageThemesDir,
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
      // for construction symmetry with themes/manifests, and existingPath /
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

  // Manifests resource — files that pin one theme + one config per component.
  // The active manifest is the single live snapshot; theme/component Adopts
  // patch its refs (see `patchActiveManifest`). `_production.json` is unused
  // for this resource — the new model has no separate Production slot.
  const manifestsResource = versionedFileResourceServer({
    dir: MANIFESTS_DIR,
    packageDir: packageManifestsDir,
  });

  function ensureThemesDir() {
    // No local default.json is written: `default` resolves to the shipped
    // package theme via the resource server's read-only fallback. Writing an
    // empty local default here would shadow it. A missing package default fails
    // loudly downstream (caught by npm pack verification), not papered over.
    themesResource.ensureDir();
    themesResource.ensureMeta();
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
   * Single-door theme normaliser. Runs the per-slice reconciler (palettes
   * today; fonts/shadows/gradients later phases), then strips every variable
   * the typed slices now own from the catch-all `cssVariables` bag.
   *
   * The reconciler is gated by `_imported` per palette — editor-authored
   * themes are no-ops, importers opt in. Strip runs unconditionally because
   * the renderer already overlays typed-slice derivations on top of
   * cssVariables; stripped values were dead data.
   *
   * Call from every theme-read door. See temp/manifest-robustness-plan.md §10.
   */
  function normalizeTheme<T extends { cssVariables?: Record<string, string>; editorConfigs?: any } | null | undefined>(
    theme: T,
  ): T {
    if (!theme || typeof theme !== 'object') return theme;
    const palettes = theme.editorConfigs ?? {};
    const cssVars = theme.cssVariables ?? {};
    const { palettes: nextPalettes, consumed } = reconcilePalettesFromCssVars(palettes, cssVars);
    const nextCssVars: Record<string, string> = {};
    for (const [k, v] of Object.entries(cssVars)) {
      if (!consumed.has(k)) nextCssVars[k] = v;
    }
    return { ...theme, editorConfigs: nextPalettes, cssVariables: nextCssVars };
  }

  const SYSTEM_CASCADES_SSR: Record<string, string> = {
    'system-ui-sans':
      'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
    'system-ui-serif': 'Georgia, "Times New Roman", serif',
    'system-ui-mono': 'ui-monospace, "SF Mono", Menlo, Consolas, monospace',
  };

  function resolveFontStacks(themeData: any): Record<string, string> {
    const stacks = themeData.fontStacks as Array<{ variable: string; slots: any[] }> | undefined;
    const sources = themeData.fontSources as Array<{ id: string; families: Array<{ id: string; cssName: string }> }> | undefined;
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
   * production theme and every component's `_production.json`. The
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
    lines.push('/* Generated by themeFileApi from the production theme and component configs. Do not edit. */');
    lines.push('/* tokens.css holds developer-authored defaults; this file holds editor overrides. */');
    lines.push('');

    // Section 1: production-theme overrides (palette ramps, font stacks, custom vars).
    const productionThemeName = themesResource.getProductionName();
    const themeData = themesResource.readJson(productionThemeName) as any;
    let themeVarCount = 0;
    if (themeData) {
      const cssVars: Record<string, string> = { ...(themeData.cssVariables || {}) };
      Object.assign(cssVars, palettesToVars(themeData.editorConfigs ?? {}));
      const resolvedFontVars = resolveFontStacks(themeData);
      for (const [name, value] of Object.entries(resolvedFontVars)) {
        cssVars[name] = value;
      }
      themeVarCount = Object.keys(cssVars).length;
      if (themeVarCount > 0) {
        lines.push(`/* Production theme: ${productionThemeName} */`);
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
      `[regenerateTokensCss] Wrote ${path.basename(GENERATED_CSS_PATH)} (${themeVarCount} theme vars, ${componentOverrideCount} component overrides)`,
    );
  }

  /** Back-compat wrapper. The argument is ignored; the generated file is
   * always rebuilt from the current production theme. Existing call sites
   * pass a fileName for historical reasons (they all set the production
   * pointer first, then call this). */
  function syncTokensToCss(_fileName: string): void {
    regenerateTokensCss();
  }

  /**
   * Regenerate fonts.css from a theme's fontSources. Called alongside
   * syncTokensToCss so the production build's static font-loading layer
   * matches the registry the editor last promoted.
   */
  function syncFontsToCss(fileName: string): void {
    const themeData = themesResource.readJson(fileName) as any;
    if (!themeData) return;
    const sources = themeData.fontSources as Array<{
      id: string;
      kind: string;
      url?: string;
      cssText?: string;
      label?: string;
      families: Array<{ name: string }>;
    }> | undefined;
    if (!sources) return;

    const lines: string[] = [];
    lines.push('/* Generated from the production theme by syncFontsToCss. Do not edit. */');
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

  // ── Manifests helpers ─────────────────────────────────────────────────────

  function ensureManifestsDir(): void {
    manifestsResource.ensureDir();
    // No synthetic local default.json is written: `default` resolves to the
    // shipped package manifest via the read-only fallback. A local copy would
    // shadow it and freeze a consumer's "restore to" baseline at create time.

    // Ensure `_active.json` exists; the manifest model has no Production slot,
    // so `_production.json` is never written for this resource.
    if (!fs.existsSync(manifestsResource.activePath)) {
      fs.writeFileSync(
        manifestsResource.activePath,
        JSON.stringify({ activeFile: 'default' }),
      );
    } else {
      // Normalize: if the pointer references a name that resolves neither
      // locally nor in the package, fall back to default.
      const activeName = manifestsResource.getActiveName();
      if (manifestsResource.existingPath(activeName) === null) {
        manifestsResource.setActiveName('default');
      }
    }
  }

  /**
   * Patch the currently-active manifest in response to a theme or component
   * Adopt: rewrites the matching ref (`theme` or `componentConfigs[comp]`).
   * Returns `false` if the active manifest is `default` (protected) so the
   * caller can fail the Adopt with 409 ACTIVE_IS_PROTECTED.
   */
  function patchActiveManifest(
    field: 'theme' | 'component',
    comp: string | null,
    fileName: string,
  ): boolean {
    const activeFile = manifestsResource.getActiveName();
    if (activeFile === 'default') return false;
    const manifestPath = manifestsResource.filePath(activeFile);
    if (!fs.existsSync(manifestPath)) return false;
    let manifest: any;
    try {
      manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf-8'));
    } catch {
      return false;
    }
    if (field === 'theme') {
      manifest.theme = fileName;
    } else if (field === 'component' && comp) {
      manifest.componentConfigs = manifest.componentConfigs ?? {};
      manifest.componentConfigs[comp] = fileName;
    }
    manifest.updatedAt = new Date().toISOString();
    fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));
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
  const THEMES_ROUTE = `${API_BASE}/themes`;
  const THEMES_ACTIVE_ROUTE = `${API_BASE}/themes/active`;
  const THEMES_PRODUCTION_ROUTE = `${API_BASE}/themes/production`;
  const COMPONENT_CONFIGS_ROUTE = `${API_BASE}/component-configs`;
  const MANIFESTS_ROUTE = `${API_BASE}/manifests`;
  const MANIFESTS_ACTIVE_ROUTE = `${API_BASE}/manifests/active`;
  const THEME_BY_NAME_REGEX = new RegExp(`^${escapedBase}/themes/([a-z0-9\\-_]+)$`);
  const COMP_LIST_REGEX = new RegExp(`^${escapedBase}/component-configs/([a-z0-9\\-_]+)$`);
  const COMP_ACTIVE_REGEX = new RegExp(`^${escapedBase}/component-configs/([a-z0-9\\-_]+)/active$`);
  const COMP_PRODUCTION_REGEX = new RegExp(`^${escapedBase}/component-configs/([a-z0-9\\-_]+)/production$`);
  const COMP_BY_NAME_REGEX = new RegExp(`^${escapedBase}/component-configs/([a-z0-9\\-_]+)/([a-z0-9\\-_]+)$`);
  const MANIFEST_APPLY_REGEX = new RegExp(`^${escapedBase}/manifests/([a-z0-9\\-_]+)/apply$`);
  const MANIFEST_EXPORT_REGEX = new RegExp(`^${escapedBase}/manifests/([a-z0-9\\-_]+)/export$`);
  const MANIFEST_IMPORT_ROUTE = `${API_BASE}/manifests/import`;
  const MANIFEST_BY_NAME_REGEX = new RegExp(`^${escapedBase}/manifests/([a-z0-9\\-_]+)$`);

  // ── Route handlers ────────────────────────────────────────────────────────
  // Each handler can throw — the route-table dispatcher centralises the 500
  // catch. Order in the routes table matters: the active/production patterns
  // MUST appear before the catch-all `:name` patterns (the table replaces
  // the previous "warning comment" with explicit ordering).

  // ── /api/themes ──────────────────────────────────────────────────────────

  async function handleListThemes(_ctx: any) {
    const activeFile = themesResource.getActiveName();
    const files = themesResource.listNames().map((fileName) => {
      const data = themesResource.readJson(fileName) as any;
      return {
        name: data?.name || fileName,
        fileName,
        updatedAt: data?.updatedAt || '',
        isActive: fileName === activeFile,
      };
    });
    jsonResponse(_ctx.res, 200, { files });
  }

  async function handleGetActiveTheme({ res }: any) {
    const activeFile = themesResource.getActiveName();
    const raw = themesResource.readJson(activeFile);
    if (!raw) {
      jsonResponse(res, 404, { error: 'Active theme not found' });
      return;
    }
    const data = normalizeTheme(raw as any);
    data._fileName = activeFile;
    jsonResponse(res, 200, data);
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

  async function handleGetProductionTheme({ res }: any) {
    const prodFile = themesResource.getProductionName();
    const raw = themesResource.readJson(prodFile);
    if (!raw) {
      jsonResponse(res, 200, { fileName: prodFile, name: prodFile, cssVariables: {} });
      return;
    }
    const data = normalizeTheme(raw as any);
    jsonResponse(res, 200, {
      fileName: prodFile,
      name: data.name || prodFile,
      updatedAt: data.updatedAt || '',
      cssVariables: data.cssVariables || {},
    });
  }

  async function handleSetProductionTheme({ req, res }: any) {
    const body = JSON.parse(await readBody(req));
    const fileName = sanitizeFileName(body.name || 'default');
    if (themesResource.existingPath(fileName) === null) {
      jsonResponse(res, 404, { error: 'Theme not found' });
      return;
    }
    // Reject before any destructive write if the active manifest is the
    // protected default — the client recovers by prompting Save As.
    if (manifestsResource.getActiveName() === 'default') {
      jsonResponse(res, 409, {
        error: 'Active manifest is protected. Save As first.',
        code: 'ACTIVE_IS_PROTECTED',
      });
      return;
    }
    themesResource.setProductionName(fileName);
    syncTokensToCss(fileName);
    syncFontsToCss(fileName);
    syncComponentsToCss();
    patchActiveManifest('theme', null, fileName);
    const data = themesResource.readJson(fileName) as any;
    jsonResponse(res, 200, {
      ok: true,
      fileName,
      name: data?.name || fileName,
      updatedAt: data?.updatedAt || '',
    });
  }

  async function handleThemeByName({ params, req, res }: any) {
    const [fileName] = params;
    const filePath = themesResource.filePath(fileName);

    if (req.method === 'GET') {
      const raw = themesResource.readJson(fileName);
      if (!raw) {
        jsonResponse(res, 404, { error: 'Not found' });
        return;
      }
      const data = normalizeTheme(raw as any);
      data._fileName = fileName;
      jsonResponse(res, 200, data);
      return;
    }

    if (req.method === 'PUT') {
      // `default` is live from the package and immutable, symmetric with
      // component-config and manifest PUT. Without this guard a client could
      // write themes/default.json locally and fork the default the
      // live-from-package model treats as read-only. The editor's save flow
      // already redirects a Save on the active default into Save As, so no
      // legitimate client PUTs this path.
      if (fileName === 'default') {
        jsonResponse(res, 403, { error: 'Cannot overwrite the default theme (live from package)' });
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
      // Keep tokens.css and fonts.css in sync when the production theme is saved
      if (fileName === themesResource.getProductionName()) {
        syncTokensToCss(fileName);
        syncFontsToCss(fileName);
        syncComponentsToCss();
      }
      jsonResponse(res, 200, { ok: true, fileName });
      return;
    }

    if (req.method === 'DELETE') {
      if (fileName === 'default') {
        jsonResponse(res, 403, { error: 'Cannot delete the default theme' });
        return;
      }
      // Reject deletion of the live production theme — removing it would
      // leave _production.json pointing at a missing file and break the
      // running site. The user must Adopt a different theme first.
      if (themesResource.getProductionName() === fileName) {
        jsonResponse(res, 403, {
          error: 'Cannot delete the production theme. Adopt a different theme first.',
          code: 'PRODUCTION_THEME',
        });
        return;
      }
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
        // If this was the active theme, revert to default
        if (themesResource.getActiveName() === fileName) {
          themesResource.setActiveName('default');
        }
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
    if (manifestsResource.getActiveName() === 'default') {
      jsonResponse(res, 409, {
        error: 'Active manifest is protected. Save As first.',
        code: 'ACTIVE_IS_PROTECTED',
      });
      return;
    }
    r.ensureDir();
    r.setProductionName(fileName);
    syncComponentsToCss();
    patchActiveManifest('component', comp, fileName);
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

  // ── /api/manifests ───────────────────────────────────────────────────────

  async function handleListManifests({ res }: any) {
    const activeFile = manifestsResource.getActiveName();
    const files = manifestsResource.listNames().map((fileName) => {
      const data = manifestsResource.readJson(fileName) as any;
      return {
        name: data?.name || fileName,
        fileName,
        updatedAt: data?.updatedAt || '',
        isActive: fileName === activeFile,
        isProtected: fileName === 'default',
      };
    });
    jsonResponse(res, 200, { files, activeFile });
  }

  async function handleGetActiveManifest({ res }: any) {
    const activeFile = manifestsResource.getActiveName();
    const raw = manifestsResource.readJson(activeFile);
    if (!raw) {
      jsonResponse(res, 404, { error: 'Active manifest not found' });
      return;
    }
    const data = raw as any;
    data._fileName = activeFile;
    jsonResponse(res, 200, data);
  }

  async function handleSetActiveManifest({ req, res }: any) {
    const body = JSON.parse(await readBody(req));
    const fileName = sanitizeFileName(body.name || 'default');
    if (manifestsResource.existingPath(fileName) === null) {
      jsonResponse(res, 404, { error: 'Manifest not found' });
      return;
    }
    manifestsResource.setActiveName(fileName);
    jsonResponse(res, 200, { ok: true, activeFile: fileName });
  }

  async function handleManifestByName({ params, req, res }: any) {
    const [fileName] = params;
    const filePath = manifestsResource.filePath(fileName);

    if (req.method === 'GET') {
      const raw = manifestsResource.readJson(fileName);
      if (!raw) {
        jsonResponse(res, 404, { error: 'Not found' });
        return;
      }
      const data = raw as any;
      data._fileName = fileName;
      jsonResponse(res, 200, data);
      return;
    }

    if (req.method === 'PUT') {
      if (fileName === 'default') {
        jsonResponse(res, 403, { error: 'Cannot overwrite the default manifest' });
        return;
      }
      const body = JSON.parse(await readBody(req));
      body.updatedAt = new Date().toISOString();
      if (fs.existsSync(filePath)) {
        try {
          const existing = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
          if (existing.createdAt) body.createdAt = existing.createdAt;
        } catch { /* use body value or set below */ }
      }
      if (!body.createdAt) body.createdAt = body.updatedAt;
      fs.writeFileSync(filePath, JSON.stringify(body, null, 2));
      jsonResponse(res, 200, { ok: true, fileName });
      return;
    }

    if (req.method === 'DELETE') {
      if (fileName === 'default') {
        jsonResponse(res, 403, { error: 'Cannot delete the default manifest' });
        return;
      }
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
        if (manifestsResource.getActiveName() === fileName) {
          manifestsResource.setActiveName('default');
        }
      }
      jsonResponse(res, 200, { ok: true });
      return;
    }
  }

  /**
   * Atomically apply a manifest: validate every referenced file exists, flip
   * the theme + each component's `_active.json` and `_production.json`
   * pointers, sync tokens.css/fonts.css from the new theme, mark the manifest
   * itself active, and return the resolved theme + component configs in one
   * payload. The client follows with a full page reload. Setting production
   * here (not just active) means the running page picks up the new theme
   * without the user having to Adopt theme + every component by hand.
   */
  async function handleApplyManifest({ params, res }: any) {
    const [fileName] = params;
    const manifest = manifestsResource.readJson(fileName) as any;
    if (!manifest) {
      jsonResponse(res, 404, { error: 'Manifest not found' });
      return;
    }

    const themeName = sanitizeFileName(manifest.theme || 'default');
    if (themesResource.existingPath(themeName) === null) {
      jsonResponse(res, 422, { error: `Manifest references missing theme: ${themeName}` });
      return;
    }

    // Validate every referenced component config exists. Components in the
    // manifest that don't exist as components get skipped (component was
    // removed since the manifest was saved); missing config files for an
    // existing component are a hard error.
    const knownComponents = new Set(listComponentNames());
    const componentConfigs = manifest.componentConfigs ?? {};
    const resolvedConfigs: Record<string, any> = {};
    const apply: Array<[string, string]> = [];
    for (const [comp, configFile] of Object.entries(componentConfigs)) {
      if (!knownComponents.has(comp)) continue;
      const sanitized = sanitizeFileName(String(configFile) || 'default');
      const r = componentResource(comp);
      if (r.existingPath(sanitized) === null) {
        jsonResponse(res, 422, {
          error: `Manifest references missing config: ${comp}/${sanitized}`,
        });
        return;
      }
      apply.push([comp, sanitized]);
    }

    // Flip theme: active drives the editor, production drives the running page
    // (syncTokensToCss/syncFontsToCss write into tokens.css). Without setting
    // production here the user would have to re-Adopt the theme by hand.
    themesResource.setActiveName(themeName);
    themesResource.setProductionName(themeName);
    syncTokensToCss(themeName);
    syncFontsToCss(themeName);
    const themeData = normalizeTheme(themesResource.readJson(themeName) as any);
    themeData._fileName = themeName;

    for (const [comp, configFile] of apply) {
      const r = componentResource(comp);
      r.setActiveName(configFile);
      r.setProductionName(configFile);
      const cfg = readComponentConfig(comp, configFile);
      if (cfg) resolvedConfigs[comp] = { ...cfg, _fileName: configFile };
    }

    // Components on disk but not mentioned in the manifest: leave their
    // active and production pointers alone. The manifest has no opinion.
    for (const comp of knownComponents) {
      if (resolvedConfigs[comp]) continue;
      const activeName = componentResource(comp).getActiveName();
      const cfg = readComponentConfig(comp, activeName);
      if (cfg) resolvedConfigs[comp] = { ...cfg, _fileName: activeName };
    }

    // One sync after all component production pointers are flipped so the
    // tokens.css component-alias block lands in a single write.
    syncComponentsToCss();

    manifestsResource.setActiveName(fileName);

    jsonResponse(res, 200, {
      ok: true,
      manifest: { ...manifest, _fileName: fileName },
      theme: themeData,
      componentConfigs: resolvedConfigs,
    });
  }

  /**
   * Export a manifest as a self-contained `ManifestBundle` for sharing.
   * Reads the manifest, inlines the referenced theme and every non-default
   * component config, returns the bundle as JSON with a `Content-Disposition`
   * attachment header so browsers save rather than display.
   *
   * Defaults are NOT inlined — the receiver's local default.json is the
   * live-tokens package's canonical default. `liveTokensVersion` lets the
   * UI warn on compatibility drift in a future iteration.
   * See temp/manifest-robustness-plan.md §11.
   */
  async function handleExportManifest({ params, res }: any) {
    const [fileName] = params;
    const manifest = manifestsResource.readJson(fileName) as any;
    if (!manifest) {
      jsonResponse(res, 404, { error: 'Manifest not found' });
      return;
    }
    const themeName = sanitizeFileName(manifest.theme || 'default');
    const theme = themesResource.readJson(themeName);
    if (!theme) {
      jsonResponse(res, 422, { error: `Manifest references missing theme: ${themeName}` });
      return;
    }

    const knownComponents = new Set(listComponentNames());
    const componentConfigs: Record<string, any> = {};
    for (const [comp, configFile] of Object.entries(manifest.componentConfigs ?? {})) {
      if (!knownComponents.has(comp)) continue;
      const sanitized = sanitizeFileName(String(configFile) || 'default');
      if (sanitized === 'default') continue; // receiver uses their own default
      const cfg = componentResource(comp).readJson(sanitized);
      if (!cfg) {
        jsonResponse(res, 422, {
          error: `Manifest references missing config: ${comp}/${sanitized}`,
        });
        return;
      }
      componentConfigs[`${comp}/${sanitized}`] = cfg;
    }

    const bundle = {
      kind: 'manifest-bundle' as const,
      schemaVersion: 1 as const,
      liveTokensVersion: PKG_VERSION,
      exportedAt: new Date().toISOString(),
      manifest,
      theme,
      componentConfigs,
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
   * Import a `ManifestBundle`: materialise the inlined theme + component
   * configs to disk under fresh (collision-renamed) names, rewrite the
   * manifest's pointers to match, and write the resulting manifest. Returns
   * the final manifest filename plus a rename map so the UI can surface
   * what got renamed. Does not auto-apply — user clicks Load on the new row.
   *
   * Collision policy: rename with `-2` / `-3` suffixes (see
   * temp/manifest-robustness-plan.md §11 for rationale).
   */
  async function handleImportManifest({ req, res }: any) {
    let bundle: any;
    try {
      bundle = JSON.parse(await readBody(req));
    } catch {
      jsonResponse(res, 400, { error: 'Body is not valid JSON' });
      return;
    }
    if (!bundle || bundle.kind !== 'manifest-bundle') {
      jsonResponse(res, 400, {
        error: 'Not a manifest bundle (kind discriminator missing or wrong)',
      });
      return;
    }
    if (bundle.schemaVersion !== 1) {
      jsonResponse(res, 400, {
        error: `Unsupported bundle schemaVersion: ${bundle.schemaVersion}`,
      });
      return;
    }
    if (!bundle.manifest || !bundle.theme || !bundle.componentConfigs) {
      jsonResponse(res, 400, { error: 'Bundle missing manifest / theme / componentConfigs' });
      return;
    }

    const renames: Record<string, string> = {};
    const now = new Date().toISOString();

    // Theme: write under a fresh name if the requested one is taken.
    const originalThemeName = sanitizeFileName(bundle.manifest.theme || 'default');
    const finalThemeName = nextAvailableName(
      (n) => themesResource.existingPath(n) !== null,
      originalThemeName,
    );
    if (finalThemeName !== originalThemeName) {
      renames[`theme:${originalThemeName}`] = finalThemeName;
    }
    const themeBody = { ...bundle.theme };
    themeBody.updatedAt = now;
    if (!themeBody.createdAt) themeBody.createdAt = now;
    themesResource.ensureDir();
    fs.writeFileSync(themesResource.filePath(finalThemeName), JSON.stringify(themeBody, null, 2));

    // Component configs: each `${comp}/${name}` entry. Skip unknown
    // components silently — the bundle may reference one the receiver doesn't
    // ship (different live-tokens version).
    const knownComponents = new Set(listComponentNames());
    const componentRenames: Record<string, string> = {}; // `${comp}/${originalName}` → finalName
    for (const [key, cfgValue] of Object.entries(bundle.componentConfigs)) {
      const [comp, originalName] = key.split('/');
      if (!comp || !originalName) continue;
      if (!knownComponents.has(comp)) continue;
      const r = componentResource(comp);
      const finalName = nextAvailableName(
        (n) => r.existingPath(n) !== null,
        originalName,
      );
      if (finalName !== originalName) {
        renames[`componentConfig:${comp}/${originalName}`] = finalName;
      }
      componentRenames[`${comp}/${originalName}`] = finalName;
      const cfgBody: any = { ...(cfgValue as any) };
      cfgBody.component = comp;
      cfgBody.name = finalName;
      cfgBody.updatedAt = now;
      if (!cfgBody.createdAt) cfgBody.createdAt = now;
      r.ensureDir();
      fs.writeFileSync(r.filePath(finalName), JSON.stringify(cfgBody, null, 2));
    }

    // Rewrite the manifest's pointers through the rename maps and write the
    // manifest under its own fresh name.
    const rewrittenManifest: Record<string, any> = {
      ...bundle.manifest,
      theme: finalThemeName,
      componentConfigs: {} as Record<string, string>,
    };
    for (const [comp, configName] of Object.entries(bundle.manifest.componentConfigs ?? {})) {
      const original = String(configName);
      if (original === 'default') {
        rewrittenManifest.componentConfigs[comp] = 'default';
        continue;
      }
      const finalName = componentRenames[`${comp}/${original}`] ?? original;
      rewrittenManifest.componentConfigs[comp] = finalName;
    }
    rewrittenManifest.updatedAt = now;
    if (!rewrittenManifest.createdAt) rewrittenManifest.createdAt = now;

    const originalManifestName = sanitizeFileName(bundle.manifest.name || 'imported');
    const finalManifestName = nextAvailableName(
      (n) => manifestsResource.existingPath(n) !== null,
      originalManifestName,
    );
    if (finalManifestName !== originalManifestName) {
      renames[`manifest:${originalManifestName}`] = finalManifestName;
    }
    manifestsResource.ensureDir();
    fs.writeFileSync(
      manifestsResource.filePath(finalManifestName),
      JSON.stringify(rewrittenManifest, null, 2),
    );

    jsonResponse(res, 200, {
      ok: true,
      manifest: finalManifestName,
      renames,
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
    // Themes — list / active / production are exact strings, must run before THEME_BY_NAME_REGEX
    { method: 'GET',    pattern: THEMES_ROUTE,            handler: handleListThemes },
    { method: 'GET',    pattern: THEMES_ACTIVE_ROUTE,     handler: handleGetActiveTheme },
    { method: 'PUT',    pattern: THEMES_ACTIVE_ROUTE,     handler: handleSetActiveTheme },
    { method: 'GET',    pattern: THEMES_PRODUCTION_ROUTE, handler: handleGetProductionTheme },
    { method: 'PUT',    pattern: THEMES_PRODUCTION_ROUTE, handler: handleSetProductionTheme },

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

    // Themes — :name CRUD (broadest theme route, runs last)
    { method: 'GET',    pattern: THEME_BY_NAME_REGEX,     handler: handleThemeByName },
    { method: 'PUT',    pattern: THEME_BY_NAME_REGEX,     handler: handleThemeByName },
    { method: 'DELETE', pattern: THEME_BY_NAME_REGEX,     handler: handleThemeByName },

    // Manifests — list / active are exact strings, must run before regexes
    { method: 'GET',    pattern: MANIFESTS_ROUTE,         handler: handleListManifests },
    { method: 'GET',    pattern: MANIFESTS_ACTIVE_ROUTE,  handler: handleGetActiveManifest },
    { method: 'PUT',    pattern: MANIFESTS_ACTIVE_ROUTE,  handler: handleSetActiveManifest },

    // Manifests — exact import route runs before :name regexes
    { method: 'POST',   pattern: MANIFEST_IMPORT_ROUTE,   handler: handleImportManifest },
    { method: 'PUT',    pattern: MANIFEST_IMPORT_ROUTE,   handler: methodNotAllowed },
    { method: 'GET',    pattern: MANIFEST_IMPORT_ROUTE,   handler: methodNotAllowed },
    { method: 'DELETE', pattern: MANIFEST_IMPORT_ROUTE,   handler: methodNotAllowed },

    // Manifests — :name/apply (more specific than :name)
    { method: 'PUT',    pattern: MANIFEST_APPLY_REGEX,    handler: handleApplyManifest },
    { method: 'POST',   pattern: MANIFEST_APPLY_REGEX,    handler: methodNotAllowed },
    { method: 'GET',    pattern: MANIFEST_APPLY_REGEX,    handler: methodNotAllowed },
    { method: 'DELETE', pattern: MANIFEST_APPLY_REGEX,    handler: methodNotAllowed },

    // Manifests — :name/export (more specific than :name)
    { method: 'GET',    pattern: MANIFEST_EXPORT_REGEX,   handler: handleExportManifest },
    { method: 'PUT',    pattern: MANIFEST_EXPORT_REGEX,   handler: methodNotAllowed },
    { method: 'POST',   pattern: MANIFEST_EXPORT_REGEX,   handler: methodNotAllowed },
    { method: 'DELETE', pattern: MANIFEST_EXPORT_REGEX,   handler: methodNotAllowed },

    // Manifests — :name CRUD (broadest manifest route, runs last)
    { method: 'GET',    pattern: MANIFEST_BY_NAME_REGEX,  handler: handleManifestByName },
    { method: 'PUT',    pattern: MANIFEST_BY_NAME_REGEX,  handler: handleManifestByName },
    { method: 'DELETE', pattern: MANIFEST_BY_NAME_REGEX,  handler: handleManifestByName },
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
      ensureThemesDir();
      ensureComponentConfigsDir();
      ensureManifestsDir();
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
