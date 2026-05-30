// `create` subcommand: scaffold a new Svelte + Vite app that depends on the
// published package. Extracted from cli.mjs so it can be unit-tested.

import {
  cpSync,
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  renameSync,
  writeFileSync,
} from 'node:fs';
import { dirname, join, resolve } from 'node:path';

// npm strips dotfiles from published tarballs, so the template ships them
// renamed; `create` restores the leading dot on scaffold.
const DOTFILES = [['_gitignore', '.gitignore']];

// Seeded from THIS installed package (src → scaffold) so the generated app's
// token/theme CSS never drifts from the version it was created against.
const SEEDS = [
  ['src/system/styles/tokens.css', 'src/system/styles/tokens.css'],
  ['src/live-tokens/data/tokens.generated.css', 'src/live-tokens/data/tokens.generated.css'],
  ['src/app/site.css', 'src/styles/site.css'],
];

const PLACEHOLDER_FILES = ['package.json', 'index.html', 'README.md'];

export function appNameFrom(targetDir) {
  return (
    (targetDir.split(/[/\\]/).filter(Boolean).pop() || '')
      .replace(/[^a-z0-9._-]+/gi, '-')
      .replace(/^[-.]+|[-.]+$/g, '')
      .toLowerCase() || 'live-tokens-app'
  );
}

export function runCreate({ targetDir, pkgRoot, force = false }) {
  const templateDir = join(pkgRoot, 'template');
  if (!existsSync(templateDir)) {
    throw new Error(`Template not found at ${templateDir}. Is the package installed correctly?`);
  }
  if (existsSync(targetDir) && readdirSync(targetDir).length > 0 && !force) {
    throw new Error(`${targetDir} is not empty. Pass --force to scaffold into it anyway.`);
  }

  const appName = appNameFrom(targetDir);
  const ltVersion = JSON.parse(readFileSync(join(pkgRoot, 'package.json'), 'utf8')).version;

  cpSync(templateDir, targetDir, { recursive: true });

  for (const [from, to] of DOTFILES) {
    const src = join(targetDir, from);
    if (existsSync(src)) renameSync(src, join(targetDir, to));
  }

  for (const [srcRel, destRel] of SEEDS) {
    const src = join(pkgRoot, srcRel);
    const dest = join(targetDir, destRel);
    mkdirSync(dirname(dest), { recursive: true });
    if (existsSync(src)) cpSync(src, dest);
    else writeFileSync(dest, '');
  }

  for (const rel of PLACEHOLDER_FILES) {
    const p = join(targetDir, rel);
    if (!existsSync(p)) continue;
    const filled = readFileSync(p, 'utf8')
      .replaceAll('__APP_NAME__', appName)
      .replaceAll('__LT_VERSION__', `^${ltVersion}`);
    writeFileSync(p, filled);
  }

  return { appName, targetDir: resolve(targetDir), ltVersion };
}

export function formatCreateResult({ appName, targetDir }, targetArg) {
  return [
    ``,
    `Scaffolded ${appName} → ${targetDir}`,
    ``,
    `Next steps:`,
    `  cd ${targetArg}`,
    `  npm install`,
    `  npm run dev`,
    ``,
    `Then open http://localhost:5173 and edit src/pages/Home.svelte.`,
  ].join('\n');
}
