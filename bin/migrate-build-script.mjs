// `live-tokens migrate` build-script pass.
//
// Through 0.79 the project template, and the check-compliance skill for an
// existing project, ran both checkers as `npm run check:design` ahead of
// `vite build`. themeFileApi now runs them during `vite build` itself, so the
// script only repeats the work. This pass removes it when package.json holds
// exactly what the template and the skill wrote and the build still gets the
// checks from the plugin. Anything else is reported and left alone.

import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const SCRIPT = 'check:design';
const SHIPPED_SCRIPT = /^(npx )?live-tokens check-page --no-fix && (npx )?live-tokens check-component --no-fix$/;
const BUILD_PREFIX = /^npm run check:design\s*&&\s*/;
const VITE_CONFIGS = ['vite.config.ts', 'vite.config.js', 'vite.config.mjs', 'vite.config.mts'];

function viteConfigText(root) {
  const file = VITE_CONFIGS.map((name) => join(root, name)).find((p) => existsSync(p));
  return file ? readFileSync(file, 'utf8') : '';
}

export function runMigrateBuildScript({ root = process.cwd(), apply = true } = {}) {
  const file = join(root, 'package.json');
  if (!existsSync(file)) return { status: 'unchanged' };
  const text = readFileSync(file, 'utf8');
  let pkg;
  try {
    pkg = JSON.parse(text);
  } catch {
    return { status: 'unchanged' };
  }
  const scripts = pkg.scripts ?? {};
  if (!(SCRIPT in scripts)) return { status: 'unchanged' };

  const vite = viteConfigText(root);
  if (!vite.includes('themeFileApi')) {
    return { status: 'advisory', reason: `keeps "${SCRIPT}": the Vite config does not use themeFileApi, so the build has no other design checks.` };
  }
  if (/checks\s*:\s*false/.test(vite)) {
    return { status: 'advisory', reason: `keeps "${SCRIPT}": themeFileApi is set to checks: false.` };
  }
  if (!SHIPPED_SCRIPT.test(String(scripts[SCRIPT]).trim())) {
    return { status: 'advisory', reason: `keeps "${SCRIPT}": it differs from the script live-tokens added. vite build now runs the design checks, so remove it by hand if it only repeats them.` };
  }
  const build = String(scripts.build ?? '');
  const users = Object.keys(scripts).filter((name) => name !== SCRIPT && name !== 'build' && String(scripts[name]).includes(SCRIPT));
  if (build.includes(SCRIPT) && !BUILD_PREFIX.test(build)) users.push('build');
  if (users.length > 0) {
    return { status: 'advisory', reason: `keeps "${SCRIPT}": ${users.map((u) => `"${u}"`).join(', ')} still run${users.length === 1 ? 's' : ''} it.` };
  }

  if (!apply) return { status: 'would-change' };
  if (BUILD_PREFIX.test(build)) scripts.build = build.replace(BUILD_PREFIX, '');
  delete scripts[SCRIPT];
  const indent = /^([ \t]+)"/m.exec(text)?.[1] ?? '  ';
  writeFileSync(file, JSON.stringify(pkg, null, indent) + (text.endsWith('\n') ? '\n' : ''));
  return { status: 'changed' };
}

export function formatBuildScriptResult(result) {
  if (result.status === 'changed') return `✓ package.json: removed "${SCRIPT}" from the build. vite build runs the design checks through themeFileApi.`;
  if (result.status === 'would-change') return `package.json: would remove "${SCRIPT}" from the build. vite build runs the design checks through themeFileApi.`;
  if (result.status === 'advisory') return `! package.json ${result.reason}`;
  return '';
}
