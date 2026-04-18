import type { Plugin } from 'vite';
import fs from 'fs';
import path from 'path';

export interface ThemeFileApiOptions {
  themesDir: string;           // required, e.g. 'themes' (relative to cwd, resolved with path.resolve)
  tokensCssPath: string;       // required, e.g. 'src/styles/tokens.css'
  fontsCssPath?: string;       // default: sibling of tokensCssPath named 'fonts.css'
  themesBackupDir?: string;    // default: `${themesDir}/_backups`
  cssBackupDir?: string;       // default: path.join(path.dirname(tokensCssPath), '_backups')
  apiBase?: string;            // default: '/api'. Must be a simple '/path' without regex metacharacters.
  componentConfigsDir?: string; // default: 'component-configs'
  componentsSrcDir?: string;   // default: 'src/components'
}

export function themeFileApi(opts: ThemeFileApiOptions): Plugin {
  const THEMES_DIR = path.resolve(opts.themesDir);
  const CSS_PATH = path.resolve(opts.tokensCssPath);
  const FONTS_CSS_PATH = opts.fontsCssPath
    ? path.resolve(opts.fontsCssPath)
    : path.join(path.dirname(CSS_PATH), 'fonts.css');
  const THEMES_BACKUP_DIR = opts.themesBackupDir
    ? path.resolve(opts.themesBackupDir)
    : path.join(THEMES_DIR, '_backups');
  const CSS_BACKUP_DIR = opts.cssBackupDir
    ? path.resolve(opts.cssBackupDir)
    : path.join(path.dirname(CSS_PATH), '_backups');
  const API_BASE = opts.apiBase ?? '/api';
  const ACTIVE_FILE = path.join(THEMES_DIR, '_active.json');
  const PRODUCTION_FILE = path.join(THEMES_DIR, '_production.json');
  const COMPONENT_CONFIGS_DIR = opts.componentConfigsDir
    ? path.resolve(opts.componentConfigsDir)
    : path.resolve('component-configs');
  const COMPONENTS_SRC_DIR = opts.componentsSrcDir
    ? path.resolve(opts.componentsSrcDir)
    : path.resolve('src/components');

  function ensureThemesDir() {
    if (!fs.existsSync(THEMES_DIR)) {
      fs.mkdirSync(THEMES_DIR, { recursive: true });
    }
    if (!fs.existsSync(path.join(THEMES_DIR, 'default.json'))) {
      const defaultTheme = {
        name: 'Default',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        editorConfigs: {},
        cssVariables: {},
      };
      fs.writeFileSync(path.join(THEMES_DIR, 'default.json'), JSON.stringify(defaultTheme, null, 2));
    }
    if (!fs.existsSync(ACTIVE_FILE)) {
      fs.writeFileSync(ACTIVE_FILE, JSON.stringify({ activeFile: 'default' }));
    }
    if (!fs.existsSync(PRODUCTION_FILE)) {
      const activeFile = getActiveFileName();
      fs.writeFileSync(PRODUCTION_FILE, JSON.stringify({ productionFile: activeFile }));
    }
  }

  function backupThemeFile(filePath: string, fileName: string) {
    if (!fs.existsSync(filePath)) return;
    if (!fs.existsSync(THEMES_BACKUP_DIR)) {
      fs.mkdirSync(THEMES_BACKUP_DIR, { recursive: true });
    }
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupPath = path.join(THEMES_BACKUP_DIR, `${fileName}_${timestamp}.json`);
    fs.copyFileSync(filePath, backupPath);

    // Keep only the 10 most recent backups per file
    const allBackups = fs.readdirSync(THEMES_BACKUP_DIR)
      .filter(f => f.startsWith(`${fileName}_`) && f.endsWith('.json'))
      .sort()
      .reverse();
    for (const old of allBackups.slice(10)) {
      fs.unlinkSync(path.join(THEMES_BACKUP_DIR, old));
    }
  }

  function backupCssFile() {
    if (!fs.existsSync(CSS_PATH)) return;
    if (!fs.existsSync(CSS_BACKUP_DIR)) {
      fs.mkdirSync(CSS_BACKUP_DIR, { recursive: true });
    }
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupPath = path.join(CSS_BACKUP_DIR, `tokens_${timestamp}.css`);
    fs.copyFileSync(CSS_PATH, backupPath);

    // Keep only the 10 most recent CSS backups
    const allBackups = fs.readdirSync(CSS_BACKUP_DIR)
      .filter(f => f.startsWith('tokens_') && f.endsWith('.css'))
      .sort()
      .reverse();
    for (const old of allBackups.slice(10)) {
      fs.unlinkSync(path.join(CSS_BACKUP_DIR, old));
    }
  }

  function getActiveFileName(): string {
    try {
      const data = JSON.parse(fs.readFileSync(ACTIVE_FILE, 'utf-8'));
      return data.activeFile || 'default';
    } catch {
      return 'default';
    }
  }

  function getProductionFileName(): string {
    try {
      const data = JSON.parse(fs.readFileSync(PRODUCTION_FILE, 'utf-8'));
      return data.productionFile || 'default';
    } catch {
      return 'default';
    }
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

  function sanitize(name: string): string {
    return name
      .toLowerCase()
      .trim()
      .replace(/\s+/g, '-')
      .replace(/[^a-z0-9\-_]/g, '')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '')
      || 'unnamed';
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

    backupCssFile();
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
  // artifact: component-configs/{comp}/{default.json,_active.json,_production.json,_backups/}.
  // default.json is regenerated from the component's `:global(:root)` block at
  // dev startup and on HMR; other files are user-authored.

  function extractGlobalRootBodySsr(source: string): string {
    const re = /:global\(:root\)\s*\{([^}]*)\}/g;
    const bodies: string[] = [];
    let m: RegExpExecArray | null;
    while ((m = re.exec(source)) !== null) bodies.push(m[1]);
    return bodies.join('\n');
  }

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

  function ensureComponentDir(comp: string): string {
    const dir = path.join(COMPONENT_CONFIGS_DIR, comp);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    return dir;
  }

  function ensureComponentMeta(comp: string): void {
    const dir = ensureComponentDir(comp);
    const activePath = path.join(dir, '_active.json');
    const productionPath = path.join(dir, '_production.json');
    if (!fs.existsSync(activePath)) {
      fs.writeFileSync(activePath, JSON.stringify({ activeFile: 'default' }));
    }
    if (!fs.existsSync(productionPath)) {
      fs.writeFileSync(productionPath, JSON.stringify({ productionFile: 'default' }));
    }
  }

  /**
   * Regenerate `component-configs/{comp}/default.json` from the component's
   * `:global(:root)` block. Writes only if missing or stale (source mtime >
   * default mtime). Preserves createdAt on regeneration.
   */
  function generateDefaultConfig(comp: string, sourcePath: string): void {
    if (!fs.existsSync(sourcePath)) return;
    const dir = ensureComponentDir(comp);
    const defaultPath = path.join(dir, 'default.json');
    const sourceStat = fs.statSync(sourcePath);
    if (fs.existsSync(defaultPath)) {
      const defaultStat = fs.statSync(defaultPath);
      if (defaultStat.mtimeMs >= sourceStat.mtimeMs) return;
    }
    const source = fs.readFileSync(sourcePath, 'utf-8');
    const body = extractGlobalRootBodySsr(source);
    const aliases = extractAliasDeclarations(body);
    const now = new Date().toISOString();
    let createdAt = now;
    if (fs.existsSync(defaultPath)) {
      try {
        const existing = JSON.parse(fs.readFileSync(defaultPath, 'utf-8'));
        if (existing.createdAt) createdAt = existing.createdAt;
      } catch { /* overwrite */ }
    }
    const defaultConfig = {
      name: 'default',
      component: comp,
      createdAt,
      updatedAt: now,
      aliases,
    };
    fs.writeFileSync(defaultPath, JSON.stringify(defaultConfig, null, 2));
  }

  function ensureComponentConfigsDir(): void {
    if (!fs.existsSync(COMPONENT_CONFIGS_DIR)) {
      fs.mkdirSync(COMPONENT_CONFIGS_DIR, { recursive: true });
    }
    for (const sourcePath of listComponentSourcePaths()) {
      const comp = componentNameFromFile(sourcePath);
      ensureComponentDir(comp);
      generateDefaultConfig(comp, sourcePath);
      ensureComponentMeta(comp);
    }
  }

  function backupComponentConfigFile(filePath: string, comp: string, fileName: string): void {
    if (!fs.existsSync(filePath)) return;
    const backupDir = path.join(COMPONENT_CONFIGS_DIR, comp, '_backups');
    if (!fs.existsSync(backupDir)) fs.mkdirSync(backupDir, { recursive: true });
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupPath = path.join(backupDir, `${fileName}_${timestamp}.json`);
    fs.copyFileSync(filePath, backupPath);
    const allBackups = fs
      .readdirSync(backupDir)
      .filter((f) => f.startsWith(`${fileName}_`) && f.endsWith('.json'))
      .sort()
      .reverse();
    for (const old of allBackups.slice(10)) {
      fs.unlinkSync(path.join(backupDir, old));
    }
  }

  function getComponentActiveFileName(comp: string): string {
    try {
      const data = JSON.parse(
        fs.readFileSync(path.join(COMPONENT_CONFIGS_DIR, comp, '_active.json'), 'utf-8'),
      );
      return data.activeFile || 'default';
    } catch {
      return 'default';
    }
  }

  function getComponentProductionFileName(comp: string): string {
    try {
      const data = JSON.parse(
        fs.readFileSync(path.join(COMPONENT_CONFIGS_DIR, comp, '_production.json'), 'utf-8'),
      );
      return data.productionFile || 'default';
    } catch {
      return 'default';
    }
  }

  interface ComponentConfigRead {
    name?: string;
    component?: string;
    createdAt?: string;
    updatedAt?: string;
    aliases?: Record<string, string>;
  }

  function readComponentConfig(comp: string, name: string): ComponentConfigRead | null {
    const filePath = path.join(COMPONENT_CONFIGS_DIR, comp, `${name}.json`);
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
      const prod = getComponentProductionFileName(comp);
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

    backupCssFile();
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
  const BACKUPS_ROUTE = `${API_BASE}/backups`;
  const CURRENT_CSS_ROUTE = `${API_BASE}/current-css`;
  const COMPONENT_CONFIGS_ROUTE = `${API_BASE}/component-configs`;
  const THEME_BY_NAME_REGEX = new RegExp(`^${escapedBase}/themes/([a-z0-9\\-_]+)$`);
  const BACKUP_GET_REGEX = new RegExp(`^${escapedBase}/backups/(themes|css|component-configs)/(.+)$`);
  const BACKUP_RESTORE_REGEX = new RegExp(`^${escapedBase}/backups/(themes|css|component-configs)/(.+)/restore$`);
  const COMP_LIST_REGEX = new RegExp(`^${escapedBase}/component-configs/([a-z0-9\\-_]+)$`);
  const COMP_ACTIVE_REGEX = new RegExp(`^${escapedBase}/component-configs/([a-z0-9\\-_]+)/active$`);
  const COMP_PRODUCTION_REGEX = new RegExp(`^${escapedBase}/component-configs/([a-z0-9\\-_]+)/production$`);
  const COMP_BY_NAME_REGEX = new RegExp(`^${escapedBase}/component-configs/([a-z0-9\\-_]+)/([a-z0-9\\-_]+)$`);

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

      server.middlewares.use(async (req, res, next) => {
        const url = req.url || '';

        // ── GET /api/themes — list all themes ──
        if (url === THEMES_ROUTE && req.method === 'GET') {
          try {
            const activeFile = getActiveFileName();
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
            jsonResponse(res, 200, { files });
          } catch (err: any) {
            jsonResponse(res, 500, { error: err.message });
          }
          return;
        }

        // ── GET /api/themes/active — return the active theme ──
        if (url === THEMES_ACTIVE_ROUTE && req.method === 'GET') {
          try {
            const activeFile = getActiveFileName();
            const filePath = path.join(THEMES_DIR, `${activeFile}.json`);
            if (!fs.existsSync(filePath)) {
              jsonResponse(res, 404, { error: 'Active theme not found' });
              return;
            }
            const data = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
            data._fileName = activeFile;
            jsonResponse(res, 200, data);
          } catch (err: any) {
            jsonResponse(res, 500, { error: err.message });
          }
          return;
        }

        // ── PUT /api/themes/active — set the active theme ──
        if (url === THEMES_ACTIVE_ROUTE && req.method === 'PUT') {
          try {
            const body = JSON.parse(await readBody(req));
            const fileName = sanitize(body.name || 'default');
            if (!fs.existsSync(path.join(THEMES_DIR, `${fileName}.json`))) {
              jsonResponse(res, 404, { error: 'Theme not found' });
              return;
            }
            fs.writeFileSync(ACTIVE_FILE, JSON.stringify({ activeFile: fileName }));
            jsonResponse(res, 200, { ok: true, activeFile: fileName });
          } catch (err: any) {
            jsonResponse(res, 500, { error: err.message });
          }
          return;
        }

        // ── GET /api/themes/production — return production info + config ──
        if (url === THEMES_PRODUCTION_ROUTE && req.method === 'GET') {
          try {
            const prodFile = getProductionFileName();
            const filePath = path.join(THEMES_DIR, `${prodFile}.json`);
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
          } catch (err: any) {
            jsonResponse(res, 500, { error: err.message });
          }
          return;
        }

        // ── PUT /api/themes/production — update the production theme ──
        if (url === THEMES_PRODUCTION_ROUTE && req.method === 'PUT') {
          try {
            const body = JSON.parse(await readBody(req));
            const fileName = sanitize(body.name || 'default');
            if (!fs.existsSync(path.join(THEMES_DIR, `${fileName}.json`))) {
              jsonResponse(res, 404, { error: 'Theme not found' });
              return;
            }
            fs.writeFileSync(PRODUCTION_FILE, JSON.stringify({ productionFile: fileName }));
            syncTokensToCss(fileName);
            syncFontsToCss(fileName);
            syncComponentsToCss();
            const data = JSON.parse(fs.readFileSync(path.join(THEMES_DIR, `${fileName}.json`), 'utf-8'));
            jsonResponse(res, 200, {
              ok: true,
              fileName,
              name: data.name || fileName,
              updatedAt: data.updatedAt || '',
            });
          } catch (err: any) {
            jsonResponse(res, 500, { error: err.message });
          }
          return;
        }

        // ── GET /api/backups — list all backups (themes + CSS) ──
        if (url === BACKUPS_ROUTE && req.method === 'GET') {
          try {
            const backups: { type: string; file: string; name: string; timestamp: string; size: number }[] = [];

            function fileTimestampToISO(ts: string): string {
              return ts.replace(/T(\d{2})-(\d{2})-(\d{2})-(\d{3})Z/, 'T$1:$2:$3.$4Z');
            }

            // Theme backups
            if (fs.existsSync(THEMES_BACKUP_DIR)) {
              for (const f of fs.readdirSync(THEMES_BACKUP_DIR)) {
                if (!f.endsWith('.json')) continue;
                const match = f.match(/^(.+)_(\d{4}-\d{2}-\d{2}T\d{2}-\d{2}-\d{2}-\d{3}Z)\.json$/);
                if (!match) continue;
                const stat = fs.statSync(path.join(THEMES_BACKUP_DIR, f));
                backups.push({
                  type: 'themes',
                  file: f,
                  name: match[1],
                  timestamp: fileTimestampToISO(match[2]),
                  size: stat.size,
                });
              }
            }

            // CSS backups
            if (fs.existsSync(CSS_BACKUP_DIR)) {
              for (const f of fs.readdirSync(CSS_BACKUP_DIR)) {
                if (!f.endsWith('.css')) continue;
                const match = f.match(/^(.+)_(\d{4}-\d{2}-\d{2}T\d{2}-\d{2}-\d{2}-\d{3}Z)\.css$/);
                if (!match) continue;
                const stat = fs.statSync(path.join(CSS_BACKUP_DIR, f));
                backups.push({
                  type: 'css',
                  file: f,
                  name: match[1],
                  timestamp: fileTimestampToISO(match[2]),
                  size: stat.size,
                });
              }
            }

            // Component-config backups (one _backups dir per component)
            if (fs.existsSync(COMPONENT_CONFIGS_DIR)) {
              for (const comp of fs.readdirSync(COMPONENT_CONFIGS_DIR)) {
                const compBackupDir = path.join(COMPONENT_CONFIGS_DIR, comp, '_backups');
                if (!fs.existsSync(compBackupDir)) continue;
                for (const f of fs.readdirSync(compBackupDir)) {
                  if (!f.endsWith('.json')) continue;
                  const match = f.match(/^(.+)_(\d{4}-\d{2}-\d{2}T\d{2}-\d{2}-\d{2}-\d{3}Z)\.json$/);
                  if (!match) continue;
                  const stat = fs.statSync(path.join(compBackupDir, f));
                  backups.push({
                    type: 'component-configs',
                    file: `${comp}/${f}`,
                    name: `${comp}/${match[1]}`,
                    timestamp: fileTimestampToISO(match[2]),
                    size: stat.size,
                  });
                }
              }
            }

            // Sort newest first
            backups.sort((a, b) => b.timestamp.localeCompare(a.timestamp));
            jsonResponse(res, 200, { backups });
          } catch (err: any) {
            jsonResponse(res, 500, { error: err.message });
          }
          return;
        }

        // ── POST /api/backups/:type/:file/restore — restore a backup ──
        // NOTE: check restore before the generic read, since the restore URL also matches BACKUP_GET_REGEX.
        {
          const restoreMatch = url.match(BACKUP_RESTORE_REGEX);
          if (restoreMatch && req.method === 'POST') {
            const [, type, file] = restoreMatch;
            try {
              if (type === 'css') {
                const backupPath = path.join(CSS_BACKUP_DIR, decodeURIComponent(file));
                if (!backupPath.startsWith(CSS_BACKUP_DIR) || !fs.existsSync(backupPath)) {
                  jsonResponse(res, 404, { error: 'Backup not found' });
                  return;
                }
                // Backup current before restoring
                backupCssFile();
                fs.copyFileSync(backupPath, CSS_PATH);
                jsonResponse(res, 200, { ok: true, restored: file });
              } else if (type === 'component-configs') {
                const decoded = decodeURIComponent(file);
                const slash = decoded.indexOf('/');
                if (slash === -1) {
                  jsonResponse(res, 400, { error: 'Malformed component-configs backup path' });
                  return;
                }
                const comp = decoded.slice(0, slash);
                const backupFile = decoded.slice(slash + 1);
                const backupDir = path.join(COMPONENT_CONFIGS_DIR, comp, '_backups');
                const backupPath = path.join(backupDir, backupFile);
                if (!backupPath.startsWith(backupDir) || !fs.existsSync(backupPath)) {
                  jsonResponse(res, 404, { error: 'Backup not found' });
                  return;
                }
                const nameMatch = backupFile.match(/^(.+)_\d{4}-/);
                if (!nameMatch) {
                  jsonResponse(res, 400, { error: 'Cannot determine config name from backup' });
                  return;
                }
                const configFilePath = path.join(COMPONENT_CONFIGS_DIR, comp, `${nameMatch[1]}.json`);
                backupComponentConfigFile(configFilePath, comp, nameMatch[1]);
                fs.copyFileSync(backupPath, configFilePath);
                jsonResponse(res, 200, { ok: true, restored: file });
              } else {
                const backupPath = path.join(THEMES_BACKUP_DIR, decodeURIComponent(file));
                if (!backupPath.startsWith(THEMES_BACKUP_DIR) || !fs.existsSync(backupPath)) {
                  jsonResponse(res, 404, { error: 'Backup not found' });
                  return;
                }
                // Determine which theme this backup belongs to
                const nameMatch = decodeURIComponent(file).match(/^(.+)_\d{4}-/);
                if (!nameMatch) {
                  jsonResponse(res, 400, { error: 'Cannot determine theme name from backup' });
                  return;
                }
                const themeFilePath = path.join(THEMES_DIR, `${nameMatch[1]}.json`);
                // Backup current before restoring
                backupThemeFile(themeFilePath, nameMatch[1]);
                fs.copyFileSync(backupPath, themeFilePath);
                jsonResponse(res, 200, { ok: true, restored: file });
              }
            } catch (err: any) {
              jsonResponse(res, 500, { error: err.message });
            }
            return;
          }
        }

        // ── GET /api/backups/:type/:file — read backup content ──
        {
          const backupMatch = url.match(BACKUP_GET_REGEX);
          if (backupMatch && req.method === 'GET') {
            const [, type, file] = backupMatch;
            let filePath: string;
            let dir: string;
            if (type === 'css') {
              dir = CSS_BACKUP_DIR;
              filePath = path.join(dir, decodeURIComponent(file));
            } else if (type === 'component-configs') {
              const decoded = decodeURIComponent(file);
              const slash = decoded.indexOf('/');
              if (slash === -1) {
                jsonResponse(res, 400, { error: 'Malformed component-configs backup path' });
                return;
              }
              const comp = decoded.slice(0, slash);
              const backupFile = decoded.slice(slash + 1);
              dir = path.join(COMPONENT_CONFIGS_DIR, comp, '_backups');
              filePath = path.join(dir, backupFile);
            } else {
              dir = THEMES_BACKUP_DIR;
              filePath = path.join(dir, decodeURIComponent(file));
            }
            if (!filePath.startsWith(dir) || !fs.existsSync(filePath)) {
              jsonResponse(res, 404, { error: 'Backup not found' });
              return;
            }
            const content = fs.readFileSync(filePath, 'utf-8');
            jsonResponse(res, 200, { content, type, file });
            return;
          }
        }

        // ── GET /api/current-css — read current tokens.css ──
        if (url === CURRENT_CSS_ROUTE && req.method === 'GET') {
          try {
            const content = fs.readFileSync(CSS_PATH, 'utf-8');
            jsonResponse(res, 200, { content });
          } catch (err: any) {
            jsonResponse(res, 500, { error: err.message });
          }
          return;
        }

        // ── GET /api/component-configs — list all components ──
        if (url === COMPONENT_CONFIGS_ROUTE && req.method === 'GET') {
          try {
            const components = listComponentNames().map((comp) => ({
              name: comp,
              activeFile: getComponentActiveFileName(comp),
              productionFile: getComponentProductionFileName(comp),
            }));
            jsonResponse(res, 200, { components });
          } catch (err: any) {
            jsonResponse(res, 500, { error: err.message });
          }
          return;
        }

        // ── GET/PUT /api/component-configs/:comp/active ──
        // Must come before COMP_BY_NAME_REGEX — 'active' would otherwise match as a name.
        {
          const activeMatch = url.match(COMP_ACTIVE_REGEX);
          if (activeMatch) {
            const comp = activeMatch[1];
            if (req.method === 'GET') {
              try {
                const activeFile = getComponentActiveFileName(comp);
                const cfg = readComponentConfig(comp, activeFile);
                if (!cfg) {
                  jsonResponse(res, 404, { error: 'Active config not found' });
                  return;
                }
                jsonResponse(res, 200, { ...cfg, _fileName: activeFile });
              } catch (err: any) {
                jsonResponse(res, 500, { error: err.message });
              }
              return;
            }
            if (req.method === 'PUT') {
              try {
                const body = JSON.parse(await readBody(req));
                const fileName = sanitize(body.name || 'default');
                const configPath = path.join(COMPONENT_CONFIGS_DIR, comp, `${fileName}.json`);
                if (!fs.existsSync(configPath)) {
                  jsonResponse(res, 404, { error: 'Config not found' });
                  return;
                }
                ensureComponentDir(comp);
                fs.writeFileSync(
                  path.join(COMPONENT_CONFIGS_DIR, comp, '_active.json'),
                  JSON.stringify({ activeFile: fileName }),
                );
                jsonResponse(res, 200, { ok: true, activeFile: fileName });
              } catch (err: any) {
                jsonResponse(res, 500, { error: err.message });
              }
              return;
            }
            jsonResponse(res, 405, { error: 'Method not allowed' });
            return;
          }
        }

        // ── GET/PUT /api/component-configs/:comp/production ──
        {
          const prodMatch = url.match(COMP_PRODUCTION_REGEX);
          if (prodMatch) {
            const comp = prodMatch[1];
            if (req.method === 'GET') {
              try {
                const prodFile = getComponentProductionFileName(comp);
                const cfg = readComponentConfig(comp, prodFile);
                jsonResponse(res, 200, {
                  fileName: prodFile,
                  name: cfg?.name || prodFile,
                  aliases: cfg?.aliases || {},
                });
              } catch (err: any) {
                jsonResponse(res, 500, { error: err.message });
              }
              return;
            }
            if (req.method === 'PUT') {
              try {
                const body = JSON.parse(await readBody(req));
                const fileName = sanitize(body.name || 'default');
                const configPath = path.join(COMPONENT_CONFIGS_DIR, comp, `${fileName}.json`);
                if (!fs.existsSync(configPath)) {
                  jsonResponse(res, 404, { error: 'Config not found' });
                  return;
                }
                ensureComponentDir(comp);
                fs.writeFileSync(
                  path.join(COMPONENT_CONFIGS_DIR, comp, '_production.json'),
                  JSON.stringify({ productionFile: fileName }),
                );
                syncComponentsToCss();
                jsonResponse(res, 200, { ok: true, productionFile: fileName });
              } catch (err: any) {
                jsonResponse(res, 500, { error: err.message });
              }
              return;
            }
            jsonResponse(res, 405, { error: 'Method not allowed' });
            return;
          }
        }

        // ── GET/PUT/DELETE /api/component-configs/:comp/:name — CRUD for a single config ──
        {
          const byNameMatch = url.match(COMP_BY_NAME_REGEX);
          if (byNameMatch) {
            const [, comp, name] = byNameMatch;
            const configPath = path.join(COMPONENT_CONFIGS_DIR, comp, `${name}.json`);

            if (req.method === 'GET') {
              try {
                if (!fs.existsSync(configPath)) {
                  jsonResponse(res, 404, { error: 'Not found' });
                  return;
                }
                const data = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
                data._fileName = name;
                jsonResponse(res, 200, data);
              } catch (err: any) {
                jsonResponse(res, 500, { error: err.message });
              }
              return;
            }

            if (req.method === 'PUT') {
              if (name === 'default') {
                jsonResponse(res, 403, { error: 'Cannot modify default config (regenerated from source)' });
                return;
              }
              try {
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
                ensureComponentDir(comp);
                backupComponentConfigFile(configPath, comp, name);
                fs.writeFileSync(configPath, JSON.stringify(body, null, 2));
                if (getComponentProductionFileName(comp) === name) {
                  syncComponentsToCss();
                }
                jsonResponse(res, 200, { ok: true, fileName: name });
              } catch (err: any) {
                jsonResponse(res, 500, { error: err.message });
              }
              return;
            }

            if (req.method === 'DELETE') {
              if (name === 'default') {
                jsonResponse(res, 403, { error: 'Cannot delete default config' });
                return;
              }
              try {
                if (fs.existsSync(configPath)) {
                  fs.unlinkSync(configPath);
                  if (getComponentActiveFileName(comp) === name) {
                    fs.writeFileSync(
                      path.join(COMPONENT_CONFIGS_DIR, comp, '_active.json'),
                      JSON.stringify({ activeFile: 'default' }),
                    );
                  }
                  if (getComponentProductionFileName(comp) === name) {
                    fs.writeFileSync(
                      path.join(COMPONENT_CONFIGS_DIR, comp, '_production.json'),
                      JSON.stringify({ productionFile: 'default' }),
                    );
                    syncComponentsToCss();
                  }
                }
                jsonResponse(res, 200, { ok: true });
              } catch (err: any) {
                jsonResponse(res, 500, { error: err.message });
              }
              return;
            }

            jsonResponse(res, 405, { error: 'Method not allowed' });
            return;
          }
        }

        // ── GET /api/component-configs/:comp — list configs for a component ──
        {
          const listMatch = url.match(COMP_LIST_REGEX);
          if (listMatch && req.method === 'GET') {
            const comp = listMatch[1];
            try {
              const dir = path.join(COMPONENT_CONFIGS_DIR, comp);
              if (!fs.existsSync(dir)) {
                jsonResponse(res, 404, { error: 'Component not found' });
                return;
              }
              const activeFile = getComponentActiveFileName(comp);
              const productionFile = getComponentProductionFileName(comp);
              const files = fs
                .readdirSync(dir)
                .filter((f) => f.endsWith('.json') && !f.startsWith('_'))
                .map((f) => {
                  const filePath = path.join(dir, f);
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
            } catch (err: any) {
              jsonResponse(res, 500, { error: err.message });
            }
            return;
          }
        }

        // ── /api/themes/:name — CRUD for individual themes ──
        const match = url.match(THEME_BY_NAME_REGEX);
        if (match) {
          const fileName = match[1];
          const filePath = path.join(THEMES_DIR, `${fileName}.json`);

          if (req.method === 'GET') {
            try {
              if (!fs.existsSync(filePath)) {
                jsonResponse(res, 404, { error: 'Not found' });
                return;
              }
              const data = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
              data._fileName = fileName;
              jsonResponse(res, 200, data);
            } catch (err: any) {
              jsonResponse(res, 500, { error: err.message });
            }
            return;
          }

          if (req.method === 'PUT') {
            try {
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
              // Backup existing file before overwriting
              backupThemeFile(filePath, fileName);
              fs.writeFileSync(filePath, JSON.stringify(body, null, 2));
              // Keep tokens.css and fonts.css in sync when the production theme is saved
              if (fileName === getProductionFileName()) {
                syncTokensToCss(fileName);
                syncFontsToCss(fileName);
                syncComponentsToCss();
              }
              jsonResponse(res, 200, { ok: true, fileName });
            } catch (err: any) {
              jsonResponse(res, 500, { error: err.message });
            }
            return;
          }

          if (req.method === 'DELETE') {
            if (fileName === 'default') {
              jsonResponse(res, 403, { error: 'Cannot delete the default theme' });
              return;
            }
            try {
              if (fs.existsSync(filePath)) {
                fs.unlinkSync(filePath);
                // If this was the active theme, revert to default
                if (getActiveFileName() === fileName) {
                  fs.writeFileSync(ACTIVE_FILE, JSON.stringify({ activeFile: 'default' }));
                }
              }
              jsonResponse(res, 200, { ok: true });
            } catch (err: any) {
              jsonResponse(res, 500, { error: err.message });
            }
            return;
          }

          jsonResponse(res, 405, { error: 'Method not allowed' });
          return;
        }

        // Not a theme API request — pass through
        next();
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
