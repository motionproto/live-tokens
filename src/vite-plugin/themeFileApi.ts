import type { Plugin } from 'vite';
import fs from 'fs';
import path from 'path';
import { extractGlobalRootBody } from '../lib/parsers/globalRootBlock';
import { sanitizeFileName } from '../lib/files/versionedFileResource';
import {
  versionedFileResourceServer,
  type VersionedFileResourceServer,
} from './files/versionedFileResource';
import { dispatch, type Route } from './files/routeTable';

export interface ThemeFileApiOptions {
  themesDir: string;           // required, e.g. 'themes' (relative to cwd, resolved with path.resolve)
  tokensCssPath: string;       // required, e.g. 'src/styles/tokens.css'
  fontsCssPath?: string;       // default: sibling of tokensCssPath named 'fonts.css'
  apiBase?: string;            // default: '/api'. Must be a simple '/path' without regex metacharacters.
  componentConfigsDir?: string; // default: 'component-configs'
  componentsSrcDir?: string;   // default: 'src/components'
  presetsDir?: string;         // default: 'presets'
}

export function themeFileApi(opts: ThemeFileApiOptions): Plugin {
  const THEMES_DIR = path.resolve(opts.themesDir);
  const CSS_PATH = path.resolve(opts.tokensCssPath);
  const FONTS_CSS_PATH = opts.fontsCssPath
    ? path.resolve(opts.fontsCssPath)
    : path.join(path.dirname(CSS_PATH), 'fonts.css');
  const API_BASE = opts.apiBase ?? '/api';
  const COMPONENT_CONFIGS_DIR = opts.componentConfigsDir
    ? path.resolve(opts.componentConfigsDir)
    : path.resolve('component-configs');
  const COMPONENTS_SRC_DIR = opts.componentsSrcDir
    ? path.resolve(opts.componentsSrcDir)
    : path.resolve('src/components');
  const PRESETS_DIR = opts.presetsDir
    ? path.resolve(opts.presetsDir)
    : path.resolve('presets');

  // Themes resource — list/load/save/delete + active/production.
  const themesResource = versionedFileResourceServer({
    dir: THEMES_DIR,
  });

  // Per-component resources are constructed on demand because the set of
  // components is discovered at runtime from `src/components/*.svelte`.
  const componentResourceCache = new Map<string, VersionedFileResourceServer>();
  function componentResource(comp: string): VersionedFileResourceServer {
    let r = componentResourceCache.get(comp);
    if (!r) {
      r = versionedFileResourceServer({ dir: path.join(COMPONENT_CONFIGS_DIR, comp) });
      componentResourceCache.set(comp, r);
    }
    return r;
  }

  // Presets resource — manifest files that pin one theme + one config per
  // component. No production pointer in V1; presets are dev-time conveniences.
  const presetsResource = versionedFileResourceServer({ dir: PRESETS_DIR });

  function ensureThemesDir() {
    themesResource.ensureDir();
    if (!fs.existsSync(path.join(THEMES_DIR, 'default.json'))) {
      const defaultTheme = {
        name: 'Default Theme',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        editorConfigs: {},
        cssVariables: {},
      };
      fs.writeFileSync(path.join(THEMES_DIR, 'default.json'), JSON.stringify(defaultTheme, null, 2));
    }
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
   * Write a theme's CSS variables (plus resolved font stack values)
   * into tokens.css. Called when the production theme is set or when the
   * current production theme is saved, so tokens.css is always
   * production-ready and the build can bundle it as-is.
   */
  function syncTokensToCss(fileName: string): void {
    const themePath = path.join(THEMES_DIR, `${fileName}.json`);
    if (!fs.existsSync(themePath)) return;

    const themeData = JSON.parse(fs.readFileSync(themePath, 'utf-8'));
    const cssVars: Record<string, string> = { ...(themeData.cssVariables || {}) };
    const resolvedFontVars = resolveFontStacks(themeData);
    for (const [name, value] of Object.entries(resolvedFontVars)) {
      cssVars[name] = value;
    }
    if (Object.keys(cssVars).length === 0) return;

    const cssContent = fs.readFileSync(CSS_PATH, 'utf-8');
    const remaining = new Set(Object.keys(cssVars));

    const updatedContent = cssContent.replace(
      /^(\s*)(--[\w-]+):\s*(.+);/gm,
      (_match, indent, varName, oldValue) => {
        if (cssVars[varName] !== undefined) {
          remaining.delete(varName);
          return `${indent}${varName}: ${cssVars[varName]};`;
        }
        return `${indent}${varName}: ${oldValue.trim()};`;
      }
    );

    let finalContent = updatedContent;
    if (remaining.size > 0) {
      const newVars = [...remaining]
        .map((name) => `  ${name}: ${cssVars[name]};`)
        .join('\n');
      finalContent = finalContent.replace(
        /\n\}(\s*)$/,
        `\n\n  /* Token additions */\n${newVars}\n}$1`
      );
    }

    fs.writeFileSync(CSS_PATH, finalContent);
    console.log(`[syncTokensToCss] Wrote ${Object.keys(cssVars).length} variables from "${fileName}" into tokens.css`);
  }

  /**
   * Regenerate fonts.css from a theme's fontSources. Called alongside
   * syncTokensToCss so the production build's static font-loading layer
   * matches the registry the editor last promoted.
   */
  function syncFontsToCss(fileName: string): void {
    const themePath = path.join(THEMES_DIR, `${fileName}.json`);
    if (!fs.existsSync(themePath)) return;
    const themeData = JSON.parse(fs.readFileSync(themePath, 'utf-8'));
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

    for (const source of sources) {
      const familyNames = source.families.map((f) => f.name).join(', ');
      const label = source.label ? `${source.label} — ${familyNames}` : familyNames;
      lines.push(`/* ${label} */`);
      if (source.kind === 'font-face') {
        if (source.cssText) lines.push(source.cssText);
      } else if (source.url) {
        lines.push(`@import url('${source.url}');`);
      }
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
  // Each component under `src/components/*.svelte` has an independent editor
  // artifact: component-configs/{comp}/{default.json,_active.json,_production.json}.
  // default.json is regenerated from the component's `:global(:root)` block at
  // dev startup and on HMR; other files are user-authored.

  function extractAliasDeclarations(body: string): Record<string, string> {
    const aliases: Record<string, string> = {};
    const re = /(--[a-z0-9-]+)\s*:\s*var\((--[a-z0-9-]+)\)\s*;/gi;
    let m: RegExpExecArray | null;
    while ((m = re.exec(body)) !== null) aliases[m[1]] = m[2];
    return aliases;
  }

  function componentNameFromFile(filePath: string): string {
    return path.basename(filePath, '.svelte').toLowerCase();
  }

  function listComponentSourcePaths(): string[] {
    if (!fs.existsSync(COMPONENTS_SRC_DIR)) return [];
    return fs
      .readdirSync(COMPONENTS_SRC_DIR)
      .filter((f) => f.endsWith('.svelte'))
      .map((f) => path.join(COMPONENTS_SRC_DIR, f));
  }

  function listComponentNames(): string[] {
    return listComponentSourcePaths().map(componentNameFromFile);
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
    const aliases = extractAliasDeclarations(body);
    const now = new Date().toISOString();
    let createdAt = now;
    let existingUpdatedAt: string | undefined;
    let existingAliases: Record<string, string> | undefined;
    if (fs.existsSync(defaultPath)) {
      try {
        const existing = JSON.parse(fs.readFileSync(defaultPath, 'utf-8'));
        if (existing.createdAt) createdAt = existing.createdAt;
        if (typeof existing.updatedAt === 'string') existingUpdatedAt = existing.updatedAt;
        if (existing.aliases && typeof existing.aliases === 'object') {
          existingAliases = existing.aliases as Record<string, string>;
        }
      } catch { /* overwrite */ }
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

  // ── Presets helpers ───────────────────────────────────────────────────────

  function ensurePresetsDir(): void {
    presetsResource.ensureDir();
    const defaultPath = path.join(PRESETS_DIR, 'default.json');
    if (!fs.existsSync(defaultPath)) {
      // The "default preset" should capture whatever is checked in as the
      // current active state — the team's intended defaults — not a synthetic
      // all-default manifest. Read each resource's `_active.json` pointer so a
      // first run on a customized repo produces a Default preset that round-
      // trips back to the same state.
      const componentConfigs: Record<string, string> = {};
      for (const comp of listComponentNames()) {
        componentConfigs[comp] = componentResource(comp).getActiveName();
      }
      const now = new Date().toISOString();
      const defaultPreset = {
        name: 'Default Preset',
        createdAt: now,
        updatedAt: now,
        theme: themesResource.getActiveName(),
        componentConfigs,
      };
      fs.writeFileSync(defaultPath, JSON.stringify(defaultPreset, null, 2));
    }
    presetsResource.ensureMeta();
  }

  interface ComponentConfigRead {
    name?: string;
    component?: string;
    createdAt?: string;
    updatedAt?: string;
    aliases?: Record<string, string>;
    config?: Record<string, unknown>;
  }

  function readComponentConfig(comp: string, name: string): ComponentConfigRead | null {
    const filePath = componentResource(comp).filePath(name);
    if (!fs.existsSync(filePath)) return null;
    try {
      return JSON.parse(fs.readFileSync(filePath, 'utf-8'));
    } catch {
      return null;
    }
  }

  const COMPONENT_OVERRIDES_START = '/* component-aliases:start */';
  const COMPONENT_OVERRIDES_END = '/* component-aliases:end */';

  /**
   * Regenerate the `:root:root` override block in tokens.css from every
   * component's `_production.json`. The block's specificity (0,0,2) beats
   * each component's own `:global(:root)` declarations (0,0,1) so production
   * overrides win deterministically regardless of CSS chunk ordering.
   *
   * When a component's production points to 'default', no overrides are
   * emitted for it (the source `.svelte` is authoritative).
   */
  function syncComponentsToCss(): void {
    if (!fs.existsSync(CSS_PATH)) return;
    if (!fs.existsSync(COMPONENT_CONFIGS_DIR)) return;

    const lines: string[] = [];
    const components = listComponentNames();
    for (const comp of components) {
      const prod = componentResource(comp).getProductionName();
      if (prod === 'default') continue; // source is authoritative
      const prodCfg = readComponentConfig(comp, prod);
      const defaultCfg = readComponentConfig(comp, 'default');
      if (!prodCfg || !defaultCfg) continue;
      const overrides: [string, string][] = [];
      for (const [varName, semanticName] of Object.entries(prodCfg.aliases ?? {})) {
        if ((defaultCfg.aliases ?? {})[varName] !== semanticName) {
          overrides.push([varName, semanticName]);
        }
      }
      if (overrides.length === 0) continue;
      lines.push(`  /* ${comp} (${prod}) */`);
      for (const [varName, semanticName] of overrides) {
        lines.push(`  ${varName}: var(${semanticName});`);
      }
    }

    const block = lines.length > 0
      ? `\n\n${COMPONENT_OVERRIDES_START}\n:root:root {\n${lines.join('\n')}\n}\n${COMPONENT_OVERRIDES_END}\n`
      : '';

    let cssContent = fs.readFileSync(CSS_PATH, 'utf-8');
    const startIdx = cssContent.indexOf(COMPONENT_OVERRIDES_START);
    const endIdx = cssContent.indexOf(COMPONENT_OVERRIDES_END);
    if (startIdx !== -1 && endIdx !== -1 && endIdx > startIdx) {
      // Strip preceding blank lines so re-writes don't accumulate whitespace.
      let stripStart = startIdx;
      while (stripStart > 0 && cssContent[stripStart - 1] === '\n') stripStart--;
      const after = cssContent.slice(endIdx + COMPONENT_OVERRIDES_END.length);
      cssContent = cssContent.slice(0, stripStart) + (block || '\n') + after.replace(/^\n+/, '');
    } else if (block) {
      cssContent = cssContent.replace(/\n*$/, '') + block;
    }

    fs.writeFileSync(CSS_PATH, cssContent);
    console.log(
      `[syncComponentsToCss] Wrote ${lines.filter((l) => !l.trim().startsWith('/*')).length} alias override(s) to tokens.css`,
    );
  }

  // Build parameterized routes/regexes from API_BASE.
  // Escape regex metacharacters so custom apiBase values still work.
  const escapedBase = API_BASE.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const THEMES_ROUTE = `${API_BASE}/themes`;
  const THEMES_ACTIVE_ROUTE = `${API_BASE}/themes/active`;
  const THEMES_PRODUCTION_ROUTE = `${API_BASE}/themes/production`;
  const COMPONENT_CONFIGS_ROUTE = `${API_BASE}/component-configs`;
  const PRESETS_ROUTE = `${API_BASE}/presets`;
  const PRESETS_ACTIVE_ROUTE = `${API_BASE}/presets/active`;
  const PRESETS_PRODUCTION_ROUTE = `${API_BASE}/presets/production`;
  const THEME_BY_NAME_REGEX = new RegExp(`^${escapedBase}/themes/([a-z0-9\\-_]+)$`);
  const COMP_LIST_REGEX = new RegExp(`^${escapedBase}/component-configs/([a-z0-9\\-_]+)$`);
  const COMP_ACTIVE_REGEX = new RegExp(`^${escapedBase}/component-configs/([a-z0-9\\-_]+)/active$`);
  const COMP_PRODUCTION_REGEX = new RegExp(`^${escapedBase}/component-configs/([a-z0-9\\-_]+)/production$`);
  const COMP_BY_NAME_REGEX = new RegExp(`^${escapedBase}/component-configs/([a-z0-9\\-_]+)/([a-z0-9\\-_]+)$`);
  const PRESET_APPLY_REGEX = new RegExp(`^${escapedBase}/presets/([a-z0-9\\-_]+)/apply$`);
  const PRESET_BY_NAME_REGEX = new RegExp(`^${escapedBase}/presets/([a-z0-9\\-_]+)$`);

  // ── Route handlers ────────────────────────────────────────────────────────
  // Each handler can throw — the route-table dispatcher centralises the 500
  // catch. Order in the routes table matters: the active/production patterns
  // MUST appear before the catch-all `:name` patterns (the table replaces
  // the previous "warning comment" with explicit ordering).

  // ── /api/themes ──────────────────────────────────────────────────────────

  async function handleListThemes(_ctx: any) {
    const activeFile = themesResource.getActiveName();
    const files = fs
      .readdirSync(THEMES_DIR)
      .filter((f) => f.endsWith('.json') && !f.startsWith('_'))
      .map((f) => {
        const filePath = path.join(THEMES_DIR, f);
        const data = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
        const fileName = f.replace('.json', '');
        return {
          name: data.name || fileName,
          fileName,
          updatedAt: data.updatedAt || '',
          isActive: fileName === activeFile,
        };
      });
    jsonResponse(_ctx.res, 200, { files });
  }

  async function handleGetActiveTheme({ res }: any) {
    const activeFile = themesResource.getActiveName();
    const filePath = themesResource.filePath(activeFile);
    if (!fs.existsSync(filePath)) {
      jsonResponse(res, 404, { error: 'Active theme not found' });
      return;
    }
    const data = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
    data._fileName = activeFile;
    jsonResponse(res, 200, data);
  }

  async function handleSetActiveTheme({ req, res }: any) {
    const body = JSON.parse(await readBody(req));
    const fileName = sanitizeFileName(body.name || 'default');
    if (!fs.existsSync(themesResource.filePath(fileName))) {
      jsonResponse(res, 404, { error: 'Theme not found' });
      return;
    }
    themesResource.setActiveName(fileName);
    jsonResponse(res, 200, { ok: true, activeFile: fileName });
  }

  async function handleGetProductionTheme({ res }: any) {
    const prodFile = themesResource.getProductionName();
    const filePath = themesResource.filePath(prodFile);
    if (!fs.existsSync(filePath)) {
      jsonResponse(res, 200, { fileName: prodFile, name: prodFile, cssVariables: {} });
      return;
    }
    const data = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
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
    if (!fs.existsSync(themesResource.filePath(fileName))) {
      jsonResponse(res, 404, { error: 'Theme not found' });
      return;
    }
    themesResource.setProductionName(fileName);
    syncTokensToCss(fileName);
    syncFontsToCss(fileName);
    syncComponentsToCss();
    const data = JSON.parse(fs.readFileSync(themesResource.filePath(fileName), 'utf-8'));
    jsonResponse(res, 200, {
      ok: true,
      fileName,
      name: data.name || fileName,
      updatedAt: data.updatedAt || '',
    });
  }

  async function handleThemeByName({ params, req, res }: any) {
    const [fileName] = params;
    const filePath = themesResource.filePath(fileName);

    if (req.method === 'GET') {
      if (!fs.existsSync(filePath)) {
        jsonResponse(res, 404, { error: 'Not found' });
        return;
      }
      const data = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
      data._fileName = fileName;
      jsonResponse(res, 200, data);
      return;
    }

    if (req.method === 'PUT') {
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
    const configPath = r.filePath(fileName);
    if (!fs.existsSync(configPath)) {
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
    const configPath = r.filePath(fileName);
    if (!fs.existsSync(configPath)) {
      jsonResponse(res, 404, { error: 'Config not found' });
      return;
    }
    r.ensureDir();
    r.setProductionName(fileName);
    syncComponentsToCss();
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
      if (!fs.existsSync(configPath)) {
        jsonResponse(res, 404, { error: 'Not found' });
        return;
      }
      const data = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
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
    if (!fs.existsSync(r.dir)) {
      jsonResponse(res, 404, { error: 'Component not found' });
      return;
    }
    const activeFile = r.getActiveName();
    const productionFile = r.getProductionName();
    const files = fs
      .readdirSync(r.dir)
      .filter((f) => f.endsWith('.json') && !f.startsWith('_'))
      .map((f) => {
        const filePath = path.join(r.dir, f);
        const data = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
        const fileName = f.replace('.json', '');
        return {
          name: data.name || fileName,
          fileName,
          updatedAt: data.updatedAt || '',
          isActive: fileName === activeFile,
          isProduction: fileName === productionFile,
        };
      });
    jsonResponse(res, 200, { component: comp, files, activeFile, productionFile });
  }

  // ── /api/presets ─────────────────────────────────────────────────────────

  async function handleListPresets({ res }: any) {
    const activeFile = presetsResource.getActiveName();
    const files = fs
      .readdirSync(PRESETS_DIR)
      .filter((f) => f.endsWith('.json') && !f.startsWith('_'))
      .map((f) => {
        const filePath = path.join(PRESETS_DIR, f);
        const data = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
        const fileName = f.replace('.json', '');
        return {
          name: data.name || fileName,
          fileName,
          updatedAt: data.updatedAt || '',
          isActive: fileName === activeFile,
        };
      });
    jsonResponse(res, 200, { files, activeFile });
  }

  async function handleGetActivePreset({ res }: any) {
    const activeFile = presetsResource.getActiveName();
    const filePath = presetsResource.filePath(activeFile);
    if (!fs.existsSync(filePath)) {
      jsonResponse(res, 404, { error: 'Active preset not found' });
      return;
    }
    const data = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
    data._fileName = activeFile;
    jsonResponse(res, 200, data);
  }

  async function handleSetActivePreset({ req, res }: any) {
    const body = JSON.parse(await readBody(req));
    const fileName = sanitizeFileName(body.name || 'default');
    if (!fs.existsSync(presetsResource.filePath(fileName))) {
      jsonResponse(res, 404, { error: 'Preset not found' });
      return;
    }
    presetsResource.setActiveName(fileName);
    jsonResponse(res, 200, { ok: true, activeFile: fileName });
  }

  async function handleGetProductionPreset({ res }: any) {
    const prodFile = presetsResource.getProductionName();
    const filePath = presetsResource.filePath(prodFile);
    if (!fs.existsSync(filePath)) {
      jsonResponse(res, 200, {
        fileName: prodFile,
        name: prodFile,
        theme: 'default',
        componentConfigs: {},
        updatedAt: '',
      });
      return;
    }
    const data = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
    jsonResponse(res, 200, {
      fileName: prodFile,
      name: data.name || prodFile,
      theme: data.theme || 'default',
      componentConfigs: data.componentConfigs || {},
      updatedAt: data.updatedAt || '',
    });
  }

  /**
   * Set the production preset: flip every per-artifact `_production.json`
   * pointer to the file the preset names, update `presets/_production.json`,
   * and re-bake tokens.css + fonts.css + the component overrides block.
   * Parallel to handleSetProductionTheme but operating on the whole bundle.
   * Unmentioned components keep their existing production pointer (matches
   * the editor-side apply semantics — preset has no opinion about those).
   */
  async function handleSetProductionPreset({ req, res }: any) {
    const body = JSON.parse(await readBody(req));
    const fileName = sanitizeFileName(body.name || 'default');
    const presetPath = presetsResource.filePath(fileName);
    if (!fs.existsSync(presetPath)) {
      jsonResponse(res, 404, { error: 'Preset not found' });
      return;
    }
    const preset = JSON.parse(fs.readFileSync(presetPath, 'utf-8'));

    const themeName = sanitizeFileName(preset.theme || 'default');
    if (!fs.existsSync(themesResource.filePath(themeName))) {
      jsonResponse(res, 422, { error: `Preset references missing theme: ${themeName}` });
      return;
    }

    const knownComponents = new Set(listComponentNames());
    const componentConfigs = preset.componentConfigs ?? {};
    const apply: Array<[string, string]> = [];
    for (const [comp, configFile] of Object.entries(componentConfigs)) {
      if (!knownComponents.has(comp)) continue;
      const sanitized = sanitizeFileName(String(configFile) || 'default');
      if (!fs.existsSync(componentResource(comp).filePath(sanitized))) {
        jsonResponse(res, 422, {
          error: `Preset references missing config: ${comp}/${sanitized}`,
        });
        return;
      }
      apply.push([comp, sanitized]);
    }

    themesResource.setProductionName(themeName);
    for (const [comp, configFile] of apply) {
      componentResource(comp).setProductionName(configFile);
    }
    presetsResource.setProductionName(fileName);

    syncTokensToCss(themeName);
    syncFontsToCss(themeName);
    syncComponentsToCss();

    jsonResponse(res, 200, {
      ok: true,
      fileName,
      name: preset.name || fileName,
      theme: themeName,
      componentConfigs: Object.fromEntries(apply),
      updatedAt: preset.updatedAt || '',
    });
  }

  async function handlePresetByName({ params, req, res }: any) {
    const [fileName] = params;
    const filePath = presetsResource.filePath(fileName);

    if (req.method === 'GET') {
      if (!fs.existsSync(filePath)) {
        jsonResponse(res, 404, { error: 'Not found' });
        return;
      }
      const data = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
      data._fileName = fileName;
      jsonResponse(res, 200, data);
      return;
    }

    if (req.method === 'PUT') {
      if (fileName === 'default') {
        jsonResponse(res, 403, { error: 'Cannot overwrite the default preset' });
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
        jsonResponse(res, 403, { error: 'Cannot delete the default preset' });
        return;
      }
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
        if (presetsResource.getActiveName() === fileName) {
          presetsResource.setActiveName('default');
        }
      }
      jsonResponse(res, 200, { ok: true });
      return;
    }
  }

  /**
   * Atomically apply a preset: validate that every referenced file exists,
   * flip the theme + each component's `_active.json` pointers, mark the preset
   * itself active, and return the resolved theme + component configs in one
   * payload. The client uses this to hydrate the editor without N+1 round-trips.
   */
  async function handleApplyPreset({ params, res }: any) {
    const [fileName] = params;
    const presetPath = presetsResource.filePath(fileName);
    if (!fs.existsSync(presetPath)) {
      jsonResponse(res, 404, { error: 'Preset not found' });
      return;
    }
    const preset = JSON.parse(fs.readFileSync(presetPath, 'utf-8'));

    // Validate theme exists.
    const themeName = sanitizeFileName(preset.theme || 'default');
    const themePath = themesResource.filePath(themeName);
    if (!fs.existsSync(themePath)) {
      jsonResponse(res, 422, { error: `Preset references missing theme: ${themeName}` });
      return;
    }

    // Validate every referenced component config exists. Components in the
    // manifest that don't exist as components get skipped (component was
    // removed since the preset was saved); missing config files for an
    // existing component are a hard error.
    const knownComponents = new Set(listComponentNames());
    const componentConfigs = preset.componentConfigs ?? {};
    const resolvedConfigs: Record<string, any> = {};
    const apply: Array<[string, string]> = []; // [comp, fileName]
    for (const [comp, configFile] of Object.entries(componentConfigs)) {
      if (!knownComponents.has(comp)) continue;
      const sanitized = sanitizeFileName(String(configFile) || 'default');
      const r = componentResource(comp);
      const cfgPath = r.filePath(sanitized);
      if (!fs.existsSync(cfgPath)) {
        jsonResponse(res, 422, {
          error: `Preset references missing config: ${comp}/${sanitized}`,
        });
        return;
      }
      apply.push([comp, sanitized]);
    }

    // All references valid — flip pointers and gather resolved JSON.
    themesResource.setActiveName(themeName);
    const themeData = JSON.parse(fs.readFileSync(themePath, 'utf-8'));
    themeData._fileName = themeName;

    for (const [comp, configFile] of apply) {
      const r = componentResource(comp);
      r.setActiveName(configFile);
      const cfg = readComponentConfig(comp, configFile);
      if (cfg) resolvedConfigs[comp] = { ...cfg, _fileName: configFile };
    }

    // Components on disk but not mentioned in the manifest: leave their active
    // pointer alone. The preset has no opinion about them. Forcing every
    // unmentioned component to 'default' would silently revert user state for
    // components a preset wasn't trying to touch. If you want exhaustive
    // restoration, save a preset via captureCurrentAsPreset — it captures
    // every component's current active and writes a complete manifest.
    for (const comp of knownComponents) {
      if (resolvedConfigs[comp]) continue;
      const activeName = componentResource(comp).getActiveName();
      const cfg = readComponentConfig(comp, activeName);
      if (cfg) resolvedConfigs[comp] = { ...cfg, _fileName: activeName };
    }

    presetsResource.setActiveName(fileName);

    jsonResponse(res, 200, {
      ok: true,
      preset: { ...preset, _fileName: fileName },
      theme: themeData,
      componentConfigs: resolvedConfigs,
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

    // Presets — list / active / production are exact strings, must run before regexes
    { method: 'GET',    pattern: PRESETS_ROUTE,            handler: handleListPresets },
    { method: 'GET',    pattern: PRESETS_ACTIVE_ROUTE,     handler: handleGetActivePreset },
    { method: 'PUT',    pattern: PRESETS_ACTIVE_ROUTE,     handler: handleSetActivePreset },
    { method: 'GET',    pattern: PRESETS_PRODUCTION_ROUTE, handler: handleGetProductionPreset },
    { method: 'PUT',    pattern: PRESETS_PRODUCTION_ROUTE, handler: handleSetProductionPreset },

    // Presets — :name/apply (more specific than :name)
    { method: 'PUT',    pattern: PRESET_APPLY_REGEX,      handler: handleApplyPreset },
    { method: 'POST',   pattern: PRESET_APPLY_REGEX,      handler: methodNotAllowed },
    { method: 'GET',    pattern: PRESET_APPLY_REGEX,      handler: methodNotAllowed },
    { method: 'DELETE', pattern: PRESET_APPLY_REGEX,      handler: methodNotAllowed },

    // Presets — :name CRUD (broadest preset route, runs last)
    { method: 'GET',    pattern: PRESET_BY_NAME_REGEX,    handler: handlePresetByName },
    { method: 'PUT',    pattern: PRESET_BY_NAME_REGEX,    handler: handlePresetByName },
    { method: 'DELETE', pattern: PRESET_BY_NAME_REGEX,    handler: handlePresetByName },
  ];

  return {
    name: 'theme-file-api',
    config() {
      // Inject __PROJECT_ROOT__ so the editor overlay's "Page Source" link
      // can build `vscode://file/<root>/<path>` URLs without each consumer
      // having to wire their own `define` entry.
      return {
        define: {
          __PROJECT_ROOT__: JSON.stringify(process.cwd()),
        },
      };
    },
    configureServer(server) {
      ensureThemesDir();
      ensureComponentConfigsDir();
      ensurePresetsDir();

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
      if (!normalized.startsWith(COMPONENTS_SRC_DIR)) return;
      if (!normalized.endsWith('.svelte')) return;
      const comp = componentNameFromFile(normalized);
      generateDefaultConfig(comp, normalized);
    },
  };
}
