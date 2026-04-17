import type { Plugin } from 'vite';
import fs from 'fs';
import path from 'path';

export interface TokenFileApiOptions {
  tokensDir: string;           // required, e.g. 'tokens' (relative to cwd, resolved with path.resolve)
  variablesCssPath: string;    // required, e.g. 'src/styles/variables.css'
  fontsCssPath?: string;       // default: sibling of variablesCssPath named 'fonts.css'
  tokensBackupDir?: string;    // default: `${tokensDir}/_backups`
  cssBackupDir?: string;       // default: path.join(path.dirname(variablesCssPath), '_backups')
  apiBase?: string;            // default: '/api'. Must be a simple '/path' without regex metacharacters.
}

export function tokenFileApi(opts: TokenFileApiOptions): Plugin {
  const TOKENS_DIR = path.resolve(opts.tokensDir);
  const CSS_PATH = path.resolve(opts.variablesCssPath);
  const FONTS_CSS_PATH = opts.fontsCssPath
    ? path.resolve(opts.fontsCssPath)
    : path.join(path.dirname(CSS_PATH), 'fonts.css');
  const TOKENS_BACKUP_DIR = opts.tokensBackupDir
    ? path.resolve(opts.tokensBackupDir)
    : path.join(TOKENS_DIR, '_backups');
  const CSS_BACKUP_DIR = opts.cssBackupDir
    ? path.resolve(opts.cssBackupDir)
    : path.join(path.dirname(CSS_PATH), '_backups');
  const API_BASE = opts.apiBase ?? '/api';
  const ACTIVE_FILE = path.join(TOKENS_DIR, '_active.json');
  const PRODUCTION_FILE = path.join(TOKENS_DIR, '_production.json');

  function ensureTokensDir() {
    if (!fs.existsSync(TOKENS_DIR)) {
      fs.mkdirSync(TOKENS_DIR, { recursive: true });
    }
    if (!fs.existsSync(path.join(TOKENS_DIR, 'default.json'))) {
      const defaultTokens = {
        name: 'Default',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        editorConfigs: {},
        cssVariables: {},
      };
      fs.writeFileSync(path.join(TOKENS_DIR, 'default.json'), JSON.stringify(defaultTokens, null, 2));
    }
    if (!fs.existsSync(ACTIVE_FILE)) {
      fs.writeFileSync(ACTIVE_FILE, JSON.stringify({ activeFile: 'default' }));
    }
    if (!fs.existsSync(PRODUCTION_FILE)) {
      const activeFile = getActiveFileName();
      fs.writeFileSync(PRODUCTION_FILE, JSON.stringify({ productionFile: activeFile }));
    }
  }

  function backupTokenFile(filePath: string, fileName: string) {
    if (!fs.existsSync(filePath)) return;
    if (!fs.existsSync(TOKENS_BACKUP_DIR)) {
      fs.mkdirSync(TOKENS_BACKUP_DIR, { recursive: true });
    }
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupPath = path.join(TOKENS_BACKUP_DIR, `${fileName}_${timestamp}.json`);
    fs.copyFileSync(filePath, backupPath);

    // Keep only the 10 most recent backups per file
    const allBackups = fs.readdirSync(TOKENS_BACKUP_DIR)
      .filter(f => f.startsWith(`${fileName}_`) && f.endsWith('.json'))
      .sort()
      .reverse();
    for (const old of allBackups.slice(10)) {
      fs.unlinkSync(path.join(TOKENS_BACKUP_DIR, old));
    }
  }

  function backupCssFile() {
    if (!fs.existsSync(CSS_PATH)) return;
    if (!fs.existsSync(CSS_BACKUP_DIR)) {
      fs.mkdirSync(CSS_BACKUP_DIR, { recursive: true });
    }
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupPath = path.join(CSS_BACKUP_DIR, `variables_${timestamp}.css`);
    fs.copyFileSync(CSS_PATH, backupPath);

    // Keep only the 10 most recent CSS backups
    const allBackups = fs.readdirSync(CSS_BACKUP_DIR)
      .filter(f => f.startsWith('variables_') && f.endsWith('.css'))
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

  function resolveFontStacks(tokenData: any): Record<string, string> {
    const stacks = tokenData.fontStacks as Array<{ variable: string; slots: any[] }> | undefined;
    const sources = tokenData.fontSources as Array<{ id: string; families: Array<{ id: string; cssName: string }> }> | undefined;
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
   * Write a token file's CSS variables (plus resolved font stack values)
   * into variables.css. Called when the production file is set or when the
   * current production token file is saved, so variables.css is always
   * production-ready and the build can bundle it as-is.
   */
  function syncTokensToCss(fileName: string): void {
    const tokenPath = path.join(TOKENS_DIR, `${fileName}.json`);
    if (!fs.existsSync(tokenPath)) return;

    const tokenData = JSON.parse(fs.readFileSync(tokenPath, 'utf-8'));
    const cssVars: Record<string, string> = { ...(tokenData.cssVariables || {}) };
    const resolvedFontVars = resolveFontStacks(tokenData);
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
    console.log(`[syncTokensToCss] Wrote ${Object.keys(cssVars).length} variables from "${fileName}" into variables.css`);
  }

  /**
   * Regenerate fonts.css from a token file's fontSources. Called alongside
   * syncTokensToCss so the production build's static font-loading layer
   * matches the registry the editor last promoted.
   */
  function syncFontsToCss(fileName: string): void {
    const tokenPath = path.join(TOKENS_DIR, `${fileName}.json`);
    if (!fs.existsSync(tokenPath)) return;
    const tokenData = JSON.parse(fs.readFileSync(tokenPath, 'utf-8'));
    const sources = tokenData.fontSources as Array<{
      id: string;
      kind: string;
      url?: string;
      cssText?: string;
      label?: string;
      families: Array<{ name: string }>;
    }> | undefined;
    if (!sources) return;

    const lines: string[] = [];
    lines.push('/* Generated from the production token file by syncFontsToCss. Do not edit. */');
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

  // Build parameterized routes/regexes from API_BASE.
  // Escape regex metacharacters so custom apiBase values still work.
  const escapedBase = API_BASE.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const TOKENS_ROUTE = `${API_BASE}/tokens`;
  const TOKENS_ACTIVE_ROUTE = `${API_BASE}/tokens/active`;
  const TOKENS_PRODUCTION_ROUTE = `${API_BASE}/tokens/production`;
  const BACKUPS_ROUTE = `${API_BASE}/backups`;
  const CURRENT_CSS_ROUTE = `${API_BASE}/current-css`;
  const TOKEN_BY_NAME_REGEX = new RegExp(`^${escapedBase}/tokens/([a-z0-9\\-_]+)$`);
  const BACKUP_GET_REGEX = new RegExp(`^${escapedBase}/backups/(tokens|css)/(.+)$`);
  const BACKUP_RESTORE_REGEX = new RegExp(`^${escapedBase}/backups/(tokens|css)/(.+)/restore$`);

  return {
    name: 'token-file-api',
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
      ensureTokensDir();

      server.middlewares.use(async (req, res, next) => {
        const url = req.url || '';

        // ── GET /api/tokens — list all token files ──
        if (url === TOKENS_ROUTE && req.method === 'GET') {
          try {
            const activeFile = getActiveFileName();
            const files = fs
              .readdirSync(TOKENS_DIR)
              .filter((f) => f.endsWith('.json') && !f.startsWith('_'))
              .map((f) => {
                const filePath = path.join(TOKENS_DIR, f);
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

        // ── GET /api/tokens/active — return the active token file ──
        if (url === TOKENS_ACTIVE_ROUTE && req.method === 'GET') {
          try {
            const activeFile = getActiveFileName();
            const filePath = path.join(TOKENS_DIR, `${activeFile}.json`);
            if (!fs.existsSync(filePath)) {
              jsonResponse(res, 404, { error: 'Active token file not found' });
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

        // ── PUT /api/tokens/active — set the active file ──
        if (url === TOKENS_ACTIVE_ROUTE && req.method === 'PUT') {
          try {
            const body = JSON.parse(await readBody(req));
            const fileName = sanitize(body.name || 'default');
            if (!fs.existsSync(path.join(TOKENS_DIR, `${fileName}.json`))) {
              jsonResponse(res, 404, { error: 'Token file not found' });
              return;
            }
            fs.writeFileSync(ACTIVE_FILE, JSON.stringify({ activeFile: fileName }));
            jsonResponse(res, 200, { ok: true, activeFile: fileName });
          } catch (err: any) {
            jsonResponse(res, 500, { error: err.message });
          }
          return;
        }

        // ── GET /api/tokens/production — return production info + config ──
        if (url === TOKENS_PRODUCTION_ROUTE && req.method === 'GET') {
          try {
            const prodFile = getProductionFileName();
            const filePath = path.join(TOKENS_DIR, `${prodFile}.json`);
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

        // ── PUT /api/tokens/production — update the production file ──
        if (url === TOKENS_PRODUCTION_ROUTE && req.method === 'PUT') {
          try {
            const body = JSON.parse(await readBody(req));
            const fileName = sanitize(body.name || 'default');
            if (!fs.existsSync(path.join(TOKENS_DIR, `${fileName}.json`))) {
              jsonResponse(res, 404, { error: 'Token file not found' });
              return;
            }
            fs.writeFileSync(PRODUCTION_FILE, JSON.stringify({ productionFile: fileName }));
            syncTokensToCss(fileName);
            syncFontsToCss(fileName);
            const data = JSON.parse(fs.readFileSync(path.join(TOKENS_DIR, `${fileName}.json`), 'utf-8'));
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

        // ── GET /api/backups — list all backups (tokens + CSS) ──
        if (url === BACKUPS_ROUTE && req.method === 'GET') {
          try {
            const backups: { type: string; file: string; name: string; timestamp: string; size: number }[] = [];

            function fileTimestampToISO(ts: string): string {
              return ts.replace(/T(\d{2})-(\d{2})-(\d{2})-(\d{3})Z/, 'T$1:$2:$3.$4Z');
            }

            // Token backups
            if (fs.existsSync(TOKENS_BACKUP_DIR)) {
              for (const f of fs.readdirSync(TOKENS_BACKUP_DIR)) {
                if (!f.endsWith('.json')) continue;
                const match = f.match(/^(.+)_(\d{4}-\d{2}-\d{2}T\d{2}-\d{2}-\d{2}-\d{3}Z)\.json$/);
                if (!match) continue;
                const stat = fs.statSync(path.join(TOKENS_BACKUP_DIR, f));
                backups.push({
                  type: 'tokens',
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
              } else {
                const backupPath = path.join(TOKENS_BACKUP_DIR, decodeURIComponent(file));
                if (!backupPath.startsWith(TOKENS_BACKUP_DIR) || !fs.existsSync(backupPath)) {
                  jsonResponse(res, 404, { error: 'Backup not found' });
                  return;
                }
                // Determine which token file this backup belongs to
                const nameMatch = decodeURIComponent(file).match(/^(.+)_\d{4}-/);
                if (!nameMatch) {
                  jsonResponse(res, 400, { error: 'Cannot determine token file name from backup' });
                  return;
                }
                const tokenFilePath = path.join(TOKENS_DIR, `${nameMatch[1]}.json`);
                // Backup current before restoring
                backupTokenFile(tokenFilePath, nameMatch[1]);
                fs.copyFileSync(backupPath, tokenFilePath);
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
            const dir = type === 'css' ? CSS_BACKUP_DIR : TOKENS_BACKUP_DIR;
            const filePath = path.join(dir, decodeURIComponent(file));
            if (!filePath.startsWith(dir) || !fs.existsSync(filePath)) {
              jsonResponse(res, 404, { error: 'Backup not found' });
              return;
            }
            const content = fs.readFileSync(filePath, 'utf-8');
            jsonResponse(res, 200, { content, type, file });
            return;
          }
        }

        // ── GET /api/current-css — read current variables.css ──
        if (url === CURRENT_CSS_ROUTE && req.method === 'GET') {
          try {
            const content = fs.readFileSync(CSS_PATH, 'utf-8');
            jsonResponse(res, 200, { content });
          } catch (err: any) {
            jsonResponse(res, 500, { error: err.message });
          }
          return;
        }

        // ── /api/tokens/:name — CRUD for individual token files ──
        const match = url.match(TOKEN_BY_NAME_REGEX);
        if (match) {
          const fileName = match[1];
          const filePath = path.join(TOKENS_DIR, `${fileName}.json`);

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
              backupTokenFile(filePath, fileName);
              fs.writeFileSync(filePath, JSON.stringify(body, null, 2));
              // Keep variables.css and fonts.css in sync when the production token file is saved
              if (fileName === getProductionFileName()) {
                syncTokensToCss(fileName);
                syncFontsToCss(fileName);
              }
              jsonResponse(res, 200, { ok: true, fileName });
            } catch (err: any) {
              jsonResponse(res, 500, { error: err.message });
            }
            return;
          }

          if (req.method === 'DELETE') {
            if (fileName === 'default') {
              jsonResponse(res, 403, { error: 'Cannot delete the default token file' });
              return;
            }
            try {
              if (fs.existsSync(filePath)) {
                fs.unlinkSync(filePath);
                // If this was the active file, revert to default
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

        // Not a token API request — pass through
        next();
      });
    },
  };
}
