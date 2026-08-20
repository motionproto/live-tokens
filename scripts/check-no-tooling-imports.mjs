#!/usr/bin/env node
/**
 * `vite-plugin/` is build tooling and is not in the published tarball, so an
 * import that climbs from `src/` into it resolves in this repo and fails in
 * every consumer. Nothing catches that until `check:smoke-install` builds a
 * real consumer during `prepublishOnly`, which is a tagged release away. This
 * runs in milliseconds and is wired into the normal test path instead.
 *
 * Dependencies point one way: vite-plugin may read src, never the reverse.
 */
import fs from 'node:fs';
import path from 'node:path';

const SRC = 'src';
const FORBIDDEN = /from\s+['"]([^'"]*\.\.\/vite-plugin\/[^'"]*)['"]/g;

const offenders = [];

const walk = (dir) => {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      walk(full);
      continue;
    }
    if (!/\.(ts|js|svelte)$/.test(entry.name)) continue;
    const source = fs.readFileSync(full, 'utf-8');
    for (const match of source.matchAll(FORBIDDEN)) {
      const line = source.slice(0, match.index).split('\n').length;
      offenders.push(`${full}:${line} imports ${match[1]}`);
    }
  }
};

walk(SRC);

if (offenders.length > 0) {
  console.error('check:no-tooling-imports FAILED — shipped source imports build tooling:\n');
  for (const offender of offenders) console.error(`  ${offender}`);
  console.error('\nvite-plugin/ is not published. Move the shared value into src/ and');
  console.error('re-export it from vite-plugin/, which may import src/ freely.');
  process.exit(1);
}

console.log(`check:no-tooling-imports OK — no src/ file reaches into vite-plugin/.`);
