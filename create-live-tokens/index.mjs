#!/usr/bin/env node
// `npm create @motion-proto/live-tokens <dir>` entry point. All scaffolding
// lives in @motion-proto/live-tokens (the `createApp` engine + the template);
// this package only exists because `npm create <name>` requires a package
// literally called `create-<name>`. No template or logic is duplicated here.
import process from 'node:process';
import { resolve } from 'node:path';
import { createApp, formatCreateResult } from '@motion-proto/live-tokens/create';

const args = process.argv.slice(2);
const force = args.includes('--force');
const targetArg = args.find((a) => !a.startsWith('-'));

if (!targetArg) {
  console.error('Usage: npm create @motion-proto/live-tokens <project-directory>');
  process.exit(1);
}

try {
  const result = createApp({ targetDir: resolve(process.cwd(), targetArg), force });
  console.log(formatCreateResult(result, targetArg));
} catch (err) {
  console.error(err instanceof Error ? err.message : String(err));
  process.exit(1);
}
